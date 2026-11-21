import { randomUUID } from "node:crypto"
import { NextResponse } from "next/server"
import { getAppAdminAccess } from "@/lib/auth/admin"
import { createAdminClient, hasSupabaseAdminConfig } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { uuidPattern } from "@/lib/school/teacher-access"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const noStore = { "Cache-Control": "private, no-store" }
const usernamePattern = /^[a-z0-9][a-z0-9._-]{2,31}$/
type Role = "teacher" | "school_admin"
type Body = {
  action?: "createTeacher" | "attachStudent" | "linkStudent" | "unlinkStudent" | "resetTeacherPassword" | "setTeacherRole"
  schoolId?: string
  username?: string
  displayName?: string
  password?: string
  role?: Role
  teacherUserId?: string
  studentUserId?: string
}
function fail(message: string,status: number) {
  return NextResponse.json({error:message},{status,headers:noStore})
}
async function requirePlatformAdmin() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const id = typeof data?.claims?.sub === "string" ? data.claims.sub : ""
  const email = typeof data?.claims?.email === "string" ? data.claims.email : ""
  if (!id) return null
  const access = await getAppAdminAccess(id,email)
  return access.isAdmin ? {id,email} : null
}

export async function GET() {
  const actor = await requirePlatformAdmin()
  if (!actor) return fail("Platform administrator access required",403)
  if (!hasSupabaseAdminConfig()) return fail("Supabase admin access is not configured",503)
  const admin = createAdminClient()
  const [{data:schools,error:schoolError},{data:accounts,error:accountError}] = await Promise.all([
    admin.from("school_organizations").select("id,name,seat_limit,status,join_code").eq("owner_user_id",actor.id).order("created_at",{ascending:false}),
    admin.from("practice_access_accounts").select("user_id,username,display_name,active,account_type,created_at").order("created_at",{ascending:false}).limit(2000),
  ])
  if(schoolError||accountError) return fail("Could not load school or managed usernames",500)
  const schoolIds = (schools??[]).map(s=>s.id)
  const accountIds = (accounts??[]).map(a=>a.user_id)

  const [membersResult,rolesResult,linksResult] = await Promise.all([
    accountIds.length ? admin.from("school_organization_members").select("organization_id,user_id").in("user_id",accountIds) : Promise.resolve({data:[],error:null}),
    schoolIds.length ? admin.from("school_staff_roles").select("organization_id,user_id,role,active").in("organization_id",schoolIds) : Promise.resolve({data:[],error:null}),
    schoolIds.length ? admin.from("school_teacher_student_links").select("organization_id,teacher_user_id,student_user_id,linked_at").in("organization_id",schoolIds) : Promise.resolve({data:[],error:null}),
  ])
  if(membersResult.error||rolesResult.error||linksResult.error) return fail("Could not load school memberships",500)

  const memberOrg = new Map((membersResult.data??[]).map(m=>[m.user_id,m.organization_id]))
  const ownedSchoolIds = new Set(schoolIds)
  const roleByUser = new Map((rolesResult.data??[]).filter(r=>r.active).map(r=>[r.user_id,r]))
  const students = (accounts??[]).filter(a=>a.account_type==="student").map(a=>({
    userId:a.user_id,username:a.username,displayName:a.display_name||a.username,active:a.active,
    schoolId:memberOrg.has(a.user_id) ? (ownedSchoolIds.has(memberOrg.get(a.user_id)!) ? memberOrg.get(a.user_id) : "other") : null,
  }))
  const teachers = (accounts??[]).filter(a=>a.account_type==="teacher"&&roleByUser.has(a.user_id)).map(a=>({
    userId:a.user_id,username:a.username,displayName:a.display_name||a.username,active:a.active,
    schoolId:roleByUser.get(a.user_id)?.organization_id||null,
    role:roleByUser.get(a.user_id)?.role||null,
  }))
  return NextResponse.json({schools:schools??[],teachers,students,links:linksResult.data??[]},{headers:noStore})
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin")
  if (origin && origin !== new URL(request.url).origin) return fail("Invalid request origin",403)
  const actor = await requirePlatformAdmin()
  if (!actor) return fail("Platform administrator access required",403)
  if (!hasSupabaseAdminConfig()) return fail("Supabase admin access is not configured",503)
  let body: Body
  try { body = await request.json() as Body } catch { return fail("Invalid request body",400) }
  if(!uuidPattern.test(body.schoolId||"")) return fail("Choose a school workspace",400)
  const admin = createAdminClient()
  const {data:school,error:schoolError} = await admin.from("school_organizations")
    .select("id,name,status,seat_limit,owner_user_id")
    .eq("id",body.schoolId).eq("owner_user_id",actor.id).maybeSingle()
  if(schoolError||!school||school.status!=="active") return fail("You must own an active school workspace to manage accounts",403)
  const schoolId=school.id

  if(body.action==="createTeacher") {
    const username=(body.username||"").trim().toLowerCase()
    const displayName=(body.displayName||"").trim().slice(0,80)||username
    const password=body.password||""
    const role=body.role==="school_admin"?"school_admin":"teacher"
    if(!usernamePattern.test(username)) return fail("Username must be 3–32 lowercase letters, numbers, dots, dashes or underscores",400)
    if(password.length<8||password.length>128) return fail("Password must be 8–128 characters",400)
    const [{data:existing,error:existingError},{count:seatCount,error:countError}]=await Promise.all([
      admin.from("practice_access_accounts").select("user_id").eq("username_normalized",username).maybeSingle(),
      admin.from("school_organization_members").select("id",{head:true,count:"exact"}).eq("organization_id",schoolId),
    ])
    if(existingError||countError) return fail("Could not verify username and school capacity",500)
    if(existing) return fail("This username is already in use; choose another",409)
    if((seatCount??0)>=school.seat_limit) return fail("School has no remaining spaces",409)

    const internalEmail=`practice+${randomUUID()}@scholarbridge.app`
    const {data:created,error:authError}=await admin.auth.admin.createUser({
      email:internalEmail,password,email_confirm:true,
      user_metadata:{display_name:displayName,account_type:"teacher"},
      app_metadata:{account_type:"practice",managed_role:"teacher",practice_access:"unlimited"},
    })
    if(authError||!created.user) return fail(authError?.message||"Could not create teacher login",500)
    const id=created.user.id
    // Only delete the newly-created auth user on failure. Existing student
    // identities and their saved practice data are never modified.
    async function abort(message:string,status=500) {
      const {error:deletedError}=await admin.auth.admin.deleteUser(id)
      if(deletedError) console.error("Teacher account creation rollback failed",deletedError.message)
      return fail(message,status)
    }
    const {error:profileError}=await admin.from("profiles").upsert({
      id,display_name:displayName,updated_at:new Date().toISOString(),
    },{onConflict:"id"})
    if(profileError) return abort("Could not create teacher profile")
    const {error:loginError}=await admin.from("practice_access_accounts").insert({
      user_id:id,username,username_normalized:username,display_name:displayName,
      active:true,unlimited_usage:true,created_by:actor.id,account_type:"teacher",
    })
    if(loginError) return abort(loginError.code==="23505"?"Username already in use":"Could not save the teacher username",loginError.code==="23505"?409:500)
    const {data:seat,error:seatError}=await admin.rpc("oxbridge_join_school_seat",{p_user_id:id,p_organization_id:schoolId}).maybeSingle()
    if(seatError||seat?.result!=="joined") return abort(seat?.result==="full"?"School has no remaining spaces":"Could not attach teacher to school",seat?.result==="full"?409:500)
    const {error:staffError}=await admin.from("school_staff_roles").insert({
      organization_id:schoolId,user_id:id,role,active:true,granted_by:actor.id,
    })
    if(staffError) return abort("Could not grant school teacher permissions")
    const {error:auditError}=await admin.from("school_staff_audit_events").insert({
      organization_id:schoolId,actor_user_id:actor.id,subject_user_id:id,
      action:role==="school_admin"?"grant_school_admin":"grant_teacher",
    })
    if(auditError) console.error("Teacher creation audit failed",auditError.message)
    return NextResponse.json({ok:true,teacher:{userId:id,username,displayName,role,schoolId,schoolName:school.name,signInPath:"/practice-login"}},{headers:noStore})
  }

  if(body.action==="attachStudent") {
    const studentId=body.studentUserId||""
    if(!uuidPattern.test(studentId)) return fail("Choose a valid practice student",400)
    const {data:student}=await admin.from("practice_access_accounts")
      .select("user_id,account_type,active,username").eq("user_id",studentId).maybeSingle()
    if(!student||!student.active||student.account_type!=="student") return fail("Choose an active existing practice student",400)
    const [{data:member,error:memberError},{data:seat,error:seatError}]=await Promise.all([
      admin.from("school_organization_members").select("organization_id,role").eq("user_id",studentId).maybeSingle(),
      admin.from("school_seat_entitlements").select("organization_id,active").eq("user_id",studentId).maybeSingle(),
    ])
    if(memberError||seatError) return fail("Could not check student's current school",500)
    if((member&&member.organization_id!==schoolId)||(seat&&seat.organization_id!==schoolId))
      return fail("This student is already linked to another school. No account was changed.",409)
    if(member?.role==="owner") return fail("A school owner cannot be attached as a student",403)
    if(member&&seat?.active) return NextResponse.json({ok:true,alreadyAttached:true},{headers:noStore})
    if(member&&!seat?.active) {
      const {error:restoreError}=await admin.from("school_seat_entitlements").upsert({
        user_id:studentId,organization_id:schoolId,role:"member",active:true,updated_at:new Date().toISOString(),
      },{onConflict:"user_id"})
      if(restoreError) return fail("Could not reactivate the existing school link",500)
    } else {
      const {data:joined,error:joinError}=await admin.rpc("oxbridge_join_school_seat",{
        p_user_id:studentId,p_organization_id:schoolId,
      }).maybeSingle()
      if(joinError||joined?.result!=="joined") return fail(joined?.result==="full"?"School has no remaining spaces":"Could not attach practice student to school",joined?.result==="full"?409:500)
    }
    const {error:auditError}=await admin.from("school_staff_audit_events").insert({
      organization_id:schoolId,actor_user_id:actor.id,subject_user_id:studentId,action:"attach_student",
    })
    if(auditError) console.error("Student school attachment audit failed",auditError.message)
    return NextResponse.json({ok:true},{headers:noStore})
  }

  if(body.action==="resetTeacherPassword"||body.action==="setTeacherRole") {
    const teacherId=body.teacherUserId||""
    if(!uuidPattern.test(teacherId)) return fail("Choose a valid teacher",400)
    const [{data:login},{data:staff},{data:membership}]=await Promise.all([
      admin.from("practice_access_accounts").select("account_type,active").eq("user_id",teacherId).maybeSingle(),
      admin.from("school_staff_roles").select("role,active").eq("organization_id",schoolId).eq("user_id",teacherId).maybeSingle(),
      admin.from("school_organization_members").select("user_id").eq("organization_id",schoolId).eq("user_id",teacherId).maybeSingle(),
    ])
    if(login?.account_type!=="teacher"||!login.active||!staff?.active||!membership) return fail("Active managed teacher not found in this school",404)
    if(body.action==="resetTeacherPassword") {
      const password=body.password||""
      if(password.length<8||password.length>128) return fail("Password must be 8–128 characters",400)
      const {error:changeError}=await admin.auth.admin.updateUserById(teacherId,{password})
      if(changeError) return fail("Could not update teacher password",500)
      return NextResponse.json({ok:true},{headers:noStore})
    }
    if(body.role!=="teacher"&&body.role!=="school_admin") return fail("Choose Teacher or School Admin",400)
    const {error:changeError}=await admin.from("school_staff_roles").update({role:body.role,updated_at:new Date().toISOString()})
      .eq("organization_id",schoolId).eq("user_id",teacherId)
    if(changeError) return fail("Could not update teacher role",500)
    const {error:auditError}=await admin.from("school_staff_audit_events").insert({
      organization_id:schoolId,actor_user_id:actor.id,subject_user_id:teacherId,action:"change_role",
    })
    if(auditError) console.error("Teacher role audit failed",auditError.message)
    return NextResponse.json({ok:true},{headers:noStore})
  }

  if(body.action==="linkStudent"||body.action==="unlinkStudent") {
    const teacherId=body.teacherUserId||"", studentId=body.studentUserId||""
    if(!uuidPattern.test(teacherId)||!uuidPattern.test(studentId)||teacherId===studentId)
      return fail("Choose different, valid teacher and student accounts",400)
    const [{data:staff},{data:teacherSeat},{data:student},{data:studentMember},{data:studentSeat}]=await Promise.all([
      admin.from("school_staff_roles").select("active").eq("organization_id",schoolId).eq("user_id",teacherId).maybeSingle(),
      admin.from("school_seat_entitlements").select("active").eq("organization_id",schoolId).eq("user_id",teacherId).maybeSingle(),
      admin.from("practice_access_accounts").select("account_type,active").eq("user_id",studentId).maybeSingle(),
      admin.from("school_organization_members").select("user_id,role").eq("organization_id",schoolId).eq("user_id",studentId).maybeSingle(),
      admin.from("school_seat_entitlements").select("active").eq("organization_id",schoolId).eq("user_id",studentId).maybeSingle(),
    ])
    if(!staff?.active||!teacherSeat?.active||student?.account_type!=="student"||!student.active||!studentMember||studentMember.role==="owner"||!studentSeat?.active)
      return fail("The teacher and practice student must both be active members of this school",403)
    if(body.action==="linkStudent") {
      const {error:linkError}=await admin.from("school_teacher_student_links").upsert({
        organization_id:schoolId,teacher_user_id:teacherId,student_user_id:studentId,linked_by:actor.id,
      },{onConflict:"organization_id,teacher_user_id,student_user_id"})
      if(linkError) return fail("Could not assign student to this teacher",500)
    } else {
      const {error:unlinkError}=await admin.from("school_teacher_student_links").delete()
        .eq("organization_id",schoolId).eq("teacher_user_id",teacherId).eq("student_user_id",studentId)
      if(unlinkError) return fail("Could not remove the teacher assignment",500)
    }
    const {error:auditError}=await admin.from("school_staff_audit_events").insert({
      organization_id:schoolId,actor_user_id:actor.id,subject_user_id:teacherId,
      related_user_id:studentId,action:body.action==="linkStudent"?"link_student":"unlink_student",
    })
    if(auditError) console.error("Managed school link audit failed",auditError.message)
    return NextResponse.json({ok:true},{headers:noStore})
  }
  return fail("Unsupported action",400)
}

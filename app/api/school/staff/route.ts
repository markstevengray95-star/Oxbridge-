import { NextResponse } from "next/server"
import { createAdminClient, hasSupabaseAdminConfig } from "@/lib/supabase/admin"
import { currentSchoolUserId, loadStaffScope, uuidPattern } from "@/lib/school/teacher-access"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type StaffAction = {
  action?: "grantRole" | "revokeRole" | "linkStudent" | "unlinkStudent"
  teacherUserId?: string
  studentUserId?: string
  role?: "teacher" | "school_admin"
}
const noStore = { "Cache-Control": "private, no-store" }

function error(message: string, status: number) {
  return NextResponse.json({ error: message }, { status, headers: noStore })
}

async function context() {
  const userId = await currentSchoolUserId()
  if (!userId || !hasSupabaseAdminConfig()) return null
  const admin = createAdminClient()
  const scope = await loadStaffScope(admin, userId)
  return scope ? { admin, scope } : null
}

export async function GET() {
  const actor = await context()
  if (!actor) return error("School owner or school administrator access required", 403)
  const { admin, scope } = actor
  if (!scope.canManageLinks) return error("School administrator access required", 403)

  const [{ data: memberships, error: membersError }, { data: staff, error: staffError }, { data: links, error: linksError }, { data: org }] = await Promise.all([
    admin.from("school_organization_members").select("user_id,role,joined_at").eq("organization_id",scope.organizationId).order("joined_at",{ascending:true}),
    admin.from("school_staff_roles").select("user_id,role,active,granted_at").eq("organization_id",scope.organizationId).eq("active",true),
    admin.from("school_teacher_student_links").select("teacher_user_id,student_user_id,linked_at").eq("organization_id",scope.organizationId),
    admin.from("school_organizations").select("join_code").eq("id",scope.organizationId).maybeSingle(),
  ])
  if (membersError || staffError || linksError) return error("Could not load the school member roster", 500)
  const memberIds = (memberships ?? []).map(member => member.user_id)
  const [{ data: profiles }, { data: activeSeats }] = await Promise.all([
    memberIds.length ? admin.from("profiles").select("id,display_name,target_course,application_year").in("id",memberIds) : Promise.resolve({data:[]}),
    memberIds.length ? admin.from("school_seat_entitlements").select("user_id").eq("organization_id",scope.organizationId).eq("active",true).in("user_id",memberIds) : Promise.resolve({data:[]}),
  ])
  const activeIds = new Set((activeSeats ?? []).map(s => s.user_id))
  const profilesById = new Map((profiles ?? []).map(p => [p.id,p]))
  const staffById = new Map((staff ?? []).map(s => [s.user_id,s]))
  const members = await Promise.all((memberships ?? []).filter(m => activeIds.has(m.user_id)).map(async member => {
    const user = await admin.auth.admin.getUserById(member.user_id)
    const profile = profilesById.get(member.user_id)
    const staffRole = staffById.get(member.user_id)?.role ?? (member.user_id === scope.userId && scope.isOwner ? "owner" : null)
    const role = member.role === "owner" ? "owner" : staffRole
    return {
      userId: member.user_id,
      displayName: profile?.display_name || user.data.user?.user_metadata?.display_name || "Account",
      email: user.data.user?.email || "",
      emailConfirmed: Boolean(user.data.user?.email_confirmed_at),
      role,
      targetCourse: profile?.target_course || null,
      applicationYear: profile?.application_year || null,
      joinedAt: member.joined_at,
    }
  }))
  return NextResponse.json({
    organization: { id:scope.organizationId,name:scope.organizationName,joinCode:scope.isOwner ? (org?.join_code || "") : null },
    permission: { role:scope.role,canManageRoles:scope.canManageRoles,canManageLinks:scope.canManageLinks },
    members, links:links ?? [],
  }, { headers:noStore })
}

export async function POST(request: Request) {
  const requestOrigin = request.headers.get("origin")
  if (requestOrigin && requestOrigin !== new URL(request.url).origin) return error("Invalid request origin",403)
  const actor = await context()
  if (!actor) return error("School owner or school administrator access required",403)
  const { admin, scope } = actor
  if (!scope.canManageLinks) return error("School administrator access required",403)

  let body: StaffAction
  try { body = await request.json() as StaffAction } catch { return error("Invalid JSON",400) }
  const teacherId = body.teacherUserId || ""
  const studentId = body.studentUserId || ""
  if (!uuidPattern.test(teacherId)) return error("Choose a valid teacher account",400)
  if (body.action !== "grantRole" && body.action !== "revokeRole" && body.action !== "linkStudent" && body.action !== "unlinkStudent")
    return error("Unsupported action",400)
  if ((body.action === "grantRole" || body.action === "revokeRole") && !scope.canManageRoles)
    return error("Only the school owner can grant or revoke staff roles",403)
  const { data: membership } = await admin.from("school_organization_members")
    .select("role,user_id").eq("organization_id",scope.organizationId).eq("user_id",teacherId).maybeSingle()
  const { data: teacherSeat } = await admin.from("school_seat_entitlements").select("active")
    .eq("organization_id",scope.organizationId).eq("user_id",teacherId).maybeSingle()
  if (!membership || !teacherSeat?.active || membership.role === "owner")
    return error("Teacher must be an active member of this school (not the owner)",403)

  if (body.action === "grantRole") {
    if (body.role !== "teacher" && body.role !== "school_admin") return error("Select Teacher or School Admin",400)
    const { data: authUser } = await admin.auth.admin.getUserById(teacherId)
    if (!authUser.user?.email_confirmed_at) return error("Teacher must confirm their email before receiving staff access",400)
    const { data: previous } = await admin.from("school_staff_roles").select("role")
      .eq("organization_id",scope.organizationId).eq("user_id",teacherId).maybeSingle()
    // A promoted staff member must not remain on someone else\'s pupil roster.
    const { error: removedStudentLinksError } = await admin.from("school_teacher_student_links").delete()
      .eq("organization_id",scope.organizationId).eq("student_user_id",teacherId)
    if (removedStudentLinksError) return error("Could not clear previous student links",500)
    const { error: grantError } = await admin.from("school_staff_roles").upsert({
      organization_id:scope.organizationId,user_id:teacherId,role:body.role,active:true,
      granted_by:scope.userId,updated_at:new Date().toISOString(),
    },{onConflict:"organization_id,user_id"})
    if (grantError) return error("Could not grant staff access",500)
    const { error: auditError } = await admin.from("school_staff_audit_events").insert({
      organization_id:scope.organizationId,actor_user_id:scope.userId,subject_user_id:teacherId,
      action:previous ? "change_role" : body.role === "teacher" ? "grant_teacher" : "grant_school_admin",
    })
    if (auditError) console.error("School role audit write failed",auditError.message)
    return NextResponse.json({ok:true}, {headers:noStore})
  }

  if (body.action === "revokeRole") {
    const { error: revokeError } = await admin.from("school_staff_roles").delete()
      .eq("organization_id",scope.organizationId).eq("user_id",teacherId)
    if (revokeError) return error("Could not revoke staff access",500)
    const { error: auditError } = await admin.from("school_staff_audit_events").insert({
      organization_id:scope.organizationId,actor_user_id:scope.userId,subject_user_id:teacherId,action:"revoke_staff",
    })
    if (auditError) console.error("School role audit write failed",auditError.message)
    return NextResponse.json({ok:true}, {headers:noStore})
  }

  if (!uuidPattern.test(studentId) || studentId === teacherId) return error("Choose a valid student",400)
  const [{data:role}, {data:studentMembership}, {data:studentSeat}, {data:staffStudent}] = await Promise.all([
    admin.from("school_staff_roles").select("role,active").eq("organization_id",scope.organizationId).eq("user_id",teacherId).maybeSingle(),
    admin.from("school_organization_members").select("role").eq("organization_id",scope.organizationId).eq("user_id",studentId).maybeSingle(),
    admin.from("school_seat_entitlements").select("active").eq("organization_id",scope.organizationId).eq("user_id",studentId).maybeSingle(),
    admin.from("school_staff_roles").select("active").eq("organization_id",scope.organizationId).eq("user_id",studentId).maybeSingle(),
  ])
  if (!role?.active) return error("Teacher access has been revoked",403)
  if (!studentMembership || !studentSeat?.active || studentMembership.role === "owner" || staffStudent?.active)
    return error("Select an active student in this school, not a member of staff",403)

  if (body.action === "linkStudent") {
    const { error: linkError } = await admin.from("school_teacher_student_links").upsert({
      organization_id:scope.organizationId,teacher_user_id:teacherId,student_user_id:studentId,
      linked_by:scope.userId,
    },{onConflict:"organization_id,teacher_user_id,student_user_id"})
    if (linkError) return error("Could not link the student to the teacher",500)
  } else {
    const { error: unlinkError } = await admin.from("school_teacher_student_links").delete()
      .eq("organization_id",scope.organizationId).eq("teacher_user_id",teacherId).eq("student_user_id",studentId)
    if (unlinkError) return error("Could not unlink the student",500)
  }
  const { error: auditError } = await admin.from("school_staff_audit_events").insert({
    organization_id:scope.organizationId,actor_user_id:scope.userId,
    subject_user_id:teacherId,related_user_id:studentId,
    action:body.action === "linkStudent" ? "link_student" : "unlink_student",
  })
  if (auditError) console.error("School link audit write failed",auditError.message)
  return NextResponse.json({ok:true}, {headers:noStore})
}

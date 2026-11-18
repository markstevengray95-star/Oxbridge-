import { NextResponse } from "next/server"
import { createAdminClient, hasSupabaseAdminConfig } from "@/lib/supabase/admin"
import { currentSchoolUserId } from "@/lib/school/teacher-access"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"
const headers = { "Cache-Control": "private, no-store" }

export async function GET() {
  const userId = await currentSchoolUserId()
  if (!userId) return NextResponse.json({error:"Sign in required"},{status:401,headers})
  if (!hasSupabaseAdminConfig()) return NextResponse.json({error:"School connections are unavailable"},{status:503,headers})
  const admin = createAdminClient()
  const {data:seat,error:seatError} = await admin.from("school_seat_entitlements")
    .select("organization_id,active").eq("user_id",userId).maybeSingle()
  if (seatError) return NextResponse.json({error:"Could not check your school membership"},{status:500,headers})
  if (!seat?.active) return NextResponse.json({school:null,teachers:[]},{headers})

  const [{data:org},{data:membership},{data:links}] = await Promise.all([
    admin.from("school_organizations").select("name,status").eq("id",seat.organization_id).maybeSingle(),
    admin.from("school_organization_members").select("user_id").eq("organization_id",seat.organization_id).eq("user_id",userId).maybeSingle(),
    admin.from("school_teacher_student_links").select("teacher_user_id").eq("organization_id",seat.organization_id).eq("student_user_id",userId),
  ])
  if (!org || org.status !== "active" || !membership) return NextResponse.json({school:null,teachers:[]},{headers})
  const teacherIds = [...new Set((links ?? []).map(link => link.teacher_user_id))]
  if (!teacherIds.length) return NextResponse.json({school:org.name,teachers:[]},{headers})
  const [{data:roles},{data:profiles}] = await Promise.all([
    admin.from("school_staff_roles").select("user_id,role,active").eq("organization_id",seat.organization_id).eq("active",true).in("user_id",teacherIds),
    admin.from("profiles").select("id,display_name").in("id",teacherIds),
  ])
  const names = new Map((profiles ?? []).map(p=>[p.id,p.display_name]))
  const teachers = (roles ?? []).map(r=>({name:names.get(r.user_id)||"Teacher",role:r.role}))
  return NextResponse.json({school:org.name,teachers},{headers})
}

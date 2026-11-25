import "server-only"
import type { createAdminClient } from "@/lib/supabase/admin"
import type { StaffScope } from "@/lib/school/teacher-access"
import { uuidPattern } from "@/lib/school/teacher-access"
import { schoolStudentMayReadDetails } from "@/lib/school/student-tracking-policy"

type Admin = ReturnType<typeof createAdminClient>
export type StudentPermission = { studentId:string; organizationId:string; assignedByTeacher:boolean }

/**
 * This check must run before every service-role read of a student's transcripts
 * or assessment answers. Never rely on an organizationId or teacherId supplied
 * by the browser.
 */
export async function authorizeSchoolStudentDetail(
  admin: Admin,
  scope: StaffScope,
  studentId: string,
):Promise<StudentPermission|null>{
  if(!uuidPattern.test(studentId) || studentId===scope.userId) return null
  const [membership,seat,staff,organization] = await Promise.all([
    admin.from("school_organization_members")
      .select("user_id,role").eq("organization_id",scope.organizationId).eq("user_id",studentId).maybeSingle(),
    admin.from("school_seat_entitlements")
      .select("user_id,active").eq("organization_id",scope.organizationId).eq("user_id",studentId).maybeSingle(),
    admin.from("school_staff_roles")
      .select("user_id,active").eq("organization_id",scope.organizationId).eq("user_id",studentId).maybeSingle(),
    admin.from("school_organizations")
      .select("id,owner_user_id,status").eq("id",scope.organizationId).maybeSingle(),
  ])
  if(membership.error||seat.error||staff.error||organization.error)throw Error("Could not verify school memberships")
  const link = scope.isOwner || scope.role==="school_admin"
    ? {data:null,error:null}
    : await admin.from("school_teacher_student_links")
        .select("student_user_id")
        .eq("organization_id",scope.organizationId)
        .eq("teacher_user_id",scope.userId)
        .eq("student_user_id",studentId).maybeSingle()
  if(link.error)throw Error("Could not verify teacher assignment")
  const permitted=schoolStudentMayReadDetails({
    viewerId:scope.userId,studentId,scopeOrganizationId:scope.organizationId,
    scopeRole:scope.role,activeOrganizationId:organization.data?.id??null,
    organizationActive:organization.data?.status==="active",
    organizationOwnerId:organization.data?.owner_user_id??null,
    studentMemberUserId:membership.data?.user_id??null,
    studentMemberRole:membership.data?.role??null,
    studentSeatUserId:seat.data?.user_id??null,
    studentSeatActive:Boolean(seat.data?.active),
    studentStaffActive:Boolean(staff.data?.active),
    linkedStudentId:link.data?.student_user_id??null,
  })
  return permitted ? {
    studentId,organizationId:scope.organizationId,
    assignedByTeacher:scope.role==="teacher",
  } : null
}

/** Selection for a staff roster must use the same access policy as detail. */
export function schoolStaffCanSeeWholeRoster(scope: Pick<StaffScope,"isOwner"|"role">){
  return scope.isOwner || scope.role==="school_admin"
}

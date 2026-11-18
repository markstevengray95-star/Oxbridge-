import "server-only"

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

type Admin = ReturnType<typeof createAdminClient>
export type SchoolRole = "owner" | "school_admin" | "teacher"
export type StaffScope = {
  organizationId: string
  organizationName: string
  role: SchoolRole
  userId: string
  isOwner: boolean
  canManageLinks: boolean
  canManageRoles: boolean
}

export async function currentSchoolUserId() {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getClaims()
  if (error) return null
  return typeof data?.claims?.sub === "string" ? data.claims.sub : null
}

export async function loadStaffScope(admin: Admin, userId: string): Promise<StaffScope | null> {
  // The platform owner and school owner are separate concepts. Staff roles never
  // grant access to /admin or to users in another school.
  const { data: owned, error: ownerError } = await admin.from("school_organizations")
    .select("id,name,status,owner_user_id")
    .eq("owner_user_id", userId)
    .maybeSingle()
  if (ownerError) throw ownerError
  if (owned?.status === "active") return {
    organizationId: owned.id, organizationName: owned.name,
    userId, role: "owner", isOwner: true,
    canManageLinks: true, canManageRoles: true,
  }

  const { data: staff, error: staffError } = await admin.from("school_staff_roles")
    .select("organization_id,role,active")
    .eq("user_id", userId).eq("active", true).maybeSingle()
  if (staffError) throw staffError
  if (!staff || (staff.role !== "teacher" && staff.role !== "school_admin")) return null

  const [{ data: org }, { data: membership }, { data: seat }] = await Promise.all([
    admin.from("school_organizations").select("id,name,status").eq("id",staff.organization_id).maybeSingle(),
    admin.from("school_organization_members").select("user_id").eq("organization_id",staff.organization_id).eq("user_id",userId).maybeSingle(),
    admin.from("school_seat_entitlements").select("active").eq("organization_id",staff.organization_id).eq("user_id",userId).maybeSingle(),
  ])
  if (!org || org.status !== "active" || !membership || !seat?.active) return null

  const canManage = staff.role === "school_admin"
  return {
    organizationId: staff.organization_id, organizationName: org.name,
    userId, role: staff.role, isOwner: false,
    canManageLinks: canManage, canManageRoles: false,
  }
}

export const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

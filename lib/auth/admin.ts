import "server-only"

import { createAdminClient, hasSupabaseAdminConfig } from "@/lib/supabase/admin"
import { isConfiguredAdminEmail } from "@/lib/auth/admin-access"

export const ADMIN_CAPABILITIES = [
  "all_routes",
  "all_pro_features",
  "all_school_features",
  "unlimited_ai",
  "unlimited_voice",
  "user_management",
  "quality_console",
  "school_administration",
] as const

export type AdminCapability = typeof ADMIN_CAPABILITIES[number]

export type AppAdminAccess = {
  isAdmin: boolean
  unrestricted: boolean
  source: "database" | "environment" | "none"
  capabilities: AdminCapability[]
}

function granted(source: AppAdminAccess["source"]): AppAdminAccess {
  return { isAdmin: true, unrestricted: true, source, capabilities: [...ADMIN_CAPABILITIES] }
}

function denied(): AppAdminAccess {
  return { isAdmin: false, unrestricted: false, source: "none", capabilities: [] }
}

export async function getAppAdminAccess(userId: string, email?: string | null): Promise<AppAdminAccess> {
  const environmentAdmin = isConfiguredAdminEmail(email)

  if (!hasSupabaseAdminConfig()) return environmentAdmin ? granted("environment") : denied()

  const admin = createAdminClient()
  const { data } = await admin
    .from("app_admins")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle()

  if (data?.role === "admin") return granted("database")

  if (environmentAdmin) {
    await admin.from("app_admins").upsert({ user_id: userId, role: "admin" }, { onConflict: "user_id" })
    return granted("environment")
  }

  return denied()
}

export async function hasAdminCapability(userId: string, email: string | null | undefined, capability: AdminCapability) {
  const access = await getAppAdminAccess(userId, email)
  return access.unrestricted || access.capabilities.includes(capability)
}

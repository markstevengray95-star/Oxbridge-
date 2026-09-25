import "server-only"

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
  source: "environment" | "none"
  capabilities: AdminCapability[]
}

function granted(): AppAdminAccess {
  return { isAdmin: true, unrestricted: true, source: "environment", capabilities: [...ADMIN_CAPABILITIES] }
}

function denied(): AppAdminAccess {
  return { isAdmin: false, unrestricted: false, source: "none", capabilities: [] }
}

export async function getAppAdminAccess(_userId: string, email?: string | null): Promise<AppAdminAccess> {
  return isConfiguredAdminEmail(email) ? granted() : denied()
}

export async function hasAdminCapability(userId: string, email: string | null | undefined, capability: AdminCapability) {
  const access = await getAppAdminAccess(userId, email)
  return access.unrestricted || access.capabilities.includes(capability)
}

import "server-only"

import { createAdminClient, hasSupabaseAdminConfig } from "@/lib/supabase/admin"
import { isConfiguredAdminEmail } from "@/lib/auth/admin-access"

export type AppAdminAccess = {
  isAdmin: boolean
  source: "database" | "environment" | "none"
}

export async function getAppAdminAccess(userId: string, email?: string | null): Promise<AppAdminAccess> {
  const environmentAdmin = isConfiguredAdminEmail(email)

  if (!hasSupabaseAdminConfig()) {
    return environmentAdmin
      ? { isAdmin: true, source: "environment" }
      : { isAdmin: false, source: "none" }
  }

  const admin = createAdminClient()
  const { data } = await admin
    .from("app_admins")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle()

  if (data?.role === "admin") return { isAdmin: true, source: "database" }

  if (environmentAdmin) {
    const { error } = await admin
      .from("app_admins")
      .upsert({ user_id: userId, role: "admin" }, { onConflict: "user_id" })

    if (!error) return { isAdmin: true, source: "environment" }
    return { isAdmin: true, source: "environment" }
  }

  return { isAdmin: false, source: "none" }
}

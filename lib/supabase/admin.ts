import { createClient as createSupabaseClient } from "@supabase/supabase-js"

export function hasSupabaseAdminConfig() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)
  )
}

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const secretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !secretKey) {
    throw new Error("Supabase admin access is not configured. Set SUPABASE_SECRET_KEY on the server.")
  }

  return createSupabaseClient(url, secretKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })
}

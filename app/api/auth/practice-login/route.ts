import { NextResponse } from "next/server"
import { createAdminClient, hasSupabaseAdminConfig } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import {
  E2E_SESSION_COOKIE,
  E2E_SESSION_COOKIE_OPTIONS,
  e2eCredentialsMatch,
} from "@/lib/auth/e2e-session"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const USERNAME_PATTERN = /^[a-z0-9][a-z0-9._-]{2,31}$/

function invalidCredentials() {
  return NextResponse.json({ error: "Invalid username or password." }, { status: 401 })
}

export async function POST(request: Request) {
  let body: { username?: string; password?: string }
  try {
    body = await request.json() as { username?: string; password?: string }
  } catch {
    return invalidCredentials()
  }

  const username = (body.username || "").trim().toLowerCase()
  const password = body.password || ""
  if (!USERNAME_PATTERN.test(username) || password.length < 8 || password.length > 128) return invalidCredentials()

  if (e2eCredentialsMatch(request.headers.get("host"), username, password)) {
    const response = NextResponse.json({ ok: true, testSession: true }, { headers: { "Cache-Control": "no-store" } })
    response.cookies.set(E2E_SESSION_COOKIE, password, E2E_SESSION_COOKIE_OPTIONS)
    return response
  }

  if (!hasSupabaseAdminConfig()) {
    return NextResponse.json({ error: "Practice sign-in is temporarily unavailable." }, { status: 503 })
  }

  const admin = createAdminClient()
  const { data: account, error: accountError } = await admin
    .from("practice_access_accounts")
    .select("user_id,active")
    .eq("username_normalized", username)
    .maybeSingle()

  if (accountError || !account?.user_id || !account.active) return invalidCredentials()

  const { data: userData, error: userError } = await admin.auth.admin.getUserById(account.user_id)
  const internalEmail = userData.user?.email
  if (userError || !internalEmail) return invalidCredentials()

  const supabase = await createClient()
  const { error: signInError } = await supabase.auth.signInWithPassword({ email: internalEmail, password })
  if (signInError) return invalidCredentials()

  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } })
}

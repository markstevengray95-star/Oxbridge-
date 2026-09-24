import { NextResponse } from "next/server"
import { getAppAdminAccess } from "@/lib/auth/admin"
import { createAdminClient, hasSupabaseAdminConfig } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

async function requireAdmin() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const claims = data?.claims
  const userId = typeof claims?.sub === "string" ? claims.sub : null
  const email = typeof claims?.email === "string" ? claims.email : null
  if (!userId) return null
  const access = await getAppAdminAccess(userId, email)
  return access.isAdmin ? { userId, email } : null
}

export async function GET(request: Request) {
  const actor = await requireAdmin()
  if (!actor) return NextResponse.json({ error: "Administrator access required." }, { status: 403 })
  if (!hasSupabaseAdminConfig()) return NextResponse.json({ error: "Supabase admin access is not configured." }, { status: 503 })

  const url = new URL(request.url)
  const query = (url.searchParams.get("q") || "").trim().toLowerCase()
  const page = Math.max(1, Number(url.searchParams.get("page") || 1) || 1)
  const perPage = Math.min(200, Math.max(10, Number(url.searchParams.get("perPage") || 100) || 100))
  const admin = createAdminClient()

  const { data: authData, error: authError } = await admin.auth.admin.listUsers({ page, perPage })
  if (authError) return NextResponse.json({ error: authError.message }, { status: 500 })

  const users = authData.users ?? []
  const ids = users.map(user => user.id)
  const [profilesResult, subscriptionsResult, eventsResult] = await Promise.all([
    ids.length ? admin.from("profiles").select("id,display_name").in("id", ids) : Promise.resolve({ data: [], error: null }),
    ids.length ? admin.from("subscriptions").select("user_id,tier,status,current_period_end").in("user_id", ids) : Promise.resolve({ data: [], error: null }),
    ids.length ? admin.from("admin_auth_events").select("target_user_id,action,created_at").in("target_user_id", ids).order("created_at", { ascending: false }).limit(500) : Promise.resolve({ data: [], error: null }),
  ])

  const profiles = new Map((profilesResult.data ?? []).map(row => [row.id, row]))
  const subscriptions = new Map((subscriptionsResult.data ?? []).map(row => [row.user_id, row]))
  const latestReset = new Map<string, string>()
  for (const event of eventsResult.data ?? []) {
    if (event.action !== "password_reset_email" || latestReset.has(event.target_user_id)) continue
    latestReset.set(event.target_user_id, event.created_at)
  }

  const rows = users.map(user => {
    const profile = profiles.get(user.id)
    const subscription = subscriptions.get(user.id)
    const displayName = typeof profile?.display_name === "string" ? profile.display_name : typeof user.user_metadata?.display_name === "string" ? user.user_metadata.display_name : ""
    return {
      id: user.id,
      email: user.email ?? "",
      displayName,
      createdAt: user.created_at,
      lastSignInAt: user.last_sign_in_at ?? null,
      emailConfirmedAt: user.email_confirmed_at ?? null,
      bannedUntil: user.banned_until ?? null,
      plan: subscription?.tier ?? "free",
      subscriptionStatus: subscription?.status ?? "inactive",
      currentPeriodEnd: subscription?.current_period_end ?? null,
      lastPasswordResetEmailAt: latestReset.get(user.id) ?? null,
    }
  }).filter(row => !query || `${row.email} ${row.displayName}`.toLowerCase().includes(query))

  return NextResponse.json({ users: rows, page, perPage, total: authData.total ?? rows.length }, { headers: { "Cache-Control": "no-store" } })
}

export async function POST(request: Request) {
  const actor = await requireAdmin()
  if (!actor) return NextResponse.json({ error: "Administrator access required." }, { status: 403 })
  if (!hasSupabaseAdminConfig()) return NextResponse.json({ error: "Supabase admin access is not configured." }, { status: 503 })

  let body: { action?: string; userId?: string }
  try { body = await request.json() as { action?: string; userId?: string } } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }) }
  if (body.action !== "send_password_reset" || !body.userId) return NextResponse.json({ error: "Unsupported admin action." }, { status: 400 })

  const admin = createAdminClient()
  const { data: userData, error: userError } = await admin.auth.admin.getUserById(body.userId)
  if (userError || !userData.user?.email) return NextResponse.json({ error: userError?.message || "User email not found." }, { status: 404 })

  const origin = new URL(request.url).origin
  const redirectTo = `${origin}/auth/confirm?next=${encodeURIComponent("/reset-password")}`
  const { error: resetError } = await admin.auth.resetPasswordForEmail(userData.user.email, { redirectTo })
  if (resetError) return NextResponse.json({ error: resetError.message }, { status: 502 })

  await admin.from("admin_auth_events").insert({
    admin_user_id: actor.userId,
    target_user_id: body.userId,
    action: "password_reset_email",
    metadata: { channel: "email" },
  })

  return NextResponse.json({ ok: true, message: "A secure password-reset email has been requested for this account." })
}

import { randomUUID } from "node:crypto"
import { NextResponse } from "next/server"
import { getAppAdminAccess } from "@/lib/auth/admin"
import { createAdminClient, hasSupabaseAdminConfig } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const USERNAME_PATTERN = /^[a-z0-9][a-z0-9._-]{2,31}$/
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const noStore = { "Cache-Control": "private, no-store" }

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

function cleanUsername(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : ""
}

function cleanName(value: unknown) {
  return typeof value === "string" ? value.trim().slice(0, 80) : ""
}

// A YYYY-MM-DD selection expires at 23:59:59.999 UTC on that day.
function expiryForDay(input: unknown): { valid: boolean; expiresAt: string | null } {
  if (input == null || input === "") return { valid: true, expiresAt: null }
  if (typeof input !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(input)) return { valid: false, expiresAt: null }
  const [year, month, day] = input.split("-").map(Number)
  if (year < 2026 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) return { valid: false, expiresAt: null }
  const start = new Date(Date.UTC(year, month-1, day))
  if (start.getUTCFullYear() !== year || start.getUTCMonth() !== month-1 || start.getUTCDate() !== day) return { valid: false, expiresAt: null }
  const expiresAt = new Date(start.getTime() + 86400000 - 1).toISOString()
  return { valid: Date.parse(expiresAt) > Date.now(), expiresAt }
}

async function recordAudit(admin: ReturnType<typeof createAdminClient>, actor: string, userId: string, action: "create" | "set_expiry" | "remove" | "restore" | "set_password", expiresAt: string | null = null) {
  const { error } = await admin.from("practice_access_audit_events").insert({
    actor_user_id: actor, target_user_id: userId, action, expires_at: expiresAt,
  })
  if (error) console.error("Practice account audit failure", error.message)
}

export async function GET() {
  const actor = await requireAdmin()
  if (!actor) return NextResponse.json({ error: "Administrator access required." }, { status: 403 })
  if (!hasSupabaseAdminConfig()) return NextResponse.json({ error: "Supabase admin access is not configured." }, { status: 503 })

  const admin = createAdminClient()
  const { data: rows, error } = await admin
    .from("practice_access_accounts")
    .select("user_id,username,display_name,active,unlimited_usage,expires_at,created_at,updated_at")
    .eq("account_type", "student")
    .order("created_at", { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const accounts = await Promise.all((rows ?? []).map(async row => {
    const { data } = await admin.auth.admin.getUserById(row.user_id)
    return {
      userId: row.user_id,
      username: row.username,
      displayName: row.display_name || row.username,
      active: row.active,
      unlimitedUsage: row.unlimited_usage,
      expiresAt: row.expires_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      lastSignInAt: data.user?.last_sign_in_at ?? null,
    }
  }))

  return NextResponse.json({ accounts }, { headers: noStore })
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin")
  if (origin && origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 })
  }
  const actor = await requireAdmin()
  if (!actor) return NextResponse.json({ error: "Administrator access required." }, { status: 403 })
  if (!hasSupabaseAdminConfig()) return NextResponse.json({ error: "Supabase admin access is not configured." }, { status: 503 })

  let body: { action?: string; username?: string; password?: string; displayName?: string; userId?: string; expiresOn?: string | null }
  try {
    body = await request.json() as typeof body
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 })
  }

  const admin = createAdminClient()

  if (body.action === "create") {
    const username = cleanUsername(body.username)
    const displayName = cleanName(body.displayName) || username
    const password = typeof body.password === "string" ? body.password : ""
    const expiry = expiryForDay(body.expiresOn)
    if (!expiry.valid) return NextResponse.json({ error: "Choose a valid expiry date of today or later." }, { status: 400 })

    if (!USERNAME_PATTERN.test(username)) {
      return NextResponse.json({ error: "Use 3–32 lowercase letters, numbers, dots, dashes or underscores. The username must start with a letter or number." }, { status: 400 })
    }
    if (password.length < 8 || password.length > 128) {
      return NextResponse.json({ error: "Password must be between 8 and 128 characters." }, { status: 400 })
    }

    const { data: existing, error: lookupError } = await admin
      .from("practice_access_accounts")
      .select("user_id")
      .eq("username_normalized", username)
      .maybeSingle()
    if (lookupError) return NextResponse.json({ error: lookupError.message }, { status: 500 })
    if (existing) return NextResponse.json({ error: "That practice username is already in use." }, { status: 409 })

    const internalEmail = `practice+${randomUUID()}@scholarbridge.app`
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email: internalEmail,
      password,
      email_confirm: true,
      user_metadata: { display_name: displayName, account_type: "practice" },
      app_metadata: { account_type: "practice", practice_access: "unlimited" },
    })
    if (createError || !created.user) return NextResponse.json({ error: createError?.message || "Could not create practice account." }, { status: 500 })

    const { error: profileError } = await admin.from("profiles").upsert({
      id: created.user.id,
      display_name: displayName,
      updated_at: new Date().toISOString(),
    }, { onConflict: "id" })

    if (profileError) {
      await admin.auth.admin.deleteUser(created.user.id)
      return NextResponse.json({ error: `Could not create learner profile: ${profileError.message}` }, { status: 500 })
    }

    const { error: insertError } = await admin.from("practice_access_accounts").insert({
      user_id: created.user.id,
      username,
      username_normalized: username,
      display_name: displayName,
      active: true,
      unlimited_usage: true,
      created_by: actor.userId,
      account_type: "student",
      expires_at: expiry.expiresAt,
    })

    if (insertError) {
      await admin.auth.admin.deleteUser(created.user.id)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    await recordAudit(admin, actor.userId, created.user.id, "create", expiry.expiresAt)
    return NextResponse.json({
      ok: true,
      account: { userId: created.user.id, username, displayName, active: true, unlimitedUsage: true, expiresAt: expiry.expiresAt },
      message: `Practice account ${username} created with unlimited practice access${expiry.expiresAt ? " until its expiry date" : ""}.`,
    }, { headers: noStore })
  }

  if (body.action === "set_password") {
    const userId = typeof body.userId === "string" ? body.userId : ""
    const password = typeof body.password === "string" ? body.password : ""
    if (!userId || password.length < 8 || password.length > 128) {
      return NextResponse.json({ error: "Choose a password between 8 and 128 characters." }, { status: 400 })
    }

    const { data: practiceAccount, error: lookupError } = await admin
      .from("practice_access_accounts")
      .select("user_id")
      .eq("account_type","student")
      .eq("user_id", userId)
      .maybeSingle()
    if (lookupError) return NextResponse.json({ error: lookupError.message }, { status: 500 })
    if (!practiceAccount) return NextResponse.json({ error: "Practice account not found." }, { status: 404 })

    const { error: updateError } = await admin.auth.admin.updateUserById(userId, { password })
    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

    await admin.from("practice_access_accounts").update({ updated_at: new Date().toISOString() }).eq("user_id", userId)
    await recordAudit(admin, actor.userId, userId, "set_password")
    return NextResponse.json({ ok: true, message: "Practice password updated." }, { headers: noStore })
  }

  if (body.action === "set_expiry" || body.action === "remove" || body.action === "restore") {
    const userId = typeof body.userId === "string" ? body.userId : ""
    if (!UUID_PATTERN.test(userId)) return NextResponse.json({ error: "Select a valid student practice account." }, { status: 400 })
    const { data: account, error: accountError } = await admin.from("practice_access_accounts")
      .select("user_id,active,expires_at").eq("user_id", userId).eq("account_type", "student").maybeSingle()
    if (accountError) return NextResponse.json({ error: "Could not check practice account." }, { status: 500 })
    if (!account) return NextResponse.json({ error: "Practice account not found." }, { status: 404 })

    const now = new Date().toISOString()
    if (body.action === "set_expiry") {
      const expiry = expiryForDay(body.expiresOn)
      if (!expiry.valid) return NextResponse.json({ error: "Choose a valid expiry date of today or later, or clear the expiry." }, { status: 400 })
      const { error: updateError } = await admin.from("practice_access_accounts")
        .update({ expires_at: expiry.expiresAt, updated_at: now }).eq("user_id", userId).eq("account_type", "student")
      if (updateError) return NextResponse.json({ error: "Could not update expiry date." }, { status: 500 })
      await recordAudit(admin, actor.userId, userId, "set_expiry", expiry.expiresAt)
      return NextResponse.json({ ok: true, message: expiry.expiresAt ? "Practice login expiry saved." : "Practice login expiry removed." }, { headers: noStore })
    }

    if (body.action === "remove") {
      if (!account.active) return NextResponse.json({ ok: true, message: "Practice login was already removed." }, { headers: noStore })
      const { error: updateError } = await admin.from("practice_access_accounts")
        .update({ active: false, updated_at: now }).eq("user_id", userId).eq("account_type", "student")
      if (updateError) return NextResponse.json({ error: "Could not remove practice login access." }, { status: 500 })
      await recordAudit(admin, actor.userId, userId, "remove", account.expires_at)
      return NextResponse.json({ ok: true, message: "Practice login removed from active access. Saved student work has been preserved." }, { headers: noStore })
    }

    if (account.expires_at && Date.parse(account.expires_at) <= Date.now()) {
      return NextResponse.json({ error: "Extend or clear the expired date before restoring this login." }, { status: 409 })
    }
    const { error: restoreError } = await admin.from("practice_access_accounts")
      .update({ active: true, updated_at: now }).eq("user_id", userId).eq("account_type", "student")
    if (restoreError) return NextResponse.json({ error: "Could not restore practice login." }, { status: 500 })
    await recordAudit(admin, actor.userId, userId, "restore", account.expires_at)
    return NextResponse.json({ ok: true, message: "Practice login restored with its previous username and saved progress." }, { headers: noStore })
  }

  return NextResponse.json({ error: "Unsupported admin action." }, { status: 400 })
}

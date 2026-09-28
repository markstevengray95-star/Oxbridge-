import { randomUUID } from "node:crypto"
import { NextResponse } from "next/server"
import { getAppAdminAccess } from "@/lib/auth/admin"
import { createAdminClient, hasSupabaseAdminConfig } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const USERNAME_PATTERN = /^[a-z0-9][a-z0-9._-]{2,31}$/

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

export async function GET() {
  const actor = await requireAdmin()
  if (!actor) return NextResponse.json({ error: "Administrator access required." }, { status: 403 })
  if (!hasSupabaseAdminConfig()) return NextResponse.json({ error: "Supabase admin access is not configured." }, { status: 503 })

  const admin = createAdminClient()
  const { data: rows, error } = await admin
    .from("practice_access_accounts")
    .select("user_id,username,display_name,active,unlimited_usage,created_at,updated_at")
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
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      lastSignInAt: data.user?.last_sign_in_at ?? null,
    }
  }))

  return NextResponse.json({ accounts }, { headers: { "Cache-Control": "no-store" } })
}

export async function POST(request: Request) {
  const actor = await requireAdmin()
  if (!actor) return NextResponse.json({ error: "Administrator access required." }, { status: 403 })
  if (!hasSupabaseAdminConfig()) return NextResponse.json({ error: "Supabase admin access is not configured." }, { status: 503 })

  let body: { action?: string; username?: string; password?: string; displayName?: string; userId?: string }
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

    const { error: insertError } = await admin.from("practice_access_accounts").insert({
      user_id: created.user.id,
      username,
      username_normalized: username,
      display_name: displayName,
      active: true,
      unlimited_usage: true,
      created_by: actor.userId,
    })

    if (insertError) {
      await admin.auth.admin.deleteUser(created.user.id)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      account: { userId: created.user.id, username, displayName, active: true, unlimitedUsage: true },
      message: `Practice account ${username} created with unlimited practice access.`,
    })
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
      .eq("user_id", userId)
      .maybeSingle()
    if (lookupError) return NextResponse.json({ error: lookupError.message }, { status: 500 })
    if (!practiceAccount) return NextResponse.json({ error: "Practice account not found." }, { status: 404 })

    const { error: updateError } = await admin.auth.admin.updateUserById(userId, { password })
    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

    await admin.from("practice_access_accounts").update({ updated_at: new Date().toISOString() }).eq("user_id", userId)
    return NextResponse.json({ ok: true, message: "Practice password updated." })
  }

  return NextResponse.json({ error: "Unsupported admin action." }, { status: 400 })
}

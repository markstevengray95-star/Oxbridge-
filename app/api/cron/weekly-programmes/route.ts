import { NextResponse } from "next/server"
import { createAdminClient, hasSupabaseAdminConfig } from "@/lib/supabase/admin"
import { generateWeeklyProgramme, londonWeekStart, WEEKLY_PROGRAMME_STATE_KEY, type WeeklyProgramme } from "@/lib/weekly-programme"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type AdminClient = ReturnType<typeof createAdminClient>
type JsonRecord = Record<string, unknown>

function record(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {}
}

function isCurrentProgramme(value: unknown, weekStart: string): value is WeeklyProgramme {
  const item = record(value)
  return item.version === 2 && item.weekStart === weekStart && Array.isArray(item.days)
}

function authorised(request: Request) {
  const secret = process.env.CRON_SECRET?.trim()
  if (!secret) return { ok: false as const, status: 503, error: "Cron authentication is not configured" }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) return { ok: false as const, status: 401, error: "Unauthorized" }
  return { ok: true as const }
}

async function contextFor(admin: AdminClient, userId: string) {
  const [profileResult, intelligenceResult, mistakesResult, evidenceResult, applicationResult, supercurricularResult] = await Promise.all([
    admin.from("profiles").select("target_course").eq("id", userId).maybeSingle(),
    admin.from("student_intelligence").select("snapshot").eq("user_id", userId).maybeSingle(),
    admin.from("mistake_events").select("domain,label,severity,evidence,created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(12),
    admin.from("progress_evidence").select("domain,skill,score,evidence,created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(16),
    admin.from("application_evidence").select("id", { count: "exact", head: true }).eq("user_id", userId),
    admin.from("supercurricular_items").select("id", { count: "exact", head: true }).eq("user_id", userId),
  ])

  const snapshot = record(intelligenceResult.data?.snapshot)
  const profile = record(snapshot.profile)
  return {
    course: typeof profileResult.data?.target_course === "string" && profileResult.data.target_course.trim()
      ? profileResult.data.target_course
      : typeof profile.course === "string" ? profile.course : "General Oxbridge preparation",
    snapshot,
    mistakes: mistakesResult.data?.length ? mistakesResult.data : Array.isArray(snapshot.mistakes) ? snapshot.mistakes : [],
    evidence: evidenceResult.data?.length ? evidenceResult.data : Array.isArray(snapshot.evidence) ? snapshot.evidence : [],
    applicationCount: applicationResult.count ?? 0,
    supercurricularCount: supercurricularResult.count ?? 0,
  }
}

async function generateForUser(admin: AdminClient, userId: string, weekStart: string) {
  const { data: row } = await admin
    .from("user_state")
    .select("state_value")
    .eq("user_id", userId)
    .eq("state_key", WEEKLY_PROGRAMME_STATE_KEY)
    .maybeSingle()

  if (isCurrentProgramme(row?.state_value, weekStart)) return "skipped" as const
  const previous = record(row?.state_value)
  const previousMinutes = Number(previous.dailyMinutes)
  const context = await contextFor(admin, userId)
  const programme = generateWeeklyProgramme({
    ...context,
    dailyMinutes: Number.isFinite(previousMinutes) ? previousMinutes : 45,
  })

  const { error } = await admin.from("user_state").upsert({
    user_id: userId,
    state_key: WEEKLY_PROGRAMME_STATE_KEY,
    state_value: programme,
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id,state_key" })
  if (error) throw error
  return "generated" as const
}

export async function GET(request: Request) {
  const auth = authorised(request)
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
  if (!hasSupabaseAdminConfig()) return NextResponse.json({ error: "Supabase admin access is not configured" }, { status: 503 })

  const admin = createAdminClient()
  const [{ data: subscriptions, error: subscriptionError }, { data: seats, error: seatError }] = await Promise.all([
    admin.from("subscriptions").select("user_id,tier,status").in("tier", ["pro", "school"]).in("status", ["active", "trialing"]),
    admin.from("school_seat_entitlements").select("user_id").eq("active", true),
  ])
  if (subscriptionError || seatError) {
    console.error("Weekly programme cron could not list paid users", subscriptionError ?? seatError)
    return NextResponse.json({ error: "Paid-user list could not be loaded" }, { status: 500 })
  }

  const userIds = [...new Set([...(subscriptions ?? []).map(row => row.user_id), ...(seats ?? []).map(row => row.user_id)].filter(Boolean))]
  const weekStart = londonWeekStart()
  let generated = 0
  let skipped = 0
  let failed = 0

  for (let start = 0; start < userIds.length; start += 10) {
    const batch = userIds.slice(start, start + 10)
    const results = await Promise.all(batch.map(async userId => {
      try { return await generateForUser(admin, userId, weekStart) }
      catch (cause) { console.error("Weekly programme cron user failed", userId, cause); return "failed" as const }
    }))
    generated += results.filter(result => result === "generated").length
    skipped += results.filter(result => result === "skipped").length
    failed += results.filter(result => result === "failed").length
  }

  return NextResponse.json({ ok: failed === 0, weekStart, eligibleUsers: userIds.length, generated, skipped, failed })
}

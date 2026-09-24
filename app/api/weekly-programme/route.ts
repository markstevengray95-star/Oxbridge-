import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { generateWeeklyProgramme, londonWeekStart, WEEKLY_PROGRAMME_STATE_KEY, type WeeklyProgramme } from "@/lib/weekly-programme"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type JsonRecord = Record<string, unknown>
type ActionBody = { action?: "regenerate" | "setMinutes" | "toggle"; dailyMinutes?: number; taskId?: string }

function record(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {}
}

function isCurrentProgramme(value: unknown, weekStart: string): value is WeeklyProgramme {
  const item = record(value)
  return item.version === 2 && item.weekStart === weekStart && Array.isArray(item.days)
}

function paidTier(tier: unknown, status: unknown, seatActive: unknown) {
  if (seatActive === true) return "school"
  if (status !== "active" && status !== "trialing") return "free"
  return tier === "school" ? "school" : tier === "pro" ? "pro" : "free"
}

async function userContext(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const [profileResult, intelligenceResult, mistakesResult, evidenceResult, applicationResult, supercurricularResult] = await Promise.all([
    supabase.from("profiles").select("target_course").eq("id", userId).maybeSingle(),
    supabase.from("student_intelligence").select("snapshot").eq("user_id", userId).maybeSingle(),
    supabase.from("mistake_events").select("domain,label,severity,evidence,created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(12),
    supabase.from("progress_evidence").select("domain,skill,score,evidence,created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(16),
    supabase.from("application_evidence").select("id", { count: "exact", head: true }).eq("user_id", userId),
    supabase.from("supercurricular_items").select("id", { count: "exact", head: true }).eq("user_id", userId),
  ])

  const snapshot = record(intelligenceResult.data?.snapshot)
  const snapshotProfile = record(snapshot.profile)
  const fallbackMistakes = Array.isArray(snapshot.mistakes) ? snapshot.mistakes : []
  const fallbackEvidence = Array.isArray(snapshot.evidence) ? snapshot.evidence : []

  return {
    course: typeof profileResult.data?.target_course === "string" && profileResult.data.target_course.trim()
      ? profileResult.data.target_course
      : typeof snapshotProfile.course === "string" ? snapshotProfile.course : "General Oxbridge preparation",
    snapshot,
    mistakes: mistakesResult.data?.length ? mistakesResult.data : fallbackMistakes,
    evidence: evidenceResult.data?.length ? evidenceResult.data : fallbackEvidence,
    applicationCount: applicationResult.count ?? 0,
    supercurricularCount: supercurricularResult.count ?? 0,
  }
}

async function saveProgramme(supabase: Awaited<ReturnType<typeof createClient>>, userId: string, programme: WeeklyProgramme) {
  const { error } = await supabase.from("user_state").upsert({
    user_id: userId,
    state_key: WEEKLY_PROGRAMME_STATE_KEY,
    state_value: programme,
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id,state_key" })
  if (error) throw error
}

async function accessAndStoredProgramme(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const [{ data: subscription }, { data: seat }, { data: state }] = await Promise.all([
    supabase.from("subscriptions").select("tier,status").eq("user_id", userId).maybeSingle(),
    supabase.from("school_seat_entitlements").select("active").eq("user_id", userId).maybeSingle(),
    supabase.from("user_state").select("state_value").eq("user_id", userId).eq("state_key", WEEKLY_PROGRAMME_STATE_KEY).maybeSingle(),
  ])
  return {
    tier: paidTier(subscription?.tier, subscription?.status, seat?.active),
    stored: state?.state_value,
  }
}

async function ensureCurrentProgramme(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  stored: unknown,
  requestedMinutes?: number,
  force = false,
) {
  const weekStart = londonWeekStart()
  if (!force && isCurrentProgramme(stored, weekStart)) return stored
  const old = record(stored)
  const context = await userContext(supabase, userId)
  const programme = generateWeeklyProgramme({
    ...context,
    dailyMinutes: requestedMinutes ?? Number(old.dailyMinutes) || 45,
  })
  await saveProgramme(supabase, userId, programme)
  return programme
}

export async function GET() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const userId = typeof data?.claims?.sub === "string" ? data.claims.sub : ""
  if (!userId) return NextResponse.json({ error: "Sign in required" }, { status: 401 })

  const { tier, stored } = await accessAndStoredProgramme(supabase, userId)
  if (tier === "free") return NextResponse.json({ error: "Pro plan required" }, { status: 403 })

  try {
    const programme = await ensureCurrentProgramme(supabase, userId, stored)
    return NextResponse.json({ programme, tier, automaticRollover: true })
  } catch (cause) {
    console.error("Weekly programme load failed", cause)
    return NextResponse.json({ error: "Weekly programme could not be loaded" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const userId = typeof data?.claims?.sub === "string" ? data.claims.sub : ""
  if (!userId) return NextResponse.json({ error: "Sign in required" }, { status: 401 })

  let body: ActionBody
  try { body = await request.json() as ActionBody } catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }) }

  const { tier, stored } = await accessAndStoredProgramme(supabase, userId)
  if (tier === "free") return NextResponse.json({ error: "Pro plan required" }, { status: 403 })

  try {
    if (body.action === "regenerate" || body.action === "setMinutes") {
      const programme = await ensureCurrentProgramme(supabase, userId, stored, body.dailyMinutes, true)
      return NextResponse.json({ programme })
    }

    if (body.action === "toggle") {
      const taskId = (body.taskId ?? "").trim().slice(0, 180)
      if (!taskId) return NextResponse.json({ error: "Task id required" }, { status: 400 })
      const current = await ensureCurrentProgramme(supabase, userId, stored)
      const validTaskIds = new Set(current.days.flatMap(day => day.tasks.map(task => task.id)))
      if (!validTaskIds.has(taskId)) return NextResponse.json({ error: "Task not found in current week" }, { status: 404 })
      const completedIds = current.completedIds.includes(taskId)
        ? current.completedIds.filter(id => id !== taskId)
        : [...current.completedIds, taskId]
      const programme = { ...current, completedIds }
      await saveProgramme(supabase, userId, programme)
      return NextResponse.json({ programme })
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 })
  } catch (cause) {
    console.error("Weekly programme update failed", cause)
    return NextResponse.json({ error: "Weekly programme could not be updated" }, { status: 500 })
  }
}

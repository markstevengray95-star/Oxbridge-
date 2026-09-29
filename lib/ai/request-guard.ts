import { createAdminClient, hasSupabaseAdminConfig } from "@/lib/supabase/admin"

type AccessTier = "anonymous" | "free" | "pro" | "school" | "practice" | "admin"

type GuardPolicy = {
  burstLimit: number
  hourLimit: number
  concurrencyLimit: number
  leaseSeconds: number
}

export type AiGuardResult = {
  allowed: boolean
  reason: string
  retryAfterSeconds: number
  burstRemaining: number
  hourRemaining: number
  scope: string | null
}

const AI_ROUTE_PREFIXES = [
  "/api/analyse-working",
  "/api/answer-feedback",
  "/api/essay-analysis",
  "/api/interview-adjudicate",
  "/api/interview-feedback",
  "/api/interview-turn",
  "/api/natural-speech",
  "/api/personal-tutor",
  "/api/personalised-question",
  "/api/question-mutate",
  "/api/written-work-defence",
]

const POLICY: Record<AccessTier, GuardPolicy> = {
  anonymous: { burstLimit: 2, hourLimit: 8, concurrencyLimit: 1, leaseSeconds: 45 },
  free: { burstLimit: 6, hourLimit: 50, concurrencyLimit: 2, leaseSeconds: 45 },
  pro: { burstLimit: 20, hourLimit: 300, concurrencyLimit: 5, leaseSeconds: 45 },
  school: { burstLimit: 30, hourLimit: 500, concurrencyLimit: 8, leaseSeconds: 45 },
  practice: { burstLimit: 60, hourLimit: 2000, concurrencyLimit: 10, leaseSeconds: 45 },
  admin: { burstLimit: 120, hourLimit: 5000, concurrencyLimit: 20, leaseSeconds: 45 },
}

export function aiScopeForPath(pathname: string) {
  return AI_ROUTE_PREFIXES.find(prefix => pathname === prefix || pathname.startsWith(`${prefix}/`)) ?? null
}

function firstHeaderValue(value: string | null) {
  return value?.split(",")[0]?.trim() || ""
}

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value)
  const digest = await crypto.subtle.digest("SHA-256", bytes)
  return Array.from(new Uint8Array(digest)).map(byte => byte.toString(16).padStart(2, "0")).join("")
}

async function anonymousActor(headers: Headers) {
  const forwarded = firstHeaderValue(headers.get("x-forwarded-for"))
  const real = firstHeaderValue(headers.get("x-real-ip"))
  const connecting = firstHeaderValue(headers.get("cf-connecting-ip"))
  const address = connecting || forwarded || real || "unknown"
  const agent = headers.get("user-agent")?.slice(0, 160) || "unknown"
  const salt = process.env.AI_RATE_LIMIT_SALT || "scholarbridge-anonymous-rate-limit"
  return `anon:${(await sha256(`${salt}|${address}|${agent}`)).slice(0, 32)}`
}

export async function guardAiRequest(input: {
  pathname: string
  headers: Headers
  userId: string | null
  tier: AccessTier
}): Promise<AiGuardResult> {
  const scope = aiScopeForPath(input.pathname)
  if (!scope) return { allowed: true, reason: "not_ai_route", retryAfterSeconds: 0, burstRemaining: 0, hourRemaining: 0, scope: null }

  if (!hasSupabaseAdminConfig()) {
    return { allowed: false, reason: "guard_unavailable", retryAfterSeconds: 10, burstRemaining: 0, hourRemaining: 0, scope }
  }

  const policy = POLICY[input.tier]
  const actorKey = input.userId ? `user:${input.userId}` : await anonymousActor(input.headers)
  const leaseId = crypto.randomUUID()
  const admin = createAdminClient()
  const { data, error } = await admin.rpc("guard_ai_request", {
    p_actor_key: actorKey,
    p_scope: scope.replace(/^\/api\//, ""),
    p_burst_limit: policy.burstLimit,
    p_hour_limit: policy.hourLimit,
    p_concurrency_limit: policy.concurrencyLimit,
    p_lease_seconds: policy.leaseSeconds,
    p_lease_id: leaseId,
  })

  if (error) {
    console.error("AI request guard failed", { scope, code: error.code, message: error.message })
    return { allowed: false, reason: "guard_unavailable", retryAfterSeconds: 10, burstRemaining: 0, hourRemaining: 0, scope }
  }

  const row = Array.isArray(data) ? data[0] : data
  return {
    allowed: row?.allowed === true,
    reason: typeof row?.reason === "string" ? row.reason : "unknown",
    retryAfterSeconds: Math.max(0, Number(row?.retry_after_seconds || 0)),
    burstRemaining: Math.max(0, Number(row?.burst_remaining || 0)),
    hourRemaining: Math.max(0, Number(row?.hour_remaining || 0)),
    scope,
  }
}

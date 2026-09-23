import { createAdminClient, hasSupabaseAdminConfig } from "@/lib/supabase/admin"
import {
  effectiveTier,
  geminiReservationMinutes,
  monthStartIso,
  monthlyGeminiMinutes,
  type SubscriptionStatus,
  type SubscriptionTier,
} from "@/lib/billing/plans"

type UsageState = {
  tier: SubscriptionTier
  status: SubscriptionStatus
  usedMinutes: number
  limitMinutes: number
  remainingMinutes: number
  reservationMinutes: number
  enforced: boolean
}

function numeric(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

export async function getGeminiUsageState(userId: string): Promise<UsageState> {
  const reservationMinutes = geminiReservationMinutes()

  if (!hasSupabaseAdminConfig()) {
    return {
      tier: "free",
      status: "inactive",
      usedMinutes: 0,
      limitMinutes: monthlyGeminiMinutes("free"),
      remainingMinutes: monthlyGeminiMinutes("free"),
      reservationMinutes,
      enforced: false,
    }
  }

  const admin = createAdminClient()
  const [{ data: subscription }, { data: events }] = await Promise.all([
    admin
      .from("subscriptions")
      .select("tier,status")
      .eq("user_id", userId)
      .maybeSingle(),
    admin
      .from("usage_events")
      .select("quantity")
      .eq("user_id", userId)
      .eq("event_type", "gemini_live_reserved_minutes")
      .gte("created_at", monthStartIso()),
  ])

  const rawTier = (subscription?.tier ?? "free") as SubscriptionTier
  const status = (subscription?.status ?? "inactive") as SubscriptionStatus
  const tier = effectiveTier(rawTier, status)
  const usedMinutes = (events ?? []).reduce((total, row) => total + numeric(row.quantity), 0)
  const limitMinutes = monthlyGeminiMinutes(tier)

  return {
    tier,
    status,
    usedMinutes,
    limitMinutes,
    remainingMinutes: Math.max(0, limitMinutes - usedMinutes),
    reservationMinutes,
    enforced: true,
  }
}

export async function reserveGeminiSession(userId: string) {
  const state = await getGeminiUsageState(userId)

  if (!state.enforced) {
    return { allowed: true as const, state, reservationId: null as string | null }
  }

  if (state.remainingMinutes < state.reservationMinutes) {
    return { allowed: false as const, state, reservationId: null as string | null }
  }

  const admin = createAdminClient()
  const { data, error } = await admin.from("usage_events").insert({
    user_id: userId,
    event_type: "gemini_live_reserved_minutes",
    quantity: state.reservationMinutes,
    metadata: {
      source: "server",
      feature: "gemini_live",
      reservation_minutes: state.reservationMinutes,
    },
  }).select("id").single()

  if (error) throw new Error(`Could not reserve Gemini Live usage: ${error.message}`)

  return {
    allowed: true as const,
    reservationId: data.id as string,
    state: {
      ...state,
      usedMinutes: state.usedMinutes + state.reservationMinutes,
      remainingMinutes: Math.max(0, state.remainingMinutes - state.reservationMinutes),
    },
  }
}

export async function releaseGeminiReservation(reservationId: string | null) {
  if (!reservationId || !hasSupabaseAdminConfig()) return
  const admin = createAdminClient()
  await admin.from("usage_events").delete().eq("id", reservationId).eq("event_type", "gemini_live_reserved_minutes")
}

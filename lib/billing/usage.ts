import { getAppAdminAccess } from "@/lib/auth/admin"
import { createAdminClient, hasSupabaseAdminConfig } from "@/lib/supabase/admin"
import { effectiveTier, geminiReservationMinutes, monthStartIso, monthlyGeminiMinutes, type SubscriptionStatus, type SubscriptionTier } from "@/lib/billing/plans"

type UsageState = {
  tier: SubscriptionTier
  status: SubscriptionStatus
  usedMinutes: number
  limitMinutes: number
  baseRemainingMinutes: number
  creditMinutes: number
  remainingMinutes: number
  reservationMinutes: number
  enforced: boolean
  isAdmin: boolean
  unlimited: boolean
}

type SupabaseResult = { error?: { message?: string; code?: string } | null }

type AtomicReservationRow = {
  allowed?: boolean
  reservation_id?: string | null
  event_type?: string | null
  used_minutes?: number | string | null
  base_remaining_minutes?: number | string | null
  credit_remaining_minutes?: number | string | null
}

function numeric(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function assertUsageQuery(result: SupabaseResult, label: string) {
  if (!result.error) return
  const code = result.error.code ? ` (${result.error.code})` : ""
  throw new Error(`Gemini usage lookup failed for ${label}${code}: ${result.error.message || "unknown database error"}`)
}

function unlimitedState(reservationMinutes: number, isAdmin: boolean): UsageState {
  return {
    tier: "school",
    status: "active",
    usedMinutes: 0,
    limitMinutes: 0,
    baseRemainingMinutes: 0,
    creditMinutes: 0,
    remainingMinutes: 0,
    reservationMinutes,
    enforced: false,
    isAdmin,
    unlimited: true,
  }
}

export async function getGeminiUsageState(userId: string, email?: string | null): Promise<UsageState> {
  const reservationMinutes = geminiReservationMinutes()
  const adminAccess = await getAppAdminAccess(userId, email)
  if (adminAccess.isAdmin) return unlimitedState(reservationMinutes, true)

  if (!hasSupabaseAdminConfig()) {
    const limit = monthlyGeminiMinutes("free")
    return {
      tier: "free",
      status: "inactive",
      usedMinutes: 0,
      limitMinutes: limit,
      baseRemainingMinutes: limit,
      creditMinutes: 0,
      remainingMinutes: limit,
      reservationMinutes,
      enforced: false,
      isAdmin: false,
      unlimited: false,
    }
  }

  const admin = createAdminClient()
  const practiceResult = await admin
    .from("practice_access_accounts")
    .select("active,unlimited_usage")
    .eq("user_id", userId)
    .maybeSingle()

  assertUsageQuery(practiceResult, "practice access")
  if (practiceResult.data?.active && practiceResult.data?.unlimited_usage) {
    return unlimitedState(reservationMinutes, false)
  }

  const [subscriptionResult, seatResult, baseEventsResult, creditPurchasesResult, creditUsesResult] = await Promise.all([
    admin.from("subscriptions").select("tier,status").eq("user_id", userId).maybeSingle(),
    admin.from("school_seat_entitlements").select("active").eq("user_id", userId).maybeSingle(),
    admin.from("usage_events").select("quantity").eq("user_id", userId).eq("event_type", "gemini_live_reserved_minutes").gte("created_at", monthStartIso()),
    admin.from("usage_events").select("quantity").eq("user_id", userId).eq("event_type", "gemini_live_credit_minutes"),
    admin.from("usage_events").select("quantity").eq("user_id", userId).eq("event_type", "gemini_live_credit_consumed_minutes"),
  ])

  assertUsageQuery(subscriptionResult, "subscriptions")
  assertUsageQuery(seatResult, "school seat entitlements")
  assertUsageQuery(baseEventsResult, "monthly Gemini usage")
  assertUsageQuery(creditPurchasesResult, "Gemini credit purchases")
  assertUsageQuery(creditUsesResult, "Gemini credit consumption")

  const subscription = subscriptionResult.data
  const seat = seatResult.data
  const baseEvents = baseEventsResult.data
  const creditPurchases = creditPurchasesResult.data
  const creditUses = creditUsesResult.data

  const rawTier = (subscription?.tier ?? "free") as SubscriptionTier
  const rawStatus = (subscription?.status ?? "inactive") as SubscriptionStatus
  const paidTier = effectiveTier(rawTier, rawStatus)
  const tier: SubscriptionTier = seat?.active ? "school" : paidTier
  const status: SubscriptionStatus = seat?.active ? "active" : rawStatus
  const usedMinutes = (baseEvents ?? []).reduce((total, row) => total + numeric(row.quantity), 0)
  const limitMinutes = monthlyGeminiMinutes(tier)
  const baseRemainingMinutes = Math.max(0, limitMinutes - usedMinutes)
  const purchased = (creditPurchases ?? []).reduce((total, row) => total + numeric(row.quantity), 0)
  const consumed = (creditUses ?? []).reduce((total, row) => total + numeric(row.quantity), 0)
  const creditMinutes = Math.max(0, purchased - consumed)

  return {
    tier,
    status,
    usedMinutes,
    limitMinutes,
    baseRemainingMinutes,
    creditMinutes,
    remainingMinutes: baseRemainingMinutes + creditMinutes,
    reservationMinutes,
    enforced: true,
    isAdmin: false,
    unlimited: false,
  }
}

export async function reserveGeminiSession(userId: string, email?: string | null) {
  const state = await getGeminiUsageState(userId, email)
  if (state.unlimited || !state.enforced) {
    return { allowed: true as const, state, reservationId: null as string | null }
  }

  const admin = createAdminClient()
  const { data, error } = await admin.rpc("oxbridge_reserve_gemini_minutes", {
    p_user_id: userId,
    p_amount: state.reservationMinutes,
    p_monthly_limit: state.limitMinutes,
    p_month_start: monthStartIso(),
  }).maybeSingle()

  if (error) throw new Error(`Could not reserve Gemini Live usage: ${error.message}`)
  const row = (data ?? {}) as AtomicReservationRow
  const baseRemainingMinutes = numeric(row.base_remaining_minutes)
  const creditMinutes = numeric(row.credit_remaining_minutes)
  const nextState: UsageState = {
    ...state,
    usedMinutes: numeric(row.used_minutes),
    baseRemainingMinutes,
    creditMinutes,
    remainingMinutes: baseRemainingMinutes + creditMinutes,
  }

  if (!row.allowed || !row.reservation_id) {
    return { allowed: false as const, state: nextState, reservationId: null as string | null }
  }

  return {
    allowed: true as const,
    reservationId: row.reservation_id,
    state: nextState,
  }
}

export async function releaseGeminiReservation(reservationId: string | null) {
  if (!reservationId || !hasSupabaseAdminConfig()) return
  const admin = createAdminClient()
  const { error } = await admin
    .from("usage_events")
    .delete()
    .eq("id", reservationId)
    .in("event_type", ["gemini_live_reserved_minutes", "gemini_live_credit_consumed_minutes"])

  if (error) console.error("Could not release Gemini Live reservation", error.message)
}

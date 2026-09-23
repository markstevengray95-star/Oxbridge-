export type SubscriptionTier = "free" | "pro" | "school"
export type SubscriptionStatus = "inactive" | "trialing" | "active" | "past_due" | "canceled"

const DEFAULT_LIMITS: Record<SubscriptionTier, number> = {
  free: 15,
  pro: 240,
  school: 600,
}

function numberFromEnv(name: string, fallback: number) {
  const raw = process.env[name]
  const parsed = raw ? Number(raw) : Number.NaN
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback
}

export function monthlyGeminiMinutes(tier: SubscriptionTier) {
  if (tier === "pro") return numberFromEnv("PRO_GEMINI_MONTHLY_MINUTES", DEFAULT_LIMITS.pro)
  if (tier === "school") return numberFromEnv("SCHOOL_GEMINI_MONTHLY_MINUTES", DEFAULT_LIMITS.school)
  return numberFromEnv("FREE_GEMINI_MONTHLY_MINUTES", DEFAULT_LIMITS.free)
}

export function geminiReservationMinutes() {
  return numberFromEnv("GEMINI_SESSION_RESERVATION_MINUTES", 15)
}

export function effectiveTier(tier: SubscriptionTier | null | undefined, status: SubscriptionStatus | null | undefined): SubscriptionTier {
  if ((status === "active" || status === "trialing") && (tier === "pro" || tier === "school")) return tier
  return "free"
}

export function stripePriceForTier(tier: Exclude<SubscriptionTier, "free">) {
  if (tier === "school") return process.env.STRIPE_SCHOOL_PRICE_ID || ""
  return process.env.STRIPE_PRO_PRICE_ID || ""
}

export function tierFromStripePrice(priceId: string | null | undefined): SubscriptionTier {
  if (priceId && process.env.STRIPE_SCHOOL_PRICE_ID && priceId === process.env.STRIPE_SCHOOL_PRICE_ID) return "school"
  if (priceId && process.env.STRIPE_PRO_PRICE_ID && priceId === process.env.STRIPE_PRO_PRICE_ID) return "pro"
  return "free"
}

export function monthStartIso(now = new Date()) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString()
}

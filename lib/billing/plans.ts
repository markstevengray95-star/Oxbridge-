export type SubscriptionTier = "free" | "pro" | "school"
export type SubscriptionStatus = "inactive" | "trialing" | "active" | "past_due" | "canceled"
export type BillingInterval = "monthly" | "annual"

const DEFAULT_LIMITS: Record<SubscriptionTier, number> = {
  free: 15,
  pro: 240,
  school: 600,
}

export const PRICING = {
  free: {
    monthly: 0,
    annual: 0,
  },
  pro: {
    monthly: 14.99,
    annual: 119,
  },
  school: {
    monthly: 59,
    annual: 499,
  },
} as const

function numberFromEnv(name: string, fallback: number) {
  const raw = process.env[name]
  const parsed = raw ? Number(raw) : Number.NaN
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback
}

export function displayPrice(tier: SubscriptionTier, interval: BillingInterval) {
  const fallback = PRICING[tier][interval]
  if (tier === "pro") return numberFromEnv(interval === "annual" ? "PRO_ANNUAL_PRICE_GBP" : "PRO_MONTHLY_PRICE_GBP", fallback)
  if (tier === "school") return numberFromEnv(interval === "annual" ? "SCHOOL_ANNUAL_PRICE_GBP" : "SCHOOL_MONTHLY_PRICE_GBP", fallback)
  return 0
}

export function annualSavingPercent(tier: Exclude<SubscriptionTier, "free">) {
  const monthly = displayPrice(tier, "monthly")
  const annual = displayPrice(tier, "annual")
  if (!monthly || !annual) return 0
  return Math.max(0, Math.round((1 - annual / (monthly * 12)) * 100))
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

export function stripePriceForTier(tier: Exclude<SubscriptionTier, "free">, interval: BillingInterval = "monthly") {
  if (tier === "school") {
    if (interval === "annual") return process.env.STRIPE_SCHOOL_ANNUAL_PRICE_ID || ""
    return process.env.STRIPE_SCHOOL_MONTHLY_PRICE_ID || process.env.STRIPE_SCHOOL_PRICE_ID || ""
  }
  if (interval === "annual") return process.env.STRIPE_PRO_ANNUAL_PRICE_ID || ""
  return process.env.STRIPE_PRO_MONTHLY_PRICE_ID || process.env.STRIPE_PRO_PRICE_ID || ""
}

export function tierFromStripePrice(priceId: string | null | undefined): SubscriptionTier {
  if (!priceId) return "free"
  const schoolIds = [process.env.STRIPE_SCHOOL_PRICE_ID, process.env.STRIPE_SCHOOL_MONTHLY_PRICE_ID, process.env.STRIPE_SCHOOL_ANNUAL_PRICE_ID].filter(Boolean)
  if (schoolIds.includes(priceId)) return "school"
  const proIds = [process.env.STRIPE_PRO_PRICE_ID, process.env.STRIPE_PRO_MONTHLY_PRICE_ID, process.env.STRIPE_PRO_ANNUAL_PRICE_ID].filter(Boolean)
  if (proIds.includes(priceId)) return "pro"
  return "free"
}

export function monthStartIso(now = new Date()) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString()
}

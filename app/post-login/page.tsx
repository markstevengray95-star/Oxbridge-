import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { effectiveTier, type SubscriptionStatus, type SubscriptionTier } from "@/lib/billing/plans"
import { onboardingCompleted, PLAN_ONBOARDING_STATE_KEY } from "@/lib/onboarding"

export const dynamic = "force-dynamic"

export default async function PostLoginPage() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const userId = typeof data?.claims?.sub === "string" ? data.claims.sub : ""
  if (!userId) redirect("/login?next=/post-login")

  const [{ data: subscription }, { data: seat }, { data: onboarding }] = await Promise.all([
    supabase.from("subscriptions").select("tier,status").eq("user_id", userId).maybeSingle(),
    supabase.from("school_seat_entitlements").select("active").eq("user_id", userId).maybeSingle(),
    supabase.from("user_state").select("state_value").eq("user_id", userId).eq("state_key", PLAN_ONBOARDING_STATE_KEY).maybeSingle(),
  ])

  const tier = seat?.active
    ? "school"
    : effectiveTier((subscription?.tier ?? "free") as SubscriptionTier, (subscription?.status ?? "inactive") as SubscriptionStatus)

  if (tier === "pro" || tier === "school" || onboardingCompleted(onboarding?.state_value)) redirect("/student-home")
  redirect("/premium?onboarding=required")
}

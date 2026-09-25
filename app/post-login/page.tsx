import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { effectiveTier, type SubscriptionStatus, type SubscriptionTier } from "@/lib/billing/plans"
import { isConfiguredAdminEmail } from "@/lib/auth/admin-access"
import { FREE_PLAN_COOKIE, onboardingCompleted, PLAN_ONBOARDING_STATE_KEY } from "@/lib/onboarding"

export const dynamic = "force-dynamic"
type PageProps = { searchParams?: Promise<{ billing?: string }> }

export default async function PostLoginPage({ searchParams }: PageProps) {
  const params = searchParams ? await searchParams : {}
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const userId = typeof data?.claims?.sub === "string" ? data.claims.sub : ""
  const email = typeof data?.claims?.email === "string" ? data.claims.email : null
  if (!userId) redirect("/login?next=/post-login")

  // Copy versioned signup acknowledgement from auth metadata into a first-class audit row.
  // This is deliberately best-effort so a temporarily missing migration never blocks login.
  try {
    const { data: userData } = await supabase.auth.getUser()
    const metadata = userData.user?.user_metadata ?? {}
    const ageBand = metadata.age_band
    const termsVersion = metadata.terms_version
    const privacyVersion = metadata.privacy_version
    const acceptedAt = metadata.legal_accepted_at
    if (["13-15", "16-17", "18+"].includes(ageBand) && typeof termsVersion === "string" && typeof privacyVersion === "string") {
      await supabase.from("legal_acceptances").upsert({
        user_id: userId,
        age_band: ageBand,
        terms_version: termsVersion,
        privacy_version: privacyVersion,
        accepted_at: typeof acceptedAt === "string" ? acceptedAt : new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" })
    }
  } catch (error) {
    console.warn("Could not persist legal acceptance audit row", error)
  }

  const isAdmin = isConfiguredAdminEmail(email)
  if (isAdmin) redirect("/student-home")

  const cookieStore = await cookies()
  const cookieFreePlan = cookieStore.get(FREE_PLAN_COOKIE)?.value === userId
  const [{ data: subscription }, { data: seat }, { data: onboarding }] = await Promise.all([
    supabase.from("subscriptions").select("tier,status").eq("user_id", userId).maybeSingle(),
    supabase.from("school_seat_entitlements").select("active").eq("user_id", userId).maybeSingle(),
    supabase.from("user_state").select("state_value").eq("user_id", userId).eq("state_key", PLAN_ONBOARDING_STATE_KEY).maybeSingle(),
  ])

  const tier = seat?.active
    ? "school"
    : effectiveTier((subscription?.tier ?? "free") as SubscriptionTier, (subscription?.status ?? "inactive") as SubscriptionStatus)

  if (tier === "pro" || tier === "school" || cookieFreePlan || onboardingCompleted(onboarding?.state_value)) redirect("/student-home")
  if (params.billing === "success") redirect("/premium?billing=success")
  redirect("/premium?onboarding=required")
}

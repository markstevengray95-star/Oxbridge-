import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient, hasSupabaseAdminConfig } from "@/lib/supabase/admin"
import { getStripe, isStripeConfigured } from "@/lib/stripe/server"
import { trialDaysForTier, type BillingInterval, type SubscriptionTier } from "@/lib/billing/plans"
import { checkoutLineItem } from "@/lib/billing/checkout"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function redirectPricing(request: Request, value: string) {
  const url = new URL("/premium", request.url)
  url.searchParams.set("billing", value)
  return NextResponse.redirect(url, 303)
}

function legalIdentityReady() {
  const name = process.env.NEXT_PUBLIC_DATA_CONTROLLER_NAME?.trim()
  const address = process.env.NEXT_PUBLIC_DATA_CONTROLLER_ADDRESS?.trim()
  const contact = (process.env.NEXT_PUBLIC_LEGAL_CONTACT_EMAIL || process.env.NEXT_PUBLIC_PRIVACY_CONTACT_EMAIL)?.trim()
  return Boolean(name && address && contact)
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: claimsData } = await supabase.auth.getClaims()
    const userId = claimsData?.claims?.sub
    if (!userId) {
      const login = new URL("/login", request.url)
      login.searchParams.set("next", "/post-login")
      return NextResponse.redirect(login, 303)
    }

    const formData = await request.formData()
    const requestedTier = String(formData.get("tier") || "pro") as SubscriptionTier
    const tier = requestedTier === "school" ? "school" : "pro"
    const requestedInterval = String(formData.get("interval") || "monthly")
    const interval: BillingInterval = requestedInterval === "annual" ? "annual" : "monthly"
    const purchaseAuthority = String(formData.get("purchase_authority") || "")
    const startNow = String(formData.get("start_now") || "")
    if (purchaseAuthority !== "confirmed" || startNow !== "confirmed") return redirectPricing(request, "consent-required")

    // Fail closed: do not start a paid/trial customer journey until the public legal identity is complete.
    if (!legalIdentityReady()) return redirectPricing(request, "legal-details-required")
    if (!isStripeConfigured()) return redirectPricing(request, "stripe-not-configured")
    if (!hasSupabaseAdminConfig()) return redirectPricing(request, "supabase-not-configured")

    const lineItem = checkoutLineItem(tier, interval)
    const stripe = getStripe()
    const admin = createAdminClient()
    const { data: userData } = await supabase.auth.getUser()
    const email = userData.user?.email || undefined
    const { data: currentSubscription, error: subscriptionError } = await admin.from("subscriptions").select("stripe_customer_id").eq("user_id", userId).maybeSingle()
    if (subscriptionError) { console.error("Billing database is not ready", subscriptionError); return redirectPricing(request, "database-not-ready") }

    let customerId = currentSubscription?.stripe_customer_id || ""
    if (!customerId) {
      const customer = await stripe.customers.create({ email, metadata: { supabase_user_id: userId } })
      customerId = customer.id
      const { error: customerSaveError } = await admin.from("subscriptions").upsert({ user_id: userId, stripe_customer_id: customerId }, { onConflict: "user_id" })
      if (customerSaveError) { console.error("Could not save Stripe customer", customerSaveError); return redirectPricing(request, "database-not-ready") }
    }

    // Trial eligibility is one-time per Stripe customer. A cancelled or expired historical subscription
    // still counts, preventing repeated trial cycling by the same account/customer.
    const previousSubscriptions = await stripe.subscriptions.list({ customer: customerId, status: "all", limit: 1 })
    const trialDays = previousSubscriptions.data.length === 0 ? trialDaysForTier(tier) : 0

    const origin = new URL(request.url).origin
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      client_reference_id: userId,
      line_items: [lineItem],
      allow_promotion_codes: true,
      payment_method_collection: "always",
      success_url: `${origin}/post-login?billing=success`,
      cancel_url: `${origin}/premium?billing=cancelled`,
      metadata: { supabase_user_id: userId, tier, interval, purchase_authority: "confirmed", immediate_access_requested: "confirmed", trial_days: String(trialDays) },
      subscription_data: {
        metadata: { supabase_user_id: userId, tier, interval },
        ...(trialDays > 0 ? { trial_period_days: trialDays } : {}),
      },
    })

    if (!session.url) throw new Error("Stripe did not return a Checkout URL.")
    return NextResponse.redirect(session.url, 303)
  } catch (error) {
    console.error("Stripe Checkout error", error)
    return redirectPricing(request, "checkout-error")
  }
}

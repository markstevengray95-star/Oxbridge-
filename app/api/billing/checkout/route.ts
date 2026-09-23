import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getStripe } from "@/lib/stripe/server"
import { stripePriceForTier, type SubscriptionTier } from "@/lib/billing/plans"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function redirectAccount(request: Request, value: string) {
  const url = new URL("/account", request.url)
  url.searchParams.set("billing", value)
  return NextResponse.redirect(url, 303)
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: claimsData } = await supabase.auth.getClaims()
    const userId = claimsData?.claims?.sub

    if (!userId) {
      const login = new URL("/login", request.url)
      login.searchParams.set("next", "/account")
      return NextResponse.redirect(login, 303)
    }

    const formData = await request.formData()
    const requestedTier = String(formData.get("tier") || "pro") as SubscriptionTier
    const tier = requestedTier === "school" ? "school" : "pro"
    const priceId = stripePriceForTier(tier)

    if (!priceId) return redirectAccount(request, `${tier}-price-not-configured`)

    const stripe = getStripe()
    const admin = createAdminClient()
    const { data: userData } = await supabase.auth.getUser()
    const email = userData.user?.email || undefined

    const { data: currentSubscription } = await admin
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", userId)
      .maybeSingle()

    let customerId = currentSubscription?.stripe_customer_id || ""

    if (!customerId) {
      const customer = await stripe.customers.create({
        email,
        metadata: { supabase_user_id: userId },
      })
      customerId = customer.id

      const { error: customerSaveError } = await admin.from("subscriptions").upsert({
        user_id: userId,
        stripe_customer_id: customerId,
      }, { onConflict: "user_id" })

      if (customerSaveError) throw new Error(customerSaveError.message)
    }

    const origin = new URL(request.url).origin
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      client_reference_id: userId,
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: true,
      success_url: `${origin}/account?billing=success`,
      cancel_url: `${origin}/account?billing=cancelled`,
      metadata: {
        supabase_user_id: userId,
        tier,
      },
      subscription_data: {
        metadata: {
          supabase_user_id: userId,
          tier,
        },
      },
    })

    if (!session.url) throw new Error("Stripe did not return a Checkout URL.")
    return NextResponse.redirect(session.url, 303)
  } catch (error) {
    console.error("Stripe Checkout error", error)
    return redirectAccount(request, "checkout-error")
  }
}

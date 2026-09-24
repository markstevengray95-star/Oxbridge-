import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getStripe, isStripeConfigured } from "@/lib/stripe/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function redirectSeats(request: Request, value: string) {
  const url = new URL("/school-seats", request.url)
  url.searchParams.set("billing", value)
  return NextResponse.redirect(url, 303)
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: claimsData } = await supabase.auth.getClaims()
    const userId = typeof claimsData?.claims?.sub === "string" ? claimsData.claims.sub : ""
    if (!userId) {
      const login = new URL("/login", request.url)
      login.searchParams.set("next", "/school-seats")
      return NextResponse.redirect(login, 303)
    }

    const priceId = process.env.STRIPE_SCHOOL_EXTRA_SEAT_PRICE_ID || ""
    if (!isStripeConfigured() || !priceId) return redirectSeats(request, "extra-seat-not-configured")

    const formData = await request.formData()
    const requested = Number(formData.get("quantity") || 1)
    const quantity = Number.isFinite(requested) ? Math.min(25, Math.max(1, Math.floor(requested))) : 1

    const admin = createAdminClient()
    const [{ data: subscription }, { data: organization }] = await Promise.all([
      admin.from("subscriptions").select("tier,status,stripe_customer_id").eq("user_id", userId).maybeSingle(),
      admin.from("school_organizations").select("id,owner_user_id,status").eq("owner_user_id", userId).maybeSingle(),
    ])

    const activeSchool = subscription?.tier === "school" && (subscription?.status === "active" || subscription?.status === "trialing")
    if (!activeSchool || !organization || organization.owner_user_id !== userId || organization.status !== "active") {
      return redirectSeats(request, "school-owner-required")
    }

    const customerId = subscription.stripe_customer_id || ""
    if (!customerId) return redirectSeats(request, "stripe-customer-missing")

    const stripe = getStripe()
    const origin = new URL(request.url).origin
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      client_reference_id: userId,
      line_items: [{ price: priceId, quantity }],
      allow_promotion_codes: true,
      success_url: `${origin}/school-seats?billing=extra-seats-success`,
      cancel_url: `${origin}/school-seats?billing=extra-seats-cancelled`,
      metadata: {
        supabase_user_id: userId,
        organization_id: organization.id,
        kind: "school_seat_addon",
        quantity: String(quantity),
      },
      subscription_data: {
        metadata: {
          supabase_user_id: userId,
          organization_id: organization.id,
          kind: "school_seat_addon",
        },
      },
    })

    if (!session.url) throw new Error("Stripe did not return a Checkout URL")
    return NextResponse.redirect(session.url, 303)
  } catch (error) {
    console.error("School extra-seat Checkout error", error)
    return redirectSeats(request, "extra-seat-checkout-error")
  }
}

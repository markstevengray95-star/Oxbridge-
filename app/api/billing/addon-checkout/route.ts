import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getStripe, isStripeConfigured } from "@/lib/stripe/server"
import { humanReviewPriceId, liveCreditPackMinutes, liveCreditPackPriceId } from "@/lib/billing/plans"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type AddonKind = "live_credit_pack" | "human_interview_review"

function redirectFor(request: Request, path: string, value: string) {
  const url = new URL(path, request.url)
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
      login.searchParams.set("next", "/premium")
      return NextResponse.redirect(login, 303)
    }

    const form = await request.formData()
    const kind = String(form.get("kind") || "") as AddonKind
    const target = kind === "human_interview_review" ? "/expert-review" : "/live-credits"
    if (kind !== "live_credit_pack" && kind !== "human_interview_review") return redirectFor(request, target, "unknown-addon")
    if (!isStripeConfigured()) return redirectFor(request, target, "stripe-not-configured")

    const priceId = kind === "human_interview_review" ? humanReviewPriceId() : liveCreditPackPriceId()
    if (!priceId) return redirectFor(request, target, "addon-not-configured")

    const admin = createAdminClient()
    const { data: subscription } = await admin.from("subscriptions").select("stripe_customer_id").eq("user_id", userId).maybeSingle()
    const { data: userData } = await supabase.auth.getUser()
    const email = userData.user?.email || undefined
    const stripe = getStripe()
    let customerId = subscription?.stripe_customer_id || ""

    if (!customerId) {
      const customer = await stripe.customers.create({ email, metadata: { supabase_user_id: userId } })
      customerId = customer.id
      const { error } = await admin.from("subscriptions").upsert({ user_id: userId, stripe_customer_id: customerId }, { onConflict: "user_id" })
      if (error) throw new Error(error.message)
    }

    const origin = new URL(request.url).origin
    const requestedQuantity = Number(form.get("quantity") || 1)
    const quantity = Number.isFinite(requestedQuantity) ? Math.min(5, Math.max(1, Math.floor(requestedQuantity))) : 1
    const title = String(form.get("title") || "Expert interview review").replace(/[\r\n\t]+/g, " ").trim().slice(0, 120)
    const sourceType = String(form.get("source_type") || "interview").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 40) || "interview"
    const notes = String(form.get("notes") || "").replace(/[\r\n\t]+/g, " ").trim().slice(0, 450)

    const metadata: Record<string, string> = {
      supabase_user_id: userId,
      kind,
    }
    if (kind === "live_credit_pack") {
      metadata.pack_count = String(quantity)
      metadata.minutes_per_pack = String(liveCreditPackMinutes())
    } else {
      metadata.source_type = sourceType
      metadata.title = title || "Expert interview review"
      metadata.notes = notes
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer: customerId,
      client_reference_id: userId,
      line_items: [{ price: priceId, quantity }],
      allow_promotion_codes: true,
      success_url: `${origin}${target}?billing=success`,
      cancel_url: `${origin}${target}?billing=cancelled`,
      metadata,
      payment_intent_data: { metadata },
    })

    if (!session.url) throw new Error("Stripe did not return a Checkout URL")
    return NextResponse.redirect(session.url, 303)
  } catch (error) {
    console.error("Paid add-on Checkout error", error)
    return redirectFor(request, "/premium", "addon-checkout-error")
  }
}

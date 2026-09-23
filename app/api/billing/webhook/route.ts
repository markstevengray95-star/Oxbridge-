import { NextResponse } from "next/server"
import type Stripe from "stripe"
import { createAdminClient } from "@/lib/supabase/admin"
import { getStripe } from "@/lib/stripe/server"
import { tierFromStripePrice, type SubscriptionStatus, type SubscriptionTier } from "@/lib/billing/plans"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function statusFromStripe(status: Stripe.Subscription.Status): SubscriptionStatus {
  if (status === "active") return "active"
  if (status === "trialing") return "trialing"
  if (status === "past_due" || status === "unpaid") return "past_due"
  if (status === "canceled") return "canceled"
  return "inactive"
}

function stripeId(value: string | Stripe.Customer | Stripe.DeletedCustomer | null) {
  return typeof value === "string" ? value : value?.id || ""
}

async function resolveUserId(subscription: Stripe.Subscription) {
  const metadataUserId = subscription.metadata?.supabase_user_id
  if (metadataUserId) return metadataUserId

  const admin = createAdminClient()
  const customerId = stripeId(subscription.customer)

  const { data } = await admin
    .from("subscriptions")
    .select("user_id")
    .or(`stripe_subscription_id.eq.${subscription.id},stripe_customer_id.eq.${customerId}`)
    .limit(1)
    .maybeSingle()

  return data?.user_id || ""
}

async function syncSubscription(subscription: Stripe.Subscription) {
  const admin = createAdminClient()
  const userId = await resolveUserId(subscription)
  if (!userId) throw new Error(`No Supabase user found for Stripe subscription ${subscription.id}`)

  const customerId = stripeId(subscription.customer)
  const priceId = subscription.items.data[0]?.price?.id || ""
  const metadataTier = subscription.metadata?.tier
  const detectedTier = tierFromStripePrice(priceId)
  const tier: SubscriptionTier = metadataTier === "school" || metadataTier === "pro"
    ? metadataTier
    : detectedTier
  const itemPeriodEnd = subscription.items.data
    .map(item => item.current_period_end)
    .filter((value): value is number => typeof value === "number")
    .sort((a, b) => b - a)[0]

  const { error } = await admin.from("subscriptions").upsert({
    user_id: userId,
    tier,
    status: statusFromStripe(subscription.status),
    stripe_customer_id: customerId || null,
    stripe_subscription_id: subscription.id,
    current_period_end: itemPeriodEnd ? new Date(itemPeriodEnd * 1000).toISOString() : null,
    cancel_at_period_end: Boolean(subscription.cancel_at_period_end),
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id" })

  if (error) throw new Error(error.message)
}

async function syncCheckoutSession(session: Stripe.Checkout.Session) {
  const admin = createAdminClient()
  const userId = session.metadata?.supabase_user_id || session.client_reference_id || ""
  const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id || ""

  if (userId && customerId) {
    const { error } = await admin.from("subscriptions").upsert({
      user_id: userId,
      stripe_customer_id: customerId,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" })
    if (error) throw new Error(error.message)
  }

  if (typeof session.subscription === "string") {
    const stripe = getStripe()
    const subscription = await stripe.subscriptions.retrieve(session.subscription)
    await syncSubscription(subscription)
  }
}

export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    return NextResponse.json({ error: "Stripe webhook is not configured." }, { status: 503 })
  }

  const signature = request.headers.get("stripe-signature")
  if (!signature) {
    return NextResponse.json({ error: "Missing Stripe signature." }, { status: 400 })
  }

  const rawBody = await request.text()
  const stripe = getStripe()

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)
  } catch (error) {
    console.error("Stripe webhook signature verification failed", error)
    return NextResponse.json({ error: "Invalid Stripe signature." }, { status: 400 })
  }

  try {
    const admin = createAdminClient()
    const { data: alreadyProcessed } = await admin
      .from("stripe_webhook_events")
      .select("event_id")
      .eq("event_id", event.id)
      .maybeSingle()

    if (alreadyProcessed) return NextResponse.json({ received: true, duplicate: true })

    switch (event.type) {
      case "checkout.session.completed":
        await syncCheckoutSession(event.data.object as Stripe.Checkout.Session)
        break
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await syncSubscription(event.data.object as Stripe.Subscription)
        break
      default:
        break
    }

    const { error: ledgerError } = await admin.from("stripe_webhook_events").insert({
      event_id: event.id,
      event_type: event.type,
    })
    if (ledgerError && ledgerError.code !== "23505") throw new Error(ledgerError.message)

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("Stripe webhook processing failed", event.id, event.type, error)
    return NextResponse.json({ error: "Webhook processing failed." }, { status: 500 })
  }
}

import { randomBytes } from "node:crypto"
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

function isSeatAddon(subscription: Stripe.Subscription) {
  const configuredPrice = process.env.STRIPE_SCHOOL_EXTRA_SEAT_PRICE_ID || ""
  return subscription.metadata?.kind === "school_seat_addon" || Boolean(configuredPrice && subscription.items.data.some(item => item.price?.id === configuredPrice))
}

async function resolveUserId(subscription: Stripe.Subscription) {
  const metadataUserId = subscription.metadata?.supabase_user_id
  if (metadataUserId) return metadataUserId
  const admin = createAdminClient()
  const customerId = stripeId(subscription.customer)
  const { data } = await admin.from("subscriptions").select("user_id").or(`stripe_subscription_id.eq.${subscription.id},stripe_customer_id.eq.${customerId}`).limit(1).maybeSingle()
  return data?.user_id || ""
}

async function trimOverflowMembers(organizationId: string, seatLimit: number) {
  const admin = createAdminClient()
  const { data: members } = await admin
    .from("school_organization_members")
    .select("user_id,role,joined_at")
    .eq("organization_id", organizationId)
    .order("joined_at", { ascending: true })

  const ordered = [...(members ?? [])].sort((a, b) => {
    if (a.role === "owner" && b.role !== "owner") return -1
    if (b.role === "owner" && a.role !== "owner") return 1
    return Date.parse(a.joined_at) - Date.parse(b.joined_at)
  })
  const overflow = ordered.slice(Math.max(1, seatLimit)).filter(member => member.role !== "owner")
  if (!overflow.length) return
  const userIds = overflow.map(member => member.user_id)
  await admin.from("school_seat_entitlements").delete().eq("organization_id", organizationId).in("user_id", userIds)
  await admin.from("school_organization_members").delete().eq("organization_id", organizationId).in("user_id", userIds)
}

async function recomputeSeatLimit(organizationId: string) {
  const admin = createAdminClient()
  const { data: addons } = await admin
    .from("school_seat_addons")
    .select("quantity,status")
    .eq("organization_id", organizationId)

  const extraSeats = (addons ?? [])
    .filter(addon => addon.status === "active" || addon.status === "trialing")
    .reduce((total, addon) => total + Number(addon.quantity || 0), 0)
  const seatLimit = 5 + extraSeats
  await admin.from("school_organizations").update({ seat_limit: seatLimit, updated_at: new Date().toISOString() }).eq("id", organizationId)
  await trimOverflowMembers(organizationId, seatLimit)
}

async function ensureSchoolOrganization(userId: string, subscriptionId: string, active: boolean) {
  const admin = createAdminClient()
  const { data: existing } = await admin.from("school_organizations").select("id,seat_limit").eq("owner_user_id", userId).maybeSingle()
  let organizationId = existing?.id as string | undefined

  if (!organizationId && active) {
    for (let attempt = 0; attempt < 5 && !organizationId; attempt++) {
      const joinCode = `SCH-${randomBytes(4).toString("hex").toUpperCase()}`
      const { data } = await admin.from("school_organizations").insert({ owner_user_id: userId, name: "Oxbridge School workspace", join_code: joinCode, seat_limit: 5, status: "active", stripe_subscription_id: subscriptionId }).select("id").single()
      if (data?.id) organizationId = data.id
    }
  }
  if (!organizationId) return

  await admin.from("school_organizations").update({ status: active ? "active" : "inactive", stripe_subscription_id: subscriptionId, updated_at: new Date().toISOString() }).eq("id", organizationId)
  await admin.from("school_organization_members").upsert({ organization_id: organizationId, user_id: userId, role: "owner" }, { onConflict: "organization_id,user_id" })
  await admin.from("school_seat_entitlements").upsert({ user_id: userId, organization_id: organizationId, role: "owner", active, updated_at: new Date().toISOString() }, { onConflict: "user_id" })
  await admin.from("school_seat_entitlements").update({ active, updated_at: new Date().toISOString() }).eq("organization_id", organizationId)
  if (active) await recomputeSeatLimit(organizationId)
}

async function syncSeatAddon(subscription: Stripe.Subscription) {
  const admin = createAdminClient()
  const userId = await resolveUserId(subscription)
  if (!userId) throw new Error(`No Supabase user found for seat add-on ${subscription.id}`)

  let organizationId = subscription.metadata?.organization_id || ""
  if (!organizationId) {
    const { data: org } = await admin.from("school_organizations").select("id").eq("owner_user_id", userId).maybeSingle()
    organizationId = org?.id || ""
  }
  if (!organizationId) throw new Error(`No School organization found for seat add-on ${subscription.id}`)

  const configuredPrice = process.env.STRIPE_SCHOOL_EXTRA_SEAT_PRICE_ID || ""
  const items = configuredPrice ? subscription.items.data.filter(item => item.price?.id === configuredPrice) : subscription.items.data
  const quantity = Math.max(1, items.reduce((total, item) => total + Number(item.quantity || 0), 0))
  const status = statusFromStripe(subscription.status)
  const periodEnd = subscription.items.data
    .map(item => item.current_period_end)
    .filter((value): value is number => typeof value === "number")
    .sort((a, b) => b - a)[0]

  const { error } = await admin.from("school_seat_addons").upsert({
    organization_id: organizationId,
    owner_user_id: userId,
    stripe_subscription_id: subscription.id,
    stripe_customer_id: stripeId(subscription.customer) || null,
    quantity,
    status,
    current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
    cancel_at_period_end: Boolean(subscription.cancel_at_period_end),
    updated_at: new Date().toISOString(),
  }, { onConflict: "stripe_subscription_id" })
  if (error) throw new Error(error.message)

  await recomputeSeatLimit(organizationId)
}

async function syncSubscription(subscription: Stripe.Subscription) {
  const admin = createAdminClient()
  const userId = await resolveUserId(subscription)
  if (!userId) throw new Error(`No Supabase user found for Stripe subscription ${subscription.id}`)
  const customerId = stripeId(subscription.customer)
  const priceId = subscription.items.data[0]?.price?.id || ""
  const metadataTier = subscription.metadata?.tier
  const detectedTier = tierFromStripePrice(priceId)
  const tier: SubscriptionTier = metadataTier === "school" || metadataTier === "pro" ? metadataTier : detectedTier
  const status = statusFromStripe(subscription.status)
  const itemPeriodEnd = subscription.items.data.map(item => item.current_period_end).filter((value): value is number => typeof value === "number").sort((a, b) => b - a)[0]

  const { error } = await admin.from("subscriptions").upsert({ user_id: userId, tier, status, stripe_customer_id: customerId || null, stripe_subscription_id: subscription.id, current_period_end: itemPeriodEnd ? new Date(itemPeriodEnd * 1000).toISOString() : null, cancel_at_period_end: Boolean(subscription.cancel_at_period_end), updated_at: new Date().toISOString() }, { onConflict: "user_id" })
  if (error) throw new Error(error.message)

  await ensureSchoolOrganization(userId, subscription.id, tier === "school" && (status === "active" || status === "trialing"))
}

async function syncCheckoutSession(session: Stripe.Checkout.Session) {
  const stripe = getStripe()
  if (session.metadata?.kind === "school_seat_addon") {
    if (typeof session.subscription === "string") await syncSeatAddon(await stripe.subscriptions.retrieve(session.subscription))
    return
  }

  const admin = createAdminClient()
  const userId = session.metadata?.supabase_user_id || session.client_reference_id || ""
  const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id || ""
  if (userId && customerId) {
    const { error } = await admin.from("subscriptions").upsert({ user_id: userId, stripe_customer_id: customerId, updated_at: new Date().toISOString() }, { onConflict: "user_id" })
    if (error) throw new Error(error.message)
  }
  if (typeof session.subscription === "string") await syncSubscription(await stripe.subscriptions.retrieve(session.subscription))
}

export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) return NextResponse.json({ error: "Stripe webhook is not configured." }, { status: 503 })
  const signature = request.headers.get("stripe-signature")
  if (!signature) return NextResponse.json({ error: "Missing Stripe signature." }, { status: 400 })
  const rawBody = await request.text()
  const stripe = getStripe()
  let event: Stripe.Event
  try { event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret) }
  catch (error) { console.error("Stripe webhook signature verification failed", error); return NextResponse.json({ error: "Invalid Stripe signature." }, { status: 400 }) }

  try {
    const admin = createAdminClient()
    const { data: alreadyProcessed } = await admin.from("stripe_webhook_events").select("event_id").eq("event_id", event.id).maybeSingle()
    if (alreadyProcessed) return NextResponse.json({ received: true, duplicate: true })

    switch (event.type) {
      case "checkout.session.completed":
        await syncCheckoutSession(event.data.object as Stripe.Checkout.Session)
        break
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription
        if (isSeatAddon(subscription)) await syncSeatAddon(subscription)
        else await syncSubscription(subscription)
        break
      }
      default:
        break
    }

    const { error: ledgerError } = await admin.from("stripe_webhook_events").insert({ event_id: event.id, event_type: event.type })
    if (ledgerError && ledgerError.code !== "23505") throw new Error(ledgerError.message)
    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("Stripe webhook processing failed", event.id, event.type, error)
    return NextResponse.json({ error: "Webhook processing failed." }, { status: 500 })
  }
}

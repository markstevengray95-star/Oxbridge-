import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getStripe } from "@/lib/stripe/server"

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

    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", userId)
      .maybeSingle()

    if (!subscription?.stripe_customer_id) return redirectAccount(request, "no-billing-account")

    const stripe = getStripe()
    const origin = new URL(request.url).origin
    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripe_customer_id,
      return_url: `${origin}/account`,
    })

    return NextResponse.redirect(session.url, 303)
  } catch (error) {
    console.error("Stripe billing portal error", error)
    return redirectAccount(request, "portal-error")
  }
}

import Link from "next/link"
import { redirect } from "next/navigation"
import { Brain, ClipboardCheck, CreditCard, GraduationCap, LogOut, Mic2, ShieldCheck, Sparkles } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { effectiveTier, type SubscriptionStatus, type SubscriptionTier } from "@/lib/billing/plans"
import { getGeminiUsageState } from "@/lib/billing/usage"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { signOut } from "./actions"

export const dynamic = "force-dynamic"

type PageProps = {
  searchParams?: Promise<{ billing?: string }>
}

const billingMessages: Record<string, string> = {
  success: "Checkout completed. Stripe is confirming your subscription; your plan will update automatically.",
  cancelled: "Checkout was cancelled. Your current plan has not changed.",
  "checkout-error": "Checkout could not be started. Check the Stripe configuration and try again.",
  "portal-error": "The billing portal could not be opened. Check the Stripe portal configuration and try again.",
  "no-billing-account": "No Stripe billing account is linked to this user yet.",
  "pro-price-not-configured": "The Pro Stripe price has not been configured on this deployment yet.",
  "school-price-not-configured": "The School Stripe price has not been configured on this deployment yet.",
  "pro-monthly-price-not-configured": "The Pro monthly Stripe price has not been configured yet.",
  "pro-annual-price-not-configured": "The Pro annual Stripe price has not been configured yet.",
  "school-monthly-price-not-configured": "The School monthly Stripe price has not been configured yet.",
  "school-annual-price-not-configured": "The School annual Stripe price has not been configured yet.",
}

export default async function AccountPage({ searchParams }: PageProps) {
  const params = searchParams ? await searchParams : {}
  const supabase = await createClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  const claims = claimsData?.claims
  const userId = typeof claims?.sub === "string" ? claims.sub : null
  const email = typeof claims?.email === "string" ? claims.email : null
  if (!userId) redirect("/login")

  const [{ data: profile }, { data: subscription }, interviews, memories, attempts, usage] = await Promise.all([
    supabase.from("profiles").select("display_name,target_university,target_course,application_year").eq("id", userId).maybeSingle(),
    supabase.from("subscriptions").select("tier,status,current_period_end,cancel_at_period_end,stripe_customer_id").eq("user_id", userId).maybeSingle(),
    supabase.from("interview_sessions").select("id", { count: "exact", head: true }).eq("user_id", userId),
    supabase.from("memory_items").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("is_active", true),
    supabase.from("practice_attempts").select("id", { count: "exact", head: true }).eq("user_id", userId),
    getGeminiUsageState(userId, email),
  ])

  const rawTier = (subscription?.tier ?? "free") as SubscriptionTier
  const status = (subscription?.status ?? "inactive") as SubscriptionStatus
  const tier = effectiveTier(rawTier, status)
  const geminiPercent = usage.unlimited ? 100 : usage.limitMinutes > 0 ? Math.min(100, Math.round((usage.usedMinutes / usage.limitMinutes) * 100)) : 100
  const stripeConfigured = Boolean(process.env.STRIPE_SECRET_KEY)
  const anyPaidPriceConfigured = Boolean(process.env.STRIPE_PRO_MONTHLY_PRICE_ID || process.env.STRIPE_PRO_PRICE_ID || process.env.STRIPE_PRO_ANNUAL_PRICE_ID || process.env.STRIPE_SCHOOL_MONTHLY_PRICE_ID || process.env.STRIPE_SCHOOL_PRICE_ID || process.env.STRIPE_SCHOOL_ANNUAL_PRICE_ID)
  const billingMessage = params.billing ? billingMessages[params.billing] : ""
  const renews = subscription?.current_period_end ? new Date(subscription.current_period_end).toLocaleDateString("en-GB") : null
  const accessLabel = usage.isAdmin ? "ADMIN" : tier.toUpperCase()
  const accessStatus = usage.isAdmin ? "unlimited" : status

  return (
    <main className="min-h-screen bg-[#f2f5f5] px-4 py-7 text-[#172b3a] sm:px-6 lg:px-8 lg:py-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div><p className="text-xs font-bold uppercase tracking-[.16em] text-[#147d91]">Your account</p><h1 className="font-serif text-3xl font-bold">Welcome{profile?.display_name ? `, ${profile.display_name}` : ""}</h1></div>
          <div className="flex items-center gap-2">{usage.isAdmin && <Button asChild variant="outline"><Link href="/admin"><ShieldCheck />Admin console</Link></Button>}<form action={signOut}><Button variant="outline"><LogOut />Sign out</Button></form></div>
        </div>

        {billingMessage && <div className="mb-5 rounded-2xl border border-[#b9d8dd] bg-[#edf7f8] p-4 text-sm leading-6 text-[#234754]">{billingMessage}</div>}
        {usage.isAdmin && <div className="mb-5 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-950"><ShieldCheck className="mt-0.5 size-5 shrink-0 text-emerald-700" /><div><strong>Administrator access is active.</strong><p>All premium routes are unlocked and Gemini Live has no monthly minute cap for this account.</p></div></div>}

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border-[#dbe5e7]"><CardHeader><CardTitle className="flex items-center gap-2 text-lg"><CreditCard className="size-5 text-[#147d91]" />Plan</CardTitle><CardDescription>Your current access level</CardDescription></CardHeader><CardContent><div className="flex items-center gap-2"><Badge className="bg-[#102a43] text-white">{accessLabel}</Badge><span className="text-sm text-[#667984]">{accessStatus}</span></div>{!usage.isAdmin && renews && <p className="mt-2 text-xs text-[#7b8d96]">{subscription?.cancel_at_period_end ? `Access ends ${renews}` : `Current period ends ${renews}`}</p>}<p className="mt-3 text-sm text-[#667984]">{usage.isAdmin ? "Administrator access is independent of the normal subscription tier." : "Your saved work remains attached to this account even if your plan changes."}</p></CardContent></Card>
          <Card className="border-[#dbe5e7]"><CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Mic2 className="size-5 text-[#147d91]" />Gemini Live usage</CardTitle><CardDescription>{usage.unlimited ? "Administrator allowance" : "Monthly reserved interview minutes"}</CardDescription></CardHeader><CardContent>{usage.unlimited ? <div><p className="font-serif text-3xl font-bold">Unlimited</p><p className="mt-2 text-sm text-[#667984]">Sessions are not deducted from a monthly allowance.</p><div className="mt-3 h-2 overflow-hidden rounded-full bg-emerald-100"><div className="h-full w-full rounded-full bg-emerald-600" /></div></div> : <><div className="flex items-end justify-between gap-3"><p className="font-serif text-3xl font-bold">{usage.usedMinutes}<span className="text-base font-normal text-[#667984]"> / {usage.limitMinutes} min</span></p><span className="text-xs font-semibold text-[#667984]">{usage.remainingMinutes} left</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-[#e2eaec]"><div className="h-full rounded-full bg-[#147d91]" style={{ width: `${geminiPercent}%` }} /></div></>}</CardContent></Card>
          <Card className="border-[#dbe5e7]"><CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Brain className="size-5 text-[#147d91]" />Learning memory</CardTitle><CardDescription>Active strengths, weaknesses and goals</CardDescription></CardHeader><CardContent><p className="font-serif text-4xl font-bold">{memories.count ?? 0}</p></CardContent></Card>
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-[1.2fr_.8fr]">
          <Card className="border-[#dbe5e7]"><CardHeader><CardTitle className="font-serif text-2xl">Subscription & billing</CardTitle><CardDescription>{usage.isAdmin ? "Administrator access bypasses normal feature and AI quotas." : "Choose monthly or annual billing from the pricing page. Stripe handles checkout and billing management."}</CardDescription></CardHeader><CardContent className="space-y-4">{usage.isAdmin ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-950"><p className="font-semibold">No upgrade is required for this account.</p><p className="mt-1">You can test Free, Pro and School features through the admin console without changing the subscription record.</p></div> : <><div className="grid gap-3 sm:grid-cols-2"><div className="rounded-2xl border bg-white p-4"><p className="text-xs font-bold uppercase tracking-wider text-[#147d91]">Free</p><p className="mt-2 text-sm leading-6 text-[#667984]">Core preparation tools, personal cloud progress and a limited monthly Gemini Live allowance.</p></div><div className="rounded-2xl border bg-white p-4"><p className="text-xs font-bold uppercase tracking-wider text-[#147d91]">Pro & School</p><p className="mt-2 text-sm leading-6 text-[#667984]">Monthly and discounted annual plans are available from the pricing page.</p></div></div><div className="flex flex-wrap gap-2"><Button asChild><Link href="/premium"><CreditCard />View pricing</Link></Button>{subscription?.stripe_customer_id && <form action="/api/billing/portal" method="post"><Button type="submit" variant="outline"><CreditCard />Manage billing</Button></form>}</div>{(!stripeConfigured || !anyPaidPriceConfigured) && <p className="text-xs leading-5 text-amber-800">Stripe credentials and Price IDs need to be configured on the deployment before paid checkout is available.</p>}</>}</CardContent></Card>

          <Card className="border-[#dbe5e7]"><CardHeader><CardTitle className="font-serif text-2xl">Continue preparing</CardTitle></CardHeader><CardContent className="space-y-2"><Button className="w-full justify-start" asChild><Link href="/tutor"><Brain />Personal tutor</Link></Button><Button className="w-full justify-start" variant="outline" asChild><Link href="/gemini-live-interview"><Mic2 />Live interview</Link></Button><Button className="w-full justify-start" variant="outline" asChild><Link href="/interviews"><Sparkles />Interview hub</Link></Button><Button className="w-full justify-start" variant="outline" asChild><Link href="/course-bank"><ClipboardCheck />Admissions tests</Link></Button>{usage.isAdmin && <Button className="w-full justify-start" variant="outline" asChild><Link href="/admin"><ShieldCheck />Admin console</Link></Button>}<Button className="w-full justify-start" variant="outline" asChild><Link href="/"><GraduationCap />Home</Link></Button></CardContent></Card>
        </div>

        <Card className="mt-5 border-[#dbe5e7]"><CardHeader><CardTitle className="font-serif text-2xl">Preparation profile</CardTitle><CardDescription>This information can personalise interview and test preparation.</CardDescription></CardHeader><CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><div className="rounded-xl bg-[#f6f8f9] p-4"><p className="text-xs font-bold uppercase tracking-wider text-[#7b8d96]">University</p><p className="mt-1 font-semibold">{profile?.target_university || "Not set yet"}</p></div><div className="rounded-xl bg-[#f6f8f9] p-4"><p className="text-xs font-bold uppercase tracking-wider text-[#7b8d96]">Course</p><p className="mt-1 font-semibold">{profile?.target_course || "Not set yet"}</p></div><div className="rounded-xl bg-[#f6f8f9] p-4"><p className="text-xs font-bold uppercase tracking-wider text-[#7b8d96]">Application year</p><p className="mt-1 font-semibold">{profile?.application_year || "Not set yet"}</p></div><div className="rounded-xl bg-[#f6f8f9] p-4"><p className="text-xs font-bold uppercase tracking-wider text-[#7b8d96]">Practice attempts</p><p className="mt-1 font-semibold">{attempts.count ?? 0}</p></div></CardContent></Card>
      </div>
    </main>
  )
}

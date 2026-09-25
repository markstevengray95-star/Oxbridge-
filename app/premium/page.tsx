import Link from "next/link"
import { redirect } from "next/navigation"
import { CheckCircle2, GraduationCap, LogOut, School, Sparkles } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { annualSavingPercent, displayPrice, monthlyGeminiMinutes, schoolExtraSeatMonthlyPrice } from "@/lib/billing/plans"
import { onboardingCompleted, PLAN_ONBOARDING_STATE_KEY } from "@/lib/onboarding"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { chooseFreePlan } from "./actions"
import { signOut } from "@/app/account/actions"

export const dynamic = "force-dynamic"
type PageProps = { searchParams?: Promise<{ billing?: string; onboarding?: string }> }

const tiers = [
  { id: "free" as const, name: "Free", icon: GraduationCap, note: "A complete starter route for building your first preparation baseline.", usage: [`1 account`, `${monthlyGeminiMinutes("free")} Gemini Live minutes / month`, "Core question and interview practice"], features: ["Starter question bank", "Basic personalised feedback", "Saved cloud progress", "Basic Tutor recommendations", "Preparation profile"] },
  { id: "pro" as const, name: "Pro", icon: Sparkles, note: "The full individual preparation system for an Oxford or Cambridge applicant.", usage: [`1 account`, `${monthlyGeminiMinutes("pro")} Gemini Live minutes / month`, "Full premium preparation suite"], features: ["Advanced interview analytics", "Personal AI Tutor Memory+", "Unlimited application defence", "Premium question banks and full admissions-test courses", "AI written-work review", "Preparation reports and readiness dashboard", "Advanced video interview coach", "Automatic personalised weekly programme", "Premium supercurricular tutor", "Research Project Mentor"] },
  { id: "school" as const, name: "School", icon: School, note: "A shared school licence with separate student accounts and teacher oversight.", usage: [`5 accounts included`, `${monthlyGeminiMinutes("school")} Gemini Live minutes / account / month`, `Extra seats £${schoolExtraSeatMonthlyPrice().toFixed(2)} / month`], features: ["Everything in Pro for active seats", "Whole-school cohort analytics", "Teacher assignment builder", "Completion and progress tracking", "School reports and CSV export", "Teacher Coach and live intervention tools", "Human + AI review records", "Seat management"] },
]
function money(value: number) { return Number.isInteger(value) ? `£${value}` : `£${value.toFixed(2)}` }

function CheckoutButton({ tier, interval, label, primary = false }: { tier: "pro" | "school"; interval: "monthly" | "annual"; label: string; primary?: boolean }) {
  return <form action="/api/billing/checkout" method="post" className="w-full rounded-xl border bg-white p-3">
    <input type="hidden" name="tier" value={tier}/><input type="hidden" name="interval" value={interval}/>
    <label className="mb-2 flex items-start gap-2 text-xs leading-5 text-slate-600"><input className="mt-1" type="checkbox" name="purchase_authority" value="confirmed" required/><span>I confirm I am authorised to make this purchase. If I am under 18, an appropriate adult has approved the purchase.</span></label>
    <label className="mb-3 flex items-start gap-2 text-xs leading-5 text-slate-600"><input className="mt-1" type="checkbox" name="start_now" value="confirmed" required/><span>I want paid digital access to begin immediately and have read the <Link href="/terms" target="_blank" className="font-semibold text-[#147d91] underline">Terms, cancellation and consumer-rights information</Link>.</span></label>
    <Button type="submit" className="w-full" variant={primary ? "default" : "outline"}>{label}</Button>
  </form>
}

export default async function PremiumPage({ searchParams }: PageProps) {
  const params = searchParams ? await searchParams : {}
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const userId = typeof data?.claims?.sub === "string" ? data.claims.sub : ""
  if (!userId) redirect("/login?next=/post-login")
  const [{ data: subscription }, { data: seat }, { data: onboarding }] = await Promise.all([
    supabase.from("subscriptions").select("tier,status").eq("user_id", userId).maybeSingle(),
    supabase.from("school_seat_entitlements").select("active").eq("user_id", userId).maybeSingle(),
    supabase.from("user_state").select("state_value").eq("user_id", userId).eq("state_key", PLAN_ONBOARDING_STATE_KEY).maybeSingle(),
  ])
  const activePaid = seat?.active || ((subscription?.status === "active" || subscription?.status === "trialing") && (subscription?.tier === "pro" || subscription?.tier === "school"))
  const hasChosen = Boolean(activePaid || onboardingCompleted(onboarding?.state_value))
  const proSaving = annualSavingPercent("pro"), schoolSaving = annualSavingPercent("school")
  const notice = params.billing === "cancelled" ? "Checkout was cancelled. Choose a plan to continue." : params.billing === "success" ? "Payment completed. Your subscription is being confirmed." : params.billing === "consent-required" ? "Confirm purchase authority and immediate digital access before continuing to Stripe." : params.billing === "stripe-not-configured" ? "Payments are not connected on this Vercel project yet. Add STRIPE_SECRET_KEY in Vercel, then redeploy." : params.billing === "supabase-not-configured" ? "Payments cannot start because the Supabase server secret is missing in Vercel. Add SUPABASE_SECRET_KEY, then redeploy." : params.billing === "database-not-ready" ? "Payments are connected, but the new Supabase project is missing the billing tables. Restore the billing schema, then try again." : params.billing === "checkout-error" ? "Stripe Checkout could not start. Check the Vercel Stripe and Supabase settings, then try again." : params.onboarding === "save-error" ? "We could not save your Free plan choice. Please try again." : params.onboarding === "required" ? "Choose Free, Pro or School before entering the app." : ""
  const billingError = ["stripe-not-configured", "supabase-not-configured", "database-not-ready", "checkout-error", "consent-required"].includes(params.billing || "")

  return <main className="min-h-screen bg-[#f5f7f7] text-[#172b3a]">
    <header className="border-b bg-white"><div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4 sm:px-6"><div className="flex items-center gap-2 font-serif text-lg font-bold"><GraduationCap className="size-5 text-[#147d91]"/>ScholarBridge</div><form action={signOut}><Button variant="outline" size="sm"><LogOut/>Sign out</Button></form></div></header>
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-10 sm:px-6">
      <section className="text-center"><Badge variant="outline">Step 2 of 2 · Choose your plan</Badge><h1 className="mx-auto mt-4 max-w-4xl font-serif text-4xl font-bold sm:text-5xl">Choose how you want to use ScholarBridge.</h1><p className="mx-auto mt-4 max-w-3xl text-slate-600">Every user creates an account first. Prices, renewal intervals, included features and Live usage are shown before checkout.</p>{notice && <div className={`mx-auto mt-5 max-w-2xl rounded-2xl border p-4 text-sm ${billingError ? "border-red-200 bg-red-50 text-red-900" : "border-[#b9d8dd] bg-[#edf7f8] text-[#234754]"}`}>{notice}</div>}{hasChosen && <div className="mx-auto mt-5 max-w-2xl rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950">Your account already has a plan choice. <Button asChild size="sm" className="ml-2"><Link href="/student-home">Enter the app</Link></Button></div>}</section>
      <section className="grid gap-5 lg:grid-cols-3">{tiers.map(tier => { const Icon=tier.icon,monthly=displayPrice(tier.id,"monthly"),annual=displayPrice(tier.id,"annual"),saving=tier.id==="pro"?proSaving:tier.id==="school"?schoolSaving:0;return <Card key={tier.id} className={tier.id==="pro"?"relative border-[#147d91] shadow-[0_20px_60px_rgba(16,42,67,.10)]":"shadow-none"}>{tier.id==="pro"&&<Badge className="absolute right-5 top-5">Most popular</Badge>}<CardHeader><Icon className="size-6 text-[#147d91]"/><CardTitle className="font-serif text-3xl">{tier.name}</CardTitle><CardDescription>{tier.note}</CardDescription></CardHeader><CardContent className="space-y-5"><div className="rounded-2xl bg-[#f6f9f9] p-4">{tier.id==="free"?<><p className="font-serif text-4xl font-bold">£0</p><p className="mt-1 text-sm text-[#667984]">No card required</p></>:<div className="space-y-3"><div><p className="text-xs font-bold uppercase tracking-wider text-[#667984]">Monthly</p><p className="font-serif text-3xl font-bold">{money(monthly)}<span className="text-base font-normal text-[#667984]"> / month</span></p></div><div className="border-t pt-3"><div className="flex items-center gap-2"><p className="text-xs font-bold uppercase tracking-wider text-[#667984]">Annual</p>{saving>0&&<Badge variant="outline">Save {saving}%</Badge>}</div><p className="font-serif text-3xl font-bold">{money(annual)}<span className="text-base font-normal text-[#667984]"> / year</span></p><p className="text-xs text-[#667984]">Equivalent to {money(annual/12)} per month</p></div></div>}</div><div><p className="mb-2 text-xs font-bold uppercase tracking-wider text-[#667984]">Included usage</p><div className="space-y-2">{tier.usage.map(item=><p key={item} className="rounded-lg bg-[#edf7f8] px-3 py-2 text-sm font-medium">{item}</p>)}</div></div><div><p className="mb-2 text-xs font-bold uppercase tracking-wider text-[#667984]">Features</p><div className="space-y-2">{tier.features.map(item=><p key={item} className="flex gap-2 text-sm leading-6"><CheckCircle2 className="mt-1 size-4 shrink-0 text-emerald-600"/>{item}</p>)}</div></div>{tier.id==="free"?<form action={chooseFreePlan}><Button type="submit" className="w-full" variant="outline">Choose Free and enter app</Button></form>:<div className="grid gap-2"><CheckoutButton tier={tier.id} interval="annual" label={`Choose ${tier.name} annual`} primary={tier.id==="pro"}/><CheckoutButton tier={tier.id} interval="monthly" label={`Choose ${tier.name} monthly`}/></div>}</CardContent></Card>})}</section>
      <p className="text-center text-xs leading-5 text-slate-500">Paid plans renew for the selected billing interval until cancelled. Manage billing from Account. Stripe processes payment details. Read the <Link href="/terms" className="font-semibold text-[#147d91] underline">Terms</Link> before purchase.</p>
    </div>
  </main>
}

import Link from "next/link"
import { ArrowLeft, Clock3, CreditCard, Headphones, Sparkles } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/server"
import { getGeminiUsageState } from "@/lib/billing/usage"
import { liveCreditPackMinutes, liveCreditPackPrice, monthlyGeminiMinutes } from "@/lib/billing/plans"

export const dynamic = "force-dynamic"

export default async function LiveCreditsPage() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const userId = typeof data?.claims?.sub === "string" ? data.claims.sub : ""
  const email = typeof data?.claims?.email === "string" ? data.claims.email : null
  const state = userId ? await getGeminiUsageState(userId, email) : null
  const minutes = liveCreditPackMinutes()
  const price = liveCreditPackPrice()

  return <main className="min-h-screen bg-[#f5f7f7] text-[#172b3a]">
    <header className="border-b bg-white"><div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4"><Button asChild variant="ghost"><Link href="/premium"><ArrowLeft/>Premium</Link></Button><Badge variant="outline"><Headphones className="size-3.5"/>Live Interview credits</Badge></div></header>
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6">
      <section><p className="text-xs font-bold uppercase tracking-[.18em] text-[#147d91]">Optional add-on</p><h1 className="mt-2 font-serif text-4xl font-bold">Add more Gemini Live interview time.</h1><p className="mt-3 max-w-3xl text-slate-600">Your normal monthly allowance stays separate. Purchased credits are used only after the monthly allowance is exhausted and do not expire at the end of the month.</p></section>
      <section className="grid gap-4 md:grid-cols-3">
        <Card className="border-0 bg-[#102a43] text-white"><CardHeader><CardDescription className="text-white/60">Plan</CardDescription><CardTitle className="font-serif text-3xl capitalize">{state?.tier ?? "free"}</CardTitle></CardHeader><CardContent><p className="text-sm text-white/70">Monthly allowance: {state?.unlimited ? "Unlimited admin access" : `${monthlyGeminiMinutes(state?.tier ?? "free")} minutes`}</p></CardContent></Card>
        <Card><CardHeader><CardDescription>Monthly allowance remaining</CardDescription><CardTitle className="font-serif text-4xl">{state?.unlimited ? "∞" : state?.baseRemainingMinutes ?? 0}</CardTitle></CardHeader><CardContent><p className="text-xs text-slate-500">Resets monthly.</p></CardContent></Card>
        <Card><CardHeader><CardDescription>Purchased credit remaining</CardDescription><CardTitle className="font-serif text-4xl">{state?.unlimited ? "∞" : state?.creditMinutes ?? 0}</CardTitle></CardHeader><CardContent><p className="text-xs text-slate-500">Used after the included allowance.</p></CardContent></Card>
      </section>
      <Card className="border-[#b9d8dd] bg-[#edf7f8]"><CardHeader><Clock3 className="size-6 text-[#147d91]"/><CardTitle className="font-serif text-3xl">{minutes} extra Live minutes</CardTitle><CardDescription>One-off purchase. Buy one or more packs; credits are added automatically after Stripe confirms payment.</CardDescription></CardHeader><CardContent className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end"><div><p className="font-serif text-4xl font-bold">£{price.toFixed(2)}<span className="text-base font-normal text-slate-500"> / pack</span></p><p className="mt-2 text-sm text-slate-600">Included Free and Pro allowances remain unchanged. This is an optional usage add-on rather than a subscription upgrade.</p></div><form action="/api/billing/addon-checkout" method="post" className="flex items-end gap-2"><input type="hidden" name="kind" value="live_credit_pack"/><label><span className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">Packs</span><select name="quantity" defaultValue="1" className="h-10 rounded-md border bg-white px-3 text-sm"><option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4">4</option><option value="5">5</option></select></label><Button type="submit"><CreditCard/>Buy credits</Button></form></CardContent></Card>
      <div className="flex flex-wrap gap-2"><Button asChild><Link href="/gemini-live-interview"><Sparkles/>Start Live Interview</Link></Button><Button asChild variant="outline"><Link href="/account">View account</Link></Button></div>
    </div>
  </main>
}

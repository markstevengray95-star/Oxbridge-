import Link from "next/link"
import { ArrowLeft, CheckCircle2, Clock3, CreditCard, UserCheck } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/server"
import { humanReviewPrice } from "@/lib/billing/plans"

export const dynamic = "force-dynamic"

type ReviewOrder = {
  id: string
  status: string
  source_type: string
  title: string
  notes: string
  reviewer_name?: string | null
  feedback?: string | null
  created_at: string
}

export default async function ExpertReviewPage() {
  const supabase = await createClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  const userId = typeof claimsData?.claims?.sub === "string" ? claimsData.claims.sub : ""
  let orders: ReviewOrder[] = []
  if (userId) {
    const { data } = await supabase.from("human_review_orders").select("id,status,source_type,title,notes,reviewer_name,feedback,created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(20)
    orders = (data ?? []) as ReviewOrder[]
  }
  const price = humanReviewPrice()

  return <main className="min-h-screen bg-[#f5f7f7] text-[#172b3a]">
    <header className="border-b bg-white"><div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4"><Button asChild variant="ghost"><Link href="/premium"><ArrowLeft/>Premium</Link></Button><Badge variant="outline"><UserCheck className="size-3.5"/>Expert Review</Badge></div></header>
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6">
      <section><p className="text-xs font-bold uppercase tracking-[.18em] text-[#147d91]">Optional paid review</p><h1 className="mt-2 font-serif text-4xl font-bold">Add a human review to an interview.</h1><p className="mt-3 max-w-3xl text-slate-600">Purchase a review request for an interview transcript or saved interview result. The reviewer can add detailed feedback that sits alongside the AI analysis. Reviewer identity and status are shown on the completed order.</p></section>
      <Card className="border-[#b9d8dd] bg-[#edf7f8]"><CardHeader><CardTitle className="font-serif text-3xl">Expert interview review</CardTitle><CardDescription>One-off add-on. The checkout creates a review order automatically after payment succeeds.</CardDescription></CardHeader><CardContent><form action="/api/billing/addon-checkout" method="post" className="grid gap-4 md:grid-cols-2"><input type="hidden" name="kind" value="human_interview_review"/><label><span className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">Evidence type</span><select name="source_type" defaultValue="interview" className="h-10 w-full rounded-md border bg-white px-3 text-sm"><option value="interview">Interview transcript</option><option value="panel_interview">Two-person panel</option><option value="video_interview">Video interview</option><option value="written_work">Written-work discussion</option></select></label><label><span className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">Review title</span><input name="title" maxLength={120} defaultValue="Expert interview review" className="h-10 w-full rounded-md border bg-white px-3 text-sm"/></label><label className="md:col-span-2"><span className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">What should the reviewer focus on?</span><textarea name="notes" maxLength={450} rows={4} className="w-full rounded-md border bg-white p-3 text-sm" placeholder="For example: reasoning under challenge, structure, subject precision, recovery after mistakes…"/></label><div className="md:col-span-2 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-4"><div><p className="font-serif text-3xl font-bold">£{price.toFixed(2)}</p><p className="text-xs text-slate-500">one review request</p></div><Button type="submit"><CreditCard/>Purchase review</Button></div></form></CardContent></Card>
      <Card><CardHeader><CardTitle className="font-serif text-2xl">Your review orders</CardTitle><CardDescription>Status is updated as the review moves through the queue.</CardDescription></CardHeader><CardContent className="space-y-3">{orders.length ? orders.map(order => <div key={order.id} className="rounded-2xl border bg-white p-4"><div className="flex flex-wrap items-center gap-2"><Badge>{order.status.replace(/_/g," ")}</Badge><Badge variant="outline">{order.source_type.replace(/_/g," ")}</Badge><span className="text-xs text-slate-400">{new Date(order.created_at).toLocaleDateString("en-GB")}</span></div><h3 className="mt-2 font-semibold">{order.title}</h3>{order.notes && <p className="mt-2 text-sm text-slate-600">Focus: {order.notes}</p>}{order.feedback ? <div className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-950"><CheckCircle2 className="mr-1 inline size-4"/><strong>{order.reviewer_name || "Reviewer"}:</strong> {order.feedback}</div> : <p className="mt-3 flex items-center gap-2 text-sm text-slate-500"><Clock3 className="size-4"/>Feedback has not been added yet.</p>}</div>) : <p className="text-sm text-slate-500">No paid expert reviews yet.</p>}</CardContent></Card>
      <p className="text-xs leading-5 text-slate-500">This paid review route is separate from the School plan's teacher-recorded Human + AI Review tool. Human review can supplement preparation evidence but does not predict an admissions outcome.</p>
    </div>
  </main>
}

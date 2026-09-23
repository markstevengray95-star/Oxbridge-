"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { ArrowLeft, CheckCircle2, Save, UserCheck } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { HUMAN_REVIEW_KEY, PROGRESS_KEY } from "@/lib/personal-tutor"
import { createClient } from "@/lib/supabase/client"

type Review = { id: string; type: string; source: string; reviewer: string; role: string; verdict: "agree" | "partly_agree" | "disagree"; comment: string; date: string }
function readProgress() { try { return JSON.parse(localStorage.getItem(PROGRESS_KEY) || "{}") as Record<string, unknown> } catch { return {} } }
function readReviews() { try { const value = JSON.parse(localStorage.getItem(HUMAN_REVIEW_KEY) || "[]"); return Array.isArray(value) ? value as Review[] : [] } catch { return [] } }

export default function HumanReviewPage() {
  const [progress, setProgress] = useState<Record<string, unknown>>({})
  const [reviews, setReviews] = useState<Review[]>([])
  const [type, setType] = useState("Interview")
  const [reviewer, setReviewer] = useState("")
  const [role, setRole] = useState("Teacher / tutor")
  const [verdict, setVerdict] = useState<Review["verdict"]>("agree")
  const [comment, setComment] = useState("")
  const [saved, setSaved] = useState(false)
  useEffect(() => { setProgress(readProgress()); setReviews(readReviews()) }, [])

  const sources = useMemo(() => {
    const interview = Array.isArray(progress.logs) ? (progress.logs as Array<Record<string, unknown>>)[0] : undefined
    const paper = Array.isArray(progress.fullPaperResults) ? (progress.fullPaperResults as Array<Record<string, unknown>>)[0] : undefined
    const essay = Array.isArray(progress.essayAnalyses) ? (progress.essayAnalyses as Array<Record<string, unknown>>)[0] : undefined
    return {
      Interview: interview ? `${String(interview.title ?? "Latest interview")} · practice signal ${String(interview.score ?? "—")}` : "No saved interview yet",
      "Full paper": paper ? `${String(paper.title ?? paper.test ?? "Latest paper")} · ${String(paper.accuracy ?? "—")}%` : "No saved full paper yet",
      Essay: essay ? `${String(essay.test ?? "Essay")} · ${String(essay.weakest ?? "analysis saved")}` : "No saved essay analysis yet",
    }
  }, [progress])
  const source = sources[type as keyof typeof sources] ?? "No source"

  async function saveReview() {
    if (!comment.trim()) return
    const entry: Review = { id: `review-${Date.now()}`, type, source, reviewer: reviewer.trim() || "Reviewer", role, verdict, comment: comment.trim(), date: new Date().toISOString() }
    const next = [entry, ...reviews].slice(0, 50)
    setReviews(next); localStorage.setItem(HUMAN_REVIEW_KEY, JSON.stringify(next)); setSaved(true); setComment("")
    try {
      const supabase = createClient(); const { data } = await supabase.auth.getUser()
      if (data.user) await supabase.from("human_reviews").insert({ user_id: data.user.id, review_type: type.toLowerCase().replace(/\s+/g, "_"), source_ref: source.slice(0, 300), reviewer_name: entry.reviewer, reviewer_role: role, verdict, comment: entry.comment, metadata: { local_id: entry.id } })
    } catch {}
  }

  return <main className="min-h-screen bg-[#f5f7f7] text-[#172b3a]"><header className="border-b bg-white"><div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4"><Button asChild variant="ghost"><Link href="/tutor"><ArrowLeft />Personal Tutor</Link></Button><Badge variant="outline"><UserCheck className="size-3.5" />Human + AI Review</Badge></div></header><div className="mx-auto max-w-6xl space-y-6 px-4 py-8"><section><p className="text-xs font-bold uppercase tracking-[.18em] text-[#147d91]">Add a human judgement layer</p><h1 className="mt-2 font-serif text-4xl font-bold">Let a teacher or tutor challenge the AI analysis.</h1><p className="mt-3 max-w-3xl text-slate-600">Choose a recent interview, paper or essay analysis. The human reviewer can agree, partly agree or disagree with the automated diagnosis and leave a concise coaching comment. Reviewer identity is entered manually here; the app does not independently verify professional credentials.</p></section><section className="grid gap-5 lg:grid-cols-[.9fr_1.1fr]"><Card className="shadow-none"><CardHeader><CardTitle className="font-serif text-2xl">Review bundle</CardTitle></CardHeader><CardContent className="space-y-4"><label><span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Evidence type</span><select className="h-10 w-full rounded-md border bg-white px-3 text-sm" value={type} onChange={event => { setType(event.target.value); setSaved(false) }}><option>Interview</option><option>Full paper</option><option>Essay</option></select></label><div className="rounded-2xl border bg-slate-50 p-4"><p className="text-xs font-bold uppercase tracking-wider text-slate-500">Latest evidence</p><p className="mt-2 text-sm leading-6">{source}</p></div><Button asChild variant="outline" className="w-full"><Link href={type === "Interview" ? "/interview-feedback" : type === "Essay" ? "/essay-tutor" : "/full-papers"}>Open detailed AI evidence</Link></Button></CardContent></Card><Card className="shadow-none"><CardHeader><CardTitle className="font-serif text-2xl">Human review</CardTitle><CardDescription>Record the human response to the AI evidence.</CardDescription></CardHeader><CardContent className="space-y-4"><div className="grid gap-3 md:grid-cols-2"><label><span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Reviewer name</span><input className="h-10 w-full rounded-md border bg-white px-3 text-sm" value={reviewer} onChange={event => setReviewer(event.target.value)} placeholder="Name" /></label><label><span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Role</span><input className="h-10 w-full rounded-md border bg-white px-3 text-sm" value={role} onChange={event => setRole(event.target.value)} /></label></div><label><span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Agreement with AI diagnosis</span><select className="h-10 w-full rounded-md border bg-white px-3 text-sm" value={verdict} onChange={event => setVerdict(event.target.value as Review["verdict"])}><option value="agree">Agree</option><option value="partly_agree">Partly agree</option><option value="disagree">Disagree</option></select></label><Textarea rows={7} value={comment} onChange={event => { setComment(event.target.value); setSaved(false) }} placeholder="What would you keep, change or prioritise in the AI feedback?" /><Button onClick={() => void saveReview()} disabled={!comment.trim()}><Save />Save human review</Button>{saved && <p className="flex items-center gap-2 text-sm text-emerald-700"><CheckCircle2 className="size-4" />Review saved.</p>}</CardContent></Card></section><Card className="shadow-none"><CardHeader><CardTitle className="font-serif text-2xl">Review history</CardTitle></CardHeader><CardContent className="space-y-3">{reviews.length ? reviews.map(item => <div key={item.id} className="rounded-2xl border bg-white p-4"><div className="flex flex-wrap items-center gap-2"><Badge>{item.type}</Badge><Badge variant="outline">{item.verdict.replace("_", " ")}</Badge><strong>{item.reviewer}</strong><span className="text-xs text-slate-400">{new Date(item.date).toLocaleDateString("en-GB")}</span></div><p className="mt-2 text-sm leading-6 text-slate-600">{item.comment}</p></div>) : <p className="text-sm text-slate-600">No human reviews saved yet.</p>}</CardContent></Card></div></main>
}

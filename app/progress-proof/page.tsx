"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { ArrowLeft, ArrowRight, CheckCircle2, History, TrendingUp } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { PROFILE_KEY, PROGRESS_KEY, buildStudentIntelligence } from "@/lib/personal-tutor"

function read(key: string) { try { return JSON.parse(localStorage.getItem(key) || "{}") as Record<string, unknown> } catch { return {} } }
function dateLabel(value: string) { const date = new Date(value); return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(date) }

export default function ProgressProofPage() {
  const [profile, setProfile] = useState<Record<string, unknown>>({})
  const [progressData, setProgressData] = useState<Record<string, unknown>>({})
  useEffect(() => { setProfile(read(PROFILE_KEY)); setProgressData(read(PROGRESS_KEY)) }, [])
  const intelligence = useMemo(() => buildStudentIntelligence(profile, progressData), [profile, progressData])
  const skills = intelligence.skills.filter(item => item.evidenceCount > 0).sort((a, b) => b.score - a.score)

  return <main className="min-h-screen bg-[#f6f8f8] text-[#172b3a]">
    <header className="border-b bg-white"><div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4"><Button asChild variant="ghost"><Link href="/tutor"><ArrowLeft />Personal Tutor</Link></Button><Badge variant="outline"><TrendingUp className="size-3.5" />Progress Proof</Badge></div></header>
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8">
      <section className="grid gap-5 lg:grid-cols-[1.25fr_.75fr]"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#147d91]">Evidence, not streaks alone</p><h1 className="mt-2 font-serif text-4xl font-bold">Show what has actually improved.</h1><p className="mt-3 max-w-3xl text-slate-600">This view turns paper scores, retests and interview evidence into a preparation record. A skill becomes secure because repeated evidence supports it, not because the app awards a badge.</p></div><Card className="border-0 bg-[#102a43] text-white shadow-none"><CardHeader><CardDescription className="text-white/60">Current evidenced profile</CardDescription><CardTitle className="font-serif text-5xl">{intelligence.preparationScore || "—"}{intelligence.preparationScore ? "%" : ""}</CardTitle><CardDescription className="text-white/60">Across {skills.length} evidenced skill area{skills.length === 1 ? "" : "s"}.</CardDescription></CardHeader></Card></section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{skills.map(item => <Card key={item.id} className={item.status === "Secure" ? "border-emerald-200 bg-emerald-50 shadow-none" : "shadow-none"}><CardHeader><div className="flex items-center justify-between gap-2"><Badge variant="outline">{item.domain}</Badge><Badge>{item.status}</Badge></div><CardTitle className="font-serif text-xl">{item.label}</CardTitle><CardDescription>{item.note}</CardDescription></CardHeader><CardContent><div className="flex items-center gap-3"><Progress value={item.score} className="flex-1" /><strong>{item.score}%</strong></div><p className="mt-3 text-sm text-slate-600">{item.evidenceCount} evidence point{item.evidenceCount === 1 ? "" : "s"} · trend {item.trend === "up" ? "improving" : item.trend === "down" ? "needs attention" : "stable"}</p></CardContent></Card>)}</section>

      <Card className="shadow-none"><CardHeader><div className="flex items-center gap-2"><History className="size-5 text-[#147d91]" /><CardTitle className="font-serif text-2xl">Evidence timeline</CardTitle></div><CardDescription>Recent moments that changed the tutor's view of your preparation.</CardDescription></CardHeader><CardContent className="space-y-3">{intelligence.evidence.length ? intelligence.evidence.map((item, index) => <div key={item.id} className="flex gap-4 rounded-2xl border bg-white p-4"><span className={`mt-1 grid size-8 shrink-0 place-items-center rounded-full ${item.state === "Secure" ? "bg-emerald-100 text-emerald-700" : item.state === "Developing" ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-600"}`}>{item.state === "Secure" ? <CheckCircle2 className="size-4" /> : index + 1}</span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><strong>{item.skill}</strong><Badge variant="outline">{item.domain}</Badge><Badge variant="outline">{item.score}%</Badge></div><p className="mt-1 text-sm leading-6 text-slate-600">{item.evidence}</p><p className="mt-1 text-xs text-slate-400">{dateLabel(item.date)}</p></div></div>) : <p className="text-sm text-slate-600">Complete an interview, full paper or intervention retest to start the evidence timeline.</p>}</CardContent></Card>

      <div className="flex flex-wrap gap-2"><Button asChild><Link href="/tutor">Back to today's plan <ArrowRight /></Link></Button><Button asChild variant="outline"><Link href="/mistake-dna">See Mistake DNA</Link></Button></div>
    </div>
  </main>
}

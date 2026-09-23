"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { ArrowLeft, ArrowRight, Brain, Target, TrendingDown, TrendingUp } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { PROFILE_KEY, PROGRESS_KEY, buildStudentIntelligence } from "@/lib/personal-tutor"

function read(key: string) { try { return JSON.parse(localStorage.getItem(key) || "{}") as Record<string, unknown> } catch { return {} } }

export default function MistakeDnaPage() {
  const [profile, setProfile] = useState<Record<string, unknown>>({})
  const [progressData, setProgressData] = useState<Record<string, unknown>>({})
  useEffect(() => { setProfile(read(PROFILE_KEY)); setProgressData(read(PROGRESS_KEY)) }, [])
  const intelligence = useMemo(() => buildStudentIntelligence(profile, progressData), [profile, progressData])
  const evidencedSkills = intelligence.skills.filter(item => item.evidenceCount > 0).sort((a, b) => a.score - b.score)

  return <main className="min-h-screen bg-[#f5f7f7] text-[#172b3a]">
    <header className="border-b bg-white"><div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4"><Button asChild variant="ghost"><Link href="/tutor"><ArrowLeft />Personal Tutor</Link></Button><Badge variant="outline"><Brain className="size-3.5" />Mistake DNA</Badge></div></header>
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8">
      <section><p className="text-xs font-bold uppercase tracking-[.18em] text-[#147d91]">Cross-tool diagnosis</p><h1 className="mt-2 font-serif text-4xl font-bold">Why you lose marks or weaken an argument.</h1><p className="mt-3 max-w-3xl text-slate-600">Mistake DNA combines repeated patterns from interviews, full papers, interventions and essay feedback. It focuses on behaviours that can be changed, not fixed labels about ability.</p></section>

      <section className="grid gap-4 lg:grid-cols-3">{intelligence.mistakes.length ? intelligence.mistakes.slice(0, 6).map((item, index) => <Card key={item.id} className={item.priority === "high" ? "border-rose-200 bg-rose-50 shadow-none" : item.priority === "medium" ? "border-amber-200 bg-amber-50 shadow-none" : "shadow-none"}><CardHeader><div className="flex items-center justify-between"><Badge variant="outline">Pattern {index + 1}</Badge><Badge>{item.priority}</Badge></div><CardTitle className="font-serif text-xl">{item.label}</CardTitle><CardDescription>{item.domain}</CardDescription></CardHeader><CardContent className="space-y-3"><p className="text-sm leading-6">{item.evidence}</p><div className="rounded-xl bg-white/70 p-3 text-sm leading-6"><strong>Intervention:</strong> {item.action}</div><Button asChild variant="outline" className="w-full"><Link href={item.href}>Work on this <ArrowRight /></Link></Button></CardContent></Card>) : <Card className="lg:col-span-3 shadow-none"><CardHeader><CardTitle className="font-serif text-2xl">Not enough evidence yet</CardTitle><CardDescription>Complete at least one formal interview and one full paper. The tutor will then start separating one-off errors from recurring patterns.</CardDescription></CardHeader><CardContent><div className="flex gap-2"><Button asChild><Link href="/interview-room">Interview baseline</Link></Button><Button asChild variant="outline"><Link href="/full-papers">Full paper baseline</Link></Button></div></CardContent></Card>}</section>

      <Card className="shadow-none"><CardHeader><CardTitle className="font-serif text-2xl">Skill evidence map</CardTitle><CardDescription>Low scores are priorities only when there is enough evidence behind them.</CardDescription></CardHeader><CardContent className="grid gap-3 md:grid-cols-2">{evidencedSkills.map(item => <div key={item.id} className="rounded-2xl border bg-white p-4"><div className="flex items-center justify-between gap-3"><div><p className="font-semibold">{item.label}</p><p className="text-xs text-slate-500">{item.domain} · {item.evidenceCount} evidence point{item.evidenceCount === 1 ? "" : "s"}</p></div><div className="flex items-center gap-2"><Badge variant="outline">{item.status}</Badge>{item.trend === "up" ? <TrendingUp className="size-4 text-emerald-600" /> : item.trend === "down" ? <TrendingDown className="size-4 text-amber-600" /> : null}</div></div><div className="mt-3 flex items-center gap-3"><Progress value={item.score} className="flex-1" /><strong>{item.score}%</strong></div><p className="mt-2 text-sm leading-6 text-slate-600">{item.note}</p></div>)}</CardContent></Card>

      <Card className="border-0 bg-[#102a43] text-white shadow-none"><CardHeader><Target className="size-5 text-[#8dd7de]" /><CardTitle className="font-serif text-2xl">Tutor priority</CardTitle><CardDescription className="text-white/65">{intelligence.priority ? `${intelligence.priority.label} is the current lowest well-evidenced skill at ${intelligence.priority.score}%.` : "The tutor is still building your baseline."}</CardDescription></CardHeader><CardContent><Button asChild className="bg-white text-[#102a43] hover:bg-blue-50"><Link href={intelligence.priority?.href ?? "/tutor"}>Start targeted practice <ArrowRight /></Link></Button></CardContent></Card>
    </div>
  </main>
}

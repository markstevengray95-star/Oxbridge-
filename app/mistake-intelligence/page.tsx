"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { ArrowLeft, ArrowRight, Brain, CheckCircle2, TrendingDown, TrendingUp, TriangleAlert } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { buildMistakeIntelligence } from "@/lib/mistake-intelligence"
import { PROGRESS_KEY } from "@/lib/personal-tutor"

function readProgress() {
  try { return JSON.parse(localStorage.getItem(PROGRESS_KEY) || "{}") as Record<string, unknown> }
  catch { return {} }
}

export default function MistakeIntelligencePage() {
  const [progress, setProgress] = useState<Record<string, unknown>>({})
  useEffect(() => setProgress(readProgress()), [])
  const causes = useMemo(() => buildMistakeIntelligence(progress), [progress])
  const top = causes[0]
  const improving = causes.filter(item => item.trend === "improving").length
  const persistent = causes.filter(item => item.trend === "worsening" || item.trend === "new").length

  return <main className="min-h-screen bg-[#f5f7f7] text-[#172b3a]">
    <header className="border-b bg-white"><div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4"><Button asChild variant="ghost"><Link href="/mistake-dna"><ArrowLeft />Mistake DNA</Link></Button><Badge variant="outline"><Brain className="size-3.5"/>Mistake Intelligence</Badge></div></header>
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6">
      <section><p className="text-xs font-bold uppercase tracking-[.18em] text-[#147d91]">Root-cause diagnosis</p><h1 className="mt-2 font-serif text-4xl font-bold">Track the reason behind the mistake, not only the topic.</h1><p className="mt-3 max-w-3xl text-slate-600">The engine groups incomplete paper responses into changeable behaviours such as omission, interpretation, evidence use, method selection, execution, assumption control, evaluation and checking. Trends compare recent papers with earlier ones; they are practice signals, not labels of ability.</p></section>

      <section className="grid gap-4 md:grid-cols-3"><Card className="border-0 bg-[#102a43] text-white shadow-none"><CardHeader><CardDescription className="text-white/60">Highest current root cause</CardDescription><CardTitle className="font-serif text-2xl">{top?.label ?? "Build a baseline"}</CardTitle><CardDescription className="text-white/60">{top ? `${top.recentRate} errors per recent paper` : "Complete at least one full paper to start diagnosis."}</CardDescription></CardHeader></Card><Card className="shadow-none"><CardHeader><CardDescription>Improving causes</CardDescription><CardTitle className="font-serif text-4xl">{improving}</CardTitle></CardHeader><CardContent className="text-sm text-slate-500">Lower frequency in the recent half of saved papers.</CardContent></Card><Card className="shadow-none"><CardHeader><CardDescription>New / worsening causes</CardDescription><CardTitle className="font-serif text-4xl">{persistent}</CardTitle></CardHeader><CardContent className="text-sm text-slate-500">Priorities for deliberate follow-up rather than more random practice.</CardContent></Card></section>

      {causes.length ? <section className="grid gap-4 lg:grid-cols-2">{causes.map(item => <Card key={item.id} className={item.trend === "worsening" ? "border-rose-200 bg-rose-50 shadow-none" : item.trend === "improving" ? "border-emerald-200 bg-emerald-50 shadow-none" : "shadow-none"}><CardHeader><div className="flex flex-wrap items-center justify-between gap-2"><Badge variant="outline">{item.count} recorded error{item.count === 1 ? "" : "s"}</Badge><Badge variant={item.trend === "worsening" ? "destructive" : "outline"}>{item.trend === "improving" ? <TrendingDown className="mr-1 size-3"/> : item.trend === "worsening" ? <TrendingUp className="mr-1 size-3"/> : item.trend === "new" ? <TriangleAlert className="mr-1 size-3"/> : null}{item.trend}</Badge></div><CardTitle className="font-serif text-2xl">{item.label}</CardTitle><CardDescription>{item.description}</CardDescription></CardHeader><CardContent className="space-y-4"><div><div className="flex justify-between text-xs text-slate-500"><span>Earlier: {item.earlierRate}/paper</span><span>Recent: {item.recentRate}/paper</span></div><Progress value={Math.min(100, item.recentRate * 20)} className="mt-2"/></div><div className="rounded-xl bg-white/80 p-4 text-sm leading-6"><strong>Intervention:</strong> {item.intervention}</div>{item.examples.length ? <details className="rounded-xl border bg-white p-4"><summary className="cursor-pointer text-sm font-semibold">See example mistakes</summary><div className="mt-3 space-y-3">{item.examples.map((example, index) => <div key={`${example.test}-${index}`} className="text-sm"><p className="text-xs font-semibold text-slate-500">{example.test}</p><p className="mt-1 line-clamp-3">{example.prompt}</p></div>)}</div></details> : null}<Button asChild variant="outline"><Link href={item.href}>Target this cause <ArrowRight/></Link></Button></CardContent></Card>)}</section> : <Card className="shadow-none"><CardHeader><CardTitle className="font-serif text-2xl">Not enough paper evidence yet</CardTitle><CardDescription>Complete a full paper and its question-level review. Mistake Intelligence needs actual incorrect or partial responses before it can infer root causes.</CardDescription></CardHeader><CardContent><Button asChild><Link href="/full-papers">Complete a full paper</Link></Button></CardContent></Card>}

      {top ? <Card className="border-[#cfe1e4] bg-[#edf7f8] shadow-none"><CardHeader><CheckCircle2 className="size-5 text-[#147d91]"/><CardTitle className="font-serif text-2xl">Next repair loop</CardTitle><CardDescription>Work on one root cause, then check whether its rate drops in the next paper rather than judging success from one question.</CardDescription></CardHeader><CardContent className="flex flex-wrap gap-2"><Button asChild><Link href={top.href}>Practise {top.label} <ArrowRight/></Link></Button><Button asChild variant="outline"><Link href="/mistake-replay">Replay saved mistakes</Link></Button></CardContent></Card> : null}
    </div>
  </main>
}

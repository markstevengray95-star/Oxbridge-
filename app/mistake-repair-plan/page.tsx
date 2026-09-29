"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { ArrowLeft, ArrowRight, CheckCircle2, RotateCcw, Target, TrendingDown } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { buildMistakeIntelligence, type MistakeCause } from "@/lib/mistake-intelligence"
import { PROGRESS_KEY } from "@/lib/personal-tutor"

const PLAN_KEY = "oxbridge-mistake-repair-plan-v1"
type SavedPlan = { causeId?: string; completed?: string[]; startedAt?: string; baselineRate?: number }

function read<T>(key: string, fallback: T): T { try { return JSON.parse(localStorage.getItem(key) || "") as T } catch { return fallback } }

function stepsFor(cause: MistakeCause) {
  return [
    { id: "repair", title: "Repair the underlying process", note: cause.intervention, href: cause.href },
    { id: "replay", title: "Replay an old error", note: "Return to a saved mistake and solve it again without copying the original route.", href: "/mistake-replay" },
    { id: "transfer", title: "Test the skill in a changed context", note: "Use an adaptive or mixed question so success cannot come from memorising the previous answer.", href: "/adaptive-paper" },
    { id: "verify", title: "Verify on the next full paper", note: "Complete a fresh full paper and check whether this root cause occurs less often per paper.", href: "/full-papers" },
  ]
}

export default function MistakeRepairPlanPage() {
  const [progressData, setProgressData] = useState<Record<string, unknown>>({})
  const [plan, setPlan] = useState<SavedPlan>({ completed: [] })
  const [loaded, setLoaded] = useState(false)

  function refresh() {
    setProgressData(read<Record<string, unknown>>(PROGRESS_KEY, {}))
    setPlan(read<SavedPlan>(PLAN_KEY, { completed: [] }))
    setLoaded(true)
  }
  useEffect(() => refresh(), [])

  const causes = useMemo(() => buildMistakeIntelligence(progressData), [progressData])
  const active = causes.find(item => item.id === plan.causeId) ?? causes[0]
  const steps = active ? stepsFor(active) : []
  const completed = plan.completed ?? []
  const completion = steps.length ? Math.round(completed.length / steps.length * 100) : 0

  function select(cause: MistakeCause) {
    const next = { causeId: cause.id, completed: [], startedAt: new Date().toISOString(), baselineRate: cause.recentRate }
    setPlan(next); localStorage.setItem(PLAN_KEY, JSON.stringify(next))
  }

  function toggle(id: string) {
    if (!active) return
    const nextCompleted = completed.includes(id) ? completed.filter(item => item !== id) : [...completed, id]
    const next = { ...plan, causeId: active.id, baselineRate: plan.baselineRate ?? active.recentRate, startedAt: plan.startedAt || new Date().toISOString(), completed: nextCompleted }
    setPlan(next); localStorage.setItem(PLAN_KEY, JSON.stringify(next))
  }

  function restart() {
    if (!active) return
    select(active)
  }

  return <main className="min-h-screen bg-[#f5f7f7] text-[#172b3a]">
    <header className="border-b bg-white"><div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4"><Button asChild variant="ghost"><Link href="/mistake-intelligence"><ArrowLeft/>Mistake Intelligence</Link></Button><Badge variant="outline"><Target className="size-3.5"/>Repair Plan</Badge></div></header>
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6">
      <section><p className="text-xs font-bold uppercase tracking-[.18em] text-[#147d91]">Deliberate repair loop</p><h1 className="mt-2 font-serif text-4xl font-bold">Fix one recurring cause, then prove it changed.</h1><p className="mt-3 max-w-3xl text-slate-600">Instead of doing random extra questions, this four-stage loop targets one root cause, replays it, transfers it to a new context, then verifies the change on a fresh paper.</p></section>

      {!loaded ? <Card><CardContent className="p-8 text-center text-slate-500">Loading mistake evidence…</CardContent></Card> : !causes.length ? <Card><CardHeader><CardTitle>No root-cause evidence yet</CardTitle><CardDescription>Complete a full paper first so Mistake Intelligence has incorrect or partial responses to classify.</CardDescription></CardHeader><CardContent><Button asChild><Link href="/full-papers">Complete a full paper</Link></Button></CardContent></Card> : <>
        <section className="grid gap-5 xl:grid-cols-[.75fr_1.25fr]"><Card className="shadow-none"><CardHeader><CardTitle className="font-serif text-2xl">Choose the root cause</CardTitle><CardDescription>The highest-priority current cause is selected automatically, but you can switch.</CardDescription></CardHeader><CardContent className="space-y-2">{causes.map(cause => <button type="button" key={cause.id} onClick={() => select(cause)} className={`w-full rounded-xl border p-4 text-left ${active?.id === cause.id ? "border-[#147d91] bg-[#edf7f8]" : "bg-white"}`}><div className="flex items-center justify-between gap-2"><strong>{cause.label}</strong><Badge variant="outline">{cause.trend}</Badge></div><p className="mt-1 text-xs text-slate-500">Recent {cause.recentRate}/paper · Earlier {cause.earlierRate}/paper</p></button>)}</CardContent></Card>

          {active ? <div className="space-y-4"><Card className="border-0 bg-[#102a43] text-white shadow-none"><CardHeader><div className="flex flex-wrap items-start justify-between gap-3"><div><CardDescription className="text-white/60">Current repair target</CardDescription><CardTitle className="mt-2 font-serif text-3xl">{active.label}</CardTitle><CardDescription className="mt-2 text-white/60">Baseline for this cycle: {plan.baselineRate ?? active.recentRate} errors per paper</CardDescription></div><Badge className="bg-white/10 text-white">{completion}% complete</Badge></div></CardHeader><CardContent><Progress value={completion}/></CardContent></Card>

            <Card className="shadow-none"><CardHeader><CardTitle className="font-serif text-2xl">Four-stage repair loop</CardTitle><CardDescription>Mark a stage complete only after doing the linked work.</CardDescription></CardHeader><CardContent className="space-y-3">{steps.map((step, index) => { const done = completed.includes(step.id); const open = index === 0 || completed.includes(steps[index - 1].id); return <div key={step.id} className={`grid gap-3 rounded-xl border p-4 md:grid-cols-[40px_1fr_auto] md:items-center ${done ? "border-emerald-200 bg-emerald-50" : "bg-white"}`}><span className="grid size-8 place-items-center rounded-full bg-[#102a43] text-sm font-bold text-white">{done ? <CheckCircle2 className="size-4"/> : index + 1}</span><div><strong>{step.title}</strong><p className="mt-1 text-sm leading-6 text-slate-600">{step.note}</p></div><div className="flex gap-2"><Button asChild size="sm" variant="outline" aria-disabled={!open}><Link href={open ? step.href : "#"}>Open <ArrowRight/></Link></Button><Button size="sm" disabled={!open} variant={done ? "default" : "outline"} onClick={() => toggle(step.id)}>{done ? "Done" : "Mark done"}</Button></div></div>})}</CardContent></Card>

            <Card className="border-[#cfe1e4] bg-[#edf7f8] shadow-none"><CardHeader><TrendingDown className="size-5 text-[#147d91]"/><CardTitle className="font-serif text-xl">Success criterion</CardTitle><CardDescription>After the verification paper, refresh Mistake Intelligence. A lower recent errors-per-paper rate is stronger evidence of improvement than getting one replay question right.</CardDescription></CardHeader><CardContent className="flex flex-wrap gap-2"><Button asChild><Link href="/mistake-intelligence">Check new trend <ArrowRight/></Link></Button><Button variant="outline" onClick={restart}><RotateCcw/>Restart repair cycle</Button></CardContent></Card></div> : null}
        </section>
      </>}
    </div>
  </main>
}

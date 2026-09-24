"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { ArrowLeft, ArrowRight, CalendarCheck2, CheckCircle2, Circle, Gauge, Grid3X3, Target } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { deriveDeepMetrics, interviewHeatmap, nextMockRecommendation, readinessChecklist } from "@/lib/deep-prep"

const PROGRESS_KEY = "oxbridge-tutor-progress-v2"

function readProgress() { try { return JSON.parse(localStorage.getItem(PROGRESS_KEY) || "{}") as Record<string,unknown> } catch { return {} } }

export default function PreparationReadinessPage() {
  const [progressData,setProgressData]=useState<Record<string,unknown>>({})
  useEffect(()=>setProgressData(readProgress()),[])
  const metrics=useMemo(()=>deriveDeepMetrics(progressData),[progressData])
  const checklist=useMemo(()=>readinessChecklist(progressData),[progressData])
  const heatmap=useMemo(()=>interviewHeatmap(progressData),[progressData])
  const mock=useMemo(()=>nextMockRecommendation(progressData),[progressData])
  const completed=checklist.filter(item=>item.done).length
  const completion=checklist.length?Math.round(completed/checklist.length*100):0
  const weakest=[...metrics].sort((a,b)=>a.score-b.score)[0]

  return <main className="min-h-screen bg-[#f4f7f7] text-[#172b3a]"><header className="border-b bg-white"><div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6"><Button asChild variant="ghost"><Link href="/tutor"><ArrowLeft/>Personal Tutor</Link></Button><Badge variant="outline"><Gauge className="size-3.5"/>Preparation Readiness</Badge></div></header><div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6"><section className="grid gap-5 lg:grid-cols-[1.15fr_.85fr]"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#147d91]">Evidence, not an offer prediction</p><h1 className="mt-2 font-serif text-4xl font-bold">Know which parts of preparation are genuinely ready.</h1><p className="mt-3 max-w-3xl leading-7 text-slate-600">This dashboard checks whether you have built evidence across tests, unfamiliar interviews, writing, retention, transfer, reading and written-work defence. It deliberately does not estimate your chance of admission.</p></div><Card className="border-0 bg-[#102a43] text-white"><CardHeader><CardDescription className="text-white/65">Preparation coverage</CardDescription><CardTitle className="font-serif text-4xl">{completed}/{checklist.length}</CardTitle></CardHeader><CardContent><Progress value={completion}/><p className="mt-3 text-sm text-white/70">Current priority: {weakest?.label ?? "Build a baseline"}</p></CardContent></Card></section>

<section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{metrics.map(item=><Card key={item.id}><CardHeader><div className="flex items-center justify-between gap-2"><CardTitle className="font-serif text-xl">{item.label}</CardTitle><Badge variant="outline">{item.score}%</Badge></div><Progress value={item.score}/></CardHeader><CardContent><p className="text-sm leading-6 text-slate-600">{item.evidence}</p><p className="mt-2 text-sm leading-6"><strong>Next:</strong> {item.next}</p></CardContent></Card>)}</section>

<section className="grid gap-5 xl:grid-cols-[1fr_1fr]"><Card><CardHeader><CardTitle className="flex items-center gap-2 font-serif text-2xl"><CalendarCheck2 className="size-5 text-[#147d91]"/>Readiness checklist</CardTitle><CardDescription>Coverage of the preparation process rather than a single overall score.</CardDescription></CardHeader><CardContent className="space-y-3">{checklist.map(item=><div key={item.id} className="flex items-start gap-3 rounded-xl border p-3">{item.done?<CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-700"/>:<Circle className="mt-0.5 size-5 shrink-0 text-slate-400"/>}<div className="min-w-0 flex-1"><strong className="text-sm">{item.label}</strong><p className="mt-1 text-xs leading-5 text-slate-500">{item.evidence}</p></div><Button asChild size="sm" variant="ghost"><Link href={item.href}>Open <ArrowRight/></Link></Button></div>)}</CardContent></Card><Card><CardHeader><CardTitle className="flex items-center gap-2 font-serif text-2xl"><Grid3X3 className="size-5 text-[#147d91]"/>Interview pressure heatmap</CardTitle><CardDescription>Which interviewer behaviours are currently easiest or hardest to handle.</CardDescription></CardHeader><CardContent className="space-y-4">{heatmap.map(item=><div key={item.label}><div className="mb-1 flex justify-between text-sm"><strong>{item.label}</strong><span>{item.score}%</span></div><Progress value={item.score}/><p className="mt-1 text-xs leading-5 text-slate-500">{item.note}</p></div>)}</CardContent></Card></section>

<Card className={mock.due?"border-emerald-200 bg-emerald-50":"border-amber-200 bg-amber-50"}><CardHeader><div className="flex flex-wrap items-start justify-between gap-3"><div><CardDescription>Mock interview scheduler</CardDescription><CardTitle className="mt-1 flex items-center gap-2 font-serif text-2xl"><Target className="size-5"/>{mock.label}</CardTitle></div><Button asChild><Link href={mock.href}>{mock.due?"Start full mock":"Open targeted practice"}<ArrowRight/></Link></Button></div></CardHeader><CardContent><p className="text-sm leading-6">{mock.reason}</p></CardContent></Card></div></main>
}

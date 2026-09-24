"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { ArrowLeft, ArrowRight, FileDiff, TrendingDown, TrendingUp } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"

const ESSAY_KEY = "oxbridge-essay-tutor-v1"

type Dimension = { label: string; score: number; evidence?: string; improvement?: string }
type EssayRecord = { id?: string; test?: string; prompt?: string; essay?: string; overall?: number; date?: string; analysis?: { dimensions?: Dimension[]; priorityImprovements?: string[] } }

function dimensions(record?: EssayRecord) {
  return Array.isArray(record?.analysis?.dimensions) ? record!.analysis!.dimensions! : []
}

function wordSet(text: string) {
  return new Set(text.toLowerCase().replace(/[^a-z0-9\s]/g," ").split(/\s+/).filter(word => word.length > 3))
}

function overlap(a: string, b: string) {
  const left = wordSet(a), right = wordSet(b)
  if (!left.size || !right.size) return 0
  const common = [...left].filter(word => right.has(word)).length
  return Math.round(common / Math.max(left.size,right.size) * 100)
}

export default function EssayComparisonPage() {
  const [records, setRecords] = useState<EssayRecord[]>([])
  const [olderIndex, setOlderIndex] = useState(1)
  const [newerIndex, setNewerIndex] = useState(0)
  useEffect(() => { try { const raw = JSON.parse(localStorage.getItem(ESSAY_KEY) || "[]"); if (Array.isArray(raw)) setRecords(raw) } catch {} }, [])
  const older = records[olderIndex], newer = records[newerIndex]
  const rows = useMemo(() => {
    const labels = new Set([...dimensions(older).map(item=>item.label), ...dimensions(newer).map(item=>item.label)])
    return [...labels].map(label => {
      const before = dimensions(older).find(item=>item.label===label)?.score ?? 0
      const after = dimensions(newer).find(item=>item.label===label)?.score ?? 0
      return { label, before, after, delta: after-before }
    }).sort((a,b)=>b.delta-a.delta)
  },[older,newer])
  const meanDelta = rows.length ? Math.round(rows.reduce((sum,item)=>sum+item.delta,0)/rows.length) : 0
  const lexicalOverlap = overlap(older?.essay || "", newer?.essay || "")
  const reasoningChanged = rows.some(item => Math.abs(item.delta) >= 8)

  return <main className="min-h-screen bg-[#f4f7f7] text-[#172b3a]"><header className="border-b bg-white"><div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6"><Button asChild variant="ghost"><Link href="/essay-tutor"><ArrowLeft />Essay Tutor</Link></Button><Badge variant="outline"><FileDiff className="size-3.5" />Version Comparison</Badge></div></header><div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6"><section><p className="text-xs font-bold uppercase tracking-[.18em] text-[#147d91]">Draft → feedback → rewrite</p><h1 className="mt-2 font-serif text-4xl font-bold">See whether the reasoning actually improved.</h1><p className="mt-3 max-w-3xl leading-7 text-slate-600">Compare two saved essay analyses dimension by dimension. The goal is to distinguish meaningful argumentative improvement from wording changes that leave the underlying reasoning unchanged.</p></section>{records.length < 2 ? <Card><CardContent className="p-8 text-center"><p className="font-semibold">You need at least two analysed essays.</p><p className="mt-2 text-sm text-slate-500">Write and analyse a draft, revise it, then analyse the new version.</p><Button asChild className="mt-4"><Link href="/essay-tutor">Open Essay Tutor <ArrowRight /></Link></Button></CardContent></Card> : <><Card><CardContent className="grid gap-4 p-4 md:grid-cols-2"><label><span className="mb-1 block text-sm font-semibold">Earlier version</span><select className="h-10 w-full rounded-lg border bg-white px-3 text-sm" value={olderIndex} onChange={e=>setOlderIndex(Number(e.target.value))}>{records.map((item,index)=><option key={item.id ?? index} value={index}>{index+1}. {item.test ?? "Essay"} · {(item.prompt ?? "Prompt").slice(0,55)}</option>)}</select></label><label><span className="mb-1 block text-sm font-semibold">Later version</span><select className="h-10 w-full rounded-lg border bg-white px-3 text-sm" value={newerIndex} onChange={e=>setNewerIndex(Number(e.target.value))}>{records.map((item,index)=><option key={item.id ?? index} value={index}>{index+1}. {item.test ?? "Essay"} · {(item.prompt ?? "Prompt").slice(0,55)}</option>)}</select></label></CardContent></Card><section className="grid gap-4 md:grid-cols-3"><Card><CardHeader><CardDescription>Average dimension change</CardDescription><CardTitle className="flex items-center gap-2 font-serif text-3xl">{meanDelta>=0?<TrendingUp className="text-emerald-700"/>:<TrendingDown className="text-rose-700"/>}{meanDelta>=0?"+":""}{meanDelta}</CardTitle></CardHeader></Card><Card><CardHeader><CardDescription>Vocabulary/content overlap</CardDescription><CardTitle className="font-serif text-3xl">{lexicalOverlap}%</CardTitle></CardHeader><CardContent><p className="text-xs text-slate-500">High overlap is not bad: a strong rewrite can keep content while improving reasoning.</p></CardContent></Card><Card><CardHeader><CardDescription>Reasoning change detected</CardDescription><CardTitle className="font-serif text-3xl">{reasoningChanged?"Yes":"Limited"}</CardTitle></CardHeader><CardContent><p className="text-xs text-slate-500">Based on movement in analysis dimensions, not word-count alone.</p></CardContent></Card></section><Card><CardHeader><CardTitle className="font-serif text-2xl">Dimension-by-dimension change</CardTitle><CardDescription>Practice signals only; these are not official LNAT/TARA marks.</CardDescription></CardHeader><CardContent className="space-y-5">{rows.map(item=><div key={item.label}><div className="mb-1 flex flex-wrap items-center justify-between gap-2 text-sm"><strong>{item.label}</strong><span>{item.before}% → {item.after}% <Badge variant="outline" className={item.delta>0?"text-emerald-700":item.delta<0?"text-rose-700":""}>{item.delta>0?"+":""}{item.delta}</Badge></span></div><Progress value={item.after}/></div>)}</CardContent></Card><div className="grid gap-4 md:grid-cols-2"><Card><CardHeader><CardTitle className="font-serif text-xl">Earlier priorities</CardTitle></CardHeader><CardContent className="space-y-2">{(older?.analysis?.priorityImprovements ?? []).slice(0,5).map((item,index)=><p key={`${item}-${index}`} className="text-sm leading-6">• {item}</p>)}</CardContent></Card><Card><CardHeader><CardTitle className="font-serif text-xl">Latest priorities</CardTitle></CardHeader><CardContent className="space-y-2">{(newer?.analysis?.priorityImprovements ?? []).slice(0,5).map((item,index)=><p key={`${item}-${index}`} className="text-sm leading-6">• {item}</p>)}</CardContent></Card></div></>}</div></main>
}

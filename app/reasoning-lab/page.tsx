"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { ArrowLeft, ArrowRight, Brain, GitBranch, Network, RotateCcw, Target } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { buildArgumentMap, candidateTextFromSession, fingerprintFromSessions, interventionPlan, misconceptionNetwork, type SessionLike } from "@/lib/reasoning-analysis"

type ProgressState = { logs?:SessionLike[]; misconceptions?:Record<string,number>; mistakes?:Record<string,number> }

export default function ReasoningLabPage(){
  const [progress,setProgress]=useState<ProgressState>({})
  const [selected,setSelected]=useState(0)
  const [loaded,setLoaded]=useState(false)

  useEffect(()=>{try{const saved=localStorage.getItem("oxbridge-tutor-progress-v2");if(saved)setProgress(JSON.parse(saved))}catch{}setLoaded(true)},[])
  const logs=useMemo(()=>Array.isArray(progress.logs)?progress.logs:[], [progress.logs])
  const session=logs[selected]??logs[0]
  const text=useMemo(()=>session?candidateTextFromSession(session):"",[session])
  const map=useMemo(()=>buildArgumentMap(text),[text])
  const fingerprint=useMemo(()=>fingerprintFromSessions(logs),[logs])
  const network=useMemo(()=>misconceptionNetwork(progress.misconceptions??{},progress.mistakes??{}),[progress.misconceptions,progress.mistakes])

  return <main className="min-h-screen bg-[#f6f8f8] text-[#172b3a]">
    <header className="border-b bg-white"><div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6"><Button asChild variant="ghost"><Link href="/student-home"><ArrowLeft/>Student Home</Link></Button><Badge variant="outline"><Brain className="size-3.5"/>Reasoning Lab</Badge></div></header>
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <section className="mb-6"><p className="text-xs font-bold uppercase tracking-[.18em] text-[#147d91]">Interview rewind & reasoning fingerprint</p><h1 className="mt-2 font-serif text-4xl font-bold">See how you think, not just what you scored.</h1><p className="mt-2 max-w-3xl text-slate-600">The lab analyses your own saved practice transcripts to surface repeated reasoning habits, argument structure and recurring misconceptions.</p></section>

      {!loaded||!logs.length?<Card className="shadow-none"><CardHeader><CardTitle className="font-serif text-2xl">No interview history yet</CardTitle><CardDescription>Complete a formal, AI, live or panel interview first. Saved interview transcripts will appear here automatically.</CardDescription></CardHeader><CardContent><Button asChild><Link href="/interviews">Open Interview Hub <ArrowRight/></Link></Button></CardContent></Card>:<>
      <section className="grid gap-4 sm:grid-cols-3">{fingerprint.slice(0,3).map(item=><Card key={item.label} className="shadow-none"><CardHeader><CardDescription>{item.label}</CardDescription><CardTitle className="font-serif text-4xl">{item.score}%</CardTitle></CardHeader><CardContent><Progress value={item.score}/><p className="mt-3 text-xs leading-relaxed text-slate-500">{item.action}</p></CardContent></Card>)}</section>

      <section className="mt-5 grid gap-5 lg:grid-cols-[.75fr_1.25fr]"><Card className="shadow-none"><CardHeader><RotateCcw className="size-6 text-[#147d91]"/><CardTitle className="font-serif text-2xl">Interview rewind</CardTitle><CardDescription>Select a saved interview, then inspect the reasoning structure rather than only replaying the transcript.</CardDescription></CardHeader><CardContent className="space-y-2">{logs.slice(0,12).map((log,i)=><button key={log.id??i} onClick={()=>setSelected(i)} className={`w-full rounded-xl border p-3 text-left ${selected===i?"border-[#147d91] bg-[#edf7f8]":"bg-white"}`}><strong className="block text-sm">{log.title??`Interview ${i+1}`}</strong><small className="text-slate-500">{log.date??"Saved session"} · {log.score??"—"}/100</small></button>)}</CardContent></Card>

      <div className="space-y-4"><Card className="shadow-none"><CardHeader><GitBranch className="size-6 text-[#147d91]"/><CardTitle className="font-serif text-2xl">Argument map</CardTitle><CardDescription>{session?.title}</CardDescription></CardHeader><CardContent className="grid gap-3 sm:grid-cols-2">{([['Claims',map.claims],['Evidence / support',map.evidence],['Assumptions',map.assumptions],['Counterpoints',map.counterpoints],['Conclusions',map.conclusions]] as const).map(([label,items])=><div key={label} className="rounded-xl border p-3"><p className="mb-2 text-xs font-bold uppercase tracking-wider text-[#147d91]">{label}</p>{items.length?items.map((x,i)=><p key={i} className="mb-2 text-sm leading-relaxed last:mb-0">{x}</p>):<p className="text-sm text-slate-400">Not clearly visible in this response.</p>}</div>)}</CardContent></Card><Card className="shadow-none"><CardHeader><CardTitle className="font-serif text-xl">Candidate transcript</CardTitle></CardHeader><CardContent><p className="whitespace-pre-wrap text-sm leading-7 text-slate-600">{text||"No candidate text could be extracted from this session."}</p></CardContent></Card></div></section>

      <section className="mt-5 grid gap-4 lg:grid-cols-[1fr_1fr]"><Card className="shadow-none"><CardHeader><Brain className="size-6 text-[#147d91]"/><CardTitle className="font-serif text-2xl">Full reasoning fingerprint</CardTitle></CardHeader><CardContent className="space-y-4">{fingerprint.map(item=><div key={item.label}><div className="mb-1 flex items-center justify-between text-sm"><strong>{item.label}</strong><span>{item.score}%</span></div><Progress value={item.score}/><p className="mt-1 text-xs text-slate-500">{item.evidence}</p></div>)}</CardContent></Card><Card className="shadow-none"><CardHeader><Network className="size-6 text-[#147d91]"/><CardTitle className="font-serif text-2xl">Misconception network</CardTitle><CardDescription>Repeated test/interview errors are grouped into intervention targets.</CardDescription></CardHeader><CardContent className="space-y-3">{network.length?network.map(node=><details key={node.name} className="rounded-xl border bg-white p-3"><summary className="cursor-pointer"><span className="font-semibold">{node.name}</span><Badge variant="outline" className="ml-2">{node.count} occurrences</Badge></summary><div className="mt-3 space-y-2">{interventionPlan(node).map((step,i)=><div key={step} className="flex gap-2 text-sm"><span className="font-bold text-[#147d91]">{i+1}.</span><p>{step}</p></div>)}{node.related.length>0&&<p className="text-xs text-slate-500">Related: {node.related.join(" · ")}</p>}</div></details>):<p className="text-sm text-slate-500">No repeated misconception pattern yet. More practice data will make this section useful.</p>}</CardContent></Card></section>

      <div className="mt-5 flex flex-wrap gap-2"><Button asChild><Link href="/intervention-session">Run targeted intervention <Target/><ArrowRight/></Link></Button><Button asChild variant="outline"><Link href="/interview-room">Return to Interview Room</Link></Button></div></>}
    </div>
  </main>
}

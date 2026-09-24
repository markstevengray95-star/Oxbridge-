"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { Brain, BookOpen, BriefcaseBusiness, Clock3, FileText, FlaskConical, Gauge, Network, ShieldCheck, Sparkles, Target, Users } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { deriveTwin, fifteenMinutePlan, TWIN_KEY, type TwinSnapshot } from "@/lib/digital-twin-2"

const progressKey="oxbridge-tutor-progress-v2"
export default function DigitalTwinPage(){
 const [twin,setTwin]=useState<TwinSnapshot|null>(null)
 useEffect(()=>{try{const p=JSON.parse(localStorage.getItem(progressKey)||"{}") as Record<string,unknown>;const next=deriveTwin(p);setTwin(next);localStorage.setItem(TWIN_KEY,JSON.stringify(next))}catch{setTwin(deriveTwin({}))}},[])
 const plan=useMemo(()=>twin?fifteenMinutePlan(twin):null,[twin]),metrics=twin?Object.entries(twin).filter(([k])=>k!=="updatedAt") as [keyof TwinSnapshot,number][]:[]
 const tools=[
  ["Course-aware pressure interview","Change pressure, revisit old reasoning habits and adapt the interviewer style by subject.","/interview-pressure",Users],
  ["Socratic whiteboard","Draw, annotate and think aloud while the Tutor tracks assumptions, checking and self-correction.","/socratic-whiteboard",Sparkles],
  ["Personal statement defence","Turn every academic claim, book and activity in the statement into defendable interview evidence.","/personal-statement-defence",FileText],
  ["Academic knowledge graph","Connect sources → ideas → opposing ideas → course topics → interview questions.","/knowledge-graph",Network],
  ["Research project","Run a structured mini-project with a question, source log, argument and oral defence.","/research-project",FlaskConical],
  ["Evidence locker","Keep written work, reading, projects, certificates and reflections together.","/evidence-locker",BriefcaseBusiness],
  ["Academic source notebook","Capture argument, evidence, weakness, connections and your own view for every source.","/source-notebook",BookOpen],
  ["Offline pack","Save a low-bandwidth practice pack locally and export it for backup.","/offline-pack",ShieldCheck],
  ["Parent-safe summary","Share broad preparation progress without exposing private tutor conversations or reflections.","/parent-summary",Gauge],
 ] as const
 return <main className="min-h-screen bg-[#f3f6f6] px-4 py-8 text-[#172b3a]"><div className="mx-auto max-w-7xl space-y-6"><section className="rounded-[2rem] bg-[#102a43] p-7 text-white sm:p-10"><Badge className="bg-white/10 text-white">Digital Twin 2.0</Badge><h1 className="mt-4 max-w-4xl font-serif text-4xl font-bold sm:text-5xl">One model of how you learn, reason and defend your application.</h1><p className="mt-4 max-w-3xl text-sm leading-7 text-slate-200">Every interview, test, essay, reading task and reflection updates the same preparation model. It measures preparation evidence only; it does not predict admissions outcomes.</p><div className="mt-6 flex flex-wrap gap-2"><Button asChild className="bg-white text-[#102a43] hover:bg-slate-100"><Link href="/tutor-autopilot"><Brain/>Tutor me now</Link></Button><Button asChild variant="outline" className="border-white/30 bg-transparent text-white"><Link href="/preparation-readiness"><Target/>Readiness evidence</Link></Button></div></section>{plan&&<Card className="border-[#8dd7de] bg-[#f4fbfb]"><CardHeader><CardTitle className="flex items-center gap-2 font-serif text-2xl"><Clock3 className="size-5"/>Only 15 minutes?</CardTitle><CardDescription>{plan.title}</CardDescription></CardHeader><CardContent><div className="grid gap-2 sm:grid-cols-3">{plan.steps.map((s,i)=><div key={s} className="rounded-xl bg-white p-3 text-sm"><b>{i+1}.</b> {s}</div>)}</div><Button asChild className="mt-4"><Link href={plan.href}>Start 15-minute mode</Link></Button></CardContent></Card>}<section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">{metrics.map(([k,v])=><Card key={String(k)}><CardHeader><CardDescription className="capitalize">{String(k).replace(/([A-Z])/g," $1")}</CardDescription><CardTitle className="font-serif text-3xl">{v}%</CardTitle></CardHeader><CardContent><div className="h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-[#147d91]" style={{width:`${v}%`}}/></div></CardContent></Card>)}</section><section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{tools.map(([title,note,href,Icon])=><Card key={title}><CardHeader><Icon className="size-5 text-[#147d91]"/><CardTitle className="font-serif text-xl">{title}</CardTitle><CardDescription>{note}</CardDescription></CardHeader><CardContent><Button asChild variant="outline"><Link href={href}>Open</Link></Button></CardContent></Card>)}</section></div></main>
}

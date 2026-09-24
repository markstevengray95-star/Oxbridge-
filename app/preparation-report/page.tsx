"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { ArrowLeft, Download, FileText, Printer, TrendingUp } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { deriveTwin } from "@/lib/digital-twin-2"

const PROFILE_KEY="oxbridge-tutor-profile-v2"
const PROGRESS_KEY="oxbridge-tutor-progress-v2"

type Profile={course?:string;university?:string;year?:string;name?:string}
function read(key:string){try{return JSON.parse(localStorage.getItem(key)||"{}") as Record<string,unknown>}catch{return {}}}
function count(value:unknown){return Array.isArray(value)?value.length:0}

export default function PreparationReportPage(){
 const[profile,setProfile]=useState<Profile>({}),[progress,setProgress]=useState<Record<string,unknown>>({})
 useEffect(()=>{setProfile(read(PROFILE_KEY) as Profile);setProgress(read(PROGRESS_KEY))},[])
 const twin=useMemo(()=>deriveTwin(progress),[progress])
 const metrics=Object.entries(twin).filter(([k])=>k!=="updatedAt") as Array<[string,number]>
 const activity={interviews:count(progress.logs)+count(progress.interviewAttempts),papers:count(progress.fullPaperResults),essays:count(progress.essayAnalyses),transfer:count(progress.transferChecks),hints:count(progress.hintEvents)}
 const weakest=[...metrics].sort((a,b)=>a[1]-b[1]).slice(0,3)
 const strongest=[...metrics].sort((a,b)=>b[1]-a[1]).slice(0,3)
 function download(){const payload={generatedAt:new Date().toISOString(),profile,activity,metrics:Object.fromEntries(metrics),priorities:weakest.map(([k])=>k),strengths:strongest.map(([k])=>k)};const url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:"application/json"}));const a=document.createElement("a");a.href=url;a.download=`oxbridge-preparation-report-${new Date().toISOString().slice(0,10)}.json`;a.click();URL.revokeObjectURL(url)}
 return <main className="min-h-screen bg-[#f5f7f7] text-[#172b3a]"><header className="border-b bg-white print:hidden"><div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4"><Button asChild variant="ghost"><Link href="/preparation-readiness"><ArrowLeft/>Readiness</Link></Button><div className="flex gap-2"><Button variant="outline" onClick={download}><Download/>Data</Button><Button onClick={()=>window.print()}><Printer/>Print / Save PDF</Button></div></div></header><div className="mx-auto max-w-6xl space-y-6 px-4 py-8 print:max-w-none print:p-0"><section className="rounded-3xl bg-[#102a43] p-7 text-white print:rounded-none"><Badge className="bg-white/10 text-white"><FileText className="size-3.5"/>Pro preparation report</Badge><h1 className="mt-3 font-serif text-4xl font-bold">Oxbridge Preparation Report</h1><p className="mt-3 text-sm text-white/70">Generated {new Date().toLocaleDateString("en-GB")} · {profile.course||"Course not set"} · {profile.university||"University not set"} {profile.year?`· ${profile.year} entry`:""}</p><p className="mt-3 max-w-3xl text-xs leading-5 text-white/60">This report summarises preparation evidence and trends. It does not predict admissions outcomes or replace official admissions information.</p></section><section className="grid gap-4 md:grid-cols-5">{Object.entries(activity).map(([k,v])=><Card key={k}><CardHeader><CardDescription className="capitalize">{k}</CardDescription><CardTitle className="font-serif text-3xl">{v}</CardTitle></CardHeader></Card>)}</section><section className="grid gap-5 lg:grid-cols-[1.2fr_.8fr]"><Card><CardHeader><TrendingUp className="size-5 text-[#147d91]"/><CardTitle className="font-serif text-2xl">Preparation profile</CardTitle><CardDescription>Long-term evidence from interviews, tests, essays and transfer checks.</CardDescription></CardHeader><CardContent className="grid gap-4 sm:grid-cols-2">{metrics.map(([k,v])=><div key={k}><div className="mb-1 flex justify-between text-sm"><span className="capitalize">{k.replace(/([A-Z])/g," $1")}</span><strong>{v}%</strong></div><Progress value={v}/></div>)}</CardContent></Card><div className="space-y-5"><Card><CardHeader><CardTitle className="font-serif text-xl">Strongest current evidence</CardTitle></CardHeader><CardContent className="space-y-2">{strongest.map(([k,v])=><div key={k} className="rounded-xl bg-emerald-50 p-3 text-sm"><strong className="capitalize">{k.replace(/([A-Z])/g," $1")}</strong><span className="float-right">{v}%</span></div>)}</CardContent></Card><Card><CardHeader><CardTitle className="font-serif text-xl">Next priorities</CardTitle></CardHeader><CardContent className="space-y-2">{weakest.map(([k,v])=><div key={k} className="rounded-xl bg-amber-50 p-3 text-sm"><strong className="capitalize">{k.replace(/([A-Z])/g," $1")}</strong><span className="float-right">{v}%</span></div>)}</CardContent></Card></div></section><Card><CardHeader><CardTitle className="font-serif text-2xl">Recommended next cycle</CardTitle></CardHeader><CardContent className="grid gap-3 md:grid-cols-4">{["Repair the weakest evidenced skill","Complete one timed test section","Run one live interview under changed conditions","Retest the same reasoning after a delay"].map((x,i)=><div key={x} className="rounded-xl bg-[#edf7f8] p-4 text-sm"><b>{i+1}.</b> {x}</div>)}</CardContent></Card></div></main>
}

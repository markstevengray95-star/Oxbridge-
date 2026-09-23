"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { ArrowLeft, ArrowRight, CalendarDays, CheckCircle2, LockKeyhole, RefreshCw, Trophy } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import { promptsForCourse } from "@/lib/course-interview-bank"

type Session = { id:string; prompt:string; answer:string; created:string }
const KEY="oxbridge-mock-week-v1"

function score(text:string){
  const clean=text.toLowerCase(), words=clean.trim()?clean.trim().split(/\s+/).length:0
  const reasoning=["because","therefore","if","then","since","implies"].filter(x=>clean.includes(x)).length
  const flexibility=["however","alternative","assumption","counter","depends","unless"].filter(x=>clean.includes(x)).length
  return { reasoning:Math.min(25,7+reasoning*4+(words>60?4:0)), flexibility:Math.min(25,6+flexibility*4), clarity:Math.min(25,words>=50&&words<=300?22:words>=25?16:8), depth:Math.min(25,7+Math.floor(words/18)) }
}

export default function MockWeekPage(){
  const [course,setCourse]=useState("Physics")
  const [sessions,setSessions]=useState<Session[]>([])
  const [answer,setAnswer]=useState("")
  const [revealed,setRevealed]=useState(false)
  const [loaded,setLoaded]=useState(false)

  useEffect(()=>{try{const p=JSON.parse(localStorage.getItem("oxbridge-tutor-profile-v2")||"{}");if(p.course)setCourse(p.course);const s=localStorage.getItem(KEY);if(s){const parsed=JSON.parse(s);setSessions(parsed.sessions||[]);setRevealed(Boolean(parsed.revealed))}}catch{}setLoaded(true)},[])
  useEffect(()=>{if(loaded)localStorage.setItem(KEY,JSON.stringify({sessions,revealed,course}))},[sessions,revealed,course,loaded])

  const bank=useMemo(()=>promptsForCourse(course),[course])
  const current=bank[sessions.length%Math.max(bank.length,1)]
  const complete=sessions.length>=5
  const results=useMemo(()=>sessions.map(s=>score(s.answer)),[sessions])
  const averages=useMemo(()=>results.length?{
    reasoning:Math.round(results.reduce((a,b)=>a+b.reasoning,0)/results.length),
    flexibility:Math.round(results.reduce((a,b)=>a+b.flexibility,0)/results.length),
    clarity:Math.round(results.reduce((a,b)=>a+b.clarity,0)/results.length),
    depth:Math.round(results.reduce((a,b)=>a+b.depth,0)/results.length),
  }:null,[results])

  const submit=()=>{
    if(!answer.trim()||complete)return
    setSessions(items=>[...items,{id:`mock-${Date.now()}`,prompt:current.prompt,answer:answer.trim(),created:new Date().toISOString()}])
    setAnswer("")
  }
  const reset=()=>{setSessions([]);setRevealed(false);setAnswer("")}

  return <main className="min-h-screen bg-[#f6f8f8] text-[#172b3a]">
    <header className="border-b bg-white"><div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6"><Button asChild variant="ghost"><Link href="/student-home"><ArrowLeft/>Student Home</Link></Button><Badge variant="outline"><CalendarDays className="size-3.5"/>Mock Week</Badge></div></header>
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <section className="mb-6"><p className="text-xs font-bold uppercase tracking-[.18em] text-[#147d91]">No-feedback training block</p><h1 className="mt-2 font-serif text-4xl font-bold">Five sessions before you see the score.</h1><p className="mt-2 max-w-3xl text-slate-600">This mode reduces the temptation to perform for the scoring system. Complete five sustained responses, then review the combined pattern once.</p></section>

      <section className="mb-5 grid gap-4 sm:grid-cols-3"><Card className="shadow-none"><CardHeader><CardDescription>Sessions complete</CardDescription><CardTitle className="font-serif text-4xl">{Math.min(sessions.length,5)}/5</CardTitle></CardHeader><CardContent><Progress value={Math.min(100,sessions.length/5*100)}/></CardContent></Card><Card className="shadow-none"><CardHeader><CardDescription>Feedback status</CardDescription><CardTitle className="font-serif text-xl">{revealed?"Released":complete?"Ready to release":"Locked"}</CardTitle></CardHeader><CardContent><p className="text-sm text-slate-500">No per-session scores are shown before the block is complete.</p></CardContent></Card><Card className="shadow-none"><CardHeader><CardDescription>Course</CardDescription><CardTitle className="font-serif text-xl">{course}</CardTitle></CardHeader><CardContent><p className="text-sm text-slate-500">Uses the deep course-specific interview bank.</p></CardContent></Card></section>

      {!complete&&current&&<Card className="border-[#147d91]/20 shadow-none"><CardHeader><div className="flex gap-2"><Badge>Session {sessions.length+1}</Badge><Badge variant="outline">{current.theme}</Badge></div><CardTitle className="font-serif text-3xl leading-snug">{current.prompt}</CardTitle><CardDescription>Answer as if the interviewer will not tell you whether you are right. Expose reasoning, test an assumption and reach a provisional conclusion.</CardDescription></CardHeader><CardContent className="space-y-4"><Textarea rows={12} value={answer} onChange={e=>setAnswer(e.target.value)} placeholder="Think aloud in writing…"/><div className="flex items-center justify-between gap-3"><span className="text-xs text-slate-500">{answer.trim()?answer.trim().split(/\s+/).length:0} words</span><Button onClick={submit} disabled={!answer.trim()}>Submit without feedback <LockKeyhole/></Button></div></CardContent></Card>}

      {complete&&!revealed&&<Card className="border-0 bg-[#102a43] text-white shadow-none"><CardHeader><Trophy className="size-7 text-[#68c6d0]"/><CardTitle className="font-serif text-3xl">Mock Week complete.</CardTitle><CardDescription className="text-blue-50/70">You now have enough independent responses for a combined review. Reveal it once, then use the next week to target the repeated pattern rather than individual question scores.</CardDescription></CardHeader><CardContent><Button onClick={()=>setRevealed(true)} className="bg-white text-[#102a43] hover:bg-blue-50">Reveal combined review <ArrowRight/></Button></CardContent></Card>}

      {revealed&&averages&&<section className="space-y-4"><Card className="border-0 bg-[#102a43] text-white shadow-none"><CardHeader><Badge className="w-fit border-white/15 bg-white/10 text-white">COMBINED REVIEW</Badge><CardTitle className="font-serif text-3xl">Five-session reasoning profile</CardTitle><CardDescription className="text-blue-50/70">These are practice signals, not admissions predictions.</CardDescription></CardHeader><CardContent className="grid gap-3 sm:grid-cols-4">{Object.entries(averages).map(([label,value])=><div key={label} className="rounded-xl bg-white/8 p-4"><span className="text-xs uppercase tracking-wider text-blue-100/60">{label}</span><strong className="mt-1 block text-3xl">{value}/25</strong></div>)}</CardContent></Card><Card className="shadow-none"><CardHeader><CardTitle className="font-serif text-2xl">Pattern across the week</CardTitle></CardHeader><CardContent className="space-y-2">{averages.reasoning<18&&<p>• Make each inferential step explicit instead of jumping from observation to conclusion.</p>}{averages.flexibility<17&&<p>• You need more deliberate assumption testing and counterexamples across different questions.</p>}{averages.clarity<18&&<p>• Structure responses into shorter claim → reason → test → conclusion units.</p>}{averages.depth<18&&<p>• Sustain the reasoning for longer before closing the answer.</p>}{averages.reasoning>=18&&averages.flexibility>=17&&averages.clarity>=18&&<p>• The overall structure is strong. The next block should increase conceptual difficulty and reduce scaffolding.</p>}</CardContent></Card><Card className="shadow-none"><CardHeader><CardTitle className="font-serif text-xl">Session archive</CardTitle></CardHeader><CardContent className="space-y-3">{sessions.map((s,i)=><details key={s.id} className="rounded-xl border bg-white p-3"><summary className="cursor-pointer font-semibold">Session {i+1}: {s.prompt.slice(0,90)}{s.prompt.length>90?"…":""}</summary><p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-600">{s.answer}</p></details>)}</CardContent></Card></section>}

      <div className="mt-5 flex flex-wrap gap-2"><Button variant="outline" onClick={reset}><RefreshCw/>Start a new Mock Week</Button><Button asChild variant="outline"><Link href="/interview-room">Return to live interview practice <ArrowRight/></Link></Button></div>
      {!complete&&<Alert className="mt-5"><LockKeyhole/><AlertTitle>Feedback intentionally withheld</AlertTitle><AlertDescription>Your responses are saved locally. The app will not show the combined profile until all five are complete.</AlertDescription></Alert>}
    </div>
  </main>
}

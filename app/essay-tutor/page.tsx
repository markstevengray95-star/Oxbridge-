"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { ArrowLeft, ArrowRight, FileText, RefreshCw, Target } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import { lnatEssayPrompts, taraEssayPrompts } from "@/lib/question-bank"

type Test="LNAT"|"TARA"

type Diagnostic={label:string;score:number;note:string;next:string}

function analyse(text:string):Diagnostic[]{
  const clean=text.trim(), lower=clean.toLowerCase(), words=clean?clean.split(/\s+/).length:0
  const paras=clean.split(/\n\s*\n/).filter(Boolean)
  const thesis=/\b(i argue|this essay argues|overall|should|should not|the strongest|on balance|my view)\b/i.test(clean)
  const reasons=(lower.match(/\b(because|therefore|since|so that|this means|consequently)\b/g)||[]).length
  const counter=(lower.match(/\b(however|although|on the other hand|counterargument|objection|critics|one might argue|nevertheless)\b/g)||[]).length
  const qualification=(lower.match(/\b(depends|unless|insofar|provided|whereas|to the extent|in some cases|not necessarily)\b/g)||[]).length
  const examples=(lower.match(/\b(for example|for instance|consider|suppose|case)\b/g)||[]).length
  return [
    {label:"Thesis",score:thesis?90:Math.min(65,words/3),note:thesis?"A position is visible in the response.":"The central position is not yet easy to identify.",next:"State a precise answer to the prompt in one or two sentences before developing reasons."},
    {label:"Reasoning",score:Math.min(100,25+reasons*12),note:`${reasons} explicit reasoning link${reasons===1?"":"s"} detected.`,next:"Make the inferential step explicit: why does this reason support the conclusion?"},
    {label:"Counterargument",score:Math.min(100,20+counter*20),note:`${counter} counterargument signal${counter===1?"":"s"} detected.`,next:"Present the strongest objection fairly, then explain exactly why it changes—or does not change—your thesis."},
    {label:"Qualification",score:Math.min(100,20+qualification*18),note:`${qualification} qualification signal${qualification===1?"":"s"} detected.`,next:"Identify the condition under which your argument would be weaker, stronger or no longer apply."},
    {label:"Examples",score:Math.min(100,20+examples*18),note:`${examples} example/case signal${examples===1?"":"s"} detected.`,next:"Use examples as tests of a principle, not substitutes for the principle."},
    {label:"Structure",score:Math.min(100,30+paras.length*12+(words>350?10:0)),note:`${paras.length} paragraph${paras.length===1?"":"s"} · ${words} words.`,next:"Give each paragraph one argumentative job and make the transition explain why the next step is needed."},
  ]
}

export default function EssayTutorPage(){
  const [test,setTest]=useState<Test>("LNAT")
  const [seed,setSeed]=useState(1)
  const [essay,setEssay]=useState("")
  const [reviewed,setReviewed]=useState(false)
  const pool=test==="LNAT"?lnatEssayPrompts:taraEssayPrompts
  const prompt=pool[seed%pool.length]
  const diagnostics=useMemo(()=>analyse(essay),[essay])
  const overall=essay.trim()?Math.round(diagnostics.reduce((a,b)=>a+b.score,0)/diagnostics.length):0
  const weakest=diagnostics.slice().sort((a,b)=>a.score-b.score)[0]

  const nextPrompt=()=>{setSeed(s=>s+1);setEssay("");setReviewed(false)}
  const save=()=>{try{const key="oxbridge-essay-tutor-v1";const prev=JSON.parse(localStorage.getItem(key)||"[]");localStorage.setItem(key,JSON.stringify([{test,prompt,essay,overall,weakest:weakest?.label,date:new Date().toISOString()},...prev].slice(0,30)))}catch{}}

  return <main className="min-h-screen bg-[#f6f8f8] text-[#172b3a]">
    <header className="border-b bg-white"><div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6"><Button asChild variant="ghost"><Link href="/student-home"><ArrowLeft/>Student Home</Link></Button><Badge variant="outline"><FileText className="size-3.5"/>Essay Tutor</Badge></div></header>
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <section className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-end"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#147d91]">LNAT / TARA argument writing</p><h1 className="mt-2 font-serif text-4xl font-bold">Improve the argument, not the polish.</h1><p className="mt-2 max-w-3xl text-slate-600">The tutor checks visible argumentative features—thesis, reasons, counterargument, qualification, examples and paragraph function. It does not pretend to reproduce an official examiner score.</p></div><div className="flex gap-2">{(["LNAT","TARA"] as Test[]).map(x=><Button key={x} variant={test===x?"default":"outline"} onClick={()=>{setTest(x);setEssay("");setReviewed(false)}}>{x}</Button>)}</div></section>

      <section className="grid gap-5 lg:grid-cols-[1.2fr_.8fr]"><Card className="shadow-none"><CardHeader><div className="flex flex-wrap gap-2"><Badge>{test}</Badge><Badge variant="outline">Practice prompt</Badge></div><CardTitle className="font-serif text-2xl leading-snug">{prompt}</CardTitle><CardDescription>Plan briefly, state a defensible position, develop reasons, answer the strongest objection and conclude without simply repeating the introduction.</CardDescription></CardHeader><CardContent className="space-y-4"><Textarea rows={20} value={essay} onChange={e=>{setEssay(e.target.value);setReviewed(false)}} placeholder="Write your response here…"/><div className="flex flex-wrap items-center justify-between gap-3"><span className="text-sm text-slate-500">{essay.trim()?essay.trim().split(/\s+/).length:0}{test==="TARA"?" / 750":""} words</span><div className="flex gap-2"><Button variant="outline" onClick={nextPrompt}><RefreshCw/>New prompt</Button><Button onClick={()=>{setReviewed(true);save()}} disabled={!essay.trim()}>Review argument <Target/></Button></div></div></CardContent></Card>

      <aside className="space-y-4">{reviewed?<><Card className="border-0 bg-[#102a43] text-white shadow-none"><CardHeader><CardDescription className="text-blue-50/70">Practice argument signal</CardDescription><CardTitle className="font-serif text-5xl">{overall}<span className="text-xl text-blue-100/60">/100</span></CardTitle><CardDescription className="text-blue-50/70">Not an official LNAT/TARA score.</CardDescription></CardHeader></Card><Card className="shadow-none"><CardHeader><CardTitle className="font-serif text-xl">Argument diagnostics</CardTitle></CardHeader><CardContent className="space-y-4">{diagnostics.map(d=><div key={d.label}><div className="mb-1 flex justify-between text-sm"><strong>{d.label}</strong><span>{d.score}%</span></div><Progress value={d.score}/><p className="mt-1 text-xs text-slate-500">{d.note}</p></div>)}</CardContent></Card><Card className="border-amber-200 bg-amber-50 shadow-none"><CardHeader><CardDescription>Next targeted exercise</CardDescription><CardTitle className="font-serif text-xl">{weakest.label}</CardTitle></CardHeader><CardContent><p className="text-sm leading-relaxed">{weakest.next}</p></CardContent></Card></>:<Card className="shadow-none"><CardHeader><CardTitle className="font-serif text-xl">What the review will check</CardTitle></CardHeader><CardContent className="space-y-2 text-sm text-slate-600"><p>• Is the thesis clear enough to disagree with?</p><p>• Does each reason actually support that thesis?</p><p>• Is the strongest counterargument treated fairly?</p><p>• Are qualifications precise rather than evasive?</p><p>• Do examples test principles?</p><p>• Does each paragraph have one argumentative job?</p></CardContent></Card>}</aside></section>
      <div className="mt-5"><Button asChild variant="outline"><Link href="/advanced-practice">Return to admissions-test practice <ArrowRight/></Link></Button></div>
    </div>
  </main>
}

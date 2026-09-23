"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { ArrowLeft, ArrowRight, Brain, CheckCircle2, GraduationCap, Target } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import { interventionPlan, misconceptionNetwork } from "@/lib/reasoning-analysis"

type P={misconceptions?:Record<string,number>;mistakes?:Record<string,number>}

const prompts:Record<string,string[]>={
  assumption:["State one conclusion you recently reached. What hidden condition must be true for it to follow?","Remove that condition. Which part of the argument survives?","Repair the argument using a weaker, explicit assumption."],
  logic:["Write a conclusion you want to establish.","List the minimum intermediate statements needed to reach it.","For each arrow, write why the next statement follows rather than merely comes next."],
  knowledge:["Name the core concept involved in the weakness.","Explain it without using the memorised definition.","Apply it to an unfamiliar example and state what evidence would show your application was wrong."],
  reading:["Rewrite the task in your own words.","List every constraint in the question.","State exactly what would count as a complete answer before solving it."],
  calculation:["Estimate the order of magnitude before calculating.","Write the equation and units before substituting values.","Check the result against units, sign and expected scale."],
  timing:["State the time budget you would allow for this question.","Define the sign that tells you to move on rather than persist.","Describe what you would flag so you can restart quickly later."],
  communication:["Give the claim in one sentence.","Give one reason and one test/counterexample.","Finish with a provisional conclusion in under 90 seconds."],
}

function family(name:string){return /assum/i.test(name)?"assumption":/logic|reason/i.test(name)?"logic":/knowledge|subject/i.test(name)?"knowledge":/misread|question/i.test(name)?"reading":/calcul|number/i.test(name)?"calculation":/time/i.test(name)?"timing":"communication"}

export default function InterventionSessionPage(){
  const [progress,setProgress]=useState<P>({})
  const [target,setTarget]=useState("")
  const [answers,setAnswers]=useState<Record<number,string>>({})
  const [step,setStep]=useState(0)
  const [saved,setSaved]=useState(false)

  useEffect(()=>{try{const p=JSON.parse(localStorage.getItem("oxbridge-tutor-progress-v2")||"{}");setProgress(p)}catch{}},[])
  const network=useMemo(()=>misconceptionNetwork(progress.misconceptions??{},progress.mistakes??{}),[progress])
  useEffect(()=>{if(!target&&network[0])setTarget(network[0].name)},[network,target])
  const node=network.find(x=>x.name===target)??network[0]
  const plan=node?interventionPlan(node):[]
  const drill=node?prompts[family(node.name)]??prompts.communication:prompts.communication
  const total=plan.length
  const complete=step>=total

  const save=()=>{
    if(!node)return
    try{
      const p=JSON.parse(localStorage.getItem("oxbridge-tutor-progress-v2")||"{}")
      const completed=Array.isArray(p.completed)?p.completed:[]
      p.completed=[...new Set([...completed,`intervention-${node.name}-${new Date().toISOString().slice(0,10)}`])]
      const activities=Array.isArray(p.activities)?p.activities:[]
      p.activities=[{title:`Intervention: ${node.name}`,type:"Targeted intervention",learned:answers[2]||answers[1]||"Completed targeted reasoning intervention",question:"Retest this weakness in a fresh interview or admissions-test question."},...activities].slice(0,100)
      localStorage.setItem("oxbridge-tutor-progress-v2",JSON.stringify(p));setSaved(true)
    }catch{}
  }

  return <main className="min-h-screen bg-[#f6f8f8] text-[#172b3a]">
    <header className="border-b bg-white"><div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6"><Button asChild variant="ghost"><Link href="/reasoning-lab"><ArrowLeft/>Reasoning Lab</Link></Button><Badge variant="outline"><Target className="size-3.5"/>Targeted intervention</Badge></div></header>
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <section className="mb-6"><p className="text-xs font-bold uppercase tracking-[.18em] text-[#147d91]">Automatic intervention session</p><h1 className="mt-2 font-serif text-4xl font-bold">Close one reasoning weakness properly.</h1><p className="mt-2 max-w-3xl text-slate-600">The goal is not to reread feedback. It is to diagnose the error, rebuild the method, transfer it to a fresh context and then retest it later.</p></section>

      {!node?<Card className="shadow-none"><CardHeader><CardTitle className="font-serif text-2xl">No repeated weakness detected yet</CardTitle><CardDescription>Complete more interview and admissions-test practice first.</CardDescription></CardHeader><CardContent><Button asChild><Link href="/interviews">Open Interview Hub</Link></Button></CardContent></Card>:<>
      <Card className="mb-5 shadow-none"><CardHeader><div className="flex flex-wrap items-center justify-between gap-3"><div><Badge>Current target</Badge><CardTitle className="mt-2 font-serif text-2xl">{node.name}</CardTitle><CardDescription>{node.count} recorded occurrence{node.count===1?"":"s"}</CardDescription></div><select className="rounded-xl border bg-white px-3 py-2 text-sm" value={node.name} onChange={e=>{setTarget(e.target.value);setStep(0);setAnswers({});setSaved(false)}}>{network.map(n=><option key={n.name}>{n.name}</option>)}</select></div></CardHeader><CardContent><Progress value={Math.min(100,step/Math.max(1,total)*100)}/></CardContent></Card>

      {!complete?<Card className="shadow-none"><CardHeader><div className="flex items-center gap-2"><span className="grid size-9 place-items-center rounded-full bg-[#102a43] font-bold text-white">{step+1}</span><div><p className="text-xs font-bold uppercase tracking-wider text-[#147d91]">{["Diagnose","Rebuild","Transfer","Interview check","Close the loop"][step]}</p><CardTitle className="font-serif text-2xl">{plan[step]}</CardTitle></div></div></CardHeader><CardContent className="space-y-4">{step<3&&<><div className="rounded-xl bg-[#edf7f8] p-4"><p className="text-xs font-bold uppercase tracking-wider text-[#147d91]">Guided drill</p><p className="mt-1 font-serif text-lg">{drill[Math.min(step,drill.length-1)]}</p></div><Textarea rows={8} value={answers[step]??""} onChange={e=>setAnswers(a=>({...a,[step]:e.target.value}))} placeholder="Work through the reasoning explicitly…"/></>}{step===3&&<div className="space-y-3"><p className="text-slate-600">Open a fresh formal interview and deliberately apply the rebuilt method. Return here afterwards to mark the interview check complete.</p><Button asChild variant="outline"><Link href="/interview-room">Open fresh interview <ArrowRight/></Link></Button></div>}{step===4&&<div className="rounded-xl border border-amber-200 bg-amber-50 p-4"><p className="font-serif text-lg">Schedule the same underlying skill for spaced review rather than repeating the identical question immediately. The next occurrence should be a different-looking problem that depends on the same reasoning.</p></div>}<div className="flex justify-end"><Button onClick={()=>setStep(s=>s+1)} disabled={step<3&&!String(answers[step]??"").trim()}>Complete step <ArrowRight/></Button></div></CardContent></Card>:<Card className="border-0 bg-[#102a43] text-white shadow-none"><CardHeader><CheckCircle2 className="size-7 text-[#68c6d0]"/><CardTitle className="font-serif text-3xl">Intervention cycle complete.</CardTitle><CardDescription className="text-blue-50/70">Save it to your preparation history, then retest the same skill through a different problem rather than memorising the original answer.</CardDescription></CardHeader><CardContent className="flex flex-wrap gap-2"><Button onClick={save} className="bg-white text-[#102a43] hover:bg-blue-50">{saved?<CheckCircle2/>:<GraduationCap/>}{saved?"Saved":"Save intervention"}</Button><Button asChild variant="outline" className="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white"><Link href="/advanced-practice">Retest with fresh practice</Link></Button></CardContent></Card>}
      </>}
    </div>
  </main>
}

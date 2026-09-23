"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { ArrowLeft, ArrowRight, BookOpen, CheckCircle2, Clock3, GraduationCap, MessageSquareText, School } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { promptsForCourse } from "@/lib/course-interview-bank"
import { assessmentFor } from "@/lib/cambridge-assessments"

const stages = [
  { id:"briefing", label:"College briefing", minutes:5, description:"Check the invitation details, interview format and any College-specific instructions." },
  { id:"pre-read", label:"Pre-reading / preparation", minutes:10, description:"Some candidates may be given material or a task shortly before an interview. Practise extracting claims, patterns and questions without over-preparing a speech." },
  { id:"interview-1", label:"Academic interview 1", minutes:25, description:"A subject-focused discussion with unfamiliar material and follow-up questions." },
  { id:"reset", label:"Reset", minutes:5, description:"Clear the previous problem and avoid rehearsing how you think it went." },
  { id:"interview-2", label:"Academic interview 2", minutes:25, description:"A second academic discussion with a different problem or interviewer emphasis." },
  { id:"assessment", label:"College assessment check", minutes:3, description:"Confirm whether your course/College has a separate College-arranged assessment and follow the official instructions if shortlisted." },
  { id:"review", label:"Combined reflection", minutes:8, description:"Review how you adapted to challenge across the whole simulation rather than scoring isolated answers." },
]

export default function CambridgeInterviewDayPage(){
  const [course,setCourse]=useState("Natural Sciences")
  const [college,setCollege]=useState("Clare")
  const [stage,setStage]=useState(0)
  const [answers,setAnswers]=useState<Record<number,string>>({})
  const [notes,setNotes]=useState("")
  const [saved,setSaved]=useState(false)

  useEffect(()=>{try{const p=JSON.parse(localStorage.getItem("oxbridge-tutor-profile-v2")||"{}");if(p.course)setCourse(p.course);const c=localStorage.getItem("oxbridge-cambridge-college-v1");if(c)setCollege(c)}catch{}},[])
  const prompts=useMemo(()=>promptsForCourse(course),[course])
  const currentStage=stages[stage]
  const prompt=prompts[(stage===4?1:0)%Math.max(prompts.length,1)]
  const assessment=assessmentFor(course)
  const isInterview=currentStage.id==="interview-1"||currentStage.id==="interview-2"
  const preRead=`A tutor gives you the following proposition to consider before discussion: “A model becomes more useful when it deliberately ignores some features of the real system.” Identify what would make this claim defensible, what could make it misleading, and one example from ${course}.`

  const next=()=>setStage(s=>Math.min(stages.length-1,s+1))
  const save=()=>{try{const prev=JSON.parse(localStorage.getItem("oxbridge-cambridge-interview-days-v1")||"[]");localStorage.setItem("oxbridge-cambridge-interview-days-v1",JSON.stringify([{course,college,answers,notes,date:new Date().toISOString()},...prev].slice(0,20)));setSaved(true)}catch{}}

  return <main className="min-h-screen bg-[#f6f8f8] text-[#172b3a]">
    <header className="border-b bg-white"><div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6"><Button asChild variant="ghost"><Link href="/interviews"><ArrowLeft/>Interview Hub</Link></Button><Badge variant="outline"><School className="size-3.5"/>Cambridge Interview Day</Badge></div></header>
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <section className="mb-6"><p className="text-xs font-bold uppercase tracking-[.18em] text-[#147d91]">Cambridge-specific simulation</p><h1 className="mt-2 font-serif text-4xl font-bold">Practise the College interview process as its own experience.</h1><p className="mt-2 max-w-3xl text-slate-600">For 2027 entry, Cambridge says most applicants have one or two interviews, usually totalling about 35 minutes to one hour, with exact online/in-person arrangements set by the College. This simulation practises that structure without pretending every College runs an identical day.</p></section>

      <Card className="mb-5 shadow-none"><CardContent className="grid gap-2 p-4 md:grid-cols-7">{stages.map((s,i)=><button key={s.id} onClick={()=>setStage(i)} className={`rounded-xl border p-3 text-left ${i===stage?"border-[#147d91] bg-[#edf7f8]":i<stage?"border-emerald-200 bg-emerald-50":"bg-white"}`}><span className="text-xs font-bold uppercase tracking-wider text-slate-400">{i+1}</span><strong className="mt-1 block text-sm">{s.label}</strong><small className="text-slate-500">{s.minutes} min</small></button>)}</CardContent></Card>

      <section className="grid gap-5 lg:grid-cols-[1.2fr_.8fr]"><Card className="shadow-none"><CardHeader><div className="flex flex-wrap gap-2"><Badge>{currentStage.label}</Badge><Badge variant="outline"><Clock3 className="size-3"/>{currentStage.minutes} min guide</Badge></div><CardTitle className="font-serif text-3xl">{currentStage.description}</CardTitle></CardHeader><CardContent className="space-y-4">
        {currentStage.id==="briefing"&&<div className="space-y-3"><p className="text-sm text-slate-600">Before starting, confirm the College, whether the interview is online or in person, the number of interviews shown on the invitation and whether any pre-reading/assessment instructions are included.</p><div className="grid gap-2 sm:grid-cols-2"><div className="rounded-xl bg-[#edf7f8] p-4"><strong>Saved College</strong><p className="mt-1 text-sm">{college}</p></div><div className="rounded-xl bg-[#edf7f8] p-4"><strong>Course</strong><p className="mt-1 text-sm">{course}</p></div></div></div>}
        {currentStage.id==="pre-read"&&<><div className="rounded-2xl bg-[#edf7f8] p-5 font-serif text-lg leading-8">{preRead}</div><Textarea rows={8} value={answers[1]??""} onChange={e=>setAnswers(a=>({...a,1:e.target.value}))} placeholder="Annotate the claim, assumptions, examples and questions you would take into the interview…"/></>}
        {isInterview&&prompt&&<><div className="rounded-xl border-l-4 border-[#68c6d0] bg-white p-5"><p className="text-xs font-bold uppercase tracking-wider text-[#147d91]">Interviewer problem</p><p className="mt-2 font-serif text-2xl leading-relaxed">{prompt.prompt}</p></div><Textarea rows={12} value={answers[stage]??""} onChange={e=>setAnswers(a=>({...a,[stage]:e.target.value}))} placeholder="Think aloud: define the task, expose assumptions, test a case and revise if needed…"/><div className="rounded-xl bg-slate-50 p-4"><p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">Follow-up sequence for a peer/tutor</p>{prompt.followUps.map((q,i)=><p key={q} className="mb-2 text-sm last:mb-0"><strong>{i+1}.</strong> {q}</p>)}<p className="mt-3 border-t pt-3 text-sm"><strong>Changed condition:</strong> {prompt.mutation}</p></div></>}
        {currentStage.id==="reset"&&<div className="rounded-xl bg-[#edf7f8] p-5"><p className="font-serif text-xl">Do not grade Interview 1. Write one sentence describing the reasoning habit you want to carry into the next interview, then move on.</p><Textarea className="mt-3" rows={3} value={answers[3]??""} onChange={e=>setAnswers(a=>({...a,3:e.target.value}))}/></div>}
        {currentStage.id==="assessment"&&<div className="space-y-3"><p className="text-sm text-slate-600">{assessment?`Your course appears in the current Cambridge College-assessment table. The exact requirement can depend on College; use the dedicated assessment centre to check ${college}.`:"This course is not currently mapped to a College-assessment entry in the local table, but you should still follow any instructions sent by your College."}</p><Button asChild variant="outline"><Link href="/cambridge-assessments">Open College Assessment Centre <ArrowRight/></Link></Button></div>}
        {currentStage.id==="review"&&<><p className="text-sm text-slate-600">Review the whole day for adaptation, not whether either individual answer felt ‘right’. What changed between the first and second interviews? Where did you respond well to a new condition? What should the next practice session target?</p><Textarea rows={8} value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Combined reflection…"/><Button onClick={save}>{saved?<CheckCircle2/>:<GraduationCap/>}{saved?"Saved":"Save Cambridge Interview Day"}</Button></>}
        {stage<stages.length-1&&<div className="flex justify-end"><Button onClick={next}>Continue to {stages[stage+1].label}<ArrowRight/></Button></div>}
      </CardContent></Card>

      <aside className="space-y-4"><Card className="shadow-none"><CardHeader><BookOpen className="size-6 text-[#147d91]"/><CardTitle className="font-serif text-xl">What Cambridge currently says</CardTitle></CardHeader><CardContent className="space-y-2 text-sm text-slate-600"><p>• Main 2027-entry interview period: 7–18 December 2026.</p><p>• Most applicants have 1 or 2 interviews; some have more.</p><p>• Interviews can be online or in person depending on College/course.</p><p>• Academic interviews may involve unfamiliar material, scenarios or problems.</p><p>• Science/maths applicants may need to show working.</p><p>• A winter-pool applicant may be invited for an additional January interview at another College.</p></CardContent></Card><Card className="shadow-none"><CardHeader><MessageSquareText className="size-6 text-[#147d91]"/><CardTitle className="font-serif text-xl">Use other interview modes</CardTitle></CardHeader><CardContent className="space-y-2"><Button asChild variant="outline" className="w-full"><Link href="/live-interview">Live voice interview</Link></Button><Button asChild variant="outline" className="w-full"><Link href="/panel-interview">Panel interview</Link></Button></CardContent></Card></aside></section>
    </div>
  </main>
}

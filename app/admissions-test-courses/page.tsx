"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { ArrowLeft, ArrowRight, BookOpenCheck, CheckCircle2, Clock3, Target } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const PROFILE_KEY="oxbridge-tutor-profile-v2"
const COURSE_KEY="oxbridge-admissions-test-course-v1"
const tests=["ESAT","TMUA","TARA","LNAT","UCAT","College assessment","Other / custom"]
const stages=[
  {id:"diagnostic",title:"1. Diagnostic baseline",note:"Establish timing, accuracy and question-type weaknesses before changing strategy.",href:"/advanced-practice",minutes:35},
  {id:"skills",title:"2. Skill lessons",note:"Practise the weakest reasoning and subject skills in short targeted blocks.",href:"/test-player",minutes:30},
  {id:"timed",title:"3. Timed sections",note:"Move from untimed accuracy to realistic time pressure with evidence recorded.",href:"/adaptive-paper",minutes:45},
  {id:"papers",title:"4. Full papers",note:"Complete full-length practice and preserve question-by-question evidence.",href:"/full-papers",minutes:90},
  {id:"mistakes",title:"5. Mistake DNA",note:"Classify recurring errors rather than simply re-reading solutions.",href:"/mistake-dna",minutes:20},
  {id:"repair",title:"6. Intervention + retest",note:"Repair one weakness and immediately test it in a changed question.",href:"/paper-intervention",minutes:35},
  {id:"readiness",title:"7. Readiness evidence",note:"Review trend, retention and independence before the next full paper.",href:"/preparation-readiness",minutes:15},
]

export default function AdmissionsTestCoursesPage(){
 const[test,setTest]=useState("ESAT"),[course,setCourse]=useState("Physics"),[done,setDone]=useState<string[]>([])
 useEffect(()=>{try{const p=JSON.parse(localStorage.getItem(PROFILE_KEY)||"{}");const s=JSON.parse(localStorage.getItem(COURSE_KEY)||"{}");if(p.course)setCourse(p.course);if(s.test)setTest(s.test);if(Array.isArray(s.done))setDone(s.done)}catch{}},[])
 function save(next=done,nextTest=test){localStorage.setItem(COURSE_KEY,JSON.stringify({test:nextTest,course,done:next,updatedAt:new Date().toISOString()}))}
 function toggle(id:string){const next=done.includes(id)?done.filter(x=>x!==id):[...done,id];setDone(next);save(next)}
 const completion=Math.round(done.filter(id=>stages.some(s=>s.id===id)).length/stages.length*100)
 return <main className="min-h-screen bg-[#f5f7f7] text-[#172b3a]"><header className="border-b bg-white"><div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4"><Button asChild variant="ghost"><Link href="/premium"><ArrowLeft/>Premium</Link></Button><Badge><BookOpenCheck className="size-3.5"/>Pro admissions-test course</Badge></div></header><div className="mx-auto max-w-6xl space-y-6 px-4 py-8"><section><p className="text-xs font-bold uppercase tracking-[.18em] text-[#147d91]">Structured test preparation</p><h1 className="mt-2 font-serif text-4xl font-bold">Turn practice papers into a course.</h1><p className="mt-3 max-w-3xl text-slate-600">Choose the assessment you are preparing for and work through diagnostic → skills → timed sections → full papers → intervention → retest. The app records evidence across the same Tutor profile.</p></section><Card><CardHeader><CardTitle>Course setup</CardTitle><CardDescription>Use your application pathway to confirm the assessment you actually need; requirements can vary by course and application year.</CardDescription></CardHeader><CardContent className="grid gap-3 md:grid-cols-3"><label><span className="mb-1 block text-xs font-bold uppercase tracking-wider">Assessment</span><select value={test} onChange={e=>{setTest(e.target.value);save(done,e.target.value)}} className="h-10 w-full rounded-md border bg-white px-3 text-sm">{tests.map(x=><option key={x}>{x}</option>)}</select></label><label><span className="mb-1 block text-xs font-bold uppercase tracking-wider">Course</span><input value={course} onChange={e=>setCourse(e.target.value)} onBlur={()=>save()} className="h-10 w-full rounded-md border bg-white px-3 text-sm"/></label><div className="rounded-xl bg-[#102a43] p-4 text-white"><p className="text-xs text-white/60">Course completion</p><p className="mt-1 font-serif text-3xl font-bold">{completion}%</p></div></CardContent></Card><div className="grid gap-4">{stages.map(stage=><Card key={stage.id} className={done.includes(stage.id)?"border-emerald-200 bg-emerald-50":""}><CardContent className="grid gap-4 p-5 md:grid-cols-[1fr_auto] md:items-center"><div><div className="flex flex-wrap items-center gap-2"><h2 className="font-serif text-xl font-bold">{stage.title}</h2><Badge variant="outline"><Clock3 className="size-3"/>{stage.minutes} min</Badge>{done.includes(stage.id)&&<Badge className="bg-emerald-700"><CheckCircle2 className="size-3"/>Completed</Badge>}</div><p className="mt-2 text-sm leading-6 text-slate-600">{stage.note}</p></div><div className="flex gap-2"><Button asChild><Link href={stage.href}>Start <ArrowRight/></Link></Button><Button variant="outline" onClick={()=>toggle(stage.id)}>{done.includes(stage.id)?"Undo":"Mark complete"}</Button></div></CardContent></Card>)}</div><Card className="border-amber-200 bg-amber-50"><CardHeader><Target className="size-5 text-amber-800"/><CardTitle className="font-serif text-xl">Paid-course principle</CardTitle><CardDescription>The Pro value is the connected diagnostic, intervention, full-paper and progress pathway—not simply hiding a question behind a paywall.</CardDescription></CardHeader></Card></div></main>
}

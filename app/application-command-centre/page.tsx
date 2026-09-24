"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { ArrowLeft, ArrowRight, BookOpenCheck, CalendarDays, FileText, GraduationCap, MessageSquareText, ShieldCheck, Target } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { APPLICATION_KEY, PROFILE_KEY, PROGRESS_KEY } from "@/lib/personal-tutor"
import { readinessChecklist } from "@/lib/deep-prep"

function read(key:string){try{return JSON.parse(localStorage.getItem(key)||"{}") as Record<string,unknown>}catch{return {}}}

export default function ApplicationCommandCentrePage(){
 const [profile,setProfile]=useState<Record<string,unknown>>({university:"Both",course:"Physics",year:"2027"})
 const [application,setApplication]=useState<Record<string,unknown>>({})
 const [progress,setProgress]=useState<Record<string,unknown>>({})
 const [college,setCollege]=useState("")
 useEffect(()=>{const p={university:"Both",course:"Physics",year:"2027",...read(PROFILE_KEY)};const a=read(APPLICATION_KEY);setProfile(p);setApplication(a);setProgress(read(PROGRESS_KEY));if(typeof a.college==="string")setCollege(a.college)},[])
 const checklist=useMemo(()=>readinessChecklist(progress),[progress])
 const complete=checklist.filter(item=>item.done).length
 const percentage=checklist.length?Math.round(complete/checklist.length*100):0
 function saveCollege(){const next={...application,college};setApplication(next);localStorage.setItem(APPLICATION_KEY,JSON.stringify(next))}
 const course=String(profile.course??"Physics"), university=String(profile.university??"Both"), year=String(profile.year??"2027")
 const evidence=[
  {label:"Written work",done:checklist.find(item=>item.id==="written")?.done??false,href:"/written-work-defence",icon:FileText,note:"Analyse and rehearse defending your own academic work."},
  {label:"Admissions tests",done:checklist.find(item=>item.id==="test")?.done??false,href:"/full-papers",icon:Target,note:"Establish a full-paper baseline and keep retests current."},
  {label:"Interview preparation",done:checklist.find(item=>item.id==="interview")?.done??false,href:"/gemini-live-interview",icon:MessageSquareText,note:"Build repeated unfamiliar reasoning evidence, not scripted answers."},
  {label:"Academic reading",done:checklist.find(item=>item.id==="reading")?.done??false,href:"/reading-curriculum",icon:BookOpenCheck,note:"Connect reading to arguments, evidence and interview discussion."},
 ]
 return <main className="min-h-screen bg-[#f4f7f7] text-[#172b3a]"><header className="border-b bg-white"><div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6"><Button asChild variant="ghost"><Link href="/tutor"><ArrowLeft/>Personal Tutor</Link></Button><Badge variant="outline"><GraduationCap className="size-3.5"/>Application Command Centre</Badge></div></header><div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6"><section className="grid gap-5 lg:grid-cols-[1.15fr_.85fr]"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#147d91]">One preparation pathway</p><h1 className="mt-2 font-serif text-4xl font-bold">Connect the application, tests, written work and interviews.</h1><p className="mt-3 max-w-3xl leading-7 text-slate-600">The command centre does not invent College-specific requirements. It stores your preference, uses your course pathway, and sends requirement changes to the official-source updater for verification.</p></div><Card className="border-0 bg-[#102a43] text-white"><CardHeader><CardDescription className="text-white/65">Current pathway</CardDescription><CardTitle className="font-serif text-3xl">{university} · {course}</CardTitle><CardDescription className="text-white/65">{year} entry{college?` · ${college}`:""}</CardDescription></CardHeader><CardContent><Progress value={percentage}/><p className="mt-3 text-sm text-white/70">{complete}/{checklist.length} preparation evidence areas complete.</p></CardContent></Card></section>
 <Card><CardHeader><CardTitle className="font-serif text-2xl">Course & College context</CardTitle><CardDescription>College is optional. The app will not claim a College-specific format unless it is verified by an official source or you enter it yourself.</CardDescription></CardHeader><CardContent className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end"><label><span className="mb-1 block text-sm font-semibold">College preference (optional)</span><Input value={college} onChange={e=>setCollege(e.target.value)} onBlur={saveCollege} placeholder="e.g. leave blank if undecided"/></label><Button asChild variant="outline"><Link href="/admissions-updater"><ShieldCheck/>Check official-source changes</Link></Button></CardContent></Card>
 <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{evidence.map(item=><Card key={item.label} className={item.done?"border-emerald-200":""}><CardHeader><div className="flex items-start justify-between gap-2"><item.icon className="size-5 text-[#147d91]"/><Badge variant="outline">{item.done?"Evidence present":"Build evidence"}</Badge></div><CardTitle className="font-serif text-xl">{item.label}</CardTitle><CardDescription>{item.note}</CardDescription></CardHeader><CardContent><Button asChild size="sm" variant="outline"><Link href={item.href}>Open <ArrowRight/></Link></Button></CardContent></Card>)}</section>
 <section className="grid gap-5 lg:grid-cols-2"><Card><CardHeader><CardTitle className="flex items-center gap-2 font-serif text-2xl"><CalendarDays className="size-5 text-[#147d91]"/>Application milestones</CardTitle><CardDescription>Use the timeline and official updater rather than hard-coded assumptions.</CardDescription></CardHeader><CardContent className="space-y-3"><Button asChild variant="outline" className="w-full justify-between"><Link href="/timeline">Personal timeline <ArrowRight/></Link></Button><Button asChild variant="outline" className="w-full justify-between"><Link href="/requirements">Course requirements <ArrowRight/></Link></Button><Button asChild variant="outline" className="w-full justify-between"><Link href="/admissions-updater">Official source monitor <ArrowRight/></Link></Button></CardContent></Card><Card><CardHeader><CardTitle className="font-serif text-2xl">Your application evidence</CardTitle><CardDescription>Use your own claims as interview material.</CardDescription></CardHeader><CardContent className="space-y-3"><p className="text-sm leading-6 text-slate-600">Anything you claim to have read, researched, built or argued should be something you can explain, challenge and connect to your course.</p><Button asChild><Link href="/application-defence">Defend application claims <ArrowRight/></Link></Button><Button asChild variant="outline"><Link href="/written-work-defence">Defend written work</Link></Button></CardContent></Card></section></div></main>
}

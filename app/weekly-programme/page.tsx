"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { ArrowLeft, ArrowRight, CalendarDays, CheckCircle2, RefreshCw } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { buildPrepWeek } from "@/lib/nextgen-prep"

const PROFILE_KEY="oxbridge-tutor-profile-v2"
const WEEK_KEY="oxbridge-premium-weekly-programme-v1"

type SavedWeek={course:string;completed:string[];generatedAt:string}

export default function WeeklyProgrammePage(){
 const[course,setCourse]=useState("Physics"),[completed,setCompleted]=useState<string[]>([]),[generatedAt,setGeneratedAt]=useState("")
 useEffect(()=>{try{const p=JSON.parse(localStorage.getItem(PROFILE_KEY)||"{}");const saved=JSON.parse(localStorage.getItem(WEEK_KEY)||"null") as SavedWeek|null;const c=typeof p.course==="string"?p.course:"Physics";setCourse(saved?.course||c);setCompleted(Array.isArray(saved?.completed)?saved!.completed:[]);setGeneratedAt(saved?.generatedAt||new Date().toISOString())}catch{setGeneratedAt(new Date().toISOString())}},[])
 const days=useMemo(()=>buildPrepWeek(course),[course])
 const allTasks=days.flatMap(d=>d.tasks.map(t=>`${d.id}:${t.id}`))
 const pct=allTasks.length?Math.round(allTasks.filter(id=>completed.includes(id)).length/allTasks.length*100):0
 function persist(next:string[],date=generatedAt||new Date().toISOString()){localStorage.setItem(WEEK_KEY,JSON.stringify({course,completed:next,generatedAt:date}))}
 function toggle(id:string){const next=completed.includes(id)?completed.filter(x=>x!==id):[...completed,id];setCompleted(next);persist(next)}
 function regenerate(){const date=new Date().toISOString();setCompleted([]);setGeneratedAt(date);persist([],date)}
 return <main className="min-h-screen bg-[#f5f7f7] text-[#172b3a]"><header className="border-b bg-white"><div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4"><Button asChild variant="ghost"><Link href="/tutor-autopilot"><ArrowLeft/>Tutor Autopilot</Link></Button><Badge><CalendarDays className="size-3.5"/>Pro weekly programme</Badge></div></header><div className="mx-auto max-w-6xl space-y-6 px-4 py-8"><section className="flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#147d91]">Tutor-generated week</p><h1 className="mt-2 font-serif text-4xl font-bold">A seven-day programme that connects the whole app.</h1><p className="mt-3 max-w-3xl text-slate-600">The plan alternates diagnostics, weak-area repair, unseen material, visual reasoning, pressure practice, full simulation and delayed retention instead of repeating the same activity every day.</p></div><Button variant="outline" onClick={regenerate}><RefreshCw/>Regenerate week</Button></section><Card><CardHeader><div className="flex items-center justify-between"><div><CardTitle className="font-serif text-2xl">{course}</CardTitle><CardDescription>Generated {generatedAt?new Date(generatedAt).toLocaleDateString("en-GB"):"today"}</CardDescription></div><strong>{pct}%</strong></div><Progress value={pct}/></CardHeader></Card><div className="grid gap-4">{days.map(day=><Card key={day.id}><CardHeader><div className="flex flex-wrap items-center gap-2"><Badge>Day {day.day}</Badge><CardTitle className="font-serif text-2xl">{day.title}</CardTitle></div><CardDescription>{day.rationale}</CardDescription></CardHeader><CardContent className="space-y-3">{day.tasks.map(task=>{const id=`${day.id}:${task.id}`,done=completed.includes(id);return <div key={id} className={`grid gap-3 rounded-xl border p-3 sm:grid-cols-[1fr_auto] sm:items-center ${done?"border-emerald-200 bg-emerald-50":"bg-white"}`}><div><div className="flex gap-2"><strong>{task.label}</strong><Badge variant="outline">{task.minutes} min</Badge>{done&&<CheckCircle2 className="size-4 text-emerald-700"/>}</div></div><div className="flex gap-2"><Button asChild size="sm"><Link href={task.href}>Open <ArrowRight/></Link></Button><Button size="sm" variant="outline" onClick={()=>toggle(id)}>{done?"Undo":"Done"}</Button></div></div>})}</CardContent></Card>)}</div></div></main>
}

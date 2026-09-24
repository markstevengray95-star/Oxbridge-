"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { ArrowRight, BookOpenCheck, Brain, Camera, CalendarDays, ChevronDown, FileDiff, FileText, Gauge, GraduationCap, LibraryBig, Network, RefreshCw, ScanSearch, ShieldCheck, Sparkles, Users, WifiOff } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ORAL_RETEST_KEY, PREP_WEEK_KEY, type OralRetest } from "@/lib/nextgen-prep"

type PrepState = { completed?: string[] }
type ToolCard = { title:string; note:string; href:string; badge:string; icon:typeof Camera; emphasis?:boolean }

export function NextgenTutorPanel(){
 const [retests,setRetests]=useState<OralRetest[]>([]),[prepState,setPrepState]=useState<PrepState>({}),[readingCount,setReadingCount]=useState(0)
 useEffect(()=>{try{const raw=JSON.parse(localStorage.getItem(ORAL_RETEST_KEY)||"[]");if(Array.isArray(raw))setRetests(raw)}catch{}try{setPrepState(JSON.parse(localStorage.getItem(PREP_WEEK_KEY)||"{}") as PrepState)}catch{}try{const readings=JSON.parse(localStorage.getItem("oxbridge-reading-reflections-v1")||"[]");if(Array.isArray(readings))setReadingCount(readings.length)}catch{}},[])
 const due=useMemo(()=>retests.find(item=>!item.completedAt&&new Date(item.dueAt).getTime()<=Date.now()),[retests]),completed=prepState.completed?.length??0
 const priorities:ToolCard[]=[
  {title:"Digital Twin 2.0",note:"Open the unified model of independence, transfer, retention, reading depth and application defence.",href:"/digital-twin",icon:Brain,badge:"Command centre",emphasis:true},
  {title:"Tutor Autopilot",note:"Let the Tutor choose the session, adapt difficulty, track hint dependence and check transfer.",href:"/tutor-autopilot",icon:Sparkles,badge:"Personalised",emphasis:true},
  due?{title:"Oral retention check",note:`A delayed check is due on: ${due.focus}`,href:"/gemini-live-interview",icon:Camera,badge:"Due now",emphasis:true}:{title:"Two-person AI panel",note:"Face two adaptive interviewers with distinct AI voices and shared context.",href:"/panel-interview",icon:Users,badge:"Dual voice"},
 ]
 const library:Array<{heading:string;items:ToolCard[]}>= [
  {heading:"Reasoning & interview",items:[
   {title:"Socratic Whiteboard",note:"Draw and think aloud while the app tracks assumptions, checking and self-correction.",href:"/socratic-whiteboard",icon:ScanSearch,badge:"Visual reasoning"},
   {title:"Preparation Readiness",note:"Track independence, adaptability, retention, transfer, calibration, consistency and mock timing.",href:"/preparation-readiness",icon:Gauge,badge:"Evidence"},
   {title:"Reasoning Replay",note:"See how an answer changed after challenge and whether confidence matched performance.",href:"/reasoning-replay",icon:Gauge,badge:"Replay"},
   {title:"Unseen material",note:"Prepare a graph, passage, dataset or scenario, then defend your reasoning.",href:"/pre-interview-material",icon:BookOpenCheck,badge:"Adaptive"},
   {title:"Preparation Week",note:completed?`${completed} task${completed===1?"":"s"} completed.`:"Run a seven-day diagnostic → intervention → interview → retention programme.",href:"/prep-week",icon:CalendarDays,badge:"Programme"},
  ]},
  {heading:"Application & academic depth",items:[
   {title:"Personal Statement Defence",note:"Turn application claims, reading and activities into interview questions you can genuinely defend.",href:"/personal-statement-defence",icon:FileText,badge:"Application"},
   {title:"Evidence Locker",note:"Keep written work, reading, research, competitions and reflections in one evidence store.",href:"/evidence-locker",icon:ShieldCheck,badge:"Portfolio"},
   {title:"Knowledge Graph",note:"Connect sources, ideas, opposing arguments, course topics and interview questions.",href:"/knowledge-graph",icon:Network,badge:"Connections"},
   {title:"Source Notebook",note:"Capture argument, evidence, limitation, connections and your own judgement for every source.",href:"/source-notebook",icon:LibraryBig,badge:"Reading"},
   {title:"Reading Curriculum",note:"Follow a 6–12 week pathway that returns to ideas and forces synthesis.",href:"/reading-curriculum",icon:LibraryBig,badge:"Curriculum"},
   {title:"Written Work Defence",note:"Map claims and assumptions in your own work, then defend them in interview.",href:"/written-work-defence",icon:FileText,badge:"Written work"},
   {title:"Essay Version Comparison",note:"Separate real reasoning improvement from cosmetic rewriting.",href:"/essay-comparison",icon:FileDiff,badge:"Writing"},
  ]},
  {heading:"Tests, quality & access",items:[
   {title:"Offline Pack",note:"Complete a compact practice pack with low bandwidth, save locally and export a backup.",href:"/offline-pack",icon:WifiOff,badge:"Offline"},
   {title:"Test player",note:"Practise timing, keyboard navigation, flags and accessibility controls.",href:"/test-player",icon:RefreshCw,badge:"Timed"},
   {title:"Application Command Centre",note:"Connect course, College preference, written work, tests, reading and interviews.",href:"/application-command-centre",icon:GraduationCap,badge:"Pathway"},
   {title:"Question provenance",note:"See whether practice is original, official-published, specification-aligned, teacher-reviewed or AI-generated.",href:"/question-provenance",icon:Sparkles,badge:"Transparent"},
   {title:"Admissions updater",note:"Re-check official sources and flag pages whose requirements changed.",href:"/admissions-updater",icon:ShieldCheck,badge:"Official sources"},
  ]},
 ]
 return <section className="mx-auto max-w-7xl px-4 pb-28 sm:px-6 md:pb-10"><div className="mb-4"><p className="text-xs font-bold uppercase tracking-[.18em] text-[#147d91]">Tutor recommendations</p><h2 className="mt-1 font-serif text-2xl font-bold text-[#172b3a]">Do the next useful thing, not everything at once.</h2><p className="mt-1 max-w-2xl text-sm text-[#667984]">The Digital Twin now decides what matters most; deeper tools stay grouped below.</p></div><div className="grid gap-4 lg:grid-cols-3">{priorities.map(item=><Card key={item.title} className={item.emphasis?"border-[#8dd7de] bg-[#f4fbfb] shadow-none":"shadow-none"}><CardHeader><div className="flex items-start justify-between gap-3"><item.icon className="size-5 text-[#147d91]"/><Badge variant={item.emphasis?"default":"outline"}>{item.badge}</Badge></div><CardTitle className="font-serif text-xl">{item.title}</CardTitle><CardDescription>{item.note}</CardDescription></CardHeader><CardContent><Button asChild size="sm" variant={item.emphasis?"default":"outline"}><Link href={item.href}>Start <ArrowRight/></Link></Button></CardContent></Card>)}</div><details className="group mt-5 rounded-2xl border bg-white"><summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5"><div><p className="font-semibold text-[#172b3a]">Explore the full preparation studio</p><p className="mt-1 text-sm text-[#667984]">Open this when you want a specific tool.</p></div><ChevronDown className="size-5 text-[#667984] transition-transform group-open:rotate-180"/></summary><div className="grid gap-6 border-t p-5 lg:grid-cols-3">{library.map(group=><div key={group.heading}><p className="mb-3 text-xs font-bold uppercase tracking-[.15em] text-[#147d91]">{group.heading}</p><div className="space-y-3">{group.items.map(item=><Link key={item.title} href={item.href} className="block rounded-xl border p-4 transition-colors hover:border-[#8dd7de] hover:bg-[#f8fbfb]"><div className="flex items-start gap-3"><item.icon className="mt-0.5 size-4 shrink-0 text-[#147d91]"/><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><strong className="text-sm text-[#172b3a]">{item.title}</strong><Badge variant="outline" className="text-[10px]">{item.badge}</Badge></div><p className="mt-1 text-xs leading-5 text-[#667984]">{item.note}</p></div></div></Link>)}</div></div>)}</div></details></section>
}

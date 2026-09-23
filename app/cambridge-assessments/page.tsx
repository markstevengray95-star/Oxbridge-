"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { ArrowLeft, ExternalLink, GraduationCap, School, ShieldCheck } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { assessmentFor, cambridgeAssessmentChecked, cambridgeAssessmentData, cambridgeAssessmentOfficialUrl, collegeApplies } from "@/lib/cambridge-assessments"

const colleges=["Christ's","Churchill","Clare","Corpus Christi","Downing","Emmanuel","Fitzwilliam","Girton","Gonville & Caius","Homerton","Hughes Hall","Jesus","King's","Lucy Cavendish","Magdalene","Murray Edwards","Newnham","Pembroke","Peterhouse","Queens'","Robinson","Selwyn","Sidney Sussex","St Catharine's","St Edmund's","St John's","Trinity","Trinity Hall","Wolfson"]

export default function CambridgeAssessmentsPage(){
  const [course,setCourse]=useState("Architecture")
  const [college,setCollege]=useState("Clare")
  useEffect(()=>{try{const p=JSON.parse(localStorage.getItem("oxbridge-tutor-profile-v2")||"{}");if(p.course&&assessmentFor(p.course))setCourse(p.course);const c=localStorage.getItem("oxbridge-cambridge-college-v1");if(c)setCollege(c)}catch{}},[])
  useEffect(()=>{localStorage.setItem("oxbridge-cambridge-college-v1",college)},[college])
  const item=useMemo(()=>assessmentFor(course),[course])
  const applies=item?collegeApplies(item,college):false
  return <main className="min-h-screen bg-[#f6f8f8] text-[#172b3a]">
    <header className="border-b bg-white"><div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6"><Button asChild variant="ghost"><Link href="/requirements"><ArrowLeft/>Requirements</Link></Button><Badge variant="outline"><School className="size-3.5"/>Cambridge assessment centre</Badge></div></header>
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <section className="mb-6"><p className="text-xs font-bold uppercase tracking-[.18em] text-[#147d91]">2027 entry · College-arranged assessments</p><h1 className="mt-2 font-serif text-4xl font-bold">Check the course and the College together.</h1><p className="mt-2 max-w-3xl text-slate-600">Cambridge arranges these after shortlisting. You do not register for College assessments in advance; the interviewing College tells you when and how to take the relevant assessment.</p></section>
      <section className="mb-5 grid gap-3 sm:grid-cols-2"><label className="text-xs font-bold uppercase tracking-wider text-slate-500">Course<NativeSelect value={course} onChange={e=>setCourse(e.target.value)} className="mt-1 bg-white">{cambridgeAssessmentData.map(x=><NativeSelectOption key={x.course}>{x.course}</NativeSelectOption>)}</NativeSelect></label><label className="text-xs font-bold uppercase tracking-wider text-slate-500">College<NativeSelect value={college} onChange={e=>setCollege(e.target.value)} className="mt-1 bg-white">{colleges.map(x=><NativeSelectOption key={x}>{x}</NativeSelectOption>)}</NativeSelect></label></section>
      {item&&<section className="grid gap-5 lg:grid-cols-[1.15fr_.85fr]"><Card className={`shadow-none ${applies?"border-[#147d91]/30":""}`}><CardHeader><div className="flex flex-wrap gap-2"><Badge>{item.course}</Badge><Badge variant={applies?"default":"outline"}>{applies?`Assessment applies at ${college}`:`Not listed for ${college}`}</Badge></div><CardTitle className="font-serif text-3xl">{item.format}</CardTitle>{item.date&&<CardDescription>Published assessment date: {new Date(`${item.date}T12:00:00Z`).toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}</CardDescription>}</CardHeader><CardContent className="space-y-4"><div className="rounded-xl bg-[#edf7f8] p-4"><strong>Colleges listed</strong><p className="mt-1 text-sm leading-relaxed text-slate-600">{item.colleges==="All Colleges"?"All Colleges":item.colleges.join(", ")}</p></div>{item.note&&<p className="text-sm leading-relaxed text-slate-600">{item.note}</p>}<Button asChild><a href={cambridgeAssessmentOfficialUrl} target="_blank" rel="noreferrer">Open official Cambridge table <ExternalLink/></a></Button></CardContent></Card><aside className="space-y-4"><Card className="shadow-none"><CardHeader><ShieldCheck className="size-6 text-[#147d91]"/><CardTitle className="font-serif text-xl">How to use this</CardTitle></CardHeader><CardContent className="space-y-2 text-sm text-slate-600"><p>1. Select your intended course and College.</p><p>2. Treat this as a planning summary only.</p><p>3. If shortlisted, follow the instructions sent by the interviewing College.</p><p>4. Re-check the official table if your College/course choice changes.</p></CardContent></Card><Card className="shadow-none"><CardHeader><GraduationCap className="size-6 text-[#147d91]"/><CardTitle className="font-serif text-xl">Freshness</CardTitle></CardHeader><CardContent><p className="text-sm text-slate-600">Data checked {cambridgeAssessmentChecked}. The official Cambridge page remains authoritative.</p></CardContent></Card></aside></section>}
    </div>
  </main>
}

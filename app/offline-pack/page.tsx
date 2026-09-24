"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Download, RefreshCw, WifiOff } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { OFFLINE_PACK_KEY } from "@/lib/digital-twin-2"

const prompts=[
  "Explain one idea from your course from first principles without using memorised phrasing.",
  "Identify a hidden assumption in a claim you encountered this week and test what happens if it fails.",
  "Take one recent mistake and solve a changed-context version without looking at the original answer.",
  "Read a saved source note and write the strongest counterargument to its central claim.",
  "Choose one application claim and write two questions an interviewer could use to probe it.",
]

export default function OfflinePackPage(){const [answers,setAnswers]=useState<Record<number,string>>({});const [savedAt,setSavedAt]=useState("");useEffect(()=>{try{const x=JSON.parse(localStorage.getItem(OFFLINE_PACK_KEY)||"{}");if(x.answers)setAnswers(x.answers);if(x.savedAt)setSavedAt(x.savedAt)}catch{}},[]);const complete=useMemo(()=>Object.values(answers).filter(x=>x.trim()).length,[answers]);const save=()=>{const t=new Date().toISOString();localStorage.setItem(OFFLINE_PACK_KEY,JSON.stringify({answers,savedAt:t,prompts}));setSavedAt(t)};const download=()=>{save();const blob=new Blob([JSON.stringify({prompts,answers,savedAt:new Date().toISOString()},null,2)],{type:"application/json"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="oxbridge-offline-pack.json";a.click();URL.revokeObjectURL(a.href)};return <main className="min-h-screen bg-[#f5f7f7] px-4 py-8 text-[#172b3a]"><div className="mx-auto max-w-5xl space-y-5"><Link href="/digital-twin" className="inline-flex items-center gap-2 text-sm font-semibold"><ArrowLeft className="size-4"/>Digital Twin</Link><section><Badge><WifiOff className="mr-1 size-3"/>Low-bandwidth</Badge><h1 className="mt-3 font-serif text-4xl font-bold">Offline Practice Pack</h1><p className="mt-2 max-w-3xl text-slate-600">This pack works from browser storage after the page has loaded. Complete the tasks without live AI, save locally, then return online and use them as Tutor evidence.</p></section><Card><CardContent className="flex flex-wrap items-center justify-between gap-4 p-5"><div><b>{complete}/{prompts.length} completed</b><p className="text-xs text-slate-500">{savedAt?`Last saved ${new Date(savedAt).toLocaleString("en-GB")}`:"Not saved yet"}</p></div><div className="flex gap-2"><Button variant="outline" onClick={save}><RefreshCw/>Save locally</Button><Button onClick={download}><Download/>Export backup</Button></div></CardContent></Card>{prompts.map((p,i)=><Card key={p}><CardHeader><CardTitle className="text-lg">{i+1}. {p}</CardTitle></CardHeader><CardContent><Textarea className="min-h-32" value={answers[i]||""} onChange={e=>setAnswers({...answers,[i]:e.target.value})}/></CardContent></Card>)}</div></main>}

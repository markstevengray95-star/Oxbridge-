"use client"

import Link from "next/link"
import { ChangeEvent, useEffect, useState } from "react"
import { ArrowLeft, Brain, Camera, ImageIcon, Loader2, ShieldCheck } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"

export default function WorkingAnalysisPage(){
  const [course,setCourse]=useState("Physics")
  const [context,setContext]=useState("")
  const [image,setImage]=useState("")
  const [analysis,setAnalysis]=useState("")
  const [error,setError]=useState("")
  const [busy,setBusy]=useState(false)

  useEffect(()=>{try{const p=JSON.parse(localStorage.getItem("oxbridge-tutor-profile-v2")||"{}");if(p.course)setCourse(p.course)}catch{}},[])
  const choose=async(e:ChangeEvent<HTMLInputElement>)=>{const file=e.target.files?.[0];if(!file)return;if(!/^image\/(png|jpeg|webp)$/i.test(file.type)){setError("Use a PNG, JPG or WebP image.");return}if(file.size>7_000_000){setError("Use an image under 7 MB.");return}const reader=new FileReader();reader.onload=()=>{setImage(String(reader.result||""));setError("");setAnalysis("")};reader.readAsDataURL(file);e.target.value=""}
  const run=async()=>{if(!image)return;setBusy(true);setError("");setAnalysis("");try{const res=await fetch("/api/analyse-working",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({image,subject:course,context})});const data=await res.json();if(!res.ok)throw new Error(data.error||"Analysis failed");setAnalysis(data.analysis)}catch(e){setError(e instanceof Error?e.message:"Analysis failed") }finally{setBusy(false)}}
  const save=()=>{if(!analysis)return;try{const prev=JSON.parse(localStorage.getItem("oxbridge-working-analyses-v1")||"[]");localStorage.setItem("oxbridge-working-analyses-v1",JSON.stringify([{course,context,analysis,date:new Date().toISOString()},...prev].slice(0,30)))}catch{}}

  return <main className="min-h-screen bg-[#f6f8f8] text-[#172b3a]">
    <header className="border-b bg-white"><div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6"><Button asChild variant="ghost"><Link href="/student-home"><ArrowLeft/>Student Home</Link></Button><Badge variant="outline"><Camera className="size-3.5"/>Working analysis</Badge></div></header>
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <section className="mb-6"><p className="text-xs font-bold uppercase tracking-[.18em] text-[#147d91]">Handwritten reasoning review</p><h1 className="mt-2 font-serif text-4xl font-bold">Photograph the working, then discuss the reasoning.</h1><p className="mt-2 max-w-3xl text-slate-600">The analyser focuses on method, assumptions, equations, diagrams and checking—not handwriting appearance. It is designed to coach the student’s reasoning rather than replace it with a finished answer.</p></section>

      <section className="grid gap-5 lg:grid-cols-[.9fr_1.1fr]"><Card className="shadow-none"><CardHeader><ImageIcon className="size-6 text-[#147d91]"/><CardTitle className="font-serif text-2xl">Upload working</CardTitle><CardDescription>PNG, JPG or WebP. Use a clear image with the entire working area visible.</CardDescription></CardHeader><CardContent className="space-y-4"><input value={course} onChange={e=>setCourse(e.target.value)} className="w-full rounded-xl border px-3 py-2.5" placeholder="Course/subject"/><Textarea rows={4} value={context} onChange={e=>setContext(e.target.value)} placeholder="Optional: What problem were you trying to solve? Where did you get stuck?"/>{image?<img src={image} alt="Uploaded student working" className="max-h-[520px] w-full rounded-2xl border bg-white object-contain"/>:<label className="grid min-h-64 cursor-pointer place-items-center rounded-2xl border-2 border-dashed border-slate-300 bg-white text-center"><span><Camera className="mx-auto mb-2 size-8 text-[#147d91]"/><strong className="block">Choose or photograph working</strong><small className="text-slate-500">Image stays in the browser until you press Analyse.</small></span><input type="file" accept="image/png,image/jpeg,image/webp" capture="environment" className="hidden" onChange={choose}/></label>}<div className="flex flex-wrap gap-2"><label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-md border bg-white px-4 text-sm font-medium"><Camera className="size-4"/>Choose image<input type="file" accept="image/png,image/jpeg,image/webp" capture="environment" className="hidden" onChange={choose}/></label><Button onClick={run} disabled={!image||busy}>{busy?<Loader2 className="animate-spin"/>:<Brain/>}{busy?"Analysing…":"Analyse reasoning"}</Button></div></CardContent></Card>

      <aside className="space-y-4"><Card className="shadow-none"><CardHeader><Brain className="size-6 text-[#147d91]"/><CardTitle className="font-serif text-2xl">Tutor review</CardTitle><CardDescription>Feedback is generated only after an image is submitted to the server-side analysis route.</CardDescription></CardHeader><CardContent>{analysis?<div className="whitespace-pre-wrap rounded-2xl bg-[#edf7f8] p-4 text-sm leading-7">{analysis}</div>:<p className="text-sm text-slate-500">No analysis yet. The tutor will identify what it can read, reconstruct the reasoning chain, highlight a strong step, identify the first issue to fix and ask one Socratic follow-up.</p>}{analysis&&<Button className="mt-4" variant="outline" onClick={save}>Save review locally</Button>}</CardContent></Card><Alert><ShieldCheck/><AlertTitle>Privacy and model use</AlertTitle><AlertDescription>The image is sent to your server’s configured OpenAI model only when you press Analyse. The browser never receives the API key. Avoid uploading personal identifiers that are not needed for the academic review.</AlertDescription></Alert>{error&&<Alert className="border-red-200 bg-red-50"><AlertTitle>Could not analyse image</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}</aside></section>
    </div>
  </main>
}

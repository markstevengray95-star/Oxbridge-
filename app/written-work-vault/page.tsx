"use client"

import Link from "next/link"
import { ChangeEvent, useEffect, useMemo, useState } from "react"
import { ArrowLeft, ArrowRight, FileText, ShieldCheck, Upload } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"

const KEY="oxbridge-written-work-vault-v1"

type SavedWork={title:string;text:string;saved:string}

function sentences(text:string){return text.split(/(?<=[.!?])\s+/).map(x=>x.trim()).filter(Boolean)}
function extractClaims(text:string){return sentences(text).filter(s=>/\b(argue|suggest|show|therefore|because|should|must|likely|important|means|demonstrates|indicates)\b/i.test(s)).slice(0,12)}
function defenceQuestions(claim:string,i:number){const stems=[
  `What is the strongest evidence for this claim: “${claim}”?`,
  `Which assumption would most weaken this claim if it were false: “${claim}”?`,
  `What is the strongest counterargument to this claim: “${claim}”?`,
  `How would you refine this claim if an interviewer produced conflicting evidence: “${claim}”?`,
  `Which term in this claim most needs defining before the argument can be assessed: “${claim}”?`,
];return stems[i%stems.length]}

export default function WrittenWorkVaultPage(){
  const [title,setTitle]=useState("")
  const [text,setText]=useState("")
  const [saved,setSaved]=useState<SavedWork[]>([])

  useEffect(()=>{try{const s=localStorage.getItem(KEY);if(s)setSaved(JSON.parse(s))}catch{}},[])
  const claims=useMemo(()=>extractClaims(text),[text])
  const save=()=>{if(!text.trim())return;const work={title:title.trim()||"Submitted written work",text:text.trim(),saved:new Date().toISOString()};const next=[work,...saved].slice(0,10);setSaved(next);localStorage.setItem(KEY,JSON.stringify(next))}
  const load=(work:SavedWork)=>{setTitle(work.title);setText(work.text)}
  const upload=async(e:ChangeEvent<HTMLInputElement>)=>{const file=e.target.files?.[0];if(!file)return;if(!/\.(txt|md)$/i.test(file.name)){alert("This vault currently reads plain-text or Markdown files directly. Paste text from PDF/DOCX into the editor for now.");e.target.value="";return}setTitle(file.name.replace(/\.[^.]+$/,""));setText(await file.text());e.target.value=""}

  return <main className="min-h-screen bg-[#f6f8f8] text-[#172b3a]">
    <header className="border-b bg-white"><div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6"><Button asChild variant="ghost"><Link href="/student-home"><ArrowLeft/>Student Home</Link></Button><Badge variant="outline"><ShieldCheck className="size-3.5"/>Written Work Vault</Badge></div></header>
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <section className="mb-6"><p className="text-xs font-bold uppercase tracking-[.18em] text-[#147d91]">Submitted-work defence</p><h1 className="mt-2 font-serif text-4xl font-bold">Know every claim you submitted.</h1><p className="mt-2 max-w-3xl text-slate-600">Store a local copy of written work, identify arguable claims and rehearse the questions an academic could use to test those claims. The vault stays in this browser unless you export it yourself.</p></section>

      <section className="grid gap-5 lg:grid-cols-[1.15fr_.85fr]"><Card className="shadow-none"><CardHeader><FileText className="size-6 text-[#147d91]"/><CardTitle className="font-serif text-2xl">Current document</CardTitle><CardDescription>Paste text or upload .txt/.md. PDF/DOCX content can be pasted into the editor until direct document parsing is added.</CardDescription></CardHeader><CardContent className="space-y-3"><input className="w-full rounded-xl border px-3 py-2.5" placeholder="Document title" value={title} onChange={e=>setTitle(e.target.value)}/><Textarea rows={18} value={text} onChange={e=>setText(e.target.value)} placeholder="Paste the exact version of the written work you submitted…"/><div className="flex flex-wrap gap-2"><Button onClick={save} disabled={!text.trim()}>Save locally</Button><label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-md border bg-white px-4 text-sm font-medium"><Upload className="size-4"/>Upload text<input className="hidden" type="file" accept=".txt,.md,text/plain,text/markdown" onChange={upload}/></label></div></CardContent></Card>

      <aside className="space-y-4"><Card className="shadow-none"><CardHeader><CardTitle className="font-serif text-xl">Claim defence map</CardTitle><CardDescription>{claims.length} arguable claim{claims.length===1?"":"s"} detected by the local heuristic.</CardDescription></CardHeader><CardContent className="space-y-3">{claims.length?claims.map((claim,i)=><details key={`${claim}-${i}`} className="rounded-xl border bg-white p-3"><summary className="cursor-pointer text-sm font-semibold">{claim}</summary><div className="mt-3 rounded-lg bg-[#edf7f8] p-3"><p className="text-xs font-bold uppercase tracking-wider text-[#147d91]">Defence question</p><p className="mt-1 font-serif">{defenceQuestions(claim,i)}</p></div></details>):<p className="text-sm text-slate-500">Paste a document and the vault will extract statements that are likely to invite academic challenge.</p>}</CardContent></Card><Card className="shadow-none"><CardHeader><CardTitle className="font-serif text-xl">Saved documents</CardTitle></CardHeader><CardContent className="space-y-2">{saved.length?saved.map((work,i)=><button key={`${work.saved}-${i}`} onClick={()=>load(work)} className="w-full rounded-xl border p-3 text-left hover:border-[#147d91]"><strong className="block text-sm">{work.title}</strong><small className="text-slate-500">Saved {new Date(work.saved).toLocaleDateString("en-GB")}</small></button>):<p className="text-sm text-slate-500">No saved work yet.</p>}</CardContent></Card></aside></section>
      <div className="mt-5"><Button asChild><Link href="/interview-room">Defend this work in Interview Room <ArrowRight/></Link></Button></div>
    </div>
  </main>
}

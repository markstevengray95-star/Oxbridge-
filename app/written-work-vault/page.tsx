"use client"

import Link from "next/link"
import { ChangeEvent, useEffect, useMemo, useState } from "react"
import { ArrowLeft, ArrowRight, FileText, Loader2, ShieldCheck, Upload } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { readWrittenWorkFile } from "@/lib/written-work-import-client"

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
  const [importing,setImporting]=useState(false)
  const [notice,setNotice]=useState("")

  useEffect(()=>{try{const s=localStorage.getItem(KEY);if(s)setSaved(JSON.parse(s))}catch{}},[])
  const claims=useMemo(()=>extractClaims(text),[text])
  const save=()=>{if(!text.trim())return;const work={title:title.trim()||"Submitted written work",text:text.trim(),saved:new Date().toISOString()};const next=[work,...saved].slice(0,10);setSaved(next);localStorage.setItem(KEY,JSON.stringify(next));setNotice("Saved locally in this browser.")}
  const load=(work:SavedWork)=>{setTitle(work.title);setText(work.text);setNotice("")}
  const upload=async(e:ChangeEvent<HTMLInputElement>)=>{
    const file=e.target.files?.[0]
    if(!file)return
    setImporting(true);setNotice("")
    try{
      const imported=await readWrittenWorkFile(file)
      setTitle(file.name.replace(/\.[^.]+$/,""))
      setText(imported.text)
      setNotice(imported.warning||`${file.name} imported successfully. Check the extracted text against the original before practising from it.`)
    }catch(error){
      setNotice(error instanceof Error?error.message:"The document could not be imported.")
    }finally{
      setImporting(false);e.target.value=""
    }
  }

  return <main className="min-h-screen bg-[#f6f8f8] text-[#172b3a]">
    <header className="border-b bg-white"><div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6"><Button asChild variant="ghost"><Link href="/student-home"><ArrowLeft/>Student Home</Link></Button><Badge variant="outline"><ShieldCheck className="size-3.5"/>Written Work Vault</Badge></div></header>
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <section className="mb-6"><p className="text-xs font-bold uppercase tracking-[.18em] text-[#147d91]">Submitted-work defence</p><h1 className="mt-2 font-serif text-4xl font-bold">Know every claim you submitted.</h1><p className="mt-2 max-w-3xl text-slate-600">Store a local copy of written work, identify arguable claims and rehearse the questions an academic could use to test those claims. DOCX and text extraction runs locally in your browser; PDF import uses the configured document-analysis service.</p></section>

      {notice&&<div className="mb-4 rounded-xl border border-[#cfe1e4] bg-[#edf7f8] p-3 text-sm leading-6 text-[#34515f]">{notice}</div>}

      <section className="grid gap-5 lg:grid-cols-[1.15fr_.85fr]"><Card className="shadow-none"><CardHeader><FileText className="size-6 text-[#147d91]"/><CardTitle className="font-serif text-2xl">Current document</CardTitle><CardDescription>Paste text or import PDF, DOCX, TXT or Markdown. Always compare equations, symbols and unusual layouts with the submitted original.</CardDescription></CardHeader><CardContent className="space-y-3"><input className="w-full rounded-xl border px-3 py-2.5" placeholder="Document title" value={title} onChange={e=>setTitle(e.target.value)}/><Textarea rows={18} value={text} onChange={e=>{setText(e.target.value);setNotice("")}} placeholder="Paste the exact version of the written work you submitted…"/><div className="flex flex-wrap gap-2"><Button onClick={save} disabled={!text.trim()}>Save locally</Button><label className={`inline-flex h-10 items-center gap-2 rounded-md border bg-white px-4 text-sm font-medium ${importing?"cursor-wait opacity-60":"cursor-pointer"}`}>{importing?<Loader2 className="size-4 animate-spin"/>:<Upload className="size-4"/>}{importing?"Importing…":"Import document"}<input className="hidden" type="file" accept=".pdf,.docx,.txt,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown" disabled={importing} onChange={upload}/></label></div><p className="text-xs leading-5 text-slate-500">DOCX/TXT/Markdown stay on-device during extraction. PDF import is limited to 3 MB for reliable server upload.</p></CardContent></Card>

      <aside className="space-y-4"><Card className="shadow-none"><CardHeader><CardTitle className="font-serif text-xl">Claim defence map</CardTitle><CardDescription>{claims.length} arguable claim{claims.length===1?"":"s"} detected by the local heuristic.</CardDescription></CardHeader><CardContent className="space-y-3">{claims.length?claims.map((claim,i)=><details key={`${claim}-${i}`} className="rounded-xl border bg-white p-3"><summary className="cursor-pointer text-sm font-semibold">{claim}</summary><div className="mt-3 rounded-lg bg-[#edf7f8] p-3"><p className="text-xs font-bold uppercase tracking-wider text-[#147d91]">Defence question</p><p className="mt-1 font-serif">{defenceQuestions(claim,i)}</p></div></details>):<p className="text-sm text-slate-500">Paste or import a document and the vault will extract statements that are likely to invite academic challenge.</p>}</CardContent></Card><Card className="shadow-none"><CardHeader><CardTitle className="font-serif text-xl">Saved documents</CardTitle></CardHeader><CardContent className="space-y-2">{saved.length?saved.map((work,i)=><button key={`${work.saved}-${i}`} onClick={()=>load(work)} className="w-full rounded-xl border p-3 text-left hover:border-[#147d91]"><strong className="block text-sm">{work.title}</strong><small className="text-slate-500">Saved {new Date(work.saved).toLocaleDateString("en-GB")}</small></button>):<p className="text-sm text-slate-500">No saved work yet.</p>}</CardContent></Card></aside></section>
      <div className="mt-5 flex flex-wrap gap-2"><Button asChild><Link href="/written-work-defence">Build full defence map <ArrowRight/></Link></Button><Button asChild variant="outline"><Link href="/interview-room">Open Interview Room</Link></Button></div>
    </div>
  </main>
}

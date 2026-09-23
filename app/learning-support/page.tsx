"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { ArrowLeft, BookOpen, CheckCircle2, Languages, MessageSquareText } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const KEY="oxbridge-language-support-v1"
type Support={language:"English"|"Mandarin";bilingualGlossary:boolean;sentenceFrames:boolean;readAloud:boolean}
const defaults:Support={language:"English",bilingualGlossary:false,sentenceFrames:true,readAloud:false}

const glossary=[
  ["assumption","假设","A condition your reasoning depends on."],
  ["evidence","证据","Information that supports or challenges a claim."],
  ["counterexample","反例","A case that shows a general claim is not always true."],
  ["inference","推断","A conclusion drawn from evidence or earlier statements."],
  ["qualify a claim","限定论断","Make a claim more precise by stating when it does or does not apply."],
  ["provisional conclusion","暂定结论","A current conclusion that can change if new evidence appears."],
  ["justify","论证 / 说明理由","Explain why a step or conclusion follows."],
  ["evaluate","评估","Judge strengths, limitations and alternatives rather than only describe."],
]
const frames=[
  ["I would start by clarifying…","我会先澄清……"],
  ["The assumption I am making is…","我现在作出的假设是……"],
  ["That would follow if…","如果……成立，那么这个结论就成立。"],
  ["A counterexample might be…","一个可能的反例是……"],
  ["The evidence would make me revise…","这些证据会让我修改……"],
  ["I am not certain yet, but I would test…","我还不确定，但我会检验……"],
  ["My provisional conclusion is…","我的暂定结论是……"],
]

export default function LearningSupportPage(){
  const [support,setSupport]=useState<Support>(defaults);const [saved,setSaved]=useState(false)
  useEffect(()=>{try{const s=localStorage.getItem(KEY);if(s)setSupport({...defaults,...JSON.parse(s)})}catch{}},[])
  const update=<K extends keyof Support>(key:K,value:Support[K])=>{const next={...support,[key]:value};setSupport(next);localStorage.setItem(KEY,JSON.stringify(next));setSaved(true);setTimeout(()=>setSaved(false),1200)}
  const speak=(text:string)=>{if("speechSynthesis" in window){window.speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang=support.language==="Mandarin"?"zh-CN":"en-GB";window.speechSynthesis.speak(u)}}
  return <main className="min-h-screen bg-[#f6f8f8] text-[#172b3a]"><header className="border-b bg-white"><div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6"><Button asChild variant="ghost"><Link href="/student-home"><ArrowLeft/>Student Home</Link></Button><Badge variant="outline"><Languages className="size-3.5"/>Learning support</Badge></div></header><div className="mx-auto max-w-6xl px-4 py-8 sm:px-6"><section className="mb-6"><p className="text-xs font-bold uppercase tracking-[.18em] text-[#147d91]">EAL / Mandarin learning mode</p><h1 className="mt-2 font-serif text-4xl font-bold">Understand the reasoning language before practising it under pressure.</h1><p className="mt-2 max-w-3xl text-slate-600">Use bilingual terminology and sentence frames while learning. Formal mock conditions remain English by default because support in a live assessment depends on the adjustment actually approved for that assessment.</p></section><Alert className="mb-5"><Languages/><AlertTitle>Learning support is not an assessment entitlement.</AlertTitle><AlertDescription>The app separates learning scaffolds from formal mock conditions. Students should follow the university/test provider’s approved-access-arrangement rules for live assessments.</AlertDescription></Alert><section className="grid gap-5 lg:grid-cols-[.75fr_1.25fr]"><Card className="shadow-none"><CardHeader><CardTitle className="font-serif text-2xl">Support profile</CardTitle><CardDescription>Saved locally on this device.</CardDescription></CardHeader><CardContent className="space-y-3"><label className="block text-sm font-semibold">Learning language<select className="mt-1 w-full rounded-xl border bg-white px-3 py-2.5" value={support.language} onChange={e=>update("language",e.target.value as Support["language"])}><option>English</option><option>Mandarin</option></select></label><Toggle label="Bilingual academic glossary" checked={support.bilingualGlossary} onClick={()=>update("bilingualGlossary",!support.bilingualGlossary)}/><Toggle label="Interview sentence frames" checked={support.sentenceFrames} onClick={()=>update("sentenceFrames",!support.sentenceFrames)}/><Toggle label="Read-aloud support" checked={support.readAloud} onClick={()=>update("readAloud",!support.readAloud)}/>{saved&&<p className="flex items-center gap-2 text-sm text-emerald-700"><CheckCircle2 className="size-4"/>Saved</p>}</CardContent></Card><div className="space-y-4">{support.bilingualGlossary&&<Card className="shadow-none"><CardHeader><BookOpen className="size-6 text-[#147d91]"/><CardTitle className="font-serif text-2xl">Academic reasoning glossary</CardTitle></CardHeader><CardContent className="space-y-2">{glossary.map(([en,zh,def])=><div key={en} className="rounded-xl border p-3"><div className="flex flex-wrap items-center gap-2"><strong>{en}</strong><Badge variant="outline">{zh}</Badge>{support.readAloud&&<button className="text-xs font-semibold text-[#147d91]" onClick={()=>speak(support.language==="Mandarin"?zh:en)}>Hear</button>}</div><p className="mt-1 text-sm text-slate-500">{def}</p></div>)}</CardContent></Card>}{support.sentenceFrames&&<Card className="shadow-none"><CardHeader><MessageSquareText className="size-6 text-[#147d91]"/><CardTitle className="font-serif text-2xl">Think-aloud sentence frames</CardTitle><CardDescription>Use these to learn how to expose reasoning. Do not turn them into a memorised interview script.</CardDescription></CardHeader><CardContent className="space-y-2">{frames.map(([en,zh])=><button key={en} onClick={()=>support.readAloud&&speak(support.language==="Mandarin"?zh:en)} className="w-full rounded-xl border bg-white p-3 text-left"><strong className="block text-sm">{en}</strong>{support.language==="Mandarin"&&<p className="mt-1 text-sm text-[#147d91]">{zh}</p>}</button>)}</CardContent></Card>}<Card className="shadow-none"><CardHeader><CardTitle className="font-serif text-xl">Move from scaffold to independence</CardTitle></CardHeader><CardContent className="space-y-2 text-sm text-slate-600"><p>1. Learn the reasoning term bilingually.</p><p>2. Use a sentence frame in untimed practice.</p><p>3. Rephrase the same idea without the frame.</p><p>4. Attempt an English-only formal interview or test mode.</p></CardContent></Card></div></section></div></main>
}
function Toggle({label,checked,onClick}:{label:string;checked:boolean;onClick:()=>void}){return <button onClick={onClick} className={`flex w-full items-center justify-between rounded-xl border p-3 text-left ${checked?"border-[#147d91] bg-[#edf7f8]":"bg-white"}`}><span className="font-semibold">{label}</span><span className={`grid size-6 place-items-center rounded-full border ${checked?"border-[#147d91] bg-[#147d91] text-white":"border-slate-300"}`}>{checked&&<CheckCircle2 className="size-4"/>}</span></button>}

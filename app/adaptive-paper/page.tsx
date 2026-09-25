"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { ArrowLeft, ArrowRight, Check, FileText, RefreshCw, Target } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import type { TestName } from "@/lib/question-bank"
import { legacyHardenedQuestionBank } from "@/lib/question-bank-legacy-hardened"
import { reliableFullPaperQuestionBank } from "@/lib/full-paper-reliable-bank"
import { pathwayQuestionNote, questionsForSelectedPathway } from "@/lib/question-pathway"
import { choiceDiagnostic, prepareQuestionSet, questionQualitySignals } from "@/lib/question-quality"
import { auditQuestionReliability, repairQuestionReliability, reliabilityScore } from "@/lib/question-reliability"
import type { TestQuestion } from "@/lib/oxbridge-data"

type SectionScore={attempted:number;correct:number}
type P={sectionScores?:Record<string,SectionScore>;wrongQuestionIds?:string[];testAttempted?:number}
const EXPOSURE="oxbridge-question-exposure-v1"

function hash(seed:number,text:string){let h=seed|0;for(let i=0;i<text.length;i++)h=Math.imul(h^text.charCodeAt(i),16777619);return Math.abs(h)}
function stableSort(items:TestQuestion[],seed:number){return [...items].sort((a,b)=>{const reliability=reliabilityScore(b)-reliabilityScore(a);if(Math.abs(reliability)>=4)return reliability;const quality=questionQualitySignals(b).discriminationScore-questionQualitySignals(a).discriminationScore;if(Math.abs(quality)>0.15)return quality;return hash(seed,a.id)-hash(seed,b.id)})}
function questionSignature(prompt:string){return prompt.toLowerCase().replace(/\d+(?:\.\d+)?/g,"#").replace(/[^a-z#]+/g," ").replace(/\s+/g," ").trim()}

export default function AdaptivePaperPage(){
  const [test,setTest]=useState<TestName>("TMUA")
  const [course,setCourse]=useState("Physics")
  const [length,setLength]=useState(20)
  const [seed,setSeed]=useState(1)
  const [progress,setProgress]=useState<P>({})
  const [exposure,setExposure]=useState<string[]>([])
  const [answers,setAnswers]=useState<Record<string,number>>({})
  const [submitted,setSubmitted]=useState(false)

  useEffect(()=>{try{setProgress(JSON.parse(localStorage.getItem("oxbridge-tutor-progress-v2")||"{}"));setExposure(JSON.parse(localStorage.getItem(EXPOSURE)||"[]"));const profile=JSON.parse(localStorage.getItem("oxbridge-tutor-profile-v2")||"{}");if(profile.course)setCourse(String(profile.course))}catch{}},[])
  const bank=useMemo(()=>{
    const screened=[...reliableFullPaperQuestionBank,...legacyHardenedQuestionBank]
      .map(repairQuestionReliability)
      .filter(q=>auditQuestionReliability(q).blocking.length===0)
    return questionsForSelectedPathway(screened,test,course)
  },[test,course])
  const pathwayNote=pathwayQuestionNote(test,course)
  const sectionStats=useMemo(()=>{
    const sections=Array.from(new Set(bank.map(q=>q.section)))
    return sections.map(name=>{const s=progress.sectionScores?.[name];const acc=s?.attempted?Math.round(s.correct/s.attempted*100):null;return{name,accuracy:acc,attempted:s?.attempted??0}}).sort((a,b)=>(a.accuracy??-1)-(b.accuracy??-1))
  },[bank,progress.sectionScores])
  const weakSections=useMemo(()=>sectionStats.filter(s=>s.accuracy===null||s.accuracy<70).map(s=>s.name),[sectionStats])
  const secureSections=useMemo(()=>sectionStats.filter(s=>s.accuracy!==null&&s.accuracy>=70).map(s=>s.name),[sectionStats])

  const paper=useMemo(()=>{
    const unseen=bank.filter(q=>!exposure.includes(q.id))
    const source=unseen.length>=length?unseen:bank
    const weakCount=Math.round(length*.6), consolidationCount=Math.round(length*.2), challengeCount=length-weakCount-consolidationCount
    const weakPool=source.filter(q=>weakSections.includes(q.section))
    const consolidationPool=source.filter(q=>secureSections.includes(q.section)&&q.difficulty!=="Challenge")
    const challengePool=source.filter(q=>q.difficulty==="Challenge")
    const chosen:TestQuestion[]=[]
    const signatures=new Set<string>()
    const addUnique=(q:TestQuestion)=>{const signature=questionSignature(q.prompt);if(chosen.some(x=>x.id===q.id)||signatures.has(signature))return false;chosen.push(q);signatures.add(signature);return true}
    let added=0
    for(const q of stableSort(weakPool,seed+11)){if(added>=weakCount)break;if(addUnique(q))added++}
    added=0
    for(const q of stableSort(consolidationPool,seed+23)){if(added>=consolidationCount)break;if(addUnique(q))added++}
    added=0
    for(const q of stableSort(challengePool,seed+37)){if(added>=challengeCount)break;if(addUnique(q))added++}
    for(const q of stableSort(source,seed+51)){if(chosen.length>=length)break;addUnique(q)}
    return prepareQuestionSet(chosen.slice(0,length),seed*104729+test.length*7919)
  },[bank,exposure,length,seed,weakSections,secureSections,test])

  const correct=submitted?paper.filter(q=>answers[q.id]===q.answer).length:0
  const submit=()=>{
    setSubmitted(true)
    const nextExposure=Array.from(new Set([...exposure,...paper.map(q=>q.id)])).slice(-5000)
    setExposure(nextExposure);localStorage.setItem(EXPOSURE,JSON.stringify(nextExposure))
    try{const p=JSON.parse(localStorage.getItem("oxbridge-tutor-progress-v2")||"{}");p.fullPapersCompleted=Number(p.fullPapersCompleted??0)+1;localStorage.setItem("oxbridge-tutor-progress-v2",JSON.stringify(p))}catch{}
  }
  const regenerate=()=>{setSeed(s=>s+1);setAnswers({});setSubmitted(false)}

  return <main className="min-h-screen bg-[#f6f8f8] text-[#172b3a]">
    <header className="border-b bg-white"><div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6"><Button asChild variant="ghost"><Link href="/student-home"><ArrowLeft/>Student Home</Link></Button><Badge variant="outline"><Target className="size-3.5"/>Adaptive paper</Badge></div></header><div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <section className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-end"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#147d91]">Weakness-weighted paper generator</p><h1 className="mt-2 font-serif text-4xl font-bold">Practise the exact reasoning that needs work.</h1><p className="mt-2 max-w-3xl text-slate-600">Papers target approximately 60% weak areas, 20% consolidation and 20% challenge. Every generated paper rejects repeated prompt structures, repairs equivalent numerical options, removes blocking reliability failures and prioritises stronger questions before using your performance weighting. {pathwayNote??"Practice remains linked to your selected test and course."}</p></div><div className="flex flex-wrap gap-2"><select className="rounded-xl border bg-white px-3 py-2" value={test} onChange={e=>{setTest(e.target.value as TestName);setAnswers({});setSubmitted(false)}}>{(["TMUA","ESAT","TARA","LNAT","UCAT"] as TestName[]).map(x=><option key={x}>{x}</option>)}</select><select className="rounded-xl border bg-white px-3 py-2" value={length} onChange={e=>{setLength(Number(e.target.value));setAnswers({});setSubmitted(false)}}>{[10,20,30,40].map(x=><option key={x} value={x}>{x} questions</option>)}</select></div></section>

      <section className="mb-5 grid gap-4 sm:grid-cols-4"><Metric label="Weak-area target" value="60%" note={weakSections.length?weakSections.slice(0,2).join(" · "):"Building baseline"}/><Metric label="Consolidation" value="20%" note={secureSections.length?secureSections.slice(0,2).join(" · "):"No secure sections yet"}/><Metric label="Challenge" value="20%" note="Higher-discrimination transfer"/><Metric label="Question exposure" value={String(exposure.length)} note="Unique bank items previously served"/></section>

      <Card className="shadow-none"><CardHeader><div className="flex items-center justify-between gap-3"><div><CardTitle className="font-serif text-2xl">{test} adaptive paper</CardTitle><CardDescription>{paper.length} questions · seed {seed} · reliability screened · no repeated prompt structures</CardDescription></div><Button variant="outline" onClick={regenerate}><RefreshCw/>Fresh paper</Button></div></CardHeader><CardContent className="space-y-5">{paper.map((q,i)=>{const selected=answers[q.id];const diagnostic=submitted&&selected!==undefined?choiceDiagnostic(q,selected):null;return <div key={q.id} className="rounded-2xl border bg-white p-4"><div className="mb-3 flex flex-wrap gap-2"><Badge>{i+1}</Badge><Badge variant="outline">{q.section}</Badge><Badge variant="outline">{q.difficulty}</Badge><Badge variant="outline">Reliability {reliabilityScore(q)}/100</Badge>{!exposure.includes(q.id)&&<Badge variant="outline">Unseen</Badge>}</div><p className="whitespace-pre-line font-serif text-lg leading-relaxed">{q.prompt}</p><div className="mt-3 grid gap-2">{q.options.map((opt,j)=>{const chosen=answers[q.id]===j;const cls=submitted?(j===q.answer?"border-emerald-500 bg-emerald-50":chosen?"border-amber-400 bg-amber-50":""):chosen?"border-[#147d91] bg-[#edf7f8]":"";return <button disabled={submitted} key={`${q.id}-${j}`} onClick={()=>setAnswers(a=>({...a,[q.id]:j}))} className={`rounded-xl border p-3 text-left text-sm ${cls}`}><strong className="mr-2">{String.fromCharCode(65+j)}.</strong>{opt}{submitted&&j===q.answer&&<Check className="ml-2 inline size-4 text-emerald-700"/>}</button>})}</div>{diagnostic&&<div className={`mt-3 rounded-xl border p-3 text-sm leading-relaxed ${selected===q.answer?"border-emerald-200 bg-emerald-50":"border-amber-200 bg-amber-50"}`}><strong>{diagnostic.label}</strong><p className="mt-1 text-slate-600">{diagnostic.feedback}</p></div>}</div>})}</CardContent></Card>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3"><Button onClick={submit} disabled={submitted||Object.keys(answers).length===0}><FileText/>Finish & review</Button>{submitted&&<div className="flex items-center gap-3"><strong className="text-xl">{correct}/{paper.length}</strong><Progress className="w-40" value={paper.length?correct/paper.length*100:0}/><Button asChild variant="outline"><Link href="/reasoning-lab">Review reasoning patterns <ArrowRight/></Link></Button></div>}</div>
    </div>
  </main>
}

function Metric({label,value,note}:{label:string;value:string;note:string}){return <Card className="shadow-none"><CardHeader className="pb-2"><CardDescription>{label}</CardDescription><CardTitle className="font-serif text-3xl">{value}</CardTitle></CardHeader><CardContent><p className="text-xs text-slate-500">{note}</p></CardContent></Card>}

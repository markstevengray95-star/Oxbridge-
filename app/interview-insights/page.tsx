"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { ArrowLeft, ArrowRight, BookOpenCheck, CalendarClock, GraduationCap, RotateCcw, TrendingUp } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { InterviewEvidenceReview } from "@/components/interview-evidence-review"
import { PROGRESS_KEY } from "@/lib/personal-tutor"
import { buildEvidenceLinkedFeedback, extractInsightSnapshots, transcriptFromEvents, type EvidenceLinkedFeedback, type InsightSnapshot } from "@/lib/interview-feedback-intelligence"

type SavedInterviewLog = {id?:string;title?:string;date?:string;events?:string[];feedbackReport?:EvidenceLinkedFeedback}
type FeedbackHistoryItem = {id:string;title:string;date:string;report:EvidenceLinkedFeedback;saved:boolean}
function fromProgress():FeedbackHistoryItem[]{
  try{
    const raw=JSON.parse(localStorage.getItem(PROGRESS_KEY)||"{}") as {logs?:SavedInterviewLog[]}
    const logs=Array.isArray(raw.logs)?raw.logs:[]
    const previous=extractInsightSnapshots(logs)
    return logs.slice(0,75).flatMap((item,index):FeedbackHistoryItem[]=>{
      if(!item||typeof item!=="object"||typeof item.title!=="string"||!/interview|gemini live/i.test(item.title))return []
      const id=typeof item.id==="string"?item.id:"legacy-"+index
      const date=typeof item.date==="string"?item.date:""
      if(item.feedbackReport?.version==="phase8.1"){
        return [{id,title:item.title,date,report:item.feedbackReport,saved:true}]
      }
      const turns=transcriptFromEvents(item.events)
      if(!turns.some(turn=>turn.role==="candidate"))return []
      const course=item.title.replace(/^(?:Reasoning Interview|Interview Room|AI Interview|Gemini Live Next)\s*·\s*/i,"").trim()||"Unspecified course"
      // Historic sessions do not have reliable classification or calibrated
      // marking data. Reconstruct transcript-only habits without pretending
      // old records have new assessment evidence.
      const report=buildEvidenceLinkedFeedback({sessionId:id,course,source:"saved",createdAt:date||undefined,turns,previous})
      return [{id,title:item.title,date,report,saved:false}]
    })
  }catch{return []}
}
function pct(part:number,total:number){return total>0?Math.round(part/total*100)+"%":"—"}
function displayDate(value:string){const date=Date.parse(value);return Number.isFinite(date)?new Date(date).toLocaleDateString("en-GB"):"Earlier session"}

export default function InterviewInsightsPage(){
  const [history,setHistory]=useState<FeedbackHistoryItem[]>([])
  const [selectedId,setSelectedId]=useState("")
  const [courseFilter,setCourseFilter]=useState("all")
  useEffect(()=>{const next=fromProgress();setHistory(next);setSelectedId(next[0]?.id||"")},[])
  const courses=useMemo(()=>[...new Set(history.map(item=>item.report.course))].sort(),[history])
  const filtered=history.filter(item=>courseFilter==="all"||item.report.course===courseFilter)
  const selected=filtered.find(item=>item.id===selectedId)||filtered[0]
  const reliable=filtered.filter(item=>item.saved&&item.report.snapshot.answerCount>=3)
  const reasoning= reliable.length?Math.round(reliable.reduce((sum,item)=>sum+item.report.snapshot.reasonedCount,0)*100/reliable.reduce((sum,item)=>sum+item.report.snapshot.answerCount,0)):null
  const testing= reliable.length?Math.round(reliable.reduce((sum,item)=>sum+item.report.snapshot.testedCount,0)*100/reliable.reduce((sum,item)=>sum+item.report.snapshot.answerCount,0)):null
  return <main className="min-h-screen bg-[#f4f7f7] text-[#172b3a]"><div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><Button asChild variant="ghost"><Link href="/study/progress"><ArrowLeft/>My Progress</Link></Button><Badge variant="outline"><GraduationCap className="size-4"/>Phase 8 · evidence-linked feedback</Badge></div>
    <section className="rounded-2xl bg-[#102a43] p-7 text-white sm:p-9"><div className="flex items-center gap-2 text-[#8dd7de]"><TrendingUp className="size-5"/><strong className="text-xs uppercase tracking-wider">Your interview development</strong></div><h1 className="mt-3 font-serif text-4xl font-bold">See what improved, and where to focus next.</h1><p className="mt-3 max-w-3xl text-sm leading-7 text-white/75">Read feedback tied to your exact interview answers. Progress is compared only for the same course and interview mode with sufficient responses. These are practice habits, not estimates of your admission chances.</p></section>
    {!history.length?<Card><CardHeader><BookOpenCheck className="size-6 text-[#147d91]"/><CardTitle>No interview feedback on this device yet</CardTitle><CardDescription>Finish a formal, reasoning or Gemini Live interview. Phase 8 feedback will be saved with that session, and earlier locally saved interview transcripts can also be reviewed.</CardDescription></CardHeader><CardContent><Button asChild><Link href="/full-mock-interview">Start a mock interview <ArrowRight/></Link></Button></CardContent></Card>:<>
      <div className="flex flex-wrap items-center gap-3"><label className="text-sm font-semibold" htmlFor="insight-course">Course</label><select id="insight-course" value={courseFilter} onChange={event=>{setCourseFilter(event.target.value);setSelectedId("")}} className="rounded-xl border bg-white px-3 py-2 text-sm"><option value="all">All courses</option>{courses.map(course=><option key={course} value={course}>{course}</option>)}</select><p className="text-xs text-slate-600">Only interviews stored in this browser are included. Other devices and teacher dashboards do not sync here yet.</p></div>
      <div className="grid gap-3 sm:grid-cols-3"><Card><CardContent className="p-5"><p className="text-xs font-semibold text-slate-500">Interview records</p><p className="mt-2 text-3xl font-bold">{filtered.length}</p></CardContent></Card><Card><CardContent className="p-5"><p className="text-xs font-semibold text-slate-500">Explicit reasoning, recent supported records</p><p className="mt-2 text-3xl font-bold">{reasoning===null?"—":reasoning+"%"}</p><p className="mt-1 text-xs text-slate-500">Share of answers showing a reasoning link; not correctness</p></CardContent></Card><Card><CardContent className="p-5"><p className="text-xs font-semibold text-slate-500">Checks and evidence mentioned</p><p className="mt-2 text-3xl font-bold">{testing===null?"—":testing+"%"}</p><p className="mt-1 text-xs text-slate-500">Share of answers describing a check; not an academic mark</p></CardContent></Card></div>
      <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="space-y-3"><Card className="shadow-none"><CardHeader><CardTitle className="font-serif text-xl">Saved sessions</CardTitle><CardDescription>Choose an interview for detailed feedback.</CardDescription></CardHeader><CardContent className="space-y-2">{filtered.map(item=><button key={item.id} type="button" onClick={()=>setSelectedId(item.id)} className={"w-full rounded-xl border p-3 text-left "+(selected?.id===item.id?"border-[#147d91] bg-[#edf7f8]":"bg-white")}><strong className="block text-sm">{item.report.course}</strong><span className="mt-1 block text-xs text-slate-500">{displayDate(item.date)} · {item.report.answerCount} answers</span><span className="mt-1 block text-xs text-slate-500">{item.saved?"Full evidence report":"Reconstructed from saved transcript"}</span></button>)}</CardContent></Card></aside>
        <div className="space-y-4">{selected?<><Card className="shadow-none"><CardContent className="flex flex-wrap items-center justify-between gap-3 p-5"><div><p className="text-xs font-bold uppercase text-[#147d91]">{selected.report.source} interview</p><h2 className="mt-1 font-serif text-2xl font-bold">{selected.title}</h2><p className="text-xs text-slate-500">Saved {displayDate(selected.date)}. {pct(selected.report.snapshot.reasonedCount,selected.report.answerCount)} of answers used an explicit reasoning link.</p></div><Button asChild size="sm" variant="outline"><Link href="/interview-replay"><RotateCcw/>Retry a moment</Link></Button></CardContent></Card><InterviewEvidenceReview report={selected.report}/></>:<Card><CardContent className="p-6 text-sm text-slate-500">No matching interviews.</CardContent></Card>}</div>
      </div>
      <Card className="shadow-none"><CardContent className="flex items-start gap-3 p-5"><CalendarClock className="mt-1 size-5 shrink-0 text-[#147d91]"/><p className="text-xs leading-6 text-slate-600">Confidence and correctness require a substantive check of each claim against the actual academic task. Phrase-matched reasoning habits can miss valid alternative language and can be imitated without good reasoning. For meaningful improvement, retry an earlier weak moment and attempt a different problem after a delay. This history is local to the current device until account-level sync is implemented.</p></CardContent></Card>
    </>}
  </div></main>
}

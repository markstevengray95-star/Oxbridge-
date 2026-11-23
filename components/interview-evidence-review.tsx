"use client"

import Link from "next/link"
import { ArrowRight, BookOpenCheck, CheckCircle2, CircleAlert, RotateCcw, TrendingUp } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { EvidenceLinkedFeedback, InsightEvidence } from "@/lib/interview-feedback-intelligence"

function evidenceItem(item: InsightEvidence) {
  return <div key={item.kind+":"+item.turnIndex} className="rounded-xl border border-[#dbe5e7] bg-white p-3">
    <div className="flex flex-wrap items-center justify-between gap-2"><strong className="text-sm">{item.kind==="revision"?"Explicit revision":item.kind==="recovery"?"Possible recovery":item.kind==="strength"?"Observed strength":"Area to check"}</strong><Badge variant="outline">Transcript turn {item.turnIndex+1}</Badge></div>
    <p className="mt-2 whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-sm leading-6">“{item.quote}”</p>
    <p className="mt-2 text-xs leading-5 text-slate-600">{item.observation}</p>
    <p className="mt-1 text-[11px] text-slate-500">{item.certainty==="classified"?"Based on software answer classification":"Directly observable in the written transcript"}</p>
  </div>
}
export function InterviewEvidenceReview({report,compact=false}:{report:EvidenceLinkedFeedback;compact?:boolean}){
  const comparison=report.comparison
  return <section className="space-y-5" aria-label="Evidence-linked interview feedback">
    <Card className="border-[#cfe1e4] bg-white shadow-none"><CardHeader><div className="flex flex-wrap items-center gap-2"><BookOpenCheck className="size-5 text-[#147d91]"/><CardTitle className="font-serif text-2xl">Feedback with transcript evidence</CardTitle><Badge variant="outline">Evidence {report.confidence}</Badge></div><CardDescription>{report.answerCount} candidate answers, {report.ratedAnswerCount} with software classifications. Every quotation below is from this saved interview. This is a practice analysis, not a university admissions result.</CardDescription></CardHeader><CardContent><div className="grid gap-3 sm:grid-cols-3">{[
      {label:"Explained reasoning",value:report.snapshot.reasonedCount},
      {label:"Proposed checks",value:report.snapshot.testedCount},
      {label:"Explicit revisions",value:report.snapshot.revisionCount},
    ].map(stat=><div key={stat.label} className="rounded-xl bg-slate-50 p-4"><p className="text-xs font-semibold text-slate-500">{stat.label}</p><p className="mt-1 text-2xl font-bold text-[#147d91]">{stat.value}<span className="ml-1 text-sm font-normal text-slate-500">/ {report.answerCount}</span></p></div>)}</div><p className="mt-3 text-xs leading-5 text-slate-600">{report.note}</p></CardContent></Card>
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="shadow-none"><CardHeader><div className="flex items-center gap-2"><CheckCircle2 className="size-5 text-emerald-700"/><CardTitle className="font-serif text-xl">Where your reasoning was visible</CardTitle></div></CardHeader><CardContent className="space-y-3">{report.strengths.length?report.strengths.map(evidenceItem):<p className="text-sm text-slate-600">Not enough explicit supporting evidence was recorded to identify a strength confidently.</p>}</CardContent></Card>
      <Card className="shadow-none"><CardHeader><div className="flex items-center gap-2"><CircleAlert className="size-5 text-amber-700"/><CardTitle className="font-serif text-xl">Specific points to improve</CardTitle></div></CardHeader><CardContent className="space-y-3">{report.improvements.length?report.improvements.map(evidenceItem):<p className="text-sm text-slate-600">No supported recurring weakness can be identified from this short transcript. Try a fresh question before drawing a conclusion.</p>}</CardContent></Card>
    </div>
    {(report.revisions.length>0||report.recoveries.length>0)?<Card className="shadow-none"><CardHeader><div className="flex items-center gap-2"><RotateCcw className="size-5 text-[#147d91]"/><CardTitle className="font-serif text-xl">How your argument changed</CardTitle></div><CardDescription>Revisions and recovery are useful evidence of an evolving argument, not proof that the final academic answer was correct.</CardDescription></CardHeader><CardContent className="grid gap-3 lg:grid-cols-2">{[...report.revisions,...report.recoveries].map(evidenceItem)}</CardContent></Card>:null}
    <Card className="shadow-none"><CardHeader><CardTitle className="font-serif text-xl">Your next three practice steps</CardTitle><CardDescription>Each task has a visible success criterion. Retry the exact moment first, then apply the skill to unfamiliar material.</CardDescription></CardHeader><CardContent className="grid gap-3 lg:grid-cols-3">{report.priorities.map((priority,i)=><div key={priority.target} className="rounded-xl border p-4"><p className="text-xs font-bold uppercase tracking-wider text-[#147d91]">Priority {i+1}{priority.evidenceTurn!==null?" · turn "+(priority.evidenceTurn+1):""}</p><h3 className="mt-2 font-semibold">{priority.target}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{priority.task}</p><p className="mt-3 rounded-lg bg-[#edf7f8] p-3 text-xs leading-5"><strong>You'll know it worked when:</strong> {priority.successCriterion}</p></div>)}</CardContent></Card>
    {!compact?<Card className="shadow-none"><CardHeader><div className="flex items-center gap-2"><TrendingUp className="size-5 text-[#147d91]"/><CardTitle className="font-serif text-xl">Progress between interviews</CardTitle></div></CardHeader><CardContent>{comparison.status==="comparable"?<><p className="text-sm text-slate-600">{comparison.explanation}</p><div className="mt-3 grid gap-3 sm:grid-cols-2">{[["Explicit reasoning",comparison.reasoningChange],["Checks and evidence",comparison.testingChange]].map(([label,value])=><div key={String(label)} className="rounded-xl bg-slate-50 p-4"><p className="text-sm font-semibold">{label}</p><p className="mt-2 text-2xl font-bold">{typeof value==="number"?(value>0?"+":"")+value+" percentage points":"Not available"}</p></div>)}</div><p className="mt-3 text-xs text-slate-500">Comparison is with your most recent earlier session in the same course and interview mode: {new Date(comparison.earlier!.createdAt).toLocaleDateString("en-GB")}. These are observed language habits, not academic accuracy scores.</p></>:<p className="text-sm leading-6 text-slate-600">{comparison.explanation}</p>}<Button asChild size="sm" variant="outline" className="mt-3"><Link href="/interview-insights">Open your interview development history <ArrowRight className="size-4"/></Link></Button></CardContent></Card>:null}
  </section>
}

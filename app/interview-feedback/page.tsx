"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { ArrowLeft, Brain, CheckCircle2, RefreshCw, Target } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import { analyseInterviewAnswer } from "@/lib/feedback-engine"

const PROGRESS_KEY = "oxbridge-tutor-progress-v2"

type Log = { id?: string; title?: string; score?: number; date?: string; events?: string[] }
type Exchange = { question: string; answer: string }

function parseExchanges(events: string[]) {
  const exchanges: Exchange[] = []
  let currentQuestion = ""
  for (const event of events) {
    if (event.startsWith("Interviewer: ")) currentQuestion = event.slice("Interviewer: ".length)
    if (event.startsWith("Candidate: ")) exchanges.push({ question: currentQuestion || "Interview question", answer: event.slice("Candidate: ".length).split(" | Feedback: ")[0] })
  }
  return exchanges.filter(item => item.answer.trim())
}

export default function InterviewFeedbackPage() {
  const [logs, setLogs] = useState<Log[]>([])
  const [selectedId, setSelectedId] = useState("")
  const [revision, setRevision] = useState("")

  useEffect(() => {
    try {
      const progress = JSON.parse(localStorage.getItem(PROGRESS_KEY) || "{}") as { logs?: Log[] }
      const interviews = (Array.isArray(progress.logs) ? progress.logs : []).filter(log => /interview/i.test(log.title ?? "") && Array.isArray(log.events))
      setLogs(interviews)
      if (interviews[0]?.id) setSelectedId(interviews[0].id)
    } catch {
      setLogs([])
    }
  }, [])

  const selected = logs.find(log => log.id === selectedId) ?? logs[0]
  const exchanges = useMemo(() => parseExchanges(selected?.events ?? []), [selected])
  const analysed = useMemo(() => exchanges.map((exchange, index) => ({ ...exchange, index, feedback: analyseInterviewAnswer(exchange.answer) })), [exchanges])
  const overall = analysed.length ? Math.round(analysed.reduce((sum, item) => sum + item.feedback.score, 0) / analysed.length) : 0
  const targets = useMemo(() => {
    const counts = new Map<string, number>()
    analysed.forEach(item => counts.set(item.feedback.dominantTarget, (counts.get(item.feedback.dominantTarget) ?? 0) + 1))
    return [...counts.entries()].sort((a, b) => b[1] - a[1])
  }, [analysed])
  const revisionFeedback = useMemo(() => revision.trim() ? analyseInterviewAnswer(revision) : null, [revision])

  if (!selected) return <main className="min-h-screen bg-slate-50 text-slate-950"><div className="mx-auto max-w-5xl px-4 py-10"><Button asChild variant="ghost"><Link href="/interviews"><ArrowLeft />Interview Hub</Link></Button><Card className="mt-6 shadow-none"><CardHeader><CardTitle className="font-serif text-3xl">Complete an interview to unlock structured answer feedback.</CardTitle><CardDescription>The review reads the candidate turns saved by Formal Interview, AI Interview and Gemini Live sessions.</CardDescription></CardHeader><CardContent><Button asChild><Link href="/interviews">Start an interview</Link></Button></CardContent></Card></div></main>

  return <main className="min-h-screen bg-[#f5f7f7] text-[#172b3a]">
    <header className="border-b bg-white"><div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4"><Button asChild variant="ghost"><Link href="/interviews"><ArrowLeft />Interview Hub</Link></Button><Badge variant="outline"><Brain className="size-3.5" />Structured answer review</Badge></div></header>
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8">
      <section className="grid gap-5 lg:grid-cols-[1.2fr_.8fr]"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#147d91]">Interview answer analysis</p><h1 className="mt-2 font-serif text-4xl font-bold">See how each answer was built.</h1><p className="mt-3 max-w-3xl text-slate-600">This review focuses on observable reasoning behaviour: whether you made the chain explicit, surfaced assumptions, tested alternatives, used precise language and communicated the thinking clearly. It is a practice tool, not an admissions prediction.</p></div><Card className="border-0 bg-[#102a43] text-white shadow-none"><CardHeader><CardDescription className="text-white/60">Session practice signal</CardDescription><CardTitle className="font-serif text-5xl">{overall}<span className="text-xl text-white/40">/100</span></CardTitle><CardDescription className="text-white/60">{selected.title} · {analysed.length} candidate answers</CardDescription></CardHeader></Card></section>

      {logs.length > 1 && <div className="flex flex-wrap gap-2">{logs.slice(0, 8).map(log => <Button key={log.id} size="sm" variant={(log.id ?? "") === selectedId ? "default" : "outline"} onClick={() => { setSelectedId(log.id ?? ""); setRevision("") }}>{log.title} · {log.date}</Button>)}</div>}

      <Card className="shadow-none"><CardHeader><CardTitle className="font-serif text-2xl">Recurring pattern</CardTitle><CardDescription>The most common lowest-scoring behaviour across this interview.</CardDescription></CardHeader><CardContent className="grid gap-3 md:grid-cols-3">{targets.slice(0, 3).map(([label, count], index) => <div key={label} className={index === 0 ? "rounded-2xl border border-amber-200 bg-amber-50 p-4" : "rounded-2xl border bg-white p-4"}><Badge variant="outline">{count} answer{count === 1 ? "" : "s"}</Badge><p className="mt-2 font-serif text-xl font-bold">{label}</p><p className="mt-2 text-sm text-slate-600">Use the answer-by-answer review below to see exactly where this pattern appeared and what to do next.</p></div>)}</CardContent></Card>

      <section className="space-y-5">{analysed.map((item, answerIndex) => <Card key={`${item.index}-${item.answer.slice(0, 20)}`} className="shadow-none"><CardHeader><div className="flex flex-wrap items-center justify-between gap-2"><Badge>Answer {answerIndex + 1}</Badge><Badge variant="outline">Practice signal {item.feedback.score}/100</Badge></div><CardTitle className="font-serif text-xl leading-7">{item.question}</CardTitle></CardHeader><CardContent className="space-y-5"><div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs font-bold uppercase tracking-wider text-slate-500">Your answer</p><p className="mt-2 text-sm leading-7">{item.answer}</p></div><div className="grid gap-3 lg:grid-cols-5">{item.feedback.dimensions.map(dimension => <div key={dimension.label} className="rounded-xl border bg-white p-3"><div className="flex justify-between gap-2 text-xs font-bold"><span>{dimension.label}</span><span>{dimension.score}</span></div><Progress value={dimension.score} className="mt-2" /><p className="mt-2 text-xs leading-5 text-slate-500">{dimension.evidence}</p></div>)}</div><div className="grid gap-4 md:grid-cols-2"><div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4"><p className="font-bold text-emerald-900">What worked</p><div className="mt-2 space-y-2">{item.feedback.strengths.map(strength => <p key={strength} className="flex gap-2 text-sm leading-6 text-emerald-900"><CheckCircle2 className="mt-1 size-4 shrink-0" />{strength}</p>)}</div></div><div className="rounded-2xl border border-amber-200 bg-amber-50 p-4"><p className="font-bold text-amber-950">Improve next</p><div className="mt-2 space-y-2">{item.feedback.improvements.map(improvement => <p key={improvement} className="flex gap-2 text-sm leading-6 text-amber-950"><Target className="mt-1 size-4 shrink-0" />{improvement}</p>)}</div></div></div><div className="rounded-xl bg-[#edf7f8] p-4"><strong>Best next move:</strong> {item.feedback.nextMove}</div></CardContent></Card>)}</section>

      {analysed[0] && <Card className="shadow-none"><CardHeader><CardTitle className="font-serif text-2xl">Re-answer challenge</CardTitle><CardDescription>Rewrite one answer using the feedback, then compare the reasoning profile before and after.</CardDescription></CardHeader><CardContent className="space-y-4"><p className="font-serif text-lg font-semibold">{analysed[0].question}</p><Textarea rows={7} value={revision} onChange={event => setRevision(event.target.value)} placeholder="Give a stronger version of your answer…" />{revisionFeedback && <div className="grid gap-3 md:grid-cols-2"><div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs uppercase tracking-wider text-slate-500">Original</p><p className="mt-1 font-serif text-3xl font-bold">{analysed[0].feedback.score}</p></div><div className={revisionFeedback.score >= analysed[0].feedback.score ? "rounded-2xl border border-emerald-200 bg-emerald-50 p-4" : "rounded-2xl border border-amber-200 bg-amber-50 p-4"}><p className="text-xs uppercase tracking-wider text-slate-500">Revised</p><p className="mt-1 font-serif text-3xl font-bold">{revisionFeedback.score}</p><p className="mt-2 text-sm">{revisionFeedback.nextMove}</p></div></div>}<Button variant="outline" onClick={() => setRevision("")}><RefreshCw />Clear revision</Button></CardContent></Card>}
    </div>
  </main>
}

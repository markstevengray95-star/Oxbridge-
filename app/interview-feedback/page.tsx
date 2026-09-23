"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { ArrowLeft, Brain, CheckCircle2, Loader2, RefreshCw, Target } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import { analyseInterviewAnswer } from "@/lib/feedback-engine"

const PROGRESS_KEY = "oxbridge-tutor-progress-v2"

type Log = { id?: string; title?: string; score?: number; date?: string; events?: string[] }
type Exchange = { question: string; answer: string }
type Dimension = { label: string; score: number; evidence: string; action: string }
type AnswerFeedback = { index: number; question: string; answer: string; score: number; strengths: string[]; improvements: string[]; dimensions: Dimension[]; nextMove: string; dominantTarget: string }
type SessionFeedback = { overallSummary: string; recurringStrengths: string[]; recurringWeaknesses: string[]; priorityTarget: string; nextInterviewPlan: string[]; answers: AnswerFeedback[] }

function parseExchanges(events: string[]) {
  const exchanges: Exchange[] = []
  let currentQuestion = ""
  for (const event of events) {
    if (event.startsWith("Interviewer: ")) currentQuestion = event.slice("Interviewer: ".length)
    if (event.startsWith("Candidate: ")) exchanges.push({ question: currentQuestion || "Interview question", answer: event.slice("Candidate: ".length).split(" | Feedback: ")[0] })
  }
  return exchanges.filter(item => item.answer.trim())
}

function localSession(exchanges: Exchange[]): SessionFeedback {
  const answers = exchanges.map((exchange, index) => ({ index, ...exchange, ...analyseInterviewAnswer(exchange.answer) }))
  const counts = new Map<string, number>()
  answers.forEach(item => counts.set(item.dominantTarget, (counts.get(item.dominantTarget) ?? 0) + 1))
  const weaknesses = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([label]) => label).slice(0, 3)
  return {
    overallSummary: `This session contains ${answers.length} analysable candidate answer${answers.length === 1 ? "" : "s"}. The review focuses on the reasoning visible in those answers, not an admissions outcome.`,
    recurringStrengths: answers.flatMap(item => item.strengths).slice(0, 3),
    recurringWeaknesses: weaknesses,
    priorityTarget: weaknesses[0] ?? "Reasoning chain",
    nextInterviewPlan: ["State the observation and principle before the conclusion.", "Name one key assumption explicitly.", "Stress-test the answer with a counterexample, limiting case or alternative explanation."],
    answers,
  }
}

export default function InterviewFeedbackPage() {
  const [logs, setLogs] = useState<Log[]>([])
  const [selectedId, setSelectedId] = useState("")
  const [revision, setRevision] = useState("")
  const [analysis, setAnalysis] = useState<SessionFeedback | null>(null)
  const [provider, setProvider] = useState<"gemini" | "local" | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    try {
      const progress = JSON.parse(localStorage.getItem(PROGRESS_KEY) || "{}") as { logs?: Log[] }
      const interviews = (Array.isArray(progress.logs) ? progress.logs : []).filter(log => /interview/i.test(log.title ?? "") && Array.isArray(log.events))
      setLogs(interviews)
      if (interviews[0]?.id) setSelectedId(interviews[0].id)
    } catch { setLogs([]) }
  }, [])

  const selected = logs.find(log => log.id === selectedId) ?? logs[0]
  const exchanges = useMemo(() => parseExchanges(selected?.events ?? []), [selected])
  const fallback = useMemo(() => localSession(exchanges), [exchanges])
  const active = analysis ?? fallback
  const overall = active.answers.length ? Math.round(active.answers.reduce((sum, item) => sum + item.score, 0) / active.answers.length) : 0
  const revisionFeedback = useMemo(() => revision.trim() ? analyseInterviewAnswer(revision) : null, [revision])

  useEffect(() => {
    if (!selected || !exchanges.length) { setAnalysis(null); return }
    let cancelled = false
    setAnalysis(null)
    setProvider(null)
    setLoading(true)
    fetch("/api/interview-feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ course: selected.title ?? "Oxbridge interview", sessionTitle: selected.title, exchanges }),
    }).then(async response => {
      const data = await response.json() as { analysis?: SessionFeedback; provider?: "gemini" | "local" }
      if (cancelled) return
      if (data.analysis) setAnalysis(data.analysis)
      setProvider(data.provider ?? "local")
    }).catch(() => { if (!cancelled) setProvider("local") }).finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [selectedId, selected, exchanges])

  if (!selected) return <main className="min-h-screen bg-slate-50 text-slate-950"><div className="mx-auto max-w-5xl px-4 py-10"><Button asChild variant="ghost"><Link href="/interviews"><ArrowLeft />Interview Hub</Link></Button><Card className="mt-6 shadow-none"><CardHeader><CardTitle className="font-serif text-3xl">Complete an interview to unlock structured answer feedback.</CardTitle><CardDescription>The review reads candidate turns saved by your interview modes, then analyses each answer separately and across the whole session.</CardDescription></CardHeader><CardContent><Button asChild><Link href="/interviews">Start an interview</Link></Button></CardContent></Card></div></main>

  return <main className="min-h-screen bg-[#f5f7f7] text-[#172b3a]">
    <header className="border-b bg-white"><div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4"><Button asChild variant="ghost"><Link href="/interviews"><ArrowLeft />Interview Hub</Link></Button><div className="flex items-center gap-2"><Badge variant="outline"><Brain className="size-3.5" />Structured answer review</Badge>{loading && <Badge variant="outline"><Loader2 className="size-3.5 animate-spin" />Analysing</Badge>}</div></div></header>

    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8">
      <section className="grid gap-5 lg:grid-cols-[1.2fr_.8fr]"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#147d91]">Interview answer analysis</p><h1 className="mt-2 font-serif text-4xl font-bold">Feedback on every answer, not just one overall score.</h1><p className="mt-3 max-w-3xl text-slate-600">Each response is reviewed for reasoning chain, relevance, assumptions, evidence/testing, precision, adaptability and communication. Gemini provides the detailed review when available, with the built-in reasoning engine as a fallback.</p></div><Card className="border-0 bg-[#102a43] text-white shadow-none"><CardHeader><div className="flex items-center justify-between gap-2"><div><CardDescription className="text-white/60">Session practice signal</CardDescription><CardTitle className="font-serif text-5xl">{overall}<span className="text-xl text-white/40">/100</span></CardTitle></div>{provider && <Badge className="bg-white/10 text-white">{provider === "gemini" ? "AI review" : "Built-in review"}</Badge>}</div><CardDescription className="text-white/60">{selected.title} · {active.answers.length} candidate answers</CardDescription></CardHeader></Card></section>

      {logs.length > 1 && <div className="flex flex-wrap gap-2">{logs.slice(0, 8).map(log => <Button key={log.id} size="sm" variant={(log.id ?? "") === selectedId ? "default" : "outline"} onClick={() => { setSelectedId(log.id ?? ""); setRevision("") }}>{log.title} · {log.date}</Button>)}</div>}

      <Card className="shadow-none"><CardHeader><CardTitle className="font-serif text-2xl">Whole-session diagnosis</CardTitle><CardDescription>{active.overallSummary}</CardDescription></CardHeader><CardContent className="grid gap-4 lg:grid-cols-3"><div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4"><p className="text-xs font-bold uppercase tracking-wider text-emerald-800">Recurring strengths</p>{active.recurringStrengths.slice(0, 3).map(item => <p key={item} className="mt-2 text-sm leading-6">• {item}</p>)}</div><div className="rounded-2xl border border-amber-200 bg-amber-50 p-4"><p className="text-xs font-bold uppercase tracking-wider text-amber-800">Priority target</p><p className="mt-2 font-serif text-xl font-bold">{active.priorityTarget}</p>{active.recurringWeaknesses.slice(0, 3).map(item => <p key={item} className="mt-2 text-sm leading-6">• {item}</p>)}</div><div className="rounded-2xl border bg-white p-4"><p className="text-xs font-bold uppercase tracking-wider text-slate-500">Next interview plan</p>{active.nextInterviewPlan.slice(0, 4).map((item, index) => <p key={item} className="mt-2 flex gap-2 text-sm leading-6"><span className="grid size-5 shrink-0 place-items-center rounded-full bg-[#102a43] text-[10px] font-bold text-white">{index + 1}</span>{item}</p>)}</div></CardContent></Card>

      <section className="space-y-5">{active.answers.map((item, answerIndex) => <Card key={`${item.index}-${item.answer.slice(0, 20)}`} className="shadow-none"><CardHeader><div className="flex flex-wrap items-center justify-between gap-2"><Badge>Answer {answerIndex + 1}</Badge><Badge variant="outline">Practice signal {Math.round(item.score)}/100</Badge></div><CardTitle className="font-serif text-xl leading-7">{item.question}</CardTitle></CardHeader><CardContent className="space-y-5"><div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs font-bold uppercase tracking-wider text-slate-500">Your answer</p><p className="mt-2 text-sm leading-7">{item.answer}</p></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{item.dimensions.map(dimension => <div key={dimension.label} className="rounded-xl border bg-white p-3"><div className="flex justify-between gap-2 text-xs font-bold"><span>{dimension.label}</span><span>{Math.round(dimension.score)}</span></div><Progress value={dimension.score} className="mt-2" /><p className="mt-2 text-xs leading-5 text-slate-500">{dimension.evidence}</p><p className="mt-2 text-xs leading-5"><strong>Action:</strong> {dimension.action}</p></div>)}</div><div className="grid gap-4 md:grid-cols-2"><div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4"><p className="font-bold text-emerald-900">What worked</p><div className="mt-2 space-y-2">{item.strengths.slice(0, 3).map(strength => <p key={strength} className="flex gap-2 text-sm leading-6 text-emerald-900"><CheckCircle2 className="mt-1 size-4 shrink-0" />{strength}</p>)}</div></div><div className="rounded-2xl border border-amber-200 bg-amber-50 p-4"><p className="font-bold text-amber-950">Improve next</p><div className="mt-2 space-y-2">{item.improvements.slice(0, 3).map(improvement => <p key={improvement} className="flex gap-2 text-sm leading-6 text-amber-950"><Target className="mt-1 size-4 shrink-0" />{improvement}</p>)}</div></div></div><div className="rounded-xl bg-[#edf7f8] p-4"><strong>Best next move:</strong> {item.nextMove}</div></CardContent></Card>)}</section>

      {active.answers[0] && <Card className="shadow-none"><CardHeader><CardTitle className="font-serif text-2xl">Re-answer challenge</CardTitle><CardDescription>Rewrite the first answer using the feedback. The app compares the reasoning profile immediately.</CardDescription></CardHeader><CardContent className="space-y-4"><p className="font-serif text-lg font-semibold">{active.answers[0].question}</p><Textarea rows={7} value={revision} onChange={event => setRevision(event.target.value)} placeholder="Give a stronger version of your answer…" />{revisionFeedback && <div className="grid gap-3 md:grid-cols-2"><div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs uppercase tracking-wider text-slate-500">Original</p><p className="mt-1 font-serif text-3xl font-bold">{Math.round(active.answers[0].score)}</p></div><div className={revisionFeedback.score >= active.answers[0].score ? "rounded-2xl border border-emerald-200 bg-emerald-50 p-4" : "rounded-2xl border border-amber-200 bg-amber-50 p-4"}><p className="text-xs uppercase tracking-wider text-slate-500">Revised</p><p className="mt-1 font-serif text-3xl font-bold">{revisionFeedback.score}</p><p className="mt-2 text-sm"><strong>Next:</strong> {revisionFeedback.nextMove}</p></div></div>}<Button variant="outline" onClick={() => setRevision("")}><RefreshCw />Clear revision</Button></CardContent></Card>}
    </div>
  </main>
}

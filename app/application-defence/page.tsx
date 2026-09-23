"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { ArrowLeft, ArrowRight, CheckCircle2, RefreshCw, Target } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import { analyseInterviewAnswer } from "@/lib/feedback-engine"
import { APPLICATION_KEY, buildApplicationQuestions } from "@/lib/personal-tutor"

function readApplication() { try { return JSON.parse(localStorage.getItem(APPLICATION_KEY) || "{}") as Record<string, unknown> } catch { return {} } }

export default function ApplicationDefencePage() {
  const [application, setApplication] = useState<Record<string, unknown>>({})
  const [index, setIndex] = useState(0)
  const [answer, setAnswer] = useState("")
  const [submitted, setSubmitted] = useState(false)
  useEffect(() => { setApplication(readApplication()) }, [])
  const questions = useMemo(() => buildApplicationQuestions(application), [application])
  const question = questions[index % Math.max(1, questions.length)]
  const feedback = useMemo(() => submitted && answer.trim() ? analyseInterviewAnswer(answer) : null, [submitted, answer])

  function next() { setIndex(value => value + 1); setAnswer(""); setSubmitted(false) }

  if (!questions.length) return <main className="min-h-screen bg-slate-50"><div className="mx-auto max-w-4xl px-4 py-10"><Button asChild variant="ghost"><Link href="/application-profile"><ArrowLeft />Application Digital Twin</Link></Button><Card className="mt-6 shadow-none"><CardHeader><CardTitle className="font-serif text-3xl">Add application evidence first.</CardTitle><CardDescription>Books, projects, EPQ, written work and academic interests give the defence mode something real to question.</CardDescription></CardHeader><CardContent><Button asChild><Link href="/application-profile">Build digital twin</Link></Button></CardContent></Card></div></main>

  return <main className="min-h-screen bg-[#f5f7f7] text-[#172b3a]"><header className="border-b bg-white"><div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4"><Button asChild variant="ghost"><Link href="/application-profile"><ArrowLeft />Digital Twin</Link></Button><Badge variant="outline">Application Defence</Badge></div></header><div className="mx-auto max-w-6xl space-y-6 px-4 py-8"><section><p className="text-xs font-bold uppercase tracking-[.18em] text-[#147d91]">Defend what you actually submitted or studied</p><h1 className="mt-2 font-serif text-4xl font-bold">Turn application claims into academic conversation.</h1><p className="mt-3 max-w-3xl text-slate-600">The questions are generated from your digital twin. The aim is not to memorise polished answers, but to practise explaining what you genuinely thought, learned and would now question.</p></section><Card className="shadow-none"><CardHeader><div className="flex items-center justify-between gap-2"><Badge>Question {index + 1}</Badge><Badge variant="outline">From your application</Badge></div><CardTitle className="font-serif text-3xl leading-tight">{question}</CardTitle><CardDescription>Think aloud. State the evidence or experience you are referring to, then explain what follows from it and what remains uncertain.</CardDescription></CardHeader><CardContent className="space-y-4"><Textarea rows={9} value={answer} onChange={event => { setAnswer(event.target.value); setSubmitted(false) }} placeholder="Talk through your answer as if an interviewer had just asked this…" /><div className="flex justify-end"><Button onClick={() => setSubmitted(true)} disabled={!answer.trim()}><Target />Analyse answer</Button></div></CardContent></Card>{feedback && <Card className="shadow-none"><CardHeader><CardTitle className="font-serif text-2xl">Structured feedback</CardTitle><CardDescription>Practice reasoning signal {feedback.score}/100 — not an admissions judgement.</CardDescription></CardHeader><CardContent className="space-y-4"><div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">{feedback.dimensions.map(item => <div key={item.label} className="rounded-xl border bg-white p-3"><div className="flex justify-between text-xs font-bold"><span>{item.label}</span><span>{item.score}</span></div><Progress value={item.score} className="mt-2" /><p className="mt-2 text-xs leading-5 text-slate-500">{item.evidence}</p></div>)}</div><div className="grid gap-4 md:grid-cols-2"><div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4"><p className="font-bold">What worked</p>{feedback.strengths.map(item => <p key={item} className="mt-2 flex gap-2 text-sm leading-6"><CheckCircle2 className="mt-1 size-4 shrink-0" />{item}</p>)}</div><div className="rounded-2xl border border-amber-200 bg-amber-50 p-4"><p className="font-bold">Improve next</p>{feedback.improvements.map(item => <p key={item} className="mt-2 flex gap-2 text-sm leading-6"><Target className="mt-1 size-4 shrink-0" />{item}</p>)}</div></div><div className="flex flex-wrap gap-2"><Button onClick={next}>Next question <ArrowRight /></Button><Button variant="outline" onClick={() => { setAnswer(""); setSubmitted(false) }}><RefreshCw />Try this one again</Button><Button asChild variant="outline"><Link href="/interview-room">Continue in formal interview</Link></Button></div></CardContent></Card>}</div></main>
}

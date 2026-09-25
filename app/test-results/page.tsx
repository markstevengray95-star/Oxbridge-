"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { ArrowLeft, BarChart3, CheckCircle2, Clock3, FileText, Target, Trophy, XCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const PROGRESS_KEY = "oxbridge-tutor-progress-v2"
const LAST_RESULT_KEY = "oxbridge-last-full-test-result-v1"

type SavedSection = {
  id?: string
  title: string
  kind?: "mcq" | "essay"
  correct?: number
  total?: number
  answered?: number
  accuracy?: number
  words?: number
}

type DifficultyScore = {
  difficulty: string
  correct: number
  total: number
  accuracy: number
}

type QuestionReview = {
  id: string
  section: string
  difficulty?: string
  prompt: string
  selectedAnswer: string | null
  correctAnswer: string
  correct: boolean
  explanation: string
}

type SavedResult = {
  id: string
  source?: string
  test: string
  form?: number
  title?: string
  date: string
  rawScore: number
  totalQuestions: number
  answered?: number
  accuracy: number
  durationSeconds?: number | null
  flagged?: number
  sections?: SavedSection[]
  difficultyScores?: DifficultyScore[]
  weakestSection?: string | null
  strongestSection?: string | null
  essayPrompts?: Record<string, string>
  essayResponses?: Record<string, string>
  questionReview?: QuestionReview[]
}

function formatDuration(seconds?: number | null) {
  if (seconds === null || seconds === undefined) return "Not recorded"
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  return hours ? `${hours}h ${minutes}m` : `${minutes} min`
}

export default function TestResultsPage() {
  const [results, setResults] = useState<SavedResult[]>([])
  const [selectedId, setSelectedId] = useState<string>("")

  useEffect(() => {
    try {
      const current = JSON.parse(localStorage.getItem(PROGRESS_KEY) || "{}") as { fullPaperResults?: unknown }
      const stored = Array.isArray(current.fullPaperResults) ? current.fullPaperResults as SavedResult[] : []
      const last = JSON.parse(localStorage.getItem(LAST_RESULT_KEY) || "null") as SavedResult | null
      const merged = last && !stored.some(item => item.id === last.id) ? [last, ...stored] : stored
      setResults(merged)
      if (merged[0]) setSelectedId(merged[0].id)
    } catch {
      setResults([])
    }
  }, [])

  const selected = results.find(item => item.id === selectedId) ?? results[0]
  const incorrect = useMemo(() => selected?.questionReview?.filter(item => !item.correct) ?? [], [selected])

  return <main className="min-h-screen bg-slate-50 text-slate-950">
    <header className="border-b bg-slate-950 text-white"><div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4"><Link href="/student-home" className="inline-flex items-center gap-2 text-sm font-semibold"><ArrowLeft className="size-4" />Student Home</Link><Badge className="border-white/15 bg-white/10 text-white"><Trophy className="size-3.5" />Results History</Badge></div></header>
    <div className="mx-auto max-w-7xl px-4 py-8">
      <section className="mb-7"><p className="text-xs font-bold uppercase tracking-[.18em] text-blue-700">Admissions test practice</p><h1 className="mt-2 font-serif text-4xl font-bold">Full-test results and analysis</h1><p className="mt-3 max-w-3xl text-slate-600">Completed full papers are kept here on this device. Results use raw marks and practice accuracy only; they are not official scaled scores or admissions predictions.</p></section>

      {!results.length ? <Card><CardHeader><CardTitle>No saved full-test results yet</CardTitle><CardDescription>Complete a paper in Full Papers or Test Player. Your next submitted result will appear here automatically.</CardDescription></CardHeader><CardContent className="flex flex-wrap gap-3"><Button asChild><Link href="/full-papers">Open Full Papers</Link></Button><Button asChild variant="outline"><Link href="/test-player">Open Test Player</Link></Button></CardContent></Card> : <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="space-y-3 lg:sticky lg:top-20 lg:self-start"><p className="text-xs font-bold uppercase tracking-[.16em] text-slate-500">Completed tests</p>{results.map(item => <button key={item.id} onClick={() => setSelectedId(item.id)} className={`w-full rounded-xl border p-4 text-left transition ${selected?.id === item.id ? "border-blue-500 bg-blue-50 ring-2 ring-blue-100" : "bg-white hover:border-slate-400"}`}><div className="flex items-center justify-between gap-2"><strong>{item.test}{item.form ? ` · Form ${item.form}` : ""}</strong><span className="text-xs text-slate-500">{item.accuracy}%</span></div><p className="mt-2 text-2xl font-bold">{item.rawScore}/{item.totalQuestions}</p><p className="mt-1 text-xs text-slate-500">{new Date(item.date).toLocaleString()}</p></button>)}</aside>

        {selected && <section className="space-y-5">
          <Card><CardHeader><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-blue-700">{selected.test}{selected.form ? ` · Practice Form ${selected.form}` : ""}</p><CardTitle className="mt-2 font-serif text-3xl">{selected.title || `${selected.test} full test`}</CardTitle><CardDescription className="mt-2">Completed {new Date(selected.date).toLocaleString()}</CardDescription></div><Badge variant="outline">{selected.source === "test-player" ? "Test Player" : "Full Papers"}</Badge></div></CardHeader><CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><div className="rounded-xl bg-slate-100 p-4"><Trophy className="size-5 text-blue-700" /><p className="mt-2 text-3xl font-bold">{selected.rawScore}/{selected.totalQuestions}</p><p className="text-xs text-slate-500">raw mark</p></div><div className="rounded-xl bg-slate-100 p-4"><BarChart3 className="size-5 text-blue-700" /><p className="mt-2 text-3xl font-bold">{selected.accuracy}%</p><p className="text-xs text-slate-500">accuracy</p></div><div className="rounded-xl bg-slate-100 p-4"><CheckCircle2 className="size-5 text-emerald-700" /><p className="mt-2 text-3xl font-bold">{selected.answered ?? selected.totalQuestions}/{selected.totalQuestions}</p><p className="text-xs text-slate-500">answered</p></div><div className="rounded-xl bg-slate-100 p-4"><Clock3 className="size-5 text-blue-700" /><p className="mt-2 text-xl font-bold">{formatDuration(selected.durationSeconds)}</p><p className="text-xs text-slate-500">time used</p></div></CardContent></Card>

          {(selected.strongestSection || selected.weakestSection) && <div className="grid gap-4 md:grid-cols-2"><Card><CardHeader><Target className="size-5 text-emerald-700" /><CardTitle className="text-lg">Strongest area</CardTitle></CardHeader><CardContent><p className="font-semibold">{selected.strongestSection || "Not available"}</p></CardContent></Card><Card><CardHeader><Target className="size-5 text-amber-700" /><CardTitle className="text-lg">Priority area</CardTitle></CardHeader><CardContent><p className="font-semibold">{selected.weakestSection || "Not available"}</p></CardContent></Card></div>}

          {!!selected.sections?.length && <Card><CardHeader><CardTitle className="font-serif text-2xl">Section breakdown</CardTitle></CardHeader><CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">{selected.sections.map((item, index) => <div key={item.id || `${item.title}-${index}`} className="rounded-xl border p-4"><p className="font-semibold">{item.title}</p>{item.kind === "essay" || !item.total ? <><p className="mt-2 text-2xl font-bold">{item.words ?? 0}</p><p className="text-sm text-slate-500">words · unscored writing task</p></> : <><p className="mt-2 text-2xl font-bold">{item.correct ?? 0}/{item.total}</p><p className="text-sm text-slate-500">{item.accuracy ?? 0}% · {item.answered ?? 0} answered</p></>}</div>)}</CardContent></Card>}

          {!!selected.difficultyScores?.length && <Card><CardHeader><CardTitle className="font-serif text-2xl">Difficulty analysis</CardTitle></CardHeader><CardContent className="grid gap-3 sm:grid-cols-3">{selected.difficultyScores.map(item => <div key={item.difficulty} className="rounded-xl border p-4"><p className="text-xs font-bold uppercase tracking-wider text-slate-500">{item.difficulty}</p><p className="mt-2 text-2xl font-bold">{item.accuracy}%</p><p className="text-sm text-slate-500">{item.correct}/{item.total} correct</p></div>)}</CardContent></Card>}

          {!!Object.keys(selected.essayResponses || {}).length && <Card><CardHeader><FileText className="size-5 text-blue-700" /><CardTitle className="font-serif text-2xl">Writing response</CardTitle></CardHeader><CardContent className="space-y-4">{Object.entries(selected.essayResponses || {}).map(([id, response]) => <div key={id} className="rounded-xl border p-4"><p className="font-semibold">{selected.essayPrompts?.[id] || "Writing task"}</p><p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-700">{response || "No response submitted."}</p></div>)}</CardContent></Card>}

          {selected.questionReview ? <Card><CardHeader><XCircle className="size-5 text-amber-700" /><CardTitle className="font-serif text-2xl">Incorrect and unanswered questions</CardTitle><CardDescription>{incorrect.length ? `${incorrect.length} questions to review.` : "No errors recorded in this paper."}</CardDescription></CardHeader><CardContent className="space-y-4">{incorrect.map((item, index) => <div key={item.id} className="rounded-xl border p-4"><div className="flex flex-wrap gap-2"><Badge variant="outline">{item.section}</Badge>{item.difficulty && <Badge variant="outline">{item.difficulty}</Badge>}<Badge variant="outline">Review {index + 1}</Badge></div><p className="mt-3 whitespace-pre-line font-semibold leading-6">{item.prompt}</p><div className="mt-3 space-y-2 text-sm"><p><strong>Your answer:</strong> {item.selectedAnswer || "Unanswered"}</p><p><strong>Correct answer:</strong> {item.correctAnswer}</p><p className="rounded-lg bg-slate-100 p-3 leading-6"><strong>Explanation:</strong> {item.explanation}</p></div></div>)}</CardContent></Card> : <Card><CardHeader><CardTitle className="font-serif text-xl">Detailed question review unavailable for this older result</CardTitle><CardDescription>Your score and section breakdown were saved, but older Full Papers results did not store each individual answer. New Test Player submissions now preserve the full question-by-question analysis.</CardDescription></CardHeader></Card>}

          <div className="flex flex-wrap gap-3"><Button asChild><Link href="/test-player">Take another full test</Link></Button><Button asChild variant="outline"><Link href="/full-papers">Full Papers</Link></Button><Button asChild variant="outline"><Link href="/advanced-practice">Target weak sections</Link></Button></div>
        </section>}
      </div>}
    </div>
  </main>
}

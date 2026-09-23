"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { ArrowLeft, ArrowRight, CheckCircle2, RefreshCw, Target, TrendingUp, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { questionBank } from "@/lib/question-bank"
import { advancedQuestionBank } from "@/lib/question-bank-advanced"
import { questionBank2027 } from "@/lib/question-bank-2027"
import { buildInterventionTargets, selectRetestQuestions, type PaperSectionResult } from "@/lib/feedback-engine"
import type { TestQuestion } from "@/lib/oxbridge-data"

const PROGRESS_KEY = "oxbridge-tutor-progress-v2"

type FullPaperResult = {
  id: string
  test: TestQuestion["test"]
  form: number
  title: string
  date: string
  rawScore: number
  totalQuestions: number
  accuracy: number
  sections: PaperSectionResult[]
}

type SavedProgress = {
  fullPaperResults?: FullPaperResult[]
  interventionResults?: Array<{
    id: string
    sourcePaperId: string
    test: string
    originalAccuracy: number
    retestAccuracy: number
    targets: string[]
    date: string
  }>
  [key: string]: unknown
}

export default function PaperInterventionPage() {
  const [progress, setProgress] = useState<SavedProgress>({})
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [checked, setChecked] = useState(false)
  const [seed, setSeed] = useState(1)

  useEffect(() => {
    try {
      setProgress(JSON.parse(localStorage.getItem(PROGRESS_KEY) || "{}") as SavedProgress)
    } catch {
      setProgress({})
    }
  }, [])

  const latest = Array.isArray(progress.fullPaperResults) ? progress.fullPaperResults[0] : undefined
  const targets = useMemo(() => latest ? buildInterventionTargets(latest.sections ?? []) : [], [latest])
  const allQuestions = useMemo(() => [...questionBank, ...advancedQuestionBank, ...questionBank2027], [])
  const retest = useMemo(() => latest ? selectRetestQuestions(allQuestions, latest.test, targets, 12).map((question, index) => ({ ...question, _order: (index + seed) % 12 })) : [], [allQuestions, latest, targets, seed])
  const retestOrdered = useMemo(() => [...retest].sort((a, b) => a._order - b._order), [retest])
  const correct = checked ? retestOrdered.filter(question => answers[question.id] === question.answer).length : 0
  const retestAccuracy = checked && retestOrdered.length ? Math.round(correct / retestOrdered.length * 100) : 0
  const originalTargetAccuracy = targets.length ? Math.round(targets.reduce((sum, target) => sum + target.accuracy, 0) / targets.length) : latest?.accuracy ?? 0
  const improvement = checked ? retestAccuracy - originalTargetAccuracy : 0

  function submitRetest() {
    if (!latest || !retestOrdered.length) return
    setChecked(true)
    const score = retestOrdered.filter(question => answers[question.id] === question.answer).length
    const accuracy = Math.round(score / retestOrdered.length * 100)
    try {
      const current = JSON.parse(localStorage.getItem(PROGRESS_KEY) || "{}") as SavedProgress
      const history = Array.isArray(current.interventionResults) ? current.interventionResults : []
      const entry = {
        id: `intervention-${Date.now()}`,
        sourcePaperId: latest.id,
        test: latest.test,
        originalAccuracy: originalTargetAccuracy,
        retestAccuracy: accuracy,
        targets: targets.map(target => target.section),
        date: new Date().toISOString(),
      }
      const next = { ...current, interventionResults: [entry, ...history].slice(0, 50) }
      localStorage.setItem(PROGRESS_KEY, JSON.stringify(next))
      setProgress(next)
    } catch {
      // Retest still displays even if persistence is unavailable.
    }
  }

  function newRetest() {
    setSeed(value => value + 1)
    setAnswers({})
    setChecked(false)
  }

  if (!latest) {
    return <main className="min-h-screen bg-slate-50 text-slate-950">
      <div className="mx-auto max-w-5xl px-4 py-10">
        <Button asChild variant="ghost"><Link href="/student-home"><ArrowLeft />Student Home</Link></Button>
        <Card className="mt-6 shadow-none"><CardHeader><CardTitle className="font-serif text-3xl">Targeted intervention starts after a full paper.</CardTitle><CardDescription>Sit a full admissions-test paper first. The app will then identify the weakest sections automatically and build a fresh retest from them.</CardDescription></CardHeader><CardContent><Button asChild><Link href="/full-papers">Open Full Papers <ArrowRight /></Link></Button></CardContent></Card>
      </div>
    </main>
  }

  return <main className="min-h-screen bg-[#f5f7f7] text-[#172b3a]">
    <header className="border-b bg-white"><div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4"><Button asChild variant="ghost"><Link href="/full-papers"><ArrowLeft />Full Papers</Link></Button><Badge variant="outline"><TrendingUp className="size-3.5" />Weakness → intervention → retest</Badge></div></header>

    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8">
      <section className="grid gap-5 lg:grid-cols-[1.2fr_.8fr]">
        <div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#147d91]">Automatic intervention</p><h1 className="mt-2 font-serif text-4xl font-bold">Turn the last paper into the next lesson.</h1><p className="mt-3 max-w-3xl text-slate-600">The app has read your latest {latest.test} paper, ranked the weakest sections and built a short recovery sequence. Complete the intervention steps, then use the fresh retest to check whether the weakness has actually improved.</p></div>
        <Card className="border-0 bg-[#102a43] text-white shadow-none"><CardHeader><CardDescription className="text-white/60">Latest full paper</CardDescription><CardTitle className="font-serif text-3xl">{latest.accuracy}%</CardTitle><CardDescription className="text-white/60">{latest.rawScore}/{latest.totalQuestions} raw marks · {latest.title}</CardDescription></CardHeader></Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">{targets.map((target, index) => <Card key={target.section} className={target.priority === "high" ? "border-amber-300 bg-amber-50 shadow-none" : "shadow-none"}><CardHeader><div className="flex items-center justify-between"><Badge variant={target.priority === "high" ? "default" : "outline"}>Priority {index + 1}</Badge><strong>{target.accuracy}%</strong></div><CardTitle className="font-serif text-xl">{target.section}</CardTitle><CardDescription>{target.diagnosis}</CardDescription></CardHeader><CardContent className="space-y-4"><div><p className="text-xs font-bold uppercase tracking-wider text-slate-500">Mini-lesson</p><div className="mt-2 space-y-2">{target.teach.map(step => <p key={step} className="text-sm leading-6">• {step}</p>)}</div></div><div><p className="text-xs font-bold uppercase tracking-wider text-slate-500">Practice sequence</p><div className="mt-2 space-y-2">{target.drill.map(step => <p key={step} className="text-sm leading-6">• {step}</p>)}</div></div><div className="rounded-xl bg-white/70 p-3 text-sm"><strong>Success criterion:</strong> {target.successCriterion}</div></CardContent></Card>)}</section>

      <Card className="shadow-none"><CardHeader><div className="flex flex-wrap items-center justify-between gap-3"><div><CardTitle className="font-serif text-2xl">Fresh targeted retest</CardTitle><CardDescription>{retestOrdered.length} new questions drawn from the weak areas of your latest {latest.test} paper.</CardDescription></div><Button variant="outline" onClick={newRetest}><RefreshCw />New retest</Button></div></CardHeader><CardContent className="space-y-5">{retestOrdered.map((question, qIndex) => <div key={question.id} className="rounded-2xl border bg-white p-5"><div className="mb-3 flex flex-wrap gap-2"><Badge>{qIndex + 1}</Badge><Badge variant="outline">{question.section}</Badge><Badge variant="outline">{question.difficulty}</Badge></div><p className="whitespace-pre-line font-serif text-lg font-semibold leading-7">{question.prompt}</p><div className="mt-4 grid gap-2">{question.options.map((option, optionIndex) => { const selected = answers[question.id] === optionIndex; const isCorrect = checked && optionIndex === question.answer; const isWrongSelected = checked && selected && optionIndex !== question.answer; return <button key={`${question.id}-${optionIndex}`} disabled={checked} onClick={() => setAnswers(current => ({ ...current, [question.id]: optionIndex }))} className={`flex items-center gap-3 rounded-xl border p-3 text-left transition ${isCorrect ? "border-emerald-400 bg-emerald-50" : isWrongSelected ? "border-amber-400 bg-amber-50" : selected ? "border-[#147d91] bg-[#edf7f8]" : "hover:border-slate-400"}`}><span className="grid size-7 shrink-0 place-items-center rounded-full border text-xs font-bold">{String.fromCharCode(65 + optionIndex)}</span><span className="flex-1 text-sm">{option}</span>{isCorrect ? <CheckCircle2 className="size-4 text-emerald-600" /> : isWrongSelected ? <X className="size-4 text-amber-600" /> : null}</button>})}</div>{checked && answers[question.id] !== question.answer && <div className="mt-3 rounded-xl bg-slate-50 p-3 text-sm leading-6"><strong>Why:</strong> {question.explanation}</div>}</div>)}

        {!checked ? <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-5"><p className="text-sm text-slate-500">Answered {Object.keys(answers).filter(id => retestOrdered.some(question => question.id === id)).length}/{retestOrdered.length}</p><Button onClick={submitRetest} disabled={!retestOrdered.length}><Target />Mark retest</Button></div> : <div className="grid gap-4 border-t pt-5 md:grid-cols-3"><Card className="shadow-none"><CardHeader><CardDescription>Target baseline</CardDescription><CardTitle className="font-serif text-3xl">{originalTargetAccuracy}%</CardTitle></CardHeader></Card><Card className="shadow-none"><CardHeader><CardDescription>Retest</CardDescription><CardTitle className="font-serif text-3xl">{retestAccuracy}%</CardTitle></CardHeader></Card><Card className={improvement >= 0 ? "border-emerald-200 bg-emerald-50 shadow-none" : "border-amber-200 bg-amber-50 shadow-none"}><CardHeader><CardDescription>Change</CardDescription><CardTitle className="font-serif text-3xl">{improvement >= 0 ? "+" : ""}{improvement} points</CardTitle><CardDescription>{retestAccuracy >= 70 ? "The targeted weakness is moving in the right direction. Repeat later to check retention." : "Keep the intervention loop open: review the explanations, then generate another retest."}</CardDescription></CardHeader></Card></div>}
      </CardContent></Card>
    </div>
  </main>
}

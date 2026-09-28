"use client"

import Link from "next/link"
import { useEffect, useMemo, useRef, useState } from "react"
import { ArrowLeft, ArrowRight, Brain, CheckCircle2, Gauge, Loader2, RefreshCw, ShieldCheck, Target, TriangleAlert } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import { buildFullPaper, paperCatalog, type FullPaperTest, type PaperForm } from "@/lib/full-paper-system"
import { isYesNoStatementQuestion, type FullPaperQuestion } from "@/lib/full-paper-question"
import {
  EXAM_INTELLIGENCE_KEY,
  buildPostExamDiagnostic,
  calibrateDifficulty,
  classifyExamError,
  confidenceCalibration,
  scoreReasoningProcess,
  type ExamAttemptObservation,
  type ExamQuestionLike,
} from "@/lib/exam-intelligence"

const SESSION_LENGTH = 12

type Phase = "setup" | "question" | "feedback" | "results"
type MutationTarget = "same" | "harder" | "far-transfer"

type MutationResponse = {
  configured?: boolean
  verified?: boolean
  question?: ExamQuestionLike & { independentCheck?: string; changeSummary?: string }
  error?: string
}

function readHistory() {
  try {
    const value = JSON.parse(localStorage.getItem(EXAM_INTELLIGENCE_KEY) || "[]")
    return Array.isArray(value) ? value as ExamAttemptObservation[] : []
  } catch { return [] }
}

function optionLabel(question: FullPaperQuestion, index: number | undefined) {
  if (index === undefined) return "Unanswered"
  return question.options[index] ?? "Unanswered"
}

function mutationTargetFor(attempt: ExamAttemptObservation): MutationTarget {
  const reasoning = scoreReasoningProcess(attempt.reasoningNote)
  if (attempt.correct && attempt.confidence >= 75 && reasoning.total >= 45) return "harder"
  if (!attempt.correct && attempt.confidence >= 75) return "same"
  if (attempt.correct && attempt.confidence <= 45) return "far-transfer"
  return "same"
}

function castGenerated(source: FullPaperQuestion, generated: ExamQuestionLike): FullPaperQuestion | null {
  if (!generated.prompt || !Array.isArray(generated.options) || typeof generated.answer !== "number") return null
  return {
    ...source,
    id: generated.id || `adaptive-${source.id}-${Date.now()}`,
    prompt: generated.prompt,
    options: generated.options,
    answer: generated.answer,
    explanation: generated.explanation || "Independent verification agreed with the stored key.",
    difficulty: (generated.difficulty === "Foundation" || generated.difficulty === "Stretch" || generated.difficulty === "Challenge") ? generated.difficulty : source.difficulty,
  }
}

export function ExamIntelligenceLab() {
  const [phase, setPhase] = useState<Phase>("setup")
  const [test, setTest] = useState<FullPaperTest>("TMUA")
  const [form, setForm] = useState<PaperForm>(1)
  const [queue, setQueue] = useState<FullPaperQuestion[]>([])
  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState<number | undefined>()
  const [confidence, setConfidence] = useState(60)
  const [reasoning, setReasoning] = useState("")
  const [flagged, setFlagged] = useState(false)
  const [answerChanges, setAnswerChanges] = useState(0)
  const [startedAt, setStartedAt] = useState(Date.now())
  const [attempts, setAttempts] = useState<ExamAttemptObservation[]>([])
  const [history, setHistory] = useState<ExamAttemptObservation[]>([])
  const [mutated, setMutated] = useState<FullPaperQuestion | null>(null)
  const [mutationNote, setMutationNote] = useState("")
  const [mutating, setMutating] = useState(false)
  const [notice, setNotice] = useState("")
  const savedRef = useRef(false)

  const paper = useMemo(() => buildFullPaper(test, form, ["Mathematics 1", "Physics", "Mathematics 2"]), [test, form])
  const bankQuestions = useMemo(() => paper.sections.flatMap(section => section.kind === "mcq" ? section.questions.filter(question => !isYesNoStatementQuestion(question)) : []), [paper])
  const current = queue[index]
  const latest = attempts[attempts.length - 1]
  const process = latest ? scoreReasoningProcess(latest.reasoningNote) : null
  const errorCause = latest ? classifyExamError(latest) : "none"
  const diagnostic = useMemo(() => buildPostExamDiagnostic(attempts), [attempts])
  const calibration = useMemo(() => confidenceCalibration(attempts), [attempts])
  const historicalCalibration = useMemo(() => calibrateDifficulty([...history, ...attempts]), [history, attempts])

  useEffect(() => setHistory(readHistory()), [])

  function start() {
    const seed = form === 1 ? 0 : 5
    const selectedQuestions = bankQuestions.slice(seed, seed + SESSION_LENGTH)
    setQueue(selectedQuestions.length >= 4 ? selectedQuestions : bankQuestions.slice(0, SESSION_LENGTH))
    setIndex(0)
    setAttempts([])
    setSelected(undefined)
    setConfidence(60)
    setReasoning("")
    setFlagged(false)
    setAnswerChanges(0)
    setStartedAt(Date.now())
    setMutated(null)
    setMutationNote("")
    setNotice("")
    savedRef.current = false
    setPhase("question")
  }

  function choose(indexValue: number) {
    if (selected !== undefined && selected !== indexValue) setAnswerChanges(value => value + 1)
    setSelected(indexValue)
  }

  async function generateMutation(question: FullPaperQuestion, attempt: ExamAttemptObservation) {
    const target = mutationTargetFor(attempt)
    setMutating(true)
    setMutationNote("")
    try {
      const response = await fetch("/api/question-mutate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: { id: question.id, test: question.test, section: question.section, difficulty: question.difficulty, prompt: question.prompt, options: question.options, answer: question.answer, explanation: question.explanation },
          target,
        }),
      })
      if (!response.ok) throw new Error("mutation")
      const data = await response.json() as MutationResponse
      const generated = data.question ? castGenerated(question, data.question) : null
      if (generated && data.verified) {
        setMutated(generated)
        setMutationNote(target === "harder" ? "A harder verified mutation is ready." : target === "far-transfer" ? "A far-transfer mutation is ready." : "A same-skill verified mutation is ready.")
      }
    } catch {
      setMutationNote("Adaptive mutation was unavailable, so the next reliable bank question will be used instead.")
    } finally {
      setMutating(false)
    }
  }

  function submit() {
    if (!current || selected === undefined) return
    const correct = selected === current.answer
    const attempt: ExamAttemptObservation = {
      id: `intel-${Date.now()}-${current.id}`,
      questionId: current.id,
      test: current.test,
      section: current.section,
      prompt: current.prompt,
      difficulty: current.difficulty,
      selectedAnswer: optionLabel(current, selected),
      correctAnswer: optionLabel(current, current.answer),
      correct,
      rawMark: correct ? 1 : 0,
      maxMarks: 1,
      confidence,
      reasoningNote: reasoning.trim(),
      answerChanges,
      flagged,
      timeSpentSeconds: Math.max(1, Math.round((Date.now() - startedAt) / 1000)),
      createdAt: new Date().toISOString(),
    }
    setAttempts(items => [...items, attempt])
    setPhase("feedback")
    setMutated(null)
    if ((correct && confidence >= 75) || (!correct && confidence >= 70) || (correct && confidence <= 45)) void generateMutation(current, attempt)
  }

  function next() {
    if (!current) return
    if (mutated) {
      setQueue(items => {
        const copy = [...items]
        copy.splice(index + 1, 0, mutated)
        return copy
      })
    }
    const nextIndex = index + 1
    if (attempts.length >= SESSION_LENGTH || nextIndex >= queue.length + (mutated ? 1 : 0)) {
      setPhase("results")
      return
    }
    setIndex(nextIndex)
    setSelected(undefined)
    setConfidence(60)
    setReasoning("")
    setFlagged(false)
    setAnswerChanges(0)
    setStartedAt(Date.now())
    setMutated(null)
    setMutationNote("")
    setNotice("")
    setPhase("question")
  }

  useEffect(() => {
    if (phase !== "results" || savedRef.current) return
    savedRef.current = true
    const combined = [...attempts, ...history].slice(0, 1000)
    localStorage.setItem(EXAM_INTELLIGENCE_KEY, JSON.stringify(combined))
    setHistory(combined)
  }, [phase, attempts, history])

  if (phase === "setup") return <main className="min-h-screen bg-[#f3f6f6] text-[#172b3a]"><div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
    <div className="flex items-center justify-between"><Button asChild variant="ghost"><Link href="/test-player"><ArrowLeft/>Test simulator</Link></Button><Badge className="border-0 bg-[#102a43] text-white"><Brain className="mr-1 size-3.5"/>Exam Intelligence</Badge></div>
    <section className="grid overflow-hidden rounded-[2rem] border border-[#dbe5e7] bg-white shadow-[0_24px_70px_rgba(16,42,67,.08)] lg:grid-cols-[1.1fr_.9fr]">
      <div className="p-6 sm:p-9 lg:p-12"><p className="text-xs font-bold uppercase tracking-[.18em] text-[#147d91]">Adaptive practice mode</p><h1 className="mt-2 font-serif text-4xl font-bold">Measure the reasoning behind the answer.</h1><p className="mt-4 max-w-3xl leading-7 text-[#667984]">This mode records confidence, answer changes, time, flags and optional working. Strong performance can trigger a harder verified mutation; confident mistakes trigger same-skill variants so misconceptions cannot hide behind memorised wording.</p><div className="mt-7 grid gap-4 sm:grid-cols-2"><label><span className="mb-1 block text-xs font-bold uppercase text-slate-500">Test</span><NativeSelect value={test} onChange={event=>setTest(event.target.value as FullPaperTest)}>{paperCatalog.map(item=><NativeSelectOption key={item.test} value={item.test}>{item.test}</NativeSelectOption>)}</NativeSelect></label><label><span className="mb-1 block text-xs font-bold uppercase text-slate-500">Practice form</span><NativeSelect value={String(form)} onChange={event=>setForm(Number(event.target.value) as PaperForm)}><NativeSelectOption value="1">Form 1</NativeSelectOption><NativeSelectOption value="2">Form 2</NativeSelectOption></NativeSelect></label></div><Button className="mt-7" size="lg" onClick={start} disabled={!bankQuestions.length}><Brain/>Start adaptive practice</Button></div>
      <aside className="bg-[#102a43] p-6 text-white sm:p-8 lg:p-10"><p className="text-xs font-bold uppercase tracking-[.18em] text-[#8dd7de]">Captured automatically</p><div className="mt-5 space-y-3">{["Confidence calibration", "Reasoning-process score", "Error-cause DNA", "High-confidence misconception detection", "Observed difficulty from attempt history", "Post-session practice prescription"].map(item=><p key={item} className="rounded-xl bg-white/10 p-3 text-sm">{item}</p>)}</div><p className="mt-6 text-xs leading-5 text-white/55">Raw test marks remain separate from these practice diagnostics. No unofficial scaled score or admissions prediction is generated.</p></aside>
    </section>
  </div></main>

  if (phase === "results") return <main className="min-h-screen bg-[#f3f6f6] text-[#172b3a]"><div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
    <div className="flex flex-wrap items-center justify-between gap-3"><Button asChild variant="ghost"><Link href="/test-player"><ArrowLeft/>Test simulator</Link></Button><Button onClick={start}><RefreshCw/>New adaptive session</Button></div>
    <Card className="border-[#cfe1e4]"><CardHeader><p className="text-xs font-bold uppercase tracking-[.16em] text-[#147d91]">Post-exam diagnostic</p><CardTitle className="font-serif text-3xl">{diagnostic.accuracy}% correct · {diagnostic.reasoningAverage}% reasoning-process evidence</CardTitle><CardDescription>Diagnostic only; it does not convert practice performance into an official admissions-test score.</CardDescription></CardHeader><CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Metric label="Questions" value={String(diagnostic.attempts)}/><Metric label="Confidence" value={`${calibration.meanConfidence}%`}/><Metric label="Calibration" value={calibration.label}/><Metric label="High-confidence errors" value={String(calibration.highConfidenceErrors)}/></CardContent></Card>
    <div className="grid gap-5 lg:grid-cols-2"><Card><CardHeader><CardTitle>Error DNA</CardTitle><CardDescription>Why marks were lost, not just which topic they came from.</CardDescription></CardHeader><CardContent className="space-y-3">{diagnostic.errors.length?diagnostic.errors.map(item=><div key={item.cause}><div className="flex justify-between text-sm"><strong className="capitalize">{item.cause}</strong><span>{item.count}</span></div><Progress value={Math.min(100,item.percent*2)} className="mt-1"/></div>):<p className="text-sm text-slate-500">No wrong answers in this session.</p>}</CardContent></Card><Card><CardHeader><CardTitle>Underlying skills</CardTitle></CardHeader><CardContent className="space-y-2">{diagnostic.skillBreakdown.length?diagnostic.skillBreakdown.map(item=><div key={item.skill} className="flex items-center justify-between rounded-xl border p-3"><span className="font-medium">{item.skill}</span><Badge variant="outline">{item.count}</Badge></div>):<p className="text-sm text-slate-500">No repeated skill weakness detected.</p>}</CardContent></Card></div>
    <Card><CardHeader><CardTitle>Next practice prescription</CardTitle></CardHeader><CardContent className="grid gap-3 md:grid-cols-3">{diagnostic.priorities.map(item=><p key={item} className="rounded-xl bg-amber-50 p-4 text-sm leading-6 text-amber-950">{item}</p>)}</CardContent></Card>
    <Card><CardHeader><CardTitle>Observed difficulty calibration</CardTitle><CardDescription>Built from your stored practice attempts. A question needs at least three attempts before a local observed band is assigned.</CardDescription></CardHeader><CardContent className="space-y-2">{historicalCalibration.slice(0,8).map(item=><div key={item.questionId} className="grid gap-2 rounded-xl border p-3 text-sm sm:grid-cols-[1fr_auto_auto_auto]"><span className="truncate font-medium">{item.questionId}</span><span>{item.attempts} attempts</span><span>{item.accuracy}% correct</span><Badge variant="outline">{item.observedBand}</Badge></div>)}</CardContent></Card>
    <div className="flex flex-wrap gap-3"><Button asChild><Link href="/mistake-replay"><Target/>Replay weak skills</Link></Button><Button variant="outline" asChild><Link href="/lnat-passage-intelligence">LNAT passage intelligence</Link></Button></div>
  </div></main>

  if (!current) return null

  if (phase === "feedback" && latest) return <main className="min-h-screen bg-[#f3f6f6] text-[#172b3a]"><div className="mx-auto max-w-5xl space-y-5 px-4 py-8">
    <Card className={latest.correct?"border-emerald-200":"border-amber-200"}><CardHeader><div className="flex flex-wrap items-center gap-2"><Badge className={latest.correct?"bg-emerald-700":"bg-amber-700"}>{latest.correct?"Correct":"Needs repair"}</Badge><Badge variant="outline">Confidence {latest.confidence}%</Badge>{errorCause!=="none"?<Badge variant="outline" className="capitalize">{errorCause}</Badge>:null}</div><CardTitle className="font-serif text-2xl">{current.prompt}</CardTitle></CardHeader><CardContent className="space-y-4"><div className="grid gap-3 sm:grid-cols-2"><div className="rounded-xl bg-slate-50 p-4"><p className="text-xs font-bold uppercase text-slate-500">Your answer</p><p className="mt-1 text-sm">{latest.selectedAnswer}</p></div><div className="rounded-xl bg-emerald-50 p-4"><p className="text-xs font-bold uppercase text-emerald-700">Correct answer</p><p className="mt-1 text-sm">{latest.correctAnswer}</p></div></div><div className="rounded-xl border p-4"><p className="font-semibold">Why</p><p className="mt-2 text-sm leading-6 text-slate-600">{current.explanation}</p></div>{process?<div className="rounded-xl border p-4"><div className="flex items-center justify-between"><p className="font-semibold">Reasoning-process evidence</p><Badge variant="outline">{process.total}%</Badge></div><div className="mt-3 grid gap-2 sm:grid-cols-4">{[["Method",process.method],["Assumptions",process.assumptions],["Checking",process.checking],["Interpretation",process.interpretation]].map(([label,value])=><div key={String(label)} className="rounded-lg bg-slate-50 p-3 text-center"><p className="text-xs text-slate-500">{label}</p><p className="font-bold">{value}/4</p></div>)}</div><p className="mt-3 text-sm"><strong>Next:</strong> {process.nextAction}</p></div>:null}<div className="flex flex-wrap items-center justify-between gap-3"><div className="text-sm text-slate-500">{mutating?<span className="inline-flex items-center gap-2"><Loader2 className="size-4 animate-spin"/>Generating and independently checking the next mutation…</span>:mutationNote}</div><Button onClick={next}>{mutated?"Try verified mutation":"Next question"}<ArrowRight/></Button></div></CardContent></Card>
  </div></main>

  return <main className="min-h-screen bg-[#f3f6f6] text-[#172b3a]"><div className="mx-auto max-w-6xl space-y-5 px-4 py-6 sm:px-6 lg:px-8">
    <div className="flex flex-wrap items-center justify-between gap-3"><Button asChild variant="ghost"><Link href="/test-player"><ArrowLeft/>Exit adaptive mode</Link></Button><div className="flex items-center gap-2"><Badge variant="outline">{test}</Badge><Badge variant="outline">Question {Math.min(SESSION_LENGTH,attempts.length+1)}/{SESSION_LENGTH}</Badge></div></div>
    <Card className="border-0 bg-[#102a43] text-white"><CardHeader><div className="flex flex-wrap items-center gap-2"><Badge className="bg-white/10 text-white">{current.section}</Badge><Badge className="bg-white/10 text-white">{current.difficulty}</Badge></div><CardTitle className="font-serif text-2xl leading-8">{current.prompt}</CardTitle></CardHeader></Card>
    <div className="grid gap-5 lg:grid-cols-[1fr_330px]"><Card><CardHeader><CardTitle>Choose an answer</CardTitle></CardHeader><CardContent className="space-y-3">{current.options.map((option,optionIndex)=><button key={`${optionIndex}-${option}`} onClick={()=>choose(optionIndex)} className={`w-full rounded-xl border p-4 text-left text-sm leading-6 ${selected===optionIndex?"border-[#147d91] bg-cyan-50":"bg-white hover:bg-slate-50"}`}><span className="mr-2 font-bold">{String.fromCharCode(65+optionIndex)}.</span>{option}</button>)}<Textarea value={reasoning} onChange={event=>setReasoning(event.target.value)} rows={5} placeholder="Optional but recommended: show the method, inference or check you used. This is scored separately from the raw mark."/></CardContent></Card>
      <aside className="space-y-4"><Card><CardHeader><Gauge className="size-5 text-[#147d91]"/><CardTitle className="text-lg">Confidence before marking</CardTitle><CardDescription>Record this before you know whether the answer is right.</CardDescription></CardHeader><CardContent><div className="mb-2 flex items-center justify-between text-sm"><span>Confidence</span><strong>{confidence}%</strong></div><input className="w-full" type="range" min="0" max="100" step="5" value={confidence} onChange={event=>setConfidence(Number(event.target.value))}/></CardContent></Card><Card><CardHeader><TriangleAlert className="size-5 text-amber-700"/><CardTitle className="text-lg">Question state</CardTitle></CardHeader><CardContent><label className="flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm"><input type="checkbox" checked={flagged} onChange={event=>setFlagged(event.target.checked)}/>Flag as uncertain / revisit</label><p className="mt-3 text-xs leading-5 text-slate-500">Changing your selected option is recorded because repeated reversals can indicate indecision rather than a content gap.</p></CardContent></Card><Button className="w-full" size="lg" onClick={submit} disabled={selected===undefined}><ShieldCheck/>Lock answer and diagnose</Button>{notice?<p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{notice}</p>:null}</aside>
    </div>
  </div></main>
}

function Metric({label,value}:{label:string;value:string}){return <div className="rounded-xl border bg-white p-4"><p className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</p><p className="mt-1 text-xl font-bold text-[#147d91]">{value}</p></div>}

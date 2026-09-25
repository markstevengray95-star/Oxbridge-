"use client"

import Link from "next/link"
import { useEffect, useMemo, useRef, useState } from "react"
import { AlarmClock, ArrowLeft, ArrowRight, CheckCircle2, Clock3, FileText, Flag, RotateCcw, Save, Trophy } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import { buildFullPaper, esatOptionalModules, paperCatalog, type EsatModule, type FullPaperTest, type PaperForm } from "@/lib/full-paper-system"
import {
  countCorrectStatements,
  isQuestionAnswered,
  isQuestionFullyCorrect,
  isYesNoStatementQuestion,
  questionMaxMarks,
  questionRawMark,
  setStatementResponse,
  statementAnswerLabel,
  statementResponse,
  type FullPaperQuestion,
} from "@/lib/full-paper-question"

const DRAFT_KEY = "oxbridge-full-paper-draft-v1"
const PROGRESS_KEY = "oxbridge-tutor-progress-v2"
const LAST_RESULT_KEY = "oxbridge-last-full-test-result-v1"

type Stage = "setup" | "exam" | "break" | "results"
type Draft = {
  test: FullPaperTest
  form: PaperForm
  esatExtras: EsatModule[]
  sectionIndex: number
  questionIndex: number
  answers: Record<string, number>
  flags: string[]
  essayResponses: Record<string, string>
  essayPrompts: Record<string, string>
  timeLeft: number
  stage: "exam" | "break"
  startedAt: number
  savedAt: number
}

type SectionScore = {
  id: string
  title: string
  kind: "mcq" | "essay"
  rawMark: number
  maxMarks: number
  questionCount: number
  answered: number
  accuracy: number
  words?: number
}

function formatClock(totalSeconds: number) {
  const safe = Math.max(0, totalSeconds)
  const minutes = Math.floor(safe / 60)
  const seconds = safe % 60
  return `${minutes}:${String(seconds).padStart(2, "0")}`
}

function countWords(text: string) {
  return text.trim() ? text.trim().split(/\s+/).length : 0
}

function readDraft(): Draft | null {
  try {
    const parsed = JSON.parse(localStorage.getItem(DRAFT_KEY) || "null") as Draft | null
    return parsed && (parsed.stage === "exam" || parsed.stage === "break") ? parsed : null
  } catch {
    return null
  }
}

function answerSummary(question: FullPaperQuestion, response: number | undefined) {
  if (!isYesNoStatementQuestion(question)) {
    return response === undefined ? "Unanswered" : question.options[response] ?? "Invalid response"
  }
  return question.statements.map((_, index) => {
    const value = statementResponse(response, index)
    return `${index + 1}: ${value === undefined ? "—" : value ? "Yes" : "No"}`
  }).join(" · ")
}

function correctAnswerSummary(question: FullPaperQuestion) {
  if (!isYesNoStatementQuestion(question)) return question.options[question.answer] ?? ""
  return question.statements.map((_, index) => `${index + 1}: ${statementAnswerLabel(question, index)}`).join(" · ")
}

export default function FullPaperCentre() {
  const [stage, setStage] = useState<Stage>("setup")
  const [test, setTest] = useState<FullPaperTest>("TMUA")
  const [form, setForm] = useState<PaperForm>(1)
  const [esatExtra1, setEsatExtra1] = useState<EsatModule>("Physics")
  const [esatExtra2, setEsatExtra2] = useState<EsatModule>("Mathematics 2")
  const [sectionIndex, setSectionIndex] = useState(0)
  const [questionIndex, setQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [flags, setFlags] = useState<string[]>([])
  const [essayResponses, setEssayResponses] = useState<Record<string, string>>({})
  const [essayPrompts, setEssayPrompts] = useState<Record<string, string>>({})
  const [timeLeft, setTimeLeft] = useState(0)
  const [savedDraft, setSavedDraft] = useState<Draft | null>(null)
  const [startedAt, setStartedAt] = useState(0)
  const savedResultRef = useRef(false)

  const esatExtras = useMemo(() => {
    const chosen = [esatExtra1, esatExtra2].filter((item, index, all) => all.indexOf(item) === index)
    const fallback = esatOptionalModules.filter(item => !chosen.includes(item))
    return [...chosen, ...fallback].slice(0, 2)
  }, [esatExtra1, esatExtra2])

  const paper = useMemo(() => buildFullPaper(test, form, ["Mathematics 1", ...esatExtras]), [test, form, esatExtras])
  const section = paper.sections[sectionIndex]
  const question = section?.kind === "mcq" ? section.questions[questionIndex] : undefined
  const sectionAnswered = section?.kind === "mcq"
    ? section.questions.filter(item => isQuestionAnswered(item, answers[item.id])).length
    : 0
  const sectionFlagged = section?.kind === "mcq" ? section.questions.filter(item => flags.includes(item.id)).length : 0
  const essayText = section?.kind === "essay" ? essayResponses[section.id] ?? "" : ""
  const essayWords = countWords(essayText)

  useEffect(() => setSavedDraft(readDraft()), [])

  useEffect(() => {
    if (stage !== "exam") return
    if (timeLeft <= 0) {
      if (sectionIndex >= paper.sections.length - 1) {
        setStage("results")
        localStorage.removeItem(DRAFT_KEY)
        setSavedDraft(null)
      } else {
        setStage("break")
      }
      return
    }
    const timer = window.setInterval(() => setTimeLeft(value => Math.max(0, value - 1)), 1000)
    return () => window.clearInterval(timer)
  }, [stage, timeLeft, sectionIndex, paper.sections.length])

  useEffect(() => {
    if (stage !== "exam" && stage !== "break") return
    const draft: Draft = {
      test, form, esatExtras, sectionIndex, questionIndex, answers, flags,
      essayResponses, essayPrompts, timeLeft, stage, startedAt, savedAt: Date.now(),
    }
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
    setSavedDraft(draft)
  }, [stage, test, form, esatExtras, sectionIndex, questionIndex, answers, flags, essayResponses, essayPrompts, timeLeft, startedAt])

  const scores = useMemo<SectionScore[]>(() => paper.sections.map(item => {
    if (item.kind === "essay") {
      return {
        id: item.id, title: item.title, kind: "essay", rawMark: 0, maxMarks: 0,
        questionCount: 0, answered: essayResponses[item.id]?.trim() ? 1 : 0,
        accuracy: 0, words: countWords(essayResponses[item.id] ?? ""),
      }
    }
    const rawMark = item.questions.reduce((sum, q) => sum + questionRawMark(q, answers[q.id]), 0)
    const maxMarks = item.questions.reduce((sum, q) => sum + questionMaxMarks(q), 0)
    const answered = item.questions.filter(q => isQuestionAnswered(q, answers[q.id])).length
    return {
      id: item.id, title: item.title, kind: "mcq", rawMark, maxMarks,
      questionCount: item.questions.length, answered,
      accuracy: maxMarks ? Math.round(rawMark / maxMarks * 100) : 0,
    }
  }), [paper, answers, essayResponses])

  const totalRawMark = scores.reduce((sum, item) => sum + item.rawMark, 0)
  const maxRawMarks = scores.reduce((sum, item) => sum + item.maxMarks, 0)
  const totalQuestionCount = scores.reduce((sum, item) => sum + item.questionCount, 0)
  const totalAccuracy = maxRawMarks ? Math.round(totalRawMark / maxRawMarks * 100) : 0

  function startPaper() {
    const fresh = buildFullPaper(test, form, ["Mathematics 1", ...esatExtras])
    setSectionIndex(0); setQuestionIndex(0); setAnswers({}); setFlags([])
    setEssayResponses({}); setEssayPrompts({}); setStartedAt(Date.now())
    setTimeLeft(fresh.sections[0].durationMinutes * 60)
    savedResultRef.current = false
    setStage("exam")
  }

  function resumePaper() {
    if (!savedDraft) return
    setTest(savedDraft.test); setForm(savedDraft.form)
    const extras = savedDraft.esatExtras.filter(item => item !== "Mathematics 1")
    if (extras[0]) setEsatExtra1(extras[0])
    if (extras[1]) setEsatExtra2(extras[1])
    setSectionIndex(savedDraft.sectionIndex); setQuestionIndex(savedDraft.questionIndex)
    setAnswers(savedDraft.answers); setFlags(savedDraft.flags)
    setEssayResponses(savedDraft.essayResponses); setEssayPrompts(savedDraft.essayPrompts)
    setStartedAt(savedDraft.startedAt || Date.now())
    const elapsedAway = savedDraft.stage === "exam" ? Math.floor((Date.now() - savedDraft.savedAt) / 1000) : 0
    setTimeLeft(Math.max(0, savedDraft.timeLeft - elapsedAway))
    savedResultRef.current = false
    setStage(savedDraft.stage)
  }

  function selectAnswer(index: number) {
    if (!question || isYesNoStatementQuestion(question)) return
    setAnswers(current => ({ ...current, [question.id]: index }))
  }

  function selectStatementAnswer(index: number, value: boolean) {
    if (!question || !isYesNoStatementQuestion(question)) return
    setAnswers(current => ({ ...current, [question.id]: setStatementResponse(current[question.id], index, value) }))
  }

  function toggleFlag() {
    if (!question) return
    setFlags(current => current.includes(question.id) ? current.filter(id => id !== question.id) : [...current, question.id])
  }

  function completePaper() {
    setStage("results")
    localStorage.removeItem(DRAFT_KEY)
    setSavedDraft(null)
  }

  function finishSection(automatic = false) {
    if (!section) return
    if (!automatic && typeof window !== "undefined") {
      const unanswered = section.kind === "mcq" ? section.questions.length - sectionAnswered : essayText.trim() ? 0 : 1
      const message = unanswered > 0
        ? `You still have ${unanswered} unanswered item${unanswered === 1 ? "" : "s"}. Submit this section anyway? You will not be able to return.`
        : "Submit this section? You will not be able to return."
      if (!window.confirm(message)) return
    }
    if (sectionIndex >= paper.sections.length - 1) completePaper()
    else setStage("break")
  }

  function continueToNextSection() {
    const nextIndex = sectionIndex + 1
    const nextSection = paper.sections[nextIndex]
    if (!nextSection) return completePaper()
    setSectionIndex(nextIndex); setQuestionIndex(0); setTimeLeft(nextSection.durationMinutes * 60); setStage("exam")
  }

  useEffect(() => {
    if (stage !== "results" || savedResultRef.current) return
    savedResultRef.current = true
    try {
      const current = JSON.parse(localStorage.getItem(PROGRESS_KEY) || "{}") as Record<string, unknown>
      const oldResults = Array.isArray(current.fullPaperResults) ? current.fullPaperResults : []
      const questionReview = paper.sections.flatMap(item => item.kind === "mcq" ? item.questions.map(q => ({
        questionId: q.id,
        section: item.title,
        difficulty: q.difficulty,
        prompt: q.prompt,
        responseType: q.responseType ?? "single",
        answer: answerSummary(q, answers[q.id]),
        correctAnswer: correctAnswerSummary(q),
        rawMark: questionRawMark(q, answers[q.id]),
        maxMarks: questionMaxMarks(q),
        correct: isQuestionFullyCorrect(q, answers[q.id]),
      })) : [])
      const completed = {
        id: `${paper.id}-${Date.now()}`,
        test: paper.test, form: paper.form, title: paper.title, date: new Date().toISOString(),
        rawScore: totalRawMark, maxRawMarks, totalQuestions: totalQuestionCount, accuracy: totalAccuracy,
        durationSeconds: startedAt ? Math.max(0, Math.round((Date.now() - startedAt) / 1000)) : null,
        sections: scores, essayPrompts, essayResponses, questionReview,
      }
      localStorage.setItem(PROGRESS_KEY, JSON.stringify({
        ...current,
        fullPapersCompleted: Number(current.fullPapersCompleted ?? 0) + 1,
        fullPaperResults: [completed, ...oldResults].slice(0, 30),
      }))
      localStorage.setItem(LAST_RESULT_KEY, JSON.stringify(completed))
    } catch {
      // Results remain visible in-session if persistence is unavailable.
    }
  }, [stage, paper, answers, totalRawMark, maxRawMarks, totalQuestionCount, totalAccuracy, scores, essayPrompts, essayResponses, startedAt])

  function resetToSetup() {
    localStorage.removeItem(DRAFT_KEY)
    setSavedDraft(null); setStage("setup"); setSectionIndex(0); setQuestionIndex(0)
    setAnswers({}); setFlags([]); setEssayResponses({}); setEssayPrompts({}); setTimeLeft(0)
  }

  if (stage === "setup") {
    return <main className="min-h-screen bg-slate-50 text-slate-950">
      <header className="border-b bg-slate-950 text-white"><div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4"><Link href="/student-home" className="inline-flex items-center gap-2 text-sm font-semibold"><ArrowLeft className="size-4" />Student Home</Link><Badge className="border-white/15 bg-white/10 text-white"><FileText className="size-3.5" />Full Paper Centre</Badge></div></header>
      <div className="mx-auto max-w-7xl space-y-7 px-4 py-8">
        <section className="grid gap-5 lg:grid-cols-[1.25fr_.75fr]"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-blue-700">Full timed simulations</p><h1 className="mt-2 font-serif text-4xl font-bold">Sit the whole test, not just isolated questions.</h1><p className="mt-3 max-w-3xl text-slate-600">Timed sections, locked submissions, flag-and-review, autosave, mixed response formats and mark-aware post-paper analysis.</p></div><Card className="shadow-none"><CardHeader><CardTitle className="font-serif text-xl">Practice scoring</CardTitle></CardHeader><CardContent><p className="text-sm leading-relaxed text-slate-600">Results use raw practice marks. The app does not invent official scaled scores, admissions probabilities or UCAT SJT bands.</p></CardContent></Card></section>

        {savedDraft && <Card className="border-blue-200 bg-blue-50 shadow-none"><CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-bold">Saved paper found</p><p className="text-sm text-slate-600">{savedDraft.test} · Form {savedDraft.form} · section {savedDraft.sectionIndex + 1}.</p></div><Button onClick={resumePaper}><Save />Resume mock</Button></CardContent></Card>}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">{paperCatalog.map(item => <button key={item.test} onClick={() => setTest(item.test)} className={`rounded-2xl border p-5 text-left transition ${test === item.test ? "border-blue-500 bg-blue-50 ring-2 ring-blue-100" : "bg-white hover:border-slate-400"}`}><div className="flex items-center justify-between"><strong className="text-lg">{item.test}</strong><span className="text-xs font-bold text-slate-500">{item.totalMinutes} min</span></div><p className="mt-2 font-semibold">{item.title}</p><p className="mt-2 text-xs leading-relaxed text-slate-500">{item.structure}</p></button>)}</section>

        <Card className="shadow-none"><CardHeader><CardTitle className="font-serif text-2xl">Configure your mock</CardTitle><CardDescription>{paper.note}</CardDescription></CardHeader><CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"><label><span className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">Test</span><NativeSelect value={test} onChange={event => setTest(event.target.value as FullPaperTest)}>{paperCatalog.map(item => <NativeSelectOption key={item.test}>{item.test}</NativeSelectOption>)}</NativeSelect></label><label><span className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">Practice form</span><NativeSelect value={String(form)} onChange={event => setForm(Number(event.target.value) as PaperForm)}><NativeSelectOption value="1">Form 1</NativeSelectOption><NativeSelectOption value="2">Form 2</NativeSelectOption></NativeSelect></label>{test === "ESAT" && <><label><span className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">Second module</span><NativeSelect value={esatExtra1} onChange={event => setEsatExtra1(event.target.value as EsatModule)}>{esatOptionalModules.map(item => <NativeSelectOption key={item}>{item}</NativeSelectOption>)}</NativeSelect></label><label><span className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">Third module</span><NativeSelect value={esatExtra2} onChange={event => setEsatExtra2(event.target.value as EsatModule)}>{esatOptionalModules.map(item => <NativeSelectOption key={item}>{item}</NativeSelectOption>)}</NativeSelect></label></>}<div className="md:col-span-2 lg:col-span-4"><div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{paper.sections.map(item => <div key={item.id} className="rounded-xl border bg-slate-50 p-4"><p className="font-semibold">{item.title}</p><p className="mt-1 text-sm text-slate-500">{item.kind === "mcq" ? `${item.questions.length} questions` : "Writing task"} · {item.durationMinutes} min</p></div>)}</div><Button size="lg" onClick={startPaper}><AlarmClock />Start {paper.title}</Button></div></CardContent></Card>
      </div>
    </main>
  }

  if (stage === "break") {
    return <main className="min-h-screen bg-slate-50 p-4 text-slate-950"><div className="mx-auto max-w-2xl py-16"><Card><CardHeader><Badge className="w-fit">Section locked</Badge><CardTitle className="font-serif text-3xl">{section.title} is complete.</CardTitle><CardDescription>You cannot return to a completed section. Your answers have been autosaved.</CardDescription></CardHeader><CardContent className="space-y-5">{section.kind === "mcq" ? <div className="grid grid-cols-3 gap-3"><Metric value={sectionAnswered} label="answered"/><Metric value={section.questions.length - sectionAnswered} label="unanswered"/><Metric value={sectionFlagged} label="flagged"/></div> : <Metric value={essayWords} label="words written"/>}<div className="rounded-xl border p-4"><p className="text-xs font-bold uppercase tracking-wider text-slate-500">Up next</p><p className="mt-1 text-lg font-bold">{paper.sections[sectionIndex + 1]?.title}</p><p className="mt-1 text-sm text-slate-600">{paper.sections[sectionIndex + 1]?.instructions}</p></div><Button size="lg" onClick={continueToNextSection}>Start next section <ArrowRight /></Button></CardContent></Card></div></main>
  }

  if (stage === "results") {
    const reviewQuestions = paper.sections.flatMap(item => item.kind === "mcq" ? item.questions.filter(q => !isQuestionFullyCorrect(q, answers[q.id])).map(q => ({ ...q, sectionTitle: item.title })) : [])
    return <main className="min-h-screen bg-slate-50 text-slate-950"><header className="border-b bg-slate-950 text-white"><div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4"><Link href="/student-home" className="inline-flex items-center gap-2 text-sm font-semibold"><ArrowLeft className="size-4" />Student Home</Link><Badge className="border-white/15 bg-white/10 text-white"><Trophy className="size-3.5" />Paper complete</Badge></div></header><div className="mx-auto max-w-7xl space-y-6 px-4 py-8"><section className="grid gap-4 lg:grid-cols-[1fr_auto]"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-blue-700">{paper.test} · Practice Form {paper.form}</p><h1 className="mt-2 font-serif text-4xl font-bold">Full mock analysis</h1><p className="mt-2 text-slate-600">Raw practice performance only — not an official scaled score or admissions prediction.</p></div><div className="grid grid-cols-3 gap-3"><ResultMetric value={`${totalRawMark}/${maxRawMarks}`} label="raw marks"/><ResultMetric value={`${totalAccuracy}%`} label="mark accuracy"/><ResultMetric value={String(totalQuestionCount)} label="questions"/></div></section>

      <Card className="shadow-none"><CardHeader><CardTitle className="font-serif text-2xl">Section breakdown</CardTitle></CardHeader><CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">{scores.map(item => <div key={item.id} className="rounded-xl border p-4"><p className="font-semibold">{item.title}</p>{item.kind === "mcq" ? <><p className="mt-2 text-2xl font-bold">{item.rawMark}/{item.maxMarks}</p><p className="text-sm text-slate-500">{item.accuracy}% of raw marks · {item.answered}/{item.questionCount} answered</p></> : <><p className="mt-2 text-2xl font-bold">{item.words ?? 0}</p><p className="text-sm text-slate-500">words · writing task unscored</p></>}</div>)}</CardContent></Card>

      {paper.sections.some(item => item.kind === "essay") && <Card className="shadow-none"><CardHeader><CardTitle className="font-serif text-2xl">Writing response</CardTitle></CardHeader><CardContent className="space-y-4">{paper.sections.filter(item => item.kind === "essay").map(item => <div key={item.id} className="rounded-xl border p-4"><p className="text-xs font-bold uppercase tracking-wider text-slate-500">{item.title}</p><p className="mt-2 font-semibold">{essayPrompts[item.id] || "No prompt selected"}</p><p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{essayResponses[item.id] || "No response submitted."}</p></div>)}</CardContent></Card>}

      <Card className="shadow-none"><CardHeader><CardTitle className="font-serif text-2xl">Error and partial-credit review</CardTitle><CardDescription>{reviewQuestions.length ? "Review every question that did not receive full raw marks." : "Every scored question received full raw marks."}</CardDescription></CardHeader><CardContent className="space-y-4">{reviewQuestions.map((item, index) => <div key={item.id} className="rounded-xl border p-4"><div className="flex flex-wrap gap-2"><Badge variant="outline">{item.sectionTitle}</Badge><Badge variant="outline">Review {index + 1}</Badge>{isYesNoStatementQuestion(item) && <Badge variant="outline">{questionRawMark(item, answers[item.id])}/{questionMaxMarks(item)} marks</Badge>}</div><p className="mt-3 whitespace-pre-line font-semibold">{item.prompt}</p>{isYesNoStatementQuestion(item) ? <div className="mt-3 space-y-2">{item.statements.map((statement, statementIndex) => { const actual = statementResponse(answers[item.id], statementIndex); const expected = statementAnswerLabel(item, statementIndex); return <div key={statementIndex} className="rounded-lg bg-slate-100 p-3 text-sm"><p className="font-medium">{statementIndex + 1}. {statement}</p><p className="mt-1 text-slate-600">Your answer: {actual === undefined ? "Unanswered" : actual ? "Yes" : "No"} · Correct: {expected}</p></div> })}<p className="text-sm text-slate-600">Correct statements: {countCorrectStatements(item, answers[item.id])}/5</p></div> : <div className="mt-3 grid gap-2 text-sm"><p><strong>Your answer:</strong> {answerSummary(item, answers[item.id])}</p><p><strong>Correct answer:</strong> {correctAnswerSummary(item)}</p></div>}<p className="mt-3 rounded-lg bg-slate-100 p-3 text-sm leading-relaxed"><strong>Why:</strong> {item.explanation}</p></div>)}</CardContent></Card>

      <div className="flex flex-wrap gap-3"><Button onClick={resetToSetup}><RotateCcw />Choose another paper</Button><Button variant="outline" asChild><Link href="/test-results">View test history</Link></Button><Button variant="outline" asChild><Link href="/advanced-practice">Target weak sections</Link></Button></div>
    </div></main>
  }

  if (!section) return null

  return <main className="min-h-screen bg-slate-100 text-slate-950">
    <header className="sticky top-14 z-50 border-b bg-white"><div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3"><div className="mr-auto"><p className="text-xs font-bold uppercase tracking-wider text-slate-500">{paper.test} · Form {paper.form}</p><p className="font-semibold">{section.title}</p></div><Badge variant="outline">Section {sectionIndex + 1}/{paper.sections.length}</Badge><div className={`flex items-center gap-2 rounded-xl border px-4 py-2 font-mono text-lg font-bold ${timeLeft <= 300 ? "border-amber-300 bg-amber-50" : "bg-white"}`}><Clock3 className="size-4" />{formatClock(timeLeft)}</div></div></header>

    <div className="mx-auto grid max-w-7xl gap-5 px-4 py-6 xl:grid-cols-[1fr_300px]">
      <section><Card className="shadow-none"><CardHeader className="border-b"><CardDescription>{section.instructions}</CardDescription>{section.kind === "mcq" && <><div className="flex items-center justify-between gap-3"><div className="flex flex-wrap items-center gap-2"><Badge>Question {questionIndex + 1} of {section.questions.length}</Badge>{question && isYesNoStatementQuestion(question) && <Badge variant="outline">5 statements · 2 marks</Badge>}</div>{question && <Button size="sm" variant={flags.includes(question.id) ? "default" : "outline"} onClick={toggleFlag}><Flag className={flags.includes(question.id) ? "fill-current" : ""} />{flags.includes(question.id) ? "Flagged" : "Flag"}</Button>}</div><Progress value={(questionIndex + 1) / section.questions.length * 100} /></>}</CardHeader><CardContent className="space-y-4 p-5 sm:p-7">
        {section.kind === "mcq" && question ? <><h2 className="whitespace-pre-line font-serif text-2xl font-bold leading-snug">{question.prompt}</h2>{isYesNoStatementQuestion(question) ? <div className="space-y-3">{question.statements.map((statement, index) => { const selected = statementResponse(answers[question.id], index); return <div key={index} className="rounded-xl border bg-white p-4"><p className="font-medium leading-relaxed">{index + 1}. {statement}</p><div className="mt-3 grid grid-cols-2 gap-2"><button onClick={() => selectStatementAnswer(index, true)} className={`rounded-lg border px-4 py-2 font-semibold ${selected === true ? "border-blue-500 bg-blue-50" : "hover:border-slate-400"}`}>Yes</button><button onClick={() => selectStatementAnswer(index, false)} className={`rounded-lg border px-4 py-2 font-semibold ${selected === false ? "border-blue-500 bg-blue-50" : "hover:border-slate-400"}`}>No</button></div></div>})}</div> : <div className="space-y-3">{question.options.map((option, index) => <button key={`${question.id}-${index}`} onClick={() => selectAnswer(index)} className={`flex w-full items-start gap-3 rounded-xl border p-4 text-left transition ${answers[question.id] === index ? "border-blue-500 bg-blue-50 ring-1 ring-blue-200" : "bg-white hover:border-slate-400"}`}><span className="grid size-8 shrink-0 place-items-center rounded-full border bg-white text-sm font-bold">{String.fromCharCode(65 + index)}</span><span>{option}</span></button>)}</div>}<div className="flex items-center justify-between pt-3"><Button variant="outline" disabled={questionIndex === 0} onClick={() => setQuestionIndex(index => Math.max(0, index - 1))}>Previous</Button><Button disabled={questionIndex >= section.questions.length - 1} onClick={() => setQuestionIndex(index => Math.min(section.questions.length - 1, index + 1))}>Next <ArrowRight /></Button></div></> : section.kind === "essay" ? <><div className="space-y-2"><p className="font-serif text-2xl font-bold">Choose one prompt</p>{section.essayChoices?.map(prompt => <button key={prompt} onClick={() => setEssayPrompts(current => ({ ...current, [section.id]: prompt }))} className={`w-full rounded-xl border p-4 text-left ${essayPrompts[section.id] === prompt ? "border-blue-500 bg-blue-50" : "bg-white hover:border-slate-400"}`}>{prompt}</button>)}</div><Textarea value={essayText} onChange={event => setEssayResponses(current => ({ ...current, [section.id]: event.target.value }))} className="min-h-[360px]" placeholder="Write your response here…"/><div className="flex justify-between text-sm text-slate-500"><span>{essayWords} words</span>{section.wordLimit && <span>{Math.max(0, section.wordLimit - essayWords)} remaining</span>}</div></> : null}
      </CardContent></Card></section>

      <aside className="space-y-4"><Card className="shadow-none"><CardHeader><CardTitle className="font-serif text-xl">Section navigator</CardTitle></CardHeader><CardContent>{section.kind === "mcq" ? <div className="grid grid-cols-5 gap-2">{section.questions.map((item, index) => { const answered = isQuestionAnswered(item, answers[item.id]); return <button key={item.id} onClick={() => setQuestionIndex(index)} className={`relative rounded-lg border p-2 text-sm font-bold ${index === questionIndex ? "border-blue-500 bg-blue-50" : answered ? "border-emerald-200 bg-emerald-50" : "bg-white"}`}>{index + 1}{flags.includes(item.id) && <Flag className="absolute -right-1 -top-1 size-3 fill-current text-amber-600" />}</button>})}</div> : <p className="text-sm text-slate-600">Writing task · {essayWords} words</p>}</CardContent></Card><Card className="shadow-none"><CardContent className="space-y-3 p-4"><div className="flex justify-between text-sm"><span>Answered</span><strong>{section.kind === "mcq" ? `${sectionAnswered}/${section.questions.length}` : essayText.trim() ? "1/1" : "0/1"}</strong></div><Button className="w-full" onClick={() => finishSection(false)}><CheckCircle2 />Submit section</Button></CardContent></Card></aside>
    </div>
  </main>
}

function Metric({ value, label }: { value: number; label: string }) {
  return <div className="rounded-xl bg-slate-100 p-4"><p className="text-2xl font-bold">{value}</p><p className="text-xs text-slate-500">{label}</p></div>
}

function ResultMetric({ value, label }: { value: string; label: string }) {
  return <div className="rounded-2xl border bg-white p-4 text-center"><p className="text-3xl font-bold">{value}</p><p className="text-xs text-slate-500">{label}</p></div>
}

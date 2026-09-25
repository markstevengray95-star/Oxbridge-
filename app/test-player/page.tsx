"use client"

import Link from "next/link"
import { useEffect, useMemo, useRef, useState } from "react"
import { Accessibility, ArrowLeft, ArrowRight, CheckCircle2, Clock3, Flag, Keyboard, Maximize2, Minimize2, RotateCcw, Target, Trophy } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { Textarea } from "@/components/ui/textarea"
import { buildFullPaper, paperCatalog, type FullPaperTest, type PaperForm } from "@/lib/full-paper-system"

const PROGRESS_KEY = "oxbridge-tutor-progress-v2"
const LAST_RESULT_KEY = "oxbridge-last-full-test-result-v1"

type Stage = "setup" | "exam" | "results"

type SectionScore = {
  id: string
  title: string
  kind: "mcq" | "essay"
  correct: number
  total: number
  answered: number
  accuracy: number
  words?: number
}

type DifficultyScore = {
  difficulty: string
  correct: number
  total: number
  accuracy: number
}

function countWords(text: string) {
  return text.trim() ? text.trim().split(/\s+/).length : 0
}

export default function TestPlayerPage() {
  const [test, setTest] = useState<FullPaperTest>("TMUA")
  const [form, setForm] = useState<PaperForm>(1)
  const [stage, setStage] = useState<Stage>("setup")
  const [sectionIndex, setSectionIndex] = useState(0)
  const [questionIndex, setQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [flags, setFlags] = useState<string[]>([])
  const [essayResponses, setEssayResponses] = useState<Record<string, string>>({})
  const [essayPrompts, setEssayPrompts] = useState<Record<string, string>>({})
  const [timeLeft, setTimeLeft] = useState(0)
  const [largeText, setLargeText] = useState(false)
  const [highContrast, setHighContrast] = useState(false)
  const [compact, setCompact] = useState(false)
  const [startedAt, setStartedAt] = useState(0)
  const savedResultRef = useRef(false)

  const paper = useMemo(() => buildFullPaper(test, form), [test, form])
  const section = paper.sections[sectionIndex]
  const questions = section?.kind === "mcq" ? section.questions : []
  const question = section?.kind === "mcq" ? questions[questionIndex] : undefined
  const essayText = section?.kind === "essay" ? essayResponses[section.id] ?? "" : ""

  const scores = useMemo<SectionScore[]>(() => paper.sections.map(item => {
    if (item.kind === "essay") {
      return {
        id: item.id,
        title: item.title,
        kind: "essay",
        correct: 0,
        total: 0,
        answered: essayResponses[item.id]?.trim() ? 1 : 0,
        accuracy: 0,
        words: countWords(essayResponses[item.id] ?? ""),
      }
    }
    const correct = item.questions.filter(q => answers[q.id] === q.answer).length
    const answered = item.questions.filter(q => answers[q.id] !== undefined).length
    return {
      id: item.id,
      title: item.title,
      kind: "mcq",
      correct,
      total: item.questions.length,
      answered,
      accuracy: item.questions.length ? Math.round(correct / item.questions.length * 100) : 0,
    }
  }), [paper, answers, essayResponses])

  const allMcqQuestions = useMemo(() => paper.sections.flatMap(item => item.kind === "mcq" ? item.questions : []), [paper])
  const totalCorrect = scores.reduce((sum, item) => sum + item.correct, 0)
  const totalQuestions = scores.reduce((sum, item) => sum + item.total, 0)
  const totalAnswered = scores.reduce((sum, item) => sum + (item.kind === "mcq" ? item.answered : 0), 0)
  const totalAccuracy = totalQuestions ? Math.round(totalCorrect / totalQuestions * 100) : 0

  const difficultyScores = useMemo<DifficultyScore[]>(() => {
    const order = ["Foundation", "Stretch", "Challenge"]
    return order.map(difficulty => {
      const pool = allMcqQuestions.filter(q => q.difficulty === difficulty)
      const correct = pool.filter(q => answers[q.id] === q.answer).length
      return {
        difficulty,
        correct,
        total: pool.length,
        accuracy: pool.length ? Math.round(correct / pool.length * 100) : 0,
      }
    }).filter(item => item.total > 0)
  }, [allMcqQuestions, answers])

  const reviewQuestions = useMemo(() => paper.sections.flatMap(item => item.kind === "mcq"
    ? item.questions.filter(q => answers[q.id] !== q.answer).map(q => ({ ...q, sectionTitle: item.title }))
    : []), [paper, answers])

  const weakestSection = useMemo(() => {
    const mcq = scores.filter(item => item.kind === "mcq" && item.total > 0)
    return [...mcq].sort((a, b) => a.accuracy - b.accuracy)[0]
  }, [scores])

  const strongestSection = useMemo(() => {
    const mcq = scores.filter(item => item.kind === "mcq" && item.total > 0)
    return [...mcq].sort((a, b) => b.accuracy - a.accuracy)[0]
  }, [scores])

  useEffect(() => {
    if (stage !== "exam" || timeLeft <= 0) return
    const timer = window.setInterval(() => setTimeLeft(value => Math.max(0, value - 1)), 1000)
    return () => window.clearInterval(timer)
  }, [stage, timeLeft])

  useEffect(() => {
    if (stage !== "exam" || timeLeft > 0) return
    submitSection(true)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, timeLeft, sectionIndex])

  useEffect(() => {
    if (stage !== "exam" || !question) return
    const handler = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLInputElement) return
      const key = event.key.toLowerCase()
      if (["a", "b", "c", "d", "e"].includes(key)) {
        const index = key.charCodeAt(0) - 97
        if (question.options[index]) setAnswers(current => ({ ...current, [question.id]: index }))
      }
      if (key === "f") setFlags(current => current.includes(question.id) ? current.filter(id => id !== question.id) : [...current, question.id])
      if (event.key === "ArrowRight") setQuestionIndex(index => Math.min(questions.length - 1, index + 1))
      if (event.key === "ArrowLeft") setQuestionIndex(index => Math.max(0, index - 1))
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [stage, question, questions.length])

  useEffect(() => {
    if (stage !== "results" || savedResultRef.current) return
    savedResultRef.current = true
    const completed = {
      id: `${paper.id}-${Date.now()}`,
      source: "test-player",
      test: paper.test,
      form: paper.form,
      title: paper.title,
      date: new Date().toISOString(),
      rawScore: totalCorrect,
      totalQuestions,
      answered: totalAnswered,
      accuracy: totalAccuracy,
      durationSeconds: startedAt ? Math.max(0, Math.round((Date.now() - startedAt) / 1000)) : null,
      flagged: flags.length,
      sections: scores,
      difficultyScores,
      weakestSection: weakestSection?.title ?? null,
      strongestSection: strongestSection?.title ?? null,
      essayPrompts,
      essayResponses,
      questionReview: allMcqQuestions.map(q => ({
        id: q.id,
        section: paper.sections.find(item => item.kind === "mcq" && item.questions.some(candidate => candidate.id === q.id))?.title ?? q.section,
        difficulty: q.difficulty,
        prompt: q.prompt,
        selectedAnswer: answers[q.id] === undefined ? null : q.options[answers[q.id]],
        correctAnswer: q.options[q.answer],
        correct: answers[q.id] === q.answer,
        explanation: q.explanation,
      })),
    }
    try {
      localStorage.setItem(LAST_RESULT_KEY, JSON.stringify(completed))
      const current = JSON.parse(localStorage.getItem(PROGRESS_KEY) || "{}") as Record<string, unknown>
      const oldResults = Array.isArray(current.fullPaperResults) ? current.fullPaperResults : []
      localStorage.setItem(PROGRESS_KEY, JSON.stringify({ ...current, fullPaperResults: [completed, ...oldResults].slice(0, 30) }))
    } catch {
      // Results still render in the current session if persistence is unavailable.
    }
  }, [stage, paper, totalCorrect, totalQuestions, totalAnswered, totalAccuracy, startedAt, flags.length, scores, difficultyScores, weakestSection, strongestSection, essayPrompts, essayResponses, allMcqQuestions, answers])

  function start() {
    const first = paper.sections[0]
    if (!first) return
    setSectionIndex(0)
    setQuestionIndex(0)
    setAnswers({})
    setFlags([])
    setEssayResponses({})
    setEssayPrompts({})
    setTimeLeft(first.durationMinutes * 60)
    setStartedAt(Date.now())
    savedResultRef.current = false
    setStage("exam")
  }

  function submitSection(automatic = false) {
    if (!section) return
    if (!automatic && typeof window !== "undefined") {
      const unanswered = section.kind === "mcq"
        ? section.questions.filter(item => answers[item.id] === undefined).length
        : essayText.trim() ? 0 : 1
      const message = unanswered > 0
        ? `You still have ${unanswered} unanswered item${unanswered === 1 ? "" : "s"}. Submit this section anyway? You will not be able to return.`
        : "Submit this section? You will not be able to return."
      if (!window.confirm(message)) return
    }

    const nextIndex = sectionIndex + 1
    const nextSection = paper.sections[nextIndex]
    if (!nextSection) {
      setStage("results")
      return
    }
    setSectionIndex(nextIndex)
    setQuestionIndex(0)
    setTimeLeft(nextSection.durationMinutes * 60)
  }

  function format(seconds: number) {
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`
  }

  if (stage === "setup") return <main className="min-h-screen bg-slate-100 text-slate-950"><div className="mx-auto max-w-5xl px-4 py-8"><div className="mb-6 flex items-center justify-between"><Button asChild variant="ghost"><Link href="/tutor"><ArrowLeft />Personal Tutor</Link></Button><Badge variant="outline"><Keyboard className="size-3.5" />Test Player</Badge></div><Card><CardHeader><CardTitle className="font-serif text-3xl">Pearson-style practice environment</CardTitle><CardDescription>Full-paper mode now includes section submission, timed progression and a saved analysis after completion.</CardDescription></CardHeader><CardContent className="space-y-5"><p className="max-w-3xl text-slate-600">Practise navigation and timed decision-making in a stripped-back test interface. Use A–E to answer, F to flag, and the arrow keys to move. Completed sections lock automatically and your final result is saved to Results History.</p><div className="grid gap-4 sm:grid-cols-2"><label><span className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">Test</span><NativeSelect value={test} onChange={event => setTest(event.target.value as FullPaperTest)}>{paperCatalog.map(item => <NativeSelectOption key={item.test}>{item.test}</NativeSelectOption>)}</NativeSelect></label><label><span className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">Form</span><NativeSelect value={String(form)} onChange={event => setForm(Number(event.target.value) as PaperForm)}><NativeSelectOption value="1">Form 1</NativeSelectOption><NativeSelectOption value="2">Form 2</NativeSelectOption></NativeSelect></label></div><div className="rounded-xl border bg-slate-50 p-4 text-sm"><strong>{paper.title}</strong><p className="mt-1 text-slate-600">{paper.sections.map(item => `${item.title}: ${item.kind === "mcq" ? `${item.questions.length} questions` : "writing task"} · ${item.durationMinutes} min`).join(" | ")}</p></div><div className="flex flex-wrap gap-3"><Button size="lg" onClick={start}>Open full test player</Button><Button asChild variant="outline"><Link href="/test-results"><Trophy />Results history</Link></Button></div></CardContent></Card></div></main>

  if (stage === "results") {
    const unanswered = totalQuestions - totalAnswered
    return <main className="min-h-screen bg-slate-50 text-slate-950"><header className="border-b bg-slate-950 text-white"><div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4"><Link href="/student-home" className="inline-flex items-center gap-2 text-sm font-semibold"><ArrowLeft className="size-4" />Student Home</Link><Badge className="border-white/15 bg-white/10 text-white"><Trophy className="size-3.5" />Full test complete</Badge></div></header><div className="mx-auto max-w-7xl space-y-6 px-4 py-8">
      <section className="grid gap-5 lg:grid-cols-[1fr_auto]"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-blue-700">{paper.test} · Practice Form {paper.form}</p><h1 className="mt-2 font-serif text-4xl font-bold">Your full-test analysis</h1><p className="mt-2 max-w-3xl text-slate-600">This is practice analysis using raw marks and accuracy, not an official scaled score or admissions prediction. Your result has been saved locally so you can reopen it from Results History.</p></div><div className="grid grid-cols-3 gap-3"><div className="rounded-2xl border bg-white p-4 text-center"><p className="text-3xl font-bold">{totalCorrect}/{totalQuestions}</p><p className="text-xs text-slate-500">raw mark</p></div><div className="rounded-2xl border bg-white p-4 text-center"><p className="text-3xl font-bold">{totalAccuracy}%</p><p className="text-xs text-slate-500">accuracy</p></div><div className="rounded-2xl border bg-white p-4 text-center"><p className="text-3xl font-bold">{unanswered}</p><p className="text-xs text-slate-500">unanswered</p></div></div></section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"><Card><CardHeader><Target className="size-5 text-blue-700" /><CardTitle className="text-lg">Strongest section</CardTitle></CardHeader><CardContent><p className="font-semibold">{strongestSection?.title ?? "No scored section"}</p><p className="mt-1 text-sm text-slate-500">{strongestSection ? `${strongestSection.accuracy}% accuracy` : "Complete an MCQ section for analysis."}</p></CardContent></Card><Card><CardHeader><Target className="size-5 text-amber-700" /><CardTitle className="text-lg">Priority section</CardTitle></CardHeader><CardContent><p className="font-semibold">{weakestSection?.title ?? "No scored section"}</p><p className="mt-1 text-sm text-slate-500">{weakestSection ? `${weakestSection.accuracy}% accuracy — review this first.` : "Complete an MCQ section for analysis."}</p></CardContent></Card><Card><CardHeader><Flag className="size-5 text-amber-700" /><CardTitle className="text-lg">Flagged</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{flags.length}</p><p className="mt-1 text-sm text-slate-500">Questions you marked for uncertainty.</p></CardContent></Card><Card><CardHeader><CheckCircle2 className="size-5 text-emerald-700" /><CardTitle className="text-lg">Answered</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{totalAnswered}/{totalQuestions}</p><p className="mt-1 text-sm text-slate-500">Completion across scored questions.</p></CardContent></Card></section>

      <Card><CardHeader><CardTitle className="font-serif text-2xl">Section breakdown</CardTitle></CardHeader><CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">{scores.map(item => <div key={item.id} className="rounded-xl border p-4"><p className="font-semibold">{item.title}</p>{item.kind === "mcq" ? <><p className="mt-2 text-2xl font-bold">{item.correct}/{item.total}</p><p className="text-sm text-slate-500">{item.accuracy}% · {item.answered} answered</p></> : <><p className="mt-2 text-2xl font-bold">{item.words ?? 0}</p><p className="text-sm text-slate-500">words · writing task unscored</p></>}</div>)}</CardContent></Card>

      <Card><CardHeader><CardTitle className="font-serif text-2xl">Difficulty analysis</CardTitle><CardDescription>This helps separate routine slips from errors on more demanding reasoning items.</CardDescription></CardHeader><CardContent className="grid gap-3 sm:grid-cols-3">{difficultyScores.map(item => <div key={item.difficulty} className="rounded-xl border p-4"><p className="text-xs font-bold uppercase tracking-wider text-slate-500">{item.difficulty}</p><p className="mt-2 text-2xl font-bold">{item.accuracy}%</p><p className="text-sm text-slate-500">{item.correct}/{item.total} correct</p></div>)}</CardContent></Card>

      {paper.sections.some(item => item.kind === "essay") && <Card><CardHeader><CardTitle className="font-serif text-2xl">Writing response</CardTitle><CardDescription>Writing tasks are preserved for review but are not given a fabricated numerical mark.</CardDescription></CardHeader><CardContent className="space-y-4">{paper.sections.filter(item => item.kind === "essay").map(item => <div key={item.id} className="rounded-xl border p-4"><p className="text-xs font-bold uppercase tracking-wider text-slate-500">{item.title}</p><p className="mt-2 font-semibold">{essayPrompts[item.id] || "No prompt selected"}</p><p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-700">{essayResponses[item.id] || "No response submitted."}</p></div>)}</CardContent></Card>}

      <Card><CardHeader><CardTitle className="font-serif text-2xl">Question-by-question error review</CardTitle><CardDescription>{reviewQuestions.length ? `${reviewQuestions.length} incorrect or unanswered questions. Each includes the correct answer and reasoning.` : "No incorrect or unanswered MCQ questions."}</CardDescription></CardHeader><CardContent className="space-y-4">{reviewQuestions.map((item, index) => <div key={item.id} className="rounded-xl border p-4"><div className="flex flex-wrap gap-2"><Badge variant="outline">{item.sectionTitle}</Badge><Badge variant="outline">{item.difficulty}</Badge><Badge variant="outline">Review {index + 1}</Badge></div><p className="mt-3 whitespace-pre-line font-semibold leading-6">{item.prompt}</p><div className="mt-3 space-y-2 text-sm"><p><strong>Your answer:</strong> {answers[item.id] === undefined ? "Unanswered" : item.options[answers[item.id]]}</p><p><strong>Correct answer:</strong> {item.options[item.answer]}</p><p className="rounded-lg bg-slate-100 p-3 leading-6"><strong>Explanation:</strong> {item.explanation}</p></div></div>)}</CardContent></Card>

      <div className="flex flex-wrap gap-3"><Button onClick={() => setStage("setup")}><RotateCcw />Take another test</Button><Button asChild variant="outline"><Link href="/test-results"><Trophy />Open results history</Link></Button><Button asChild variant="outline"><Link href="/advanced-practice">Target weak sections</Link></Button></div>
    </div></main>
  }

  if (!section) return null

  const selected = question ? answers[question.id] : undefined
  const flagged = question ? flags.includes(question.id) : false
  const answeredInSection = section.kind === "mcq" ? section.questions.filter(item => answers[item.id] !== undefined).length : essayText.trim() ? 1 : 0
  const theme = highContrast ? "bg-black text-white" : "bg-slate-100 text-slate-950"

  return <main className={`min-h-screen ${theme} ${largeText ? "text-lg" : ""}`}>
    <header className={`sticky top-0 z-50 border-b ${highContrast ? "border-white bg-black" : "bg-white"}`}><div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3"><div className="mr-auto"><p className="text-xs font-bold uppercase tracking-wider opacity-60">{paper.test} · Practice Form {paper.form}</p><p className="font-semibold">{section.title}</p></div><Badge variant="outline">Section {sectionIndex + 1}/{paper.sections.length}</Badge>{section.kind === "mcq" && <Badge variant="outline">Q {questionIndex + 1}/{questions.length}</Badge>}<div className="flex items-center gap-2 rounded-md border px-3 py-2 font-mono font-bold"><Clock3 className="size-4" />{format(timeLeft)}</div></div></header>
    <div className={`mx-auto grid max-w-7xl gap-4 px-4 py-5 ${compact ? "xl:grid-cols-[1fr_220px]" : "xl:grid-cols-[1fr_310px]"}`}>
      <section className={`rounded-md border p-5 ${highContrast ? "border-white bg-black" : "bg-white"}`}>
        {section.kind === "mcq" && question ? <><div className="mb-4 flex items-center justify-between gap-3"><Badge variant="outline">Question {questionIndex + 1}</Badge><Button size="sm" variant={flagged ? "default" : "outline"} onClick={() => setFlags(current => flagged ? current.filter(id => id !== question.id) : [...current, question.id])}><Flag className={flagged ? "fill-current" : ""} />{flagged ? "Flagged" : "Flag"}</Button></div><h1 className={`whitespace-pre-line font-semibold leading-relaxed ${largeText ? "text-2xl" : "text-xl"}`}>{question.prompt}</h1><div className="mt-6 space-y-3">{question.options.map((option, index) => <button key={`${question.id}-${index}`} onClick={() => setAnswers(current => ({ ...current, [question.id]: index }))} className={`flex w-full items-start gap-3 rounded-md border p-4 text-left ${selected === index ? highContrast ? "bg-white text-black" : "border-blue-600 bg-blue-50" : highContrast ? "border-white bg-black" : "bg-white"}`}><span className="grid size-8 shrink-0 place-items-center rounded-full border font-bold">{String.fromCharCode(65 + index)}</span><span className="pt-1">{option}</span></button>)}</div><div className="mt-6 flex flex-wrap justify-between gap-3 border-t pt-4"><Button variant="outline" disabled={questionIndex === 0} onClick={() => setQuestionIndex(index => Math.max(0,index-1))}><ArrowLeft />Previous</Button>{questionIndex < questions.length - 1 ? <Button onClick={() => setQuestionIndex(index => Math.min(questions.length-1,index+1))}>Next <ArrowRight /></Button> : <Button onClick={() => submitSection(false)}>{sectionIndex === paper.sections.length - 1 ? "Submit full test" : "Submit section"} <ArrowRight /></Button>}</div></> : <><p className="text-xs font-bold uppercase tracking-wider opacity-60">Writing task</p><h1 className="mt-2 font-serif text-2xl font-bold">{section.title}</h1><p className="mt-2 text-sm opacity-70">{section.instructions}</p><div className="mt-5 space-y-3">{section.essayChoices?.map(prompt => <button key={prompt} onClick={() => setEssayPrompts(current => ({ ...current, [section.id]: prompt }))} className={`w-full rounded-xl border p-4 text-left ${essayPrompts[section.id] === prompt ? highContrast ? "bg-white text-black" : "border-blue-600 bg-blue-50" : ""}`}><strong>{prompt}</strong></button>)}</div><Textarea value={essayText} onChange={event => setEssayResponses(current => ({ ...current, [section.id]: event.target.value }))} placeholder="Write your response here..." className="mt-5 min-h-[420px] bg-white text-base leading-7 text-slate-950" /><div className="mt-3 flex items-center justify-between text-sm opacity-70"><span>{countWords(essayText)} words</span>{section.wordLimit && <span>Limit {section.wordLimit}</span>}</div><div className="mt-6 flex justify-end border-t pt-4"><Button onClick={() => submitSection(false)}>{sectionIndex === paper.sections.length - 1 ? "Submit full test" : "Submit section"} <ArrowRight /></Button></div></>}
      </section>
      <aside className="space-y-4">{section.kind === "mcq" && <Card className={highContrast ? "border-white bg-black text-white" : ""}><CardHeader><CardTitle className="text-base">Question navigator</CardTitle><CardDescription>{answeredInSection}/{questions.length} answered</CardDescription></CardHeader><CardContent className="grid grid-cols-5 gap-2">{questions.map((item,index) => <button key={item.id} onClick={() => setQuestionIndex(index)} className={`aspect-square rounded-md border text-sm font-bold ${index === questionIndex ? "ring-2 ring-blue-500" : ""} ${answers[item.id] !== undefined ? "bg-blue-100 text-blue-950" : ""} ${flags.includes(item.id) ? "border-amber-500" : ""}`}>{index+1}</button>)}</CardContent></Card>}<Card className={highContrast ? "border-white bg-black text-white" : ""}><CardHeader><Accessibility className="size-5" /><CardTitle className="text-base">Accessibility</CardTitle></CardHeader><CardContent className="space-y-2"><Button variant="outline" className="w-full justify-start" onClick={() => setLargeText(value => !value)}>{largeText ? <Minimize2 /> : <Maximize2 />}{largeText ? "Standard text" : "Larger text"}</Button><Button variant="outline" className="w-full justify-start" onClick={() => setHighContrast(value => !value)}>High contrast</Button><Button variant="outline" className="w-full justify-start" onClick={() => setCompact(value => !value)}>{compact ? "Wider navigator" : "Compact navigator"}</Button></CardContent></Card><Card className={highContrast ? "border-white bg-black text-white" : ""}><CardContent className="p-4 text-xs leading-5 opacity-70">{section.kind === "mcq" ? "Keyboard: A–E answer · F flag · ←/→ navigate." : "Writing is autosaved in the current session until the paper is submitted."}</CardContent></Card><Button variant="outline" className="w-full" onClick={() => { if (window.confirm("Exit this test? Unsaved in-progress answers will be lost.")) setStage("setup") }}>Exit simulator</Button></aside>
    </div>
  </main>
}

"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { Accessibility, ArrowLeft, ArrowRight, Clock3, Flag, Keyboard, Maximize2, Minimize2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { buildFullPaper, paperCatalog, type FullPaperTest, type PaperForm } from "@/lib/full-paper-system"

export default function TestPlayerPage() {
  const [test, setTest] = useState<FullPaperTest>("TMUA")
  const [form, setForm] = useState<PaperForm>(1)
  const [started, setStarted] = useState(false)
  const [sectionIndex, setSectionIndex] = useState(0)
  const [questionIndex, setQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [flags, setFlags] = useState<string[]>([])
  const [timeLeft, setTimeLeft] = useState(0)
  const [largeText, setLargeText] = useState(false)
  const [highContrast, setHighContrast] = useState(false)
  const [compact, setCompact] = useState(false)

  const paper = useMemo(() => buildFullPaper(test, form), [test, form])
  const section = paper.sections[sectionIndex]
  const mcqSections = paper.sections.filter(item => item.kind === "mcq")
  const playableSection = section?.kind === "mcq" ? section : mcqSections[0]
  const questions = playableSection?.kind === "mcq" ? playableSection.questions : []
  const question = questions[questionIndex]

  useEffect(() => {
    if (!started || timeLeft <= 0) return
    const timer = window.setInterval(() => setTimeLeft(value => Math.max(0, value - 1)), 1000)
    return () => window.clearInterval(timer)
  }, [started, timeLeft])

  useEffect(() => {
    if (!started || !question) return
    const handler = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLInputElement) return
      const key = event.key.toLowerCase()
      if (["a","b","c","d","e"].includes(key)) {
        const index = key.charCodeAt(0) - 97
        if (question.options[index]) setAnswers(current => ({ ...current, [question.id]: index }))
      }
      if (key === "f") setFlags(current => current.includes(question.id) ? current.filter(id => id !== question.id) : [...current, question.id])
      if (event.key === "ArrowRight") setQuestionIndex(index => Math.min(questions.length - 1, index + 1))
      if (event.key === "ArrowLeft") setQuestionIndex(index => Math.max(0, index - 1))
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [started, question, questions.length])

  function start() {
    const first = paper.sections.find(item => item.kind === "mcq")
    if (!first || first.kind !== "mcq") return
    setSectionIndex(paper.sections.indexOf(first))
    setQuestionIndex(0)
    setAnswers({})
    setFlags([])
    setTimeLeft(first.durationMinutes * 60)
    setStarted(true)
  }

  function format(seconds: number) { return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}` }

  if (!started) return <main className="min-h-screen bg-slate-100 text-slate-950"><div className="mx-auto max-w-5xl px-4 py-8"><div className="mb-6 flex items-center justify-between"><Button asChild variant="ghost"><Link href="/tutor"><ArrowLeft />Personal Tutor</Link></Button><Badge variant="outline"><Keyboard className="size-3.5" />Test Player</Badge></div><Card><CardHeader><CardTitle className="font-serif text-3xl">Pearson-style practice environment</CardTitle></CardHeader><CardContent className="space-y-5"><p className="max-w-3xl text-slate-600">Practise navigation and timed decision-making in a stripped-back test interface. Use A–E to answer, F to flag, and the arrow keys to move. Accessibility controls remain available during the session.</p><div className="grid gap-4 sm:grid-cols-2"><label><span className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">Test</span><NativeSelect value={test} onChange={event => setTest(event.target.value as FullPaperTest)}>{paperCatalog.map(item => <NativeSelectOption key={item.test}>{item.test}</NativeSelectOption>)}</NativeSelect></label><label><span className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">Form</span><NativeSelect value={String(form)} onChange={event => setForm(Number(event.target.value) as PaperForm)}><NativeSelectOption value="1">Form 1</NativeSelectOption><NativeSelectOption value="2">Form 2</NativeSelectOption></NativeSelect></label></div><div className="rounded-xl border bg-slate-50 p-4 text-sm"><strong>{paper.title}</strong><p className="mt-1 text-slate-600">The simulator uses the same original question bank as Full Papers. It is designed to rehearse interface behaviour, not to reproduce proprietary Pearson software pixel-for-pixel.</p></div><Button size="lg" onClick={start}>Open test player</Button></CardContent></Card></div></main>

  if (!question || !playableSection || playableSection.kind !== "mcq") return null
  const selected = answers[question.id]
  const flagged = flags.includes(question.id)
  const theme = highContrast ? "bg-black text-white" : "bg-slate-100 text-slate-950"

  return <main className={`min-h-screen ${theme} ${largeText ? "text-lg" : ""}`}>
    <header className={`sticky top-0 z-50 border-b ${highContrast ? "border-white bg-black" : "bg-white"}`}><div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3"><div className="mr-auto"><p className="text-xs font-bold uppercase tracking-wider opacity-60">{paper.test} · Practice Form {paper.form}</p><p className="font-semibold">{playableSection.title}</p></div><Badge variant="outline">Q {questionIndex + 1}/{questions.length}</Badge><div className="flex items-center gap-2 rounded-md border px-3 py-2 font-mono font-bold"><Clock3 className="size-4" />{format(timeLeft)}</div></div></header>
    <div className={`mx-auto grid max-w-7xl gap-4 px-4 py-5 ${compact ? "xl:grid-cols-[1fr_220px]" : "xl:grid-cols-[1fr_310px]"}`}>
      <section className={`rounded-md border p-5 ${highContrast ? "border-white bg-black" : "bg-white"}`}><div className="mb-4 flex items-center justify-between gap-3"><Badge variant="outline">Question {questionIndex + 1}</Badge><Button size="sm" variant={flagged ? "default" : "outline"} onClick={() => setFlags(current => flagged ? current.filter(id => id !== question.id) : [...current, question.id])}><Flag className={flagged ? "fill-current" : ""} />{flagged ? "Flagged" : "Flag"}</Button></div><h1 className={`whitespace-pre-line font-semibold leading-relaxed ${largeText ? "text-2xl" : "text-xl"}`}>{question.prompt}</h1><div className="mt-6 space-y-3">{question.options.map((option, index) => <button key={option} onClick={() => setAnswers(current => ({ ...current, [question.id]: index }))} className={`flex w-full items-start gap-3 rounded-md border p-4 text-left ${selected === index ? highContrast ? "bg-white text-black" : "border-blue-600 bg-blue-50" : highContrast ? "border-white bg-black" : "bg-white"}`}><span className="grid size-8 shrink-0 place-items-center rounded-full border font-bold">{String.fromCharCode(65 + index)}</span><span className="pt-1">{option}</span></button>)}</div><div className="mt-6 flex justify-between border-t pt-4"><Button variant="outline" disabled={questionIndex === 0} onClick={() => setQuestionIndex(index => Math.max(0,index-1))}><ArrowLeft />Previous</Button><Button disabled={questionIndex === questions.length - 1} onClick={() => setQuestionIndex(index => Math.min(questions.length-1,index+1))}>Next <ArrowRight /></Button></div></section>
      <aside className="space-y-4"><Card className={highContrast ? "border-white bg-black text-white" : ""}><CardHeader><CardTitle className="text-base">Question navigator</CardTitle></CardHeader><CardContent className="grid grid-cols-5 gap-2">{questions.map((item,index) => <button key={item.id} onClick={() => setQuestionIndex(index)} className={`aspect-square rounded-md border text-sm font-bold ${index === questionIndex ? "ring-2 ring-blue-500" : ""} ${answers[item.id] !== undefined ? "bg-blue-100 text-blue-950" : ""} ${flags.includes(item.id) ? "border-amber-500" : ""}`}>{index+1}</button>)}</CardContent></Card><Card className={highContrast ? "border-white bg-black text-white" : ""}><CardHeader><Accessibility className="size-5" /><CardTitle className="text-base">Accessibility</CardTitle></CardHeader><CardContent className="space-y-2"><Button variant="outline" className="w-full justify-start" onClick={() => setLargeText(value => !value)}>{largeText ? <Minimize2 /> : <Maximize2 />}{largeText ? "Standard text" : "Larger text"}</Button><Button variant="outline" className="w-full justify-start" onClick={() => setHighContrast(value => !value)}>High contrast</Button><Button variant="outline" className="w-full justify-start" onClick={() => setCompact(value => !value)}>{compact ? "Wider navigator" : "Compact navigator"}</Button></CardContent></Card><Card className={highContrast ? "border-white bg-black text-white" : ""}><CardContent className="p-4 text-xs leading-5 opacity-70">Keyboard: A–E answer · F flag · ←/→ navigate.</CardContent></Card><Button variant="outline" className="w-full" onClick={() => setStarted(false)}>Exit simulator</Button></aside>
    </div>
  </main>
}

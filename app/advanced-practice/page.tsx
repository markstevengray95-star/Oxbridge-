"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ArrowLeft, ArrowRight, Brain, CheckCircle2, Flag, Loader2, RefreshCw, Sparkles, Target, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { Progress } from "@/components/ui/progress"
import { advancedQuestionBank, advancedQuestionBankStats } from "@/lib/question-bank-advanced"
import { questionBank2027, questionBank2027Stats } from "@/lib/question-bank-2027"
import type { TestName } from "@/lib/question-bank"
import { legacyHardenedQuestionBank, legacyHardenedQuestionBankStats } from "@/lib/question-bank-legacy-hardened"
import { reliableFullPaperQuestionBank, reliableFullPaperQuestionBankStats } from "@/lib/full-paper-reliable-bank"
import { questionsForSelectedPathway, pathwayQuestionNote } from "@/lib/question-pathway"
import { choiceDiagnostic, prepareQuestionSet, questionQualitySignals } from "@/lib/question-quality"
import { auditQuestionReliability, repairQuestionReliability, reliabilityScore } from "@/lib/question-reliability"
import type { TestQuestion } from "@/lib/oxbridge-data"

const tests: TestName[] = ["TMUA", "ESAT", "TARA", "LNAT", "UCAT"]
const difficultyOrder: TestQuestion["difficulty"][] = ["Foundation", "Stretch", "Challenge"]
type PersonalFeedback = { headline:string; personalisedFeedback:string; whyThisChoice:string; patternConnection:string; nextStep:string; miniChallenge:string }

function hashString(value:string) {
  let hash = 2166136261
  for (let i=0;i<value.length;i++) {
    hash ^= value.charCodeAt(i)
    hash = Math.imul(hash,16777619)
  }
  return hash >>> 0
}

function questionSignature(prompt:string) {
  return prompt.toLowerCase().replace(/\d+(?:\.\d+)?/g,"#").replace(/[^a-z#]+/g," ").replace(/\s+/g," ").trim()
}

function deterministicPick(pool: TestQuestion[], count: number, seed: number, usedSignatures = new Set<string>()) {
  if (!pool.length) return []
  const ranked = [...pool]
    .map(question => ({
      question,
      score: questionQualitySignals(question).discriminationScore + reliabilityScore(question)/35 + (hashString(`${question.id}:${seed}`)%1000)/5000,
    }))
    .sort((a,b)=>b.score-a.score)

  const picked: TestQuestion[] = []
  for (const { question } of ranked) {
    const signature = questionSignature(question.prompt)
    if (usedSignatures.has(signature)) continue
    usedSignatures.add(signature)
    picked.push(question)
    if (picked.length === count) break
  }
  return picked
}

function saveAttempt(question: TestQuestion, selected: number, correct: boolean) {
  try {
    const key = "oxbridge-tutor-progress-v2"
    const progress = JSON.parse(localStorage.getItem(key) || "{}") as Record<string, unknown>
    const attempts = Array.isArray(progress.practiceAttempts) ? progress.practiceAttempts : []
    progress.practiceAttempts = [{ id:`${question.id}-${Date.now()}`, date:new Date().toISOString(), test:question.test, section:question.section, difficulty:question.difficulty, questionId:question.id, selected, correct }, ...attempts].slice(0, 300)
    localStorage.setItem(key, JSON.stringify(progress))
  } catch {}
}

export default function AdvancedPracticePage() {
  const [test, setTest] = useState<TestName>("TMUA")
  const [course, setCourse] = useState("Physics")
  useEffect(() => {
    try {
      const profile = JSON.parse(localStorage.getItem("oxbridge-tutor-profile-v2") || "{}") as { course?:string }
      if (profile.course) setCourse(profile.course)
    } catch {}
  }, [])

  const allForTest = useMemo(() => {
    const combined=[...reliableFullPaperQuestionBank, ...legacyHardenedQuestionBank, ...advancedQuestionBank, ...questionBank2027]
      .map(repairQuestionReliability)
      .filter(question => auditQuestionReliability(question).blocking.length === 0)
    return questionsForSelectedPathway(combined,test,course)
  }, [test,course])
  const sections = useMemo(() => Array.from(new Set(allForTest.map(q => q.section))), [allForTest])
  const [section, setSection] = useState("")
  const activeSection = sections.includes(section) ? section : sections[0] ?? ""
  const [seed, setSeed] = useState(1)
  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [checked, setChecked] = useState(false)
  const [correct, setCorrect] = useState(0)
  const [attempted, setAttempted] = useState(0)
  const [saved, setSaved] = useState<string[]>([])
  const [personalFeedback, setPersonalFeedback] = useState<PersonalFeedback | null>(null)
  const [feedbackLoading, setFeedbackLoading] = useState(false)

  const ladder = useMemo(() => {
    const sectionPool = allForTest.filter(q => q.section === activeSection)
    const usedSignatures = new Set<string>()
    const stages = difficultyOrder.flatMap((difficulty, stage) => deterministicPick(sectionPool.filter(q => q.difficulty === difficulty), 2, seed + stage * 13, usedSignatures))
    const chosen = stages.length >= 6 ? stages.slice(0,6) : [...stages, ...deterministicPick(sectionPool, 6 - stages.length, seed + 97, usedSignatures)]
    return prepareQuestionSet(chosen, seed * 104729 + hashString(activeSection))
  }, [allForTest, activeSection, seed])

  const question = ladder[index % Math.max(ladder.length, 1)]
  const progress = ladder.length ? ((index + 1) / ladder.length) * 100 : 0
  const accuracy = attempted ? Math.round(correct / attempted * 100) : 0
  const localDiagnostic = question && selected!==null && checked ? choiceDiagnostic(question,selected) : null
  const pathwayNote = pathwayQuestionNote(test,course)
  const newLadder = () => { setSeed(s => s + 1); setIndex(0); setSelected(null); setChecked(false); setCorrect(0); setAttempted(0); setPersonalFeedback(null) }
  const next = () => { if (index < ladder.length - 1) setIndex(i => i + 1); else newLadder(); setSelected(null); setChecked(false); setPersonalFeedback(null) }

  async function check() {
    if (selected === null || checked || !question) return
    const isCorrect = selected === question.answer
    setChecked(true); setAttempted(a => a + 1); if (isCorrect) setCorrect(c => c + 1)
    saveAttempt(question, selected, isCorrect)
    setFeedbackLoading(true); setPersonalFeedback(null)
    try {
      const response = await fetch("/api/answer-feedback", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ test:question.test, section:question.section, difficulty:question.difficulty, prompt:question.prompt, options:question.options, selectedAnswer:question.options[selected], correctAnswer:question.options[question.answer], explanation:question.explanation, correct:isCorrect }) })
      const data = await response.json() as { feedback?: PersonalFeedback }
      if (data.feedback) setPersonalFeedback(data.feedback)
    } catch {
      // The deterministic option-linked diagnostic remains available if AI feedback is unavailable.
    } finally { setFeedbackLoading(false) }
  }

  return <main className="min-h-screen bg-slate-50 text-slate-950">
    <header className="border-b bg-slate-950 text-white"><div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4"><Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold"><ArrowLeft className="size-4" />Back to ScholarBridge</Link><Badge className="border-white/15 bg-white/10 text-white">Advanced Practice Lab</Badge></div></header>
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <section className="grid gap-5 lg:grid-cols-[1.2fr_.8fr]"><div><p className="mb-2 text-xs font-bold uppercase tracking-[.18em] text-blue-700">2027 Challenge Ladder</p><h1 className="font-serif text-4xl font-bold tracking-tight">Choose the reasoning, not just the answer.</h1><p className="mt-3 max-w-3xl text-base leading-relaxed text-slate-600">Calculation-heavy items now pair results with reasoning routes. Every ladder rejects duplicate templates, repairs equivalent numerical options, removes structurally unreliable questions and gives higher-reliability items priority. {pathwayNote ?? "Practice remains linked to the selected test and section."}</p></div><Card className="shadow-none"><CardHeader><CardTitle className="font-serif text-xl">Quality-screened bank</CardTitle><CardDescription>Original practice aligned to current test structures.</CardDescription></CardHeader><CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-4"><div><p className="text-3xl font-bold">{reliableFullPaperQuestionBankStats.total.toLocaleString()}</p><p className="text-xs text-muted-foreground">reliable questions</p></div><div><p className="text-3xl font-bold">{questionBank2027Stats.total.toLocaleString()}</p><p className="text-xs text-muted-foreground">2027 questions</p></div><div><p className="text-3xl font-bold">{advancedQuestionBankStats.total.toLocaleString()}</p><p className="text-xs text-muted-foreground">advanced questions</p></div><div><p className="text-3xl font-bold">{legacyHardenedQuestionBankStats.total.toLocaleString()}</p><p className="text-xs text-muted-foreground">hardened core</p></div></CardContent></Card></section>

      <Card className="shadow-none"><CardContent className="grid gap-3 p-4 md:grid-cols-[180px_1fr_auto]"><label><span className="mb-1 block text-xs font-bold uppercase tracking-wider text-muted-foreground">Test</span><NativeSelect value={test} onChange={e => { setTest(e.target.value as TestName); setSection(""); setIndex(0); setSelected(null); setChecked(false); setPersonalFeedback(null) }}>{tests.map(t => <NativeSelectOption key={t}>{t}</NativeSelectOption>)}</NativeSelect></label><label><span className="mb-1 block text-xs font-bold uppercase tracking-wider text-muted-foreground">Section</span><NativeSelect value={activeSection} onChange={e => { setSection(e.target.value); setIndex(0); setSelected(null); setChecked(false); setPersonalFeedback(null) }}>{sections.map(s => <NativeSelectOption key={s}>{s}</NativeSelectOption>)}</NativeSelect></label><Button variant="outline" className="self-end" onClick={newLadder}><RefreshCw />New ladder</Button></CardContent></Card>

      {question ? <section className="grid gap-5 xl:grid-cols-[1.35fr_.65fr]"><Card className="shadow-none"><CardHeader className="border-b"><div className="flex flex-wrap items-center gap-2"><Badge>{test}</Badge><Badge variant="outline">{question.section}</Badge><Badge variant="outline">{question.difficulty}</Badge><Badge variant="outline">Reliability {reliabilityScore(question)}/100</Badge><Badge variant="outline">Step {index + 1}/{ladder.length}</Badge><Button size="sm" variant="ghost" className="ml-auto" onClick={() => setSaved(s => s.includes(question.id) ? s.filter(id => id !== question.id) : [...s, question.id])}><Flag className={saved.includes(question.id) ? "fill-current text-blue-700" : ""} />{saved.includes(question.id) ? "Saved" : "Save"}</Button></div><Progress value={progress} /><CardTitle className="whitespace-pre-line font-serif text-2xl leading-snug">{question.prompt}</CardTitle></CardHeader><CardContent className="space-y-3 pt-0">{question.options.map((option, i) => { const state = checked ? i === question.answer ? "border-emerald-400 bg-emerald-50" : i === selected ? "border-amber-400 bg-amber-50" : "" : i === selected ? "border-blue-500 bg-blue-50" : ""; return <button key={`${option}-${i}`} className={`flex w-full items-start gap-3 rounded-xl border p-4 text-left ${state}`} onClick={() => !checked && setSelected(i)}><span className="flex size-8 shrink-0 items-center justify-center rounded-full border text-sm font-bold">{String.fromCharCode(65 + i)}</span><strong className="flex-1 whitespace-pre-line">{option}</strong>{checked && i === question.answer ? <CheckCircle2 className="mt-1 shrink-0 text-emerald-600" /> : checked && i === selected ? <X className="mt-1 shrink-0 text-amber-600" /> : null}</button> })}<div className="flex justify-end pt-2">{checked ? <Button onClick={next}>Next step <ArrowRight /></Button> : <Button onClick={() => void check()} disabled={selected === null}>Check answer</Button>}</div></CardContent></Card><aside className="space-y-4"><Card className="shadow-none"><CardHeader><CardTitle className="font-serif text-xl">Ladder performance</CardTitle></CardHeader><CardContent className="space-y-3"><div className="flex items-center justify-between"><span>Accuracy</span><strong>{attempted ? `${accuracy}%` : "—"}</strong></div><div className="flex items-center justify-between"><span>Correct</span><strong>{correct}/{attempted}</strong></div><div className="flex items-center justify-between"><span>Saved</span><strong>{saved.length}</strong></div><p className="text-xs leading-relaxed text-muted-foreground">This is practice evidence, not an admissions prediction.</p></CardContent></Card>{localDiagnostic && <Card className={selected === question.answer ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}><CardHeader><div className="flex items-center gap-2">{selected === question.answer ? <CheckCircle2 className="text-emerald-700" /> : <Brain className="text-amber-700" />}<CardTitle className="font-serif text-xl">{localDiagnostic.label}</CardTitle></div><CardDescription>Linked directly to the option you selected.</CardDescription></CardHeader><CardContent><p className="text-sm leading-relaxed">{localDiagnostic.feedback}</p></CardContent></Card>}{feedbackLoading && <Card className="shadow-none"><CardContent className="flex items-center gap-2 p-5 text-sm text-slate-600"><Loader2 className="animate-spin" />Building personalised feedback from your history…</CardContent></Card>}{personalFeedback && <Card className="border-blue-200 bg-blue-50 shadow-none"><CardHeader><Sparkles className="size-5 text-blue-700" /><CardTitle className="font-serif text-xl">{personalFeedback.headline}</CardTitle><CardDescription>Personalised using this answer and your saved preparation evidence where available.</CardDescription></CardHeader><CardContent className="space-y-4 text-sm leading-6"><div><strong>Your reasoning:</strong><p>{personalFeedback.personalisedFeedback}</p></div><div><strong>Why this choice:</strong><p>{personalFeedback.whyThisChoice}</p></div><div><strong>Pattern connection:</strong><p>{personalFeedback.patternConnection}</p></div><div className="rounded-xl bg-white p-3"><strong>Next action:</strong><p>{personalFeedback.nextStep}</p></div><div className="rounded-xl border border-blue-200 bg-white p-3"><strong>Mini challenge:</strong><p>{personalFeedback.miniChallenge}</p></div></CardContent></Card>}</aside></section> : <Card><CardContent className="p-8 text-center"><Target className="mx-auto mb-3 size-8" /><p>No questions are available for this section yet.</p></CardContent></Card>}
    </div>
  </main>
}

"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { ArrowLeft, ArrowRight, Brain, CheckCircle2, Flag, RefreshCw, Target, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { Progress } from "@/components/ui/progress"
import { advancedQuestionBank, advancedQuestionBankStats } from "@/lib/question-bank-advanced"
import { questionBank2027, questionBank2027Stats } from "@/lib/question-bank-2027"
import { questionBank, type TestName } from "@/lib/question-bank"
import type { TestQuestion } from "@/lib/oxbridge-data"

const tests: TestName[] = ["TMUA", "ESAT", "TARA", "LNAT", "UCAT"]
const difficultyOrder: TestQuestion["difficulty"][] = ["Foundation", "Stretch", "Challenge"]

function deterministicPick(pool: TestQuestion[], count: number, seed: number) {
  if (!pool.length) return []
  const result: TestQuestion[] = [], used = new Set<string>()
  for (let i = 0; i < pool.length * 4 && result.length < count; i++) {
    const q = pool[(seed * 31 + i * 47) % pool.length]
    if (!used.has(q.id)) { used.add(q.id); result.push(q) }
  }
  return result
}

export default function AdvancedPracticePage() {
  const [test, setTest] = useState<TestName>("TMUA")
  const allForTest = useMemo(() => [...questionBank, ...advancedQuestionBank, ...questionBank2027].filter(q => q.test === test), [test])
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

  const ladder = useMemo(() => {
    const sectionPool = allForTest.filter(q => q.section === activeSection)
    const stages = difficultyOrder.flatMap((difficulty, stage) => deterministicPick(sectionPool.filter(q => q.difficulty === difficulty), 2, seed + stage * 13))
    return stages.length ? stages : deterministicPick(sectionPool, 6, seed)
  }, [allForTest, activeSection, seed])

  const question = ladder[index % Math.max(ladder.length, 1)]
  const progress = ladder.length ? ((index + 1) / ladder.length) * 100 : 0
  const accuracy = attempted ? Math.round(correct / attempted * 100) : 0
  const newLadder = () => { setSeed(s => s + 1); setIndex(0); setSelected(null); setChecked(false); setCorrect(0); setAttempted(0) }
  const next = () => { if (index < ladder.length - 1) setIndex(i => i + 1); else newLadder(); setSelected(null); setChecked(false) }
  const check = () => { if (selected === null || checked || !question) return; setChecked(true); setAttempted(a => a + 1); if (selected === question.answer) setCorrect(c => c + 1) }

  return <main className="min-h-screen bg-slate-50 text-slate-950">
    <header className="border-b bg-slate-950 text-white"><div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4"><Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold"><ArrowLeft className="size-4" />Back to Oxbridge Tutor</Link><Badge className="border-white/15 bg-white/10 text-white">Advanced Practice Lab</Badge></div></header>
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <section className="grid gap-5 lg:grid-cols-[1.2fr_.8fr]"><div><p className="mb-2 text-xs font-bold uppercase tracking-[.18em] text-blue-700">2027 Challenge Ladder</p><h1 className="font-serif text-4xl font-bold tracking-tight">Practise harder questions in a deliberate progression.</h1><p className="mt-3 max-w-3xl text-base leading-relaxed text-slate-600">Each ladder selects original questions from one section and moves Foundation → Stretch → Challenge. The bank now includes two additional current-format practice forms plus the earlier advanced material, with more multi-step maths, experimental reasoning, argument analysis, passage work and current UCAT sections.</p></div><Card className="shadow-none"><CardHeader><CardTitle className="font-serif text-xl">Bank expansion</CardTitle><CardDescription>Original practice aligned to the current test structures.</CardDescription></CardHeader><CardContent className="grid grid-cols-3 gap-3"><div><p className="text-3xl font-bold">{questionBank2027Stats.total.toLocaleString()}</p><p className="text-xs text-muted-foreground">new 2027 questions</p></div><div><p className="text-3xl font-bold">{advancedQuestionBankStats.total.toLocaleString()}</p><p className="text-xs text-muted-foreground">advanced questions</p></div><div><p className="text-3xl font-bold">{allForTest.length.toLocaleString()}</p><p className="text-xs text-muted-foreground">available for {test}</p></div></CardContent></Card></section>

      <Card className="shadow-none"><CardContent className="grid gap-3 p-4 md:grid-cols-[180px_1fr_auto]"><label><span className="mb-1 block text-xs font-bold uppercase tracking-wider text-muted-foreground">Test</span><NativeSelect value={test} onChange={e => { setTest(e.target.value as TestName); setSection(""); setIndex(0); setSelected(null); setChecked(false) }}>{tests.map(t => <NativeSelectOption key={t}>{t}</NativeSelectOption>)}</NativeSelect></label><label><span className="mb-1 block text-xs font-bold uppercase tracking-wider text-muted-foreground">Section</span><NativeSelect value={activeSection} onChange={e => { setSection(e.target.value); setIndex(0); setSelected(null); setChecked(false) }}>{sections.map(s => <NativeSelectOption key={s}>{s}</NativeSelectOption>)}</NativeSelect></label><Button variant="outline" className="self-end" onClick={newLadder}><RefreshCw />New ladder</Button></CardContent></Card>

      {question ? <section className="grid gap-5 xl:grid-cols-[1.35fr_.65fr]"><Card className="shadow-none"><CardHeader className="border-b"><div className="flex flex-wrap items-center gap-2"><Badge>{test}</Badge><Badge variant="outline">{question.section}</Badge><Badge variant="outline">{question.difficulty}</Badge><Badge variant="outline">Step {index + 1}/{ladder.length}</Badge><Button size="sm" variant="ghost" className="ml-auto" onClick={() => setSaved(s => s.includes(question.id) ? s.filter(id => id !== question.id) : [...s, question.id])}><Flag className={saved.includes(question.id) ? "fill-current text-blue-700" : ""} />{saved.includes(question.id) ? "Saved" : "Save"}</Button></div><Progress value={progress} /><CardTitle className="whitespace-pre-line font-serif text-2xl leading-snug">{question.prompt}</CardTitle></CardHeader><CardContent className="space-y-3 pt-0">{question.options.map((option, i) => { const state = checked ? i === question.answer ? "border-emerald-400 bg-emerald-50" : i === selected ? "border-amber-400 bg-amber-50" : "" : i === selected ? "border-blue-500 bg-blue-50" : ""; return <button key={`${option}-${i}`} className={`flex w-full items-center gap-3 rounded-xl border p-4 text-left ${state}`} onClick={() => !checked && setSelected(i)}><span className="flex size-8 shrink-0 items-center justify-center rounded-full border text-sm font-bold">{String.fromCharCode(65 + i)}</span><strong className="flex-1">{option}</strong>{checked && i === question.answer ? <CheckCircle2 className="text-emerald-600" /> : checked && i === selected ? <X className="text-amber-600" /> : null}</button> })}<div className="flex justify-end pt-2">{checked ? <Button onClick={next}>Next step <ArrowRight /></Button> : <Button onClick={check} disabled={selected === null}>Check answer</Button>}</div></CardContent></Card><aside className="space-y-4"><Card className="shadow-none"><CardHeader><CardTitle className="font-serif text-xl">Ladder performance</CardTitle></CardHeader><CardContent className="space-y-3"><div className="flex items-center justify-between"><span>Accuracy</span><strong>{attempted ? `${accuracy}%` : "—"}</strong></div><div className="flex items-center justify-between"><span>Correct</span><strong>{correct}/{attempted}</strong></div><div className="flex items-center justify-between"><span>Saved</span><strong>{saved.length}</strong></div><p className="text-xs leading-relaxed text-muted-foreground">A low score here is not an admissions prediction. The ladder deliberately moves into harder material quickly.</p></CardContent></Card>{checked && <Card className={selected === question.answer ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}><CardHeader><div className="flex items-center gap-2">{selected === question.answer ? <CheckCircle2 className="text-emerald-700" /> : <Brain className="text-amber-700" />}<CardTitle className="font-serif text-xl">{selected === question.answer ? "Correct" : "Review the reasoning"}</CardTitle></div></CardHeader><CardContent><p className="text-sm leading-relaxed">{question.explanation}</p></CardContent></Card>}</aside></section> : <Card><CardContent className="p-8 text-center"><Target className="mx-auto mb-3 size-8" /><p>No questions are available for this section yet.</p></CardContent></Card>}
    </div>
  </main>
}

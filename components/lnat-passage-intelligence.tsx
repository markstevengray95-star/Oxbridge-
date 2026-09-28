"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { ArrowLeft, ArrowRight, BookOpenCheck, CheckCircle2, RefreshCw } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { Progress } from "@/components/ui/progress"
import { buildFullPaper, type PaperForm } from "@/lib/full-paper-system"
import { isYesNoStatementQuestion } from "@/lib/full-paper-question"
import { EXAM_INTELLIGENCE_KEY, type ExamAttemptObservation } from "@/lib/exam-intelligence"
import { groupLnatQuestions, lnatPassageDiagnostic, lnatReasoningSkill } from "@/lib/lnat-passage-intelligence"

type Phase = "setup" | "practice" | "results"

export function LnatPassageIntelligence() {
  const [form, setForm] = useState<PaperForm>(1)
  const [phase, setPhase] = useState<Phase>("setup")
  const [groupIndex, setGroupIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string,number>>({})
  const [confidence, setConfidence] = useState<Record<string,number>>({})
  const [results, setResults] = useState<Array<{prompt:string;correct:boolean;confidence:number}>>([])

  const paper = useMemo(() => buildFullPaper("LNAT", form), [form])
  const questions = useMemo(() => paper.sections.flatMap(section => section.kind === "mcq" ? section.questions.filter(question => !isYesNoStatementQuestion(question)) : []), [paper])
  const groups = useMemo(() => groupLnatQuestions(questions), [questions])
  const group = groups[groupIndex]
  const diagnostic = useMemo(() => lnatPassageDiagnostic(results), [results])

  function start() {
    setGroupIndex(0)
    setAnswers({})
    setConfidence({})
    setResults([])
    setPhase("practice")
  }

  function submitPassage() {
    if (!group) return
    const passageResults = group.questions.map(question => ({ prompt: question.prompt, correct: answers[question.id] === question.answer, confidence: confidence[question.id] ?? 60 }))
    const attempts: ExamAttemptObservation[] = group.questions.map(question => ({
      id: `lnat-${Date.now()}-${question.id}`,
      questionId: question.id,
      test: "LNAT",
      section: question.section,
      prompt: question.prompt,
      difficulty: question.difficulty,
      selectedAnswer: answers[question.id] === undefined ? "Unanswered" : question.options[answers[question.id]] ?? "Unanswered",
      correctAnswer: question.options[question.answer] ?? "",
      correct: answers[question.id] === question.answer,
      rawMark: answers[question.id] === question.answer ? 1 : 0,
      maxMarks: 1,
      confidence: confidence[question.id] ?? 60,
      reasoningNote: `LNAT passage skill: ${lnatReasoningSkill(question.prompt)}`,
      answerChanges: 0,
      flagged: false,
      timeSpentSeconds: 0,
      createdAt: new Date().toISOString(),
    }))
    try {
      const stored = JSON.parse(localStorage.getItem(EXAM_INTELLIGENCE_KEY) || "[]")
      localStorage.setItem(EXAM_INTELLIGENCE_KEY, JSON.stringify([...attempts, ...(Array.isArray(stored) ? stored : [])].slice(0,1000)))
    } catch {}
    setResults(current => [...current, ...passageResults])
    if (groupIndex >= groups.length - 1) setPhase("results")
    else setGroupIndex(value => value + 1)
  }

  if (phase === "setup") return <main className="min-h-screen bg-[#f3f6f6] text-[#172b3a]"><div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6 lg:px-8"><div className="flex items-center justify-between"><Button asChild variant="ghost"><Link href="/test-player"><ArrowLeft/>Test tools</Link></Button><Badge className="border-0 bg-[#102a43] text-white"><BookOpenCheck className="mr-1 size-3.5"/>LNAT Passage Intelligence</Badge></div><Card><CardHeader><p className="text-xs font-bold uppercase tracking-[.16em] text-[#147d91]">Passage-level practice</p><CardTitle className="font-serif text-3xl">Train the reasoning pattern across a whole passage set.</CardTitle><CardDescription>Questions stay grouped by passage so feedback can distinguish main conclusion, inference, assumption, evidence, tone/purpose and qualification errors instead of treating every miss as generic comprehension.</CardDescription></CardHeader><CardContent className="space-y-4"><label className="block max-w-xs"><span className="mb-1 block text-xs font-bold uppercase text-slate-500">Practice form</span><NativeSelect value={String(form)} onChange={event=>setForm(Number(event.target.value) as PaperForm)}><NativeSelectOption value="1">Form 1</NativeSelectOption><NativeSelectOption value="2">Form 2</NativeSelectOption></NativeSelect></label><div className="grid gap-3 sm:grid-cols-3"><Metric label="Passage groups" value={String(groups.length)}/><Metric label="Questions" value={String(questions.length)}/><Metric label="Feedback categories" value="6"/></div><Button onClick={start}><BookOpenCheck/>Start passage practice</Button></CardContent></Card></div></main>

  if (phase === "results") return <main className="min-h-screen bg-[#f3f6f6] text-[#172b3a]"><div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6 lg:px-8"><div className="flex justify-between"><Button asChild variant="ghost"><Link href="/test-player"><ArrowLeft/>Test tools</Link></Button><Button onClick={start}><RefreshCw/>Restart</Button></div><Card><CardHeader><CardTitle className="font-serif text-3xl">LNAT passage diagnostic</CardTitle><CardDescription>Accuracy and confidence are shown by the type of reasoning the passage demanded.</CardDescription></CardHeader><CardContent className="grid gap-4 md:grid-cols-2">{diagnostic.map(item=><div key={item.skill} className="rounded-2xl border bg-white p-4"><div className="flex items-center justify-between gap-3"><strong className="capitalize">{item.skill}</strong><Badge variant="outline">{item.correct}/{item.total}</Badge></div><Progress value={item.accuracy} className="mt-3"/><p className="mt-2 text-xs text-slate-500">Accuracy {item.accuracy}% · mean confidence {item.meanConfidence}% · calibration gap {item.calibrationGap>0?"+":""}{item.calibrationGap}</p><p className="mt-3 text-sm leading-6"><strong>Next:</strong> {item.nextAction}</p></div>)}</CardContent></Card></div></main>

  if (!group) return null
  return <main className="min-h-screen bg-[#f3f6f6] text-[#172b3a]"><div className="mx-auto max-w-6xl space-y-5 px-4 py-6 sm:px-6 lg:px-8"><div className="flex flex-wrap items-center justify-between gap-3"><Button asChild variant="ghost"><Link href="/test-player"><ArrowLeft/>Exit</Link></Button><div className="flex gap-2"><Badge variant="outline">{group.title}</Badge><Badge variant="outline">{groupIndex+1}/{groups.length}</Badge></div></div><Card className="border-0 bg-[#102a43] text-white"><CardHeader><CardTitle className="font-serif text-2xl">Read across the passage set, not one question at a time.</CardTitle><CardDescription className="text-white/65">Before selecting an option, identify what the question is asking you to extract: a conclusion, inference, assumption, use of evidence, tone/purpose, or a qualification.</CardDescription></CardHeader></Card>{group.questions.map((question,index)=><Card key={question.id}><CardHeader><div className="flex items-center justify-between gap-3"><Badge variant="outline">Q{index+1} · {lnatReasoningSkill(question.prompt)}</Badge><span className="text-xs text-slate-500">Confidence {confidence[question.id] ?? 60}%</span></div><CardTitle className="text-lg leading-7">{question.prompt}</CardTitle></CardHeader><CardContent className="space-y-3">{question.options.map((option,optionIndex)=><button key={`${optionIndex}-${option}`} onClick={()=>setAnswers(current=>({...current,[question.id]:optionIndex}))} className={`w-full rounded-xl border p-3 text-left text-sm leading-6 ${answers[question.id]===optionIndex?"border-[#147d91] bg-cyan-50":"bg-white"}`}><strong>{String.fromCharCode(65+optionIndex)}.</strong> {option}</button>)}<input className="w-full" type="range" min="0" max="100" step="5" value={confidence[question.id] ?? 60} onChange={event=>setConfidence(current=>({...current,[question.id]:Number(event.target.value)}))}/></CardContent></Card>)}<div className="flex justify-end"><Button onClick={submitPassage} disabled={group.questions.some(question=>answers[question.id]===undefined)}><CheckCircle2/>Lock passage set {groupIndex>=groups.length-1?"and finish":""}<ArrowRight/></Button></div></div></main>
}

function Metric({label,value}:{label:string;value:string}){return <div className="rounded-xl border bg-slate-50 p-4"><p className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</p><p className="mt-1 text-xl font-bold text-[#147d91]">{value}</p></div>}

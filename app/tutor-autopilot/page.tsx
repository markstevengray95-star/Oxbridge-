"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { ArrowLeft, ArrowRight, Brain, CheckCircle2, Gauge, HelpCircle, Loader2, RefreshCw, Sparkles, Target } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import { adaptiveDifficulty, buildAutopilotPlan, deriveDeepMetrics } from "@/lib/deep-prep"

const PROGRESS_KEY = "oxbridge-tutor-progress-v2"
const PROFILE_KEY = "oxbridge-tutor-profile-v2"
const AUTOPILOT_KEY = "oxbridge-autopilot-v1"

type GeneratedQuestion = { question: string; successCriteria: string[]; transferTwist: string; targetSkill: string }
type Evaluation = { score: number; whatWorked: string; missed: string; transferScore: number; nextQuestion: string; hintLevelSuggestion: string }
type SupportLevel = "independent" | "clarification" | "light" | "substantial" | "worked"

const supportLevels: Array<{ id: SupportLevel; label: string; note: string }> = [
  { id: "independent", label: "Independent", note: "No help used" },
  { id: "clarification", label: "Clarification", note: "Question wording only" },
  { id: "light", label: "Light hint", note: "Small directional cue" },
  { id: "substantial", label: "Substantial hint", note: "Method partly revealed" },
  { id: "worked", label: "Worked guidance", note: "Most of the route supplied" },
]

function read(key: string) {
  try { return JSON.parse(localStorage.getItem(key) || "{}") as Record<string, unknown> } catch { return {} }
}

export default function TutorAutopilotPage() {
  const [progressData, setProgressData] = useState<Record<string, unknown>>({})
  const [course, setCourse] = useState("Physics")
  const [minutes, setMinutes] = useState(45)
  const [completed, setCompleted] = useState<string[]>([])
  const [question, setQuestion] = useState<GeneratedQuestion | null>(null)
  const [answer, setAnswer] = useState("")
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null)
  const [support, setSupport] = useState<SupportLevel>("independent")
  const [loading, setLoading] = useState(false)
  const [provider, setProvider] = useState<"gemini" | "local" | null>(null)

  useEffect(() => {
    const progress = read(PROGRESS_KEY)
    const profile = read(PROFILE_KEY)
    const saved = read(AUTOPILOT_KEY)
    setProgressData(progress)
    if (typeof profile.course === "string") setCourse(profile.course)
    if (typeof saved.minutes === "number") setMinutes(saved.minutes)
    if (Array.isArray(saved.completed)) setCompleted(saved.completed.filter(item => typeof item === "string") as string[])
  }, [])

  const metrics = useMemo(() => deriveDeepMetrics(progressData), [progressData])
  const difficulty = useMemo(() => adaptiveDifficulty(metrics), [metrics])
  const plan = useMemo(() => buildAutopilotPlan(progressData, minutes), [progressData, minutes])
  const weakest = [...metrics].sort((a, b) => a.score - b.score).slice(0, 3)
  const planMinutes = plan.reduce((sum, item) => sum + item.minutes, 0)

  function persist(nextCompleted = completed, nextMinutes = minutes) {
    localStorage.setItem(AUTOPILOT_KEY, JSON.stringify({ minutes: nextMinutes, completed: nextCompleted, updatedAt: new Date().toISOString() }))
  }

  function toggle(id: string) {
    const next = completed.includes(id) ? completed.filter(item => item !== id) : [...completed, id]
    setCompleted(next); persist(next)
  }

  function changeMinutes(value: number) { setMinutes(value); setCompleted([]); persist([], value) }

  async function generateChallenge() {
    setLoading(true); setEvaluation(null); setAnswer(""); setSupport("independent")
    try {
      const response = await fetch("/api/personalised-question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "generate", course, difficulty, weaknesses: weakest.map(item => item.label) }),
      })
      const data = await response.json() as { result?: GeneratedQuestion; provider?: "gemini" | "local" }
      if (data.result) setQuestion(data.result)
      setProvider(data.provider ?? "local")
    } finally { setLoading(false) }
  }

  function logSupport(level: SupportLevel) {
    setSupport(level)
    const progress = read(PROGRESS_KEY)
    const events = Array.isArray(progress.hintEvents) ? progress.hintEvents as unknown[] : []
    const next = { ...progress, hintEvents: [...events, { level, date: new Date().toISOString(), source: "autopilot", target: question?.targetSkill ?? weakest[0]?.label ?? "reasoning" }].slice(-100) }
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(next)); setProgressData(next)
  }

  async function evaluate() {
    if (!question || !answer.trim()) return
    setLoading(true)
    try {
      const response = await fetch("/api/personalised-question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "evaluate", course, difficulty, weaknesses: weakest.map(item => item.label), question: `${question.question}\nTransfer twist: ${question.transferTwist}`, answer, supportLevel: support }),
      })
      const data = await response.json() as { result?: Evaluation; provider?: "gemini" | "local" }
      if (data.result) {
        setEvaluation(data.result); setProvider(data.provider ?? "local")
        const progress = read(PROGRESS_KEY)
        const checks = Array.isArray(progress.transferChecks) ? progress.transferChecks as unknown[] : []
        const next = { ...progress, transferChecks: [...checks, { score: data.result.transferScore, answerScore: data.result.score, support, target: question.targetSkill, difficulty, date: new Date().toISOString() }].slice(-100) }
        localStorage.setItem(PROGRESS_KEY, JSON.stringify(next)); setProgressData(next)
      }
    } finally { setLoading(false) }
  }

  const completePercent = plan.length ? Math.round(completed.filter(id => plan.some(item => item.id === id)).length / plan.length * 100) : 0

  return <main className="min-h-screen bg-[#f4f7f7] text-[#172b3a]">
    <header className="border-b bg-[#102a43] text-white"><div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6"><Button asChild variant="ghost" className="text-white hover:bg-white/10 hover:text-white"><Link href="/tutor"><ArrowLeft />Personal Tutor</Link></Button><Badge className="bg-white/10 text-white"><Sparkles className="size-3.5" />Tutor Autopilot</Badge></div></header>
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6">
      <section className="grid gap-5 lg:grid-cols-[1.15fr_.85fr]"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#147d91]">One button, one session</p><h1 className="mt-2 font-serif text-4xl font-bold">Let the Tutor choose what you need next.</h1><p className="mt-3 max-w-3xl leading-7 text-slate-600">Autopilot balances weakness, independence, retention, transfer and interview evidence. Difficulty rises only when your reasoning is becoming more independent—not simply because you got one answer right.</p></div><Card className="border-0 bg-[#102a43] text-white"><CardHeader><CardDescription className="text-white/65">Current adaptive level</CardDescription><CardTitle className="font-serif text-4xl">{difficulty}</CardTitle></CardHeader><CardContent><p className="text-sm leading-6 text-white/75">Weakest signal: <strong className="text-white">{weakest[0]?.label ?? "Build a baseline"}</strong>.</p></CardContent></Card></section>

      <Card><CardHeader><div className="flex flex-wrap items-center justify-between gap-3"><div><CardTitle className="font-serif text-2xl">Today&apos;s session</CardTitle><CardDescription>{planMinutes} minutes planned · {completePercent}% completed</CardDescription></div><div className="flex flex-wrap gap-2">{[20,45,60,90].map(value => <Button key={value} size="sm" variant={minutes === value ? "default" : "outline"} onClick={() => changeMinutes(value)}>{value} min</Button>)}</div></div><Progress value={completePercent} /></CardHeader><CardContent className="grid gap-3 md:grid-cols-2">{plan.map((item, index) => <div key={item.id} className={`rounded-2xl border p-4 ${completed.includes(item.id) ? "border-emerald-200 bg-emerald-50" : "bg-white"}`}><div className="flex items-start gap-3"><span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#edf7f8] text-sm font-bold text-[#147d91]">{index+1}</span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><strong>{item.label}</strong><Badge variant="outline">{item.minutes} min</Badge><Badge variant="outline">{item.kind}</Badge></div><p className="mt-1 text-sm leading-6 text-slate-600">{item.note}</p><div className="mt-3 flex gap-2"><Button asChild size="sm"><Link href={item.href}>Start <ArrowRight /></Link></Button><Button size="sm" variant="outline" onClick={() => toggle(item.id)}>{completed.includes(item.id) ? <><CheckCircle2 />Done</> : "Mark done"}</Button></div></div></div></div>)}</CardContent></Card>

      <section className="grid gap-5 xl:grid-cols-[.75fr_1.25fr]"><Card><CardHeader><CardTitle className="font-serif text-2xl">Learning signals</CardTitle><CardDescription>These are preparation signals, not admissions probabilities.</CardDescription></CardHeader><CardContent className="space-y-4">{metrics.map(item => <div key={item.id}><div className="mb-1 flex items-center justify-between text-sm"><strong>{item.label}</strong><span>{item.score}%</span></div><Progress value={item.score} /><p className="mt-1 text-xs leading-5 text-slate-500">{item.evidence}</p></div>)}</CardContent></Card>

        <Card id="challenge"><CardHeader><div className="flex items-center justify-between gap-3"><div><CardTitle className="flex items-center gap-2 font-serif text-2xl"><Target className="size-5 text-[#147d91]" />Mistake-DNA challenge</CardTitle><CardDescription>A fresh original problem targets your weakest evidenced habits and checks transfer.</CardDescription></div><Button variant="outline" onClick={generateChallenge} disabled={loading}>{loading ? <Loader2 className="animate-spin" /> : <RefreshCw />}Generate</Button></div></CardHeader><CardContent className="space-y-5">{question ? <><div className="rounded-2xl bg-[#edf7f8] p-5"><Badge>{provider === "gemini" ? "AI generated" : "Built-in original"}</Badge><p className="mt-3 font-serif text-xl leading-8">{question.question}</p><div className="mt-4"><p className="text-xs font-bold uppercase tracking-wider text-[#147d91]">Success criteria</p>{question.successCriteria.map(item => <p key={item} className="mt-1 text-sm">• {item}</p>)}</div><div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3"><strong className="text-sm">Transfer twist</strong><p className="mt-1 text-sm leading-6">{question.transferTwist}</p></div></div><div><p className="mb-2 text-sm font-semibold">How much support did you use?</p><div className="flex flex-wrap gap-2">{supportLevels.map(item => <Button key={item.id} size="sm" variant={support === item.id ? "default" : "outline"} onClick={() => logSupport(item.id)} title={item.note}><HelpCircle />{item.label}</Button>)}</div></div><Textarea rows={8} value={answer} onChange={event => setAnswer(event.target.value)} placeholder="Think aloud in writing: claim → reason → assumption → test → provisional conclusion…" /><Button onClick={evaluate} disabled={!answer.trim() || loading}>{loading ? <Loader2 className="animate-spin" /> : <Gauge />}Evaluate reasoning + transfer</Button>{evaluation && <div className="grid gap-3 md:grid-cols-2"><div className="rounded-2xl border bg-white p-4"><p className="text-xs font-bold uppercase tracking-wider text-slate-500">Reasoning signal</p><p className="mt-1 text-3xl font-bold">{evaluation.score}%</p><p className="mt-2 text-sm leading-6"><strong>Worked:</strong> {evaluation.whatWorked}</p><p className="mt-2 text-sm leading-6"><strong>Next:</strong> {evaluation.missed}</p></div><div className="rounded-2xl border bg-white p-4"><p className="text-xs font-bold uppercase tracking-wider text-slate-500">Transfer signal</p><p className="mt-1 text-3xl font-bold">{evaluation.transferScore}%</p><p className="mt-2 text-sm leading-6"><strong>Next question:</strong> {evaluation.nextQuestion}</p><p className="mt-2 text-xs text-slate-500">Suggested support next time: {evaluation.hintLevelSuggestion}</p></div></div>}</> : <div className="rounded-2xl border border-dashed p-8 text-center"><Brain className="mx-auto mb-3 size-8 text-[#147d91]" /><p className="font-semibold">Generate a challenge when you are ready.</p><p className="mt-1 text-sm text-slate-500">It will use your current weakest signals and adaptive level.</p></div>}</CardContent></Card></section>
    </div>
  </main>
}

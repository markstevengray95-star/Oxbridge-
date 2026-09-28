"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { ArrowLeft, ArrowRight, Brain, CheckCircle2, Loader2, RefreshCw, Target } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import {
  TARGETED_PRACTICE_HISTORY_KEY,
  TARGETED_PRACTICE_KEY,
  localPracticePrompt,
  type TargetedPracticeAttempt,
  type TargetedPracticeQuestion,
  type TargetedPracticeTarget,
} from "@/lib/feedback-practice"

type MarkResult = {
  classification: "needs-repair" | "developing" | "secure"
  feedback: string
  nextStep: string
  provider?: string
}

function readTarget() {
  try {
    return JSON.parse(localStorage.getItem(TARGETED_PRACTICE_KEY) || "null") as TargetedPracticeTarget | null
  } catch {
    return null
  }
}

function readHistory() {
  try {
    const value = JSON.parse(localStorage.getItem(TARGETED_PRACTICE_HISTORY_KEY) || "[]")
    return Array.isArray(value) ? value as TargetedPracticeAttempt[] : []
  } catch {
    return []
  }
}

export default function TargetedPracticePage() {
  const [target, setTarget] = useState<TargetedPracticeTarget | null>(null)
  const [question, setQuestion] = useState<TargetedPracticeQuestion | null>(null)
  const [answer, setAnswer] = useState("")
  const [round, setRound] = useState(1)
  const [loading, setLoading] = useState(false)
  const [marking, setMarking] = useState(false)
  const [result, setResult] = useState<MarkResult | null>(null)
  const [notice, setNotice] = useState("")

  useEffect(() => {
    const saved = readTarget()
    setTarget(saved)
    if (saved) void generate(saved, 1)
  }, [])

  async function generate(activeTarget = target, nextRound = round) {
    if (!activeTarget || loading) return
    setLoading(true)
    setNotice("")
    setResult(null)
    setAnswer("")
    try {
      const response = await fetch("/api/targeted-practice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "generate", target: activeTarget, round: nextRound }),
      })
      if (!response.ok) throw new Error("generate")
      const data = await response.json() as { question?: TargetedPracticeQuestion }
      setQuestion(data.question || localPracticePrompt(activeTarget, nextRound))
    } catch {
      setQuestion(localPracticePrompt(activeTarget, nextRound))
      setNotice("The cloud generator was unavailable, so a local transfer question was created instead.")
    } finally {
      setLoading(false)
    }
  }

  async function markAttempt() {
    if (!target || !question || !answer.trim() || marking) return
    setMarking(true)
    setNotice("")
    try {
      const response = await fetch("/api/targeted-practice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "mark", target, question, answer: answer.trim(), round }),
      })
      if (!response.ok) throw new Error("mark")
      const data = await response.json() as MarkResult
      setResult(data)
      const attempt: TargetedPracticeAttempt = {
        id: `targeted-${Date.now()}`,
        targetId: target.id,
        questionId: question.id,
        prompt: question.prompt,
        answer: answer.trim(),
        classification: data.classification,
        feedback: data.feedback,
        nextStep: data.nextStep,
        skill: target.skill,
        source: target.source,
        round,
        contextShift: question.contextShift,
        createdAt: new Date().toISOString(),
      }
      const history = [attempt, ...readHistory()].slice(0, 250)
      localStorage.setItem(TARGETED_PRACTICE_HISTORY_KEY, JSON.stringify(history))
    } catch {
      setNotice("This attempt could not be marked. Your answer is still on screen, so you can retry without losing it.")
    } finally {
      setMarking(false)
    }
  }

  function transferAgain() {
    const nextRound = Math.min(5, round + 1)
    setRound(nextRound)
    void generate(target, nextRound)
  }

  if (!target) {
    return <main className="min-h-screen bg-[#f4f7f7] text-[#172b3a]"><div className="mx-auto max-w-4xl px-4 py-12"><Card><CardHeader><Brain className="size-5 text-[#147d91]"/><CardTitle className="font-serif text-3xl">No practice target selected yet</CardTitle><CardDescription>Open an interview review, Mistake Replay, or Learning Trajectory and choose a skill to practise.</CardDescription></CardHeader><CardContent className="flex flex-wrap gap-3"><Button asChild><Link href="/interviews">Interview Hub</Link></Button><Button asChild variant="outline"><Link href="/mistake-replay">Mistake Replay</Link></Button><Button asChild variant="outline"><Link href="/learning-trajectory">Learning Trajectory</Link></Button></CardContent></Card></div></main>
  }

  return <main className="min-h-screen bg-[#f4f7f7] text-[#172b3a]">
    <header className="border-b bg-white"><div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4"><Button asChild variant="ghost"><Link href={target.id.startsWith("trajectory-") ? "/learning-trajectory" : target.source === "exam" ? "/mistake-replay" : "/reasoning-interview"}><ArrowLeft/>Back</Link></Button><Badge variant="outline"><Target className="size-3.5"/>Feedback → practice loop</Badge></div></header>
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <section className="grid gap-5 lg:grid-cols-[.8fr_1.2fr]">
        <Card className="border-0 bg-[#102a43] text-white"><CardHeader><p className="text-xs font-bold uppercase tracking-[.18em] text-[#8dd7de]">Target skill</p><CardTitle className="font-serif text-3xl">{target.skill}</CardTitle><CardDescription className="text-white/65">Source: {target.id.startsWith("trajectory-") ? "Learning trajectory retest" : target.source === "exam" ? `${target.test || "Admissions test"}${target.section ? ` · ${target.section}` : ""}` : target.course || "Interview feedback"}</CardDescription></CardHeader><CardContent className="space-y-4"><div className="rounded-xl bg-white/10 p-4"><p className="text-xs font-bold uppercase tracking-wider text-[#8dd7de]">Why this was selected</p><p className="mt-2 text-sm leading-6 text-white/80">{target.weakness}</p></div>{target.evidence?<div className="rounded-xl bg-white/10 p-4"><p className="text-xs font-bold uppercase tracking-wider text-[#8dd7de]">Evidence from previous work</p><p className="mt-2 text-sm leading-6 text-white/80">{target.evidence}</p></div>:null}<p className="text-xs leading-5 text-white/55">This loop changes the surface context so improvement cannot come from memorising the previous answer.</p></CardContent></Card>

        <Card><CardHeader><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-[#147d91]">Transfer round {round}</p><CardTitle className="font-serif text-2xl">Practise the same weakness in a new context</CardTitle></div>{question?<Badge variant="outline">{question.source === "gemini" ? "Generated" : "Local fallback"}</Badge>:null}</div><CardDescription>{round === 1 ? "Near transfer: same reasoning demand, different context." : round === 2 ? "Changed condition: adapt the method rather than repeat it." : "Far transfer: recognise the underlying skill beneath a different surface problem."}</CardDescription></CardHeader><CardContent className="space-y-4">
          {loading?<div className="flex min-h-40 items-center justify-center gap-2 text-sm text-slate-500"><Loader2 className="size-4 animate-spin"/>Building a fresh practice task…</div>:question?<><div className="rounded-2xl border bg-slate-50 p-5"><p className="whitespace-pre-wrap font-semibold leading-7">{question.prompt}</p><p className="mt-3 text-xs text-slate-500">Context shift: {question.contextShift}</p></div><div className="rounded-xl border border-cyan-100 bg-cyan-50 p-4"><p className="text-xs font-bold uppercase tracking-wider text-cyan-800">What good evidence would show</p><ul className="mt-2 space-y-1 text-sm text-cyan-950">{question.successCriteria.map(item=><li key={item}>• {item}</li>)}</ul></div><Textarea value={answer} onChange={event=>setAnswer(event.target.value)} rows={8} placeholder="Explain your reasoning, not just the final conclusion…"/>{!result?<Button onClick={markAttempt} disabled={!answer.trim()||marking}>{marking?<Loader2 className="size-4 animate-spin"/>:<CheckCircle2/>}{marking?"Checking reasoning…":"Check this attempt"}</Button>:<div className={`rounded-2xl border p-5 ${result.classification === "secure" ? "border-emerald-200 bg-emerald-50" : result.classification === "developing" ? "border-amber-200 bg-amber-50" : "border-rose-200 bg-rose-50"}`}><div className="flex flex-wrap items-center gap-2"><Badge variant="outline">{result.classification === "secure" ? "Secure evidence" : result.classification === "developing" ? "Developing" : "Needs repair"}</Badge></div><p className="mt-3 text-sm leading-6">{result.feedback}</p><p className="mt-3 text-sm font-semibold">Next step: {result.nextStep}</p><div className="mt-4 flex flex-wrap gap-3"><Button onClick={transferAgain}>{result.classification === "secure" ? "Test transfer again" : "Try a fresh version"}<ArrowRight/></Button><Button variant="outline" onClick={()=>{setResult(null);setAnswer("")}}><RefreshCw/>Rewrite this answer</Button><Button asChild variant="outline"><Link href="/learning-trajectory">View trajectory</Link></Button></div></div>}</>:<Button onClick={()=>void generate(target,round)}>Generate practice question</Button>}
          {notice?<p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{notice}</p>:null}
        </CardContent></Card>
      </section>
    </div>
  </main>
}

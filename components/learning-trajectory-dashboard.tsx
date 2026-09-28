"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { ArrowLeft, ArrowRight, Brain, CalendarClock, CheckCircle2, RefreshCw, Target, TrendingDown, TrendingUp } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { EXAM_INTELLIGENCE_KEY, type ExamAttemptObservation } from "@/lib/exam-intelligence"
import { TARGETED_PRACTICE_HISTORY_KEY, TARGETED_PRACTICE_KEY, type TargetedPracticeAttempt, type TargetedPracticeTarget } from "@/lib/feedback-practice"
import { LEARNING_TRAJECTORY_KEY, buildLearningTrajectory, recommendedSession, type SkillTrajectory } from "@/lib/learning-trajectory"
import { PROGRESS_KEY } from "@/lib/personal-tutor"

function readJson<T>(key: string, fallback: T): T {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || "null")
    return parsed ?? fallback
  } catch {
    return fallback
  }
}

function dateLabel(value: string) {
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return "No date"
  return date.toLocaleDateString(undefined, { day: "numeric", month: "short" })
}

function trendIcon(trend: SkillTrajectory["trend"]) {
  if (trend === "rising") return <TrendingUp className="size-4 text-emerald-600" />
  if (trend === "falling") return <TrendingDown className="size-4 text-rose-600" />
  return <RefreshCw className="size-4 text-slate-400" />
}

function stabilityLabel(value: SkillTrajectory["stability"]) {
  if (value === "robust") return "Robust across contexts"
  if (value === "stable") return "Stable evidence"
  if (value === "developing") return "Developing stability"
  return "Fragile / limited evidence"
}

export function LearningTrajectoryDashboard() {
  const [version, setVersion] = useState(0)
  const [ready, setReady] = useState(false)

  useEffect(() => setReady(true), [])

  const summary = useMemo(() => {
    if (!ready) return buildLearningTrajectory({})
    const examRaw = readJson<unknown>(EXAM_INTELLIGENCE_KEY, [])
    const examAttempts: ExamAttemptObservation[] = Array.isArray(examRaw)
      ? examRaw as ExamAttemptObservation[]
      : Array.isArray((examRaw as { attempts?: unknown[] })?.attempts)
        ? (examRaw as { attempts: ExamAttemptObservation[] }).attempts
        : []
    const targetedAttempts = readJson<TargetedPracticeAttempt[]>(TARGETED_PRACTICE_HISTORY_KEY, [])
    const progress = readJson<Record<string, unknown>>(PROGRESS_KEY, {})
    const next = buildLearningTrajectory({ examAttempts, targetedAttempts, progress })
    localStorage.setItem(LEARNING_TRAJECTORY_KEY, JSON.stringify(next))
    return next
  }, [ready, version])

  const session = recommendedSession(summary)

  function launchPractice(skill: SkillTrajectory) {
    const target: TargetedPracticeTarget = {
      id: `trajectory-${skill.skill.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now()}`,
      source: "exam",
      skill: skill.skill,
      weakness: skill.highConfidenceErrors
        ? `Repair ${skill.skill} because recent evidence contains a high-confidence error.`
        : skill.trend === "falling"
          ? `Rebuild ${skill.skill}; recent evidence is weaker than earlier evidence.`
          : `Retest ${skill.skill} because the spaced practice interval is due.`,
      practiceSeed: `Create a fresh transfer problem testing ${skill.skill}. Do not repeat the surface wording of earlier questions. Require the learner to expose the decisive reasoning step, one assumption and one check.`,
      evidence: `${skill.evidenceCount} evidence points across ${skill.sourceCount} practice source${skill.sourceCount === 1 ? "" : "s"}. Current mastery ${skill.mastery}%.`,
      createdAt: new Date().toISOString(),
    }
    localStorage.setItem(TARGETED_PRACTICE_KEY, JSON.stringify(target))
    window.location.href = "/targeted-practice"
  }

  if (!ready) return <main className="min-h-screen bg-[#f4f7f7]" />

  return <main className="min-h-screen bg-[#f4f7f7] text-[#172b3a]">
    <header className="border-b bg-white"><div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4 sm:px-6"><Button asChild variant="ghost"><Link href="/student-home"><ArrowLeft/>Student Home</Link></Button><Badge className="border-0 bg-[#102a43] text-white"><Brain className="mr-1 size-3.5"/>Learning trajectory</Badge></div></header>
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6">
      <section className="grid gap-5 lg:grid-cols-[1.2fr_.8fr]">
        <Card className="border-0 bg-[#102a43] text-white"><CardHeader><p className="text-xs font-bold uppercase tracking-[.18em] text-[#8dd7de]">Cross-session intelligence</p><CardTitle className="font-serif text-4xl">Is the reasoning actually getting stronger?</CardTitle><CardDescription className="max-w-3xl text-white/65">This view combines mock-paper evidence, adaptive exam attempts, interview rubric evidence and feedback-to-practice transfer. A single correct answer is not treated as permanent mastery.</CardDescription></CardHeader><CardContent className="grid gap-3 sm:grid-cols-3"><Metric label="Overall mastery" value={`${summary.overallMastery}%`}/><Metric label="Evidence points" value={String(summary.evidenceCount)}/><Metric label="Cross-context skills" value={String(summary.crossContextSkills)}/></CardContent></Card>
        <Card><CardHeader><CalendarClock className="size-5 text-[#147d91]"/><CardTitle className="font-serif text-2xl">Spaced retest queue</CardTitle><CardDescription>{summary.dueSkills.length ? `${summary.dueSkills.length} skill${summary.dueSkills.length === 1 ? " is" : "s are"} due now.` : "Nothing is overdue. The app will extend intervals only when evidence is stable."}</CardDescription></CardHeader><CardContent className="space-y-2">{summary.dueSkills.slice(0,4).map(item=><button key={item.skill} onClick={()=>launchPractice(item)} className="flex w-full items-center justify-between gap-3 rounded-xl border bg-white p-3 text-left hover:bg-slate-50"><div><p className="font-semibold">{item.skill}</p><p className="text-xs text-slate-500">{item.mastery}% · {stabilityLabel(item.stability)}</p></div><ArrowRight className="size-4"/></button>)}{!summary.dueSkills.length?<p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">Complete more exam or interview practice to build the next retest schedule.</p>:null}</CardContent></Card>
      </section>

      {session.length?<Card className="border-cyan-200 bg-cyan-50/50"><CardHeader><CardTitle className="font-serif text-2xl">Recommended next session</CardTitle><CardDescription>Three short tasks chosen from weakness, recency, confidence and transfer evidence rather than just raw score.</CardDescription></CardHeader><CardContent className="grid gap-3 md:grid-cols-3">{session.map((item,index)=>{const skill=summary.skills.find(row=>row.skill===item.skill);return <div key={item.skill} className="rounded-2xl border bg-white p-4"><div className="flex items-center justify-between gap-2"><Badge variant="outline">{index+1}</Badge><span className="text-xs font-semibold text-slate-500">{item.minutes} min</span></div><p className="mt-3 font-semibold">{item.skill}</p><p className="mt-1 text-sm text-slate-600">{item.reason}</p><p className="mt-2 text-xs font-semibold uppercase tracking-wider text-[#147d91]">{item.mode.replace("-"," ")}</p>{skill?<Button className="mt-4 w-full" size="sm" onClick={()=>launchPractice(skill)}><Target/>Start task</Button>:null}</div>})}</CardContent></Card>:null}

      <Card><CardHeader><CardTitle className="font-serif text-2xl">Skill trajectory</CardTitle><CardDescription>Mastery is weighted by recency and source. Stability only rises when success repeats across different contexts.</CardDescription></CardHeader><CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{summary.skills.map(item=><div key={item.skill} className="rounded-2xl border bg-white p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold">{item.skill}</p><div className="mt-1 flex items-center gap-2 text-xs text-slate-500">{trendIcon(item.trend)}<span className="capitalize">{item.trend}</span><span>·</span><span>{item.evidenceCount} evidence</span></div></div><Badge variant="outline">{item.mastery}%</Badge></div><Progress value={item.mastery} className="mt-3"/><div className="mt-3 grid grid-cols-2 gap-2 text-xs"><div className="rounded-lg bg-slate-50 p-2"><span className="block text-slate-500">Stability</span><strong>{stabilityLabel(item.stability)}</strong></div><div className="rounded-lg bg-slate-50 p-2"><span className="block text-slate-500">Retest</span><strong>{item.dueNow?"Due now":dateLabel(item.dueAt)}</strong></div></div>{item.highConfidenceErrors?<p className="mt-3 rounded-lg bg-rose-50 p-2 text-xs font-semibold text-rose-800">{item.highConfidenceErrors} high-confidence error{item.highConfidenceErrors===1?"":"s"} detected</p>:null}<div className="mt-3 flex gap-2"><Button size="sm" onClick={()=>launchPractice(item)}><Target/>Retest</Button><Button size="sm" variant="outline" onClick={()=>setVersion(value=>value+1)}><RefreshCw/>Refresh</Button></div></div>)}{!summary.skills.length?<div className="md:col-span-2 xl:col-span-3 rounded-2xl border border-dashed p-8 text-center text-sm text-slate-500">No evidence yet. Complete an admissions-test simulation, Exam Intelligence session, or Reasoning Interview to start the trajectory.</div>:null}</CardContent></Card>

      {summary.strongest.length?<Card><CardHeader><CardTitle className="font-serif text-2xl">What is becoming dependable?</CardTitle><CardDescription>High scores are only listed as strong when there is enough supporting evidence to distinguish success from a one-off result.</CardDescription></CardHeader><CardContent className="space-y-2">{summary.strongest.map(item=><div key={item.skill} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3"><div className="flex items-center gap-3"><CheckCircle2 className="size-5 text-emerald-600"/><div><p className="font-semibold">{item.skill}</p><p className="text-xs text-slate-500">{item.sourceCount} source{item.sourceCount===1?"":"s"} · {stabilityLabel(item.stability)}</p></div></div><Badge variant="outline">{item.mastery}%</Badge></div>)}</CardContent></Card>:null}
    </div>
  </main>
}

function Metric({label,value}:{label:string;value:string}){return <div className="rounded-xl bg-white/10 p-4"><p className="text-xs font-bold uppercase tracking-wider text-[#8dd7de]">{label}</p><p className="mt-1 text-2xl font-bold">{value}</p></div>}

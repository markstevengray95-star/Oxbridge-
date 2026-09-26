"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Circle,
  Clock3,
  GitBranch,
  History,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Target,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { createClient } from "@/lib/supabase/client"
import type { SkillState, StudentIntelligence, TutorAction } from "@/lib/personal-tutor"

const EXECUTION_KEY = "oxbridge-tutor-execution-v1"
const SNAPSHOT_KEY = "oxbridge-tutor-visit-snapshot-v1"
const CLOUD_STATE_KEY = "oxbridge-tutor-execution-v1"

type ExecutionState = {
  completed?: string[]
  generatedAt?: string
}

type VisitSnapshot = {
  at: string
  preparationScore: number
  evidenceCount: number
  interviewCount: number
  paperCount: number
  essayCount: number
  priorityLabel: string
  priorityScore: number
}

type TransferPattern = {
  label: string
  domains: string[]
  evidence: string
  href: string
  action: string
}

type PlanStep = {
  id: string
  day: number
  label: string
  note: string
  href: string
  minutes: number
  kind: "Diagnose" | "Practise" | "Transfer" | "Retest" | "Reflect"
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "null")
    return value ?? fallback
  } catch {
    return fallback
  }
}

function totalEvidence(intelligence: StudentIntelligence) {
  return intelligence.skills.reduce((sum, skill) => sum + skill.evidenceCount, 0) + intelligence.evidence.length
}

function ageInDays(dateValue: string) {
  const timestamp = new Date(dateValue).getTime()
  if (!Number.isFinite(timestamp)) return Infinity
  return Math.max(0, Math.floor((Date.now() - timestamp) / 86_400_000))
}

function evidenceQuality(intelligence: StudentIntelligence) {
  const evidencedSkills = intelligence.skills.filter(item => item.evidenceCount > 0)
  const sample = evidencedSkills.reduce((sum, item) => sum + item.evidenceCount, 0)
  const newestAge = intelligence.evidence.length ? Math.min(...intelligence.evidence.map(item => ageInDays(item.date))) : Infinity
  const breadth = new Set(evidencedSkills.map(item => item.domain)).size
  const score = Math.min(100, Math.round(Math.min(45, sample * 4) + breadth * 10 + (newestAge <= 7 ? 15 : newestAge <= 30 ? 8 : 0)))
  const label = score >= 75 ? "Strong" : score >= 45 ? "Developing" : "Limited"
  return { score, label, newestAge, breadth, sample }
}

const patternRules: Array<{
  label: string
  match: RegExp
  action: string
  href: string
}> = [
  {
    label: "Reasoning chain & justification",
    match: /(reason|argument|logic|inference|conclusion|structure|justify)/i,
    action: "Use an unfamiliar problem and make every inference explicit before committing to an answer.",
    href: "/tutorial-lab",
  },
  {
    label: "Assumptions & evidence testing",
    match: /(assumption|evidence|evaluation|counter|limitation|critical|interpret)/i,
    action: "Practise identifying the hidden assumption, then design one observation that could disprove it.",
    href: "/reasoning-lab",
  },
  {
    label: "Precision & communication",
    match: /(clarity|communicat|precision|word|expression|explain)/i,
    action: "Re-answer one task aloud using shorter claims, explicit definitions and one check for ambiguity.",
    href: "/interview-room",
  },
  {
    label: "Application of knowledge",
    match: /(subject|application|transfer|mechanism|concept|knowledge)/i,
    action: "Move the same idea into a new context so success cannot come from memorising the original task.",
    href: "/unseen-lab",
  },
]

function transferPatterns(skills: SkillState[]): TransferPattern[] {
  const low = skills.filter(item => item.evidenceCount > 0 && item.score < 72)
  const patterns: TransferPattern[] = []
  for (const rule of patternRules) {
    const matches = low.filter(item => rule.match.test(`${item.label} ${item.note}`))
    const domains = [...new Set(matches.map(item => item.domain))]
    if (domains.length < 2) continue
    const weakest = [...matches].sort((a, b) => a.score - b.score).slice(0, 3)
    patterns.push({
      label: rule.label,
      domains,
      evidence: weakest.map(item => `${item.label} ${item.score}%`).join(" · "),
      action: rule.action,
      href: rule.href,
    })
  }
  return patterns.slice(0, 3)
}

function transferHref(priority: SkillState | null) {
  if (!priority) return "/tutorial-lab"
  if (priority.domain === "Admissions test") return "/adaptive-paper"
  if (priority.domain === "Writing") return "/essay-tutor"
  if (priority.domain === "Application") return "/application-defence"
  return "/unseen-lab"
}

function retestHref(priority: SkillState | null) {
  if (!priority) return "/progress-proof"
  if (priority.domain === "Admissions test") return "/paper-intervention"
  if (priority.domain === "Writing") return "/essay-tutor"
  if (priority.domain === "Application") return "/application-defence"
  return "/interview-feedback"
}

function buildSevenDayPlan(intelligence: StudentIntelligence): PlanStep[] {
  const priority = intelligence.priority
  const recommendations = intelligence.recommendations.slice(0, 4)
  const primary: TutorAction = recommendations[0] ?? {
    id: "baseline",
    label: "Build a baseline",
    note: "Complete one substantial activity so the Tutor can replace uncertainty with evidence.",
    href: "/full-papers",
    minutes: 30,
    domain: "Admissions test",
    priority: 50,
  }
  const secondary = recommendations[1] ?? primary
  const tertiary = recommendations[2] ?? secondary
  const focus = priority?.label ?? "baseline evidence"

  return [
    { id: "day-1-diagnose", day: 1, label: `Confirm: ${focus}`, note: `Use a fresh task to confirm whether ${focus} is still the limiting factor rather than relying on an old score.`, href: priority?.href ?? primary.href, minutes: 20, kind: "Diagnose" },
    { id: "day-2-practise", day: 2, label: primary.label, note: primary.note, href: primary.href, minutes: Math.max(15, primary.minutes), kind: "Practise" },
    { id: "day-3-transfer", day: 3, label: "Transfer the reasoning", note: "Use the same underlying skill in an unfamiliar context. This tests whether improvement transfers beyond the practised item.", href: transferHref(priority), minutes: 20, kind: "Transfer" },
    { id: "day-4-secondary", day: 4, label: secondary.label, note: secondary.note, href: secondary.href, minutes: Math.max(15, secondary.minutes), kind: "Practise" },
    { id: "day-5-retest", day: 5, label: `Fresh check: ${focus}`, note: "Retest without looking back at the original solution. Compare the reasoning route as well as the final score.", href: retestHref(priority), minutes: 25, kind: "Retest" },
    { id: "day-6-breadth", day: 6, label: tertiary.label, note: tertiary.note, href: tertiary.href, minutes: Math.max(15, tertiary.minutes), kind: "Practise" },
    { id: "day-7-reflect", day: 7, label: "Evidence review & next hypothesis", note: "Review what improved, what did not transfer, and which next activity would give the most useful new evidence.", href: "/progress-proof", minutes: 15, kind: "Reflect" },
  ]
}

function snapshotFor(intelligence: StudentIntelligence): VisitSnapshot {
  return {
    at: new Date().toISOString(),
    preparationScore: intelligence.preparationScore,
    evidenceCount: totalEvidence(intelligence),
    interviewCount: intelligence.interviewCount,
    paperCount: intelligence.fullPaperCount,
    essayCount: intelligence.essayCount,
    priorityLabel: intelligence.priority?.label ?? "Build baseline",
    priorityScore: intelligence.priority?.score ?? 0,
  }
}

function deltaText(current: number, previous: number, noun: string) {
  const delta = current - previous
  if (!delta) return null
  return `${delta > 0 ? "+" : ""}${delta} ${noun}`
}

export function TutorExecutionLoop({ intelligence }: { intelligence: StudentIntelligence }) {
  const [state, setState] = useState<ExecutionState>({ completed: [] })
  const [previous, setPrevious] = useState<VisitSnapshot | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [cloudStatus, setCloudStatus] = useState<"local" | "saved" | "idle">("idle")

  useEffect(() => {
    const saved = readJson<ExecutionState>(EXECUTION_KEY, { completed: [] })
    setState(saved)
    const prior = readJson<VisitSnapshot | null>(SNAPSHOT_KEY, null)
    setPrevious(prior)
    localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snapshotFor(intelligence)))
    setLoaded(true)
  }, [intelligence])

  const plan = useMemo(() => buildSevenDayPlan(intelligence), [intelligence])
  const patterns = useMemo(() => transferPatterns(intelligence.skills), [intelligence.skills])
  const quality = useMemo(() => evidenceQuality(intelligence), [intelligence])
  const completed = state.completed ?? []
  const completion = Math.round((completed.filter(id => plan.some(step => step.id === id)).length / plan.length) * 100)

  const changes = useMemo(() => {
    if (!previous) return [] as string[]
    const current = snapshotFor(intelligence)
    return [
      deltaText(current.preparationScore, previous.preparationScore, "points in the evidenced preparation profile"),
      deltaText(current.evidenceCount, previous.evidenceCount, "connected evidence points"),
      deltaText(current.interviewCount, previous.interviewCount, "interview sessions"),
      deltaText(current.paperCount, previous.paperCount, "full papers"),
      deltaText(current.essayCount, previous.essayCount, "writing analyses"),
      current.priorityLabel !== previous.priorityLabel ? `Priority changed from ${previous.priorityLabel} to ${current.priorityLabel}` : null,
    ].filter((item): item is string => Boolean(item))
  }, [intelligence, previous])

  async function persist(next: ExecutionState) {
    setState(next)
    localStorage.setItem(EXECUTION_KEY, JSON.stringify(next))
    try {
      const supabase = createClient()
      const { data } = await supabase.auth.getUser()
      if (!data.user) { setCloudStatus("local"); return }
      const { error } = await supabase.from("user_state").upsert({
        user_id: data.user.id,
        state_key: CLOUD_STATE_KEY,
        state_value: next,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id,state_key" })
      setCloudStatus(error ? "local" : "saved")
    } catch {
      setCloudStatus("local")
    }
  }

  function toggle(id: string) {
    const nextCompleted = completed.includes(id) ? completed.filter(item => item !== id) : [...completed, id]
    void persist({ ...state, completed: nextCompleted, generatedAt: state.generatedAt ?? new Date().toISOString() })
  }

  function resetWeek() {
    void persist({ completed: [], generatedAt: new Date().toISOString() })
  }

  if (!loaded) return <section className="mx-auto max-w-7xl px-4 pb-8 sm:px-6"><div className="h-44 animate-pulse rounded-3xl border bg-white" /></section>

  return <section className="mx-auto max-w-7xl space-y-5 px-4 pb-8 sm:px-6" aria-labelledby="execution-title">
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.18em] text-[#147d91]"><GitBranch className="size-4" />Tutor execution loop</div>
        <h2 id="execution-title" className="mt-2 font-serif text-3xl font-bold text-[#172b3a]">Turn diagnosis into evidence of improvement.</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">Every priority now follows a diagnose → practise → transfer → retest cycle. The Tutor treats improvement as something to verify on a fresh task, not something to assume after one good attempt.</p>
      </div>
      <div className="flex items-center gap-2"><Badge variant="outline"><ShieldCheck className="size-3.5" />Evidence quality: {quality.label}</Badge><Button size="sm" variant="outline" onClick={resetWeek}><RefreshCw className="size-4" />Reset week</Button></div>
    </div>

    <div className="grid gap-5 xl:grid-cols-[.8fr_1.2fr]">
      <div className="space-y-5">
        <Card className="shadow-none">
          <CardHeader><div className="flex items-center justify-between gap-2"><div><CardDescription>What changed since your last Tutor visit</CardDescription><CardTitle className="mt-1 font-serif text-2xl">Progress pulse</CardTitle></div><History className="size-5 text-[#147d91]" /></div></CardHeader>
          <CardContent className="space-y-3">
            {previous ? changes.length ? changes.map(item => <div key={item} className="flex items-start gap-2 rounded-xl bg-[#f7fbfb] p-3 text-sm leading-6 text-slate-700"><Sparkles className="mt-1 size-4 shrink-0 text-[#147d91]" />{item}</div>) : <p className="text-sm leading-6 text-slate-600">No measurable change has been recorded since the previous Tutor visit. Completing a substantive task will create new comparison evidence.</p> : <p className="text-sm leading-6 text-slate-600">This is the first stored Tutor snapshot. From the next visit onward, ScholarBridge will show what actually changed rather than only the current score.</p>}
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardHeader><CardDescription>Evidence reliability</CardDescription><CardTitle className="font-serif text-2xl">How much should the Tutor trust this profile?</CardTitle></CardHeader>
          <CardContent className="space-y-3"><div className="flex items-center justify-between text-sm"><span>{quality.label} evidence base</span><strong>{quality.score}%</strong></div><Progress value={quality.score} /><div className="grid grid-cols-3 gap-2 text-center"><div className="rounded-xl bg-slate-50 p-3"><p className="font-bold">{quality.sample}</p><p className="text-[11px] text-slate-500">skill samples</p></div><div className="rounded-xl bg-slate-50 p-3"><p className="font-bold">{quality.breadth}/4</p><p className="text-[11px] text-slate-500">domains</p></div><div className="rounded-xl bg-slate-50 p-3"><p className="font-bold">{Number.isFinite(quality.newestAge) ? `${quality.newestAge}d` : "—"}</p><p className="text-[11px] text-slate-500">newest evidence</p></div></div><p className="text-xs leading-5 text-slate-500">Confidence rises with repeated, recent evidence across different preparation domains. It is not a probability of admission.</p></CardContent>
        </Card>
      </div>

      <Card className="shadow-none">
        <CardHeader><div className="flex flex-wrap items-center justify-between gap-3"><div><div className="flex items-center gap-2"><CalendarDays className="size-5 text-[#147d91]" /><CardTitle className="font-serif text-2xl">7-day execution board</CardTitle></div><CardDescription className="mt-1">Generated from the current Tutor priority and recommendations.</CardDescription></div><Badge variant="outline">{completion}% complete</Badge></div><Progress value={completion} /></CardHeader>
        <CardContent className="space-y-2">
          {plan.map(step => {
            const done = completed.includes(step.id)
            return <div key={step.id} className={`grid gap-3 rounded-2xl border p-4 md:grid-cols-[auto_1fr_auto] md:items-center ${done ? "border-emerald-200 bg-emerald-50" : "bg-white"}`}>
              <button onClick={() => toggle(step.id)} aria-label={`${done ? "Mark incomplete" : "Mark complete"}: ${step.label}`} className="flex items-center gap-2 text-left"><span className={`grid size-8 place-items-center rounded-full border ${done ? "border-emerald-600 bg-emerald-600 text-white" : "bg-white"}`}>{done ? <CheckCircle2 className="size-4" /> : <Circle className="size-4" />}</span><span className="text-xs font-bold uppercase tracking-wider text-slate-500">Day {step.day}</span></button>
              <div><div className="flex flex-wrap items-center gap-2"><strong className="text-sm">{step.label}</strong><Badge variant="outline">{step.kind}</Badge><Badge variant="outline"><Clock3 className="size-3" />{step.minutes} min</Badge></div><p className="mt-1 text-xs leading-5 text-slate-600">{step.note}</p></div>
              <Button asChild size="sm" variant={done ? "outline" : "default"}><Link href={step.href}>{done ? "Revisit" : "Start"} <ArrowRight className="size-3.5" /></Link></Button>
            </div>
          })}
          <p className="pt-1 text-right text-[11px] text-slate-400">{cloudStatus === "saved" ? "Execution progress saved to your account." : cloudStatus === "local" ? "Execution progress saved on this device." : "Completion saves automatically."}</p>
        </CardContent>
      </Card>
    </div>

    <Card className="shadow-none">
      <CardHeader><div className="flex items-center gap-2"><Target className="size-5 text-[#147d91]" /><CardTitle className="font-serif text-2xl">Cross-domain transfer signals</CardTitle></div><CardDescription>ScholarBridge only shows a connection when similar low-scoring evidence appears in at least two preparation domains.</CardDescription></CardHeader>
      <CardContent className="grid gap-3 lg:grid-cols-3">
        {patterns.length ? patterns.map(pattern => <div key={pattern.label} className="rounded-2xl border bg-[#fbfcfc] p-4"><div className="flex flex-wrap gap-1">{pattern.domains.map(domain => <Badge key={domain} variant="outline">{domain}</Badge>)}</div><h3 className="mt-3 font-serif text-lg font-bold">{pattern.label}</h3><p className="mt-2 text-xs leading-5 text-slate-500"><strong>Evidence:</strong> {pattern.evidence}</p><p className="mt-2 text-sm leading-6 text-slate-700">{pattern.action}</p><Button asChild size="sm" variant="outline" className="mt-3"><Link href={pattern.href}>Run transfer task <ArrowRight className="size-3.5" /></Link></Button></div>) : <div className="lg:col-span-3 rounded-2xl border border-dashed p-5 text-sm leading-6 text-slate-600">No cross-domain weakness is sufficiently evidenced yet. That is useful: the Tutor will not invent a common cause from one isolated low score. Complete work in more than one domain and this section will look for repeated reasoning patterns.</div>}
      </CardContent>
    </Card>
  </section>
}

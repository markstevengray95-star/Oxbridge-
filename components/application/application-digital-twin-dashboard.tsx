"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { Activity, ArrowRight, BookOpen, Brain, FileCheck2, MessageSquareText, RefreshCw, ShieldCheck, UserCheck } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/client"
import { deriveTwin, EVIDENCE_KEY, SOURCE_NOTEBOOK_KEY, fifteenMinutePlan, type TwinSnapshot } from "@/lib/digital-twin-2"
import { APPLICATION_KEY, buildStudentIntelligence, HUMAN_REVIEW_KEY, PROFILE_KEY, PROGRESS_KEY } from "@/lib/personal-tutor"

type JsonRecord = Record<string, unknown>
type CloudCounts = { interviews: number; tests: number; reviews: number }

function readRecord(key: string): JsonRecord {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "{}")
    return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {}
  } catch { return {} }
}

function readArray(key: string): unknown[] {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "[]")
    return Array.isArray(value) ? value : []
  } catch { return [] }
}

function populatedApplicationAreas(application: JsonRecord) {
  const keys = ["epq", "books", "projects", "competitions", "writtenWork", "interests", "workExperience"]
  return keys.filter(key => String(application[key] ?? "").trim()).length
}

function stateLabel(score: number) {
  if (score >= 75) return "Strong evidence"
  if (score >= 55) return "Developing evidence"
  return "Needs more evidence"
}

function dimensionRows(twin: TwinSnapshot) {
  return [
    ["Independent reasoning", twin.independence],
    ["Adaptability", twin.adaptability],
    ["Retention", twin.retention],
    ["Transfer", twin.transfer],
    ["Calibration", twin.calibration],
    ["Consistency", twin.consistency],
    ["Reading depth", twin.readingDepth],
    ["Application defence", twin.applicationDefence],
  ] as const
}

export function ApplicationDigitalTwinDashboard() {
  const [profile, setProfile] = useState<JsonRecord>({})
  const [progress, setProgress] = useState<JsonRecord>({})
  const [application, setApplication] = useState<JsonRecord>({})
  const [humanReviews, setHumanReviews] = useState<unknown[]>([])
  const [evidenceItems, setEvidenceItems] = useState<unknown[]>([])
  const [sourceNotes, setSourceNotes] = useState<unknown[]>([])
  const [cloud, setCloud] = useState<CloudCounts>({ interviews: 0, tests: 0, reviews: 0 })
  const [updatedAt, setUpdatedAt] = useState("")

  async function refresh() {
    const nextProfile = readRecord(PROFILE_KEY)
    const nextProgress = readRecord(PROGRESS_KEY)
    const nextApplication = readRecord(APPLICATION_KEY)
    setProfile(nextProfile)
    setProgress(nextProgress)
    setApplication(nextApplication)
    setHumanReviews(readArray(HUMAN_REVIEW_KEY))
    setEvidenceItems(readArray(EVIDENCE_KEY))
    setSourceNotes(readArray(SOURCE_NOTEBOOK_KEY))
    setUpdatedAt(new Date().toISOString())

    try {
      const supabase = createClient()
      const { data } = await supabase.auth.getUser()
      if (!data.user) return
      const userId = data.user.id
      const [interviews, tests, reviews] = await Promise.all([
        supabase.from("interview_sessions").select("id", { count: "exact", head: true }).eq("user_id", userId),
        supabase.from("test_results").select("id", { count: "exact", head: true }).eq("user_id", userId),
        supabase.from("human_reviews").select("id", { count: "exact", head: true }).eq("user_id", userId),
      ])
      setCloud({ interviews: interviews.count ?? 0, tests: tests.count ?? 0, reviews: reviews.count ?? 0 })
    } catch { /* local evidence remains usable */ }
  }

  useEffect(() => { void refresh() }, [])

  const intelligence = useMemo(() => buildStudentIntelligence(profile, progress), [profile, progress])
  const twin = useMemo(() => deriveTwin(progress), [progress])
  const plan = useMemo(() => fifteenMinutePlan(twin), [twin])
  const dimensions = dimensionRows(twin)
  const weakest = [...dimensions].sort((a, b) => a[1] - b[1])[0]
  const strongest = [...dimensions].sort((a, b) => b[1] - a[1])[0]
  const appAreas = populatedApplicationAreas(application)
  const evidenceCoverage = [
    { label: "Exam papers", count: Math.max(cloud.tests, intelligence.fullPaperCount), href: "/tutor#completed", icon: FileCheck2 },
    { label: "Interviews", count: Math.max(cloud.interviews, intelligence.interviewCount), href: "/interview-replay", icon: MessageSquareText },
    { label: "Essay analyses", count: intelligence.essayCount, href: "/essay-tutor", icon: Brain },
    { label: "Application evidence", count: appAreas + evidenceItems.length, href: "/application-profile", icon: ShieldCheck },
    { label: "Reading / supercurricular", count: sourceNotes.length, href: "/reading-room", icon: BookOpen },
    { label: "Human reviews", count: Math.max(cloud.reviews, humanReviews.length), href: "/human-review", icon: UserCheck },
  ]
  const evidenceTotal = evidenceCoverage.reduce((sum, item) => sum + item.count, 0)

  return <section className="space-y-5" aria-label="Application Digital Twin dashboard">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <p className="text-xs font-bold uppercase tracking-[.18em] text-[#147d91]">Application Digital Twin</p>
        <h2 className="mt-1 font-serif text-3xl font-bold">One evidence picture across your preparation</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">This combines practice evidence already stored in ScholarBridge. Scores are preparation signals, not an admissions prediction or an official university judgement.</p>
      </div>
      <Button variant="outline" onClick={() => void refresh()}><RefreshCw />Refresh evidence</Button>
    </div>

    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Card className="shadow-none"><CardHeader className="pb-2"><CardDescription>Evidence points</CardDescription><CardTitle className="text-3xl">{evidenceTotal}</CardTitle></CardHeader><CardContent className="text-xs text-slate-500">papers, interviews, writing and application evidence</CardContent></Card>
      <Card className="shadow-none"><CardHeader className="pb-2"><CardDescription>Preparation signal</CardDescription><CardTitle className="text-3xl">{intelligence.preparationScore || "—"}{intelligence.preparationScore ? "%" : ""}</CardTitle></CardHeader><CardContent className="text-xs text-slate-500">average across areas with saved evidence</CardContent></Card>
      <Card className="shadow-none"><CardHeader className="pb-2"><CardDescription>Strongest current signal</CardDescription><CardTitle className="text-lg">{strongest[0]}</CardTitle></CardHeader><CardContent className="text-xs text-slate-500">{strongest[1]}% · {stateLabel(strongest[1])}</CardContent></Card>
      <Card className="border-amber-200 bg-amber-50 shadow-none"><CardHeader className="pb-2"><CardDescription>Priority to develop</CardDescription><CardTitle className="text-lg">{weakest[0]}</CardTitle></CardHeader><CardContent className="text-xs text-amber-900">{weakest[1]}% · build more fresh evidence here</CardContent></Card>
    </div>

    <div className="grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
      <Card className="shadow-none">
        <CardHeader><div className="flex items-center gap-2"><Activity className="size-5 text-[#147d91]"/><CardTitle className="font-serif text-2xl">Reasoning profile</CardTitle></div><CardDescription>Derived from saved interview, paper, writing and preparation evidence.</CardDescription></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">{dimensions.map(([label, score]) => <div key={label} className="rounded-xl border p-4"><div className="flex items-center justify-between gap-3"><strong className="text-sm">{label}</strong><Badge variant="outline">{score}%</Badge></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-[#147d91]" style={{ width: `${score}%` }}/></div><p className="mt-2 text-xs text-slate-500">{stateLabel(score)}</p></div>)}</CardContent>
      </Card>

      <Card className="border-0 bg-[#102a43] text-white shadow-none">
        <CardHeader><CardDescription className="text-white/60">Next best action</CardDescription><CardTitle className="font-serif text-2xl">{plan.title}</CardTitle><CardDescription className="text-white/65">Targets the weakest current Digital Twin signal.</CardDescription></CardHeader>
        <CardContent><ol className="space-y-2 text-sm leading-6">{plan.steps.map((step, index) => <li key={step}><strong>{index + 1}.</strong> {step}</li>)}</ol><Button asChild className="mt-5 bg-white text-slate-950 hover:bg-slate-100"><Link href={plan.href}>Start focused practice <ArrowRight /></Link></Button></CardContent>
      </Card>
    </div>

    <Card className="shadow-none">
      <CardHeader><CardTitle className="font-serif text-2xl">Evidence coverage</CardTitle><CardDescription>Use this to spot where the Digital Twin is making a judgement from substantial evidence and where it still needs a baseline.</CardDescription></CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{evidenceCoverage.map(item => <Link key={item.label} href={item.href} className="rounded-xl border bg-white p-4 transition hover:border-[#147d91] hover:bg-[#f7fbfb]"><div className="flex items-center justify-between gap-3"><item.icon className="size-5 text-[#147d91]"/><Badge variant="outline">{item.count}</Badge></div><p className="mt-3 font-semibold">{item.label}</p><p className="mt-1 text-xs text-slate-500">Open evidence <ArrowRight className="inline size-3"/></p></Link>)}</CardContent>
    </Card>

    <div className="grid gap-4 md:grid-cols-3">
      <Card className="shadow-none"><CardHeader><CardTitle className="font-serif text-xl">Defend written work</CardTitle><CardDescription>Turn submitted work into a live academic challenge.</CardDescription></CardHeader><CardContent><Button asChild className="w-full"><Link href="/written-work-defence">Open defence simulator <ArrowRight /></Link></Button></CardContent></Card>
      <Card className="shadow-none"><CardHeader><CardTitle className="font-serif text-xl">Replay weak interview moments</CardTitle><CardDescription>Re-answer a specific branch without repeating the whole session.</CardDescription></CardHeader><CardContent><Button asChild variant="outline" className="w-full"><Link href="/interview-replay">Open Replay Lab <ArrowRight /></Link></Button></CardContent></Card>
      <Card className="shadow-none"><CardHeader><CardTitle className="font-serif text-xl">Tutor priority</CardTitle><CardDescription>{intelligence.priority?.label ?? "Build a baseline"}</CardDescription></CardHeader><CardContent><Button asChild variant="outline" className="w-full"><Link href={intelligence.recommendations[0]?.href ?? "/tutor"}>Work on priority <ArrowRight /></Link></Button></CardContent></Card>
    </div>

    {updatedAt ? <p className="text-right text-xs text-slate-400">Digital Twin refreshed {new Date(updatedAt).toLocaleString()}</p> : null}
  </section>
}

"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import { Activity, ArrowLeft, ArrowRight, Brain, FileText, Gauge, MessageSquareText, RefreshCw, ShieldCheck, Target } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/client"
import { APPLICATION_KEY } from "@/lib/personal-tutor"
import { buildApplicationDigitalTwin, type DigitalTwinSummary } from "@/lib/application-digital-twin-dashboard"

type TestResult = { accuracy?: number | null; raw_score?: number | null; max_raw_marks?: number | null; completed_at?: string | null }
type Interview = { overall_feedback?: Record<string, unknown> | null; interview_turns?: Array<{ role?: string; content?: string; feedback?: string | null }> }

function readJson(key: string, fallback: unknown) {
  try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)) }
  catch { return fallback }
}

function scoreTone(score: number) {
  if (score >= 75) return "border-emerald-200 bg-emerald-50 text-emerald-950"
  if (score >= 60) return "border-blue-200 bg-blue-50 text-blue-950"
  if (score >= 45) return "border-amber-200 bg-amber-50 text-amber-950"
  return "border-rose-200 bg-rose-50 text-rose-950"
}

export default function ApplicationDigitalTwinPage() {
  const [summary, setSummary] = useState<DigitalTwinSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [signedIn, setSignedIn] = useState<boolean | null>(null)
  const [notice, setNotice] = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    const application = readJson(APPLICATION_KEY, {}) as Record<string, unknown>
    const profileValues = ["university", "course", "year", "college", "admissionsTests", "writtenWorkRequirement", "subjects", "predictedGrades", "epq", "books", "projects", "competitions", "writtenWork", "interests", "workExperience"]
    const completedFields = profileValues.filter(key => String(application[key] ?? "").trim().length > 0).length
    const essays = readJson("oxbridge-essay-tutor-v1", []) as Array<{ overall?: number; strictScore?: { score?: number } }>
    const essayScores = essays.map(item => item.strictScore?.score ?? item.overall).filter((value): value is number => typeof value === "number" && Number.isFinite(value))

    const supabase = createClient()
    const { data: auth } = await supabase.auth.getUser()
    if (!auth.user) {
      setSignedIn(false)
      setSummary(buildApplicationDigitalTwin({ testResults: [], interviews: [], essayScores, applicationEvidenceCount: 0, applicationFieldsCompleted: completedFields, applicationFieldsTotal: profileValues.length }))
      setNotice("Sign in to add cloud-synced papers and interview transcripts to the Digital Twin. Local application and essay evidence is shown below.")
      setLoading(false)
      return
    }

    setSignedIn(true)
    const [testsResponse, interviewsResponse, evidenceResponse] = await Promise.all([
      supabase.from("test_results").select("accuracy,raw_score,max_raw_marks,completed_at").eq("user_id", auth.user.id).order("completed_at", { ascending: false }).limit(30),
      supabase.from("interview_sessions").select("overall_feedback,interview_turns(role,content,feedback)").eq("user_id", auth.user.id).order("created_at", { ascending: false }).limit(20),
      supabase.from("application_evidence").select("id").eq("user_id", auth.user.id).limit(100),
    ])

    const errors = [testsResponse.error, interviewsResponse.error, evidenceResponse.error].filter(Boolean)
    setNotice(errors.length ? "Some cloud evidence could not be loaded, so the readiness estimate is using the evidence that is currently available." : "")
    setSummary(buildApplicationDigitalTwin({
      testResults: (testsResponse.data ?? []) as TestResult[],
      interviews: (interviewsResponse.data ?? []) as Interview[],
      essayScores,
      applicationEvidenceCount: evidenceResponse.data?.length ?? 0,
      applicationFieldsCompleted: completedFields,
      applicationFieldsTotal: profileValues.length,
    }))
    setLoading(false)
  }, [])

  useEffect(() => { void load() }, [load])

  const sorted = useMemo(() => summary ? [...summary.dimensions].sort((a, b) => a.score - b.score) : [], [summary])

  return <main className="min-h-screen bg-[#f4f7f7] text-[#172b3a]">
    <header className="border-b bg-white"><div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4 sm:px-6"><Button asChild variant="ghost"><Link href="/tutor"><ArrowLeft />Tutor</Link></Button><Badge variant="outline"><Gauge className="size-3.5" />Application Digital Twin</Badge></div></header>
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6">
      <section className="grid gap-5 lg:grid-cols-[1fr_360px] lg:items-stretch">
        <div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#147d91]">One applicant model, built from real practice</p><h1 className="mt-2 font-serif text-4xl font-bold">See what your preparation evidence actually says about readiness.</h1><p className="mt-3 max-w-3xl leading-7 text-slate-600">The Digital Twin combines completed papers, interview transcripts, essay-analysis scores and application evidence. It is a preparation model, not an admissions prediction or an official Oxford/Cambridge judgement.</p></div>
        <Card className="border-0 bg-[#102a43] text-white"><CardHeader><CardDescription className="text-white/60">Current preparation readiness</CardDescription><CardTitle className="font-serif text-6xl">{loading ? "—" : `${summary?.readiness ?? 0}`}</CardTitle><CardDescription className="text-white/60">/100 · evidence confidence {summary?.confidence ?? "low"}</CardDescription></CardHeader><CardContent><p className="text-sm text-white/75">{summary ? `${summary.evidenceItems} evidence item${summary.evidenceItems === 1 ? "" : "s"} across ${summary.completedActivities} scored practice activit${summary.completedActivities === 1 ? "y" : "ies"}.` : "Loading evidence…"}</p></CardContent></Card>
      </section>

      {notice ? <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">{notice}</div> : null}

      {summary ? <>
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {summary.dimensions.map(item => <Card key={item.key} className={`shadow-none ${scoreTone(item.score)}`}><CardHeader><div className="flex items-start justify-between gap-3"><div><CardTitle className="text-lg">{item.label}</CardTitle><CardDescription className="mt-1 text-current/70">Evidence confidence: {item.confidence}</CardDescription></div><span className="text-4xl font-black">{item.score}</span></div></CardHeader><CardContent><p className="text-sm font-semibold">{item.evidence}</p><p className="mt-3 text-sm leading-6 opacity-90">{item.nextAction}</p><Button asChild variant="outline" className="mt-4 bg-white/70"><Link href={item.href}>Work on this <ArrowRight /></Link></Button></CardContent></Card>)}
        </section>

        <section className="grid gap-5 lg:grid-cols-2">
          <Card><CardHeader><div className="flex items-center gap-2"><Target className="size-5 text-[#147d91]" /><CardTitle className="font-serif text-2xl">Highest-priority next move</CardTitle></div></CardHeader><CardContent><p className="text-xl font-bold">{summary.priority.label} · {summary.priority.score}/100</p><p className="mt-2 text-sm leading-6 text-slate-600">{summary.priority.nextAction}</p><Button asChild className="mt-4"><Link href={summary.priority.href}>Start targeted work <ArrowRight /></Link></Button></CardContent></Card>
          <Card><CardHeader><div className="flex items-center gap-2"><Activity className="size-5 text-emerald-700" /><CardTitle className="font-serif text-2xl">Strongest current evidence</CardTitle></div></CardHeader><CardContent><p className="text-xl font-bold">{summary.strongest.label} · {summary.strongest.score}/100</p><p className="mt-2 text-sm leading-6 text-slate-600">{summary.strongest.evidence}</p><p className="mt-3 text-sm text-slate-500">Keep this strength active while working on weaker areas; the aim is balanced readiness rather than maximising one isolated score.</p></CardContent></Card>
        </section>

        <Card><CardHeader><CardTitle className="font-serif text-2xl">Evidence ladder</CardTitle><CardDescription>Weakest first. Low-confidence dimensions should be treated as “not enough evidence yet”, not as proof of low ability.</CardDescription></CardHeader><CardContent className="space-y-3">{sorted.map(item => <div key={item.key} className="grid gap-2 rounded-xl border bg-white p-4 md:grid-cols-[220px_1fr_auto] md:items-center"><div><p className="font-semibold">{item.label}</p><p className="text-xs text-slate-500">{item.confidence} confidence</p></div><div className="h-2.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-[#147d91]" style={{ width: `${item.score}%` }} /></div><strong>{item.score}/100</strong></div>)}</CardContent></Card>
      </> : <Card><CardContent className="p-8 text-center text-slate-500">Building your Digital Twin from saved preparation evidence…</CardContent></Card>}

      <section className="grid gap-4 md:grid-cols-3">
        <Button asChild variant="outline" className="h-auto justify-start p-4"><Link href="/application-profile"><FileText className="size-5" /><span className="ml-2 text-left"><strong className="block">Edit application evidence</strong><small className="font-normal text-slate-500">Course, reading, projects and written work</small></span></Link></Button>
        <Button asChild variant="outline" className="h-auto justify-start p-4"><Link href="/written-work-defence"><Brain className="size-5" /><span className="ml-2 text-left"><strong className="block">Defend written work</strong><small className="font-normal text-slate-500">Challenge the claims you submitted</small></span></Link></Button>
        <Button asChild variant="outline" className="h-auto justify-start p-4"><Link href="/interview-replay"><MessageSquareText className="size-5" /><span className="ml-2 text-left"><strong className="block">Replay interview moments</strong><small className="font-normal text-slate-500">Retry weak reasoning branches</small></span></Link></Button>
      </section>

      <div className="flex flex-wrap gap-2"><Button onClick={() => void load()} disabled={loading}><RefreshCw className={loading ? "animate-spin" : ""} />Refresh evidence</Button>{signedIn === false ? <Button asChild variant="outline"><Link href="/login"><ShieldCheck />Sign in for cloud evidence</Link></Button> : null}</div>
    </div>
  </main>
}

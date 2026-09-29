"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import { Activity, ArrowRight, RefreshCw, Target } from "lucide-react"
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

function tone(score: number) {
  if (score >= 75) return "border-emerald-200 bg-emerald-50"
  if (score >= 60) return "border-blue-200 bg-blue-50"
  if (score >= 45) return "border-amber-200 bg-amber-50"
  return "border-rose-200 bg-rose-50"
}

export function CloudReadinessSummary() {
  const [summary, setSummary] = useState<DigitalTwinSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState("")

  const refresh = useCallback(async () => {
    setLoading(true)
    const application = readJson(APPLICATION_KEY, {}) as Record<string, unknown>
    const profileKeys = ["university", "course", "year", "college", "admissionsTests", "writtenWorkRequirement", "subjects", "predictedGrades", "epq", "books", "projects", "competitions", "writtenWork", "interests", "workExperience"]
    const completedFields = profileKeys.filter(key => String(application[key] ?? "").trim().length > 0).length
    const essays = readJson("oxbridge-essay-tutor-v1", []) as Array<{ overall?: number; strictScore?: { score?: number } }>
    const essayScores = essays.map(item => item.strictScore?.score ?? item.overall).filter((value): value is number => typeof value === "number" && Number.isFinite(value))

    try {
      const supabase = createClient()
      const { data: auth } = await supabase.auth.getUser()
      if (!auth.user) {
        setSummary(buildApplicationDigitalTwin({ testResults: [], interviews: [], essayScores, applicationEvidenceCount: 0, applicationFieldsCompleted: completedFields, applicationFieldsTotal: profileKeys.length }))
        setNotice("Sign in to add cloud-synced paper and interview performance to this readiness layer.")
        setLoading(false)
        return
      }
      const [testsResponse, interviewsResponse, evidenceResponse] = await Promise.all([
        supabase.from("test_results").select("accuracy,raw_score,max_raw_marks,completed_at").eq("user_id", auth.user.id).order("completed_at", { ascending: false }).limit(30),
        supabase.from("interview_sessions").select("overall_feedback,interview_turns(role,content,feedback)").eq("user_id", auth.user.id).order("created_at", { ascending: false }).limit(20),
        supabase.from("application_evidence").select("id").eq("user_id", auth.user.id).limit(100),
      ])
      const errors = [testsResponse.error, interviewsResponse.error, evidenceResponse.error].filter(Boolean)
      setNotice(errors.length ? "Some cloud evidence could not be loaded, so this layer is using the evidence currently available." : "")
      setSummary(buildApplicationDigitalTwin({
        testResults: (testsResponse.data ?? []) as TestResult[],
        interviews: (interviewsResponse.data ?? []) as Interview[],
        essayScores,
        applicationEvidenceCount: evidenceResponse.data?.length ?? 0,
        applicationFieldsCompleted: completedFields,
        applicationFieldsTotal: profileKeys.length,
      }))
    } catch {
      setSummary(buildApplicationDigitalTwin({ testResults: [], interviews: [], essayScores, applicationEvidenceCount: 0, applicationFieldsCompleted: completedFields, applicationFieldsTotal: profileKeys.length }))
      setNotice("Cloud evidence could not be loaded on this attempt; local writing/application evidence is still included.")
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { void refresh() }, [refresh])
  const weakestFirst = useMemo(() => summary ? [...summary.dimensions].sort((a, b) => a.score - b.score) : [], [summary])

  return <section className="space-y-4" aria-label="Digital Twin live readiness layer">
    <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#147d91]">Live evidence layer</p><h2 className="mt-1 font-serif text-3xl font-bold">What the scored evidence says right now</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">Uses actual paper accuracy, saved interview evidence, essay marks and application completion. Low-confidence scores mean “not enough evidence yet”, not low ability.</p></div><Button variant="outline" onClick={() => void refresh()} disabled={loading}><RefreshCw className={loading ? "animate-spin" : ""}/>Refresh</Button></div>
    {notice ? <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">{notice}</div> : null}
    {summary ? <>
      <div className="grid gap-4 md:grid-cols-[260px_1fr]">
        <Card className="border-0 bg-[#102a43] text-white shadow-none"><CardHeader><CardDescription className="text-white/60">Evidence-weighted readiness</CardDescription><CardTitle className="font-serif text-6xl">{summary.readiness}</CardTitle><CardDescription className="text-white/60">/100 · {summary.confidence} evidence confidence</CardDescription></CardHeader><CardContent className="text-sm text-white/70">{summary.evidenceItems} evidence item{summary.evidenceItems === 1 ? "" : "s"} · {summary.completedActivities} scored activit{summary.completedActivities === 1 ? "y" : "ies"}</CardContent></Card>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{summary.dimensions.map(item => <Card key={item.key} className={`shadow-none ${tone(item.score)}`}><CardHeader className="pb-2"><div className="flex items-start justify-between gap-3"><CardTitle className="text-base">{item.label}</CardTitle><span className="text-3xl font-black">{item.score}</span></div><CardDescription>{item.confidence} confidence</CardDescription></CardHeader><CardContent><p className="text-xs font-semibold text-slate-700">{item.evidence}</p></CardContent></Card>)}</div>
      </div>
      <div className="grid gap-4 lg:grid-cols-2"><Card className="border-amber-200 bg-amber-50 shadow-none"><CardHeader><div className="flex items-center gap-2"><Target className="size-5 text-amber-800"/><CardTitle className="font-serif text-xl">Priority: {summary.priority.label}</CardTitle></div><CardDescription>{summary.priority.score}/100 · {summary.priority.confidence} confidence</CardDescription></CardHeader><CardContent><p className="text-sm leading-6 text-amber-950">{summary.priority.nextAction}</p><Button asChild className="mt-3"><Link href={summary.priority.href}>Work on this <ArrowRight/></Link></Button></CardContent></Card><Card className="border-emerald-200 bg-emerald-50 shadow-none"><CardHeader><div className="flex items-center gap-2"><Activity className="size-5 text-emerald-700"/><CardTitle className="font-serif text-xl">Strongest: {summary.strongest.label}</CardTitle></div><CardDescription>{summary.strongest.score}/100 · {summary.strongest.confidence} confidence</CardDescription></CardHeader><CardContent><p className="text-sm leading-6 text-emerald-950">{summary.strongest.evidence}</p></CardContent></Card></div>
      <Card className="shadow-none"><CardHeader><CardTitle className="font-serif text-xl">Evidence ladder</CardTitle></CardHeader><CardContent className="space-y-3">{weakestFirst.map(item => <div key={item.key} className="grid gap-2 md:grid-cols-[210px_1fr_auto] md:items-center"><div><p className="text-sm font-semibold">{item.label}</p><p className="text-xs text-slate-500">{item.confidence} confidence</p></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-[#147d91]" style={{ width: `${item.score}%` }}/></div><Badge variant="outline">{item.score}</Badge></div>)}</CardContent></Card>
    </> : <Card><CardContent className="p-8 text-center text-sm text-slate-500">Building the live evidence layer…</CardContent></Card>}
  </section>
}

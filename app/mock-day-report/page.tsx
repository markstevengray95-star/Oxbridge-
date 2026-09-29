"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { ArrowLeft, ArrowRight, CheckCircle2, Clock3, FileText, RefreshCw, Save, Target } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import { MOCK_DAY_KEY, PROFILE_KEY, PROGRESS_KEY, buildStudentIntelligence } from "@/lib/personal-tutor"

type MockState = { completed?: string[]; startedAt?: string; writtenResponse?: string; packId?: string; reflection?: string }
type Context = { course?: string; pack?: { id?: string; title?: string; interviewFocus?: string; writtenTask?: string }; startedAt?: string; writtenResponse?: string }

function read<T>(key: string, fallback: T): T {
  try { return JSON.parse(localStorage.getItem(key) || "") as T } catch { return fallback }
}

function words(text?: string) { return text?.trim() ? text.trim().split(/\s+/).length : 0 }

function evidenceMarkers(text: string) {
  const lower = text.toLowerCase()
  return [
    { label: "Evidence language", present: /evidence|data|observation|source|measure/.test(lower) },
    { label: "Alternative explanation", present: /however|alternative|another possibility|could instead|on the other hand/.test(lower) },
    { label: "Conditional reasoning", present: /\bif\b|provided that|assuming|unless/.test(lower) },
    { label: "Revision trigger", present: /would change|would revise|would weaken|would support|would test/.test(lower) },
  ]
}

export default function MockDayReportPage() {
  const [state, setState] = useState<MockState>({ completed: [] })
  const [context, setContext] = useState<Context>({})
  const [profile, setProfile] = useState<Record<string, unknown>>({})
  const [progressData, setProgressData] = useState<Record<string, unknown>>({})
  const [reflection, setReflection] = useState("")
  const [saved, setSaved] = useState(false)
  const [loaded, setLoaded] = useState(false)

  function refresh() {
    const nextState = read<MockState>(MOCK_DAY_KEY, { completed: [] })
    const nextContext = read<Context>("oxbridge-mock-day-context-v1", {})
    const nextProfile = read<Record<string, unknown>>(PROFILE_KEY, {})
    const nextProgress = read<Record<string, unknown>>(PROGRESS_KEY, {})
    setState(nextState); setContext(nextContext); setProfile(nextProfile); setProgressData(nextProgress); setReflection(nextState.reflection || ""); setSaved(false); setLoaded(true)
  }

  useEffect(() => refresh(), [])
  const intelligence = useMemo(() => buildStudentIntelligence(profile, progressData), [profile, progressData])
  const completed = state.completed ?? []
  const completion = Math.min(100, Math.round(completed.length / 5 * 100))
  const written = state.writtenResponse || context.writtenResponse || ""
  const markers = evidenceMarkers(written)
  const markerCount = markers.filter(item => item.present).length
  const elapsedMinutes = state.startedAt ? Math.max(0, Math.round((Date.now() - new Date(state.startedAt).getTime()) / 60000)) : null
  const course = context.course || String(intelligence.profile.course || profile.course || "your subject")
  const priority = intelligence.skills.filter(item => item.domain === "Interview" && item.evidenceCount > 0).sort((a, b) => a.score - b.score)[0]

  function saveReflection(value: string) {
    setReflection(value); setSaved(false)
    const next = { ...state, reflection: value }
    setState(next); localStorage.setItem(MOCK_DAY_KEY, JSON.stringify(next))
  }

  function saveEvidence() {
    if (!state.startedAt) return
    const record = {
      id: `mock-day-${Date.now()}`,
      date: new Date().toISOString(),
      course,
      packId: state.packId || context.pack?.id || "unknown",
      packTitle: context.pack?.title || "Mock admissions day",
      completedStages: completed,
      completion,
      elapsedMinutes,
      writtenWords: words(written),
      reasoningMarkers: markers,
      adaptiveFocus: priority?.label || null,
      reflection: reflection.trim(),
    }
    const progress = read<Record<string, unknown>>(PROGRESS_KEY, {})
    const previous = Array.isArray(progress.mockAdmissionsDays) ? progress.mockAdmissionsDays as unknown[] : []
    localStorage.setItem(PROGRESS_KEY, JSON.stringify({ ...progress, mockAdmissionsDays: [record, ...previous].slice(0, 20) }))
    setProgressData({ ...progress, mockAdmissionsDays: [record, ...previous].slice(0, 20) })
    setSaved(true)
  }

  return <main className="min-h-screen bg-[#f5f7f7] text-[#172b3a]">
    <header className="border-b bg-white"><div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4"><Button asChild variant="ghost"><Link href="/mock-day"><ArrowLeft/>Mock Admissions Day</Link></Button><Badge variant="outline"><FileText className="size-3.5"/>End-of-day Report</Badge></div></header>
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <section className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#147d91]">Saved admissions-day evidence</p><h1 className="mt-2 font-serif text-4xl font-bold">Turn the mock day into evidence for the next one.</h1><p className="mt-3 max-w-3xl text-slate-600">This report records what was actually completed and the reasoning visible in the written task. It does not predict an admissions outcome.</p></div><Button variant="outline" onClick={refresh}><RefreshCw/>Refresh</Button></section>

      {!loaded ? <Card><CardContent className="p-8 text-center text-slate-500">Loading mock-day evidence…</CardContent></Card> : !state.startedAt ? <Card><CardHeader><CardTitle>No active mock day found</CardTitle><CardDescription>Start a Mock Admissions Day first, then return here for the evidence report.</CardDescription></CardHeader><CardContent><Button asChild><Link href="/mock-day">Start mock day</Link></Button></CardContent></Card> : <>
        <section className="grid gap-4 md:grid-cols-4"><Card className="border-0 bg-[#102a43] text-white shadow-none"><CardHeader><CardDescription className="text-white/60">Stages complete</CardDescription><CardTitle className="font-serif text-4xl">{completed.length}/5</CardTitle></CardHeader><CardContent><Progress value={completion}/></CardContent></Card><Card className="shadow-none"><CardHeader><CardDescription>Written reasoning</CardDescription><CardTitle className="font-serif text-4xl">{words(written)}</CardTitle></CardHeader><CardContent className="text-xs text-slate-500">words recorded before interview</CardContent></Card><Card className="shadow-none"><CardHeader><CardDescription>Reasoning markers</CardDescription><CardTitle className="font-serif text-4xl">{markerCount}/4</CardTitle></CardHeader><CardContent className="text-xs text-slate-500">evidence visible in the written response</CardContent></Card><Card className="shadow-none"><CardHeader><CardDescription>Elapsed session time</CardDescription><CardTitle className="font-serif text-3xl">{elapsedMinutes === null ? "—" : `${elapsedMinutes}m`}</CardTitle></CardHeader><CardContent className="text-xs text-slate-500">wall-clock time since the day started</CardContent></Card></section>

        <div className="grid gap-5 lg:grid-cols-[1fr_.8fr]"><Card className="shadow-none"><CardHeader><CardTitle className="font-serif text-2xl">Reasoning evidence from the written task</CardTitle><CardDescription>{context.pack?.title || "Mock-day briefing"} · {course}</CardDescription></CardHeader><CardContent className="grid gap-3 sm:grid-cols-2">{markers.map(item => <div key={item.label} className={`rounded-xl border p-4 ${item.present ? "border-emerald-200 bg-emerald-50" : "bg-white"}`}><div className="flex items-center justify-between gap-2"><strong className="text-sm">{item.label}</strong>{item.present ? <CheckCircle2 className="size-4 text-emerald-700"/> : <Badge variant="outline">Not visible yet</Badge>}</div></div>)}</CardContent></Card><Card className="border-[#cfe1e4] bg-[#edf7f8] shadow-none"><CardHeader><Target className="size-5 text-[#147d91]"/><CardTitle className="font-serif text-2xl">Next interview repair</CardTitle><CardDescription>{priority ? `${priority.label} is currently the weakest evidenced interview skill at ${priority.score}%.` : "Complete more saved interviews to create a stronger adaptive target."}</CardDescription></CardHeader><CardContent className="flex flex-wrap gap-2"><Button asChild><Link href="/interview-replay">Replay a weak branch <ArrowRight/></Link></Button><Button asChild variant="outline"><Link href="/digital-twin">Open Digital Twin</Link></Button></CardContent></Card></div>

        <Card className="shadow-none"><CardHeader><CardTitle className="font-serif text-2xl">End-of-day reflection</CardTitle><CardDescription>Record what changed after challenge, not whether the day merely felt easy or hard.</CardDescription></CardHeader><CardContent className="space-y-3"><Textarea rows={6} value={reflection} onChange={event => saveReflection(event.target.value)} placeholder="Which assumption changed? Where did you recover? What would you do differently in the next interview?"/><div className="flex flex-wrap gap-2"><Button onClick={saveEvidence}><Save/>{saved ? "Evidence saved" : "Save mock-day evidence"}</Button><Button asChild variant="outline"><Link href="/mistake-intelligence">Compare recurring mistakes <ArrowRight/></Link></Button></div>{saved ? <p className="text-sm text-emerald-700"><CheckCircle2 className="mr-1 inline size-4"/>This mock day is now stored in your preparation history on this device.</p> : null}</CardContent></Card>
      </>}
    </div>
  </main>
}

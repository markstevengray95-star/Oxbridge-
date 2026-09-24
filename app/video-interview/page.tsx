"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { ArrowLeft, ArrowRight, Camera, History, ShieldCheck, Sparkles, TrendingUp } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { PROGRESS_KEY } from "@/lib/personal-tutor"
import { compareVideoTrendSessions, extractVideoTrendSessions, VIDEO_TREND_METRICS, videoMetricLabel, type VideoTrendMetricKey } from "@/lib/video-trends"

function readProgress() {
  try { return JSON.parse(localStorage.getItem(PROGRESS_KEY) || "{}") as unknown } catch { return {} }
}

function pct(value: number) {
  return Math.round(Math.max(0, Math.min(1, value)) * 100)
}

function deltaPoints(value: number) {
  const points = Math.round(value * 100)
  return `${points > 0 ? "+" : ""}${points} pp`
}

function shortDate(value: string) {
  return new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "2-digit" })
}

export default function VideoInterviewPage() {
  const [progress, setProgress] = useState<unknown>({})
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const refresh = () => setProgress(readProgress())
    refresh()
    const timer = window.setTimeout(refresh, 2800)
    const onFocus = () => refresh()
    window.addEventListener("focus", onFocus)
    setLoaded(true)
    return () => { window.clearTimeout(timer); window.removeEventListener("focus", onFocus) }
  }, [])

  const sessions = useMemo(() => extractVideoTrendSessions(progress), [progress])
  const comparison = useMemo(() => compareVideoTrendSessions(sessions), [sessions])
  const movement = useMemo(() => {
    if (!comparison.latest || !comparison.previous) return { more: null as VideoTrendMetricKey | null, less: null as VideoTrendMetricKey | null }
    const entries = VIDEO_TREND_METRICS.map(key => [key, comparison.deltas[key]] as const)
    const more = [...entries].sort((a, b) => b[1] - a[1])[0]
    const less = [...entries].sort((a, b) => a[1] - b[1])[0]
    return {
      more: more[1] >= 0.02 ? more[0] : null,
      less: less[1] <= -0.02 ? less[0] : null,
    }
  }, [comparison])

  if (!loaded) return null

  return <main className="min-h-screen bg-[#f4f7f7] text-[#172b3a]">
    <header className="border-b bg-white"><div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4 sm:px-6"><Button asChild variant="ghost"><Link href="/interview-academy"><ArrowLeft/>Interview Academy</Link></Button><Badge><Camera className="size-3.5"/>Pro video trends</Badge></div></header>
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6">
      <section className="grid gap-5 lg:grid-cols-[1.15fr_.85fr] lg:items-start">
        <div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#147d91]">Advanced video interview coach</p><h1 className="mt-2 font-serif text-4xl font-bold">Compare your presentation setup with your own previous sessions.</h1><p className="mt-3 max-w-3xl leading-7 text-slate-600">This dashboard tracks only observable technical presentation signals such as framing stability, camera-facing consistency and whether you stay within the detectable frame. It compares you only with your own past sessions, never with other applicants.</p></div>
        <Card className="border-[#b9d8dd] bg-[#edf7f8] shadow-none"><CardHeader><ShieldCheck className="size-6 text-[#147d91]"/><CardTitle className="font-serif text-xl">Presentation data, not personality scoring</CardTitle></CardHeader><CardContent><p className="text-sm leading-6 text-slate-700">The coach does not infer emotion, personality, honesty, intelligence, anxiety, attention, health or admissions likelihood. It does not judge appearance or body traits. Camera and lighting differences can also change these estimates.</p></CardContent></Card>
      </section>

      {!sessions.length ? <Card className="border-dashed"><CardHeader><Camera className="size-7 text-[#147d91]"/><CardTitle className="font-serif text-2xl">No saved video sessions yet</CardTitle><CardDescription>Complete a panel interview in Video mode. The on-device coach will save technical presentation metrics with the interview result and this page will build your personal trend history.</CardDescription></CardHeader><CardContent><Button asChild><Link href="/panel-interview">Start a video panel <ArrowRight/></Link></Button></CardContent></Card> : <>
        <section className="grid gap-4 md:grid-cols-3"><Card className="border-0 bg-[#102a43] text-white"><CardHeader><CardDescription className="text-white/60">Video sessions recorded</CardDescription><CardTitle className="font-serif text-4xl">{sessions.length}</CardTitle></CardHeader><CardContent><p className="text-sm text-white/70">Latest: {shortDate(sessions[0].date)}</p></CardContent></Card><Card><CardHeader><CardDescription>Comparison</CardDescription><CardTitle className="font-serif text-2xl">{sessions.length >= 2 ? "Latest vs previous" : "Baseline saved"}</CardTitle></CardHeader><CardContent><p className="text-sm text-slate-600">{sessions.length >= 2 ? "Changes are shown in percentage points, not grades." : "Complete one more video interview to unlock session-to-session change."}</p></CardContent></Card><Card><CardHeader><CardDescription>Longer view</CardDescription><CardTitle className="font-serif text-2xl">Up to 5 sessions</CardTitle></CardHeader><CardContent><p className="text-sm text-slate-600">Rolling averages reduce the effect of one unusual camera setup or session.</p></CardContent></Card></section>

        <Card><CardHeader><div className="flex flex-wrap items-center justify-between gap-3"><div><CardTitle className="flex items-center gap-2 font-serif text-2xl"><TrendingUp className="size-5 text-[#147d91]"/>Session-to-session presentation trends</CardTitle><CardDescription>Latest session compared with your previous session and your own recent rolling average.</CardDescription></div><Button asChild variant="outline"><Link href="/panel-interview"><Camera/>New video session</Link></Button></div></CardHeader><CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{VIDEO_TREND_METRICS.map(key => {const latest = comparison.latest?.metrics[key] ?? 0; const delta = comparison.deltas[key]; const average = comparison.rollingAverage[key]; return <div key={key} className="rounded-2xl border bg-white p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold">{videoMetricLabel(key)}</p><p className="mt-1 text-3xl font-bold">{pct(latest)}%</p></div>{comparison.previous && <Badge variant="outline">{deltaPoints(delta)}</Badge>}</div><Progress className="mt-3" value={pct(latest)}/><div className="mt-3 flex justify-between text-xs text-slate-500"><span>Latest sample</span><span>Recent avg {pct(average)}%</span></div></div>})}</CardContent></Card>

        <section className="grid gap-4 lg:grid-cols-2"><Card><CardHeader><Sparkles className="size-5 text-[#147d91]"/><CardTitle className="font-serif text-2xl">What changed in the latest sample?</CardTitle><CardDescription>Neutral technical observations only.</CardDescription></CardHeader><CardContent className="space-y-3">{comparison.previous ? <>{movement.more ? <div className="rounded-xl bg-emerald-50 p-3 text-sm leading-6 text-emerald-950"><strong>{videoMetricLabel(movement.more)}</strong> was more consistent than in your previous recorded session ({deltaPoints(comparison.deltas[movement.more])}).</div> : <div className="rounded-xl bg-slate-50 p-3 text-sm leading-6">No technical presentation metric increased by more than 2 percentage points in this sample.</div>}{movement.less ? <div className="rounded-xl bg-amber-50 p-3 text-sm leading-6 text-amber-950"><strong>{videoMetricLabel(movement.less)}</strong> was less consistent in this sample ({deltaPoints(comparison.deltas[movement.less])}). Device position, lighting and normal session variation can affect this, so treat it as a setup cue rather than a personal score.</div> : <div className="rounded-xl bg-slate-50 p-3 text-sm leading-6">No technical presentation metric decreased by more than 2 percentage points in this sample.</div>}</> : <p className="text-sm leading-6 text-slate-600">This first session is your personal baseline. A second saved video session will enable change analysis.</p>}<p className="text-xs leading-5 text-slate-500">The aim is simply to make the video call easy to follow. Academic reasoning remains the important preparation evidence.</p></CardContent></Card>

          <Card><CardHeader><History className="size-5 text-[#147d91]"/><CardTitle className="font-serif text-2xl">Recent session history</CardTitle></CardHeader><CardContent className="space-y-3">{sessions.slice(0, 8).map((session, index) => <div key={session.id} className="rounded-xl border bg-white p-3"><div className="flex flex-wrap items-center justify-between gap-2"><div><strong className="text-sm">{index === 0 ? "Latest · " : ""}{shortDate(session.date)}</strong><p className="mt-1 max-w-xl truncate text-xs text-slate-500">{session.title}</p></div><Badge variant="outline">{session.samples} samples</Badge></div><div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs"><div className="rounded-lg bg-slate-50 p-2"><strong>{pct(session.metrics.gazeConsistency)}%</strong><span className="block text-[10px] text-slate-500">gaze consistency</span></div><div className="rounded-lg bg-slate-50 p-2"><strong>{pct(session.metrics.framingStability)}%</strong><span className="block text-[10px] text-slate-500">framing stability</span></div><div className="rounded-lg bg-slate-50 p-2"><strong>{pct(session.metrics.cameraReady)}%</strong><span className="block text-[10px] text-slate-500">camera readiness</span></div></div></div>)}</CardContent></Card></section>
      </>}

      <Card className="border-[#8dd7de] bg-[#f4fbfb]"><CardHeader><CardTitle className="font-serif text-xl">Connect presentation practice to academic interview evidence</CardTitle><CardDescription>Use the technical trends to remove distractions, then use the Interview Profile for reasoning, adaptability, precision and recovery evidence.</CardDescription></CardHeader><CardContent className="flex flex-wrap gap-2"><Button asChild><Link href="/panel-interview">Run video panel <ArrowRight/></Link></Button><Button asChild variant="outline"><Link href="/interview-profile">Open reasoning profile</Link></Button></CardContent></Card>
    </div>
  </main>
}

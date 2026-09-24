"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { ArrowLeft, Brain, CalendarClock, Gauge, RotateCcw, TrendingUp } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { LIVE_REPLAY_KEY, ORAL_RETEST_KEY, type OralRetest, type ReasoningReplay } from "@/lib/nextgen-prep"

function readReplays() {
  try {
    const value = JSON.parse(localStorage.getItem(LIVE_REPLAY_KEY) || "[]")
    return Array.isArray(value) ? value as ReasoningReplay[] : []
  } catch { return [] }
}

function branchLabel(value?: string) {
  if (value === "challenge") return "Challenge"
  if (value === "repair") return "Repair"
  if (value === "transfer") return "Changed condition"
  if (value === "clarify") return "Clarification"
  return "Deepen"
}

export default function ReasoningReplayPage() {
  const [replays, setReplays] = useState<ReasoningReplay[]>([])
  const [activeId, setActiveId] = useState("")
  useEffect(() => { const loaded = readReplays(); setReplays(loaded); setActiveId(loaded[0]?.id ?? "") }, [])
  const active = useMemo(() => replays.find(item => item.id === activeId) ?? replays[0], [replays, activeId])

  function scheduleRetest() {
    if (!active) return
    let old: OralRetest[] = []
    try { const raw = JSON.parse(localStorage.getItem(ORAL_RETEST_KEY) || "[]"); if (Array.isArray(raw)) old = raw } catch {}
    const next: OralRetest = { id: `oral-${active.id}`, course: active.course, focus: active.focus, sourceReplayId: active.id, dueAt: active.nextOralRetestAt }
    localStorage.setItem(ORAL_RETEST_KEY, JSON.stringify([next, ...old.filter(item => item.sourceReplayId !== active.id)].slice(0, 30)))
  }

  return <main className="min-h-screen bg-[#f4f7f7] text-[#172b3a]">
    <header className="border-b bg-white"><div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4"><Button asChild variant="ghost"><Link href="/tutor"><ArrowLeft />Personal Tutor</Link></Button><Badge variant="outline"><Brain className="size-3.5" />Reasoning Replay</Badge></div></header>
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8">
      <section><p className="text-xs font-bold uppercase tracking-[.18em] text-[#147d91]">Interview learning evidence</p><h1 className="mt-2 font-serif text-4xl font-bold">See how your reasoning changed, not just how you scored.</h1><p className="mt-3 max-w-3xl text-slate-600">Replay the path from first claim to challenge, revision and final position. Confidence is compared with the feedback attached to each answer so you can spot both overconfidence and unnecessary self-doubt.</p></section>
      {!active ? <Card className="shadow-none"><CardHeader><CardTitle>No live replay yet</CardTitle><CardDescription>Complete a Gemini Live interview with the upgraded interview lab. Your transcript, confidence estimates and branch path will appear here.</CardDescription></CardHeader><CardContent><Button asChild><Link href="/gemini-live-interview">Start live interview</Link></Button></CardContent></Card> : <>
        <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
          <Card className="shadow-none"><CardHeader><CardTitle className="font-serif text-xl">Saved interviews</CardTitle></CardHeader><CardContent className="space-y-2">{replays.map(item => <button key={item.id} onClick={() => setActiveId(item.id)} className={`w-full rounded-xl border p-3 text-left ${item.id === active.id ? "border-[#147d91] bg-cyan-50" : "bg-white"}`}><p className="font-semibold">{item.course}</p><p className="mt-1 text-xs text-slate-500">{new Date(item.date).toLocaleString("en-GB")}</p></button>)}</CardContent></Card>
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-3"><Card className="shadow-none"><CardContent className="p-5"><Gauge className="size-5 text-[#147d91]" /><p className="mt-3 text-3xl font-bold">{active.calibration.averageConfidence ?? "—"}{active.calibration.averageConfidence !== null ? "%" : ""}</p><p className="text-xs text-slate-500">average confidence</p></CardContent></Card><Card className="shadow-none"><CardContent className="p-5"><TrendingUp className="size-5 text-[#147d91]" /><p className="mt-3 text-3xl font-bold">{active.calibration.lowConfidenceStrongAnswers}</p><p className="text-xs text-slate-500">strong answers with low confidence</p></CardContent></Card><Card className="shadow-none"><CardContent className="p-5"><Brain className="size-5 text-[#147d91]" /><p className="mt-3 text-3xl font-bold">{active.calibration.highConfidenceWeakAnswers}</p><p className="text-xs text-slate-500">high-confidence answers with gaps</p></CardContent></Card></div>
            <Card className="shadow-none"><CardHeader><CardTitle className="font-serif text-2xl">Reasoning timeline</CardTitle><CardDescription>{active.calibration.note}</CardDescription></CardHeader><CardContent className="space-y-3">{active.turns.filter(turn => turn.role !== "system").map((turn, index) => <div key={turn.id} className={`rounded-2xl border p-4 ${turn.role === "candidate" ? "bg-white" : "bg-slate-50"}`}><div className="flex flex-wrap items-center gap-2"><Badge variant={turn.role === "candidate" ? "default" : "outline"}>{turn.role === "candidate" ? "You" : `Interviewer ${turn.interviewer ?? ""}`.trim()}</Badge>{turn.role === "interviewer" && <Badge variant="outline">{branchLabel(turn.branchType)}</Badge>}{typeof turn.confidence === "number" && <Badge variant="outline">Confidence {turn.confidence}%</Badge>}</div><p className="mt-3 whitespace-pre-wrap text-sm leading-6">{turn.text}</p>{turn.feedback && <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm leading-6 text-amber-950"><strong>Feedback:</strong> {turn.feedback}</p>}{turn.workingSummary && <p className="mt-3 rounded-xl bg-cyan-50 p-3 text-sm leading-6 text-cyan-950"><strong>Working shown:</strong> {turn.workingSummary}</p>}</div>)}</CardContent></Card>
            <div className="grid gap-4 md:grid-cols-2"><Card className="shadow-none"><CardHeader><CardTitle className="font-serif text-xl">Evidence of strength</CardTitle></CardHeader><CardContent className="space-y-2">{active.strengths.length ? active.strengths.map(item => <p key={item} className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-950">{item}</p>) : <p className="text-sm text-slate-500">No explicit strength phrase was captured. Use the transcript itself as evidence.</p>}</CardContent></Card><Card className="shadow-none"><CardHeader><CardTitle className="font-serif text-xl">Priority to improve</CardTitle></CardHeader><CardContent className="space-y-2">{active.improvements.length ? active.improvements.map(item => <p key={item} className="rounded-xl bg-amber-50 p-3 text-sm text-amber-950">{item}</p>) : <p className="text-sm text-slate-500">No repeated weakness was detected in this session.</p>}</CardContent></Card></div>
            <Card className="border-blue-200 bg-blue-50 shadow-none"><CardHeader><CalendarClock className="size-5 text-blue-700" /><CardTitle className="font-serif text-xl">Automatic oral retest</CardTitle><CardDescription>{active.focus}</CardDescription></CardHeader><CardContent className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-blue-950">Retention check due {new Date(active.nextOralRetestAt).toLocaleDateString("en-GB")}.</p><Button onClick={scheduleRetest}><RotateCcw />Add to Tutor retests</Button></CardContent></Card>
          </div>
        </div>
      </>}
    </div>
  </main>
}

"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { ArrowLeft, ArrowRight, CheckCircle2, Clock3, FileText, GraduationCap, LockKeyhole, Play, RotateCcw, TimerReset } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { PROFILE_KEY, PROGRESS_KEY, MOCK_DAY_KEY, buildStudentIntelligence } from "@/lib/personal-tutor"

type MockState = { completed?: string[]; startedAt?: string; writtenResponse?: string; packId?: string; reflection?: string }
type Pack = { id: string; title: string; stimulus: string; writtenTask: string; interviewFocus: string }

function read(key: string) { try { return JSON.parse(localStorage.getItem(key) || "{}") as Record<string, unknown> } catch { return {} } }

const packs: Pack[] = [
  {
    id: "model-change",
    title: "Unfamiliar model under pressure",
    stimulus: "A research team builds a model that predicts a stable relationship between two measured quantities. When the experiment is repeated at a much larger scale, the relationship changes systematically rather than randomly. The original measurements remain reliable, but one assumption used in the model may no longer hold.",
    writtenTask: "In a short argument, identify what you would test first, state at least two competing explanations, and explain what evidence would make you revise your preferred explanation.",
    interviewFocus: "assumptions, model limits, evidence and revision",
  },
  {
    id: "conflicting-source",
    title: "Two plausible interpretations",
    stimulus: "Two scholars use the same small body of evidence to reach different conclusions. Scholar A argues that the pattern reflects a genuine change in behaviour. Scholar B argues that the pattern is mainly the result of how the evidence was selected and recorded. Neither interpretation is contradicted by a single decisive fact.",
    writtenTask: "Set out the strongest case for each interpretation, then explain what further evidence would most efficiently distinguish between them and why.",
    interviewFocus: "evidence quality, counterargument, inference and uncertainty",
  },
  {
    id: "resource-choice",
    title: "Decision with incomplete information",
    stimulus: "A college has enough resources to fund only one of two projects. Project A has a high expected benefit but a meaningful chance of failure. Project B has a smaller expected benefit but a much more predictable outcome. The available evidence does not justify assigning exact probabilities.",
    writtenTask: "Explain how you would compare the projects without pretending to know more than the evidence allows. State which considerations should matter and where reasonable disagreement could remain.",
    interviewFocus: "decision-making, assumptions, uncertainty and defensible judgement",
  },
]

function packFor(course: string, savedId?: string) {
  if (savedId) return packs.find(item => item.id === savedId) ?? packs[0]
  const text = course.toLowerCase()
  if (/history|english|law|politic|philos|human|geograph|classics/.test(text)) return packs[1]
  if (/econom|management|ppe/.test(text)) return packs[2]
  return packs[0]
}

export default function MockDayPage() {
  const [profile, setProfile] = useState<Record<string, unknown>>({})
  const [progressData, setProgressData] = useState<Record<string, unknown>>({})
  const [state, setState] = useState<MockState>({ completed: [] })
  const [loaded, setLoaded] = useState(false)

  useEffect(() => { setProfile(read(PROFILE_KEY)); setProgressData(read(PROGRESS_KEY)); setState(read(MOCK_DAY_KEY) as MockState); setLoaded(true) }, [])
  const intelligence = useMemo(() => buildStudentIntelligence(profile, progressData), [profile, progressData])
  const course = String(intelligence.profile.course || profile.course || "your subject")
  const pack = useMemo(() => packFor(course, state.packId), [course, state.packId])
  const completed = state.completed ?? []
  const adaptiveFocus = intelligence.skills.filter(item => item.domain === "Interview" && item.evidenceCount > 0).sort((a, b) => a.score - b.score)[0]
  const running = Boolean(state.startedAt)

  const stages = [
    { id: "briefing", time: "09:00", minutes: 12, title: "Unseen briefing", note: "Read the unfamiliar material without looking for a memorised answer. Identify what is known, uncertain and assumed.", href: "#briefing" },
    { id: "written", time: "09:12", minutes: 18, title: "Timed reasoning task", note: "Commit your thinking to writing before the interview. The aim is a defensible line of reasoning, not polished prose.", href: "#written" },
    { id: "interview-1", time: "09:35", minutes: 25, title: "Interview 1", note: `A formal ${course} interview. Use the briefing and your written reasoning as context, then let the interviewer challenge it.`, href: "/interview-room" },
    { id: "interview-2", time: "10:05", minutes: 25, title: "Interview 2 · different academic", note: adaptiveFocus ? `A second interviewer should deliberately probe ${adaptiveFocus.label}, currently your weakest evidenced interview skill.` : "A second interviewer changes angle so the day tests adaptability rather than repeating the same conversation.", href: "/panel-interview" },
    { id: "report", time: "10:35", minutes: 12, title: "Admissions-day report", note: "Review recurring patterns, recovery after challenge, use of evidence and the next intervention. This is practice feedback, not an admissions verdict.", href: "/interview-feedback" },
  ]

  function persist(next: MockState) { setState(next); localStorage.setItem(MOCK_DAY_KEY, JSON.stringify(next)) }
  function start() {
    const selected = packFor(course)
    const next = { completed: [], startedAt: new Date().toISOString(), writtenResponse: "", reflection: "", packId: selected.id }
    persist(next)
    localStorage.setItem("oxbridge-mock-day-context-v1", JSON.stringify({ course, pack: selected, startedAt: next.startedAt }))
  }
  function mark(id: string) {
    if (!running) return
    const nextCompleted = completed.includes(id) ? completed.filter(item => item !== id) : [...completed, id]
    persist({ ...state, completed: nextCompleted })
  }
  function reset() { persist({ completed: [], startedAt: undefined, writtenResponse: "", reflection: "", packId: undefined }); localStorage.removeItem("oxbridge-mock-day-context-v1") }
  function saveWritten(value: string) {
    persist({ ...state, writtenResponse: value })
    localStorage.setItem("oxbridge-mock-day-context-v1", JSON.stringify({ course, pack, writtenResponse: value, startedAt: state.startedAt }))
  }
  function unlocked(index: number) { return running && (index === 0 || completed.includes(stages[index - 1].id)) }

  return <main className="min-h-screen bg-[#f5f7f7] text-[#172b3a]">
    <header className="border-b bg-white"><div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4"><Button asChild variant="ghost"><Link href="/tutor"><ArrowLeft />Personal Tutor</Link></Button><Badge variant="outline"><GraduationCap className="size-3.5" />Mock Admissions Day</Badge></div></header>
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <section className="grid gap-5 lg:grid-cols-[1.25fr_.75fr]"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#147d91]">Full admissions-day simulation</p><h1 className="mt-2 font-serif text-4xl font-bold">Move from unseen material to written reasoning to two interviews.</h1><p className="mt-3 max-w-3xl text-slate-600">Start once, then complete the stages in sequence. The second interview changes angle and the final report stays until the end so you practise adapting under sustained academic pressure.</p><div className="mt-5 flex flex-wrap gap-2"><Button onClick={start}>{running ? <TimerReset /> : <Play />}{running ? "Restart with fresh day" : "Start mock admissions day"}</Button><Button variant="outline" onClick={reset}><RotateCcw />Clear session</Button></div></div><Card className="border-0 bg-[#102a43] text-white shadow-none"><CardHeader><CardDescription className="text-white/60">Adaptive interview target</CardDescription><CardTitle className="font-serif text-2xl">{adaptiveFocus?.label ?? "Build interview baseline"}</CardTitle><CardDescription className="text-white/60">{adaptiveFocus ? `${adaptiveFocus.score}% · ${adaptiveFocus.status}` : "Complete more interviews and the second interview will become more precisely targeted."}</CardDescription></CardHeader></Card></section>

      {running ? <Card id="briefing" className="border-[#cfe1e4] bg-[#edf7f8] shadow-none"><CardHeader><FileText className="size-5 text-[#147d91]"/><CardTitle className="font-serif text-2xl">Day briefing · {pack.title}</CardTitle><CardDescription>Unseen practice material generated for ScholarBridge. Treat it as hypothetical material for reasoning practice.</CardDescription></CardHeader><CardContent><p className="rounded-xl bg-white p-5 text-sm leading-7">{pack.stimulus}</p><p className="mt-3 text-xs text-slate-500">Interview focus later: {pack.interviewFocus}.</p></CardContent></Card> : null}

      {running ? <Card id="written" className="shadow-none"><CardHeader><CardTitle className="font-serif text-2xl">Timed written reasoning</CardTitle><CardDescription>{pack.writtenTask}</CardDescription></CardHeader><CardContent className="space-y-3"><Textarea rows={8} value={state.writtenResponse || ""} onChange={event => saveWritten(event.target.value)} placeholder="Write your reasoning here before moving to the interviews…"/><p className="text-xs text-slate-500">Your response is stored locally with this mock-day session so you can compare it with how your reasoning changes in interview.</p></CardContent></Card> : null}

      <Card className="shadow-none"><CardHeader><div className="flex items-center justify-between gap-3"><div><CardTitle className="font-serif text-2xl">Admissions-day schedule</CardTitle><CardDescription>{completed.length}/{stages.length} stages complete.</CardDescription></div>{state.startedAt ? <Badge variant="outline">Started {new Date(state.startedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</Badge> : null}</div></CardHeader><CardContent className="space-y-3">{stages.map((stage, index) => { const done = completed.includes(stage.id); const open = unlocked(index); return <div key={stage.id} className={`grid gap-3 rounded-2xl border p-4 md:grid-cols-[90px_1fr_auto] md:items-center ${done ? "border-emerald-200 bg-emerald-50" : open ? "bg-white" : "bg-slate-50 opacity-65"}`}><div><p className="font-bold">{stage.time}</p><p className="text-xs text-slate-500"><Clock3 className="mr-1 inline size-3" />{stage.minutes} min</p></div><div><div className="flex items-center gap-2"><span className="grid size-7 place-items-center rounded-full bg-[#102a43] text-xs font-bold text-white">{done ? <CheckCircle2 className="size-4"/> : index + 1}</span><strong>{stage.title}</strong>{!open && !done ? <LockKeyhole className="size-4 text-slate-400"/> : null}</div><p className="mt-1 text-sm leading-6 text-slate-600">{stage.note}</p></div><div className="flex gap-2"><Button size="sm" variant={done ? "outline" : "default"} disabled={!open && !done} onClick={() => mark(stage.id)}>{done ? "Reopen" : "Complete stage"}</Button><Button asChild size="sm" variant="outline" aria-disabled={!open && !done}><Link href={open || done ? stage.href : "#"}>Open <ArrowRight /></Link></Button></div></div>})}</CardContent></Card>

      {completed.length === stages.length ? <Card className="border-emerald-200 bg-emerald-50 shadow-none"><CardHeader><CheckCircle2 className="size-6 text-emerald-700"/><CardTitle className="font-serif text-2xl">Mock day complete</CardTitle><CardDescription>Use the report and Replay Lab to repair one weak branch while the experience is still fresh.</CardDescription></CardHeader><CardContent className="flex flex-wrap gap-2"><Button asChild><Link href="/interview-feedback">Review report <ArrowRight /></Link></Button><Button asChild variant="outline"><Link href="/interview-replay">Replay a weak moment</Link></Button><Button asChild variant="outline"><Link href="/digital-twin">Refresh Digital Twin</Link></Button></CardContent></Card> : null}
    </div>
  </main>
}

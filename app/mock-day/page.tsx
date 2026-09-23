"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { ArrowLeft, ArrowRight, CheckCircle2, Clock3, GraduationCap, RotateCcw } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PROFILE_KEY, PROGRESS_KEY, MOCK_DAY_KEY, buildStudentIntelligence } from "@/lib/personal-tutor"

type MockState = { completed?: string[]; startedAt?: string }
function read(key: string) { try { return JSON.parse(localStorage.getItem(key) || "{}") as Record<string, unknown> } catch { return {} } }

export default function MockDayPage() {
  const [profile, setProfile] = useState<Record<string, unknown>>({})
  const [progressData, setProgressData] = useState<Record<string, unknown>>({})
  const [state, setState] = useState<MockState>({ completed: [] })
  useEffect(() => { setProfile(read(PROFILE_KEY)); setProgressData(read(PROGRESS_KEY)); setState(read(MOCK_DAY_KEY) as MockState) }, [])
  const intelligence = useMemo(() => buildStudentIntelligence(profile, progressData), [profile, progressData])
  const completed = state.completed ?? []
  const adaptiveFocus = intelligence.skills.filter(item => item.domain === "Interview" && item.evidenceCount > 0).sort((a, b) => a.score - b.score)[0]
  const stages = [
    { id: "prep", time: "09:00", minutes: 20, title: "Unseen preparation material", note: "Start with unfamiliar material so the first interview is not a rehearsed conversation.", href: "/unseen-lab" },
    { id: "interview-1", time: "09:25", minutes: 25, title: "Interview 1", note: `A formal ${intelligence.profile.course} interview focused on reasoning depth rather than prepared answers.`, href: "/interview-room" },
    { id: "reflection", time: "09:55", minutes: 10, title: "Silent reflection", note: "Record what changed, where you needed a hint and which assumption you did not notice quickly enough.", href: "/tutor#reflection" },
    { id: "interview-2", time: "10:10", minutes: 25, title: "Adaptive Interview 2", note: adaptiveFocus ? `Second interview deliberately targets ${adaptiveFocus.label}, currently your weakest evidenced interview skill.` : "Second interview shifts to a different style so the tutor can compare adaptability across contexts.", href: "/interview-room" },
    { id: "report", time: "10:40", minutes: 10, title: "Interview-day report", note: "Review repeated patterns, strongest reasoning moments and the next intervention rather than a pass/fail judgement.", href: "/interview-feedback" },
  ]

  function toggle(id: string) { const next = completed.includes(id) ? completed.filter(item => item !== id) : [...completed, id]; const value = { ...state, startedAt: state.startedAt ?? new Date().toISOString(), completed: next }; setState(value); localStorage.setItem(MOCK_DAY_KEY, JSON.stringify(value)) }
  function reset() { const next = { completed: [], startedAt: new Date().toISOString() }; setState(next); localStorage.setItem(MOCK_DAY_KEY, JSON.stringify(next)) }

  return <main className="min-h-screen bg-[#f5f7f7] text-[#172b3a]"><header className="border-b bg-white"><div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4"><Button asChild variant="ghost"><Link href="/tutor"><ArrowLeft />Personal Tutor</Link></Button><Badge variant="outline"><GraduationCap className="size-3.5" />Mock Interview Day</Badge></div></header><div className="mx-auto max-w-6xl space-y-6 px-4 py-8"><section className="grid gap-5 lg:grid-cols-[1.25fr_.75fr]"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#147d91]">Whole-day simulation</p><h1 className="mt-2 font-serif text-4xl font-bold">Practise the transitions, not just one isolated interview.</h1><p className="mt-3 max-w-3xl text-slate-600">The sequence starts with unfamiliar material, then uses a second interview that deliberately targets a weakness from your existing profile. Feedback stays until the end so the day feels more realistic.</p></div><Card className="border-0 bg-[#102a43] text-white shadow-none"><CardHeader><CardDescription className="text-white/60">Adaptive target</CardDescription><CardTitle className="font-serif text-2xl">{adaptiveFocus?.label ?? "Build interview baseline"}</CardTitle><CardDescription className="text-white/60">{adaptiveFocus ? `${adaptiveFocus.score}% · ${adaptiveFocus.status}` : "Complete more interviews and the tutor will target Interview 2 more precisely."}</CardDescription></CardHeader></Card></section><Card className="shadow-none"><CardHeader><div className="flex items-center justify-between"><div><CardTitle className="font-serif text-2xl">Interview-day schedule</CardTitle><CardDescription>{completed.length}/{stages.length} stages complete.</CardDescription></div><Button variant="outline" onClick={reset}><RotateCcw />Reset day</Button></div></CardHeader><CardContent className="space-y-3">{stages.map((stage, index) => { const done = completed.includes(stage.id); return <div key={stage.id} className={`grid gap-3 rounded-2xl border p-4 md:grid-cols-[90px_1fr_auto] md:items-center ${done ? "border-emerald-200 bg-emerald-50" : "bg-white"}`}><div><p className="font-bold">{stage.time}</p><p className="text-xs text-slate-500"><Clock3 className="mr-1 inline size-3" />{stage.minutes} min</p></div><div><div className="flex items-center gap-2"><span className="grid size-7 place-items-center rounded-full bg-[#102a43] text-xs font-bold text-white">{index + 1}</span><strong>{stage.title}</strong>{done && <CheckCircle2 className="size-4 text-emerald-600" />}</div><p className="mt-1 text-sm leading-6 text-slate-600">{stage.note}</p></div><div className="flex gap-2"><Button size="sm" variant={done ? "outline" : "default"} onClick={() => toggle(stage.id)}>{done ? "Mark open" : "Mark complete"}</Button><Button asChild size="sm" variant="outline"><Link href={stage.href}>Open <ArrowRight /></Link></Button></div></div>})}</CardContent></Card><div className="flex gap-2"><Button asChild><Link href="/progress-proof">Review progress evidence <ArrowRight /></Link></Button><Button asChild variant="outline"><Link href="/interview-feedback">Structured interview feedback</Link></Button></div></div></main>
}

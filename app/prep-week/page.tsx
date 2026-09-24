"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { ArrowLeft, CalendarDays, CheckCircle2, Clock3, RotateCcw } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { PROFILE_KEY } from "@/lib/personal-tutor"
import { PREP_WEEK_KEY, buildPrepWeek } from "@/lib/nextgen-prep"

type State = { startedAt?: string; completed?: string[] }

function readCourse() { try { return (JSON.parse(localStorage.getItem(PROFILE_KEY) || "{}") as { course?: string }).course || "Physics" } catch { return "Physics" } }
function readState(): State { try { return JSON.parse(localStorage.getItem(PREP_WEEK_KEY) || "{}") as State } catch { return {} } }

export default function PrepWeekPage() {
  const [course, setCourse] = useState("Physics")
  const [state, setState] = useState<State>({ completed: [] })
  useEffect(() => { setCourse(readCourse()); setState(readState()) }, [])
  const days = useMemo(() => buildPrepWeek(course), [course])
  const completed = state.completed ?? []
  const totalTasks = days.reduce((sum, day) => sum + day.tasks.length, 0)
  const progress = totalTasks ? Math.round(completed.length / totalTasks * 100) : 0

  function toggle(id: string) {
    const next = completed.includes(id) ? completed.filter(item => item !== id) : [...completed, id]
    const updated = { ...state, startedAt: state.startedAt ?? new Date().toISOString(), completed: next }
    setState(updated)
    localStorage.setItem(PREP_WEEK_KEY, JSON.stringify(updated))
  }

  function reset() {
    const updated = { startedAt: new Date().toISOString(), completed: [] }
    setState(updated)
    localStorage.setItem(PREP_WEEK_KEY, JSON.stringify(updated))
  }

  return <main className="min-h-screen bg-[#f4f7f7] text-[#172b3a]">
    <header className="border-b bg-white"><div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4"><Button asChild variant="ghost"><Link href="/tutor"><ArrowLeft />Personal Tutor</Link></Button><Badge variant="outline"><CalendarDays className="size-3.5" />Preparation Week</Badge></div></header>
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8">
      <section className="grid gap-5 lg:grid-cols-[1fr_320px]"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#147d91]">Adaptive seven-day programme</p><h1 className="mt-2 font-serif text-4xl font-bold">A structured week of {course} preparation.</h1><p className="mt-3 max-w-3xl text-slate-600">Each day has a different purpose: baseline, targeted repair, unseen material, visual reasoning, adaptation under pressure, full simulation and delayed retention.</p></div><Card className="shadow-none"><CardContent className="space-y-3 p-5"><div className="flex items-center justify-between"><strong>{progress}% complete</strong><span className="text-sm text-slate-500">{completed.length}/{totalTasks} tasks</span></div><Progress value={progress} /><Button variant="outline" className="w-full" onClick={reset}><RotateCcw />Restart week</Button></CardContent></Card></section>
      <div className="grid gap-4 lg:grid-cols-2">{days.map(day => <Card key={day.id} className="shadow-none"><CardHeader><div className="flex items-center justify-between"><Badge>Day {day.day}</Badge><Clock3 className="size-4 text-slate-400" /></div><CardTitle className="font-serif text-2xl">{day.title}</CardTitle><CardDescription>{day.rationale}</CardDescription></CardHeader><CardContent className="space-y-3">{day.tasks.map(task => { const key = `${day.id}:${task.id}`; const done = completed.includes(key); return <div key={key} className={`rounded-xl border p-4 ${done ? "bg-emerald-50 border-emerald-200" : "bg-white"}`}><div className="flex items-start justify-between gap-3"><div><p className="font-semibold">{task.label}</p><p className="mt-1 text-xs text-slate-500">{task.minutes} minutes</p></div><button onClick={() => toggle(key)} className={`grid size-8 place-items-center rounded-full border ${done ? "bg-emerald-600 text-white" : "bg-white"}`} aria-label={done ? "Mark incomplete" : "Mark complete"}><CheckCircle2 className="size-4" /></button></div><Button asChild size="sm" variant="outline" className="mt-3"><Link href={task.href}>Open activity</Link></Button></div>})}</CardContent></Card>)}</div>
    </div>
  </main>
}

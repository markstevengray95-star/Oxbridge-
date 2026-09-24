"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { ArrowLeft, ArrowRight, CalendarDays, CheckCircle2, Clock3, Cloud, Loader2, RefreshCw, Target } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import type { WeeklyProgramme } from "@/lib/weekly-programme"

type ApiResponse = { programme?: WeeklyProgramme; error?: string; automaticRollover?: boolean }

function formatDay(date: string) {
  const parsed = new Date(`${date}T12:00:00Z`)
  return new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "short", timeZone: "Europe/London" }).format(parsed)
}

export default function WeeklyProgrammePage() {
  const [programme, setProgramme] = useState<WeeklyProgramme | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  async function load() {
    setLoading(true)
    setError("")
    try {
      const response = await fetch("/api/weekly-programme", { cache: "no-store" })
      const data = await response.json() as ApiResponse
      if (!response.ok || !data.programme) throw new Error(data.error || "Weekly programme could not be loaded")
      setProgramme(data.programme)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Weekly programme could not be loaded")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  async function update(body: Record<string, unknown>) {
    if (saving) return
    setSaving(true)
    setError("")
    try {
      const response = await fetch("/api/weekly-programme", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await response.json() as ApiResponse
      if (!response.ok || !data.programme) throw new Error(data.error || "Weekly programme could not be updated")
      setProgramme(data.programme)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Weekly programme could not be updated")
    } finally {
      setSaving(false)
    }
  }

  const taskIds = useMemo(() => programme?.days.flatMap(day => day.tasks.map(task => task.id)) ?? [], [programme])
  const complete = programme ? taskIds.filter(id => programme.completedIds.includes(id)).length : 0
  const percent = taskIds.length ? Math.round(complete / taskIds.length * 100) : 0

  if (loading) return <main className="grid min-h-screen place-items-center bg-[#f5f7f7] text-[#172b3a]"><div className="text-center"><Loader2 className="mx-auto size-8 animate-spin text-[#147d91]"/><p className="mt-3 text-sm text-slate-600">Building this week from your latest preparation evidence…</p></div></main>

  return <main className="min-h-screen bg-[#f5f7f7] text-[#172b3a]">
    <header className="border-b bg-white"><div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4"><Button asChild variant="ghost"><Link href="/tutor-autopilot"><ArrowLeft/>Tutor Autopilot</Link></Button><Badge><Cloud className="size-3.5"/>Cloud weekly programme</Badge></div></header>
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6">
      <section className="grid gap-5 lg:grid-cols-[1.15fr_.85fr] lg:items-end">
        <div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#147d91]">Tutor-generated week</p><h1 className="mt-2 font-serif text-4xl font-bold">Your next seven days, chosen from your evidence.</h1><p className="mt-3 max-w-3xl leading-7 text-slate-600">The programme uses your stored weaknesses, recent test and interview evidence, application work and supercurricular activity. A new week is created automatically from Sunday and is saved to your account so completion follows you across devices.</p></div>
        <Card className="border-0 bg-[#102a43] text-white"><CardHeader><CardDescription className="text-white/65">Current priority</CardDescription><CardTitle className="font-serif text-3xl">{programme?.focus ?? "Preparation baseline"}</CardTitle></CardHeader><CardContent><p className="text-sm leading-6 text-white/75">{programme?.rationale ?? "Complete more preparation so the tutor can personalise the next programme."}</p></CardContent></Card>
      </section>

      {error && <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950"><strong>Programme update:</strong> {error} <Button size="sm" variant="outline" className="ml-2" onClick={() => void load()}>Retry</Button></div>}

      {programme && <>
        <Card><CardHeader><div className="flex flex-wrap items-start justify-between gap-4"><div><CardTitle className="font-serif text-2xl">{programme.course}</CardTitle><CardDescription>Week beginning Sunday {new Date(`${programme.weekStart}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/London" })} · generated {new Date(programme.generatedAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}</CardDescription></div><div className="text-right"><p className="text-3xl font-bold">{percent}%</p><p className="text-xs text-slate-500">{complete} of {taskIds.length} tasks</p></div></div><Progress value={percent}/></CardHeader><CardContent className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end"><div><p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">Daily preparation time</p><div className="flex flex-wrap gap-2">{[20,30,45,60,90].map(minutes => <Button key={minutes} size="sm" variant={programme.dailyMinutes === minutes ? "default" : "outline"} disabled={saving} onClick={() => void update({ action: "setMinutes", dailyMinutes: minutes })}><Clock3/>{minutes} min</Button>)}</div><p className="mt-2 text-xs text-slate-500">Changing the available time rebuilds this week's tasks from the latest evidence.</p></div><Button variant="outline" disabled={saving} onClick={() => void update({ action: "regenerate", dailyMinutes: programme.dailyMinutes })}>{saving ? <Loader2 className="animate-spin"/> : <RefreshCw/>}Refresh from latest evidence</Button></CardContent></Card>

        <section className="grid gap-4 md:grid-cols-2"><Card><CardHeader><CardTitle className="flex items-center gap-2 font-serif text-2xl"><Target className="size-5 text-[#147d91]"/>Why this week looks like this</CardTitle><CardDescription>The tutor records the signals it used instead of presenting the plan as a black box.</CardDescription></CardHeader><CardContent className="space-y-2">{programme.evidenceUsed.length ? programme.evidenceUsed.map(item => <div key={item} className="rounded-xl bg-[#edf7f8] p-3 text-sm">{item}</div>) : <p className="text-sm text-slate-500">There is limited evidence so this week focuses on building a stronger baseline.</p>}</CardContent></Card><Card><CardHeader><CardTitle className="flex items-center gap-2 font-serif text-2xl"><CalendarDays className="size-5 text-[#147d91]"/>Automatic Sunday reset</CardTitle></CardHeader><CardContent><p className="text-sm leading-6 text-slate-600">Each Sunday starts a new programme from the evidence available at that point. Opening this page also checks the week automatically, so the rollover still happens for an active student even if a scheduled server run was missed.</p><p className="mt-3 text-xs text-slate-500">Completed tasks are account-saved for the current week. A new week starts clean rather than carrying old ticks forward.</p></CardContent></Card></section>

        <div className="grid gap-4">{programme.days.map(day => <Card key={day.id} className="overflow-hidden"><CardHeader className="bg-white"><div className="flex flex-wrap items-center gap-2"><Badge>Day {day.day}</Badge><Badge variant="outline">{formatDay(day.date)}</Badge><CardTitle className="font-serif text-2xl">{day.title}</CardTitle></div><CardDescription>{day.rationale}</CardDescription></CardHeader><CardContent className="space-y-3 pt-4">{day.tasks.map(task => {const done = programme.completedIds.includes(task.id); return <div key={task.id} className={`grid gap-3 rounded-2xl border p-4 sm:grid-cols-[1fr_auto] sm:items-center ${done ? "border-emerald-200 bg-emerald-50" : "bg-white"}`}><div><div className="flex flex-wrap items-center gap-2"><strong>{task.label}</strong><Badge variant="outline">{task.minutes} min</Badge><Badge variant="outline">{task.domain}</Badge>{done && <CheckCircle2 className="size-4 text-emerald-700"/>}</div><p className="mt-2 text-sm leading-6 text-slate-600">{task.note}</p></div><div className="flex gap-2"><Button asChild size="sm"><Link href={task.href}>Open <ArrowRight/></Link></Button><Button size="sm" variant="outline" disabled={saving} onClick={() => void update({ action: "toggle", taskId: task.id })}>{done ? "Undo" : "Done"}</Button></div></div>})}</CardContent></Card>)}</div>
      </>}
    </div>
  </main>
}

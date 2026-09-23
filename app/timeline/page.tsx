"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { ArrowLeft, ArrowRight, CalendarClock, Check, Clock3, Sparkles } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { applicationAudit, tasksFor, type UniversityChoice } from "@/lib/admissions-platform"

type Profile = { university?: UniversityChoice; course?: string; year?: string }

function daysUntil(date?: string) {
  if (!date) return null
  return Math.ceil((new Date(date).getTime() - Date.now()) / 86400000)
}

function fmt(date?: string) {
  if (!date) return "Flexible"
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(new Date(date))
}

export default function TimelinePage() {
  const [profile, setProfile] = useState<Profile>({ university: "Both", course: "Physics", year: "2027" })
  const [completed, setCompleted] = useState<string[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    try {
      const p = localStorage.getItem("oxbridge-tutor-profile-v2")
      const t = localStorage.getItem("oxbridge-platform-tasks-v1")
      if (p) setProfile({ ...profile, ...JSON.parse(p) })
      if (t) setCompleted(JSON.parse(t))
    } catch { /* default */ }
    setLoaded(true)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => { if (loaded) localStorage.setItem("oxbridge-platform-tasks-v1", JSON.stringify(completed)) }, [completed, loaded])

  const tasks = useMemo(() => tasksFor(profile.university ?? "Both", profile.course ?? "Physics"), [profile.university, profile.course])
  const audit = useMemo(() => applicationAudit(tasks, completed), [tasks, completed])
  const ordered = useMemo(() => [...tasks].sort((a, b) => {
    if (!a.date && !b.date) return 0
    if (!a.date) return 1
    if (!b.date) return -1
    return new Date(a.date).getTime() - new Date(b.date).getTime()
  }), [tasks])
  const next = ordered.find(item => !completed.includes(item.id) && (!item.date || new Date(item.date).getTime() >= Date.now())) ?? ordered.find(item => !completed.includes(item.id))

  return <main className="min-h-screen bg-[#f6f8f8] text-[#172b3a]">
    <header className="border-b bg-white"><div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6"><Button asChild variant="ghost"><Link href="/student-home"><ArrowLeft />Student Home</Link></Button><Badge variant="outline"><CalendarClock className="size-3.5" />Timeline Autopilot</Badge></div></header>
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <section className="mb-6"><p className="text-xs font-bold uppercase tracking-[.18em] text-[#147d91]">Automatic application planner</p><h1 className="mt-2 font-serif text-4xl font-bold">Your next deadline should never be a surprise.</h1><p className="mt-2 max-w-3xl text-slate-600">The timeline rebuilds itself from your saved university and course profile. Required tasks feed the same completeness audit used by Student Home.</p></section>

      <section className="grid gap-4 lg:grid-cols-[1.35fr_.65fr]"><Card className="border-0 bg-[#102a43] text-white shadow-none"><CardHeader><Badge className="w-fit border-white/15 bg-white/10 text-white">NEXT ACTION</Badge><CardTitle className="font-serif text-3xl">{next?.label ?? "No outstanding application tasks"}</CardTitle><CardDescription className="text-blue-50/70">{next?.detail}</CardDescription></CardHeader><CardContent className="flex flex-wrap items-center gap-3">{next?.date && <span className="inline-flex items-center gap-2 text-sm"><Clock3 className="size-4" />{fmt(next.date)}{daysUntil(next.date) !== null && ` · ${daysUntil(next.date)} days`}</span>}<Button asChild className="bg-white text-[#102a43] hover:bg-blue-50"><Link href="/requirements">Open audit <ArrowRight /></Link></Button></CardContent></Card><Card className="shadow-none"><CardHeader><CardDescription>Required-route completion</CardDescription><CardTitle className="font-serif text-4xl">{audit.percent}%</CardTitle></CardHeader><CardContent><Progress value={audit.percent} /><p className="mt-3 text-sm text-slate-500">{audit.missing.length} required task{audit.missing.length === 1 ? "" : "s"} still outstanding.</p></CardContent></Card></section>

      <Card className="mt-5 shadow-none"><CardHeader><div className="flex items-center justify-between"><div><CardTitle className="font-serif text-2xl">Application timeline</CardTitle><CardDescription>{profile.university} · {profile.course} · {profile.year ?? "2027"} entry</CardDescription></div><Sparkles className="size-6 text-[#147d91]" /></div></CardHeader><CardContent className="relative space-y-0 before:absolute before:bottom-5 before:left-[17px] before:top-5 before:w-px before:bg-slate-200">{ordered.map((task, i) => { const done = completed.includes(task.id); const overdue = Boolean(task.date && new Date(task.date).getTime() < Date.now() && !done); return <button key={task.id} onClick={() => setCompleted(items => done ? items.filter(x => x !== task.id) : [...items, task.id])} className="relative grid w-full grid-cols-[36px_minmax(0,1fr)_auto] gap-3 py-4 text-left"><span className={`z-10 grid size-9 place-items-center rounded-full border-2 ${done ? "border-emerald-600 bg-emerald-600 text-white" : overdue ? "border-red-400 bg-red-50 text-red-700" : "border-[#147d91] bg-white text-[#147d91]"}`}>{done ? <Check className="size-4" /> : i + 1}</span><span><strong className="block">{task.label}</strong><small className="mt-1 block max-w-3xl leading-relaxed text-slate-500">{task.detail}</small></span><span className="pt-1 text-right"><Badge variant={task.required ? "default" : "outline"}>{task.required ? "Required" : "Check"}</Badge><small className={`mt-2 block text-xs ${overdue ? "font-semibold text-red-600" : "text-slate-500"}`}>{fmt(task.date)}</small></span></button>})}</CardContent></Card>
    </div>
  </main>
}

"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { ArrowLeft, ArrowRight, CalendarClock, CheckCircle2, Plus, RefreshCw } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { tasksFor, type ApplicationTask, type UniversityChoice } from "@/lib/admissions-platform"

type Profile = { university?: UniversityChoice; course?: string; year?: string }
type CustomDeadline = { id: string; label: string; date: string; detail: string; category: "School" | "Personal" }
type Checkpoint = { id: string; taskId: string; taskLabel: string; date: string; label: string; detail: string; offsetDays: number; officialUrl?: string }

const CUSTOM_KEY = "oxbridge-custom-deadlines-v1"
const OFFSETS = [
  { days: 28, label: "Four-week readiness check", detail: "Have the core material substantially drafted or practised so there is time for meaningful revision." },
  { days: 14, label: "Two-week quality check", detail: "Complete a serious review against the actual requirement and identify anything that still needs external feedback or evidence." },
  { days: 7, label: "One-week completion check", detail: "Aim for a complete, usable version rather than relying on last-minute construction." },
  { days: 2, label: "Final logistics check", detail: "Confirm submission/access details, required files or identification, timing and contingency plans." },
] as const

function read<T>(key: string, fallback: T): T { try { return JSON.parse(localStorage.getItem(key) || "") as T } catch { return fallback } }
function subtractDays(date: string, days: number) { const value = new Date(date); value.setUTCDate(value.getUTCDate() - days); return value.toISOString() }
function fmt(date: string) { return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(new Date(date)) }

function checkpointsFor(tasks: ApplicationTask[]) {
  return tasks.filter(task => task.date).flatMap(task => OFFSETS.map(offset => ({
    id: `workback-${task.id}-${offset.days}`,
    taskId: task.id,
    taskLabel: task.label,
    date: subtractDays(task.date!, offset.days),
    label: `${offset.label}: ${task.label}`,
    detail: `${offset.detail} This is a ScholarBridge planning checkpoint derived from the official milestone, not a university deadline.`,
    offsetDays: offset.days,
    officialUrl: task.officialUrl,
  }))).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
}

export default function DeadlineWorkbackPage() {
  const [profile, setProfile] = useState<Profile>({ university: "Both", course: "Physics", year: "2027" })
  const [custom, setCustom] = useState<CustomDeadline[]>([])
  const [saved, setSaved] = useState<string[]>([])
  const [loaded, setLoaded] = useState(false)

  function refresh() {
    const savedProfile = read<Record<string, unknown>>("oxbridge-tutor-profile-v2", {})
    setProfile(current => ({ ...current, ...savedProfile } as Profile))
    const deadlines = read<CustomDeadline[]>(CUSTOM_KEY, [])
    setCustom(deadlines)
    setSaved(deadlines.filter(item => item.id.startsWith("workback-")).map(item => item.id))
    setLoaded(true)
  }
  useEffect(() => refresh(), [])

  const officialTasks = useMemo(() => tasksFor(profile.university ?? "Both", profile.course ?? "Physics"), [profile.university, profile.course])
  const checkpoints = useMemo(() => checkpointsFor(officialTasks), [officialTasks])
  const future = checkpoints.filter(item => new Date(item.date).getTime() >= Date.now())
  const next = future[0]

  function saveCheckpoint(item: Checkpoint) {
    if (saved.includes(item.id)) return
    const entry: CustomDeadline = { id: item.id, label: item.label, date: item.date, detail: item.detail, category: "Personal" }
    const nextCustom = [...custom, entry]
    setCustom(nextCustom); setSaved(current => [...current, item.id]); localStorage.setItem(CUSTOM_KEY, JSON.stringify(nextCustom))
  }

  function saveAllFuture() {
    const additions = future.filter(item => !saved.includes(item.id)).map<CustomDeadline>(item => ({ id: item.id, label: item.label, date: item.date, detail: item.detail, category: "Personal" }))
    if (!additions.length) return
    const nextCustom = [...custom, ...additions]
    setCustom(nextCustom); setSaved(current => [...new Set([...current, ...additions.map(item => item.id)])]); localStorage.setItem(CUSTOM_KEY, JSON.stringify(nextCustom))
  }

  return <main className="min-h-screen bg-[#f5f7f7] text-[#172b3a]">
    <header className="border-b bg-white"><div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4"><Button asChild variant="ghost"><Link href="/deadline-command-centre"><ArrowLeft/>Deadline Command Centre</Link></Button><Badge variant="outline"><CalendarClock className="size-3.5"/>Work-back Planner</Badge></div></header>
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6">
      <section className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#147d91]">Preparation before the deadline</p><h1 className="mt-2 font-serif text-4xl font-bold">Work backwards so the official date is not the first real deadline.</h1><p className="mt-3 max-w-3xl text-slate-600">For every dated official milestone already in your ScholarBridge pathway, this creates four preparation checkpoints at 28, 14, 7 and 2 days beforehand. They are planning reminders, not university deadlines.</p></div><div className="flex gap-2"><Button variant="outline" onClick={refresh}><RefreshCw/>Refresh</Button><Button onClick={saveAllFuture}><Plus/>Add all future checkpoints</Button></div></section>

      {!loaded ? <Card><CardContent className="p-8 text-center text-slate-500">Building work-back plan…</CardContent></Card> : <>
        <section className="grid gap-4 md:grid-cols-3"><Card className="border-0 bg-[#102a43] text-white shadow-none"><CardHeader><CardDescription className="text-white/60">Next preparation checkpoint</CardDescription><CardTitle className="font-serif text-xl">{next?.label || "No future checkpoint"}</CardTitle><CardDescription className="text-white/60">{next ? fmt(next.date) : "Your dated milestones are complete or not yet configured."}</CardDescription></CardHeader></Card><Card className="shadow-none"><CardHeader><CardDescription>Official dated milestones</CardDescription><CardTitle className="font-serif text-4xl">{officialTasks.filter(task => task.date).length}</CardTitle></CardHeader></Card><Card className="shadow-none"><CardHeader><CardDescription>Planning checkpoints saved</CardDescription><CardTitle className="font-serif text-4xl">{saved.length}</CardTitle></CardHeader></Card></section>

        <Card className="shadow-none"><CardHeader><CardTitle className="font-serif text-2xl">Work-back plan</CardTitle><CardDescription>{profile.university} · {profile.course} · {profile.year || "2027"} entry. Official source links stay attached to the parent milestone; these checkpoints remain clearly marked as internal planning.</CardDescription></CardHeader><CardContent className="space-y-3">{future.map(item => { const isSaved = saved.includes(item.id); return <div key={item.id} className={`grid gap-3 rounded-xl border p-4 md:grid-cols-[150px_1fr_auto] md:items-center ${isSaved ? "border-emerald-200 bg-emerald-50" : "bg-white"}`}><div><p className="font-semibold">{fmt(item.date)}</p><Badge variant="outline">{item.offsetDays} days before</Badge></div><div><strong>{item.label}</strong><p className="mt-1 text-sm leading-6 text-slate-600">{item.detail}</p><p className="mt-1 text-xs text-slate-500">Parent milestone: {item.taskLabel}</p></div><Button size="sm" variant={isSaved ? "default" : "outline"} onClick={() => saveCheckpoint(item)} disabled={isSaved}>{isSaved ? <CheckCircle2/> : <Plus/>}{isSaved ? "Added" : "Add to Command Centre"}</Button></div>})}{!future.length ? <p className="text-sm text-slate-500">No future dated milestones were available for this pathway.</p> : null}</CardContent></Card>

        <Card className="border-amber-200 bg-amber-50 shadow-none"><CardHeader><CardTitle className="font-serif text-xl">Keep official and internal dates separate</CardTitle><CardDescription>ScholarBridge work-back checkpoints are intentionally stored as personal targets. The original university milestone and source remain unchanged in the Deadline Command Centre.</CardDescription></CardHeader><CardContent><Button asChild variant="outline"><Link href="/deadline-command-centre">Review official + internal queue <ArrowRight/></Link></Button></CardContent></Card>
      </>}
    </div>
  </main>
}

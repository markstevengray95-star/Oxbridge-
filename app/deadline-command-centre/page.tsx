"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { ArrowLeft, CalendarClock, CalendarPlus, Check, Clock3, Download, ExternalLink, Plus, Trash2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import { tasksFor, type ApplicationTask, type UniversityChoice } from "@/lib/admissions-platform"

type Profile = { university?: UniversityChoice; course?: string; year?: string }
type CustomDeadline = { id: string; label: string; date: string; detail: string; category: "School" | "Personal" }
type Task = ApplicationTask & { custom?: boolean }

const CUSTOM_KEY = "oxbridge-custom-deadlines-v1"
const COMPLETED_KEY = "oxbridge-platform-tasks-v1"

function readJson<T>(key: string, fallback: T): T { try { return JSON.parse(localStorage.getItem(key) || "") as T } catch { return fallback } }
function daysUntil(date?: string) { return date ? Math.ceil((new Date(date).getTime() - Date.now()) / 86400000) : null }
function fmt(date?: string) { return date ? new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(date)) : "No fixed date" }
function escapeIcs(value: string) { return value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;") }
function icsDate(date: string) { return new Date(date).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z") }

export default function DeadlineCommandCentrePage() {
  const [profile, setProfile] = useState<Profile>({ university: "Both", course: "Physics", year: "2027" })
  const [completed, setCompleted] = useState<string[]>([])
  const [custom, setCustom] = useState<CustomDeadline[]>([])
  const [label, setLabel] = useState("")
  const [date, setDate] = useState("")
  const [detail, setDetail] = useState("")
  const [category, setCategory] = useState<CustomDeadline["category"]>("School")
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const savedProfile = readJson<Record<string, unknown>>("oxbridge-tutor-profile-v2", {})
    setProfile(current => ({ ...current, ...savedProfile } as Profile))
    setCompleted(readJson<string[]>(COMPLETED_KEY, []))
    setCustom(readJson<CustomDeadline[]>(CUSTOM_KEY, []))
    setLoaded(true)
  }, [])

  useEffect(() => { if (loaded) localStorage.setItem(COMPLETED_KEY, JSON.stringify(completed)) }, [completed, loaded])
  useEffect(() => { if (loaded) localStorage.setItem(CUSTOM_KEY, JSON.stringify(custom)) }, [custom, loaded])

  const officialTasks = useMemo(() => tasksFor(profile.university ?? "Both", profile.course ?? "Physics"), [profile.university, profile.course])
  const tasks = useMemo<Task[]>(() => [...officialTasks, ...custom.map(item => ({ id: item.id, label: item.label, date: item.date, detail: item.detail, category: "Preparation" as const, required: true, custom: true }))].sort((a, b) => {
    if (!a.date && !b.date) return 0
    if (!a.date) return 1
    if (!b.date) return -1
    return new Date(a.date).getTime() - new Date(b.date).getTime()
  }), [officialTasks, custom])

  const outstanding = tasks.filter(task => !completed.includes(task.id))
  const overdue = outstanding.filter(task => task.date && new Date(task.date).getTime() < Date.now())
  const urgent = outstanding.filter(task => { const days = daysUntil(task.date); return days !== null && days >= 0 && days <= 14 })
  const upcoming = outstanding.filter(task => { const days = daysUntil(task.date); return days !== null && days > 14 && days <= 60 })
  const next = outstanding.find(task => task.date && new Date(task.date).getTime() >= Date.now()) ?? outstanding[0]
  const completion = tasks.length ? Math.round(completed.filter(id => tasks.some(task => task.id === id)).length / tasks.length * 100) : 100

  function toggle(id: string) { setCompleted(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id]) }
  function addCustom() {
    if (!label.trim() || !date) return
    setCustom(current => [...current, { id: `custom-${Date.now()}`, label: label.trim(), date: new Date(date).toISOString(), detail: detail.trim() || `${category} deadline added by you.`, category }])
    setLabel(""); setDate(""); setDetail("")
  }
  function removeCustom(id: string) { setCustom(current => current.filter(item => item.id !== id)); setCompleted(current => current.filter(item => item !== id)) }
  function exportCalendar() {
    const dated = tasks.filter(task => task.date)
    const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//ScholarBridge//Deadline Command Centre//EN", ...dated.flatMap(task => ["BEGIN:VEVENT", `UID:${escapeIcs(task.id)}@scholarbridge`, `DTSTAMP:${icsDate(new Date().toISOString())}`, `DTSTART:${icsDate(task.date!)}`, `SUMMARY:${escapeIcs(task.label)}`, `DESCRIPTION:${escapeIcs(task.detail || "ScholarBridge application task")}`, "END:VEVENT"]), "END:VCALENDAR"]
    const url = URL.createObjectURL(new Blob([lines.join("\r\n")], { type: "text/calendar;charset=utf-8" }))
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = "scholarbridge-application-deadlines.ics"; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  return <main className="min-h-screen bg-[#f5f7f7] text-[#172b3a]">
    <header className="border-b bg-white"><div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4"><Button asChild variant="ghost"><Link href="/timeline"><ArrowLeft />Timeline</Link></Button><Badge variant="outline"><CalendarClock className="size-3.5"/>Deadline Command Centre</Badge></div></header>
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6">
      <section className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#147d91]">Application operations</p><h1 className="mt-2 font-serif text-4xl font-bold">Official milestones and your real school deadlines in one queue.</h1><p className="mt-3 max-w-3xl text-slate-600">Official tasks come from the existing ScholarBridge timeline data and retain their source links. Add internal school or personal deadlines separately so an early internal deadline never gets hidden behind the university date.</p></div><Button variant="outline" onClick={exportCalendar}><Download/>Export calendar</Button></section>

      <section className="grid gap-4 md:grid-cols-4"><Card className="border-0 bg-[#102a43] text-white shadow-none"><CardHeader><CardDescription className="text-white/60">Next action</CardDescription><CardTitle className="font-serif text-xl">{next?.label || "No outstanding task"}</CardTitle><CardDescription className="text-white/60">{next?.date ? fmt(next.date) : "Flexible"}</CardDescription></CardHeader></Card><Card className={overdue.length ? "border-rose-200 bg-rose-50 shadow-none" : "shadow-none"}><CardHeader><CardDescription>Overdue</CardDescription><CardTitle className="font-serif text-4xl">{overdue.length}</CardTitle></CardHeader></Card><Card className={urgent.length ? "border-amber-200 bg-amber-50 shadow-none" : "shadow-none"}><CardHeader><CardDescription>Next 14 days</CardDescription><CardTitle className="font-serif text-4xl">{urgent.length}</CardTitle></CardHeader></Card><Card className="shadow-none"><CardHeader><CardDescription>Overall completion</CardDescription><CardTitle className="font-serif text-4xl">{completion}%</CardTitle></CardHeader><CardContent><Progress value={completion}/></CardContent></Card></section>

      <div className="grid gap-5 xl:grid-cols-[.8fr_1.2fr]">
        <Card className="shadow-none"><CardHeader><CalendarPlus className="size-5 text-[#147d91]"/><CardTitle className="font-serif text-2xl">Add school / personal deadline</CardTitle><CardDescription>Add only your own internal deadlines here; official milestones remain separate and sourced.</CardDescription></CardHeader><CardContent className="space-y-3"><Input value={label} onChange={event => setLabel(event.target.value)} placeholder="e.g. School UCAS draft deadline"/><input type="datetime-local" className="h-10 w-full rounded-md border bg-white px-3 text-sm" value={date} onChange={event => setDate(event.target.value)}/><select className="h-10 w-full rounded-md border bg-white px-3 text-sm" value={category} onChange={event => setCategory(event.target.value as CustomDeadline["category"])}><option value="School">School deadline</option><option value="Personal">Personal target</option></select><Textarea rows={3} value={detail} onChange={event => setDetail(event.target.value)} placeholder="What needs to be ready by this point?"/><Button onClick={addCustom} disabled={!label.trim() || !date}><Plus/>Add deadline</Button></CardContent></Card>

        <Card className="shadow-none"><CardHeader><CardTitle className="font-serif text-2xl">Priority queue</CardTitle><CardDescription>Overdue first, then the next 14 days, then the following 60 days.</CardDescription></CardHeader><CardContent className="space-y-3">{[...overdue, ...urgent.filter(item => !overdue.includes(item)), ...upcoming.filter(item => !urgent.includes(item))].slice(0, 8).map(task => { const done = completed.includes(task.id); const days = daysUntil(task.date); return <div key={task.id} className="flex flex-col gap-3 rounded-xl border bg-white p-4 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><strong>{task.label}</strong><Badge variant="outline">{task.custom ? "Internal" : task.category}</Badge>{days !== null ? <Badge variant={days < 0 ? "destructive" : "outline"}>{days < 0 ? `${Math.abs(days)}d overdue` : days === 0 ? "Today" : `${days}d`}</Badge> : null}</div><p className="mt-1 text-sm text-slate-600">{task.detail}</p><p className="mt-1 text-xs text-slate-500">{fmt(task.date)}</p></div><div className="flex shrink-0 gap-2"><Button size="sm" variant={done ? "default" : "outline"} onClick={() => toggle(task.id)}><Check/>{done ? "Done" : "Mark done"}</Button>{task.officialUrl ? <Button asChild size="icon" variant="ghost"><a href={task.officialUrl} target="_blank" rel="noreferrer" aria-label="Open official source"><ExternalLink className="size-4"/></a></Button> : null}{task.custom ? <Button size="icon" variant="ghost" onClick={() => removeCustom(task.id)} aria-label="Delete custom deadline"><Trash2 className="size-4"/></Button> : null}</div></div>})}{!outstanding.length ? <p className="text-sm text-slate-500">No outstanding deadlines.</p> : null}</CardContent></Card>
      </div>

      <Card className="shadow-none"><CardHeader><CardTitle className="font-serif text-2xl">Full deadline register</CardTitle><CardDescription>{profile.university} · {profile.course} · {profile.year || "2027"} entry. Use source links for official milestones and confirm any change before acting.</CardDescription></CardHeader><CardContent className="space-y-2">{tasks.map(task => { const done = completed.includes(task.id); return <div key={task.id} className={`grid gap-3 rounded-xl border p-4 md:grid-cols-[minmax(0,1fr)_180px_auto] md:items-center ${done ? "bg-emerald-50" : "bg-white"}`}><div><div className="flex flex-wrap items-center gap-2"><strong>{task.label}</strong><Badge variant="outline">{task.custom ? "Internal" : task.category}</Badge>{task.required ? <Badge>Required</Badge> : null}</div><p className="mt-1 text-sm text-slate-600">{task.detail}</p></div><div className="text-sm"><Clock3 className="mr-1 inline size-4"/>{fmt(task.date)}</div><div className="flex gap-2"><Button size="sm" variant={done ? "default" : "outline"} onClick={() => toggle(task.id)}><Check/>{done ? "Done" : "Complete"}</Button>{task.officialUrl ? <Button asChild size="sm" variant="ghost"><a href={task.officialUrl} target="_blank" rel="noreferrer">Source <ExternalLink/></a></Button> : null}{task.custom ? <Button size="icon" variant="ghost" onClick={() => removeCustom(task.id)}><Trash2 className="size-4"/></Button> : null}</div></div>})}</CardContent></Card>
    </div>
  </main>
}

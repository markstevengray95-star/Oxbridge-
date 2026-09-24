"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { ArrowLeft, ArrowRight, BookOpenCheck, CheckCircle2, Layers3, RefreshCw, Sparkles } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import { readingRoomItems, type ReadingRoomItem } from "@/lib/reading-room"

const PROFILE_KEY = "oxbridge-tutor-profile-v2"
const CURRICULUM_KEY = "oxbridge-reading-curriculum-v1"
const PROGRESS_KEY = "oxbridge-tutor-progress-v2"

type Track = ReadingRoomItem["track"]
type CurriculumState = { weeks?: number; completed?: string[]; synthesis?: Record<string,string> }

const labels: Record<Track,string> = { physical:"Physical sciences", maths:"Mathematics", life:"Life sciences", law:"Law", humanities:"Humanities", economics:"Economics & PPE", languages:"Languages" }

function rotate<T>(items: T[], seed: number) {
  if (!items.length) return []
  const offset = seed % items.length
  return [...items.slice(offset), ...items.slice(0, offset)]
}

export default function ReadingCurriculumPage() {
  const [track, setTrack] = useState<Track>("physical")
  const [weeks, setWeeks] = useState(8)
  const [completed, setCompleted] = useState<string[]>([])
  const [synthesis, setSynthesis] = useState<Record<string,string>>({})

  useEffect(() => {
    try {
      const profile = JSON.parse(localStorage.getItem(PROFILE_KEY) || "{}") as { track?: Track }
      const saved = JSON.parse(localStorage.getItem(CURRICULUM_KEY) || "{}") as CurriculumState
      if (profile.track) setTrack(profile.track)
      if (saved.weeks) setWeeks(saved.weeks)
      if (Array.isArray(saved.completed)) setCompleted(saved.completed)
      if (saved.synthesis && typeof saved.synthesis === "object") setSynthesis(saved.synthesis)
    } catch { /* defaults */ }
  }, [])

  const pool = useMemo(() => readingRoomItems.filter(item => item.track === track), [track])
  const curriculum = useMemo(() => {
    const expanded = rotate(pool, weeks)
    return Array.from({ length: weeks }, (_, index) => {
      const first = expanded[index % Math.max(1, expanded.length)]
      const second = expanded[(index + Math.ceil(expanded.length / 2)) % Math.max(1, expanded.length)]
      return { week: index + 1, first, second, id: `${track}-${index+1}`, synthesis: `Compare the reasoning in “${first?.title ?? "Reading A"}” and “${second?.title ?? "Reading B"}”. Identify one assumption they share or reject, then explain what new evidence would most change your judgement.` }
    })
  }, [pool, track, weeks])

  function persist(nextCompleted = completed, nextSynthesis = synthesis, nextWeeks = weeks) {
    localStorage.setItem(CURRICULUM_KEY, JSON.stringify({ weeks: nextWeeks, completed: nextCompleted, synthesis: nextSynthesis, track, updatedAt: new Date().toISOString() }))
  }

  function toggle(id: string) {
    const next = completed.includes(id) ? completed.filter(item => item !== id) : [...completed, id]
    setCompleted(next); persist(next)
  }

  function saveSynthesis(id: string, value: string) {
    const next = { ...synthesis, [id]: value }
    setSynthesis(next); persist(completed, next)
    if (value.trim().length > 80) {
      try {
        const progress = JSON.parse(localStorage.getItem(PROGRESS_KEY) || "{}") as Record<string,unknown>
        const activities = Array.isArray(progress.activities) ? progress.activities as unknown[] : []
        const record = { title: `Reading synthesis · ${labels[track]}`, type: "Reading synthesis", learned: value.slice(0,700), question: curriculum.find(item => item.id === id)?.synthesis ?? "Synthesis", date: new Date().toISOString() }
        localStorage.setItem(PROGRESS_KEY, JSON.stringify({ ...progress, activities: [record, ...activities].slice(0,120) }))
      } catch { /* local curriculum remains saved */ }
    }
  }

  const percent = curriculum.length ? Math.round(completed.filter(id => curriculum.some(item => item.id === id)).length / curriculum.length * 100) : 0

  return <main className="min-h-screen bg-[#f4f7f7] text-[#172b3a]">
    <header className="border-b bg-white"><div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6"><Button asChild variant="ghost"><Link href="/tutor"><ArrowLeft />Personal Tutor</Link></Button><Badge variant="outline"><BookOpenCheck className="size-3.5" />Reading Curriculum</Badge></div></header>
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6">
      <section className="grid gap-5 lg:grid-cols-[1.15fr_.85fr]"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#147d91]">From isolated reading to academic conversation</p><h1 className="mt-2 font-serif text-4xl font-bold">A reading programme that comes back to ideas later.</h1><p className="mt-3 max-w-3xl leading-7 text-slate-600">Each week pairs two original academic extracts and finishes with synthesis rather than summary. Later tasks deliberately connect ideas, evidence and counterarguments across readings so the Tutor can test whether your thinking transfers.</p></div><Card className="border-0 bg-[#102a43] text-white"><CardHeader><CardDescription className="text-white/65">Current pathway</CardDescription><CardTitle className="font-serif text-3xl">{labels[track]}</CardTitle></CardHeader><CardContent><div className="mb-2 flex justify-between text-sm"><span>{completed.length}/{weeks} weeks</span><span>{percent}%</span></div><Progress value={percent} /></CardContent></Card></section>

      <Card><CardContent className="grid gap-4 p-4 md:grid-cols-[1fr_auto] md:items-end"><div><p className="mb-2 text-sm font-semibold">Subject pathway</p><div className="flex flex-wrap gap-2">{Object.entries(labels).map(([id,label]) => <Button key={id} size="sm" variant={track === id ? "default" : "outline"} onClick={() => { setTrack(id as Track); setCompleted([]); setSynthesis({}) }}>{label}</Button>)}</div></div><div><p className="mb-2 text-sm font-semibold">Programme length</p><div className="flex gap-2">{[6,8,12].map(value => <Button key={value} size="sm" variant={weeks === value ? "default" : "outline"} onClick={() => { setWeeks(value); setCompleted([]); persist([],{},value) }}>{value} weeks</Button>)}</div></div></CardContent></Card>

      <section className="space-y-4">{curriculum.map(item => <Card key={item.id} className={completed.includes(item.id) ? "border-emerald-200" : ""}><CardHeader><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex gap-2"><Badge>Week {item.week}</Badge>{completed.includes(item.id) && <Badge className="bg-emerald-700"><CheckCircle2 className="size-3.5" />Complete</Badge>}</div><CardTitle className="mt-2 font-serif text-2xl">Connect two different academic moves</CardTitle></div><Button size="sm" variant="outline" onClick={() => toggle(item.id)}>{completed.includes(item.id) ? "Mark incomplete" : "Mark week complete"}</Button></div></CardHeader><CardContent className="grid gap-5 lg:grid-cols-[1fr_1fr_.9fr]"><ReadingCard item={item.first} /><ReadingCard item={item.second} /><div className="rounded-2xl border border-[#b9dfe3] bg-[#edf7f8] p-4"><div className="flex items-center gap-2"><Layers3 className="size-5 text-[#147d91]" /><strong>Synthesis</strong></div><p className="mt-2 text-sm leading-6">{item.synthesis}</p><Textarea className="mt-3 bg-white" rows={6} value={synthesis[item.id] ?? ""} onChange={event => setSynthesis(current => ({...current,[item.id]:event.target.value}))} onBlur={event => saveSynthesis(item.id,event.target.value)} placeholder="Compare, test and revise—not just summarise…" /><div className="mt-3 flex gap-2"><Button asChild size="sm" variant="outline"><Link href="/reading-room">Open Reading Room <ArrowRight /></Link></Button><Button asChild size="sm"><Link href="/gemini-live-interview"><Sparkles />Discuss live</Link></Button></div></div></CardContent></Card>)}</section>
    </div>
  </main>
}

function ReadingCard({ item }: { item?: ReadingRoomItem }) {
  if (!item) return <div className="rounded-2xl border p-4 text-sm text-slate-500">No reading assigned.</div>
  return <div className="rounded-2xl border bg-white p-4"><div className="flex flex-wrap gap-2"><Badge variant="outline">{item.section}</Badge><Badge variant="outline">{item.level}</Badge><Badge variant="outline">{item.estimatedMinutes} min</Badge></div><h3 className="mt-3 font-serif text-xl font-bold">{item.title}</h3><p className="mt-2 line-clamp-5 text-sm leading-6 text-slate-600">{item.extract}</p><p className="mt-3 text-xs font-semibold uppercase tracking-wider text-[#147d91]">Interviewer challenge</p><p className="mt-1 text-sm leading-6">{item.challenge}</p></div>
}

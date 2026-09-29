"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { ArrowLeft, ArrowRight, BarChart3, ClipboardPlus, Loader2, RefreshCw, Target, Users } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"

type Skill = { label?: string; score?: number; domain?: string; href?: string; status?: string }
type Student = { userId: string; displayName: string; preparationScore: number; priority?: Skill | null; strongest?: Skill | null; updatedAt?: string | null }
type Assignment = { id: string; title: string; href: string; due_at?: string | null }
type ProgressRow = { assignment_id: string; user_id: string; status: string }
type OwnedDetail = { cohort: { id: string; name: string; course?: string | null; join_code: string }; students: Student[]; assignments: Assignment[]; progress: ProgressRow[] }
type SchoolData = { tier: string; owned: OwnedDetail[] }

function routeForPriority(priority?: Skill | null) {
  const label = `${priority?.domain || ""} ${priority?.label || ""}`.toLowerCase()
  if (/interview|reason|assumption|adapt/.test(label)) return "/interview-room"
  if (/essay|writing|evaluation|argument/.test(label)) return "/essay-tutor"
  if (/timing|paper|quant|test|accuracy/.test(label)) return "/paper-intervention"
  if (/application|defence/.test(label)) return "/application-defence"
  if (/reading|evidence|source/.test(label)) return "/reading-room"
  return priority?.href || "/tutor"
}

async function post(body: Record<string, unknown>) {
  const response = await fetch("/api/school", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
  const data = await response.json() as { error?: string }
  if (!response.ok) throw new Error(data.error || "Request failed")
  return data
}

export default function SchoolInsightsPage() {
  const [data, setData] = useState<SchoolData | null>(null)
  const [activeId, setActiveId] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [creating, setCreating] = useState(false)

  async function load() {
    setLoading(true); setError("")
    try {
      const response = await fetch("/api/school", { cache: "no-store" })
      const payload = await response.json() as SchoolData & { error?: string }
      if (!response.ok) throw new Error(payload.error || "Could not load classroom intelligence")
      setData(payload)
      setActiveId(current => current && payload.owned.some(item => item.cohort.id === current) ? current : payload.owned[0]?.cohort.id || "")
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not load classroom intelligence") }
    finally { setLoading(false) }
  }

  useEffect(() => { void load() }, [])
  const active = data?.owned.find(item => item.cohort.id === activeId) ?? data?.owned[0]

  const priorityGroups = useMemo(() => {
    const map = new Map<string, { label: string; students: Student[]; scoreTotal: number }>()
    for (const student of active?.students ?? []) {
      const label = student.priority?.label || "Build baseline"
      const entry = map.get(label) || { label, students: [], scoreTotal: 0 }
      entry.students.push(student)
      entry.scoreTotal += Number(student.priority?.score ?? 0)
      map.set(label, entry)
    }
    return [...map.values()].map(item => ({ ...item, average: item.students.length ? Math.round(item.scoreTotal / item.students.length) : 0 })).sort((a, b) => b.students.length - a.students.length || a.average - b.average)
  }, [active])

  const completion = useMemo(() => {
    if (!active?.students.length || !active.assignments.length) return 0
    const possible = active.students.length * active.assignments.length
    const completed = active.progress.filter(row => row.status === "completed").length
    return Math.round(completed / possible * 100)
  }, [active])

  const topPriority = priorityGroups[0]
  const topRoute = topPriority?.students[0] ? routeForPriority(topPriority.students[0].priority) : "/tutor"

  async function createIntervention() {
    if (!active || !topPriority || creating) return
    setCreating(true); setError("")
    try {
      await post({
        action: "createAssignment",
        cohortId: active.cohort.id,
        title: `Targeted follow-up: ${topPriority.label}`,
        description: `${topPriority.students.length} student${topPriority.students.length === 1 ? "" : "s"} currently show this as a priority. Complete the linked activity and add a short reflection on what changed.`,
        href: topRoute,
        dueAt: null,
      })
      await load()
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not create class intervention") }
    finally { setCreating(false) }
  }

  return <main className="min-h-screen bg-[#f5f7f7] text-[#172b3a]">
    <header className="border-b bg-white"><div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4"><Button asChild variant="ghost"><Link href="/school-dashboard"><ArrowLeft />School Dashboard</Link></Button><Badge variant="outline"><BarChart3 className="size-3.5"/>Classroom Intelligence</Badge></div></header>
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6">
      <section className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#147d91]">Teacher workload mode</p><h1 className="mt-2 font-serif text-4xl font-bold">See the class pattern, then assign the next useful task.</h1><p className="mt-3 max-w-3xl text-slate-600">This uses preparation summaries students already share with their cohort. It does not expose private tutor chat. Use Practice Tracking separately for managed practice-account transcripts.</p></div><Button variant="outline" onClick={() => void load()} disabled={loading}><RefreshCw className={loading ? "animate-spin" : ""}/>Refresh</Button></section>
      {error ? <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">{error}</div> : null}
      {loading && !data ? <Card><CardContent className="flex items-center gap-2 p-8"><Loader2 className="animate-spin"/>Loading cohorts…</CardContent></Card> : !data?.owned.length ? <Card><CardHeader><CardTitle>Create a cohort first</CardTitle><CardDescription>Classroom Intelligence appears once you own a School cohort.</CardDescription></CardHeader><CardContent><Button asChild><Link href="/school-dashboard">Open School Dashboard</Link></Button></CardContent></Card> : <>
        <div className="flex flex-wrap gap-2">{data.owned.map(item => <Button key={item.cohort.id} variant={(active?.cohort.id || "") === item.cohort.id ? "default" : "outline"} onClick={() => setActiveId(item.cohort.id)}>{item.cohort.name}</Button>)}</div>
        {active ? <>
          <section className="grid gap-4 md:grid-cols-3"><Card className="border-0 bg-[#102a43] text-white shadow-none"><CardHeader><CardDescription className="text-white/60">Students</CardDescription><CardTitle className="font-serif text-4xl">{active.students.length}</CardTitle></CardHeader></Card><Card className="shadow-none"><CardHeader><CardDescription>Assignments</CardDescription><CardTitle className="font-serif text-4xl">{active.assignments.length}</CardTitle></CardHeader></Card><Card className="shadow-none"><CardHeader><CardDescription>Completion</CardDescription><CardTitle className="font-serif text-4xl">{completion}%</CardTitle></CardHeader><CardContent><Progress value={completion}/></CardContent></Card></section>

          <div className="grid gap-5 xl:grid-cols-[1.1fr_.9fr]">
            <Card className="shadow-none"><CardHeader><Target className="size-5 text-[#147d91]"/><CardTitle className="font-serif text-2xl">Class-wide recurring priorities</CardTitle><CardDescription>Repeated priorities are grouped so one intervention can address several students at once.</CardDescription></CardHeader><CardContent className="space-y-3">{priorityGroups.map((group, index) => <div key={group.label} className="rounded-xl border bg-white p-4"><div className="flex flex-wrap items-center justify-between gap-2"><div><strong>{index + 1}. {group.label}</strong><p className="mt-1 text-xs text-slate-500">{group.students.length} student{group.students.length === 1 ? "" : "s"}{group.average ? ` · average priority signal ${group.average}%` : ""}</p></div><div className="flex flex-wrap gap-1">{group.students.slice(0,4).map(student => <Badge key={student.userId} variant="outline">{student.displayName}</Badge>)}</div></div></div>)}{!priorityGroups.length ? <p className="text-sm text-slate-500">Students need more practice evidence before class patterns can be separated from one-off results.</p> : null}</CardContent></Card>

            <Card className="border-[#cfe1e4] bg-[#edf7f8] shadow-none"><CardHeader><ClipboardPlus className="size-5 text-[#147d91]"/><CardTitle className="font-serif text-2xl">One-click class intervention</CardTitle><CardDescription>{topPriority ? `The most common current priority is ${topPriority.label}.` : "Build a baseline first."}</CardDescription></CardHeader><CardContent className="space-y-3">{topPriority ? <><p className="text-sm leading-6">Create a cohort assignment that sends students straight to the most relevant existing practice tool.</p><Button onClick={() => void createIntervention()} disabled={creating}>{creating ? <Loader2 className="animate-spin"/> : <ClipboardPlus/>}{creating ? "Creating…" : "Assign class follow-up"}</Button><Button asChild variant="outline"><Link href={topRoute}>Preview activity <ArrowRight/></Link></Button></> : null}</CardContent></Card>
          </div>

          <Card className="shadow-none"><CardHeader><div className="flex items-center gap-2"><Users className="size-5 text-[#147d91]"/><CardTitle className="font-serif text-2xl">Differentiated next-step map</CardTitle></div><CardDescription>Use individual priorities for small-group or one-to-one follow-up without labelling students by fixed ability.</CardDescription></CardHeader><CardContent className="grid gap-3 md:grid-cols-2">{active.students.map(student => { const route = routeForPriority(student.priority); return <div key={student.userId} className="rounded-xl border bg-white p-4"><div className="flex items-center justify-between gap-3"><div><strong>{student.displayName}</strong><p className="mt-1 text-xs text-slate-500">Preparation signal {student.updatedAt ? `${student.preparationScore}%` : "building baseline"}</p></div><Badge variant="outline">{student.priority?.label || "Baseline"}</Badge></div><div className="mt-3 flex gap-2"><Button asChild size="sm" variant="outline"><Link href={route}>Suggested practice <ArrowRight/></Link></Button></div></div>})}</CardContent></Card>
        </> : null}
      </>}
    </div>
  </main>
}

"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { ArrowLeft, ArrowRight, CalendarDays, CheckCircle2, Loader2, RefreshCw, Send, Target, Users } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

type Skill = { label?: string; score?: number; domain?: string; href?: string; status?: string }
type Student = { userId: string; displayName: string; preparationScore: number; priority?: Skill | null; strongest?: Skill | null; updatedAt?: string | null }
type OwnedDetail = { cohort: { id: string; name: string; course?: string | null }; students: Student[] }
type SchoolData = { owned: OwnedDetail[] }

type TaskSpec = { href: string; taskType: "paper" | "interview" | "essay" | "defence" | "reading" | "general"; label: string }

function specFor(priority?: Skill | null): TaskSpec {
  const text = `${priority?.domain || ""} ${priority?.label || ""}`.toLowerCase()
  if (/interview|reason|assumption|adapt/.test(text)) return { href: "/interview-replay", taskType: "interview", label: "Interview reasoning repair" }
  if (/essay|writing|evaluation|argument/.test(text)) return { href: "/essay-tutor", taskType: "essay", label: "Writing and argument repair" }
  if (/timing|paper|quant|test|accuracy/.test(text)) return { href: "/paper-intervention", taskType: "paper", label: "Admissions-test repair" }
  if (/application|defence/.test(text)) return { href: "/written-work-interview", taskType: "defence", label: "Application defence practice" }
  if (/reading|evidence|source/.test(text)) return { href: "/reading-room", taskType: "reading", label: "Evidence and reading practice" }
  return { href: priority?.href || "/tutor", taskType: "general", label: "Targeted preparation" }
}

async function targeted(body: Record<string, unknown>) {
  const response = await fetch("/api/school-targeted", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
  const data = await response.json() as { error?: string }
  if (!response.ok) throw new Error(data.error || "Could not create targeted assignment")
}

export default function SchoolDifferentiationPage() {
  const [data, setData] = useState<SchoolData | null>(null)
  const [activeId, setActiveId] = useState("")
  const [selected, setSelected] = useState<string[]>([])
  const [due, setDue] = useState("")
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")

  async function load() {
    setLoading(true); setError("")
    try {
      const response = await fetch("/api/school", { cache: "no-store" })
      const payload = await response.json() as SchoolData & { error?: string }
      if (!response.ok) throw new Error(payload.error || "Could not load cohorts")
      setData(payload)
      setActiveId(current => current && payload.owned.some(item => item.cohort.id === current) ? current : payload.owned[0]?.cohort.id || "")
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not load cohorts") }
    finally { setLoading(false) }
  }

  useEffect(() => { void load() }, [])
  const active = data?.owned.find(item => item.cohort.id === activeId) ?? data?.owned[0]

  const groups = useMemo(() => {
    const map = new Map<string, Student[]>()
    for (const student of active?.students ?? []) {
      const key = student.priority?.label || "Build baseline"
      map.set(key, [...(map.get(key) || []), student])
    }
    return [...map.entries()].sort((a, b) => b[1].length - a[1].length)
  }, [active])

  function toggle(userId: string) {
    setSelected(current => current.includes(userId) ? current.filter(id => id !== userId) : [...current, userId])
  }

  async function assignSelected() {
    if (!active || !selected.length || sending) return
    setSending(true); setError(""); setNotice("")
    const students = active.students.filter(student => selected.includes(student.userId))
    try {
      await Promise.all(students.map(student => {
        const spec = specFor(student.priority)
        return targeted({
          action: "createTargetedAssignment",
          cohortId: active.cohort.id,
          targetUserId: student.userId,
          title: `${spec.label}: ${student.priority?.label || "Build baseline"}`,
          description: `This task is targeted to your current preparation priority: ${student.priority?.label || "build a stronger baseline"}. Complete the linked activity, then add a short reflection on what changed.`,
          href: spec.href,
          taskType: spec.taskType,
          dueAt: due ? new Date(due).toISOString() : null,
          submissionRequired: false,
        })
      }))
      setNotice(`Assigned ${students.length} personalised task${students.length === 1 ? "" : "s"}. Each student can only see their own targeted assignment.`)
      setSelected([])
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not assign personalised tasks") }
    finally { setSending(false) }
  }

  function selectGroup(students: Student[]) {
    setSelected(students.map(student => student.userId))
  }

  return <main className="min-h-screen bg-[#f5f7f7] text-[#172b3a]">
    <header className="border-b bg-white"><div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4"><Button asChild variant="ghost"><Link href="/school-insights"><ArrowLeft />Classroom Intelligence</Link></Button><Badge variant="outline"><Target className="size-3.5"/>Differentiation Planner</Badge></div></header>
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6">
      <section className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#147d91]">Teacher assignment engine</p><h1 className="mt-2 font-serif text-4xl font-bold">Assign the next useful task to the right student.</h1><p className="mt-3 max-w-3xl text-slate-600">Select students by current priority, then create account-specific follow-up. These assignments are filtered on the server so other students in the cohort cannot see them.</p></div><Button variant="outline" onClick={() => void load()} disabled={loading}><RefreshCw className={loading ? "animate-spin" : ""}/>Refresh</Button></section>
      {error ? <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">{error}</div> : null}
      {notice ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950"><CheckCircle2 className="mr-2 inline size-4"/>{notice}</div> : null}
      {loading && !data ? <Card><CardContent className="flex items-center gap-2 p-8"><Loader2 className="animate-spin"/>Loading cohorts…</CardContent></Card> : !data?.owned.length ? <Card><CardHeader><CardTitle>Create a cohort first</CardTitle><CardDescription>Targeted assignments require a School cohort you own.</CardDescription></CardHeader><CardContent><Button asChild><Link href="/school-dashboard">Open School Dashboard</Link></Button></CardContent></Card> : <>
        <div className="flex flex-wrap gap-2">{data.owned.map(item => <Button key={item.cohort.id} variant={(active?.cohort.id || "") === item.cohort.id ? "default" : "outline"} onClick={() => { setActiveId(item.cohort.id); setSelected([]) }}>{item.cohort.name}</Button>)}</div>
        <section className="grid gap-5 xl:grid-cols-[1fr_360px]">
          <div className="space-y-4">{groups.map(([label, students]) => <Card key={label} className="shadow-none"><CardHeader><div className="flex flex-wrap items-center justify-between gap-3"><div><CardTitle className="font-serif text-2xl">{label}</CardTitle><CardDescription>{students.length} student{students.length === 1 ? "" : "s"} currently share this priority.</CardDescription></div><Button size="sm" variant="outline" onClick={() => selectGroup(students)}><Users/>Select group</Button></div></CardHeader><CardContent className="grid gap-3 md:grid-cols-2">{students.map(student => { const spec = specFor(student.priority); const checked = selected.includes(student.userId); return <button type="button" key={student.userId} onClick={() => toggle(student.userId)} className={`rounded-xl border p-4 text-left transition ${checked ? "border-[#147d91] bg-[#edf7f8] ring-2 ring-[#cfe1e4]" : "bg-white hover:border-slate-400"}`}><div className="flex items-start justify-between gap-3"><div><strong>{student.displayName}</strong><p className="mt-1 text-xs text-slate-500">Preparation signal {student.updatedAt ? `${student.preparationScore}%` : "building baseline"}</p></div><Badge variant={checked ? "default" : "outline"}>{checked ? "Selected" : "Select"}</Badge></div><p className="mt-3 text-sm font-semibold text-[#147d91]">{spec.label}</p><p className="mt-1 text-xs text-slate-500">Opens {spec.href}</p></button>})}</CardContent></Card>)}{!groups.length ? <Card><CardContent className="p-6 text-sm text-slate-500">Students need more saved preparation evidence before individual priorities can be generated.</CardContent></Card> : null}</div>

          <aside className="space-y-4 xl:sticky xl:top-20 xl:self-start"><Card className="border-0 bg-[#102a43] text-white shadow-none"><CardHeader><CardDescription className="text-white/60">Selected students</CardDescription><CardTitle className="font-serif text-4xl">{selected.length}</CardTitle><CardDescription className="text-white/60">Each receives a task matched to their own current priority.</CardDescription></CardHeader></Card><Card className="shadow-none"><CardHeader><CalendarDays className="size-5 text-[#147d91]"/><CardTitle className="font-serif text-xl">Optional deadline</CardTitle><CardDescription>Leave blank for an open-ended intervention.</CardDescription></CardHeader><CardContent className="space-y-3"><Input type="datetime-local" value={due} onChange={event => setDue(event.target.value)}/><Button className="w-full" onClick={() => void assignSelected()} disabled={!selected.length || sending}>{sending ? <Loader2 className="animate-spin"/> : <Send/>}{sending ? "Assigning…" : "Assign personalised tasks"}</Button><Button asChild variant="outline" className="w-full"><Link href="/school-classroom">Preview student classroom <ArrowRight/></Link></Button></CardContent></Card></aside>
        </section>
      </>}
    </div>
  </main>
}

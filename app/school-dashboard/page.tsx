"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { ArrowLeft, ArrowRight, ClipboardList, Download, Loader2, Plus, RefreshCw, School, Trash2, Users } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"

type Skill = { label?: string; score?: number; status?: string }
type Student = { userId: string; displayName: string; targetCourse?: string | null; targetUniversity?: string | null; applicationYear?: string | null; preparationScore: number; interviewCount: number; fullPaperCount: number; essayCount: number; priority?: Skill | null; strongest?: Skill | null; updatedAt?: string | null }
type Assignment = { id: string; title: string; description: string; href: string; due_at?: string | null; created_at: string }
type AssignmentProgress = { assignment_id: string; user_id: string; status: "not_started" | "in_progress" | "completed"; note?: string; updated_at?: string }
type Cohort = { id: string; name: string; course?: string | null; join_code: string; created_at: string }
type OwnedDetail = { cohort: Cohort; students: Student[]; assignments: Assignment[]; progress: AssignmentProgress[] }
type SchoolData = { tier: "free" | "pro" | "school"; owned: OwnedDetail[]; joined: unknown[] }

const taskOptions = [
  ["/tutor", "Personal Tutor session"],
  ["/interview-room", "Formal interview"],
  ["/full-papers", "Full admissions-test paper"],
  ["/paper-intervention", "Targeted paper intervention"],
  ["/essay-tutor", "Essay analysis"],
  ["/daily-challenge", "Daily challenge"],
  ["/tutorial-lab", "Tutorial Lab"],
  ["/application-defence", "Application defence"],
]

async function post(body: Record<string, unknown>) {
  const response = await fetch("/api/school", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
  const data = await response.json() as { error?: string; ok?: boolean }
  if (!response.ok) throw new Error(data.error || "Request failed")
  return data
}

function csvEscape(value: unknown) { return `"${String(value ?? "").replaceAll('"', '""')}"` }

export default function SchoolDashboardPage() {
  const [data, setData] = useState<SchoolData | null>(null)
  const [activeId, setActiveId] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [cohortName, setCohortName] = useState("")
  const [cohortCourse, setCohortCourse] = useState("")
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [href, setHref] = useState("/tutor")
  const [dueAt, setDueAt] = useState("")

  async function load() {
    setLoading(true); setError("")
    try {
      const response = await fetch("/api/school", { cache: "no-store" })
      const payload = await response.json() as SchoolData & { error?: string }
      if (!response.ok) throw new Error(payload.error || "Could not load school workspace")
      setData(payload)
      if (!activeId && payload.owned[0]?.cohort.id) setActiveId(payload.owned[0].cohort.id)
      if (activeId && !payload.owned.some(item => item.cohort.id === activeId)) setActiveId(payload.owned[0]?.cohort.id ?? "")
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not load school workspace") } finally { setLoading(false) }
  }

  useEffect(() => { void load() }, [])
  const active = data?.owned.find(item => item.cohort.id === activeId) ?? data?.owned[0]
  const averagePreparation = useMemo(() => {
    const values = (active?.students ?? []).map(student => student.preparationScore).filter(value => value > 0)
    return values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0
  }, [active])
  const completion = useMemo(() => {
    if (!active?.students.length || !active.assignments.length) return 0
    const possible = active.students.length * active.assignments.length
    const done = active.progress.filter(row => row.status === "completed").length
    return Math.round(done / possible * 100)
  }, [active])

  async function createCohort() {
    if (!cohortName.trim()) return
    setError("")
    try { await post({ action: "createCohort", name: cohortName, course: cohortCourse }); setCohortName(""); setCohortCourse(""); await load() } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not create cohort") }
  }

  async function createAssignment() {
    if (!active || !title.trim()) return
    setError("")
    try { await post({ action: "createAssignment", cohortId: active.cohort.id, title, description, href, dueAt: dueAt ? new Date(dueAt).toISOString() : null }); setTitle(""); setDescription(""); setDueAt(""); await load() } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not create assignment") }
  }

  async function deleteAssignment(id: string) {
    if (!window.confirm("Delete this assignment for the cohort?")) return
    try { await post({ action: "deleteAssignment", assignmentId: id }); await load() } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not delete assignment") }
  }

  function exportCsv() {
    if (!active) return
    const header = ["Student", "University", "Course", "Application year", "Preparation score", "Interviews", "Full papers", "Essay analyses", "Current priority", "Strongest area"]
    const rows = active.students.map(student => [student.displayName, student.targetUniversity, student.targetCourse, student.applicationYear, student.preparationScore || "", student.interviewCount, student.fullPaperCount, student.essayCount, student.priority?.label || "", student.strongest?.label || ""])
    const csv = [header, ...rows].map(row => row.map(csvEscape).join(",")).join("\n")
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }))
    const a = document.createElement("a"); a.href = url; a.download = `${active.cohort.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-progress.csv`; a.click(); URL.revokeObjectURL(url)
  }

  return <main className="min-h-screen bg-[#f5f7f7] text-[#172b3a]">
    <header className="border-b bg-white"><div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4"><Button asChild variant="ghost"><Link href="/tutor"><ArrowLeft />Personal Tutor</Link></Button><div className="flex gap-2"><Badge variant="outline"><School className="size-3.5" />School Dashboard</Badge><Button asChild size="sm" variant="outline"><Link href="/school-classroom">Student Classroom</Link></Button></div></div></header>
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8">
      <section className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#147d91]">School-plan workspace</p><h1 className="mt-2 font-serif text-4xl font-bold">Cohorts, assignments and preparation evidence.</h1><p className="mt-3 max-w-3xl text-slate-600">Students join deliberately with a cohort code. The dashboard shows preparation summaries and assignment completion, not private tutor conversations or full interview transcripts.</p></div><Button variant="outline" onClick={() => void load()} disabled={loading}><RefreshCw className={loading ? "animate-spin" : ""} />Refresh</Button></section>
      {error && <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">{error}</div>}
      {loading && !data ? <Card className="shadow-none"><CardContent className="flex items-center gap-3 p-6"><Loader2 className="animate-spin" />Loading school workspace…</CardContent></Card> : <>
        <Card className="shadow-none"><CardHeader><CardTitle className="font-serif text-2xl">Create cohort</CardTitle><CardDescription>Each cohort gets a private join code that students enter from Student Classroom.</CardDescription></CardHeader><CardContent className="grid gap-3 md:grid-cols-[1fr_1fr_auto]"><input className="h-10 rounded-md border bg-white px-3 text-sm" value={cohortName} onChange={event => setCohortName(event.target.value)} placeholder="Cohort name, e.g. 2027 Oxbridge Physics" /><input className="h-10 rounded-md border bg-white px-3 text-sm" value={cohortCourse} onChange={event => setCohortCourse(event.target.value)} placeholder="Course / focus" /><Button onClick={() => void createCohort()} disabled={!cohortName.trim()}><Plus />Create</Button></CardContent></Card>
        {data?.owned.length ? <>
          <div className="flex flex-wrap gap-2">{data.owned.map(item => <Button key={item.cohort.id} variant={(active?.cohort.id ?? "") === item.cohort.id ? "default" : "outline"} onClick={() => setActiveId(item.cohort.id)}>{item.cohort.name}</Button>)}</div>
          {active && <>
            <section className="grid gap-3 md:grid-cols-4"><Card className="border-0 bg-[#102a43] text-white shadow-none"><CardHeader><CardDescription className="text-white/60">Students</CardDescription><CardTitle className="font-serif text-4xl">{active.students.length}</CardTitle></CardHeader></Card><Card className="shadow-none"><CardHeader><CardDescription>Average preparation</CardDescription><CardTitle className="font-serif text-4xl">{averagePreparation || "—"}{averagePreparation ? "%" : ""}</CardTitle></CardHeader></Card><Card className="shadow-none"><CardHeader><CardDescription>Assignment completion</CardDescription><CardTitle className="font-serif text-4xl">{completion}%</CardTitle></CardHeader><CardContent><Progress value={completion} /></CardContent></Card><Card className="border-[#b9d8dd] bg-[#edf7f8] shadow-none"><CardHeader><CardDescription>Student join code</CardDescription><CardTitle className="font-mono text-3xl tracking-[.18em]">{active.cohort.join_code}</CardTitle></CardHeader></Card></section>
            <section className="grid gap-5 xl:grid-cols-[1.15fr_.85fr]"><Card className="shadow-none"><CardHeader><div className="flex items-center justify-between gap-2"><div><CardTitle className="font-serif text-2xl">Student preparation overview</CardTitle><CardDescription>Aggregate coaching evidence from each student's Personal Tutor profile.</CardDescription></div><Button size="sm" variant="outline" onClick={exportCsv}><Download />Export CSV</Button></div></CardHeader><CardContent className="overflow-x-auto"><table className="w-full min-w-[760px] text-sm"><thead><tr className="border-b text-left text-xs uppercase tracking-wider text-slate-500"><th className="p-2">Student</th><th className="p-2">Preparation</th><th className="p-2">Activity</th><th className="p-2">Current priority</th><th className="p-2">Strongest</th></tr></thead><tbody>{active.students.map(student => <tr key={student.userId} className="border-b last:border-0"><td className="p-2"><strong>{student.displayName}</strong><p className="text-xs text-slate-500">{student.targetCourse || active.cohort.course || "Course not set"}</p></td><td className="p-2"><div className="flex items-center gap-2"><Progress value={student.preparationScore} className="w-24" /><strong>{student.preparationScore || "—"}{student.preparationScore ? "%" : ""}</strong></div></td><td className="p-2 text-xs text-slate-600">{student.interviewCount} interviews · {student.fullPaperCount} papers · {student.essayCount} essays</td><td className="p-2"><Badge variant="outline">{student.priority?.label || "Building baseline"}</Badge></td><td className="p-2">{student.strongest?.label || "—"}</td></tr>)}{!active.students.length && <tr><td className="p-4 text-slate-500" colSpan={5}>No students have joined this cohort yet. Share the join code above.</td></tr>}</tbody></table></CardContent></Card>
              <Card className="shadow-none"><CardHeader><ClipboardList className="size-5 text-[#147d91]" /><CardTitle className="font-serif text-2xl">Assign preparation</CardTitle></CardHeader><CardContent className="space-y-3"><input className="h-10 w-full rounded-md border bg-white px-3 text-sm" value={title} onChange={event => setTitle(event.target.value)} placeholder="Assignment title" /><Textarea rows={4} value={description} onChange={event => setDescription(event.target.value)} placeholder="What should students focus on?" /><select className="h-10 w-full rounded-md border bg-white px-3 text-sm" value={href} onChange={event => setHref(event.target.value)}>{taskOptions.map(([path, label]) => <option key={path} value={path}>{label}</option>)}</select><label className="block"><span className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">Due date (optional)</span><input type="datetime-local" className="h-10 w-full rounded-md border bg-white px-3 text-sm" value={dueAt} onChange={event => setDueAt(event.target.value)} /></label><Button className="w-full" onClick={() => void createAssignment()} disabled={!title.trim()}><Plus />Create assignment</Button></CardContent></Card></section>
            <Card className="shadow-none"><CardHeader><CardTitle className="font-serif text-2xl">Assignments</CardTitle></CardHeader><CardContent className="space-y-3">{active.assignments.map(assignment => { const rows = active.progress.filter(row => row.assignment_id === assignment.id); const done = rows.filter(row => row.status === "completed").length; const pct = active.students.length ? Math.round(done / active.students.length * 100) : 0; return <div key={assignment.id} className="grid gap-3 rounded-2xl border bg-white p-4 md:grid-cols-[1fr_220px_auto] md:items-center"><div><div className="flex flex-wrap gap-2"><strong>{assignment.title}</strong>{assignment.due_at && <Badge variant="outline">Due {new Date(assignment.due_at).toLocaleDateString("en-GB")}</Badge>}</div><p className="mt-1 text-sm text-slate-600">{assignment.description || assignment.href}</p></div><div><div className="flex justify-between text-xs"><span>{done}/{active.students.length} complete</span><span>{pct}%</span></div><Progress value={pct} className="mt-1" /></div><div className="flex gap-1"><Button asChild size="sm" variant="outline"><Link href={assignment.href}>Open <ArrowRight /></Link></Button><Button size="icon" variant="ghost" onClick={() => void deleteAssignment(assignment.id)}><Trash2 className="size-4" /></Button></div></div>})}{!active.assignments.length && <p className="text-sm text-slate-500">No assignments yet.</p>}</CardContent></Card>
          </>}
        </> : <Card className="shadow-none"><CardHeader><Users className="size-6 text-[#147d91]" /><CardTitle className="font-serif text-2xl">Create your first cohort</CardTitle><CardDescription>The cloud workspace is ready; add a cohort above, then share its join code with students.</CardDescription></CardHeader></Card>}
      </>}
    </div>
  </main>
}

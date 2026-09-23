"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2, RefreshCw, School } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"

type Assignment = { id: string; title: string; description: string; href: string; due_at?: string | null; created_at: string }
type OwnProgress = { assignment_id: string; status: "not_started" | "in_progress" | "completed"; note?: string; updated_at?: string }
type JoinedDetail = { cohort: { id: string; name: string; course?: string | null; role?: string }; assignments: Assignment[]; progress: OwnProgress[] }
type SchoolResponse = { tier: string; joined: JoinedDetail[]; owned: unknown[] }

async function post(body: Record<string, unknown>) {
  const response = await fetch("/api/school", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
  const data = await response.json() as { error?: string; ok?: boolean }
  if (!response.ok) throw new Error(data.error || "Request failed")
  return data
}

export default function SchoolClassroomPage() {
  const [data, setData] = useState<SchoolResponse | null>(null)
  const [joinCode, setJoinCode] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  async function load() {
    setLoading(true); setError("")
    try {
      const response = await fetch("/api/school", { cache: "no-store" })
      const payload = await response.json() as SchoolResponse & { error?: string }
      if (!response.ok) throw new Error(payload.error || "Could not load classroom")
      setData(payload)
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not load classroom") } finally { setLoading(false) }
  }
  useEffect(() => { void load() }, [])

  async function join() {
    if (!joinCode.trim()) return
    try { await post({ action: "joinCohort", joinCode }); setJoinCode(""); await load() } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not join cohort") }
  }

  async function update(assignmentId: string, status: OwnProgress["status"]) {
    try { await post({ action: "updateAssignmentStatus", assignmentId, status }); await load() } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not update assignment") }
  }

  const assignments = useMemo(() => (data?.joined ?? []).flatMap(item => item.assignments.map(assignment => ({ ...assignment, cohort: item.cohort, progress: item.progress.find(row => row.assignment_id === assignment.id) }))), [data])
  const completed = assignments.filter(item => item.progress?.status === "completed").length
  const completion = assignments.length ? Math.round(completed / assignments.length * 100) : 0

  return <main className="min-h-screen bg-[#f5f7f7] text-[#172b3a]">
    <header className="border-b bg-white"><div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4"><Button asChild variant="ghost"><Link href="/tutor"><ArrowLeft />Personal Tutor</Link></Button><Badge variant="outline"><School className="size-3.5" />Student Classroom</Badge></div></header>
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <section><p className="text-xs font-bold uppercase tracking-[.18em] text-[#147d91]">School preparation workspace</p><h1 className="mt-2 font-serif text-4xl font-bold">Join a cohort and complete assigned preparation.</h1><p className="mt-3 max-w-3xl text-slate-600">Joining is explicit: enter the code provided by the teacher. The school dashboard receives high-level preparation evidence and assignment completion, not your private tutor chat or full interview transcripts.</p></section>
      {error && <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">{error}</div>}
      <Card className="shadow-none"><CardHeader><CardTitle className="font-serif text-2xl">Join cohort</CardTitle><CardDescription>Codes are supplied by a School-plan cohort owner.</CardDescription></CardHeader><CardContent className="flex flex-col gap-2 sm:flex-row"><input className="h-10 flex-1 rounded-md border bg-white px-3 font-mono text-sm uppercase tracking-[.15em]" value={joinCode} onChange={event => setJoinCode(event.target.value.toUpperCase())} placeholder="JOIN CODE" /><Button onClick={() => void join()} disabled={!joinCode.trim()}>Join cohort</Button><Button variant="outline" onClick={() => void load()} disabled={loading}><RefreshCw className={loading ? "animate-spin" : ""} /></Button></CardContent></Card>
      {loading && !data ? <Card className="shadow-none"><CardContent className="flex items-center gap-3 p-6"><Loader2 className="animate-spin" />Loading assignments…</CardContent></Card> : <>
        <section className="grid gap-4 md:grid-cols-3"><Card className="border-0 bg-[#102a43] text-white shadow-none"><CardHeader><CardDescription className="text-white/60">Joined cohorts</CardDescription><CardTitle className="font-serif text-4xl">{data?.joined.length ?? 0}</CardTitle></CardHeader></Card><Card className="shadow-none"><CardHeader><CardDescription>Assignments</CardDescription><CardTitle className="font-serif text-4xl">{assignments.length}</CardTitle></CardHeader></Card><Card className="shadow-none"><CardHeader><CardDescription>Completed</CardDescription><CardTitle className="font-serif text-4xl">{completion}%</CardTitle></CardHeader><CardContent><Progress value={completion} /></CardContent></Card></section>
        {(data?.joined ?? []).length ? (data?.joined ?? []).map(item => <Card key={item.cohort.id} className="shadow-none"><CardHeader><div className="flex items-center justify-between gap-3"><div><CardTitle className="font-serif text-2xl">{item.cohort.name}</CardTitle><CardDescription>{item.cohort.course || "Oxbridge preparation"}</CardDescription></div><Badge variant="outline">Student</Badge></div></CardHeader><CardContent className="space-y-3">{item.assignments.map(assignment => { const status = item.progress.find(row => row.assignment_id === assignment.id)?.status ?? "not_started"; return <div key={assignment.id} className={`rounded-2xl border p-4 ${status === "completed" ? "border-emerald-200 bg-emerald-50" : "bg-white"}`}><div className="flex flex-col justify-between gap-3 md:flex-row md:items-center"><div><div className="flex flex-wrap items-center gap-2"><strong>{assignment.title}</strong><Badge variant="outline">{status.replace("_", " ")}</Badge>{assignment.due_at && <Badge variant="outline">Due {new Date(assignment.due_at).toLocaleDateString("en-GB")}</Badge>}</div><p className="mt-1 text-sm leading-6 text-slate-600">{assignment.description || "Complete the linked preparation activity."}</p></div><div className="flex flex-wrap gap-2"><Button asChild size="sm"><Link href={assignment.href}>Open task <ArrowRight /></Link></Button>{status !== "in_progress" && status !== "completed" && <Button size="sm" variant="outline" onClick={() => void update(assignment.id, "in_progress")}>Started</Button>}{status !== "completed" && <Button size="sm" variant="outline" onClick={() => void update(assignment.id, "completed")}><CheckCircle2 />Mark complete</Button>}</div></div></div>})}{!item.assignments.length && <p className="text-sm text-slate-500">No assignments have been set yet.</p>}</CardContent></Card>) : <Card className="shadow-none"><CardHeader><CardTitle className="font-serif text-2xl">No cohort joined yet</CardTitle><CardDescription>Enter a teacher-provided code above. Your normal Personal Tutor preparation still works independently.</CardDescription></CardHeader></Card>}
      </>}
    </div>
  </main>
}

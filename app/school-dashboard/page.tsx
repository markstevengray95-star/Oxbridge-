"use client"

import Link from "next/link"
import { ProgressWorkspace } from "@/components/school/progress-workspace"
import { csvCell, cohortAssignmentSummary, assignmentSummary } from "@/lib/school/progress"
import { useEffect, useMemo, useState } from "react"
import { ArrowLeft, ArrowRight, ClipboardList, Download, Loader2, Plus, RefreshCw, School, Trash2, Users } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import {upcomingSchoolAssignments} from "@/lib/staff-dashboard"
import { Textarea } from "@/components/ui/textarea"

type Skill = { label?: string; score?: number; status?: string }
type Student = { userId: string; displayName: string; targetCourse?: string | null; targetUniversity?: string | null; applicationYear?: string | null; preparationScore: number; interviewCount: number; fullPaperCount: number; essayCount: number; priority?: Skill | null; strongest?: Skill | null; updatedAt?: string | null }
type Assignment = { id: string; title: string; description: string; href: string; due_at?: string | null; created_at: string; target_user_id?: string | null; task_type?: string; submission_required?: boolean }
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
  ["/tutor#academic-coach", "Academic coaching"],
  ["/assessment-report", "Academic assessment review"],
  ["/preparation-pathway", "Personal preparation pathway"],
  ["/supercurricular-coach", "Supercurricular exploration"],
]

async function post(body: Record<string, unknown>) {
  const response = await fetch("/api/school", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
  const data = await response.json() as { error?: string; ok?: boolean }
  if (!response.ok) throw new Error(data.error || "Request failed")
  return data
}

const csvEscape = csvCell

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
  const [targetId,setTargetId]=useState("")
  const [saving,setSaving]=useState(false)
  const [notice,setNotice]=useState("")

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
    const values = (active?.students ?? []).filter(student => student.updatedAt).map(student => student.preparationScore).filter(Number.isFinite)
    return values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : null
  }, [active])
  const completion=active?cohortAssignmentSummary(active,Date.now()).percent:null
  const dueSoon=active?upcomingSchoolAssignments(active.assignments).slice(0,4):[]

  async function createCohort() {
    if (!cohortName.trim()) return
    setError("")
    try { await post({ action: "createCohort", name: cohortName, course: cohortCourse }); setCohortName(""); setCohortCourse(""); await load() } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not create cohort") }
  }

  async function createAssignment() {
    if (!active || !title.trim() || saving) return
    if(targetId&&!active.students.some(s=>s.userId===targetId)){setError("Choose a pupil in the active cohort.");return}
    setSaving(true);setError("");setNotice("")
    try {
      const task={cohortId:active.cohort.id,title,description,href,dueAt:dueAt?new Date(dueAt).toISOString():null}
      if(targetId){
       const response=await fetch("/api/school-targeted",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...task,action:"createTargetedAssignment",targetUserId:targetId,taskType:href.includes("paper")?"paper":href.includes("interview")?"interview":href.includes("essay")?"essay":href.includes("defence")?"defence":href.includes("supercurricular")?"reading":"general",submissionRequired:true})})
       const result=await response.json() as {error?:string}
       if(!response.ok)throw new Error(result.error||"Could not assign individual task")
      }else await post({...task,action:"createAssignment"})
      setNotice(targetId?"Individual intervention assigned.":"Cohort assignment created.");setTitle("");setDescription("");setDueAt("");await load()
    }catch(cause){setError(cause instanceof Error?cause.message:"Could not create assignment")}finally{setSaving(false)}
  }

  async function deleteAssignment(id: string) {
    if (!window.confirm("Delete this assignment for the cohort?")) return
    try { await post({ action: "deleteAssignment", assignmentId: id }); await load() } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not delete assignment") }
  }

  function exportCsv() {
    if (!active) return
    const header = ["Student", "University", "Course", "Application year", "Preparation score", "Interviews", "Full papers", "Essay analyses", "Current priority", "Strongest area"]
    const rows = active.students.map(student => [student.displayName, student.targetUniversity, student.targetCourse, student.applicationYear, student.updatedAt ? student.preparationScore : "", student.interviewCount, student.fullPaperCount, student.essayCount, student.priority?.label || "", student.strongest?.label || ""])
    const csv = [header, ...rows].map(row => row.map(csvEscape).join(",")).join("\n")
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }))
    const a = document.createElement("a"); a.href = url; a.download = `${active.cohort.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-progress.csv`; a.click(); URL.revokeObjectURL(url)
  }

  return <main className="fellow-ui min-h-screen">
    <header className="border-b bg-white"><div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4"><Button asChild variant="ghost"><Link href="/teacher-dashboard"><ArrowLeft />Teacher overview</Link></Button><div className="flex gap-2"><Badge variant="outline"><School className="size-3.5" />School Dashboard</Badge><Button asChild size="sm" variant="outline"><Link href="/school-classroom">Student Classroom</Link></Button></div></div></header>
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8">
      <section className="fellow-page-header flex flex-col justify-between gap-4 lg:flex-row lg:items-end"><div><p className="fellow-eyebrow">School workspace</p><h1 className="fellow-page-title mt-2">Cohorts, assignments and preparation evidence.</h1><p className="fellow-description mt-3">Students join deliberately with a cohort code. The dashboard shows preparation summaries and assignment completion, not private tutor conversations or full interview transcripts.</p></div><Button variant="outline" onClick={() => void load()} disabled={loading}><RefreshCw className={loading ? "animate-spin" : ""} />Refresh</Button></section>
      {error && <div role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">{error}</div>}
      {loading && !data ? <Card className="shadow-none"><CardContent className="flex items-center gap-3 p-6"><Loader2 className="animate-spin" />Loading school workspace…</CardContent></Card> : <>
        <section className="fellow-panel p-4"><details open={!data?.owned.length}><summary className="cursor-pointer text-sm font-semibold text-[#142d3e]">Create a new cohort</summary><Card className="mt-3 shadow-none"><CardHeader><CardTitle className="font-serif text-2xl">Create cohort</CardTitle><CardDescription>Each cohort gets a private join code that students enter from Student Classroom.</CardDescription></CardHeader><CardContent className="grid gap-3 md:grid-cols-[1fr_1fr_auto]"><input className="h-10 rounded-md border bg-white px-3 text-sm" value={cohortName} onChange={event => setCohortName(event.target.value)} aria-label="New cohort name" placeholder="Cohort name, e.g. 2027 Oxbridge Physics" /><input className="h-10 rounded-md border bg-white px-3 text-sm" value={cohortCourse} onChange={event => setCohortCourse(event.target.value)} aria-label="Cohort course or focus" placeholder="Course / focus" /><Button onClick={() => void createCohort()} disabled={!cohortName.trim()}><Plus />Create</Button></CardContent></Card></details></section>
        {data?.owned.length ? <>
          <div className="flex flex-wrap gap-2">{data.owned.map(item => <Button key={item.cohort.id} variant={(active?.cohort.id ?? "") === item.cohort.id ? "default" : "outline"} onClick={() => {setActiveId(item.cohort.id);setTargetId("");setNotice("")}}>{item.cohort.name}</Button>)}</div>
          {active && <>
            <section aria-label="School workspace actions" className="fellow-panel flex flex-wrap items-center gap-3 p-4"><span className="mr-auto text-sm font-semibold">Manage {active.cohort.name}</span><Button asChild size="sm" variant="outline"><Link href="/teacher-dashboard">Teacher tracking</Link></Button><Button asChild size="sm" variant="outline"><Link href="/school-insights">Cohort insights</Link></Button><Button asChild size="sm" variant="outline"><Link href="/school-reports">Export reports</Link></Button><Button asChild size="sm" variant="outline"><Link href="/school/teachers">Teacher access</Link></Button></section>
            <section className="grid gap-3 md:grid-cols-4"><Card className="border-0 bg-[#102a43] text-white shadow-none"><CardHeader><CardDescription className="text-white/60">Students</CardDescription><CardTitle className="font-serif text-4xl">{active.students.length}</CardTitle></CardHeader></Card><Card className="shadow-none"><CardHeader><CardDescription>Average preparation</CardDescription><CardTitle className="font-serif text-4xl">{averagePreparation ?? "—"}{averagePreparation !== null ? "%" : ""}</CardTitle></CardHeader></Card><Card className="shadow-none"><CardHeader><CardDescription>Assignment completion</CardDescription><CardTitle className="font-serif text-4xl">{completion===null?"—":completion+"%"}</CardTitle></CardHeader><CardContent><Progress value={completion??0} /></CardContent></Card><Card className="border-[#b9d8dd] bg-[#edf7f8] shadow-none"><CardHeader><CardDescription>Student join code</CardDescription><CardTitle className="font-mono text-3xl tracking-[.18em]">{active.cohort.join_code}</CardTitle></CardHeader></Card></section>
            {dueSoon.length>0&&<section aria-label="Upcoming school deadlines" className="fellow-panel p-4 sm:p-5"><h2 className="fellow-section-title">Upcoming deadlines</h2><p className="mt-1 text-sm text-slate-600">Assignments due within seven days, including overdue tasks.</p><div className="mt-3 grid gap-2 sm:grid-cols-2">{dueSoon.map(task=><div key={task.id} className="fellow-soft flex flex-wrap items-center justify-between gap-2 p-3"><span className="text-sm font-semibold">{task.title}</span><span className="text-xs text-[#576875]">{task.due_at?new Date(task.due_at).toLocaleDateString("en-GB"):""}</span></div>)}</div></section>}
            <details className="fellow-panel p-4"><summary className="cursor-pointer text-sm font-semibold">Detailed cohort progress analysis</summary><div className="mt-4"><ProgressWorkspace key={active.cohort.id} detail={active} /></div></details>
            <section className="grid gap-5 xl:grid-cols-[1.15fr_.85fr]"><Card className="shadow-none"><CardHeader><div className="flex items-center justify-between gap-2"><div><CardTitle className="font-serif text-2xl">Student preparation overview</CardTitle><CardDescription>Aggregate coaching evidence from each student's Personal Tutor profile.</CardDescription></div><Button size="sm" variant="outline" onClick={exportCsv}><Download />Export CSV</Button></div></CardHeader><CardContent className="overflow-x-auto"><table className="w-full min-w-[760px] text-sm"><thead><tr className="border-b text-left text-xs uppercase tracking-wider text-slate-500"><th className="p-2">Student</th><th className="p-2">Preparation</th><th className="p-2">Activity</th><th className="p-2">Current priority</th><th className="p-2">Strongest</th></tr></thead><tbody>{active.students.map(student => <tr key={student.userId} className="border-b last:border-0"><td className="p-2"><strong>{student.displayName}</strong><p className="text-xs text-slate-500">{student.targetCourse || active.cohort.course || "Course not set"}</p></td><td className="p-2"><div className="flex items-center gap-2"><Progress value={student.preparationScore} className="w-24" /><strong>{student.updatedAt ? `${student.preparationScore}%` : "—"}</strong></div></td><td className="p-2 text-xs text-slate-600">{student.interviewCount} interviews · {student.fullPaperCount} papers · {student.essayCount} essays</td><td className="p-2"><Badge variant="outline">{student.priority?.label || "Building baseline"}</Badge></td><td className="p-2">{student.strongest?.label || "—"}</td></tr>)}{!active.students.length && <tr><td className="p-4 text-slate-500" colSpan={5}>No students have joined this cohort yet. Share the join code above.</td></tr>}</tbody></table></CardContent></Card>
              <details className="fellow-panel"><summary className="cursor-pointer p-4 font-semibold">Create assignment or intervention</summary><Card className="border-0 shadow-none"><CardHeader><ClipboardList className="size-5 text-[#326d71]" /><CardTitle className="font-serif text-2xl">Assign preparation or intervention</CardTitle></CardHeader><CardContent className="space-y-3"><label className="block text-sm font-semibold">Assign to<select className="mt-1 h-10 w-full rounded-md border bg-white px-3 text-sm" value={targetId} onChange={e=>setTargetId(e.target.value)}><option value="">Whole cohort</option>{active.students.map(s=><option key={s.userId} value={s.userId}>{s.displayName}</option>)}</select></label><button type="button" className="rounded-lg border px-3 py-2 text-sm" onClick={()=>{setTitle("Targeted reasoning follow-up");setDescription("Baseline: review one previous response and identify the missing reasoning step. Practice: complete a fresh task. Success criterion: explain the new answer and test an assumption without consulting the solution. Reflection: record what changed and what still needs checking.");setHref("/tutor#academic-coach")}}>Use intervention template</button>{notice&&<p role="status" className="text-sm">{notice}</p>}<input className="h-10 w-full rounded-md border bg-white px-3 text-sm" value={title} onChange={event => setTitle(event.target.value)} placeholder="Assignment title" /><Textarea rows={4} value={description} onChange={event => setDescription(event.target.value)} placeholder="What should students focus on?" /><select className="h-10 w-full rounded-md border bg-white px-3 text-sm" value={href} onChange={event => setHref(event.target.value)}>{taskOptions.map(([path, label]) => <option key={path} value={path}>{label}</option>)}</select><label className="block"><span className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">Due date (optional)</span><input type="datetime-local" className="h-10 w-full rounded-md border bg-white px-3 text-sm" value={dueAt} onChange={event => setDueAt(event.target.value)} /></label><Button className="w-full" onClick={() => void createAssignment()} disabled={!title.trim()||saving}><Plus />{saving?"Saving…":"Create assignment"}</Button></CardContent></Card></details></section>
            <Card className="fellow-panel"><CardHeader><CardTitle className="font-serif text-2xl">Assignments</CardTitle></CardHeader><CardContent className="space-y-3">{active.assignments.map(assignment => { const {done,eligible,percent}=assignmentSummary(active,assignment);const pct=percent??0; return <div key={assignment.id} className="grid gap-3 rounded-2xl border bg-white p-4 md:grid-cols-[1fr_220px_auto] md:items-center"><div><div className="flex flex-wrap gap-2"><strong>{assignment.title}</strong>{assignment.target_user_id&&<Badge variant="outline">Individual · {active.students.find(s=>s.userId===assignment.target_user_id)?.displayName??"Former member"}</Badge>}{assignment.due_at && <Badge variant="outline">Due {new Date(assignment.due_at).toLocaleDateString("en-GB")}</Badge>}</div><p className="mt-1 text-sm text-slate-600">{assignment.description || assignment.href}</p></div><div><div className="flex justify-between text-xs"><span>{done}/{eligible} complete</span><span>{percent===null?"—":pct+"%"}</span></div><Progress value={pct} className="mt-1" /></div><div className="flex gap-1"><Button asChild size="sm" variant="outline"><Link href={assignment.href}>Open <ArrowRight /></Link></Button><Button size="icon" variant="ghost" aria-label={"Delete assignment "+assignment.title} onClick={() => void deleteAssignment(assignment.id)}><Trash2 className="size-4" /></Button></div></div>})}{!active.assignments.length && <p className="text-sm text-slate-500">No assignments yet.</p>}</CardContent></Card>
          </>}
        </> : <Card className="shadow-none"><CardHeader><Users className="size-6 text-[#326d71]" /><CardTitle className="font-serif text-2xl">Create your first cohort</CardTitle><CardDescription>The cloud workspace is ready; add a cohort above, then share its join code with students.</CardDescription></CardHeader></Card>}
      </>}
    </div>
  </main>
}


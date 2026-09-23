"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { ArrowLeft, ArrowRight, CalendarDays, Check, CircleAlert, ExternalLink, FileCheck2, GraduationCap, ShieldCheck } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { Progress } from "@/components/ui/progress"
import { applicationAudit, requirementFor, tasksFor, type UniversityChoice } from "@/lib/admissions-platform"

const defaultCourses = ["Physics", "Engineering", "Engineering Science", "Mathematics", "Computer Science", "Natural Sciences", "Economics", "Economics and Management", "PPE", "Law", "Medicine", "History", "English", "Philosophy"]

function fmt(date?: string) {
  if (!date) return "No fixed date"
  return new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(date))
}

function StatusBadge({ value }: { value: string }) {
  if (value === "required") return <Badge>Required</Badge>
  if (value === "possible") return <Badge variant="outline">May apply</Badge>
  if (value === "not-required") return <Badge variant="outline">Not applicable</Badge>
  return <Badge variant="outline">Check official course page</Badge>
}

export default function RequirementsPage() {
  const [university, setUniversity] = useState<UniversityChoice>("Both")
  const [course, setCourse] = useState("Physics")
  const [completed, setCompleted] = useState<string[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    try {
      const p = localStorage.getItem("oxbridge-tutor-profile-v2")
      const t = localStorage.getItem("oxbridge-platform-tasks-v1")
      if (p) { const parsed = JSON.parse(p); setUniversity(parsed.university ?? "Both"); setCourse(parsed.course ?? "Physics") }
      if (t) setCompleted(JSON.parse(t))
    } catch { /* defaults */ }
    setLoaded(true)
  }, [])

  useEffect(() => {
    if (!loaded) return
    localStorage.setItem("oxbridge-platform-tasks-v1", JSON.stringify(completed))
  }, [completed, loaded])

  const selectedUniversities = university === "Both" || university === "Undecided" ? ["Oxford", "Cambridge"] as const : [university] as const
  const requirements = useMemo(() => selectedUniversities.map(u => requirementFor(u, course)), [selectedUniversities, course])
  const tasks = useMemo(() => tasksFor(university, course), [university, course])
  const audit = useMemo(() => applicationAudit(tasks, completed), [tasks, completed])
  const toggle = (id: string) => setCompleted(items => items.includes(id) ? items.filter(x => x !== id) : [...items, id])

  return <main className="min-h-screen bg-[#f6f8f8] text-[#172b3a]">
    <header className="border-b bg-white"><div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6"><Button asChild variant="ghost"><Link href="/student-home"><ArrowLeft />Student Home</Link></Button><div className="flex items-center gap-2 text-sm font-semibold"><GraduationCap className="size-4 text-[#147d91]" />Requirements & Audit</div></div></header>

    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <section className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-end"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#147d91]">2027 entry</p><h1 className="mt-2 font-serif text-4xl font-bold">Course requirement engine</h1><p className="mt-2 max-w-3xl text-slate-600">Use this as a planning aid, then verify any action that affects your application using the linked official page.</p></div><div className="grid gap-2 sm:grid-cols-2"><label className="text-xs font-bold uppercase tracking-wider text-slate-500">University<NativeSelect value={university} onChange={e => setUniversity(e.target.value as UniversityChoice)} className="mt-1 bg-white"><NativeSelectOption>Both</NativeSelectOption><NativeSelectOption>Oxford</NativeSelectOption><NativeSelectOption>Cambridge</NativeSelectOption><NativeSelectOption>Undecided</NativeSelectOption></NativeSelect></label><label className="text-xs font-bold uppercase tracking-wider text-slate-500">Course<NativeSelect value={course} onChange={e => setCourse(e.target.value)} className="mt-1 bg-white">{Array.from(new Set([course, ...defaultCourses])).map(x => <NativeSelectOption key={x}>{x}</NativeSelectOption>)}</NativeSelect></label></div></section>

      <section className="mb-5 grid gap-4 sm:grid-cols-3"><Card className="shadow-none"><CardHeader><CardDescription>Required tasks complete</CardDescription><CardTitle className="font-serif text-4xl">{audit.percent}%</CardTitle></CardHeader><CardContent><Progress value={audit.percent} /></CardContent></Card><Card className="shadow-none"><CardHeader><CardDescription>Outstanding required</CardDescription><CardTitle className="font-serif text-4xl">{audit.missing.length}</CardTitle></CardHeader><CardContent><p className="text-sm text-slate-500">Items the app currently treats as required for your selected route.</p></CardContent></Card><Card className="shadow-none"><CardHeader><CardDescription>Data checked</CardDescription><CardTitle className="font-serif text-xl">23 September 2026</CardTitle></CardHeader><CardContent><p className="text-sm text-slate-500">Re-check official pages if requirements change or your course/College choice changes.</p></CardContent></Card></section>

      <section className="grid gap-4 lg:grid-cols-2">{requirements.map(req => <Card key={`${req.university}-${req.course}`} className="shadow-none"><CardHeader><div className="flex items-center justify-between gap-3"><div><Badge variant="outline">{req.university}</Badge><CardTitle className="mt-2 font-serif text-2xl">{req.course}</CardTitle></div><ShieldCheck className="size-7 text-[#147d91]" /></div></CardHeader><CardContent className="space-y-4"><div className="rounded-xl border p-4"><div className="mb-2 flex items-center justify-between gap-2"><strong>Admissions test</strong><StatusBadge value={req.testStatus} /></div><p className="font-semibold text-[#147d91]">{req.test}</p><p className="mt-1 text-sm leading-relaxed text-slate-600">{req.testDetail}</p></div><div className="rounded-xl border p-4"><div className="mb-2 flex items-center justify-between gap-2"><strong>Written work</strong><StatusBadge value={req.writtenWork} /></div><p className="text-sm leading-relaxed text-slate-600">{req.writtenWorkDetail}</p></div><div className="rounded-xl border p-4"><div className="mb-2 flex items-center justify-between gap-2"><strong>College assessment</strong><StatusBadge value={req.collegeAssessment} /></div><p className="text-sm leading-relaxed text-slate-600">{req.collegeAssessmentDetail}</p></div><div className="rounded-xl bg-[#edf7f8] p-4"><strong>Interview</strong><p className="mt-1 text-sm leading-relaxed text-slate-600">{req.interview}</p></div><Button asChild variant="outline"><a href={req.officialUrl} target="_blank" rel="noreferrer">Open official guidance <ExternalLink /></a></Button></CardContent></Card>)}</section>

      <Card className="mt-5 shadow-none"><CardHeader><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#147d91]">Completeness audit</p><CardTitle className="mt-1 font-serif text-2xl">Application tasks</CardTitle><CardDescription>Required tasks affect the audit score; optional/check-if-applicable tasks remain visible so they are not forgotten.</CardDescription></div><Badge variant="outline">{completed.length} marked complete</Badge></div></CardHeader><CardContent className="space-y-2">{tasks.map(task => { const done = completed.includes(task.id); return <button key={task.id} onClick={() => toggle(task.id)} className={`grid w-full grid-cols-[28px_minmax(0,1fr)_auto] items-start gap-3 rounded-xl border p-3 text-left ${done ? "border-emerald-200 bg-emerald-50" : "bg-white hover:border-[#147d91]"}`}><span className={`grid size-7 place-items-center rounded-lg border ${done ? "border-emerald-600 bg-emerald-600 text-white" : "border-slate-300"}`}>{done && <Check className="size-4" />}</span><span><strong className="block text-sm">{task.label}</strong><small className="mt-1 block max-w-3xl leading-relaxed text-slate-500">{task.detail}</small>{task.officialUrl && <span className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-[#147d91]">Official source available <ExternalLink className="size-3" /></span>}</span><span className="text-right"><Badge variant={task.required ? "default" : "outline"}>{task.required ? "Required" : "Check"}</Badge>{task.date && <small className="mt-2 block max-w-32 text-xs text-slate-500">{fmt(task.date)}</small>}</span></button>})}</CardContent></Card>

      <Alert className="mt-5"><CircleAlert /><AlertTitle>Course and College details can change.</AlertTitle><AlertDescription>The engine is deliberately conservative: where it cannot safely conclude that something is not required, it tells you to check rather than hiding the item.</AlertDescription></Alert>

      <div className="mt-5 flex flex-wrap gap-2"><Button asChild><Link href="/interview-room">Prepare for interview <ArrowRight /></Link></Button><Button asChild variant="outline"><Link href="/student-home"><FileCheck2 />Back to Student Home</Link></Button></div>
    </div>
  </main>
}

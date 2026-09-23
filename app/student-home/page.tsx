"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { ArrowRight, BookOpenCheck, CalendarDays, CheckCircle2, Clock3, FileText, GraduationCap, MessageSquareText, Target } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { applicationAudit, nextApplicationAction, tasksFor, type UniversityChoice } from "@/lib/admissions-platform"

type Profile = { university?: UniversityChoice; course?: string; year?: string }
type ExistingProgress = { sessions?: number; testAttempted?: number; testCorrect?: number; activities?: unknown[]; mentorAssignments?: Array<{ done?: boolean }> }

function fmt(date?: string) {
  if (!date) return "No fixed date"
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(new Date(date))
}

export default function StudentHomePage() {
  const [profile, setProfile] = useState<Profile>({ university: "Both", course: "Physics", year: "2027" })
  const [progress, setProgress] = useState<ExistingProgress>({})
  const [completedTasks, setCompletedTasks] = useState<string[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    try {
      const savedProfile = localStorage.getItem("oxbridge-tutor-profile-v2")
      const savedProgress = localStorage.getItem("oxbridge-tutor-progress-v2")
      const savedTasks = localStorage.getItem("oxbridge-platform-tasks-v1")
      if (savedProfile) setProfile({ ...profile, ...JSON.parse(savedProfile) })
      if (savedProgress) setProgress(JSON.parse(savedProgress))
      if (savedTasks) setCompletedTasks(JSON.parse(savedTasks))
    } catch { /* keep defaults */ }
    setLoaded(true)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (loaded) localStorage.setItem("oxbridge-platform-tasks-v1", JSON.stringify(completedTasks))
  }, [completedTasks, loaded])

  const university = profile.university ?? "Both"
  const course = profile.course ?? "Physics"
  const tasks = useMemo(() => tasksFor(university, course), [university, course])
  const audit = useMemo(() => applicationAudit(tasks, completedTasks), [tasks, completedTasks])
  const next = useMemo(() => nextApplicationAction(tasks, completedTasks), [tasks, completedTasks])
  const accuracy = progress.testAttempted ? Math.round((progress.testCorrect ?? 0) / progress.testAttempted * 100) : 0
  const continuation = (progress.sessions ?? 0) === 0
    ? { href: "/interview-room", label: "Start your first formal interview", note: "Build a baseline reasoning profile." }
    : (progress.testAttempted ?? 0) < 20
      ? { href: "/advanced-practice", label: "Continue admissions-test practice", note: "Build enough evidence for the coach to target weak areas." }
      : { href: "/interview-room", label: "Continue interview preparation", note: "Use the next formal session to test transfer and flexibility." }

  const toggleTask = (id: string) => setCompletedTasks(items => items.includes(id) ? items.filter(x => x !== id) : [...items, id])

  return <main className="min-h-screen bg-[#f6f8f8] text-[#172b3a]">
    <header className="border-b bg-[#102a43] text-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl border border-white/15 bg-white/10"><GraduationCap className="size-5 text-[#68c6d0]" /></span><div><p className="font-serif text-xl font-bold">Student Home</p><p className="text-xs text-blue-100/70">{university} · {course} · {profile.year ?? "2027"} entry</p></div></div>
        <Button asChild variant="outline" className="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white"><Link href="/">Open full studio</Link></Button>
      </div>
    </header>

    <div className="mx-auto max-w-6xl px-4 py-7 sm:px-6 lg:py-10">
      <section className="mb-7">
        <p className="text-xs font-bold uppercase tracking-[.18em] text-[#147d91]">Personal preparation</p>
        <h1 className="mt-2 max-w-3xl font-serif text-4xl font-bold tracking-tight sm:text-5xl">Only what you need to do next.</h1>
        <p className="mt-3 max-w-2xl text-slate-600">The detailed tools are still available, but this page keeps the daily student experience deliberately simple.</p>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="border-0 bg-[#102a43] text-white shadow-none lg:col-span-2">
          <CardHeader><Badge className="w-fit border-white/15 bg-white/10 text-white">DO NEXT</Badge><CardTitle className="font-serif text-3xl">{next?.label ?? "Your required application tasks are complete"}</CardTitle><CardDescription className="text-blue-50/70">{next?.detail ?? "Use the remaining time for interview depth, admissions-test consolidation and reflection."}</CardDescription></CardHeader>
          <CardContent className="flex flex-wrap items-center gap-3"><Button asChild className="bg-white text-[#102a43] hover:bg-blue-50"><Link href="/requirements">Open requirements & audit <ArrowRight /></Link></Button>{next?.date && <span className="inline-flex items-center gap-2 text-sm text-blue-100/70"><CalendarDays className="size-4" />{fmt(next.date)}</span>}</CardContent>
        </Card>

        <Card className="shadow-none"><CardHeader><Badge variant="outline" className="w-fit">PROGRESS</Badge><CardTitle className="font-serif text-3xl">{audit.percent}%</CardTitle><CardDescription>Required application tasks marked complete.</CardDescription></CardHeader><CardContent className="space-y-4"><Progress value={audit.percent} /><div className="grid grid-cols-2 gap-3 text-sm"><div className="rounded-xl bg-[#edf7f8] p-3"><strong className="block text-xl">{progress.sessions ?? 0}</strong><span className="text-slate-500">interviews</span></div><div className="rounded-xl bg-[#edf7f8] p-3"><strong className="block text-xl">{accuracy || "—"}{accuracy ? "%" : ""}</strong><span className="text-slate-500">test accuracy</span></div></div></CardContent></Card>
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-[1.1fr_.9fr]">
        <Card className="shadow-none"><CardHeader><Badge variant="outline" className="w-fit">CONTINUE</Badge><CardTitle className="font-serif text-2xl">{continuation.label}</CardTitle><CardDescription>{continuation.note}</CardDescription></CardHeader><CardContent><Button asChild><Link href={continuation.href}>Continue preparation <ArrowRight /></Link></Button></CardContent></Card>
        <Card className="shadow-none"><CardHeader><CardTitle className="font-serif text-2xl">Quick launch</CardTitle><CardDescription>Go straight to a focused activity.</CardDescription></CardHeader><CardContent className="grid gap-2 sm:grid-cols-2"><Button asChild variant="outline" className="justify-start"><Link href="/interview-room"><MessageSquareText />Formal interview</Link></Button><Button asChild variant="outline" className="justify-start"><Link href="/advanced-practice"><Target />Advanced practice</Link></Button><Button asChild variant="outline" className="justify-start"><Link href="/requirements"><FileText />Requirements</Link></Button><Button asChild variant="outline" className="justify-start"><Link href="/backup-center"><BookOpenCheck />Backup & move device</Link></Button></CardContent></Card>
      </section>

      <Card className="mt-4 shadow-none"><CardHeader><div className="flex items-center justify-between gap-3"><div><CardTitle className="font-serif text-2xl">Application checklist</CardTitle><CardDescription>Mark tasks complete here; the same state powers the requirements audit.</CardDescription></div><Badge variant="outline">{audit.complete}/{audit.required} required</Badge></div></CardHeader><CardContent className="grid gap-2">{tasks.slice(0, 8).map(task => { const done = completedTasks.includes(task.id); return <button key={task.id} onClick={() => toggleTask(task.id)} className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition ${done ? "border-emerald-200 bg-emerald-50" : "bg-white hover:border-[#147d91]"}`}><span className={`mt-0.5 grid size-6 flex-none place-items-center rounded-md border ${done ? "border-emerald-600 bg-emerald-600 text-white" : "border-slate-300"}`}>{done && <CheckCircle2 className="size-4" />}</span><span className="min-w-0 flex-1"><strong className="block text-sm">{task.label}</strong><small className="mt-1 block text-slate-500">{task.date ? fmt(task.date) : task.category} · {task.required ? "required" : "check if applicable"}</small></span>{task.date && <Clock3 className="mt-1 size-4 text-slate-400" />}</button>})}</CardContent></Card>
      <p className="mt-5 text-xs leading-relaxed text-slate-500">Requirements can change. The app shows the date its requirement data was checked and always links back to official university guidance for decisions that affect an application.</p>
    </div>
  </main>
}

"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { ArrowLeft, ArrowRight, BookOpen, BriefcaseBusiness, FileText, GraduationCap, Save, Sparkles } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { createClient } from "@/lib/supabase/client"
import { APPLICATION_KEY, PROFILE_KEY, buildApplicationQuestions } from "@/lib/personal-tutor"

type ApplicationTwin = {
  university: "Oxford" | "Cambridge" | "Both"
  course: string
  year: string
  subjects: string
  predictedGrades: string
  epq: string
  books: string
  projects: string
  competitions: string
  writtenWork: string
  interests: string
  workExperience: string
}

const defaults: ApplicationTwin = { university: "Both", course: "Physics", year: "2027", subjects: "", predictedGrades: "", epq: "", books: "", projects: "", competitions: "", writtenWork: "", interests: "", workExperience: "" }

function readTwin() {
  try { return { ...defaults, ...JSON.parse(localStorage.getItem(APPLICATION_KEY) || "{}") } as ApplicationTwin } catch { return defaults }
}

export default function ApplicationProfilePage() {
  const [twin, setTwin] = useState<ApplicationTwin>(defaults)
  const [saved, setSaved] = useState(false)
  useEffect(() => { setTwin(readTwin()) }, [])
  const questions = useMemo(() => buildApplicationQuestions(twin), [twin])
  const evidenceCount = [twin.epq, twin.books, twin.projects, twin.competitions, twin.writtenWork, twin.interests, twin.workExperience].filter(item => item.trim()).length

  function set<K extends keyof ApplicationTwin>(key: K, value: ApplicationTwin[K]) { setTwin(current => ({ ...current, [key]: value })); setSaved(false) }

  async function saveTwin() {
    localStorage.setItem(APPLICATION_KEY, JSON.stringify(twin))
    try {
      const currentProfile = JSON.parse(localStorage.getItem(PROFILE_KEY) || "{}") as Record<string, unknown>
      localStorage.setItem(PROFILE_KEY, JSON.stringify({ ...currentProfile, university: twin.university, course: twin.course, year: twin.year }))
    } catch { localStorage.setItem(PROFILE_KEY, JSON.stringify({ university: twin.university, course: twin.course, year: twin.year })) }
    try {
      const supabase = createClient()
      const { data } = await supabase.auth.getUser()
      if (data.user) {
        await supabase.from("application_evidence").delete().eq("user_id", data.user.id).eq("evidence_type", "digital_twin_snapshot")
        await supabase.from("application_evidence").insert({ user_id: data.user.id, evidence_type: "digital_twin_snapshot", title: `${twin.course} application digital twin`, detail: twin.interests || twin.projects || twin.epq || "Application profile", metadata: twin })
      }
    } catch { /* offline/cloud-sync state still persists */ }
    setSaved(true)
  }

  const field = (key: keyof ApplicationTwin, label: string, placeholder: string, rows = 4) => <label className="block"><span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">{label}</span><Textarea rows={rows} value={String(twin[key])} onChange={event => set(key, event.target.value as never)} placeholder={placeholder} /></label>

  return <main className="min-h-screen bg-[#f5f7f7] text-[#172b3a]">
    <header className="border-b bg-white"><div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4"><Button asChild variant="ghost"><Link href="/tutor"><ArrowLeft />Personal Tutor</Link></Button><Badge variant="outline"><GraduationCap className="size-3.5" />Application Digital Twin</Badge></div></header>
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8">
      <section className="grid gap-5 lg:grid-cols-[1.25fr_.75fr]"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#147d91]">Your academic application, connected</p><h1 className="mt-2 font-serif text-4xl font-bold">Give the tutor the context an interviewer could actually ask about.</h1><p className="mt-3 max-w-3xl text-slate-600">Record academic interests, reading, projects, EPQ, competitions and written work. The tutor uses these to generate defence questions and connect your preparation to your real application.</p></div><Card className="border-0 bg-[#102a43] text-white shadow-none"><CardHeader><CardDescription className="text-white/60">Evidence map</CardDescription><CardTitle className="font-serif text-4xl">{evidenceCount}</CardTitle><CardDescription className="text-white/60">academic evidence area{evidenceCount === 1 ? "" : "s"} currently populated</CardDescription></CardHeader></Card></section>

      <Card className="shadow-none"><CardHeader><CardTitle className="font-serif text-2xl">Core pathway</CardTitle><CardDescription>This updates the same course/university profile used by the Personal Tutor.</CardDescription></CardHeader><CardContent className="grid gap-4 md:grid-cols-3"><label><span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">University</span><select className="h-10 w-full rounded-md border bg-white px-3 text-sm" value={twin.university} onChange={event => set("university", event.target.value as ApplicationTwin["university"])}><option>Oxford</option><option>Cambridge</option><option>Both</option></select></label><label><span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Course</span><input className="h-10 w-full rounded-md border bg-white px-3 text-sm" value={twin.course} onChange={event => set("course", event.target.value)} placeholder="Physics" /></label><label><span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Entry year</span><input className="h-10 w-full rounded-md border bg-white px-3 text-sm" value={twin.year} onChange={event => set("year", event.target.value)} placeholder="2027" /></label>{field("subjects", "A-level subjects", "Physics, Mathematics, Further Mathematics…", 3)}{field("predictedGrades", "Predicted grades", "A* A* A…", 3)}{field("interests", "Academic interests", "Which questions or areas do you keep returning to, and why?", 3)}</CardContent></Card>

      <section className="grid gap-5 lg:grid-cols-2"><Card className="shadow-none"><CardHeader><BookOpen className="size-5 text-[#147d91]" /><CardTitle className="font-serif text-2xl">Supercurricular evidence</CardTitle></CardHeader><CardContent className="space-y-4">{field("books", "Books / articles / lectures", "List the most useful academic material and what you took from it.")}{field("competitions", "Competitions / challenges", "Olympiads, projects, challenges, awards…")}{field("workExperience", "Relevant experience", "Placements, volunteering, shadowing or other course-relevant experiences.")}</CardContent></Card><Card className="shadow-none"><CardHeader><BriefcaseBusiness className="size-5 text-[#147d91]" /><CardTitle className="font-serif text-2xl">Work you may need to defend</CardTitle></CardHeader><CardContent className="space-y-4">{field("epq", "EPQ / independent research", "Title, question, conclusion and the hardest limitation.")}{field("projects", "Projects", "Engineering, coding, laboratory, essay or independent projects.")}{field("writtenWork", "Submitted / relevant written work", "What you argued, what evidence you used, and what you would now change.")}</CardContent></Card></section>

      <div className="flex flex-wrap gap-2"><Button onClick={() => void saveTwin()}><Save />{saved ? "Saved" : "Save digital twin"}</Button><Button asChild variant="outline"><Link href="/application-defence">Defend my application <ArrowRight /></Link></Button><Button asChild variant="outline"><Link href="/supercurricular-coach">Add supercurricular reflection</Link></Button></div>

      <Card className="shadow-none"><CardHeader><div className="flex items-center gap-2"><Sparkles className="size-5 text-[#147d91]" /><CardTitle className="font-serif text-2xl">Questions already visible in your application</CardTitle></div><CardDescription>These are generated from the evidence you entered; they are prompts for practice, not claims about what an actual interviewer will ask.</CardDescription></CardHeader><CardContent className="grid gap-3 md:grid-cols-2">{questions.length ? questions.map((question, index) => <div key={question} className="rounded-2xl border bg-white p-4"><Badge variant="outline">Question {index + 1}</Badge><p className="mt-3 font-serif text-lg font-semibold leading-7">{question}</p></div>) : <p className="text-sm text-slate-600">Add books, projects, EPQ, written work or academic interests to generate application-defence questions.</p>}</CardContent></Card>

      <Card className="border-amber-200 bg-amber-50 shadow-none"><CardHeader><FileText className="size-5 text-amber-800" /><CardTitle className="font-serif text-xl">Keep this academic</CardTitle><CardDescription>Only add information that is useful for preparation. The tutor does not need unnecessary sensitive personal information, and it should not invent achievements or experiences that are not yours.</CardDescription></CardHeader></Card>
    </div>
  </main>
}

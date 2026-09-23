"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { ArrowLeft, ArrowRight, BookOpen, Brain, GraduationCap, RefreshCw, Target } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { coursesWithDeepBanks2027, promptsForCourse2027 } from "@/lib/course-interview-bank-2027"

export default function CourseBankPage() {
  const [course, setCourse] = useState("Physics")
  const [index, setIndex] = useState(0)
  const [revealed, setRevealed] = useState(false)

  useEffect(() => {
    try {
      const profile = JSON.parse(localStorage.getItem("oxbridge-tutor-profile-v2") || "{}")
      if (profile.course) setCourse(profile.course)
    } catch { /* default */ }
  }, [])

  const prompts = useMemo(() => promptsForCourse2027(course), [course])
  const current = prompts[index % Math.max(prompts.length, 1)]

  const chooseCourse = (value: string) => {
    setCourse(value)
    setIndex(0)
    setRevealed(false)
    try {
      const profile = JSON.parse(localStorage.getItem("oxbridge-tutor-profile-v2") || "{}")
      localStorage.setItem("oxbridge-tutor-profile-v2", JSON.stringify({ ...profile, course: value }))
    } catch { /* no persistence */ }
  }

  return <main className="min-h-screen bg-[#f6f8f8] text-[#172b3a]">
    <header className="border-b bg-white"><div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6"><Button asChild variant="ghost"><Link href="/student-home"><ArrowLeft />Student Home</Link></Button><Badge variant="outline"><GraduationCap className="size-3.5" />Expanded deep course bank</Badge></div></header>

    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <section className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-end"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#147d91]">Course-specific preparation</p><h1 className="mt-2 font-serif text-4xl font-bold">Practise the way your subject actually thinks.</h1><p className="mt-2 max-w-3xl text-slate-600">The bank now includes a much wider set of original Oxford/Cambridge-style problems, probing follow-ups and condition changes across STEM, medicine, law, economics and humanities. These are original practice prompts rather than recalled confidential interview questions.</p></div><label className="text-xs font-bold uppercase tracking-wider text-slate-500">Course<NativeSelect value={course} onChange={e => chooseCourse(e.target.value)} className="mt-1 min-w-56 bg-white">{coursesWithDeepBanks2027.map(item => <NativeSelectOption key={item}>{item}</NativeSelectOption>)}</NativeSelect></label></section>

      <section className="grid gap-5 lg:grid-cols-[1.25fr_.75fr]">
        <Card className="border-[#147d91]/20 shadow-none"><CardHeader><div className="flex flex-wrap gap-2"><Badge>{current?.theme}</Badge><Badge variant="outline">Question {index % prompts.length + 1} of {prompts.length}</Badge></div><CardTitle className="font-serif text-3xl leading-snug">{current?.prompt}</CardTitle><CardDescription>Think aloud before opening the follow-ups. Expose assumptions, define terms, test a limiting case and be ready for the problem to change.</CardDescription></CardHeader><CardContent className="space-y-4"><div className="flex flex-wrap gap-2"><Button onClick={() => setRevealed(v => !v)}>{revealed ? "Hide interviewer follow-ups" : "Reveal interviewer follow-ups"} <Brain /></Button><Button variant="outline" onClick={() => { setIndex(i => (i + 1) % prompts.length); setRevealed(false) }}><RefreshCw />Another question</Button></div>{revealed && <div className="space-y-3"><div className="rounded-xl bg-[#edf7f8] p-4"><p className="mb-2 text-xs font-bold uppercase tracking-wider text-[#147d91]">Follow-up ladder</p>{current.followUps.map((item, i) => <div key={item} className="mb-2 flex gap-3 last:mb-0"><span className="grid size-6 flex-none place-items-center rounded-full bg-[#102a43] text-xs font-bold text-white">{i + 1}</span><p className="text-sm leading-relaxed">{item}</p></div>)}</div><div className="rounded-xl border border-amber-200 bg-amber-50 p-4"><p className="text-xs font-bold uppercase tracking-wider text-amber-700">Condition change</p><p className="mt-1 font-serif text-lg">{current.mutation}</p></div></div>}</CardContent></Card>

        <aside className="space-y-4"><Card className="shadow-none"><CardHeader><Target className="size-6 text-[#147d91]" /><CardTitle className="font-serif text-xl">What the interviewer is probing</CardTitle></CardHeader><CardContent className="flex flex-wrap gap-2">{current.interviewerFocus.map(item => <Badge key={item} variant="outline">{item}</Badge>)}</CardContent></Card><Card className="shadow-none"><CardHeader><BookOpen className="size-6 text-[#147d91]" /><CardTitle className="font-serif text-xl">Use it in the formal room</CardTitle><CardDescription>Your selected course is saved to the same profile used by the Interview Room.</CardDescription></CardHeader><CardContent><Button asChild className="w-full"><Link href="/interview-room">Open Interview Room <ArrowRight /></Link></Button></CardContent></Card></aside>
      </section>

      <Card className="mt-5 shadow-none"><CardHeader><CardTitle className="font-serif text-2xl">Expanded course coverage</CardTitle><CardDescription>Every listed course now draws from the combined bank of original prompts, adaptive follow-ups, mutations and interviewer targets.</CardDescription></CardHeader><CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{coursesWithDeepBanks2027.map(item => { const count = promptsForCourse2027(item).length; return <button onClick={() => chooseCourse(item)} key={item} className={`rounded-xl border p-4 text-left transition hover:border-[#147d91] ${item === course ? "border-[#147d91] bg-[#edf7f8]" : "bg-white"}`}><strong>{item}</strong><p className="mt-1 text-sm text-slate-500">{count} deep problems · adaptive follow-up structure</p></button>})}</CardContent></Card>
    </div>
  </main>
}

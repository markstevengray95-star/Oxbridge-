"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { ArrowLeft, ArrowRight, Clock3, FileText, RefreshCw, Sparkles } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import { PROFILE_KEY } from "@/lib/personal-tutor"
import { INTERVIEW_CONTEXT_KEY, PRE_INTERVIEW_KEY, generateUnseenMaterial, type UnseenMaterial } from "@/lib/nextgen-prep"

function readCourse() {
  try { return (JSON.parse(localStorage.getItem(PROFILE_KEY) || "{}") as { course?: string }).course || "Physics" } catch { return "Physics" }
}

export default function PreInterviewMaterialPage() {
  const [course, setCourse] = useState("Physics")
  const [variant, setVariant] = useState(0)
  const [material, setMaterial] = useState<UnseenMaterial | null>(null)
  const [notes, setNotes] = useState("")
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [started, setStarted] = useState(false)

  useEffect(() => {
    const nextCourse = readCourse()
    setCourse(nextCourse)
    const generated = generateUnseenMaterial(nextCourse, 0)
    setMaterial(generated)
    setSecondsLeft(generated.preparationMinutes * 60)
  }, [])

  useEffect(() => {
    if (!started || secondsLeft <= 0) return
    const timer = window.setInterval(() => setSecondsLeft(value => Math.max(0, value - 1)), 1000)
    return () => window.clearInterval(timer)
  }, [started, secondsLeft])

  const progress = useMemo(() => {
    if (!material) return 0
    const total = material.preparationMinutes * 60
    return total ? Math.round((1 - secondsLeft / total) * 100) : 0
  }, [material, secondsLeft])

  function regenerate() {
    const nextVariant = variant + 1
    const generated = generateUnseenMaterial(course, nextVariant)
    setVariant(nextVariant)
    setMaterial(generated)
    setNotes("")
    setSecondsLeft(generated.preparationMinutes * 60)
    setStarted(false)
  }

  function saveForInterview() {
    if (!material) return
    const withNotes = { ...material, notes: notes.trim() }
    localStorage.setItem(PRE_INTERVIEW_KEY, JSON.stringify(withNotes))
    localStorage.setItem(INTERVIEW_CONTEXT_KEY, JSON.stringify({
      source: "pre-interview-material",
      title: material.title,
      material: material.material,
      prompts: material.prompts,
      notes: notes.trim(),
      course,
      createdAt: new Date().toISOString(),
    }))
  }

  if (!material) return null
  const mins = Math.floor(secondsLeft / 60)
  const secs = String(secondsLeft % 60).padStart(2, "0")

  return <main className="min-h-screen bg-[#f4f7f7] text-[#172b3a]">
    <header className="border-b bg-white"><div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4"><Button asChild variant="ghost"><Link href="/tutor"><ArrowLeft />Personal Tutor</Link></Button><Badge variant="outline"><FileText className="size-3.5" />Unseen material</Badge></div></header>
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <section className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <Card className="shadow-none">
          <CardHeader><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#147d91]">{course} pre-interview preparation</p><CardTitle className="mt-2 font-serif text-3xl">{material.title}</CardTitle></div><Badge>{material.kind}</Badge></div><CardDescription>Read, annotate mentally and make notes before you enter the live interview. The interviewer receives the material and your notes but not a model answer.</CardDescription></CardHeader>
          <CardContent className="space-y-5">
            <div className="rounded-2xl border bg-white p-5 text-base leading-8">{material.material}</div>
            <div className="grid gap-3 md:grid-cols-3">{material.prompts.map((prompt, index) => <div key={prompt} className="rounded-xl bg-slate-50 p-4"><Badge variant="outline">Prompt {index + 1}</Badge><p className="mt-2 text-sm leading-6">{prompt}</p></div>)}</div>
            <Textarea rows={8} value={notes} onChange={event => setNotes(event.target.value)} placeholder="Your preparation notes. Define terms, sketch likely lines of argument, identify assumptions, note uncertainties and questions you would want to ask." />
          </CardContent>
        </Card>
        <aside className="space-y-4">
          <Card className="border-0 bg-[#102a43] text-white shadow-none"><CardHeader><Clock3 className="size-5 text-[#8dd7de]" /><CardTitle className="font-serif text-3xl">{mins}:{secs}</CardTitle><CardDescription className="text-white/60">Suggested preparation window</CardDescription></CardHeader><CardContent className="space-y-4"><Progress value={progress} /><Button className="w-full bg-white text-[#102a43] hover:bg-slate-100" onClick={() => setStarted(value => !value)}>{started ? "Pause timer" : "Start timer"}</Button></CardContent></Card>
          <Card className="shadow-none"><CardHeader><Sparkles className="size-5 text-[#147d91]" /><CardTitle className="font-serif text-xl">When you are ready</CardTitle><CardDescription>The live interviewer will begin by asking you to interpret or defend something from this material.</CardDescription></CardHeader><CardContent className="space-y-2"><Button asChild className="w-full" onClick={saveForInterview}><Link href="/gemini-live-interview">Start live interview <ArrowRight /></Link></Button><Button variant="outline" className="w-full" onClick={regenerate}><RefreshCw />New unseen material</Button></CardContent></Card>
        </aside>
      </section>
    </div>
  </main>
}

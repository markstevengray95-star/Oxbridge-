"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { ArrowLeft, ArrowRight, Brain, FileText, Loader2, MessageSquareText, Save, ShieldQuestion } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

const PROGRESS_KEY = "oxbridge-tutor-progress-v2"
const CONTEXT_KEY = "oxbridge-panel-written-work-v1"

type Analysis = {
  summary: string
  claims: string[]
  assumptions: string[]
  evidenceQuestions: string[]
  defenceQuestions: string[]
  openingQuestion: string
}

export default function WrittenWorkDefencePage() {
  const [title, setTitle] = useState("")
  const [course, setCourse] = useState("Physics")
  const [work, setWork] = useState("")
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [provider, setProvider] = useState<"gemini" | "local" | null>(null)
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    try {
      const profile = JSON.parse(localStorage.getItem("oxbridge-tutor-profile-v2") || "{}") as { course?: string }
      if (profile.course) setCourse(profile.course)
    } catch { /* default */ }
  }, [])

  async function analyse() {
    if (work.trim().length < 80 || loading) return
    setLoading(true); setSaved(false)
    try {
      const response = await fetch("/api/written-work-defence", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title, course, work }) })
      const data = await response.json() as { analysis?: Analysis; provider?: "gemini" | "local" }
      if (data.analysis) setAnalysis(data.analysis)
      setProvider(data.provider ?? "local")
    } finally { setLoading(false) }
  }

  function saveDefence() {
    if (!analysis) return
    try {
      const progress = JSON.parse(localStorage.getItem(PROGRESS_KEY) || "{}") as Record<string, unknown>
      const previous = Array.isArray(progress.writtenWorkDefences) ? progress.writtenWorkDefences as unknown[] : []
      const record = { id: `written-${Date.now()}`, title: title || "Written work", course, summary: analysis.summary, openingQuestion: analysis.openingQuestion, claims: analysis.claims, date: new Date().toISOString() }
      localStorage.setItem(PROGRESS_KEY, JSON.stringify({ ...progress, writtenWorkDefences: [record, ...previous].slice(0, 30) }))
      setSaved(true)
    } catch { /* page still works */ }
  }

  function preparePanel() {
    if (!analysis) return
    localStorage.setItem(CONTEXT_KEY, JSON.stringify({ title: title || "Written work", course, work: work.slice(0, 12000), analysis, createdAt: new Date().toISOString() }))
    saveDefence()
  }

  return <main className="min-h-screen bg-[#f4f7f7] text-[#172b3a]">
    <header className="border-b bg-white"><div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6"><Button asChild variant="ghost"><Link href="/tutor"><ArrowLeft />Personal Tutor</Link></Button><Badge variant="outline"><FileText className="size-3.5" />Written Work Defence</Badge></div></header>
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6">
      <section><p className="text-xs font-bold uppercase tracking-[.18em] text-[#147d91]">Defend your own academic work</p><h1 className="mt-2 font-serif text-4xl font-bold">Know what you wrote well enough to be challenged on it.</h1><p className="mt-3 max-w-3xl leading-7 text-slate-600">Paste an essay, EPQ section, submitted written work or project explanation. The Tutor maps your claims and assumptions, then creates interview questions specifically from your text.</p></section>

      <section className="grid gap-5 xl:grid-cols-[1.05fr_.95fr]"><Card><CardHeader><CardTitle className="font-serif text-2xl">Your work</CardTitle><CardDescription>The analysis stays focused on the reasoning visible in the text.</CardDescription></CardHeader><CardContent className="space-y-4"><div className="grid gap-3 sm:grid-cols-2"><label><span className="mb-1 block text-sm font-semibold">Title</span><Input value={title} onChange={event => setTitle(event.target.value)} placeholder="e.g. EPQ: limits of nuclear fusion" /></label><label><span className="mb-1 block text-sm font-semibold">Course</span><Input value={course} onChange={event => setCourse(event.target.value)} /></label></div><Textarea rows={24} value={work} onChange={event => { setWork(event.target.value); setAnalysis(null); setSaved(false) }} placeholder="Paste the written work here…" /><div className="flex items-center justify-between gap-3"><span className="text-xs text-slate-500">{work.trim() ? work.trim().split(/\s+/).length : 0} words</span><Button onClick={analyse} disabled={work.trim().length < 80 || loading}>{loading ? <Loader2 className="animate-spin" /> : <Brain />}{loading ? "Analysing…" : "Build defence"}</Button></div></CardContent></Card>

        <aside className="space-y-4">{analysis ? <><Card className="border-0 bg-[#102a43] text-white"><CardHeader><div className="flex items-center justify-between gap-2"><CardTitle className="font-serif text-2xl">Defence map</CardTitle><Badge className="bg-white/10 text-white">{provider === "gemini" ? "AI analysis" : "Built-in analysis"}</Badge></div><CardDescription className="text-white/65">{analysis.summary}</CardDescription></CardHeader></Card><Card><CardHeader><CardTitle className="font-serif text-xl">Opening question</CardTitle></CardHeader><CardContent><p className="rounded-xl bg-[#edf7f8] p-4 font-serif text-lg leading-7">{analysis.openingQuestion}</p></CardContent></Card><Card><CardHeader><CardTitle className="font-serif text-xl">Claims to defend</CardTitle></CardHeader><CardContent className="space-y-2">{analysis.claims.map((item, index) => <p key={`${item}-${index}`} className="text-sm leading-6"><strong>{index+1}.</strong> {item}</p>)}</CardContent></Card></> : <Card><CardHeader><ShieldQuestion className="size-6 text-[#147d91]" /><CardTitle className="font-serif text-2xl">What this will test</CardTitle></CardHeader><CardContent className="space-y-2 text-sm leading-6 text-slate-600"><p>• Can you state the argument without repeating memorised wording?</p><p>• Which assumptions are carrying the conclusion?</p><p>• What evidence supports or weakens the claims?</p><p>• Can you defend the work against a strong objection?</p><p>• What would you revise now?</p></CardContent></Card>}</aside></section>

      {analysis && <section className="grid gap-5 lg:grid-cols-3"><Card><CardHeader><CardTitle className="font-serif text-xl">Hidden assumptions</CardTitle></CardHeader><CardContent className="space-y-2">{analysis.assumptions.map((item,index)=><p key={`${item}-${index}`} className="text-sm leading-6">• {item}</p>)}</CardContent></Card><Card><CardHeader><CardTitle className="font-serif text-xl">Evidence questions</CardTitle></CardHeader><CardContent className="space-y-2">{analysis.evidenceQuestions.map((item,index)=><p key={`${item}-${index}`} className="text-sm leading-6">• {item}</p>)}</CardContent></Card><Card><CardHeader><CardTitle className="font-serif text-xl">Interview bank</CardTitle></CardHeader><CardContent className="space-y-2">{analysis.defenceQuestions.slice(0,8).map((item,index)=><p key={`${item}-${index}`} className="text-sm leading-6">{index+1}. {item}</p>)}</CardContent></Card></section>}

      {analysis && <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={saveDefence}><Save />{saved ? "Saved" : "Save to preparation evidence"}</Button><Button asChild onClick={preparePanel}><Link href="/panel-interview?written=1"><MessageSquareText />Defend it in the two-person interview <ArrowRight /></Link></Button></div>}
    </div>
  </main>
}

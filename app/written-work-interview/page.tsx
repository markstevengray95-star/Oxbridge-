"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { ArrowLeft, Brain, FileText, Loader2 } from "lucide-react"
import { WrittenWorkDefenceSimulator } from "@/components/written-work-defence-simulator"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

type Analysis = {
  summary: string
  claims: string[]
  assumptions: string[]
  evidenceQuestions: string[]
  defenceQuestions: string[]
  openingQuestion: string
}

const PANEL_CONTEXT_KEY = "oxbridge-panel-written-work-v1"
const VAULT_KEY = "oxbridge-written-work-vault-v1"

export default function WrittenWorkInterviewPage() {
  const [title, setTitle] = useState("")
  const [course, setCourse] = useState("Physics")
  const [work, setWork] = useState("")
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState("")

  useEffect(() => {
    try {
      const context = JSON.parse(localStorage.getItem(PANEL_CONTEXT_KEY) || "null") as { title?: string; course?: string; work?: string; analysis?: Analysis } | null
      if (context?.work) {
        setTitle(context.title || "Submitted written work")
        setCourse(context.course || "Physics")
        setWork(context.work)
        if (context.analysis) setAnalysis(context.analysis)
        return
      }
      const vault = JSON.parse(localStorage.getItem(VAULT_KEY) || "[]") as Array<{ title?: string; text?: string }>
      if (vault[0]?.text) {
        setTitle(vault[0].title || "Submitted written work")
        setWork(vault[0].text)
      }
      const profile = JSON.parse(localStorage.getItem("oxbridge-tutor-profile-v2") || "{}") as { course?: string }
      if (profile.course) setCourse(profile.course)
    } catch { /* blank editor remains available */ }
  }, [])

  async function buildDefence() {
    if (work.trim().length < 80 || busy) return
    setBusy(true); setNotice(""); setAnalysis(null)
    try {
      const response = await fetch("/api/written-work-defence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, course, work }),
      })
      const data = await response.json() as { analysis?: Analysis; provider?: string; error?: string }
      if (!response.ok || !data.analysis) throw new Error(data.error || "A defence map could not be created.")
      setAnalysis(data.analysis)
      localStorage.setItem(PANEL_CONTEXT_KEY, JSON.stringify({ title: title || "Submitted written work", course, work: work.slice(0, 12000), analysis: data.analysis, createdAt: new Date().toISOString() }))
      if (data.provider === "local") setNotice("The built-in defence engine created the map because cloud AI was unavailable. You can still run the live defence interview.")
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "A defence map could not be created.")
    } finally { setBusy(false) }
  }

  return <main className="min-h-screen bg-[#f5f7f7] text-[#172b3a]">
    <header className="border-b bg-white"><div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4"><Button asChild variant="ghost"><Link href="/digital-twin"><ArrowLeft />Digital Twin</Link></Button><Badge variant="outline"><FileText className="size-3.5"/>Written Work Defence Simulator</Badge></div></header>
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6">
      <section><p className="text-xs font-bold uppercase tracking-[.18em] text-[#147d91]">Submitted-work interview</p><h1 className="mt-2 font-serif text-4xl font-bold">Make the interviewer challenge what you actually wrote.</h1><p className="mt-3 max-w-3xl text-slate-600">Load written work, build a defence map, then answer adaptive questions tied to its claims, assumptions and evidence. The transcript can be saved into Completed Work and replayed later.</p></section>

      <Card className="shadow-none"><CardHeader><div className="flex items-center gap-2"><Brain className="size-5 text-[#147d91]"/><CardTitle className="font-serif text-2xl">Work to defend</CardTitle></div><CardDescription>Paste the exact submitted version where possible. The interview should test the argument you actually made.</CardDescription></CardHeader><CardContent className="space-y-4"><div className="grid gap-3 md:grid-cols-2"><label><span className="mb-1 block text-sm font-semibold">Title</span><Input value={title} onChange={event => { setTitle(event.target.value); setAnalysis(null) }} placeholder="Essay / EPQ / written work title"/></label><label><span className="mb-1 block text-sm font-semibold">Course</span><Input value={course} onChange={event => { setCourse(event.target.value); setAnalysis(null) }}/></label></div><Textarea rows={14} value={work} onChange={event => { setWork(event.target.value); setAnalysis(null); setNotice("") }} placeholder="Paste the written work here…"/><div className="flex flex-wrap items-center justify-between gap-3"><span className="text-xs text-slate-500">{work.trim() ? work.trim().split(/\s+/).length : 0} words</span><div className="flex gap-2"><Button asChild variant="outline"><Link href="/written-work-vault">Open vault</Link></Button><Button onClick={() => void buildDefence()} disabled={work.trim().length < 80 || busy}>{busy ? <Loader2 className="animate-spin"/> : <Brain />}{busy ? "Building defence…" : analysis ? "Rebuild defence map" : "Build defence map"}</Button></div></div>{notice ? <p className="text-sm text-slate-600">{notice}</p> : null}</CardContent></Card>

      {analysis ? <WrittenWorkDefenceSimulator title={title || "Submitted written work"} course={course} work={work} analysis={analysis}/> : <Card className="border-dashed shadow-none"><CardContent className="p-8 text-center text-sm text-slate-500">Build the defence map to start the live interview.</CardContent></Card>}
    </div>
  </main>
}

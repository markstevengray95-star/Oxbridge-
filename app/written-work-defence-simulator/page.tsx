"use client"

import Link from "next/link"
import { ChangeEvent, useEffect, useState } from "react"
import { ArrowLeft, Brain, FileText, Loader2, Upload } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { WrittenWorkDefenceDrill } from "@/components/written-work-defence-drill"
import { readWrittenWorkFile } from "@/lib/written-work-import-client"

type Analysis = {
  summary: string
  claims: string[]
  assumptions: string[]
  evidenceQuestions: string[]
  defenceQuestions: string[]
  openingQuestion: string
}

export default function WrittenWorkDefenceSimulatorPage() {
  const [title, setTitle] = useState("")
  const [course, setCourse] = useState("Physics")
  const [work, setWork] = useState("")
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [provider, setProvider] = useState<"gemini" | "local" | null>(null)
  const [loading, setLoading] = useState(false)
  const [importing, setImporting] = useState(false)
  const [notice, setNotice] = useState("")

  useEffect(() => {
    try {
      const profile = JSON.parse(localStorage.getItem("oxbridge-tutor-profile-v2") || "{}") as { course?: string }
      if (profile.course) setCourse(profile.course)
      const vault = JSON.parse(localStorage.getItem("oxbridge-written-work-vault-v1") || "[]") as Array<{ title?: string; text?: string }>
      if (vault[0]?.text) { setTitle(vault[0].title || "Submitted written work"); setWork(vault[0].text) }
    } catch {}
  }, [])

  async function importDocument(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    setImporting(true); setNotice(""); setAnalysis(null)
    try {
      const imported = await readWrittenWorkFile(file)
      setTitle(file.name.replace(/\.[^.]+$/, ""))
      setWork(imported.text)
      setNotice(imported.warning || `${file.name} imported. Compare the extracted text with the submitted original before practising.`)
    } catch (error) { setNotice(error instanceof Error ? error.message : "The document could not be imported.") }
    finally { setImporting(false); event.target.value = "" }
  }

  async function buildDefence() {
    if (work.trim().length < 80 || loading) return
    setLoading(true); setNotice(""); setAnalysis(null)
    try {
      const response = await fetch("/api/written-work-defence", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title, course, work }) })
      const data = await response.json() as { analysis?: Analysis; provider?: "gemini" | "local"; error?: string }
      if (!response.ok || !data.analysis) throw new Error(data.error || "The defence map could not be built.")
      setAnalysis(data.analysis); setProvider(data.provider ?? "local")
      try {
        const previous = JSON.parse(localStorage.getItem("oxbridge-written-work-vault-v1") || "[]")
        const item = { title: title.trim() || "Submitted written work", text: work.trim(), saved: new Date().toISOString() }
        localStorage.setItem("oxbridge-written-work-vault-v1", JSON.stringify([item, ...(Array.isArray(previous) ? previous.filter((entry: { text?: string }) => entry.text !== item.text) : [])].slice(0, 10)))
      } catch {}
    } catch (error) { setNotice(error instanceof Error ? error.message : "The defence map could not be built.") }
    finally { setLoading(false) }
  }

  return <main className="min-h-screen bg-[#f4f7f7] text-[#172b3a]">
    <header className="border-b bg-white"><div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6"><Button asChild variant="ghost"><Link href="/tutor"><ArrowLeft />Tutor</Link></Button><Badge variant="outline"><FileText className="size-3.5" />Written Work Defence Simulator</Badge></div></header>
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6">
      <section><p className="text-xs font-bold uppercase tracking-[.18em] text-[#147d91]">Upload → map claims → defend them live</p><h1 className="mt-2 font-serif text-4xl font-bold">Turn submitted work into an interview that pushes back.</h1><p className="mt-3 max-w-3xl leading-7 text-slate-600">Import the exact essay, EPQ section or project explanation. The app identifies claims, assumptions and evidence questions, then the adaptive interview engine challenges your answers one branch at a time.</p></section>
      {notice ? <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">{notice}</div> : null}

      <section className="grid gap-5 lg:grid-cols-[1.08fr_.92fr]">
        <Card><CardHeader><CardTitle className="font-serif text-2xl">1 · Load the exact work</CardTitle><CardDescription>Do not paraphrase the submitted version if you are practising for a real written-work discussion.</CardDescription></CardHeader><CardContent className="space-y-4"><div className="grid gap-3 sm:grid-cols-2"><label><span className="mb-1 block text-sm font-semibold">Title</span><Input value={title} onChange={event => setTitle(event.target.value)} placeholder="Essay / EPQ / project title" /></label><label><span className="mb-1 block text-sm font-semibold">Course</span><Input value={course} onChange={event => setCourse(event.target.value)} /></label></div><Textarea rows={20} value={work} onChange={event => { setWork(event.target.value); setAnalysis(null) }} placeholder="Paste the written work here…"/><div className="flex flex-wrap items-center justify-between gap-3"><span className="text-xs text-slate-500">{work.trim() ? work.trim().split(/\s+/).length : 0} words</span><div className="flex gap-2"><label className={`inline-flex h-10 items-center gap-2 rounded-md border bg-white px-4 text-sm font-medium ${importing ? "cursor-wait opacity-60" : "cursor-pointer"}`}>{importing ? <Loader2 className="size-4 animate-spin"/> : <Upload className="size-4"/>}{importing ? "Importing…" : "Import document"}<input className="hidden" type="file" accept=".pdf,.docx,.txt,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown" disabled={importing} onChange={importDocument}/></label><Button onClick={() => void buildDefence()} disabled={work.trim().length < 80 || loading || importing}>{loading ? <Loader2 className="animate-spin"/> : <Brain />}{loading ? "Building…" : "Build defence map"}</Button></div></div></CardContent></Card>

        <div className="space-y-4">{analysis ? <><Card className="border-0 bg-[#102a43] text-white"><CardHeader><div className="flex items-center justify-between gap-2"><CardTitle className="font-serif text-2xl">2 · Defence map</CardTitle><Badge className="bg-white/10 text-white">{provider === "gemini" ? "AI-assisted" : "Built-in"}</Badge></div><CardDescription className="text-white/65">{analysis.summary}</CardDescription></CardHeader></Card><Card><CardHeader><CardTitle className="font-serif text-xl">Claims & assumptions</CardTitle></CardHeader><CardContent className="space-y-3"><div><p className="text-xs font-bold uppercase tracking-wider text-slate-500">Claims</p>{analysis.claims.slice(0, 6).map((item, index) => <p key={index} className="mt-2 text-sm leading-6"><strong>{index + 1}.</strong> {item}</p>)}</div><div className="border-t pt-3"><p className="text-xs font-bold uppercase tracking-wider text-slate-500">Assumptions</p>{analysis.assumptions.slice(0, 5).map((item, index) => <p key={index} className="mt-2 text-sm leading-6">• {item}</p>)}</div></CardContent></Card></> : <Card><CardHeader><CardTitle className="font-serif text-2xl">What the simulator will probe</CardTitle></CardHeader><CardContent className="space-y-2 text-sm leading-6 text-slate-600"><p>• Why a key claim follows from the evidence.</p><p>• Which assumption would break the argument.</p><p>• How you respond to conflicting evidence.</p><p>• What you would revise now.</p><p>• Whether your reasoning survives a counterexample.</p></CardContent></Card>}</div>
      </section>

      {analysis ? <section><WrittenWorkDefenceDrill title={title} course={course} analysis={analysis}/></section> : null}
    </div>
  </main>
}

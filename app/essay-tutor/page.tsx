"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { ArrowLeft, ArrowRight, CheckCircle2, FileText, Loader2, RefreshCw, Target } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import { lnatEssayPrompts, taraEssayPrompts } from "@/lib/question-bank"
import { lnatEssayPrompts2027, taraWritingPrompts2027 } from "@/lib/question-bank-2027"

type Test = "LNAT" | "TARA"
type Diagnostic = { label: string; score: number; note: string; next: string }
type ParagraphReview = { index: number; status: "strong" | "mixed" | "improve"; role: string; whatWorks: string; improve: string; action: string }
type SentenceHighlight = { paragraphIndex: number; sentenceIndex: number; sentence: string; status: "strong" | "mixed" | "improve"; label: string; explanation: string; rewrite: string }
type DetailedAnalysis = {
  overallSummary: string
  argumentMap: { thesis: string; coreReasons: string[]; counterargument: string; conclusion: string }
  dimensions: Array<{ label: string; score: number; evidence: string; improvement: string }>
  paragraphs: ParagraphReview[]
  sentenceHighlights: SentenceHighlight[]
  strongestSection: { paragraph: number; reason: string }
  priorityImprovements: string[]
  rewritePlan: string[]
  examTechnique: string[]
}

const PROGRESS_KEY = "oxbridge-tutor-progress-v2"

function analyse(text: string): Diagnostic[] {
  const clean = text.trim(), lower = clean.toLowerCase(), words = clean ? clean.split(/\s+/).length : 0
  const paras = clean.split(/\n\s*\n/).filter(Boolean)
  const thesis = /\b(i argue|this essay argues|overall|should|should not|the strongest|on balance|my view)\b/i.test(clean)
  const reasons = (lower.match(/\b(because|therefore|since|so that|this means|consequently|hence)\b/g) || []).length
  const counter = (lower.match(/\b(however|although|on the other hand|counterargument|objection|critics|one might argue|nevertheless)\b/g) || []).length
  const qualification = (lower.match(/\b(depends|unless|insofar|provided|whereas|to the extent|in some cases|not necessarily)\b/g) || []).length
  const examples = (lower.match(/\b(for example|for instance|consider|suppose|case)\b/g) || []).length
  return [
    { label: "Thesis", score: thesis ? 90 : Math.min(65, words / 3), note: thesis ? "A position is visible in the response." : "The central position is not yet easy to identify.", next: "State a precise answer to the prompt in one or two sentences before developing reasons." },
    { label: "Reasoning", score: Math.min(100, 25 + reasons * 12), note: `${reasons} explicit reasoning link${reasons === 1 ? "" : "s"} detected.`, next: "Make the inferential step explicit: why does this reason support the conclusion?" },
    { label: "Counterargument", score: Math.min(100, 20 + counter * 20), note: `${counter} counterargument signal${counter === 1 ? "" : "s"} detected.`, next: "Present the strongest objection fairly, then explain exactly why it changes—or does not change—your thesis." },
    { label: "Qualification", score: Math.min(100, 20 + qualification * 18), note: `${qualification} qualification signal${qualification === 1 ? "" : "s"} detected.`, next: "Identify the condition under which your argument would be weaker, stronger or no longer apply." },
    { label: "Examples", score: Math.min(100, 20 + examples * 18), note: `${examples} example/case signal${examples === 1 ? "" : "s"} detected.`, next: "Use examples as tests of a principle, not substitutes for the principle." },
    { label: "Structure", score: Math.min(100, 30 + paras.length * 12 + (words > 350 ? 10 : 0)), note: `${paras.length} paragraph${paras.length === 1 ? "" : "s"} · ${words} words.`, next: "Give each paragraph one argumentative job and make the transition explain why the next step is needed." },
  ]
}

function highlightStyle(status: SentenceHighlight["status"]) {
  if (status === "strong") return "border-emerald-300 bg-emerald-50 text-emerald-950"
  if (status === "improve") return "border-rose-200 bg-rose-50 text-rose-950"
  return "border-amber-200 bg-amber-50 text-amber-950"
}

export default function EssayTutorPage() {
  const [test, setTest] = useState<Test>("LNAT")
  const [seed, setSeed] = useState(1)
  const [essay, setEssay] = useState("")
  const [reviewed, setReviewed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [provider, setProvider] = useState<"gemini" | "local" | null>(null)
  const [detailed, setDetailed] = useState<DetailedAnalysis | null>(null)

  const pool = test === "LNAT" ? [...lnatEssayPrompts2027, ...lnatEssayPrompts] : [...taraWritingPrompts2027, ...taraEssayPrompts]
  const prompt = pool[seed % pool.length]
  const diagnostics = useMemo(() => analyse(essay), [essay])
  const overall = essay.trim() ? Math.round(diagnostics.reduce((a, b) => a + b.score, 0) / diagnostics.length) : 0
  const weakest = diagnostics.slice().sort((a, b) => a.score - b.score)[0]
  const paragraphs = useMemo(() => essay.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean), [essay])

  const nextPrompt = () => { setSeed(s => s + 1); setEssay(""); setReviewed(false); setDetailed(null); setProvider(null) }

  async function reviewEssay() {
    if (!essay.trim() || loading) return
    setLoading(true)
    setReviewed(true)
    try {
      const response = await fetch("/api/essay-analysis", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ test, prompt, essay }) })
      const data = await response.json() as { analysis?: DetailedAnalysis; provider?: "gemini" | "local" }
      if (data.analysis) setDetailed(data.analysis)
      setProvider(data.provider ?? "local")
      try {
        const key = "oxbridge-essay-tutor-v1"
        const previous = JSON.parse(localStorage.getItem(key) || "[]") as unknown[]
        const item = { id: `essay-${Date.now()}`, test, prompt, essay, overall, weakest: weakest?.label, analysis: data.analysis ?? null, date: new Date().toISOString() }
        localStorage.setItem(key, JSON.stringify([item, ...previous].slice(0, 30)))
        const progress = JSON.parse(localStorage.getItem(PROGRESS_KEY) || "{}") as Record<string, unknown>
        const essayAnalyses = Array.isArray(progress.essayAnalyses) ? progress.essayAnalyses : []
        localStorage.setItem(PROGRESS_KEY, JSON.stringify({ ...progress, essayAnalyses: [item, ...essayAnalyses].slice(0, 30) }))
      } catch { /* analysis still displays */ }
    } catch { setProvider("local") } finally { setLoading(false) }
  }

  return <main className="min-h-screen bg-[#f6f8f8] text-[#172b3a]">
    <header className="border-b bg-white"><div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6"><Button asChild variant="ghost"><Link href="/student-home"><ArrowLeft />Student Home</Link></Button><Badge variant="outline"><FileText className="size-3.5" />Detailed Essay Analysis</Badge></div></header>
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <section className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-end"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#147d91]">LNAT / TARA argument writing</p><h1 className="mt-2 font-serif text-4xl font-bold">Full argument analysis down to sentence level.</h1><p className="mt-2 max-w-3xl text-slate-600">The review identifies the thesis, reasoning chain, counterargument, qualification, paragraph roles and then highlights individual sentences as strong, developing or needing improvement with a concrete rewrite direction.</p></div><div className="flex gap-2">{(["LNAT", "TARA"] as Test[]).map(x => <Button key={x} variant={test === x ? "default" : "outline"} onClick={() => { setTest(x); setEssay(""); setReviewed(false); setDetailed(null); setProvider(null) }}>{x}</Button>)}</div></section>

      <section className="grid gap-5 xl:grid-cols-[1.1fr_.9fr]"><Card className="shadow-none"><CardHeader><div className="flex flex-wrap gap-2"><Badge>{test}</Badge><Badge variant="outline">Practice prompt</Badge></div><CardTitle className="font-serif text-2xl leading-snug">{prompt}</CardTitle><CardDescription>Plan briefly, state a defensible position, develop reasons, answer the strongest objection and conclude without simply repeating the introduction.</CardDescription></CardHeader><CardContent className="space-y-4"><Textarea rows={22} value={essay} onChange={e => { setEssay(e.target.value); setReviewed(false); setDetailed(null) }} placeholder="Write your response here… Use blank lines between paragraphs for the clearest analysis." /><div className="flex flex-wrap items-center justify-between gap-3"><span className="text-sm text-slate-500">{essay.trim() ? essay.trim().split(/\s+/).length : 0}{test === "TARA" ? " / 750" : ""} words · {paragraphs.length} paragraph{paragraphs.length === 1 ? "" : "s"}</span><div className="flex gap-2"><Button variant="outline" onClick={nextPrompt}><RefreshCw />New prompt</Button><Button onClick={reviewEssay} disabled={!essay.trim() || loading}>{loading ? <Loader2 className="animate-spin" /> : <Target />} {loading ? "Analysing…" : "Full analysis"}</Button></div></div></CardContent></Card>

        <aside className="space-y-4">{reviewed ? <><Card className="border-0 bg-[#102a43] text-white shadow-none"><CardHeader><div className="flex items-center justify-between"><div><CardDescription className="text-blue-50/70">Practice argument signal</CardDescription><CardTitle className="font-serif text-5xl">{overall}<span className="text-xl text-blue-100/60">/100</span></CardTitle></div>{provider && <Badge className="bg-white/10 text-white">{provider === "gemini" ? "AI detailed review" : "Built-in review"}</Badge>}</div><CardDescription className="text-blue-50/70">Not an official LNAT/TARA score.</CardDescription></CardHeader></Card><Card className="shadow-none"><CardHeader><CardTitle className="font-serif text-xl">Argument diagnostics</CardTitle></CardHeader><CardContent className="space-y-4">{diagnostics.map(d => <div key={d.label}><div className="mb-1 flex justify-between text-sm"><strong>{d.label}</strong><span>{Math.round(d.score)}%</span></div><Progress value={d.score} /><p className="mt-1 text-xs text-slate-500">{d.note}</p></div>)}</CardContent></Card><Card className="border-amber-200 bg-amber-50 shadow-none"><CardHeader><CardDescription>First revision priority</CardDescription><CardTitle className="font-serif text-xl">{weakest.label}</CardTitle></CardHeader><CardContent><p className="text-sm leading-relaxed">{weakest.next}</p></CardContent></Card></> : <Card className="shadow-none"><CardHeader><CardTitle className="font-serif text-xl">What the full review checks</CardTitle></CardHeader><CardContent className="space-y-2 text-sm text-slate-600"><p>• Thesis and directness</p><p>• Logical chain between claims</p><p>• Counterargument and response</p><p>• Qualification and exceptions</p><p>• Evidence/examples</p><p>• Precision and relevance</p><p>• Paragraph function and transitions</p><p>• Conclusion and overall coherence</p></CardContent></Card>}</aside></section>

      {reviewed && detailed && <div className="mt-7 space-y-6">
        <Card className="shadow-none"><CardHeader><CardTitle className="font-serif text-2xl">Detailed overview</CardTitle><CardDescription>{detailed.overallSummary}</CardDescription></CardHeader><CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"><div className="rounded-2xl bg-[#edf7f8] p-4"><p className="text-xs font-bold uppercase tracking-wider text-[#147d91]">Thesis</p><p className="mt-2 text-sm leading-6">{detailed.argumentMap.thesis}</p></div><div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs font-bold uppercase tracking-wider text-slate-500">Core reasons</p>{detailed.argumentMap.coreReasons.slice(0, 3).map(reason => <p key={reason} className="mt-2 text-sm leading-6">• {reason}</p>)}</div><div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs font-bold uppercase tracking-wider text-slate-500">Counterargument</p><p className="mt-2 text-sm leading-6">{detailed.argumentMap.counterargument}</p></div><div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs font-bold uppercase tracking-wider text-slate-500">Conclusion</p><p className="mt-2 text-sm leading-6">{detailed.argumentMap.conclusion}</p></div></CardContent></Card>

        <Card className="shadow-none"><CardHeader><CardTitle className="font-serif text-2xl">Sentence-by-sentence highlighted essay</CardTitle><CardDescription>Green = strong argumentative work. Amber = useful but needs sharpening. Red = a clear improvement opportunity. Open each sentence to see why it was classified that way and what to do with it.</CardDescription></CardHeader><CardContent className="space-y-6">{paragraphs.map((paragraph, index) => { const review = detailed.paragraphs.find(item => item.index === index); const sentences = detailed.sentenceHighlights.filter(item => item.paragraphIndex === index); return <div key={`${index}-${paragraph.slice(0, 20)}`} className="rounded-2xl border bg-white p-5"><div className="mb-4 flex flex-wrap items-center justify-between gap-2"><div className="flex gap-2"><Badge variant="outline">Paragraph {index + 1}</Badge><Badge>{review?.role ?? "Development"}</Badge></div><span className="text-xs text-slate-500">{sentences.length} annotated sentence{sentences.length === 1 ? "" : "s"}</span></div><div className="space-y-3">{sentences.length ? sentences.map(item => <details key={`${item.paragraphIndex}-${item.sentenceIndex}`} className={`rounded-xl border p-3 ${highlightStyle(item.status)}`}><summary className="cursor-pointer list-none text-sm leading-7"><span className="mr-2 inline-block rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">{item.label}</span>{item.sentence}</summary><div className="mt-3 grid gap-3 border-t border-black/10 pt-3 md:grid-cols-2"><div><p className="text-xs font-bold uppercase tracking-wider">Why</p><p className="mt-1 text-sm leading-6">{item.explanation}</p></div><div><p className="text-xs font-bold uppercase tracking-wider">Improve / keep</p><p className="mt-1 text-sm leading-6">{item.rewrite}</p></div></div></details>) : <p className="text-sm leading-7">{paragraph}</p>}</div>{review && <div className="mt-4 grid gap-3 md:grid-cols-2"><div className="rounded-xl bg-emerald-50 p-3"><p className="text-xs font-bold uppercase tracking-wider text-emerald-800">Paragraph strength</p><p className="mt-1 text-sm leading-6">{review.whatWorks}</p></div><div className="rounded-xl bg-amber-50 p-3"><p className="text-xs font-bold uppercase tracking-wider text-amber-800">Paragraph improvement</p><p className="mt-1 text-sm leading-6">{review.improve}</p><p className="mt-2 text-xs text-slate-500"><strong>Revision action:</strong> {review.action}</p></div></div>}</div>})}</CardContent></Card>

        <Card className="shadow-none"><CardHeader><CardTitle className="font-serif text-2xl">Full reasoning analysis</CardTitle></CardHeader><CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{detailed.dimensions.map(item => <div key={item.label} className="rounded-2xl border bg-white p-4"><div className="flex items-center justify-between gap-2"><strong>{item.label}</strong><Badge variant="outline">{Math.round(item.score)}%</Badge></div><Progress value={item.score} className="mt-3" /><p className="mt-3 text-sm leading-6 text-slate-600">{item.evidence}</p><div className="mt-3 rounded-xl bg-amber-50 p-3 text-sm leading-6"><strong>Improve:</strong> {item.improvement}</div></div>)}</CardContent></Card>

        <div className="grid gap-5 lg:grid-cols-3"><Card className="border-emerald-200 bg-emerald-50 shadow-none"><CardHeader><CardTitle className="font-serif text-xl">Strongest section</CardTitle></CardHeader><CardContent><p className="text-sm leading-6"><strong>Paragraph {detailed.strongestSection.paragraph + 1}.</strong> {detailed.strongestSection.reason}</p></CardContent></Card><Card className="border-amber-200 bg-amber-50 shadow-none"><CardHeader><CardTitle className="font-serif text-xl">Priority improvements</CardTitle></CardHeader><CardContent className="space-y-2">{detailed.priorityImprovements.map(item => <p key={item} className="flex gap-2 text-sm leading-6"><Target className="mt-1 size-4 shrink-0" />{item}</p>)}</CardContent></Card><Card className="shadow-none"><CardHeader><CardTitle className="font-serif text-xl">Rewrite plan</CardTitle></CardHeader><CardContent className="space-y-2">{detailed.rewritePlan.map((item, index) => <p key={item} className="flex gap-2 text-sm leading-6"><span className="grid size-6 shrink-0 place-items-center rounded-full bg-[#102a43] text-xs font-bold text-white">{index + 1}</span>{item}</p>)}</CardContent></Card></div>

        <Card className="shadow-none"><CardHeader><CardTitle className="font-serif text-2xl">Exam-technique actions</CardTitle></CardHeader><CardContent className="grid gap-3 md:grid-cols-3">{detailed.examTechnique.map(item => <div key={item} className="rounded-xl bg-slate-50 p-4 text-sm leading-6"><CheckCircle2 className="mb-2 size-5 text-[#147d91]" />{item}</div>)}</CardContent></Card>
      </div>}

      <div className="mt-6 flex flex-wrap gap-2"><Button asChild variant="outline"><Link href="/advanced-practice">Admissions-test practice <ArrowRight /></Link></Button><Button asChild variant="outline"><Link href="/full-papers">Full papers <ArrowRight /></Link></Button></div>
    </div>
  </main>
}

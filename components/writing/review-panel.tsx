"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { buildOfflineWritingReport } from "@/lib/writing/offline-review"
import { scoreStrictEssay, type StrictEssayScore } from "@/lib/writing/strict-score"
import { StrictScorePanel } from "@/components/writing/strict-score-panel"
import { LEVELS, mechanics, splitParagraphs, type WritingMode, type WritingReport } from "@/lib/writing/review"

type Result = { provider: "gemini" | "local"; report: WritingReport | null; strictScore?: StrictEssayScore | null; message?: string; mechanics: { words: number; characters: number; paragraphs: number; checks: { paragraph: number; quote: string; message: string }[] }; rubricVersion: number }
function Evidence({ paragraph, quote }: { paragraph: number | null; quote: string }) {
  return paragraph === null ? <p className="text-xs text-slate-500">Whole-draft observation; no specific passage cited.</p> : <blockquote className="my-2 border-l-2 border-teal-500 bg-teal-50 p-3 text-sm"><strong className="block text-xs text-teal-800">Paragraph {paragraph + 1}</strong><span className="whitespace-pre-wrap">“{quote}”</span></blockquote>
}
export function ReviewPanel({ essay, mode, prompt = "", test = "Essay", course = "" }: { essay: string; mode: WritingMode; prompt?: string; test?: string; course?: string }) {
  const signature = JSON.stringify({ essay, mode, prompt, test, course })
  const [saved, setSaved] = useState<{ signature: string; data: Result } | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [saveStatus, setSaveStatus] = useState("")
  const [completed, setCompleted] = useState<number[]>([])
  const controller = useRef<AbortController | null>(null)
  useEffect(() => { setError(""); setBusy(false); setCompleted([]); setSaveStatus(""); return () => controller.current?.abort() }, [signature])
  const data = saved?.signature === signature ? saved.data : null
  const report = data?.report
  const paragraphs = splitParagraphs(essay)
  const canReview = essay.trim().length >= 40 && essay.length <= 20000

  function localResult(message: string): Result {
    const report = buildOfflineWritingReport({ essay, mode, prompt, test, course })
    return { provider: "local", report, strictScore: mode === "essay" ? scoreStrictEssay(report, prompt, essay) : null, mechanics: mechanics(essay), message, rubricVersion: 4 }
  }

  function acceptResult(result: Result) {
    setSaved({ signature, data: result })
    if (!result.report) return
    try {
      const key = mode === "essay" ? "oxbridge-essay-tutor-v1" : "oxbridge-statement-reviews-v2"
      const previous: unknown = JSON.parse(localStorage.getItem(key) || "[]")
      const dimensions = result.report.criteria.filter(c => c.level !== null).map(c => ({ label: c.label, score: c.level! * 25, evidence: c.judgement, improvement: c.action }))
      const legacyOverall = dimensions.length ? Math.round(dimensions.reduce((a,c) => a + c.score, 0) / dimensions.length) : undefined
      const overall = mode === "essay" ? (result.strictScore?.score ?? legacyOverall) : legacyOverall
      const item = { id: `writing-${Date.now()}`, test, prompt, essay, course, mode, rubricVersion: result.rubricVersion, provider: result.provider, overall, grade: result.strictScore?.grade, strictScore: result.strictScore, weakest: result.report.priorities[0]?.title, report: result.report, analysis: { dimensions, priorityImprovements: result.report.priorities.map(p => p.action) }, date: new Date().toISOString() }
      localStorage.setItem(key, JSON.stringify([item, ...(Array.isArray(previous) ? previous : [])].slice(0, 30)))
      if (mode === "essay") {
        const progress = JSON.parse(localStorage.getItem("oxbridge-tutor-progress-v2") || "{}")
        localStorage.setItem("oxbridge-tutor-progress-v2", JSON.stringify({ ...progress, essayAnalyses: [item, ...(Array.isArray(progress.essayAnalyses) ? progress.essayAnalyses : [])].slice(0,30) }))
      }
      setSaveStatus("Review saved on this device and queued for cloud sync when signed in.")
    } catch { setSaveStatus("Review is displayed, but device storage is unavailable. Download the report to keep it.") }
  }

  async function review() {
    controller.current?.abort()
    const abort = new AbortController(); controller.current = abort
    setBusy(true); setError(""); setSaved(null); setCompleted([]); setSaveStatus("")
    try {
      const response = await fetch("/api/essay-analysis", { method: "POST", headers: { "Content-Type": "application/json" }, body: signature, signal: abort.signal })
      const result = await response.json() as Result & { error?: string }
      if (!response.ok) throw new Error(result.error || "The review could not be completed.")
      if (abort.signal.aborted) return
      acceptResult(result)
    } catch (e) {
      if (abort.signal.aborted) return
      try {
        acceptResult(localResult("The network or AI service could not be reached, so this review was completed entirely on this device using the deterministic offline rubric."))
      } catch {
        setError(e instanceof Error ? e.message : "Analysis failed. Please retry.")
      }
    } finally { if (!abort.signal.aborted) setBusy(false) }
  }

  function reviewOffline() {
    controller.current?.abort()
    setBusy(false); setError(""); setSaved(null); setCompleted([]); setSaveStatus("")
    try { acceptResult(localResult("Offline mode: this draft was analysed on this device without sending it to the AI review endpoint.")) }
    catch { setError("The offline review could not be completed. Check that the draft contains at least 40 characters and no more than 40 paragraphs.") }
  }

  function download() {
    if (!report || !data) return
    const scoreLines = data.strictScore ? ["", `Strict practice mark: ${data.strictScore.score}/100`, `Practice grade: ${data.strictScore.grade} — ${data.strictScore.descriptor}`, `Raw weighted mark: ${data.strictScore.rawScore}/100`, ...data.strictScore.components.map(c => `${c.label}: ${c.earned}/${c.weight}`), ...(data.strictScore.caps.length ? ["Strict ceilings:", ...data.strictScore.caps.map(c => `Maximum ${c.maximum}/100 — ${c.reason}`)] : ["Strict ceilings: none triggered"]), data.strictScore.note, ""] : []
    const lines = [mode === "essay" ? "Essay review" : "Personal statement review", `Review source: ${data.provider === "local" ? "deterministic offline engine" : "AI-assisted evidence review"}`, prompt || course, ...scoreLines, report.summary, "", ...report.criteria.flatMap(c => [c.label + ': ' + (c.level === null ? "Not assessed" : LEVELS[c.level]), c.judgement, c.evidence.quote ? `P${c.evidence.paragraph!+1}: "${c.evidence.quote}"` : "Whole-draft observation", "Action: " + c.action, ""]), "Revision priorities", ...report.priorities.flatMap((p,i) => [`${i+1}. ${p.title}`, p.why, p.action, "Success check: " + p.successCheck]), "", "Paragraph review", ...report.paragraphs.flatMap(p => [`P${p.index+1}: ${p.purpose}`, "Strength: " + p.strength, "Limitation: " + p.limitation, "Action: " + p.action]), "", "Passage annotations", ...report.annotations.flatMap(a => [`P${a.evidence.paragraph!+1}: "${a.evidence.quote}"`, a.explanation, a.revision]), "", "Follow-up questions", ...report.questions.map(q => q.question + " — " + q.purpose), "", "Review limitations", ...report.limitations, "", "Original draft", essay]
    const url = URL.createObjectURL(new Blob([lines.join('\n')], { type: "text/plain;charset=utf-8" })); const a = document.createElement("a"); a.href = url; a.download = `${mode}-review.txt`; a.click(); setTimeout(() => URL.revokeObjectURL(url),1000)
  }
  return <section className="space-y-5" aria-label="Detailed writing review">
    <div className="rounded-2xl border bg-white p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-serif text-2xl font-bold">Evidence-based {mode === "essay" ? "essay" : "statement"} analysis</h2><p className="mt-1 text-sm text-slate-600">Specific passages, explained judgements and a practical revision plan.</p></div><div className="flex flex-wrap gap-2"><Button onClick={() => void review()} disabled={busy || !canReview}>{busy ? "Reading and checking evidence…" : report ? "Analyse with AI again" : "Analyse writing"}</Button><Button variant="outline" onClick={reviewOffline} disabled={!canReview}>Analyse offline</Button></div></div><p className="mt-3 text-xs text-slate-500">Analyse writing attempts the AI evidence review first and automatically falls back to the deterministic local rubric if the service fails. Analyse offline runs entirely on this device. Essay marks are strict ScholarBridge practice grades, not official Oxford/Cambridge, school or exam-board marks.</p>{error && <p role="alert" className="mt-3 text-sm text-red-800">{error}</p>}{saved && !data && <p className="mt-3 text-sm text-amber-800">Your draft or task has changed. Run a new review to update the feedback.</p>}</div>
    {data?.message && <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm">{data.message}</div>}
    {data && <div className="rounded-xl bg-slate-50 p-4 text-sm"><div className="flex flex-wrap items-center justify-between gap-2"><strong>Draft facts:</strong><span className="rounded-full border bg-white px-3 py-1 text-xs font-semibold">{data.provider === "local" ? "Offline deterministic review" : "AI-assisted review"}</span></div><p className="mt-2">{data.mechanics.words} words · {data.mechanics.characters} characters · {data.mechanics.paragraphs} paragraphs</p>{!report && <p className="mt-2">No substantive quality judgement is available. {data.mechanics.checks.length ? "Sentence-length checks follow." : "No long-sentence flags found; this does not assess reasoning or content."}</p>}{!report && data.mechanics.checks.map((c,i) => <div className="mt-3" key={i}><Evidence paragraph={c.paragraph} quote={c.quote}/><p>{c.message}</p></div>)}</div>}
    {report && <>
      <div className="rounded-2xl bg-[#102a43] p-6 text-white"><p className="text-xs font-bold uppercase tracking-[.16em] text-slate-200">{data?.provider === "local" ? "Offline evidence review" : "AI-assisted evidence review"}</p><h2 className="mt-2 font-serif text-2xl font-bold">What this draft achieves</h2><p className="mt-3 whitespace-pre-wrap leading-7">{report.summary}</p><p className="mt-3 text-sm text-slate-200">{saveStatus}</p><Button className="mt-3 bg-white text-slate-900 hover:bg-slate-100" onClick={download}>Download full report</Button></div>
      {mode === "essay" && <StrictScorePanel report={report} prompt={prompt} essay={essay}/>} 
      <section className="rounded-2xl border bg-white p-5"><h2 className="font-serif text-2xl font-bold">Your revision priorities</h2><p className="mt-1 text-sm text-slate-500">Work through these in order. Ticking an action records your checklist for this review; re-analysis assesses the revised draft.</p><div className="mt-4 space-y-4">{report.priorities.map((p,i) => <div className="rounded-xl border p-4" key={i}><label className="flex items-center gap-3 font-semibold"><input type="checkbox" checked={completed.includes(i)} onChange={() => setCompleted(current => current.includes(i) ? current.filter(n => n !== i) : [...current,i])}/>{i+1}. {p.title}</label><Evidence {...p.evidence}/><p className="text-sm"><strong>Why it matters:</strong> {p.why}</p><p className="mt-2 text-sm"><strong>Do this:</strong> {p.action}</p><p className="mt-2 text-sm text-teal-900"><strong>Success check:</strong> {p.successCheck}</p></div>)}</div></section>
      <section><h2 className="mb-3 font-serif text-2xl font-bold">Criteria and evidence</h2><p className="mb-3 text-sm text-slate-600">Levels describe the supplied draft: not demonstrated → emerging → developing → secure → convincing. The weighted marks feed the strict practice score and are not official admissions or exam-board percentages.</p><div className="grid gap-4 md:grid-cols-2">{report.criteria.map(c => <article className="rounded-2xl border bg-white p-5" key={c.label}><h3 className="font-semibold">{c.label}</h3><p className="mt-1 text-sm font-semibold text-teal-800">{c.level === null ? "Not enough context to assess" : LEVELS[c.level]}</p><p className="mt-3 text-sm leading-6">{c.judgement}</p><Evidence {...c.evidence}/><p className="text-sm leading-6"><strong>Next step:</strong> {c.action}</p></article>)}</div></section>
      <section className="space-y-4"><h2 className="font-serif text-2xl font-bold">Paragraph-by-paragraph review</h2>{report.paragraphs.slice().sort((a,b) => a.index-b.index).map(p => <details key={p.index} className="rounded-xl border bg-white p-5"><summary className="cursor-pointer font-semibold">Paragraph {p.index+1}: {p.purpose}</summary><p className="mt-3 whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-sm leading-7">{paragraphs[p.index]}</p><p className="mt-3 text-sm"><strong>What works:</strong> {p.strength}</p><p className="mt-2 text-sm"><strong>What needs attention:</strong> {p.limitation}</p><p className="mt-2 text-sm"><strong>Revision action:</strong> {p.action}</p></details>)}</section>
      <section className="rounded-2xl border bg-white p-5"><h2 className="font-serif text-2xl font-bold">Close reading: key passages</h2><p className="mt-1 text-sm text-slate-500">{report.annotations.length} selected annotations. Each quotation is checked against your draft; this confirms its location, not the correctness of the judgement.</p><div className="mt-4 space-y-4">{report.annotations.map((a,i) => <article className="rounded-xl border p-4" key={i}><span className="text-xs font-bold uppercase text-teal-800">{a.kind}</span><Evidence {...a.evidence}/><p className="text-sm leading-6">{a.explanation}</p><p className="mt-2 text-sm leading-6"><strong>Revision / retain:</strong> {a.revision}</p></article>)}</div></section>
      <section className="rounded-2xl border bg-white p-5"><h2 className="font-serif text-2xl font-bold">Test and defend your ideas</h2>{report.questions.map((q,i) => <div key={i} className="mt-4 border-t pt-4"><Evidence {...q.evidence}/><p className="font-semibold">{q.question}</p><p className="mt-1 text-sm text-slate-600">{q.purpose}</p></div>)}</section>
      <section className="rounded-xl bg-slate-100 p-4"><h2 className="font-semibold">What this review cannot establish</h2><ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{report.limitations.map((l,i) => <li key={i}>{l}</li>)}</ul></section>
    </>}
  </section>
}

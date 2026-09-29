"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { ArrowLeft, ArrowRight, FileText, Save, ShieldCheck } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { ReviewPanel } from "@/components/writing/review-panel"
import { PersonalStatementAudit } from "@/components/application/personal-statement-audit"
import { APPLICATION_KEY } from "@/lib/personal-tutor"
import { analysePersonalStatement, combineUcasAnswers, UCAS_MIN_SECTION_CHARACTERS, UCAS_SECTIONS, UCAS_TOTAL_CHARACTER_LIMIT, type TargetUniversity, type UcasAnswers, type UcasSectionKey } from "@/lib/application/personal-statement-analysis"

const STORAGE_KEY = "oxbridge-personal-statement-ucas-v3"
const ANALYSIS_KEY = "oxbridge-personal-statement-analysis-v3"
const emptyAnswers: UcasAnswers = { motivation: "", preparation: "", outside: "" }
type SavedStatement = { answers: UcasAnswers; course: string; university: TargetUniversity; savedAt?: string }
function safeUniversity(value: unknown): TargetUniversity { return value === "Oxford" || value === "Cambridge" || value === "Both" ? value : "Both" }

export default function PersonalStatementMapPage() {
  const [answers, setAnswers] = useState<UcasAnswers>(emptyAnswers)
  const [course, setCourse] = useState("")
  const [university, setUniversity] = useState<TargetUniversity>("Both")
  const [saved, setSaved] = useState(false)
  const [hydrated, setHydrated] = useState(false)
  const combined = useMemo(() => combineUcasAnswers(answers), [answers])
  const analysis = useMemo(() => analysePersonalStatement({ answers, course, university }), [answers, course, university])
  const hasDraft = analysis.totalCharacters > 0

  useEffect(() => {
    try {
      const savedStatement = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null") as SavedStatement | null
      const application = JSON.parse(localStorage.getItem(APPLICATION_KEY) || "{}") as { course?: string; university?: TargetUniversity }
      if (savedStatement?.answers) {
        setAnswers({ ...emptyAnswers, ...savedStatement.answers })
        setCourse(savedStatement.course || application.course || "")
        setUniversity(safeUniversity(savedStatement.university || application.university))
      } else {
        const legacy = JSON.parse(localStorage.getItem("oxbridge-personal-statement-v1") || "{}") as { text?: string }
        if (legacy.text) setAnswers({ ...emptyAnswers, motivation: legacy.text })
        if (application.course) setCourse(application.course)
        setUniversity(safeUniversity(application.university))
      }
    } catch { /* begin with blank editor */ }
    finally { setHydrated(true) }
  }, [])

  function setAnswer(key: UcasSectionKey, value: string) { setAnswers(current => ({ ...current, [key]: value })); setSaved(false) }
  function saveStatement() {
    const payload: SavedStatement = { answers, course, university, savedAt: new Date().toISOString() }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
      localStorage.setItem(ANALYSIS_KEY, JSON.stringify({ ...analysis, course, university, savedAt: payload.savedAt, sectionCharacters: Object.fromEntries(analysis.sections.map(section => [section.key, section.characters])) }))
      localStorage.setItem("oxbridge-personal-statement-v1", JSON.stringify({ text: combined, claims: analysis.claims, date: payload.savedAt }))
      setSaved(true)
    } catch { setSaved(false) }
  }

  if (!hydrated) return <main className="min-h-screen bg-[#f6f8f8] p-8 text-[#172b3a]"><p className="text-sm text-slate-600">Loading your saved application context…</p></main>

  return <main className="min-h-screen bg-[#f6f8f8] text-[#172b3a]">
    <header className="border-b bg-white"><div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6"><Button asChild variant="ghost"><Link href="/student-home"><ArrowLeft/>Student Home</Link></Button><Badge variant="outline"><FileText className="size-3.5"/>Application evidence audit</Badge></div></header>
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6">
      <section className="grid gap-5 lg:grid-cols-[1.2fr_.8fr]"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#147d91]">Personal statement + application evidence</p><h1 className="mt-2 font-serif text-4xl font-bold">Build a statement you can actually defend.</h1><p className="mt-3 max-w-3xl leading-7 text-slate-600">Work in the current three-question UCAS structure. The analyser checks each answer separately, maps academic claims to evidence and reflection, measures demonstrated depth, and compares your evidence with relevant Oxford/Cambridge course criteria. It does not predict admission or imitate an admissions decision.</p></div><Card className="border-0 bg-[#102a43] text-white"><CardHeader><CardDescription className="text-white/65">Current draft</CardDescription><CardTitle className="font-serif text-4xl">{analysis.totalCharacters.toLocaleString()}</CardTitle><CardDescription className="text-white/65">of {UCAS_TOTAL_CHARACTER_LIMIT.toLocaleString()} UCAS characters · {analysis.totalWords} words</CardDescription></CardHeader><CardContent><div className="flex flex-wrap gap-2"><Badge className={analysis.withinCharacterLimit ? "bg-emerald-100 text-emerald-900" : "bg-red-100 text-red-900"}>{analysis.withinCharacterLimit ? "Within total limit" : "Over total limit"}</Badge><Badge className={analysis.allSectionsMeetMinimum ? "bg-emerald-100 text-emerald-900" : "bg-amber-100 text-amber-900"}>{analysis.allSectionsMeetMinimum ? "All section minimums met" : "Section minimum incomplete"}</Badge></div></CardContent></Card></section>
      <Card className="shadow-none"><CardHeader><CardTitle className="font-serif text-2xl">Application target</CardTitle><CardDescription>The course and university setting changes the course-fit evidence check. “Both” is useful for preparation comparison; applicants cannot apply to Oxford and Cambridge in the same UCAS cycle.</CardDescription></CardHeader><CardContent className="grid gap-4 md:grid-cols-2"><label className="block"><span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">University</span><select aria-label="University" className="h-10 w-full rounded-md border bg-white px-3 text-sm" value={university} onChange={event=>{setUniversity(safeUniversity(event.target.value));setSaved(false)}}><option>Oxford</option><option>Cambridge</option><option>Both</option></select></label><label className="block"><span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Target course</span><input aria-label="Target course" className="h-10 w-full rounded-md border bg-white px-3 text-sm" value={course} maxLength={160} onChange={event=>{setCourse(event.target.value);setSaved(false)}} placeholder="e.g. Physics, Medicine, Law"/></label></CardContent></Card>
      <section className="space-y-4">{UCAS_SECTIONS.map(section => { const diagnostic = analysis.sections.find(item => item.key === section.key); const characters = diagnostic?.characters ?? 0; return <Card className="shadow-none" key={section.key}><CardHeader><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wider text-[#147d91]">{section.label}</p><CardTitle className="mt-1 font-serif text-2xl">{section.question}</CardTitle><CardDescription className="mt-2 max-w-4xl">{section.purpose}</CardDescription></div><Badge variant="outline" className={characters >= UCAS_MIN_SECTION_CHARACTERS ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-amber-200 bg-amber-50 text-amber-900"}>{characters.toLocaleString()} chars · min {UCAS_MIN_SECTION_CHARACTERS}</Badge></div></CardHeader><CardContent><Textarea aria-label={`${section.label} answer`} rows={section.key === "outside" ? 12 : 10} value={answers[section.key]} onChange={event=>setAnswer(section.key,event.target.value)} placeholder={`Write your ${section.label.toLowerCase()} answer here…`}/>{diagnostic?.guidance.length ? <div className="mt-3 flex flex-wrap gap-2">{diagnostic.guidance.slice(0,3).map(item => <Badge variant="outline" key={item} className="whitespace-normal text-left font-normal">{item}</Badge>)}</div> : null}</CardContent></Card> })}</section>
      <div className="flex flex-wrap items-center gap-2"><Button onClick={saveStatement} disabled={!hasDraft}><Save/>{saved ? "Saved analysis" : "Save statement + analysis"}</Button><Button asChild variant="outline"><Link href="/application-profile">Open whole application profile <ArrowRight/></Link></Button><span className="text-xs text-slate-500">Your detailed AI/offline writing review remains available below.</span></div>
      {hasDraft ? <PersonalStatementAudit analysis={analysis}/> : <Card className="border-dashed shadow-none"><CardContent className="flex gap-3 p-6 text-sm text-slate-600"><ShieldCheck className="size-5 flex-none text-[#147d91]"/><p>Start writing any UCAS section to activate the structured evidence audit. The audit describes evidence visible in the draft; it does not decide whether an applicant is suitable for Oxford or Cambridge.</p></CardContent></Card>}
      {hasDraft && <section id="statement-analysis" className="scroll-mt-6"><ReviewPanel essay={combined} mode="statement" course={`${university} · ${course || "course not set"}`} test="UCAS personal statement"/></section>}
    </div>
  </main>
}

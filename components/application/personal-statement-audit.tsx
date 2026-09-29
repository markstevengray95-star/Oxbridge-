"use client"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { UCAS_SECTIONS, type StatementAnalysis, type UcasSectionKey } from "@/lib/application/personal-statement-analysis"
import { ArrowRight, BookOpenCheck, CheckCircle2, CircleAlert, Link2, ScanSearch, Target } from "lucide-react"

function sectionName(key: UcasSectionKey) {
  return UCAS_SECTIONS.find(section => section.key === key)?.label ?? key
}

function scoreLabel(score: number) {
  if (score >= 4) return "Strong evidence"
  if (score === 3) return "Secure evidence"
  if (score === 2) return "Developing"
  if (score === 1) return "Limited"
  return "Not evidenced"
}

function statusClass(status: "demonstrated" | "partial" | "not evidenced") {
  if (status === "demonstrated") return "border-emerald-200 bg-emerald-50 text-emerald-900"
  if (status === "partial") return "border-amber-200 bg-amber-50 text-amber-900"
  return "border-slate-200 bg-slate-50 text-slate-700"
}

export function PersonalStatementAudit({ analysis }: { analysis: StatementAnalysis }) {
  return <div className="space-y-6">
    <section className="grid gap-4 md:grid-cols-4">
      <Card className="shadow-none"><CardHeader className="pb-2"><CardDescription>Total UCAS characters</CardDescription><CardTitle className="font-serif text-3xl">{analysis.totalCharacters.toLocaleString()} / 4,000</CardTitle></CardHeader><CardContent><Badge variant="outline" className={analysis.withinCharacterLimit ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-red-200 bg-red-50 text-red-900"}>{analysis.withinCharacterLimit ? "Within limit" : "Over limit"}</Badge></CardContent></Card>
      <Card className="shadow-none"><CardHeader className="pb-2"><CardDescription>Evidence depth</CardDescription><CardTitle className="font-serif text-3xl capitalize">{analysis.evidenceStrength}</CardTitle></CardHeader><CardContent><p className="text-xs text-slate-500">Evidence strength, not an admissions score.</p></CardContent></Card>
      <Card className="shadow-none"><CardHeader className="pb-2"><CardDescription>Defendable claims</CardDescription><CardTitle className="font-serif text-3xl">{analysis.claims.length}</CardTitle></CardHeader><CardContent><p className="text-xs text-slate-500">Claims that could be tested or developed further.</p></CardContent></Card>
      <Card className="shadow-none"><CardHeader className="pb-2"><CardDescription>Repeated ideas</CardDescription><CardTitle className="font-serif text-3xl">{analysis.repeatedIdeas.length}</CardTitle></CardHeader><CardContent><p className="text-xs text-slate-500">Potential duplication across UCAS sections.</p></CardContent></Card>
    </section>

    <Card className="shadow-none">
      <CardHeader><div className="flex items-center gap-2"><ScanSearch className="size-5 text-[#147d91]"/><CardTitle className="font-serif text-2xl">1 · Three-question UCAS audit</CardTitle></div><CardDescription>Each answer is checked separately for minimum length, evidence, reflection, development and cross-section repetition.</CardDescription></CardHeader>
      <CardContent className="grid gap-4 lg:grid-cols-3">{analysis.sections.map(section => <article key={section.key} className="rounded-2xl border p-4"><div className="flex items-center justify-between gap-2"><h3 className="font-semibold">{sectionName(section.key)}</h3><Badge variant="outline" className={section.meetsMinimum ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-amber-200 bg-amber-50 text-amber-900"}>{section.characters} chars</Badge></div><div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs"><div className="rounded-lg bg-slate-50 p-2"><strong className="block text-base">{section.evidenceSentences}</strong>evidence</div><div className="rounded-lg bg-slate-50 p-2"><strong className="block text-base">{section.reflectiveSentences}</strong>analysis</div><div className="rounded-lg bg-slate-50 p-2"><strong className="block text-base">{section.developmentSentences}</strong>development</div></div>{section.guidance.length ? <ul className="mt-3 space-y-2 text-sm text-slate-600">{section.guidance.map(item => <li key={item} className="flex gap-2"><ArrowRight className="mt-0.5 size-4 flex-none text-[#147d91]"/><span>{item}</span></li>)}</ul> : <p className="mt-3 flex items-center gap-2 text-sm text-emerald-800"><CheckCircle2 className="size-4"/>No structural issue detected in this section.</p>}</article>)}</CardContent>
    </Card>

    <Card className="shadow-none">
      <CardHeader><div className="flex items-center gap-2"><Link2 className="size-5 text-[#147d91]"/><CardTitle className="font-serif text-2xl">2 · Claim → evidence → thinking → development</CardTitle></div><CardDescription>Strong application material does more than state enthusiasm. This map shows exactly where each academic claim currently stops.</CardDescription></CardHeader>
      <CardContent className="space-y-3">{analysis.claims.length ? analysis.claims.slice(0, 18).map(claim => <article key={claim.id} className="rounded-2xl border p-4"><div className="flex flex-wrap items-center gap-2"><Badge variant="outline">{sectionName(claim.section)}</Badge><Badge variant="outline">{claim.stageCount}/4 stages</Badge><span className="text-xs font-semibold text-slate-500">{claim.diagnosis}</span></div><p className="mt-3 text-sm leading-6">“{claim.text}”</p><div className="mt-3 flex flex-wrap gap-2 text-xs">{(["claim","evidence","thinking","development"] as const).map(stage => <span key={stage} className={`rounded-full border px-2.5 py-1 font-semibold ${claim.stages[stage] ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-slate-200 bg-slate-50 text-slate-500"}`}>{claim.stages[stage] ? "✓" : "○"} {stage}</span>)}</div><p className="mt-3 text-sm text-slate-600"><strong>Next move:</strong> {claim.nextPrompt}</p></article>) : <p className="text-sm text-slate-600">Add academic detail to build the evidence-chain map.</p>}</CardContent>
    </Card>

    <Card className="shadow-none">
      <CardHeader><div className="flex items-center gap-2"><BookOpenCheck className="size-5 text-[#147d91]"/><CardTitle className="font-serif text-2xl">3 · Academic depth map</CardTitle></div><CardDescription>Eight dimensions of demonstrated academic evidence. These are diagnostic indicators, not Oxford/Cambridge admissions marks.</CardDescription></CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">{analysis.dimensions.map(item => <article className="rounded-2xl border p-4" key={item.key}><div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold">{item.label}</h3><p className="mt-1 text-xs text-slate-500">{item.explanation}</p></div><Badge variant="outline">{item.score}/4</Badge></div><div className="mt-3 flex gap-1" aria-label={`${item.label}: ${item.score} out of 4`}>{Array.from({length:4},(_,index)=><span key={index} className={`h-2 flex-1 rounded-full ${index < item.score ? "bg-[#147d91]" : "bg-slate-200"}`}/>)}</div><p className="mt-2 text-sm font-semibold text-[#17677a]">{scoreLabel(item.score)}</p>{item.evidence.length ? <div className="mt-3 space-y-2">{item.evidence.slice(0,2).map((evidence,index)=><p key={`${evidence}-${index}`} className="rounded-lg bg-slate-50 p-2 text-xs leading-5 text-slate-600">“{evidence}”</p>)}</div> : <p className="mt-3 text-xs text-slate-500">No sentence currently provides clear evidence for this dimension.</p>}</article>)}</CardContent>
    </Card>

    <Card className="shadow-none">
      <CardHeader><div className="flex items-center gap-2"><Target className="size-5 text-[#147d91]"/><CardTitle className="font-serif text-2xl">4 · Course-specific criteria evidence</CardTitle></div><CardDescription>Matches the supplied draft to published university criteria where a verified course profile is available, and otherwise uses clearly labelled general academic-potential guidance.</CardDescription></CardHeader>
      <CardContent className="grid gap-4 lg:grid-cols-2">{analysis.criteria.map(criterion => <article className="rounded-2xl border p-4" key={`${criterion.sourceUrl}-${criterion.label}`}><div className="flex flex-wrap items-start justify-between gap-2"><div className="max-w-[75%]"><h3 className="font-semibold">{criterion.label}</h3><p className="mt-1 text-sm text-slate-600">{criterion.description}</p></div><Badge variant="outline" className={statusClass(criterion.status)}>{criterion.status}</Badge></div>{criterion.evidence.length ? <div className="mt-3 space-y-2">{criterion.evidence.map((evidence,index)=><p key={`${evidence}-${index}`} className="rounded-lg bg-slate-50 p-2 text-xs leading-5">“{evidence}”</p>)}</div> : <p className="mt-3 flex gap-2 text-sm text-slate-500"><CircleAlert className="mt-0.5 size-4 flex-none"/>No clear evidence found. Do not manufacture evidence; add this only if your real academic experience supports it.</p>}<a className="mt-3 inline-flex text-xs font-semibold text-[#147d91] underline underline-offset-2" href={criterion.sourceUrl} target="_blank" rel="noreferrer">{criterion.sourceLabel}</a></article>)}</CardContent>
    </Card>

    <Card className="border-[#147d91]/20 bg-[#edf7f8] shadow-none"><CardHeader><CardTitle className="font-serif text-2xl">Highest-impact next actions</CardTitle><CardDescription>Generated from the weakest evidence dimensions, missing course-fit evidence and UCAS structure.</CardDescription></CardHeader><CardContent className="space-y-3">{analysis.actions.length ? analysis.actions.map((action,index)=><div key={action} className="flex gap-3 rounded-xl bg-white p-3"><span className="grid size-7 flex-none place-items-center rounded-full bg-[#102a43] text-xs font-bold text-white">{index+1}</span><p className="text-sm leading-6">{action}</p></div>) : <p className="text-sm">No immediate structural action has been generated. Use the detailed writing review below for sentence-level refinement.</p>}</CardContent></Card>
  </div>
}

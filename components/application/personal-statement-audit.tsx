"use client"

import Link from "next/link"
import { ArrowRight, BookOpenCheck, CheckCircle2, CircleAlert, Link2, ScanSearch, ShieldQuestion, Sparkles, Target } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { UCAS_SECTIONS, type UcasSectionKey } from "@/lib/application/personal-statement-analysis"
import type { PersonalStatementAnalysisV3 } from "@/lib/application/personal-statement-analysis-v3"

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

function reflectionClass(status: "resolved" | "needs reflection" | "needs development") {
  if (status === "resolved") return "border-emerald-200 bg-emerald-50 text-emerald-900"
  return "border-amber-200 bg-amber-50 text-amber-900"
}

function riskClass(risk: "high" | "medium" | "low") {
  if (risk === "high") return "border-red-200 bg-red-50 text-red-900"
  if (risk === "medium") return "border-amber-200 bg-amber-50 text-amber-900"
  return "border-emerald-200 bg-emerald-50 text-emerald-900"
}

export function PersonalStatementAudit({ analysis }: { analysis: PersonalStatementAnalysisV3 }) {
  function launchVulnerabilityInterview() {
    const pack = analysis.interviewVulnerabilities.slice(0, 8)
    const questions = pack.flatMap(item => item.questions).slice(0, 16)
    const openingQuestion = questions[0] || "Choose one claim from your personal statement and explain what evidence would make you revise it."
    try {
      localStorage.setItem("oxbridge-personal-statement-vulnerability-v1", JSON.stringify({ items: pack, course: analysis.course, university: analysis.university, createdAt: new Date().toISOString() }))
      localStorage.setItem("oxbridge-panel-written-work-v1", JSON.stringify({
        title: "Personal statement vulnerability interview",
        course: analysis.course || undefined,
        analysis: { openingQuestion, defenceQuestions: questions.slice(1) },
      }))
    } catch { /* panel can still open without persisted context */ }
    window.location.href = "/panel-interview"
  }

  return <div className="space-y-6">
    <section className="grid gap-4 md:grid-cols-4">
      <Card className="shadow-none"><CardHeader className="pb-2"><CardDescription>Total UCAS characters</CardDescription><CardTitle className="font-serif text-3xl">{analysis.totalCharacters.toLocaleString()} / 4,000</CardTitle></CardHeader><CardContent><Badge variant="outline" className={analysis.withinCharacterLimit ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-red-200 bg-red-50 text-red-900"}>{analysis.withinCharacterLimit ? "Within limit" : "Over limit"}</Badge></CardContent></Card>
      <Card className="shadow-none"><CardHeader className="pb-2"><CardDescription>Evidence depth</CardDescription><CardTitle className="font-serif text-3xl capitalize">{analysis.evidenceStrength}</CardTitle></CardHeader><CardContent><p className="text-xs text-slate-500">Evidence strength, not an admissions score.</p></CardContent></Card>
      <Card className="shadow-none"><CardHeader className="pb-2"><CardDescription>Defendable claims</CardDescription><CardTitle className="font-serif text-3xl">{analysis.claims.length}</CardTitle></CardHeader><CardContent><p className="text-xs text-slate-500">Claims that could be tested or developed further.</p></CardContent></Card>
      <Card className="shadow-none"><CardHeader className="pb-2"><CardDescription>Interview pressure points</CardDescription><CardTitle className="font-serif text-3xl">{analysis.interviewVulnerabilities.filter(item => item.risk === "high").length}</CardTitle></CardHeader><CardContent><p className="text-xs text-slate-500">High-vulnerability claims worth rehearsing.</p></CardContent></Card>
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

    <Card className="shadow-none">
      <CardHeader><div className="flex items-center gap-2"><BookOpenCheck className="size-5 text-[#147d91]"/><CardTitle className="font-serif text-2xl">5 · Supercurricular depth checker</CardTitle></div><CardDescription>Depth matters more than quantity. Reading, projects, research and experiences are rewarded when the draft shows specific thinking and intellectual development, not simply because they are listed.</CardDescription></CardHeader>
      <CardContent className="grid gap-4 lg:grid-cols-2">{analysis.supercurricular.length ? analysis.supercurricular.map(item => <article key={item.id} className="rounded-2xl border p-4"><div className="flex flex-wrap items-center gap-2"><Badge variant="outline">{sectionName(item.section)}</Badge><Badge variant="outline" className="capitalize">{item.activityType}</Badge><Badge variant="outline">Depth {item.depthScore}/4 · {item.depthLabel}</Badge></div><p className="mt-3 text-sm leading-6">“{item.text}”</p><div className="mt-3 flex flex-wrap gap-2">{item.signals.map(signal => <span key={signal} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">{signal}</span>)}</div><p className="mt-3 text-sm text-slate-600"><strong>Deepen it:</strong> {item.nextMove}</p></article>) : <p className="text-sm text-slate-600">No clear supercurricular example has been detected yet. Add genuine subject exploration only where it reflects what you actually did.</p>}</CardContent>
    </Card>

    <Card className="shadow-none">
      <CardHeader><div className="flex items-center gap-2"><Sparkles className="size-5 text-[#147d91]"/><CardTitle className="font-serif text-2xl">6 · “So what?” detector</CardTitle></div><CardDescription>Flags examples that stop at “I did this” and pushes towards surprise, disagreement, changed assumptions, next investigation and unresolved questions.</CardDescription></CardHeader>
      <CardContent className="space-y-3">{analysis.soWhat.length ? analysis.soWhat.map(item => <article key={item.id} className="rounded-2xl border p-4"><div className="flex flex-wrap items-center gap-2"><Badge variant="outline">{sectionName(item.section)}</Badge><Badge variant="outline" className={reflectionClass(item.status)}>{item.status}</Badge>{item.missing.length ? <span className="text-xs text-slate-500">Missing: {item.missing.join(" + ")}</span> : null}</div><p className="mt-3 text-sm leading-6">“{item.text}”</p><div className="mt-3 grid gap-2 md:grid-cols-3">{item.prompts.map(prompt => <p key={prompt} className="rounded-xl bg-slate-50 p-3 text-sm text-slate-700"><ShieldQuestion className="mb-2 size-4 text-[#147d91]"/>{prompt}</p>)}</div></article>) : <p className="text-sm text-slate-600">Add a specific academic activity or source and the detector will test whether the draft explains why it mattered.</p>}</CardContent>
    </Card>

    <Card className="shadow-none">
      <CardHeader><div className="flex items-center gap-2"><Link2 className="size-5 text-[#147d91]"/><CardTitle className="font-serif text-2xl">7 · Academic journey visualisation</CardTitle></div><CardDescription>Shows whether the draft forms an intellectual journey—interest → source → competing idea → investigation/project → unresolved question—rather than a disconnected list.</CardDescription></CardHeader>
      <CardContent>{analysis.academicJourney.length ? <div className="grid gap-3 lg:grid-cols-2">{analysis.academicJourney.map((node,index) => <div key={node.id} className="flex gap-3 rounded-2xl border bg-white p-4"><div className="flex flex-col items-center"><span className="grid size-8 place-items-center rounded-full bg-[#102a43] text-xs font-bold text-white">{index + 1}</span>{index < analysis.academicJourney.length - 1 ? <span className="mt-2 h-full w-px bg-slate-200"/> : null}</div><div><div className="flex flex-wrap items-center gap-2"><Badge variant="outline">{node.label}</Badge><span className="text-xs text-slate-500">{sectionName(node.section)}</span></div><p className="mt-2 text-sm leading-6 text-slate-700">{node.text}</p></div></div>)}</div> : <p className="text-sm text-slate-600">The draft does not yet contain enough connected academic material to build a journey.</p>}</CardContent>
    </Card>

    <Card className="border-[#102a43]/15 bg-[#f8fbfc] shadow-none">
      <CardHeader><div className="flex items-center gap-2"><ShieldQuestion className="size-5 text-[#147d91]"/><CardTitle className="font-serif text-2xl">8 · Interview Vulnerability Map</CardTitle></div><CardDescription>Every substantial statement claim is treated as something an interviewer may define, challenge, qualify or extend. The risk label describes how exposed the wording is to follow-up, not the applicant’s chance of admission.</CardDescription></CardHeader>
      <CardContent className="space-y-4">{analysis.interviewVulnerabilities.length ? <>{analysis.interviewVulnerabilities.slice(0,10).map(item => <article key={item.id} className="rounded-2xl border bg-white p-4"><div className="flex flex-wrap items-center gap-2"><Badge variant="outline">{sectionName(item.section)}</Badge><Badge variant="outline" className={riskClass(item.risk)}>{item.risk} vulnerability</Badge></div><p className="mt-3 text-sm leading-6">“{item.claim}”</p><p className="mt-2 text-sm text-slate-600">{item.reason}</p><div className="mt-3 grid gap-2 md:grid-cols-2">{item.questions.map(question => <p key={question} className="rounded-xl bg-slate-50 p-3 text-sm"><ShieldQuestion className="mb-2 size-4 text-[#147d91]"/>{question}</p>)}</div></article>)}<div className="flex flex-wrap gap-2"><Button onClick={launchVulnerabilityInterview}><Sparkles/>Launch vulnerability interview</Button><Button asChild variant="outline"><Link href="/personal-statement-defence">Open full defence studio <ArrowRight/></Link></Button></div></> : <p className="text-sm text-slate-600">Add substantial academic claims before launching a vulnerability interview.</p>}</CardContent>
    </Card>

    <Card className="border-[#147d91]/20 bg-[#edf7f8] shadow-none"><CardHeader><CardTitle className="font-serif text-2xl">Highest-impact next actions</CardTitle><CardDescription>Generated from weak evidence dimensions, missing course-fit evidence, UCAS structure, shallow supercurricular examples and interview vulnerabilities.</CardDescription></CardHeader><CardContent className="space-y-3">{analysis.actions.length ? analysis.actions.map((action,index)=><div key={action} className="flex gap-3 rounded-xl bg-white p-3"><span className="grid size-7 flex-none place-items-center rounded-full bg-[#102a43] text-xs font-bold text-white">{index+1}</span><p className="text-sm leading-6">{action}</p></div>) : <p className="text-sm">No immediate structural action has been generated. Use the detailed writing review below for sentence-level refinement.</p>}</CardContent></Card>
  </div>
}

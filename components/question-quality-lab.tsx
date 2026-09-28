"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { ArrowLeft, Beaker, CheckCircle2, Loader2, RefreshCw, ShieldCheck, TriangleAlert, WandSparkles } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { buildFullPaper, paperCatalog, type FullPaperTest, type PaperForm } from "@/lib/full-paper-system"
import { isYesNoStatementQuestion, type FullPaperQuestion } from "@/lib/full-paper-question"
import { auditQuestionQuality, type ExamQuestionLike, type QuestionQualityFinding } from "@/lib/exam-intelligence"

type VerifyResult = {
  configured?: boolean
  verified?: boolean | null
  agreesWithStoredKey?: boolean
  independentAnswer?: number
  storedAnswer?: number
  ambiguous?: boolean
  missingInformation?: boolean
  reasoning?: string
  ambiguityReason?: string
  structural?: QuestionQualityFinding[]
  message?: string
  error?: string
}

type MutationResult = {
  configured?: boolean
  verified?: boolean
  question?: ExamQuestionLike & { independentCheck?: string; changeSummary?: string }
  qualityFindings?: QuestionQualityFinding[]
  error?: string
}

function severityClass(severity: QuestionQualityFinding["severity"]) {
  if (severity === "block") return "border-rose-200 bg-rose-50 text-rose-900"
  if (severity === "warn") return "border-amber-200 bg-amber-50 text-amber-900"
  return "border-slate-200 bg-slate-50 text-slate-700"
}

export function QuestionQualityLab() {
  const [test, setTest] = useState<FullPaperTest>("TMUA")
  const [form, setForm] = useState<PaperForm>(1)
  const [questionIndex, setQuestionIndex] = useState(0)
  const [verify, setVerify] = useState<VerifyResult | null>(null)
  const [mutation, setMutation] = useState<MutationResult | null>(null)
  const [busy, setBusy] = useState<"verify" | "mutate" | "">("")
  const [target, setTarget] = useState<"same" | "harder" | "far-transfer">("harder")

  const paper = useMemo(() => buildFullPaper(test, form, ["Mathematics 1", "Physics", "Mathematics 2"]), [test, form])
  const questions = useMemo(() => paper.sections.flatMap(section => section.kind === "mcq" ? section.questions.filter(question => !isYesNoStatementQuestion(question)) : []), [paper])
  const question = questions[Math.min(questionIndex, Math.max(0, questions.length - 1))]
  const findings = question ? auditQuestionQuality(question) : []

  function selectTest(value: FullPaperTest) {
    setTest(value)
    setQuestionIndex(0)
    setVerify(null)
    setMutation(null)
  }

  async function independentVerify() {
    if (!question) return
    setBusy("verify")
    setVerify(null)
    try {
      const response = await fetch("/api/question-verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question }) })
      setVerify(await response.json() as VerifyResult)
    } catch {
      setVerify({ error: "Independent verification service could not be reached." })
    } finally { setBusy("") }
  }

  async function generateMutation() {
    if (!question) return
    setBusy("mutate")
    setMutation(null)
    try {
      const response = await fetch("/api/question-mutate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question, target }) })
      setMutation(await response.json() as MutationResult)
    } catch {
      setMutation({ error: "Mutation service could not be reached." })
    } finally { setBusy("") }
  }

  return <main className="min-h-screen bg-[#f3f6f6] text-[#172b3a]"><div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
    <div className="flex flex-wrap items-center justify-between gap-3"><Button asChild variant="ghost"><Link href="/test-player"><ArrowLeft/>Test tools</Link></Button><Badge className="border-0 bg-[#102a43] text-white"><Beaker className="mr-1 size-3.5"/>Question Quality Lab</Badge></div>
    <section><p className="text-xs font-bold uppercase tracking-[.18em] text-[#147d91]">Authoring safety net</p><h1 className="mt-2 font-serif text-4xl font-bold">Audit the question before a student sees it.</h1><p className="mt-3 max-w-3xl leading-7 text-slate-600">The lab checks structural giveaways locally, then can solve the item independently without seeing the stored key. New adaptive variants must pass both the structural audit and an independent solution check before they are returned.</p></section>

    <Card><CardContent className="grid gap-4 p-5 sm:grid-cols-3"><label><span className="mb-1 block text-xs font-bold uppercase text-slate-500">Test</span><NativeSelect value={test} onChange={event=>selectTest(event.target.value as FullPaperTest)}>{paperCatalog.map(item=><NativeSelectOption key={item.test} value={item.test}>{item.test}</NativeSelectOption>)}</NativeSelect></label><label><span className="mb-1 block text-xs font-bold uppercase text-slate-500">Form</span><NativeSelect value={String(form)} onChange={event=>{setForm(Number(event.target.value) as PaperForm);setQuestionIndex(0);setVerify(null);setMutation(null)}}><NativeSelectOption value="1">Form 1</NativeSelectOption><NativeSelectOption value="2">Form 2</NativeSelectOption></NativeSelect></label><label><span className="mb-1 block text-xs font-bold uppercase text-slate-500">Question</span><NativeSelect value={String(questionIndex)} onChange={event=>{setQuestionIndex(Number(event.target.value));setVerify(null);setMutation(null)}}>{questions.map((item,index)=><NativeSelectOption key={item.id} value={String(index)}>{index+1}. {item.section}</NativeSelectOption>)}</NativeSelect></label></CardContent></Card>

    {question?<div className="grid gap-5 lg:grid-cols-[1.05fr_.95fr]"><section className="space-y-5"><Card className="border-0 bg-[#102a43] text-white"><CardHeader><div className="flex flex-wrap gap-2"><Badge className="bg-white/10 text-white">{question.section}</Badge><Badge className="bg-white/10 text-white">{question.difficulty}</Badge></div><CardTitle className="font-serif text-2xl leading-8">{question.prompt}</CardTitle></CardHeader><CardContent className="space-y-2">{question.options.map((option,index)=><div key={`${index}-${option}`} className={`rounded-xl border p-3 text-sm ${index===question.answer?"border-emerald-400/60 bg-emerald-400/10":"border-white/10 bg-white/5"}`}><strong>{String.fromCharCode(65+index)}.</strong> {option}</div>)}</CardContent></Card><Card><CardHeader><CardTitle>Stored explanation</CardTitle></CardHeader><CardContent><p className="text-sm leading-6 text-slate-600">{question.explanation}</p></CardContent></Card></section>

      <aside className="space-y-5"><Card><CardHeader><CardTitle>Structural audit</CardTitle><CardDescription>Fast checks for clues and reliability problems that do not require AI.</CardDescription></CardHeader><CardContent className="space-y-2">{findings.map(item=><div key={`${item.code}-${item.message}`} className={`rounded-xl border p-3 text-sm ${severityClass(item.severity)}`}><div className="flex items-center gap-2 font-semibold">{item.severity==="block"?<TriangleAlert className="size-4"/>:item.severity==="warn"?<TriangleAlert className="size-4"/>:<CheckCircle2 className="size-4"/>}{item.code}</div><p className="mt-1 leading-5">{item.message}</p></div>)}</CardContent></Card>

        <Card><CardHeader><ShieldCheck className="size-5 text-[#147d91]"/><CardTitle>Independent key check</CardTitle><CardDescription>The solver is shown the prompt and options but not the stored answer.</CardDescription></CardHeader><CardContent className="space-y-3"><Button onClick={independentVerify} disabled={busy!==""} className="w-full">{busy==="verify"?<Loader2 className="size-4 animate-spin"/>:<ShieldCheck/>}Solve independently</Button>{verify?<div className={`rounded-xl border p-4 text-sm ${verify.verified?"border-emerald-200 bg-emerald-50":"border-amber-200 bg-amber-50"}`}><p className="font-semibold">{verify.verified?"Independent solver agrees and found no ambiguity":"Check required"}</p>{typeof verify.independentAnswer==="number"?<p className="mt-1">Independent answer: {String.fromCharCode(65+verify.independentAnswer)} · Stored answer: {String.fromCharCode(65+(verify.storedAnswer??question.answer))}</p>:null}{verify.reasoning?<p className="mt-2 leading-6">{verify.reasoning}</p>:null}{verify.ambiguityReason?<p className="mt-2 leading-6">{verify.ambiguityReason}</p>:null}{verify.message?<p className="mt-2">{verify.message}</p>:null}{verify.error?<p className="mt-2">{verify.error}</p>:null}</div>:null}</CardContent></Card>

        <Card><CardHeader><WandSparkles className="size-5 text-[#147d91]"/><CardTitle>Verified mutation</CardTitle><CardDescription>Create a fresh question testing the same underlying skill, then solve it independently before use.</CardDescription></CardHeader><CardContent className="space-y-3"><NativeSelect value={target} onChange={event=>setTarget(event.target.value as typeof target)}><NativeSelectOption value="same">Same skill, new surface</NativeSelectOption><NativeSelectOption value="harder">Harder chain</NativeSelectOption><NativeSelectOption value="far-transfer">Far transfer</NativeSelectOption></NativeSelect><Button className="w-full" onClick={generateMutation} disabled={busy!==""}>{busy==="mutate"?<Loader2 className="size-4 animate-spin"/>:<WandSparkles/>}Generate + verify</Button>{mutation?.question?<div className="rounded-xl border border-cyan-200 bg-cyan-50 p-4"><p className="font-semibold">Verified variant</p><p className="mt-2 text-sm leading-6">{mutation.question.prompt}</p><div className="mt-3 space-y-1">{mutation.question.options?.map((option,index)=><p key={`${index}-${option}`} className="text-sm"><strong>{String.fromCharCode(65+index)}.</strong> {option}</p>)}</div><p className="mt-3 text-xs leading-5 text-slate-600">{mutation.question.changeSummary}</p><p className="mt-2 text-xs leading-5 text-slate-600"><strong>Independent check:</strong> {mutation.question.independentCheck}</p></div>:mutation?.error?<p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{mutation.error}</p>:null}</CardContent></Card>
      </aside></div>:null}
  </div></main>
}

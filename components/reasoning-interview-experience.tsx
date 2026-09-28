"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, ArrowRight, Brain, CheckCircle2, GitBranch, Loader2, RefreshCw, ShieldCheck, Target } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import { targetFromEvidenceDimension, TARGETED_PRACTICE_KEY } from "@/lib/feedback-practice"
import { buildInterviewEvidenceProfile, type InterviewEvidenceProfile } from "@/lib/interview-evidence-rubric"
import { markTypedInterviewTranscript, type InterviewMarkingResult, type InterviewMarkingTurn } from "@/lib/interview-marking"
import type { InterviewTreeNode, InterviewTreeNodeId } from "@/lib/interview-question-tree"
import { realisticInterviewQuestions } from "@/lib/realistic-interview-bank"
import { PROGRESS_KEY } from "@/lib/personal-tutor"
import { tracks, type TrackId } from "@/lib/oxbridge-data"
import type { InterviewAnswerClassification } from "@/lib/interview-answer-quality"

type Phase = "setup" | "live" | "marking" | "review"

type Turn = InterviewMarkingTurn & {
  speaker?: string
  issue?: string
  branch?: InterviewTreeNode
}

type TurnResponse = {
  reply?: string
  classification?: InterviewAnswerClassification
  issue?: string
  branch?: InterviewTreeNode
  provider?: string
  branchCount?: number
}

type ReviewResult = {
  baseline: InterviewMarkingResult
  evidenceProfile: InterviewEvidenceProfile
  adjudication: {
    provider?: string
    markerAgreement?: number | null
    confidence?: number | string
    priorities?: string[]
    summary?: string
  }
}

function qualityLabel(value?: InterviewAnswerClassification) {
  if (value === "responsive") return "Responsive"
  if (value === "partial") return "Partly developed"
  if (value === "vague") return "Too vague"
  if (value === "irrelevant") return "Off task"
  if (value === "incorrect") return "Needs repair"
  return ""
}

function qualityClass(value?: InterviewAnswerClassification) {
  if (value === "responsive") return "border-emerald-200 bg-emerald-50 text-emerald-800"
  if (value === "partial") return "border-amber-200 bg-amber-50 text-amber-900"
  if (value === "incorrect" || value === "irrelevant") return "border-rose-200 bg-rose-50 text-rose-800"
  return "border-slate-200 bg-slate-50 text-slate-700"
}

function readProgress() {
  try {
    return JSON.parse(localStorage.getItem(PROGRESS_KEY) || "{}") as Record<string, unknown>
  } catch {
    return {}
  }
}

export function ReasoningInterviewExperience() {
  const router = useRouter()
  const [phase, setPhase] = useState<Phase>("setup")
  const [track, setTrack] = useState<TrackId>("physical")
  const [course, setCourse] = useState("Physics")
  const [difficulty, setDifficulty] = useState<"Foundation" | "Stretch" | "Challenge">("Stretch")
  const [seed, setSeed] = useState(0)
  const [turns, setTurns] = useState<Turn[]>([])
  const [currentQuestion, setCurrentQuestion] = useState("")
  const [answer, setAnswer] = useState("")
  const [nodeIds, setNodeIds] = useState<InterviewTreeNodeId[]>([])
  const [thinking, setThinking] = useState(false)
  const [notice, setNotice] = useState("")
  const [review, setReview] = useState<ReviewResult | null>(null)

  const courses = tracks.find(item => item.id === track)?.courses ?? [course]
  const questions = useMemo(() => {
    const exact = realisticInterviewQuestions.filter(item => item.track === track && item.difficulty === difficulty)
    return exact.length ? exact : realisticInterviewQuestions.filter(item => item.track === track)
  }, [track, difficulty])
  const base = questions[seed % Math.max(1, questions.length)]
  const candidateCount = turns.filter(turn => turn.role === "candidate").length
  const latestBranch = [...turns].reverse().find(turn => turn.branch)?.branch

  function chooseTrack(next: TrackId) {
    setTrack(next)
    const first = tracks.find(item => item.id === next)?.courses[0]
    if (first) setCourse(first)
    setSeed(0)
  }

  function start() {
    if (!base) return
    setTurns([{ role: "interviewer", text: base.prompt, speaker: "Interviewer" }])
    setCurrentQuestion(base.prompt)
    setAnswer("")
    setNodeIds([])
    setReview(null)
    setNotice("")
    setPhase("live")
  }

  async function submitTurn() {
    const candidate = answer.trim()
    if (!candidate || !base || thinking) return
    const candidateTurn: Turn = { role: "candidate", text: candidate }
    const history = [...turns, candidateTurn]
    setTurns(history)
    setAnswer("")
    setThinking(true)
    setNotice("")

    try {
      const response = await fetch("/api/reasoning-interview-turn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: currentQuestion,
          questionId: candidateCount === 0 ? base.id : undefined,
          answer: candidate,
          course,
          track,
          difficulty,
          concepts: base.concepts,
          referenceAnswer: candidateCount === 0 ? base.strongAnswer : undefined,
          probes: base.probes,
          turns: history,
          previousNodeIds: nodeIds,
        }),
      })
      if (!response.ok) throw new Error("turn")
      const data = await response.json() as TurnResponse
      const classification = data.classification || "partial"
      const classified = history.map((turn, index) => index === history.length - 1 ? { ...turn, quality: classification, issue: data.issue } : turn)
      const next = data.reply?.trim() || "Which assumption or reasoning step should we test next?"
      const interviewer: Turn = { role: "interviewer", text: next, speaker: "Interviewer", branch: data.branch }
      setTurns([...classified, interviewer])
      setCurrentQuestion(next)
      if (data.branch?.id) setNodeIds(current => [...current, data.branch!.id].slice(-30))
      if (data.provider === "local") setNotice("The same 22-branch interview tree is running locally; cloud phrasing was unavailable for this turn.")
    } catch {
      setTurns([...history, { role: "interviewer", text: "Stay with the same problem. Which single assumption, mechanism or relationship is doing the most work in your answer, and how would you test it?", speaker: "Interviewer" }])
      setCurrentQuestion("Which single assumption, mechanism or relationship is doing the most work in your answer, and how would you test it?")
      setNotice("The interview endpoint was unavailable, so the session continued with a local reasoning prompt.")
    } finally {
      setThinking(false)
    }
  }

  async function finish() {
    if (!base || !turns.some(turn => turn.role === "candidate")) return
    setPhase("marking")
    setNotice("")
    const markingTurns: InterviewMarkingTurn[] = turns.map(turn => ({ role: turn.role, text: turn.text, quality: turn.quality }))
    const localBaseline = markTypedInterviewTranscript({ turns: markingTurns, concepts: base.concepts, referenceAnswer: base.strongAnswer })
    const localProfile = buildInterviewEvidenceProfile({ turns: markingTurns, marking: localBaseline })
    let result: ReviewResult = {
      baseline: localBaseline,
      evidenceProfile: localProfile,
      adjudication: { provider: "local", markerAgreement: null, confidence: localProfile.confidence, priorities: localProfile.dimensions.slice().sort((a, b) => a.score - b.score).slice(0, 3).map(item => item.nextAction), summary: "Deterministic transcript evidence rubric." },
    }

    try {
      const response = await fetch("/api/interview-adjudicate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ turns: markingTurns, concepts: base.concepts, referenceAnswer: base.strongAnswer, course, track }),
      })
      if (response.ok) result = await response.json() as ReviewResult
      else setNotice("Cloud adjudication was unavailable, so the evidence-based local marker was used.")
    } catch {
      setNotice("Cloud adjudication was unavailable, so the evidence-based local marker was used.")
    }

    setReview(result)
    setPhase("review")
    try {
      const saved = readProgress()
      const logs = Array.isArray(saved.logs) ? saved.logs as Array<Record<string, unknown>> : []
      const scores = Array.isArray(saved.interviewScores) ? saved.interviewScores as number[] : []
      localStorage.setItem(PROGRESS_KEY, JSON.stringify({
        ...saved,
        sessions: Number(saved.sessions ?? 0) + 1,
        interviewScores: [...scores, result.baseline.total],
        logs: [{
          id: `reasoning-tree-${Date.now()}`,
          title: `Reasoning Interview · ${course}`,
          score: result.baseline.total,
          date: new Date().toISOString(),
          events: turns.map(turn => `${turn.role === "candidate" ? "Candidate" : "Interviewer"}: ${turn.text}`),
          questionTreePath: nodeIds,
          evidenceProfile: result.evidenceProfile,
          adjudication: result.adjudication,
        }, ...logs].slice(0, 50),
      }))
    } catch {}
  }

  function practiseDimension(dimensionIndex: number) {
    if (!review || !base) return
    const dimension = review.evidenceProfile.dimensions[dimensionIndex]
    if (!dimension) return
    const target = targetFromEvidenceDimension({ dimension, course, track, originalQuestion: base.prompt })
    localStorage.setItem(TARGETED_PRACTICE_KEY, JSON.stringify(target))
    router.push("/targeted-practice")
  }

  function reset() {
    setPhase("setup")
    setTurns([])
    setCurrentQuestion("")
    setAnswer("")
    setNodeIds([])
    setReview(null)
    setNotice("")
    setSeed(value => value + 1)
  }

  if (phase === "setup") {
    return <main className="min-h-screen bg-[#f3f6f6] text-[#172b3a]"><div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
      <div className="flex flex-wrap items-center justify-between gap-3"><Button asChild variant="ghost"><Link href="/interviews"><ArrowLeft/>Interview Hub</Link></Button><Badge className="border-0 bg-[#102a43] text-white"><GitBranch className="mr-1 size-3.5"/>22-branch reasoning engine</Badge></div>
      <section className="grid overflow-hidden rounded-[2rem] border border-[#dbe5e7] bg-white shadow-[0_28px_80px_rgba(16,42,67,.08)] lg:grid-cols-[1.15fr_.85fr]">
        <div className="p-6 sm:p-9 lg:p-12"><p className="text-xs font-bold uppercase tracking-[.18em] text-[#147d91]">Reasoning Interview Studio</p><h1 className="mt-2 font-serif text-4xl font-bold">Questions now branch from what the student actually does.</h1><p className="mt-4 max-w-3xl leading-7 text-[#667984]">A strong answer can move into assumptions, prediction, new information, counterexamples, limiting cases, alternative explanations, transfer and synthesis. A weak answer is repaired at the exact reasoning step instead of simply moving to the next scripted probe.</p><div className="mt-7 grid gap-4 sm:grid-cols-2"><label className="space-y-1.5"><span className="text-xs font-bold uppercase tracking-wider text-slate-500">Subject family</span><NativeSelect value={track} onChange={event=>chooseTrack(event.target.value as TrackId)}>{tracks.map(item=><NativeSelectOption key={item.id} value={item.id}>{item.short}</NativeSelectOption>)}</NativeSelect></label><label className="space-y-1.5"><span className="text-xs font-bold uppercase tracking-wider text-slate-500">Course</span><NativeSelect value={course} onChange={event=>setCourse(event.target.value)}>{courses.map(item=><NativeSelectOption key={item}>{item}</NativeSelectOption>)}</NativeSelect></label><label className="space-y-1.5 sm:col-span-2"><span className="text-xs font-bold uppercase tracking-wider text-slate-500">Starting challenge</span><NativeSelect value={difficulty} onChange={event=>{setDifficulty(event.target.value as typeof difficulty);setSeed(0)}}>{["Foundation","Stretch","Challenge"].map(item=><NativeSelectOption key={item}>{item}</NativeSelectOption>)}</NativeSelect></label></div><div className="mt-8 flex flex-wrap gap-3"><Button onClick={start} disabled={!base}><Brain/>Start reasoning interview</Button><Button variant="outline" onClick={()=>setSeed(value=>value+1)}><RefreshCw/>Different opening problem</Button></div></div>
        <aside className="bg-[#102a43] p-6 text-white sm:p-8 lg:p-10"><p className="text-xs font-bold uppercase tracking-[.18em] text-[#8dd7de]">After the session</p><div className="mt-5 space-y-4">{["Nine-dimension evidence rubric", "Exact transcript evidence under every judgement", "Two independent AI markers", "Final disagreement adjudicator", "One-click targeted practice from each weakness"].map(item=><div key={item} className="flex items-start gap-3 rounded-xl bg-white/10 p-3 text-sm leading-6"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[#8dd7de]"/>{item}</div>)}</div><p className="mt-6 text-xs leading-5 text-white/55">All scores are practice diagnostics. The system does not claim to reproduce Oxford or Cambridge admissions decisions.</p></aside>
      </section>
    </div></main>
  }

  if (phase === "marking") {
    return <main className="grid min-h-screen place-items-center bg-[#f3f6f6] px-4"><Card className="w-full max-w-xl"><CardHeader><Loader2 className="size-6 animate-spin text-[#147d91]"/><CardTitle className="font-serif text-2xl">Cross-checking the interview evidence</CardTitle><CardDescription>Two independent markers are compared with the deterministic rubric, then disagreements are adjudicated. If the cloud service is unavailable, the local evidence marker remains usable.</CardDescription></CardHeader></Card></main>
  }

  if (phase === "review" && review) {
    const profile = review.evidenceProfile
    const lowIndexes = profile.dimensions.map((item,index)=>({item,index})).sort((a,b)=>a.item.score-b.item.score)
    return <main className="min-h-screen bg-[#f3f6f6] text-[#172b3a]"><div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3"><Button asChild variant="ghost"><Link href="/interviews"><ArrowLeft/>Interview Hub</Link></Button><Button onClick={reset}><RefreshCw/>Try another interview</Button></div>
      <Card className="border-[#cfe1e4]"><CardHeader><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-[#147d91]">Evidence-based review</p><CardTitle className="font-serif text-3xl">{review.baseline.total}/100 practice diagnostic</CardTitle></div><Badge variant="outline"><ShieldCheck className="size-3.5"/>{review.adjudication.provider || "local"}</Badge></div><CardDescription>{profile.note}</CardDescription></CardHeader><CardContent className="grid gap-3 sm:grid-cols-3"><div className="rounded-xl border p-4"><p className="text-xs font-bold uppercase text-slate-500">Evidence coverage</p><p className="mt-1 text-2xl font-bold text-[#147d91]">{profile.evidenceCoverage}%</p></div><div className="rounded-xl border p-4"><p className="text-xs font-bold uppercase text-slate-500">Marker agreement</p><p className="mt-1 text-2xl font-bold text-[#147d91]">{typeof review.adjudication.markerAgreement === "number" ? `${review.adjudication.markerAgreement}%` : "Local only"}</p></div><div className="rounded-xl border p-4"><p className="text-xs font-bold uppercase text-slate-500">Rubric evidence</p><p className="mt-1 text-2xl font-bold text-[#147d91]">{profile.total}/{profile.maxTotal}</p></div></CardContent></Card>

      <Card><CardHeader><CardTitle className="font-serif text-2xl">Nine-dimension reasoning evidence</CardTitle><CardDescription>Every judgement shows the transcript evidence it is based on. Click any dimension to turn the feedback into a new practice task.</CardDescription></CardHeader><CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{profile.dimensions.map((dimension,index)=><div key={dimension.key} className="rounded-2xl border bg-white p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold">{dimension.label}</p><p className="mt-1 text-xs text-slate-500">{dimension.descriptor}</p></div><Badge variant="outline">{dimension.score}/4</Badge></div><Progress value={dimension.score/4*100} className="mt-3"/><div className="mt-3 space-y-2">{dimension.evidence.length?dimension.evidence.map((evidence,evidenceIndex)=><div key={`${evidence.quote}-${evidenceIndex}`} className="rounded-xl bg-slate-50 p-3"><p className="text-xs font-bold uppercase tracking-wider text-slate-500">Transcript evidence</p><p className="mt-1 text-sm leading-6">“{evidence.quote}”</p><p className="mt-1 text-xs leading-5 text-slate-500">{evidence.reason}</p></div>):<p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-500">Not enough direct evidence appeared in this session.</p>}</div><p className="mt-3 text-sm leading-6"><strong>Next:</strong> {dimension.nextAction}</p><Button className="mt-3 w-full" variant={dimension.score<=2?"default":"outline"} onClick={()=>practiseDimension(index)}><Target/>Practise this weakness</Button></div>)}</CardContent></Card>

      <div className="grid gap-5 lg:grid-cols-[.9fr_1.1fr]"><Card><CardHeader><CardTitle>Adjudication summary</CardTitle><CardDescription>Independent markers are used to challenge each other's judgements rather than letting one AI score stand untested.</CardDescription></CardHeader><CardContent className="space-y-3"><p className="text-sm leading-6">{review.adjudication.summary || "Evidence review completed."}</p>{review.adjudication.priorities?.map(item=><p key={item} className="rounded-xl bg-amber-50 p-3 text-sm leading-6 text-amber-950">{item}</p>)}</CardContent></Card><Card><CardHeader><CardTitle>Question-tree path</CardTitle><CardDescription>The session records how the interviewer changed direction in response to your reasoning.</CardDescription></CardHeader><CardContent className="space-y-2">{turns.filter(turn=>turn.branch).length?turns.filter(turn=>turn.branch).map((turn,index)=><div key={`${turn.branch?.id}-${index}`} className="rounded-xl border p-3"><div className="flex flex-wrap items-center gap-2"><Badge variant="outline">{turn.branch?.phase}</Badge><strong className="text-sm">{turn.branch?.label}</strong></div><p className="mt-1 text-xs leading-5 text-slate-500">{turn.branch?.branchReason}</p></div>):<p className="text-sm text-slate-500">No tree branch metadata was recorded in this session.</p>}</CardContent></Card></div>

      <Card><CardHeader><CardTitle className="font-serif text-2xl">Full conversation evidence</CardTitle></CardHeader><CardContent className="space-y-3">{turns.map((turn,index)=><div key={`${turn.role}-${index}`} className="rounded-xl border bg-white p-4"><div className="flex flex-wrap items-center gap-2"><Badge variant="outline">{turn.role === "candidate" ? "You" : "Interviewer"}</Badge>{turn.quality?<Badge className={qualityClass(turn.quality)}>{qualityLabel(turn.quality)}</Badge>:null}{turn.branch?<Badge className="border-cyan-200 bg-cyan-50 text-cyan-900">{turn.branch.label}</Badge>:null}</div><p className="mt-2 whitespace-pre-wrap text-sm leading-6">{turn.text}</p></div>)}</CardContent></Card>

      {lowIndexes[0]?<Card className="border-0 bg-[#102a43] text-white"><CardContent className="flex flex-wrap items-center justify-between gap-4 p-6"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-[#8dd7de]">Automatic next step</p><p className="mt-1 font-serif text-2xl font-bold">Turn the weakest evidence area into a fresh transfer problem.</p><p className="mt-2 text-sm text-white/65">Lowest evidence area: {lowIndexes[0].item.label} ({lowIndexes[0].item.score}/4).</p></div><Button className="bg-white text-[#102a43] hover:bg-white/90" onClick={()=>practiseDimension(lowIndexes[0].index)}>Start targeted practice <ArrowRight/></Button></CardContent></Card>:null}
      {notice?<p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{notice}</p>:null}
    </div></main>
  }

  return <main className="min-h-screen bg-[#f3f6f6] text-[#172b3a]"><div className="mx-auto max-w-7xl space-y-5 px-4 py-6 sm:px-6 lg:px-8">
    <div className="flex flex-wrap items-center justify-between gap-3"><Button variant="ghost" onClick={reset}><ArrowLeft/>Exit</Button><div className="flex items-center gap-2"><Badge variant="outline">{course}</Badge><Badge variant="outline">{difficulty}</Badge><Badge className="border-0 bg-[#102a43] text-white"><GitBranch className="mr-1 size-3.5"/>{candidateCount} responses</Badge></div></div>
    <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
      <section className="space-y-4"><Card className="border-0 bg-[#102a43] text-white"><CardHeader><div className="flex flex-wrap items-center gap-2"><Badge className="bg-white/10 text-white">Current branch</Badge>{latestBranch?<Badge className="bg-[#147d91] text-white">{latestBranch.label}</Badge>:null}</div><CardTitle className="font-serif text-2xl">{currentQuestion}</CardTitle><CardDescription className="text-white/65">Think aloud. The next question will depend on the reasoning you expose, not a fixed script.</CardDescription></CardHeader></Card>
      <Card><CardContent className="space-y-4 pt-6"><Textarea value={answer} onChange={event=>setAnswer(event.target.value)} rows={9} placeholder="Talk through your reasoning here…"/><div className="flex flex-wrap gap-3"><Button onClick={submitTurn} disabled={!answer.trim()||thinking}>{thinking?<Loader2 className="size-4 animate-spin"/>:<ArrowRight/>}{thinking?"Choosing the next branch…":"Submit reasoning"}</Button><Button variant="outline" onClick={finish} disabled={thinking||candidateCount<2}><CheckCircle2/>Finish and cross-mark</Button></div>{notice?<p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{notice}</p>:null}</CardContent></Card>
      <Card><CardHeader><CardTitle className="font-serif text-xl">Conversation</CardTitle></CardHeader><CardContent className="space-y-3">{turns.map((turn,index)=><div key={`${turn.role}-${index}`} className={`rounded-xl border p-4 ${turn.role === "candidate" ? "bg-cyan-50/40" : "bg-white"}`}><div className="flex flex-wrap items-center gap-2"><Badge variant="outline">{turn.role === "candidate" ? "You" : "Interviewer"}</Badge>{turn.quality?<Badge className={qualityClass(turn.quality)}>{qualityLabel(turn.quality)}</Badge>:null}{turn.branch?<Badge className="border-cyan-200 bg-cyan-50 text-cyan-900">{turn.branch.label}</Badge>:null}</div><p className="mt-2 whitespace-pre-wrap text-sm leading-6">{turn.text}</p></div>)}</CardContent></Card></section>
      <aside className="space-y-4"><Card><CardHeader><GitBranch className="size-5 text-[#147d91]"/><CardTitle className="font-serif text-xl">Live question tree</CardTitle><CardDescription>22 possible branch types. Only the path actually triggered is shown here.</CardDescription></CardHeader><CardContent className="space-y-2">{nodeIds.length?turns.filter(turn=>turn.branch).map((turn,index)=><div key={`${turn.branch?.id}-${index}`} className="rounded-xl border p-3"><p className="text-xs font-bold uppercase tracking-wider text-[#147d91]">{turn.branch?.phase}</p><p className="mt-1 text-sm font-semibold">{turn.branch?.label}</p></div>):<p className="text-sm text-slate-500">Your first answer will determine the first branch.</p>}</CardContent></Card><Card><CardHeader><Target className="size-5 text-[#147d91]"/><CardTitle className="font-serif text-xl">What the engine is looking for</CardTitle></CardHeader><CardContent className="space-y-2 text-sm leading-6 text-slate-600">{["Can you expose assumptions?","Can you choose a method independently?","Can you adapt after new information?","Can you survive a counterexample?","Can you transfer the method to unfamiliar material?"].map(item=><p key={item}>• {item}</p>)}</CardContent></Card></aside>
    </div>
  </div></main>
}

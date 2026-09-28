"use client"

import Link from "next/link"
import { useEffect, useMemo, useRef, useState } from "react"
import { ArrowLeft, Brain, CheckCircle2, Clock3, GraduationCap, Loader2, Mic, MicOff, RefreshCw, Sparkles, Target, Users } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import { InterviewWhiteboard } from "@/components/interview-whiteboard"
import { interviewerPersonas, type InterviewMode, type InterviewPersonaKey } from "@/lib/coach-suite"
import { markTypedInterviewTranscript, type InterviewMarkingResult } from "@/lib/interview-marking"
import type { InterviewMoveKind, InterviewReveal, InterviewWhiteboardTask } from "@/lib/interview-questioning-engine"
import { realisticInterviewQuestions } from "@/lib/realistic-interview-bank"
import { tracks, type TrackId } from "@/lib/oxbridge-data"
import type { InterviewAnswerClassification } from "@/lib/interview-answer-quality"
import { APPLICATION_KEY, PROGRESS_KEY, PROFILE_KEY } from "@/lib/personal-tutor"
import {
  applicationLaunchQuestion,
  courseInterviewProfile,
  deepChainInstruction,
  deepChainStage,
  panelInterviewer,
  recoverySignal,
  type ApplicationInterviewContext,
} from "@/lib/interview-depth-features"

type Variant = "ai" | "formal"
type Phase = "lobby" | "live" | "review"
type Turn = {
  role: "interviewer" | "candidate"
  text: string
  speaker?: string
  quality?: InterviewAnswerClassification
  moveKind?: InterviewMoveKind
  reveal?: InterviewReveal
  whiteboardTask?: InterviewWhiteboardTask
  hintLevel?: 1 | 2 | 3 | 4
}
type AiReply = {
  reply?: string
  classification?: InterviewAnswerClassification
  moveKind?: InterviewMoveKind
  reveal?: InterviewReveal
  whiteboardTask?: InterviewWhiteboardTask
  hintLevel?: 1 | 2 | 3 | 4
  adaptiveLevel?: number
  degraded?: boolean
}
type SavedProgress = { sessions?: number; interviewScores?: number[]; logs?: Array<Record<string, unknown>>; misconceptions?: Record<string, number>; [key: string]: unknown }

function formatTime(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`
}

function startingAdaptiveLevel(difficulty: "Foundation" | "Stretch" | "Challenge") {
  if (difficulty === "Foundation") return -1
  if (difficulty === "Challenge") return 1
  return 0
}

function qualityLabel(value?: InterviewAnswerClassification) {
  if (value === "responsive") return "Responsive"
  if (value === "partial") return "Partly developed"
  if (value === "vague") return "Too vague"
  if (value === "irrelevant") return "Off task"
  if (value === "incorrect") return "Claim needs repair"
  return ""
}

function qualityClass(value?: InterviewAnswerClassification) {
  if (value === "responsive") return "border-emerald-200 bg-emerald-50 text-emerald-800"
  if (value === "partial") return "border-amber-200 bg-amber-50 text-amber-900"
  if (value === "incorrect" || value === "irrelevant") return "border-rose-200 bg-rose-50 text-rose-800"
  return "border-slate-200 bg-slate-50 text-slate-700"
}

function revealClasses(kind: InterviewReveal["kind"]) {
  if (kind === "counterexample") return { box: "border-amber-200 bg-amber-50", label: "text-amber-800" }
  if (kind === "worked-error") return { box: "border-rose-200 bg-rose-50", label: "text-rose-800" }
  return { box: "border-cyan-200 bg-cyan-50", label: "text-cyan-800" }
}

export function AdvancedInterviewExperience({ variant }: { variant: Variant }) {
  const [phase, setPhase] = useState<Phase>("lobby")
  const [track, setTrack] = useState<TrackId>("physical")
  const [course, setCourse] = useState("Physics")
  const [difficulty, setDifficulty] = useState<"Foundation" | "Stretch" | "Challenge">("Stretch")
  const [personaKey, setPersonaKey] = useState<InterviewPersonaKey>("Socratic")
  const [mode, setMode] = useState<InterviewMode>("Realistic")
  const [panelMode, setPanelMode] = useState(true)
  const [useApplicationLaunch, setUseApplicationLaunch] = useState(true)
  const [applicationContext, setApplicationContext] = useState<ApplicationInterviewContext | null>(null)
  const [seed, setSeed] = useState(0)
  const [turns, setTurns] = useState<Turn[]>([])
  const [moveHistory, setMoveHistory] = useState<InterviewMoveKind[]>([])
  const [adaptiveLevel, setAdaptiveLevel] = useState(0)
  const [whiteboardTask, setWhiteboardTask] = useState<InterviewWhiteboardTask | null>(null)
  const [whiteboardUsed, setWhiteboardUsed] = useState(false)
  const [question, setQuestion] = useState("")
  const [answer, setAnswer] = useState("")
  const [scratch, setScratch] = useState("")
  const [seconds, setSeconds] = useState(18 * 60)
  const [running, setRunning] = useState(false)
  const [thinking, setThinking] = useState(false)
  const [listening, setListening] = useState(false)
  const [notice, setNotice] = useState("")
  const [result, setResult] = useState<InterviewMarkingResult | null>(null)
  const recognitionRef = useRef<{ stop: () => void } | null>(null)

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(PROFILE_KEY) || "{}") as { track?: TrackId; course?: string }
      if (saved.track) setTrack(saved.track)
      if (saved.course) setCourse(saved.course)
    } catch {}
    try {
      const saved = JSON.parse(localStorage.getItem(APPLICATION_KEY) || "{}") as ApplicationInterviewContext
      if (Object.values(saved).some(value => typeof value === "string" && value.trim())) setApplicationContext(saved)
    } catch {}
  }, [])

  useEffect(() => {
    if (!running || seconds <= 0) return
    const timer = window.setInterval(() => setSeconds(value => Math.max(0, value - 1)), 1000)
    return () => window.clearInterval(timer)
  }, [running, seconds])

  const questionsForTrack = useMemo(() => {
    const exact = realisticInterviewQuestions.filter(item => item.track === track && item.difficulty === difficulty)
    return exact.length ? exact : realisticInterviewQuestions.filter(item => item.track === track)
  }, [track, difficulty])

  const base = questionsForTrack[seed % Math.max(1, questionsForTrack.length)]
  const persona = interviewerPersonas[personaKey]
  const courses = tracks.find(item => item.id === track)?.courses ?? [course]
  const courseProfile = useMemo(() => courseInterviewProfile(course, track), [course, track])
  const applicationLaunch = useMemo(() => applicationLaunchQuestion(applicationContext ?? undefined, course), [applicationContext, course])
  const candidateTurns = turns.filter(turn => turn.role === "candidate").length
  const recovery = recoverySignal(turns.filter(turn => turn.role === "candidate").map(turn => turn.quality || ""))
  const sessionProgress = Math.min(100, candidateTurns * 11)

  function speak(text: string) {
    if (variant !== "ai" || !("speechSynthesis" in window)) return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = "en-GB"
    utterance.rate = 0.95
    window.speechSynthesis.speak(utterance)
  }

  function startListening() {
    type Recognition = { continuous: boolean; interimResults: boolean; lang: string; onresult: (event: { results: ArrayLike<{ 0: { transcript: string } }> }) => void; onend: () => void; start: () => void; stop: () => void }
    const browser = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition }
    const RecognitionClass = browser.SpeechRecognition ?? browser.webkitSpeechRecognition
    if (!RecognitionClass) {
      setNotice("Voice transcription is unavailable in this browser. Typed answers use the same academic marking rubric.")
      return
    }
    const recognition = new RecognitionClass()
    recognition.continuous = true
    recognition.interimResults = false
    recognition.lang = "en-GB"
    recognition.onresult = event => setAnswer(current => `${current} ${Array.from(event.results).map(item => item[0].transcript).join(" ")}`.trim())
    recognition.onend = () => setListening(false)
    recognitionRef.current = recognition
    recognition.start()
    setListening(true)
  }

  function stopListening() {
    recognitionRef.current?.stop()
    setListening(false)
  }

  function chooseTrack(next: TrackId) {
    setTrack(next)
    const firstCourse = tracks.find(item => item.id === next)?.courses[0]
    if (firstCourse) setCourse(firstCourse)
    setSeed(0)
  }

  function startInterview() {
    if (!base) return
    const initial = useApplicationLaunch && applicationLaunch ? applicationLaunch.prompt : base.prompt
    const opener = panelMode ? `${persona.opening} You will meet two academics who will approach the same problem differently.` : persona.opening
    const first: Turn[] = [
      { role: "interviewer", speaker: panelMode ? "Interviewer A" : "Interviewer", text: opener },
      { role: "interviewer", speaker: panelMode ? "Interviewer A" : "Interviewer", text: initial },
    ]
    setTurns(first)
    setMoveHistory([])
    setAdaptiveLevel(startingAdaptiveLevel(difficulty))
    setWhiteboardTask(null)
    setWhiteboardUsed(false)
    setQuestion(initial)
    setAnswer("")
    setScratch("")
    setResult(null)
    setNotice(applicationLaunch && useApplicationLaunch ? `Started from your saved ${applicationLaunch.source}; the interviewer will move beyond rehearsed material after the opening answer.` : "")
    setSeconds(mode === "Stress" ? 12 * 60 : 18 * 60)
    setRunning(true)
    setPhase("live")
    speak(`${opener} ${initial}`)
  }

  async function submitTurn() {
    const candidate = answer.trim()
    if (!candidate || thinking || !base) return
    stopListening()
    const history = [...turns, { role: "candidate" as const, text: candidate }]
    setTurns(history)
    setAnswer("")
    setThinking(true)
    setNotice("")

    const panel = panelInterviewer(candidateTurns, courseProfile)
    const chainInstruction = deepChainInstruction(candidateTurns + 1)
    const extraProbes = [
      ...base.probes,
      ...courseProfile.preferredMoves.map(move => `Continue the same problem by asking the candidate to ${move}.`),
      chainInstruction,
      ...(applicationLaunch?.followUpRule ? [applicationLaunch.followUpRule] : []),
    ].slice(0, 12)

    try {
      const response = await fetch("/api/interview-turn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          course,
          track,
          difficulty,
          persona: personaKey,
          mode: `${mode}. Deep-chain stage: ${deepChainStage(candidateTurns + 1)}. ${chainInstruction}`,
          question,
          questionId: useApplicationLaunch && applicationLaunch ? undefined : base.id,
          answer: candidate,
          concepts: base.concepts,
          probes: extraProbes,
          moveHistory,
          adaptiveLevel,
          referenceAnswer: useApplicationLaunch && applicationLaunch ? undefined : base.strongAnswer,
          stimulus: useApplicationLaunch && applicationLaunch ? applicationLaunch.excerpt : base.stimulus,
          turns: history,
          panelMode,
          interviewerRole: `${panel.label}: ${panel.role}`,
          otherInterviewer: panel.colleague,
          delivery: "natural",
        }),
      })
      if (!response.ok) throw new Error("interview-turn")
      const data = await response.json() as AiReply
      const classification = data.classification ?? "partial"
      const next = data.reply?.trim() || base.probes[candidateTurns % base.probes.length]
      const classified = history.map((turn, index) => index === history.length - 1 ? { ...turn, quality: classification } : turn)
      const interviewerTurn: Turn = {
        role: "interviewer",
        speaker: panelMode ? panel.label : "Interviewer",
        text: next,
        moveKind: data.moveKind,
        reveal: data.reveal,
        whiteboardTask: data.whiteboardTask,
        hintLevel: data.hintLevel,
      }
      setTurns([...classified, interviewerTurn])
      if (data.moveKind) setMoveHistory(current => [...current, data.moveKind as InterviewMoveKind].slice(-24))
      if (typeof data.adaptiveLevel === "number") setAdaptiveLevel(data.adaptiveLevel)
      if (data.whiteboardTask) setWhiteboardTask(data.whiteboardTask)
      setQuestion(next)
      if (data.degraded) setNotice("Cloud evaluation was temporarily unavailable, so the built-in interviewer continued the same academic chain locally.")
      speak(`${panelMode ? `${panel.label}. ` : ""}${data.reveal?.content ? `${data.reveal.content} ` : ""}${next}`)
    } catch {
      const next = `${chainInstruction} ${base.probes[candidateTurns % base.probes.length] ?? "Which assumption in that answer is doing the most work?"}`
      setTurns([...history, { role: "interviewer", speaker: panelMode ? panel.label : "Interviewer", text: next }])
      setQuestion(next)
      setNotice("The interview service could not be reached, so the same problem continued with the built-in deep-chain interviewer.")
      speak(next)
    } finally {
      setThinking(false)
    }
  }

  function finishInterview() {
    if (!base) return
    stopListening()
    const finalTurns = answer.trim() ? [...turns, { role: "candidate" as const, text: answer.trim() }] : turns
    if (!finalTurns.some(turn => turn.role === "candidate")) return
    const scored = markTypedInterviewTranscript({ turns: finalTurns, concepts: base.concepts, referenceAnswer: useApplicationLaunch && applicationLaunch ? undefined : base.strongAnswer })
    const finalRecovery = recoverySignal(finalTurns.filter(turn => turn.role === "candidate").map(turn => turn.quality || ""))
    setTurns(finalTurns)
    setResult(scored)
    setRunning(false)
    setPhase("review")

    try {
      const saved = JSON.parse(localStorage.getItem(PROGRESS_KEY) || "{}") as SavedProgress
      const logs = Array.isArray(saved.logs) ? saved.logs : []
      const scores = Array.isArray(saved.interviewScores) ? saved.interviewScores : []
      const misconceptions = saved.misconceptions && typeof saved.misconceptions === "object" ? saved.misconceptions : {}
      const events = [
        ...finalTurns.flatMap(turn => [
          turn.reveal ? `${turn.speaker || "Interviewer"} ${turn.reveal.title}: ${turn.reveal.content}` : "",
          turn.whiteboardTask ? `Whiteboard task: ${turn.whiteboardTask.prompt}` : "",
          turn.hintLevel ? `Progressive hint stage ${turn.hintLevel}` : "",
          `${turn.role === "interviewer" ? turn.speaker || "Interviewer" : "Candidate"}: ${turn.text}`,
        ].filter(Boolean)),
        `Deep-chain stage reached: ${deepChainStage(finalTurns.filter(turn => turn.role === "candidate").length)}`,
        `Course-specific engine: ${courseProfile.family}`,
        `Intellectual recovery: ${finalRecovery.score}/20 · ${finalRecovery.label}`,
        `Typed rubric: ${scored.rubricVersion}`,
      ]
      localStorage.setItem(PROGRESS_KEY, JSON.stringify({
        ...saved,
        sessions: Number(saved.sessions ?? 0) + 1,
        interviewScores: [...scores, scored.total],
        misconceptions: scored.error === "No dominant issue" ? misconceptions : { ...misconceptions, [scored.error]: Number(misconceptions[scored.error] ?? 0) + 1 },
        logs: [{
          id: `${variant}-advanced-${Date.now()}`,
          title: `${variant === "formal" ? "Interview Room" : "AI Interview"} · ${course}`,
          score: scored.total,
          date: new Date().toISOString(),
          events,
          questioningMoves: moveHistory,
          courseEngine: courseProfile.family,
          panelMode,
          applicationLaunch: Boolean(applicationLaunch && useApplicationLaunch),
          recovery: finalRecovery,
          whiteboardUsed,
          adaptiveDifficultyFinal: adaptiveLevel,
          dimensions: { reasoning: scored.reasoning, accuracy: scored.accuracy, responsiveness: scored.responsiveness, adaptability: scored.adaptability, evidence: scored.evidence, communication: scored.communication },
        }, ...logs].slice(0, 50),
      }))
    } catch {}
  }

  function reset() {
    stopListening()
    setPhase("lobby")
    setTurns([])
    setMoveHistory([])
    setAdaptiveLevel(startingAdaptiveLevel(difficulty))
    setWhiteboardTask(null)
    setWhiteboardUsed(false)
    setQuestion("")
    setAnswer("")
    setScratch("")
    setResult(null)
    setRunning(false)
    setThinking(false)
    setNotice("")
    setSeed(value => value + 1)
  }

  if (phase === "lobby") {
    return <main className="min-h-screen bg-[#f2f5f5] text-[#172b3a]">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        <div className="mb-7 flex flex-wrap items-center justify-between gap-3">
          <Button asChild variant="ghost"><Link href="/interviews"><ArrowLeft />Interview Hub</Link></Button>
          <Badge className="border-0 bg-[#102a43] text-white"><GraduationCap className="mr-1 size-3.5" />Deep interview engine</Badge>
        </div>
        <section className="grid overflow-hidden rounded-[2rem] border border-[#dbe5e7] bg-white shadow-[0_28px_80px_rgba(16,42,67,.08)] lg:grid-cols-[1.12fr_.88fr]">
          <div className="p-6 sm:p-9 lg:p-12">
            <div className="flex items-start gap-4"><span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[#102a43] text-[#8dd7de]">{variant === "ai" ? <Sparkles className="size-5" /> : <Brain className="size-5" />}</span><div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#147d91]">{variant === "ai" ? "Adaptive AI interview" : "Formal interview room"}</p><h1 className="mt-1 font-serif text-3xl font-bold sm:text-4xl">One problem can now develop into a full academic conversation.</h1></div></div>
            <p className="mt-5 max-w-3xl text-base leading-7 text-[#667984]">The interview can begin from your own academic application, stay with one problem through a long chain, alternate two distinct academics, change its questioning style by course, and explicitly recognise intellectual recovery after mistakes.</p>
            <div className="mt-7 grid gap-3 sm:grid-cols-2">{["Deep follow-up chains", "Application launch questions", "Two distinct interviewers", "Course-specific questioning", "Recovery scoring"].map(item => <div key={item} className="rounded-xl border border-[#dbe5e7] bg-[#f8fafb] px-4 py-3 text-sm font-semibold text-[#526a75]">{item}</div>)}</div>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <label className="space-y-1.5"><span className="text-xs font-bold uppercase tracking-wider text-[#667984]">Subject family</span><NativeSelect value={track} onChange={event => chooseTrack(event.target.value as TrackId)}>{tracks.map(item => <NativeSelectOption key={item.id} value={item.id}>{item.short}</NativeSelectOption>)}</NativeSelect></label>
              <label className="space-y-1.5"><span className="text-xs font-bold uppercase tracking-wider text-[#667984]">Course</span><NativeSelect value={course} onChange={event => setCourse(event.target.value)}>{courses.map(item => <NativeSelectOption key={item}>{item}</NativeSelectOption>)}</NativeSelect></label>
              <label className="space-y-1.5"><span className="text-xs font-bold uppercase tracking-wider text-[#667984]">Starting challenge</span><NativeSelect value={difficulty} onChange={event => { setDifficulty(event.target.value as typeof difficulty); setSeed(0) }}>{["Foundation", "Stretch", "Challenge"].map(item => <NativeSelectOption key={item}>{item}</NativeSelectOption>)}</NativeSelect></label>
              <label className="space-y-1.5"><span className="text-xs font-bold uppercase tracking-wider text-[#667984]">Interview mode</span><NativeSelect value={mode} onChange={event => setMode(event.target.value as InterviewMode)}>{["Realistic", "Tutor", "Stress"].map(item => <NativeSelectOption key={item}>{item}</NativeSelectOption>)}</NativeSelect></label>
              <label className="space-y-1.5 sm:col-span-2"><span className="text-xs font-bold uppercase tracking-wider text-[#667984]">Interviewer style</span><NativeSelect value={personaKey} onChange={event => setPersonaKey(event.target.value as InterviewPersonaKey)}>{Object.keys(interviewerPersonas).map(item => <NativeSelectOption key={item}>{item}</NativeSelectOption>)}</NativeSelect></label>
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <button type="button" onClick={() => setPanelMode(value => !value)} className={`rounded-2xl border p-4 text-left ${panelMode ? "border-[#147d91] bg-[#edf7f8]" : "bg-white"}`}><div className="flex items-center gap-2 font-semibold"><Users className="size-4" />Two-interviewer panel</div><p className="mt-1 text-xs leading-5 text-slate-500">{courseProfile.interviewerA} + {courseProfile.interviewerB}</p></button>
              <button type="button" disabled={!applicationLaunch} onClick={() => setUseApplicationLaunch(value => !value)} className={`rounded-2xl border p-4 text-left disabled:opacity-50 ${useApplicationLaunch && applicationLaunch ? "border-[#147d91] bg-[#edf7f8]" : "bg-white"}`}><div className="font-semibold">Launch from application</div><p className="mt-1 text-xs leading-5 text-slate-500">{applicationLaunch ? `Use your saved ${applicationLaunch.source}, then move beyond rehearsed material.` : "Add books, projects, EPQ, written work or interests in Application Context first."}</p></button>
            </div>
            <div className="mt-8 flex flex-wrap gap-3"><Button onClick={startInterview} disabled={!base}><Brain />Start deep interview</Button><Button variant="outline" onClick={() => setSeed(value => value + 1)}><RefreshCw />Different problem</Button></div>
          </div>
          <aside className="bg-[#102a43] p-6 text-white sm:p-8 lg:p-10"><p className="text-xs font-bold uppercase tracking-[.18em] text-[#8dd7de]">Course engine</p><h2 className="mt-2 font-serif text-2xl font-bold">{courseProfile.family}</h2><div className="mt-6 space-y-2 text-sm leading-6 text-white/75">{courseProfile.priorities.map(item => <p key={item}>• {item}</p>)}</div><div className="mt-6 rounded-xl bg-white/10 p-4 text-sm leading-6 text-white/75">The two interviewers have different jobs: one develops your line of thought, the other tests it from a different academic angle.</div></aside>
        </section>
      </div>
    </main>
  }

  if (phase === "review" && result) {
    const finalRecovery = recoverySignal(turns.filter(turn => turn.role === "candidate").map(turn => turn.quality || ""))
    return <main className="min-h-screen bg-slate-50 text-slate-950"><div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3"><Button asChild variant="ghost"><Link href="/interviews"><ArrowLeft />Interview Hub</Link></Button><Button onClick={reset}><RefreshCw />Try another interview</Button></div>
      <Card className="border-[#cfe1e4]"><CardHeader><p className="text-xs font-bold uppercase tracking-[.16em] text-[#147d91]">Practice interview review</p><CardTitle className="font-serif text-3xl">{result.total}/100 · {result.band}</CardTitle><CardDescription>Practice diagnostic only—not an Oxford or Cambridge admissions score.</CardDescription></CardHeader><CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><div className="rounded-2xl border p-4"><p className="text-xs font-bold uppercase text-slate-500">Reasoning</p><p className="mt-1 text-3xl font-bold text-[#147d91]">{result.reasoning}/25</p></div><div className="rounded-2xl border p-4"><p className="text-xs font-bold uppercase text-slate-500">Adaptability</p><p className="mt-1 text-3xl font-bold text-[#147d91]">{result.adaptability}/20</p></div><div className="rounded-2xl border p-4"><p className="text-xs font-bold uppercase text-slate-500">Recovery</p><p className="mt-1 text-3xl font-bold text-[#147d91]">{finalRecovery.score}/20</p><p className="mt-1 text-xs text-slate-500">{finalRecovery.label}</p></div><div className="rounded-2xl border p-4"><p className="text-xs font-bold uppercase text-slate-500">Chain depth</p><p className="mt-1 text-lg font-bold text-[#147d91]">{deepChainStage(turns.filter(turn => turn.role === "candidate").length)}</p></div></CardContent></Card>
      <div className="grid gap-5 lg:grid-cols-2"><Card><CardHeader><CheckCircle2 className="size-5 text-emerald-700" /><CardTitle>What worked</CardTitle></CardHeader><CardContent className="space-y-3">{result.strengths.map(item => <p key={item} className="rounded-xl bg-emerald-50 p-3 text-sm leading-6 text-emerald-950">{item}</p>)}{finalRecovery.recoveries ? <p className="rounded-xl bg-emerald-50 p-3 text-sm leading-6 text-emerald-950">You improved after challenge {finalRecovery.recoveries} time{finalRecovery.recoveries === 1 ? "" : "s"}; recovery is treated as positive evidence rather than simply preserving the earlier mistake.</p> : null}</CardContent></Card><Card><CardHeader><Target className="size-5 text-amber-700" /><CardTitle>What to work on next</CardTitle></CardHeader><CardContent className="space-y-3">{result.next.map(item => <p key={item} className="rounded-xl bg-amber-50 p-3 text-sm leading-6 text-amber-950">{item}</p>)}</CardContent></Card></div>
      <Card><CardHeader><CardTitle className="font-serif text-2xl">Conversation trajectory</CardTitle><CardDescription>The review keeps the full sequence so you can see how the argument developed, was challenged and recovered.</CardDescription></CardHeader><CardContent className="space-y-3">{turns.map((turn, index) => <div key={`${turn.role}-${index}`} className="rounded-xl border bg-white p-4"><div className="flex flex-wrap items-center gap-2"><Badge variant="outline">{turn.role === "candidate" ? "You" : turn.speaker || "Interviewer"}</Badge>{turn.quality ? <Badge className={qualityClass(turn.quality)}>{qualityLabel(turn.quality)}</Badge> : null}</div><p className="mt-2 whitespace-pre-wrap text-sm leading-6">{turn.text}</p></div>)}</CardContent></Card>
    </div></main>
  }

  return <main className="min-h-screen bg-[#f2f5f5] text-[#172b3a]"><div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><Button variant="ghost" onClick={reset}><ArrowLeft />Exit interview</Button><div className="flex items-center gap-2"><Badge variant="outline"><Clock3 className="mr-1 size-3.5" />{formatTime(seconds)}</Badge><Badge className="bg-[#102a43] text-white">{course}</Badge><Badge variant="outline">{deepChainStage(candidateTurns)}</Badge></div></div>
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.45fr)_minmax(320px,.55fr)]"><Card className="min-h-[680px] border-[#dbe5e7]"><CardHeader><CardTitle className="font-serif text-2xl">Academic interview</CardTitle><CardDescription>Stay with the problem. Think aloud, revise when needed, and use the interviewer’s challenge as new information rather than as a verdict.</CardDescription><Progress value={sessionProgress} className="mt-2" /></CardHeader><CardContent className="space-y-4">
      {base?.stimulus && !(applicationLaunch && useApplicationLaunch) ? <div className="rounded-2xl border border-[#cfe1e4] bg-[#edf7f8] p-4"><p className="text-xs font-bold uppercase tracking-[.16em] text-[#147d91]">Stimulus</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6">{base.stimulus}</p></div> : null}
      <div className="max-h-[430px] space-y-3 overflow-y-auto rounded-2xl bg-[#f8fafb] p-4">{turns.map((turn, index) => { const styles = turn.reveal ? revealClasses(turn.reveal.kind) : null; return <div key={`${turn.role}-${index}`} className={`rounded-2xl p-4 ${turn.role === "candidate" ? "ml-auto max-w-[92%] bg-[#102a43] text-white" : "bg-white shadow-sm"}`}><div className="flex items-center justify-between gap-2"><p className={`text-[11px] font-bold uppercase tracking-wider ${turn.role === "candidate" ? "text-[#8dd7de]" : "text-[#147d91]"}`}>{turn.role === "candidate" ? "You" : turn.speaker || "Interviewer"}</p>{turn.role === "candidate" && turn.quality ? <span className="text-[10px] font-semibold text-white/65">{qualityLabel(turn.quality)}</span> : null}</div>{turn.reveal && styles ? <div className={`mt-2 rounded-xl border p-3 ${styles.box}`}><p className={`text-[10px] font-bold uppercase tracking-[.14em] ${styles.label}`}>{turn.reveal.title}</p><p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-800">{turn.reveal.content}</p></div> : null}<p className="mt-2 whitespace-pre-wrap text-sm leading-6">{turn.text}</p></div>})}{thinking ? <div className="flex items-center gap-2 rounded-xl bg-white p-3 text-sm text-slate-500"><Loader2 className="size-4 animate-spin" />The panel is deciding how to develop the same line of reasoning…</div> : null}</div>
      {notice ? <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{notice}</div> : null}
      <Textarea value={answer} onChange={event => setAnswer(event.target.value)} rows={6} placeholder="Type what you would say aloud. Concise reasoning is fine; this is not an essay." />
      <div className="flex flex-wrap items-center justify-between gap-3"><Button variant="outline" onClick={listening ? stopListening : startListening}>{listening ? <MicOff /> : <Mic />}{listening ? "Stop" : "Dictate"}</Button><div className="flex gap-2"><Button variant="outline" onClick={finishInterview} disabled={!turns.some(turn => turn.role === "candidate") && !answer.trim()}>Finish & mark</Button><Button onClick={submitTurn} disabled={!answer.trim() || thinking}>{thinking ? <Loader2 className="animate-spin" /> : <Brain />}{thinking ? "Thinking…" : "Answer"}</Button></div></div>
    </CardContent></Card><aside className="space-y-4"><Card><CardHeader><CardTitle className="text-lg">Your working</CardTitle><CardDescription>Private scratchpad; not marked for polish.</CardDescription></CardHeader><CardContent><Textarea value={scratch} onChange={event => setScratch(event.target.value)} rows={7} placeholder="Calculations, structure, possible counterexamples…" /></CardContent></Card>{whiteboardTask ? <InterviewWhiteboard task={whiteboardTask} onUsed={() => setWhiteboardUsed(true)} /> : null}<Card className="border-[#cfe1e4] bg-[#edf7f8]"><CardHeader><Users className="size-5 text-[#147d91]" /><CardTitle className="text-lg">{panelMode ? "Two-academic panel" : "Course-specific interviewer"}</CardTitle><CardDescription>{courseProfile.family}</CardDescription></CardHeader><CardContent className="space-y-2 text-sm leading-6 text-[#526a75]"><p>• The same core problem is developed over multiple turns.</p><p>• Interviewer A: {courseProfile.interviewerA}.</p><p>• Interviewer B: {courseProfile.interviewerB}.</p><p>• Recovery after a mistake is tracked as positive evidence.</p></CardContent></Card></aside></div>
  </div></main>
}

"use client"

import Link from "next/link"
import { useEffect, useMemo, useRef, useState } from "react"
import { ArrowLeft, Brain, CheckCircle2, Clock3, GraduationCap, Loader2, Mic, MicOff, RefreshCw, Sparkles, Target } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import { interviewerPersonas, type InterviewMode, type InterviewPersonaKey } from "@/lib/coach-suite"
import { markTypedInterviewTranscript, type InterviewMarkingResult } from "@/lib/interview-marking"
import type { InterviewMoveKind, InterviewReveal } from "@/lib/interview-questioning-engine"
import { realisticInterviewQuestions } from "@/lib/realistic-interview-bank"
import { tracks, type TrackId } from "@/lib/oxbridge-data"
import type { InterviewAnswerClassification } from "@/lib/interview-answer-quality"

const PROFILE_KEY = "oxbridge-tutor-profile-v2"
const PROGRESS_KEY = "oxbridge-tutor-progress-v2"

type Variant = "ai" | "formal"
type Phase = "lobby" | "live" | "review"
type Turn = {
  role: "interviewer" | "candidate"
  text: string
  quality?: InterviewAnswerClassification
  moveKind?: InterviewMoveKind
  reveal?: InterviewReveal
}
type AiReply = {
  reply?: string
  classification?: InterviewAnswerClassification
  moveKind?: InterviewMoveKind
  reveal?: InterviewReveal
  degraded?: boolean
}
type SavedProgress = { sessions?: number; interviewScores?: number[]; logs?: Array<Record<string, unknown>>; misconceptions?: Record<string, number>; [key: string]: unknown }

type Dimension = {
  key: keyof Pick<InterviewMarkingResult, "reasoning" | "accuracy" | "responsiveness" | "adaptability" | "evidence" | "communication">
  label: string
  max: number
  description: string
}

const dimensions: Dimension[] = [
  { key: "reasoning", label: "Reasoning", max: 25, description: "Makes the chain of thought academically visible: assumptions, mechanisms, inference and checks." },
  { key: "accuracy", label: "Accuracy", max: 20, description: "Uses subject knowledge correctly enough for the argument to stand; concrete errors are penalised." },
  { key: "responsiveness", label: "Responsiveness", max: 15, description: "Answers the exact question being asked rather than delivering a prepared speech around the topic." },
  { key: "adaptability", label: "Adaptability", max: 20, description: "Responds to challenge and new information by testing or revising the original position." },
  { key: "evidence", label: "Evidence & testing", max: 15, description: "Uses calculations, examples, counterexamples, data or proposed tests to discriminate between ideas." },
  { key: "communication", label: "Communication", max: 5, description: "Makes the reasoning interpretable. Typed answers are not rewarded for length, spelling or polished prose." },
]

function formatTime(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`
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

export function RealisticTypedInterview({ variant }: { variant: Variant }) {
  const [phase, setPhase] = useState<Phase>("lobby")
  const [track, setTrack] = useState<TrackId>("physical")
  const [course, setCourse] = useState("Physics")
  const [difficulty, setDifficulty] = useState<"Foundation" | "Stretch" | "Challenge">("Stretch")
  const [personaKey, setPersonaKey] = useState<InterviewPersonaKey>("Socratic")
  const [mode, setMode] = useState<InterviewMode>("Realistic")
  const [seed, setSeed] = useState(0)
  const [turns, setTurns] = useState<Turn[]>([])
  const [moveHistory, setMoveHistory] = useState<InterviewMoveKind[]>([])
  const [question, setQuestion] = useState("")
  const [answer, setAnswer] = useState("")
  const [scratch, setScratch] = useState("")
  const [seconds, setSeconds] = useState(15 * 60)
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
    } catch {
      // Keep safe defaults.
    }
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
  const candidateTurns = turns.filter(turn => turn.role === "candidate").length
  const sessionProgress = Math.min(100, candidateTurns * 18)

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
    const first: Turn[] = [
      { role: "interviewer", text: persona.opening },
      { role: "interviewer", text: base.prompt },
    ]
    setTurns(first)
    setMoveHistory([])
    setQuestion(base.prompt)
    setAnswer("")
    setScratch("")
    setResult(null)
    setNotice("")
    setSeconds(mode === "Stress" ? 9 * 60 : 15 * 60)
    setRunning(true)
    setPhase("live")
    speak(`${persona.opening} ${base.prompt}`)
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

    try {
      const response = await fetch("/api/interview-turn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          course,
          track,
          difficulty,
          persona: personaKey,
          mode,
          question,
          questionId: base.id,
          answer: candidate,
          concepts: base.concepts,
          probes: base.probes,
          moveHistory,
          referenceAnswer: base.strongAnswer,
          stimulus: base.stimulus,
          turns: history,
          delivery: "natural",
        }),
      })
      if (!response.ok) throw new Error("interview-turn")
      const data = await response.json() as AiReply
      const classification = data.classification ?? "partial"
      const next = data.reply?.trim() || base.probes[candidateTurns % base.probes.length]
      const classified = history.map((turn, index) => index === history.length - 1 ? { ...turn, quality: classification } : turn)
      const interviewerTurn: Turn = { role: "interviewer", text: next, moveKind: data.moveKind, reveal: data.reveal }
      setTurns([...classified, interviewerTurn])
      if (data.moveKind) setMoveHistory(current => [...current, data.moveKind as InterviewMoveKind].slice(-12))
      setQuestion(next)
      if (data.degraded) setNotice("Cloud evaluation was temporarily unavailable, so the built-in adaptive interviewer continued from the same academic problem.")
      speak(`${data.reveal?.content ? `${data.reveal.content} ` : ""}${next}`)
    } catch {
      const next = base.probes[candidateTurns % base.probes.length] ?? "Which assumption in that answer is doing the most work, and what would happen if it failed?"
      setTurns([...history, { role: "interviewer", text: next }])
      setQuestion(next)
      setNotice("The interview service could not be reached, so the session continued with a pre-written tutor probe from the same problem.")
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
    const scored = markTypedInterviewTranscript({ turns: finalTurns, concepts: base.concepts, referenceAnswer: base.strongAnswer })
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
          turn.reveal ? `Interviewer ${turn.reveal.title}: ${turn.reveal.content}` : "",
          `${turn.role === "interviewer" ? "Interviewer" : "Candidate"}: ${turn.text}`,
        ].filter(Boolean)),
        `Questioning moves: ${moveHistory.length ? moveHistory.join(" → ") : "opening problem only"}`,
        `Typed rubric: ${scored.rubricVersion}`,
        `Reasoning: ${scored.reasoning}/25`,
        `Accuracy: ${scored.accuracy}/20`,
        `Responsiveness: ${scored.responsiveness}/15`,
        `Adaptability: ${scored.adaptability}/20`,
        `Evidence & testing: ${scored.evidence}/15`,
        `Communication: ${scored.communication}/5`,
      ]
      localStorage.setItem(PROGRESS_KEY, JSON.stringify({
        ...saved,
        sessions: Number(saved.sessions ?? 0) + 1,
        interviewScores: [...scores, scored.total],
        misconceptions: scored.error === "No dominant issue" ? misconceptions : { ...misconceptions, [scored.error]: Number(misconceptions[scored.error] ?? 0) + 1 },
        logs: [{
          id: `${variant}-typed-${Date.now()}`,
          title: `${variant === "formal" ? "Interview Room" : "AI Interview"} · ${course}`,
          score: scored.total,
          date: new Date().toISOString(),
          events,
          questioningMoves: moveHistory,
          rubricVersion: scored.rubricVersion,
          dimensions: { reasoning: scored.reasoning, accuracy: scored.accuracy, responsiveness: scored.responsiveness, adaptability: scored.adaptability, evidence: scored.evidence, communication: scored.communication },
        }, ...logs].slice(0, 50),
      }))
    } catch {
      // Review remains visible if persistence is unavailable.
    }
  }

  function reset() {
    stopListening()
    setPhase("lobby")
    setTurns([])
    setMoveHistory([])
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
          <Badge className="border-0 bg-[#102a43] text-white"><GraduationCap className="mr-1 size-3.5" />Adaptive interview engine</Badge>
        </div>

        <section className="grid overflow-hidden rounded-[2rem] border border-[#dbe5e7] bg-white shadow-[0_28px_80px_rgba(16,42,67,.08)] lg:grid-cols-[1.12fr_.88fr]">
          <div className="p-6 sm:p-9 lg:p-12">
            <div className="flex items-start gap-4">
              <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[#102a43] text-[#8dd7de]">{variant === "ai" ? <Sparkles className="size-5" /> : <Brain className="size-5" />}</span>
              <div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#147d91]">{variant === "ai" ? "Adaptive AI interview" : "Formal interview room"}</p><h1 className="mt-1 font-serif text-3xl font-bold sm:text-4xl">The next question now depends on what you actually said.</h1></div>
            </div>
            <p className="mt-5 max-w-3xl text-base leading-7 text-[#667984]">The interviewer branches from your reasoning rather than following a fixed script. Strong answers are stress-tested through assumptions, predictions, new evidence and counterexamples; weak answers stay on the same issue until the reasoning is repaired.</p>

            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              {["Dynamic question trees", "New information mid-problem", "Prediction → reveal → explain", "Generated counterexamples", "Assumption hunting"].map(item => <div key={item} className="rounded-xl border border-[#dbe5e7] bg-[#f8fafb] px-4 py-3 text-sm font-semibold text-[#526a75]">{item}</div>)}
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <label className="space-y-1.5"><span className="text-xs font-bold uppercase tracking-wider text-[#667984]">Subject family</span><NativeSelect value={track} onChange={event => chooseTrack(event.target.value as TrackId)}>{tracks.map(item => <NativeSelectOption key={item.id} value={item.id}>{item.short}</NativeSelectOption>)}</NativeSelect></label>
              <label className="space-y-1.5"><span className="text-xs font-bold uppercase tracking-wider text-[#667984]">Course</span><NativeSelect value={course} onChange={event => setCourse(event.target.value)}>{courses.map(item => <NativeSelectOption key={item}>{item}</NativeSelectOption>)}</NativeSelect></label>
              <label className="space-y-1.5"><span className="text-xs font-bold uppercase tracking-wider text-[#667984]">Difficulty</span><NativeSelect value={difficulty} onChange={event => { setDifficulty(event.target.value as typeof difficulty); setSeed(0) }}>{["Foundation", "Stretch", "Challenge"].map(item => <NativeSelectOption key={item}>{item}</NativeSelectOption>)}</NativeSelect></label>
              <label className="space-y-1.5"><span className="text-xs font-bold uppercase tracking-wider text-[#667984]">Interview mode</span><NativeSelect value={mode} onChange={event => setMode(event.target.value as InterviewMode)}>{["Realistic", "Tutor", "Stress"].map(item => <NativeSelectOption key={item}>{item}</NativeSelectOption>)}</NativeSelect></label>
              <label className="space-y-1.5 sm:col-span-2"><span className="text-xs font-bold uppercase tracking-wider text-[#667984]">Interviewer style</span><NativeSelect value={personaKey} onChange={event => setPersonaKey(event.target.value as InterviewPersonaKey)}>{Object.keys(interviewerPersonas).map(item => <NativeSelectOption key={item}>{item}</NativeSelectOption>)}</NativeSelect></label>
            </div>

            <div className="mt-8 flex flex-wrap gap-3"><Button onClick={startInterview} disabled={!base}><Brain />Start interview</Button><Button variant="outline" onClick={() => setSeed(value => value + 1)}><RefreshCw />Different problem</Button></div>
          </div>

          <aside className="bg-[#102a43] p-6 text-white sm:p-8 lg:p-10">
            <p className="text-xs font-bold uppercase tracking-[.18em] text-[#8dd7de]">How this version marks you</p>
            <h2 className="mt-2 font-serif text-2xl font-bold">Reasoning matters more than polished prose.</h2>
            <div className="mt-6 space-y-3 text-sm leading-6 text-white/75">
              <p><strong className="text-white">25%</strong> reasoning quality</p>
              <p><strong className="text-white">20%</strong> accuracy</p>
              <p><strong className="text-white">15%</strong> answering the exact question</p>
              <p><strong className="text-white">20%</strong> adapting under challenge</p>
              <p><strong className="text-white">15%</strong> evidence and testing</p>
              <p><strong className="text-white">5%</strong> communication</p>
            </div>
            <div className="mt-6 rounded-xl bg-white/10 p-4 text-sm leading-6 text-white/75">Typed answers receive no bonus for being long, using sophisticated vocabulary, perfect spelling or polished essay-style prose. Concise equations and short but well-justified answers can score highly.</div>
          </aside>
        </section>
      </div>
    </main>
  }

  if (phase === "review" && result && base) {
    return <main className="min-h-screen bg-slate-50 text-slate-950">
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3"><Button asChild variant="ghost"><Link href="/interviews"><ArrowLeft />Interview Hub</Link></Button><Button onClick={reset}><RefreshCw />Try another interview</Button></div>
        <Card className="border-[#cfe1e4]">
          <CardHeader><p className="text-xs font-bold uppercase tracking-[.16em] text-[#147d91]">Practice interview review · rubric {result.rubricVersion}</p><CardTitle className="font-serif text-3xl">{result.total}/100 · {result.band}</CardTitle><CardDescription>This is a practice diagnostic, not an Oxford or Cambridge admissions score. It is designed to reflect the behaviours universities say interviews are intended to explore.</CardDescription></CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {dimensions.map(item => <div key={item.key} className="rounded-2xl border bg-white p-4"><div className="flex items-baseline justify-between gap-2"><strong>{item.label}</strong><span className="text-2xl font-bold text-[#147d91]">{result[item.key]}/{item.max}</span></div><p className="mt-2 text-xs leading-5 text-slate-500">{item.description}</p></div>)}
          </CardContent>
        </Card>

        <div className="grid gap-5 lg:grid-cols-2">
          <Card><CardHeader><CheckCircle2 className="size-5 text-emerald-700" /><CardTitle>What worked</CardTitle></CardHeader><CardContent className="space-y-3">{result.strengths.length ? result.strengths.map(item => <p key={item} className="rounded-xl bg-emerald-50 p-3 text-sm leading-6 text-emerald-950">{item}</p>) : <p className="text-sm text-slate-600">There was not yet enough consistent evidence for a strong-area judgement.</p>}</CardContent></Card>
          <Card><CardHeader><Target className="size-5 text-amber-700" /><CardTitle>What to work on next</CardTitle><CardDescription>Priority: {result.error}</CardDescription></CardHeader><CardContent className="space-y-3">{result.next.map(item => <p key={item} className="rounded-xl bg-amber-50 p-3 text-sm leading-6 text-amber-950">{item}</p>)}</CardContent></Card>
        </div>

        <Card>
          <CardHeader><CardTitle className="font-serif text-2xl">Typed-answer marking, turn by turn</CardTitle><CardDescription>Each answer is judged against the question immediately before it. Length and writing style are not used as proxies for academic quality.</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            {result.turnAssessments.map((item, index) => <div key={`${index}-${item.question}`} className="rounded-2xl border p-4 sm:p-5">
              <div className="flex flex-wrap items-center gap-2"><Badge variant="outline">Answer {index + 1}</Badge><Badge className={qualityClass(item.classification)}>{qualityLabel(item.classification)}</Badge><Badge variant="outline">Directness {item.directness}/100</Badge></div>
              <p className="mt-3 text-sm font-semibold leading-6">Interviewer: {item.question}</p>
              <p className="mt-2 rounded-xl bg-slate-50 p-3 text-sm leading-6 text-slate-700">{item.answer}</p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs"><Badge variant="outline">Reasoning {item.reasoning}/25</Badge><Badge variant="outline">Accuracy {item.accuracy}/20</Badge><Badge variant="outline">Response {item.responsiveness}/15</Badge><Badge variant="outline">Evidence {item.evidence}/15</Badge><Badge variant="outline">Communication {item.communication}/5</Badge></div>
              {item.notes.length ? <div className="mt-3 space-y-1 text-sm text-slate-600">{item.notes.map(note => <p key={note}>• {note}</p>)}</div> : null}
            </div>)}
          </CardContent>
        </Card>
      </div>
    </main>
  }

  return <main className="min-h-screen bg-[#f2f5f5] text-[#172b3a]">
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><Button variant="ghost" onClick={reset}><ArrowLeft />Exit interview</Button><div className="flex items-center gap-2"><Badge variant="outline"><Clock3 className="mr-1 size-3.5" />{formatTime(seconds)}</Badge><Badge className="bg-[#102a43] text-white">{course}</Badge></div></div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.45fr)_minmax(320px,.55fr)]">
        <Card className="min-h-[680px] border-[#dbe5e7]">
          <CardHeader><CardTitle className="font-serif text-2xl">Academic interview</CardTitle><CardDescription>Think aloud. It is acceptable to pause, make a provisional claim, test it and revise it.</CardDescription><Progress value={sessionProgress} className="mt-2" /></CardHeader>
          <CardContent className="space-y-4">
            {base?.stimulus ? <div className="rounded-2xl border border-[#cfe1e4] bg-[#edf7f8] p-4"><p className="text-xs font-bold uppercase tracking-[.16em] text-[#147d91]">Stimulus</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6">{base.stimulus}</p></div> : null}
            <div className="max-h-[430px] space-y-3 overflow-y-auto rounded-2xl bg-[#f8fafb] p-4">
              {turns.map((turn, index) => <div key={`${turn.role}-${index}`} className={`rounded-2xl p-4 ${turn.role === "candidate" ? "ml-auto max-w-[92%] bg-[#102a43] text-white" : "bg-white shadow-sm"}`}>
                <div className="flex items-center justify-between gap-2"><p className={`text-[11px] font-bold uppercase tracking-wider ${turn.role === "candidate" ? "text-[#8dd7de]" : "text-[#147d91]"}`}>{turn.role === "candidate" ? "You" : "Interviewer"}</p>{turn.role === "candidate" && turn.quality ? <span className="text-[10px] font-semibold text-white/65">{qualityLabel(turn.quality)}</span> : null}</div>
                {turn.reveal ? <div className={`mt-2 rounded-xl border p-3 ${turn.reveal.kind === "counterexample" ? "border-amber-200 bg-amber-50" : "border-cyan-200 bg-cyan-50"}`}><p className={`text-[10px] font-bold uppercase tracking-[.14em] ${turn.reveal.kind === "counterexample" ? "text-amber-800" : "text-cyan-800"}`}>{turn.reveal.title}</p><p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-800">{turn.reveal.content}</p></div> : null}
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6">{turn.text}</p>
              </div>)}
              {thinking ? <div className="flex items-center gap-2 rounded-xl bg-white p-3 text-sm text-slate-500"><Loader2 className="size-4 animate-spin" />The interviewer is deciding how to challenge your reasoning next…</div> : null}
            </div>

            {notice ? <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{notice}</div> : null}
            <Textarea value={answer} onChange={event => setAnswer(event.target.value)} rows={6} placeholder="Type what you would say aloud. You do not need essay-style prose—show the reasoning." />
            <div className="flex flex-wrap items-center justify-between gap-3"><Button variant="outline" onClick={listening ? stopListening : startListening}>{listening ? <MicOff /> : <Mic />}{listening ? "Stop" : "Dictate"}</Button><div className="flex gap-2"><Button variant="outline" onClick={finishInterview} disabled={!turns.some(turn => turn.role === "candidate") && !answer.trim()}>Finish & mark</Button><Button onClick={submitTurn} disabled={!answer.trim() || thinking}>{thinking ? <Loader2 className="animate-spin" /> : <Brain />}{thinking ? "Thinking…" : "Answer"}</Button></div></div>
          </CardContent>
        </Card>

        <aside className="space-y-4">
          <Card><CardHeader><CardTitle className="text-lg">Your working</CardTitle><CardDescription>Private scratchpad. It is not marked.</CardDescription></CardHeader><CardContent><Textarea value={scratch} onChange={event => setScratch(event.target.value)} rows={10} placeholder="Calculations, structure, possible counterexamples…" /></CardContent></Card>
          <Card className="border-[#cfe1e4] bg-[#edf7f8]"><CardHeader><Target className="size-5 text-[#147d91]" /><CardTitle className="text-lg">Adaptive questioning</CardTitle><CardDescription>The engine does not follow the same sequence if your reasoning changes.</CardDescription></CardHeader><CardContent className="space-y-2 text-sm leading-6 text-[#526a75]"><p>• Weak reasoning is repaired before the interview moves on.</p><p>• Strong reasoning triggers a specific assumption challenge.</p><p>• You may be asked to predict before seeing new evidence.</p><p>• New information can force you to revise the model.</p><p>• A concrete counterexample may stress-test your rule.</p></CardContent></Card>
        </aside>
      </div>
    </div>
  </main>
}

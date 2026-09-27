"use client"

import Link from "next/link"
import { useEffect, useMemo, useRef, useState } from "react"
import {
  ArrowLeft,
  ArrowRight,
  Brain,
  CheckCircle2,
  Clock3,
  FileText,
  GraduationCap,
  Loader2,
  Mic,
  MicOff,
  RefreshCw,
  RotateCcw,
  Sparkles,
  Target,
  Volume2,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import { interviewerPersonas, type InterviewMode, type InterviewPersonaKey } from "@/lib/coach-suite"
import { markTypedInterviewTranscript, type InterviewMarkingResult } from "@/lib/interview-marking"
import { interviewQuestions, tracks, type TrackId } from "@/lib/oxbridge-data"
import type { InterviewAnswerClassification } from "@/lib/interview-answer-quality"

const PROFILE_KEY = "oxbridge-tutor-profile-v2"
const PROGRESS_KEY = "oxbridge-tutor-progress-v2"

type Variant = "ai" | "formal"
type Phase = "lobby" | "live" | "review"
type Turn = { role: "interviewer" | "candidate"; text: string; quality?: InterviewAnswerClassification }
type AiReply = {
  reply?: string
  classification?: InterviewAnswerClassification
  provider?: string
  configured?: boolean
  degraded?: boolean
}

type SavedProgress = {
  sessions?: number
  interviewScores?: number[]
  logs?: Array<Record<string, unknown>>
  misconceptions?: Record<string, number>
  [key: string]: unknown
}

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

function scoreTone(value: number) {
  if (value >= 20) return "Strong practice signal"
  if (value >= 16) return "Secure in places"
  if (value >= 12) return "Developing"
  return "Priority for practice"
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
  const [question, setQuestion] = useState("")
  const [answer, setAnswer] = useState("")
  const [scratch, setScratch] = useState("")
  const [seconds, setSeconds] = useState(15 * 60)
  const [running, setRunning] = useState(false)
  const [thinking, setThinking] = useState(false)
  const [listening, setListening] = useState(false)
  const [notice, setNotice] = useState("")
  const [result, setResult] = useState<InterviewMarkingResult | null>(null)
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const recognitionRef = useRef<{ stop: () => void } | null>(null)

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(PROFILE_KEY) || "{}") as { track?: TrackId; course?: string }
      if (saved.track) setTrack(saved.track)
      if (saved.course) setCourse(saved.course)
    } catch {
      // Defaults remain usable.
    }
  }, [])

  useEffect(() => {
    if (!running || seconds <= 0) return
    const timer = window.setInterval(() => setSeconds(value => Math.max(0, value - 1)), 1000)
    return () => window.clearInterval(timer)
  }, [running, seconds])

  const questionsForTrack = useMemo(() => {
    const exact = interviewQuestions.filter(item => item.track === track && item.difficulty === difficulty)
    return exact.length ? exact : interviewQuestions.filter(item => item.track === track)
  }, [track, difficulty])

  const base = questionsForTrack[seed % Math.max(1, questionsForTrack.length)]
  const persona = interviewerPersonas[personaKey]
  const courses = tracks.find(item => item.id === track)?.courses ?? [course]
  const candidateTurns = turns.filter(turn => turn.role === "candidate").length
  const sessionProgress = Math.min(100, candidateTurns * 20)

  function speak(text: string) {
    if (variant !== "ai" || !("speechSynthesis" in window)) return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = "en-GB"
    utterance.rate = 0.95
    window.speechSynthesis.speak(utterance)
  }

  function startListening() {
    type Recognition = {
      continuous: boolean
      interimResults: boolean
      lang: string
      onresult: (event: { results: ArrayLike<{ 0: { transcript: string } }> }) => void
      onend: () => void
      start: () => void
      stop: () => void
    }
    const browser = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition }
    const RecognitionClass = browser.SpeechRecognition ?? browser.webkitSpeechRecognition
    if (!RecognitionClass) {
      setNotice("Voice transcription is unavailable in this browser. Typed answers are fully supported and use the same marking rubric.")
      return
    }
    const recognition = new RecognitionClass()
    recognition.continuous = true
    recognition.interimResults = false
    recognition.lang = "en-GB"
    recognition.onresult = event => {
      const text = Array.from(event.results).map(item => item[0].transcript).join(" ")
      setAnswer(current => `${current} ${text}`.trim())
    }
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
    const openingTurns: Turn[] = [
      { role: "interviewer", text: persona.opening },
      { role: "interviewer", text: base.prompt },
    ]
    setTurns(openingTurns)
    setQuestion(base.prompt)
    setAnswer("")
    setScratch("")
    setResult(null)
    setNotice("")
    setStartedAt(Date.now())
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
          answer: candidate,
          concepts: base.concepts,
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
      setTurns([...classified, { role: "interviewer", text: next }])
      setQuestion(next)
      if (data.degraded) setNotice("The cloud evaluator was temporarily unavailable, so the built-in academic interviewer continued the session.")
      speak(next)
    } catch {
      const next = base.probes[candidateTurns % base.probes.length] ?? "Which assumption in that answer is doing the most work, and how could you test it?"
      setTurns([...history, { role: "interviewer", text: next }])
      setQuestion(next)
      setNotice("The live evaluator could not be reached, so the interview continued with the question's built-in tutor probe.")
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
    const scored = markTypedInterviewTranscript({
      turns: finalTurns,
      concepts: base.concepts,
      referenceAnswer: base.strongAnswer,
    })
    setTurns(finalTurns)
    setResult(scored)
    setRunning(false)
    setPhase("review")
    speak(persona.closing)

    try {
      const saved = JSON.parse(localStorage.getItem(PROGRESS_KEY) || "{}") as SavedProgress
      const logs = Array.isArray(saved.logs) ? saved.logs : []
      const scores = Array.isArray(saved.interviewScores) ? saved.interviewScores : []
      const misconceptions = saved.misconceptions && typeof saved.misconceptions === "object" ? saved.misconceptions : {}
      const events = [
        ...finalTurns.map(turn => `${turn.role === "interviewer" ? "Interviewer" : "Candidate"}: ${turn.text}`),
        `Typed rubric: ${scored.rubricVersion}`,
        `Reasoning: ${scored.reasoning}/25`,
        `Subject use: ${scored.subject}/25`,
        `Flexibility: ${scored.flexibility}/25`,
        `Precision: ${scored.clarity}/25`,
      ]
      localStorage.setItem(PROGRESS_KEY, JSON.stringify({
        ...saved,
        sessions: Number(saved.sessions ?? 0) + 1,
        interviewScores: [...scores, scored.total],
        misconceptions: scored.error === "No dominant issue"
          ? misconceptions
          : { ...misconceptions, [scored.error]: Number(misconceptions[scored.error] ?? 0) + 1 },
        logs: [{
          id: `${variant}-typed-${Date.now()}`,
          title: `${variant === "formal" ? "Interview Room" : "AI Interview"} · ${course}`,
          score: scored.total,
          date: new Date().toISOString(),
          events,
          rubricVersion: scored.rubricVersion,
          dimensions: { reasoning: scored.reasoning, subject: scored.subject, flexibility: scored.flexibility, clarity: scored.clarity },
        }, ...logs].slice(0, 50),
      }))
    } catch {
      // The review remains visible even if local persistence is unavailable.
    }
  }

  function reset(nextQuestion = true) {
    stopListening()
    setPhase("lobby")
    setTurns([])
    setQuestion("")
    setAnswer("")
    setScratch("")
    setResult(null)
    setRunning(false)
    setThinking(false)
    setNotice("")
    setStartedAt(null)
    if (nextQuestion) setSeed(value => value + 1)
  }

  if (phase === "lobby") {
    return <main className="min-h-screen bg-[#f2f5f5] text-[#172b3a]">
      <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-8 lg:py-11">
        <div className="mb-7 flex flex-wrap items-center justify-between gap-3">
          <Button asChild variant="ghost"><Link href="/interviews"><ArrowLeft />Interview Hub</Link></Button>
          <Badge className="border-0 bg-[#102a43] text-white"><GraduationCap className="mr-1 size-3.5" />Realistic academic interview</Badge>
        </div>

        <section className="grid overflow-hidden rounded-[2rem] border border-[#dbe5e7] bg-white shadow-[0_28px_80px_rgba(16,42,67,.08)] lg:grid-cols-[1.12fr_.88fr]">
          <div className="p-6 sm:p-9 lg:p-12">
            <div className="flex items-start gap-4">
              <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[#102a43] text-[#8dd7de]">{variant === "ai" ? <Sparkles className="size-5" /> : <Brain className="size-5" />}</span>
              <div>
                <p className="text-xs font-bold uppercase tracking-[.18em] text-[#147d91]">{variant === "ai" ? "Adaptive AI interview" : "Formal interview room"}</p>
                <h1 className="mt-1 font-serif text-3xl font-bold sm:text-4xl">Tutor-style questions that develop as you answer.</h1>
              </div>
            </div>
            <p className="mt-5 max-w-3xl text-base leading-7 text-[#667984]">Questions now begin with a concrete problem, source, dataset, rule or observation. The interviewer tests how you think, introduces pressure through follow-ups and does not reward memorised speeches.</p>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <label className="space-y-1.5"><span className="text-xs font-bold uppercase tracking-wider text-[#667984]">Subject family</span><NativeSelect value={track} onChange={event => chooseTrack(event.target.value as TrackId)}>{tracks.map(item => <NativeSelectOption key={item.id} value={item.id}>{item.short}</NativeSelectOption>)}</NativeSelect></label>
              <label className="space-y-1.5"><span className="text-xs font-bold uppercase tracking-wider text-[#667984]">Course</span><NativeSelect value={course} onChange={event => setCourse(event.target.value)}>{courses.map(item => <NativeSelectOption key={item}>{item}</NativeSelectOption>)}</NativeSelect></label>
              <label className="space-y-1.5"><span className="text-xs font-bold uppercase tracking-wider text-[#667984]">Difficulty</span><NativeSelect value={difficulty} onChange={event => { setDifficulty(event.target.value as typeof difficulty); setSeed(0) }}>{["Foundation", "Stretch", "Challenge"].map(item => <NativeSelectOption key={item}>{item}</NativeSelectOption>)}</NativeSelect></label>
              <label className="space-y-1.5"><span className="text-xs font-bold uppercase tracking-wider text-[#667984]">Interview style</span><NativeSelect value={mode} onChange={event => setMode(event.target.value as InterviewMode)}>{["Tutor", "Realistic", "No-hint", "Stress"].map(item => <NativeSelectOption key={item}>{item}</NativeSelectOption>)}</NativeSelect></label>
              <label className="space-y-1.5 sm:col-span-2"><span className="text-xs font-bold uppercase tracking-wider text-[#667984]">Interviewer</span><NativeSelect value={personaKey} onChange={event => setPersonaKey(event.target.value as InterviewPersonaKey)}>{Object.keys(interviewerPersonas).map(item => <NativeSelectOption key={item}>{item}</NativeSelectOption>)}</NativeSelect></label>
            </div>

            <div className="mt-7 flex flex-wrap gap-3">
              <Button size="lg" onClick={startInterview} className="rounded-xl bg-[#102a43] px-6">Start interview <ArrowRight /></Button>
              <Button size="lg" variant="outline" onClick={() => setSeed(value => value + 1)}><RefreshCw />Change question</Button>
            </div>
          </div>

          <aside className="bg-[#102a43] p-6 text-white sm:p-9 lg:p-10">
            <p className="text-xs font-bold uppercase tracking-[.18em] text-[#8dd7de]">Current question preview</p>
            <h2 className="mt-3 font-serif text-2xl font-bold">{base?.title ?? "Academic problem"}</h2>
            <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4">
              {base?.stimulus ? <><p className="text-[11px] font-bold uppercase tracking-wider text-white/45">Stimulus</p><p className="mt-2 text-sm leading-6 text-white/80">{base.stimulus}</p></> : <p className="text-sm leading-6 text-white/70">This problem begins without a separate stimulus. The interviewer will introduce new information through follow-up questions.</p>}
            </div>
            <div className="mt-6 space-y-3 text-sm leading-6 text-white/65">
              <p><strong className="text-white">No length bonus.</strong> A concise answer can score highly if it is accurate, direct and well reasoned.</p>
              <p><strong className="text-white">Revision is positive.</strong> Changing your view for a good reason can increase the flexibility score.</p>
              <p><strong className="text-white">Keywords are not enough.</strong> Subject terminology only helps when it is actually used to solve the problem.</p>
            </div>
          </aside>
        </section>
      </div>
    </main>
  }

  if (phase === "review" && result && base) {
    const dimensions = [
      ["Reasoning & justification", result.reasoning],
      ["Subject application", result.subject],
      ["Response to challenge", result.flexibility],
      ["Precision & directness", result.clarity],
    ] as const
    const elapsed = startedAt ? Math.max(0, Math.round((Date.now() - startedAt) / 1000)) : 0

    return <main className="min-h-screen bg-[#f2f5f5] text-[#172b3a]">
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-7 sm:px-6 lg:px-8 lg:py-10">
        <div className="flex flex-wrap items-center justify-between gap-3"><Button variant="ghost" asChild><Link href="/interviews"><ArrowLeft />Interview Hub</Link></Button><Badge variant="outline">Typed rubric {result.rubricVersion}</Badge></div>

        <div className="grid gap-5 xl:grid-cols-[.78fr_1.22fr]">
          <Card className="border-0 bg-[#102a43] text-white">
            <CardHeader><p className="text-xs font-bold uppercase tracking-[.18em] text-[#8dd7de]">Practice skills profile</p><div className="flex items-end gap-2"><CardTitle className="font-serif text-6xl">{result.total}</CardTitle><span className="pb-2 text-white/45">/100</span></div><CardDescription className="text-white/55">Practice feedback only; this is not an Oxford or Cambridge admissions score.</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              {dimensions.map(([label, value]) => <div key={label}><div className="mb-1 flex justify-between gap-4 text-xs"><span>{label}</span><span>{value}/25 · {scoreTone(value)}</span></div><Progress value={value * 4} className="bg-white/15 [&_[data-slot=progress-indicator]]:bg-[#8dd7de]" /></div>)}
              <div className="rounded-2xl bg-white/8 p-4 text-sm leading-6 text-white/75"><strong className="text-white">What changed in this marking:</strong><p className="mt-1">Typed answers are marked turn by turn against the exact question. Length and keyword density do not receive marks on their own.</p></div>
              <Button className="w-full bg-white text-[#102a43] hover:bg-[#edf7f8]" onClick={() => reset(true)}>Start another interview <RotateCcw /></Button>
            </CardContent>
          </Card>

          <div className="space-y-5">
            <Card><CardHeader><CardTitle className="font-serif text-2xl">Academic feedback</CardTitle><CardDescription>{result.typedAnswers} typed answer{result.typedAnswers === 1 ? "" : "s"} assessed · {Math.max(1, Math.round(elapsed / 60))} minutes</CardDescription></CardHeader><CardContent className="grid gap-4 md:grid-cols-2"><div className="rounded-2xl bg-emerald-50 p-4"><p className="text-sm font-bold text-emerald-900">Behaviours to keep</p><div className="mt-3 space-y-2">{result.strengths.length ? result.strengths.map(item => <p key={item} className="flex gap-2 text-sm leading-6 text-emerald-900"><CheckCircle2 className="mt-1 size-4 shrink-0" />{item}</p>) : <p className="text-sm text-emerald-900">The interview produced useful evidence for the next practice session.</p>}</div></div><div className="rounded-2xl bg-amber-50 p-4"><p className="text-sm font-bold text-amber-950">Next practice targets</p><div className="mt-3 space-y-2">{result.next.map(item => <p key={item} className="flex gap-2 text-sm leading-6 text-amber-950"><Target className="mt-1 size-4 shrink-0" />{item}</p>)}</div></div></CardContent></Card>

            <Card><CardHeader><CardTitle className="font-serif text-2xl">Typed-answer breakdown</CardTitle><CardDescription>Each answer is assessed against the question immediately before it.</CardDescription></CardHeader><CardContent className="space-y-4">{result.turnAssessments.map((assessment, index) => <div key={`${assessment.question}-${index}`} className="rounded-2xl border p-4"><div className="flex flex-wrap items-center gap-2"><Badge variant="outline">Turn {index + 1}</Badge><Badge variant="outline">{qualityLabel(assessment.classification)}</Badge><Badge variant="outline">Directness {assessment.directness}/100</Badge></div><p className="mt-3 text-xs font-bold uppercase tracking-wider text-[#667984]">Question</p><p className="mt-1 text-sm font-semibold leading-6">{assessment.question}</p><p className="mt-3 text-xs font-bold uppercase tracking-wider text-[#667984]">Your answer</p><p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-[#526a75]">{assessment.answer}</p><div className="mt-4 grid gap-2 sm:grid-cols-3"><div className="rounded-xl bg-[#f5f8f8] p-3"><p className="text-xs text-[#667984]">Reasoning</p><p className="text-xl font-bold">{assessment.reasoning}/25</p></div><div className="rounded-xl bg-[#f5f8f8] p-3"><p className="text-xs text-[#667984]">Subject use</p><p className="text-xl font-bold">{assessment.subject}/25</p></div><div className="rounded-xl bg-[#f5f8f8] p-3"><p className="text-xs text-[#667984]">Precision</p><p className="text-xl font-bold">{assessment.clarity}/25</p></div></div></div>)}</CardContent></Card>
          </div>
        </div>
      </div>
    </main>
  }

  return <main className="min-h-screen bg-[#eef2f3] text-[#172b3a]">
    <div className="mx-auto flex min-h-screen max-w-[1500px] flex-col">
      <header className="sticky top-0 z-20 border-b border-[#d9e3e5] bg-white/95 px-4 py-3 backdrop-blur sm:px-6"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-[#147d91]">{variant === "formal" ? "Formal interview" : "Adaptive interview"} · {course}</p><p className="text-sm text-[#667984]">{persona.label} · {mode} · {base?.title}</p></div><div className="flex items-center gap-2"><Badge variant="outline"><Clock3 className="mr-1 size-3.5" />{formatTime(seconds)}</Badge><Button variant="outline" size="sm" onClick={() => setRunning(value => !value)}>{running ? "Pause" : "Resume"}</Button><Button variant="ghost" size="sm" onClick={() => reset(false)}>Exit</Button></div></div><Progress value={sessionProgress} className="mt-3 h-1.5" /></header>

      <div className="grid flex-1 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="bg-white p-4 sm:p-7 lg:p-10">
          <div className="mx-auto max-w-4xl">
            <div className="mb-5 flex flex-wrap gap-2"><Badge>{difficulty}</Badge><Badge variant="outline">Turn {candidateTurns + 1}</Badge>{base?.stimulus ? <Badge variant="outline">Stimulus-led</Badge> : <Badge variant="outline">Problem-led</Badge>}</div>
            {base?.stimulus && candidateTurns === 0 ? <div className="mb-5 rounded-2xl border border-[#cfe1e4] bg-[#f7fbfb] p-5"><p className="text-xs font-bold uppercase tracking-[.16em] text-[#147d91]">Material from the interviewer</p><p className="mt-2 text-base leading-7">{base.stimulus}</p></div> : null}
            <p className="text-xs font-bold uppercase tracking-[.18em] text-[#667984]">Interviewer</p>
            <h1 className="mt-3 font-serif text-3xl font-bold leading-tight sm:text-4xl">{question}</h1>

            <div className="mt-7 max-h-[260px] space-y-3 overflow-y-auto rounded-2xl bg-[#f6f9f9] p-4">{turns.slice(-6).map((turn, index) => <div key={`${turn.role}-${index}-${turn.text.slice(0, 20)}`} className={`rounded-xl p-3 ${turn.role === "interviewer" ? "bg-white" : "ml-6 bg-[#102a43] text-white"}`}><div className="mb-1 flex items-center justify-between gap-2"><p className={`text-[10px] font-bold uppercase tracking-wider ${turn.role === "interviewer" ? "text-[#147d91]" : "text-[#8dd7de]"}`}>{turn.role}</p>{turn.role === "candidate" && turn.quality && mode === "Tutor" ? <Badge variant="outline" className="border-white/20 text-[10px] text-white">{qualityLabel(turn.quality)}</Badge> : null}</div><p className="text-sm leading-6">{turn.text}</p></div>)}</div>

            {notice ? <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{notice}</div> : null}

            <div className="mt-6 rounded-2xl border bg-white p-4 shadow-sm"><Textarea value={answer} onChange={event => setAnswer(event.target.value)} rows={7} placeholder="Think aloud in writing. Give your direct answer, then show the reasoning that supports it…" /><div className="mt-3 flex flex-wrap items-center justify-between gap-3"><div className="flex flex-wrap gap-2"><Button variant="outline" onClick={listening ? stopListening : startListening}>{listening ? <MicOff /> : <Mic />}{listening ? "Stop listening" : "Dictate"}</Button>{variant === "ai" ? <Button variant="outline" onClick={() => speak(question)}><Volume2 />Repeat question</Button> : null}</div><div className="flex gap-2"><Button variant="outline" onClick={finishInterview} disabled={!turns.some(turn => turn.role === "candidate") && !answer.trim()}><FileText />Finish & mark</Button><Button onClick={submitTurn} disabled={!answer.trim() || thinking}>{thinking ? <><Loader2 className="animate-spin" />Thinking…</> : <><ArrowRight />Answer</>}</Button></div></div><p className="mt-3 text-xs leading-5 text-[#7a8c94]">Typed marking checks whether you answered this exact question, whether the reasoning follows, whether subject knowledge is applied correctly, and how you react to challenge. It does not award marks simply for writing more.</p></div>
          </div>
        </section>

        <aside className="border-l border-[#dbe5e7] bg-[#f8fafb] p-4 sm:p-6">
          <Card className="shadow-none"><CardHeader><CardTitle className="font-serif text-xl">Private scratchpad</CardTitle><CardDescription>Use this for equations, bullet points or a quick structure. Scratchpad text is not marked.</CardDescription></CardHeader><CardContent><Textarea value={scratch} onChange={event => setScratch(event.target.value)} rows={10} placeholder="Assumptions…\nPossible mechanism…\nCounterexample…" /></CardContent></Card>
          <Card className="mt-4 shadow-none"><CardHeader><CardTitle className="font-serif text-xl">What the interviewer is testing</CardTitle></CardHeader><CardContent className="space-y-3 text-sm leading-6 text-[#667984]"><p><strong className="text-[#172b3a]">Reasoning:</strong> can each important step be justified?</p><p><strong className="text-[#172b3a]">Application:</strong> is subject knowledge used correctly on unfamiliar material?</p><p><strong className="text-[#172b3a]">Flexibility:</strong> do you respond to prompts, alternatives and counterexamples?</p><p><strong className="text-[#172b3a]">Precision:</strong> do you answer the exact task clearly without hiding behind length?</p></CardContent></Card>
        </aside>
      </div>
    </div>
  </main>
}

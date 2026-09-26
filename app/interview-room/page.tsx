"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { ArrowLeft, ArrowRight, Brain, Check, Clock3, GraduationCap, Lightbulb, Mic, MicOff, RotateCcw, Sparkles, Target, WandSparkles } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import { interviewQuestions, tracks, type TrackId } from "@/lib/oxbridge-data"
import { generatedInterviewQuestion, pathwayDetails } from "@/lib/oxbridge-expanded"
import { publishedForTrack } from "@/lib/published-interviews"
import { confidenceCalibration, interviewerPersonas, mutationPrompts, warmUps, type InterviewMode, type InterviewPersonaKey } from "@/lib/coach-suite"
import { interviewProfileFor } from "@/lib/prep-suite"
import { localInterviewFollowUp, type InterviewAnswerClassification } from "@/lib/interview-answer-quality"

type Turn = { role: "interviewer" | "candidate"; text: string; quality?: InterviewAnswerClassification }
type Result = { total: number; reasoning: number; subject: number; flexibility: number; clarity: number; error: string; strengths: string[]; next: string[] }
type Phase = "lobby" | "live" | "review"
type AiReply = { reply?: string; classification?: InterviewAnswerClassification; provider?: "gemini" | "local"; degraded?: boolean }

type SavedProgress = {
  sessions?: number
  interviewScores?: number[]
  logs?: Array<{ id: string; title: string; score: number; date: string; events: string[]; dimensions?: { reasoning: number; subject: number; flexibility: number; clarity: number } }>
  misconceptions?: Record<string, number>
  confidenceLogs?: Array<{ score: number; confidence: number; note: string; date: string }>
  [key: string]: unknown
}

const profileKey = "oxbridge-tutor-profile-v2"
const progressKey = "oxbridge-tutor-progress-v2"

function formatTime(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`
}

function qualityLabel(quality?: InterviewAnswerClassification) {
  if (quality === "incorrect") return "Incorrect claim challenged"
  if (quality === "irrelevant") return "Redirected to the question"
  if (quality === "vague") return "Specificity requested"
  if (quality === "partial") return "Missing step probed"
  return quality === "responsive" ? "Responsive" : ""
}

function scoreResponse(text: string, concepts: string[]): Result {
  const clean = text.toLowerCase().trim()
  const words = clean ? clean.split(/\s+/).length : 0
  const reasoningHits = ["because", "therefore", "if", "then", "since", "implies", "hence"].filter(x => clean.includes(x)).length
  const flexibilityHits = ["however", "alternative", "assumption", "counter", "depends", "unless", "could"].filter(x => clean.includes(x)).length
  const conceptHits = concepts.filter(x => clean.includes(x.toLowerCase())).length
  const reasoning = Math.min(25, 7 + reasoningHits * 4 + (words > 70 ? 4 : 0))
  const subject = Math.min(25, 6 + Math.round((conceptHits / Math.max(1, concepts.length)) * 19))
  const flexibility = Math.min(25, 6 + flexibilityHits * 4 + (/example|case|limit/i.test(clean) ? 3 : 0))
  const clarity = Math.min(25, words >= 55 && words <= 300 ? 22 : words >= 30 ? 17 : words >= 15 ? 11 : 5)
  const total = reasoning + subject + flexibility + clarity
  const strengths: string[] = []
  const next: string[] = []
  if (reasoning >= 18) strengths.push("Your reasoning was visible rather than hidden behind the conclusion.")
  else next.push("Make the chain explicit: observation → principle → test → provisional conclusion.")
  if (subject >= 17) strengths.push("You used relevant subject ideas rather than relying on generic language.")
  else next.push(`Use the relevant ideas more deliberately: ${concepts.slice(0, 3).join(", ")}.`)
  if (flexibility >= 17) strengths.push("You responded flexibly to uncertainty, assumptions or alternatives.")
  else next.push("Test one assumption or counterexample before committing to the conclusion.")
  if (clarity >= 18) strengths.push("The answer stayed developed and focused.")
  else next.push("Slow the structure down and make each inferential step do one job.")
  const error = words < 20 ? "Under-developed reasoning" : conceptHits === 0 ? "Knowledge connection" : reasoningHits < 2 ? "Logical chain" : flexibilityHits === 0 ? "Unexamined assumption" : "No dominant error"
  return { total, reasoning, subject, flexibility, clarity, error, strengths, next }
}

export default function InterviewRoomPage() {
  const [phase, setPhase] = useState<Phase>("lobby")
  const [track, setTrack] = useState<TrackId>("physical")
  const [course, setCourse] = useState("Physics")
  const [difficulty, setDifficulty] = useState("Stretch")
  const [personaKey, setPersonaKey] = useState<InterviewPersonaKey>("Socratic")
  const [mode, setMode] = useState<InterviewMode>("Realistic")
  const [source, setSource] = useState<"Original" | "Published">("Original")
  const [seed, setSeed] = useState(1)
  const [answer, setAnswer] = useState("")
  const [turns, setTurns] = useState<Turn[]>([])
  const [question, setQuestion] = useState("")
  const [result, setResult] = useState<Result | null>(null)
  const [confidence, setConfidence] = useState(3)
  const [seconds, setSeconds] = useState(12 * 60)
  const [running, setRunning] = useState(false)
  const [listening, setListening] = useState(false)
  const [thinking, setThinking] = useState(false)
  const [hint, setHint] = useState("")
  const [showScratch, setShowScratch] = useState(false)
  const [scratch, setScratch] = useState("")
  const [sessionStartedAt, setSessionStartedAt] = useState<number | null>(null)
  const recognitionRef = useRef<{ stop: () => void } | null>(null)

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(profileKey) || "{}") as { track?: TrackId; course?: string }
      if (saved.track) setTrack(saved.track)
      if (saved.course) setCourse(saved.course)
    } catch { /* keep defaults */ }
  }, [])

  useEffect(() => {
    if (!running || seconds <= 0) return
    const id = window.setInterval(() => setSeconds(s => Math.max(0, s - 1)), 1000)
    return () => window.clearInterval(id)
  }, [running, seconds])

  const original = useMemo(() => interviewQuestions.filter(q => q.track === track), [track])
  const published = useMemo(() => publishedForTrack(track), [track])
  const profile = interviewProfileFor(course, track)
  const persona = interviewerPersonas[personaKey]
  const generated = generatedInterviewQuestion(track, difficulty, pathwayDetails[track].skills[seed % pathwayDetails[track].skills.length], seed)
  const base = original[seed % Math.max(1, original.length)]
  const publishedItem = published[seed % Math.max(1, published.length)]
  const concepts = base?.concepts ?? pathwayDetails[track].topics
  const warmup = warmUps[track][seed % warmUps[track].length]

  const resetSession = (newSeed = seed + 1) => {
    setSeed(newSeed)
    setPhase("lobby")
    setAnswer("")
    setTurns([])
    setQuestion("")
    setResult(null)
    setHint("")
    setScratch("")
    setSeconds(12 * 60)
    setRunning(false)
    setListening(false)
    setThinking(false)
    setSessionStartedAt(null)
  }

  const openingQuestion = () => {
    if (source === "Published" && publishedItem) return publishedItem.prompt
    return base?.prompt ?? generated.prompt
  }

  const startInterview = () => {
    const first = openingQuestion()
    setQuestion(first)
    setTurns([{ role: "interviewer", text: persona.opening }, { role: "interviewer", text: first }])
    setPhase("live")
    setSeconds(mode === "Stress" ? 7 * 60 : 12 * 60)
    setRunning(true)
    setSessionStartedAt(Date.now())
  }

  const speak = (text: string) => {
    if (!("speechSynthesis" in window)) return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = "en-GB"
    utterance.rate = .96
    window.speechSynthesis.speak(utterance)
  }

  const startVoice = () => {
    type Rec = { continuous: boolean; interimResults: boolean; onresult: (e: { results: ArrayLike<{ 0: { transcript: string } }> }) => void; onend: () => void; start: () => void; stop: () => void }
    const w = window as unknown as { SpeechRecognition?: new () => Rec; webkitSpeechRecognition?: new () => Rec }
    const SR = w.SpeechRecognition ?? w.webkitSpeechRecognition
    if (!SR) { setHint("Voice transcription is not supported in this browser. Typed practice still works."); return }
    const rec = new SR()
    rec.continuous = true
    rec.interimResults = false
    rec.onresult = e => {
      const text = Array.from(e.results).map(r => r[0].transcript).join(" ")
      setAnswer(a => `${a} ${text}`.trim())
    }
    rec.onend = () => setListening(false)
    recognitionRef.current = rec
    rec.start()
    setListening(true)
  }

  const stopVoice = () => {
    recognitionRef.current?.stop()
    setListening(false)
  }

  const chooseChallenge = (candidateText: string, turnNumber: number) => {
    const scored = scoreResponse([...turns.filter(t => t.role === "candidate").map(t => t.text), candidateText].join(" "), concepts)
    const lower = candidateText.toLowerCase()
    let challenge = ""
    if (candidateText.split(/\s+/).length < 30) challenge = "Can you make the reasoning more explicit rather than giving me only the conclusion?"
    else if (!/assum|suppos|if |given/i.test(lower)) challenge = "Which assumption is doing the most work in that argument?"
    else if (scored.flexibility < 17) challenge = "What is the strongest counterexample or alternative explanation to your current view?"
    else if (turnNumber >= 2) challenge = mutationPrompts[track][(seed + turnNumber) % mutationPrompts[track].length]
    else challenge = profile.challengeMoves[(seed + turnNumber) % profile.challengeMoves.length] ?? generated.probes[turnNumber % generated.probes.length]
    if (personaKey === "Technical") challenge = `Make the step precise. ${challenge}`
    if (personaKey === "Evidence-led") challenge = `What evidence would discriminate between the possibilities? ${challenge}`
    if (personaKey === "Sceptical") challenge = `I am not yet persuaded. ${challenge}`
    if (personaKey === "Terse") challenge = `Continue. ${challenge}`
    return challenge
  }

  const submitTurn = async () => {
    if (!answer.trim() || thinking) return
    const candidate = answer.trim()
    const candidateTurnCount = turns.filter(t => t.role === "candidate").length + 1
    const candidateTurn: Turn = { role: "candidate", text: candidate }
    const history = [...turns, candidateTurn]
    const referenceAnswer = source === "Original" ? base?.strongAnswer : undefined
    const stimulus = source === "Original" ? base?.stimulus : undefined
    stopVoice()
    setTurns(history)
    setAnswer("")
    setHint("")
    setThinking(true)

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
          concepts,
          turns: history,
          referenceAnswer,
          stimulus,
          delivery: "natural",
        }),
      })
      if (!response.ok) throw new Error("interview-turn")
      const data = await response.json() as AiReply
      const classification = data.classification ?? "partial"
      const challenge = data.reply?.trim() || chooseChallenge(candidate, candidateTurnCount)
      const classifiedHistory = history.map((turn, index) => index === history.length - 1 ? { ...turn, quality: classification } : turn)
      setTurns([...classifiedHistory, { role: "interviewer", text: challenge }])
      setQuestion(challenge)
      if (data.degraded && mode === "Tutor") setHint("Cloud evaluation was unavailable for that turn, so the built-in interviewer used its local answer-quality checks.")
      if (mode !== "Tutor") speak(challenge)
    } catch {
      const fallback = localInterviewFollowUp({ question, answer: candidate, concepts, referenceAnswer }, personaKey)
      const challenge = fallback.classification === "responsive" ? chooseChallenge(candidate, candidateTurnCount) : fallback.reply
      const classifiedHistory = history.map((turn, index) => index === history.length - 1 ? { ...turn, quality: fallback.classification } : turn)
      setTurns([...classifiedHistory, { role: "interviewer", text: challenge }])
      setQuestion(challenge)
      if (mode !== "Tutor") speak(challenge)
    } finally {
      setThinking(false)
    }
  }

  const finishInterview = () => {
    const allTurns = answer.trim() ? [...turns, { role: "candidate" as const, text: answer.trim() }] : turns
    const combined = allTurns.filter(t => t.role === "candidate").map(t => t.text).join(" ")
    if (!combined) return
    const scored = scoreResponse(combined, concepts)
    const calibration = confidenceCalibration(confidence, scored.total)
    setTurns([...allTurns, { role: "interviewer", text: persona.closing }])
    setResult(scored)
    setRunning(false)
    setPhase("review")
    try {
      const saved = JSON.parse(localStorage.getItem(progressKey) || "{}") as SavedProgress
      const logs = Array.isArray(saved.logs) ? saved.logs : []
      const interviewScores = Array.isArray(saved.interviewScores) ? saved.interviewScores : []
      const confidenceLogs = Array.isArray(saved.confidenceLogs) ? saved.confidenceLogs : []
      const misconceptions = saved.misconceptions && typeof saved.misconceptions === "object" ? saved.misconceptions : {}
      const qualityEvents = allTurns.filter(t => t.role === "candidate" && t.quality && t.quality !== "responsive").map(t => `Answer check: ${t.quality} — ${t.text}`)
      const events = [...allTurns.map(t => `${t.role === "interviewer" ? "Interviewer" : "Candidate"}: ${t.text}`), ...qualityEvents, `Confidence: ${confidence}/5`, `Calibration: ${calibration}`]
      const dominantTurnIssue = allTurns.some(t => t.quality === "incorrect") ? "Incorrect interview answer" : allTurns.some(t => t.quality === "irrelevant") ? "Off-topic interview answer" : allTurns.some(t => t.quality === "vague") ? "Vague interview answer" : allTurns.some(t => t.quality === "partial") ? "Incomplete interview answer" : null
      const misconceptionKey = dominantTurnIssue ?? (scored.error === "No dominant error" ? null : scored.error)
      const nextProgress: SavedProgress = {
        ...saved,
        sessions: Number(saved.sessions ?? 0) + 1,
        interviewScores: [...interviewScores, scored.total],
        confidenceLogs: [...confidenceLogs, { score: scored.total, confidence, note: calibration, date: new Date().toISOString() }].slice(-100),
        misconceptions: misconceptionKey ? { ...misconceptions, [misconceptionKey]: Number(misconceptions[misconceptionKey] ?? 0) + 1 } : misconceptions,
        logs: [{ id: `focus-${Date.now()}`, title: `Interview Room · ${course}`, score: scored.total, date: new Date().toLocaleDateString("en-GB"), events, dimensions: { reasoning: scored.reasoning, subject: scored.subject, flexibility: scored.flexibility, clarity: scored.clarity } }, ...logs].slice(0, 40),
      }
      localStorage.setItem(progressKey, JSON.stringify(nextProgress))
    } catch { /* session still works without persistence */ }
  }

  const elapsed = sessionStartedAt ? Math.max(0, Math.round((Date.now() - sessionStartedAt) / 1000)) : 0
  const candidateTurns = turns.filter(t => t.role === "candidate").length
  const progressValue = Math.min(100, candidateTurns * 22)

  if (phase === "lobby") return <main className="min-h-screen bg-[#f2f5f5] text-[#172b3a]">
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
      <div className="mb-8 flex items-center justify-between gap-3">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-[#46616d] hover:text-[#102a43]"><ArrowLeft className="size-4" />Back to preparation studio</Link>
        <Badge className="border-0 bg-[#102a43] text-white">Focused interview mode</Badge>
      </div>
      <section className="grid overflow-hidden rounded-[2rem] border border-[#d9e3e5] bg-white shadow-[0_28px_80px_rgba(16,42,67,.08)] lg:grid-cols-[1.15fr_.85fr]">
        <div className="p-6 sm:p-9 lg:p-12">
          <div className="mb-8 flex items-center gap-3"><span className="grid size-11 place-items-center rounded-2xl bg-[#102a43] text-[#8dd7de]"><GraduationCap className="size-5" /></span><div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#147d91]">Formal interview room</p><h1 className="font-serif text-3xl font-bold tracking-tight sm:text-4xl">{course}</h1></div></div>
          <p className="max-w-2xl text-base leading-7 text-[#657582]">A quieter interview environment designed to feel like an academic conversation rather than a dashboard. Feedback stays hidden until you finish unless you deliberately select Tutor mode.</p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <label className="space-y-1.5"><span className="text-xs font-bold uppercase tracking-wider text-[#657582]">Subject family</span><NativeSelect value={track} onChange={e => { const t = e.target.value as TrackId; setTrack(t); const found = tracks.find(x => x.id === t); if (found) setCourse(found.courses[0]) }} className="w-full bg-white">{tracks.map(t => <NativeSelectOption key={t.id} value={t.id}>{t.short}</NativeSelectOption>)}</NativeSelect></label>
            <label className="space-y-1.5"><span className="text-xs font-bold uppercase tracking-wider text-[#657582]">Course</span><NativeSelect value={course} onChange={e => setCourse(e.target.value)} className="w-full bg-white">{(tracks.find(t => t.id === track)?.courses ?? []).map(c => <NativeSelectOption key={c}>{c}</NativeSelectOption>)}</NativeSelect></label>
            <label className="space-y-1.5"><span className="text-xs font-bold uppercase tracking-wider text-[#657582]">Interviewer</span><NativeSelect value={personaKey} onChange={e => setPersonaKey(e.target.value as InterviewPersonaKey)} className="w-full bg-white">{Object.keys(interviewerPersonas).map(k => <NativeSelectOption key={k}>{k}</NativeSelectOption>)}</NativeSelect></label>
            <label className="space-y-1.5"><span className="text-xs font-bold uppercase tracking-wider text-[#657582]">Session style</span><NativeSelect value={mode} onChange={e => setMode(e.target.value as InterviewMode)} className="w-full bg-white">{["Tutor", "Realistic", "No-hint", "Stress"].map(x => <NativeSelectOption key={x}>{x}</NativeSelectOption>)}</NativeSelect></label>
            <label className="space-y-1.5"><span className="text-xs font-bold uppercase tracking-wider text-[#657582]">Difficulty</span><NativeSelect value={difficulty} onChange={e => setDifficulty(e.target.value)} className="w-full bg-white">{["Foundation", "Stretch", "Challenge"].map(x => <NativeSelectOption key={x}>{x}</NativeSelectOption>)}</NativeSelect></label>
            <label className="space-y-1.5"><span className="text-xs font-bold uppercase tracking-wider text-[#657582]">Question source</span><NativeSelect value={source} onChange={e => setSource(e.target.value as "Original" | "Published")} className="w-full bg-white"><NativeSelectOption>Original</NativeSelectOption><NativeSelectOption>Published</NativeSelectOption></NativeSelect></label>
          </div>
          <div className="mt-8 flex flex-wrap gap-3"><Button size="lg" onClick={startInterview} className="rounded-xl bg-[#102a43] px-6 hover:bg-[#173b59]">Enter interview <ArrowRight /></Button><Button size="lg" variant="outline" onClick={() => resetSession(seed + 1)} className="rounded-xl">Change question</Button></div>
        </div>
        <aside className="border-t bg-[#102a43] p-6 text-white sm:p-9 lg:border-l lg:border-t-0 lg:p-10">
          <p className="text-xs font-bold uppercase tracking-[.18em] text-[#8dd7de]">Before you enter</p>
          <h2 className="mt-3 font-serif text-2xl font-bold">Think aloud, not perfectly.</h2>
          <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4"><p className="text-xs font-bold uppercase tracking-wider text-white/50">Warm-up</p><p className="mt-2 font-serif text-lg leading-7 text-white/90">{warmup}</p></div>
          <div className="mt-6 space-y-4 text-sm leading-6 text-white/65"><p><strong className="text-white">Expect challenge.</strong> The interviewer may question an assumption, change a condition or ask you to justify a step.</p><p><strong className="text-white">Silence is neutral.</strong> Do not wait for constant confirmation before continuing your reasoning.</p><p><strong className="text-white">Revision is useful.</strong> Changing your view in response to evidence is treated as a reasoning strength.</p></div>
        </aside>
      </section>
    </div>
  </main>

  if (phase === "review" && result) {
    const calibration = confidenceCalibration(confidence, result.total)
    const dimensions = [["Reasoning", result.reasoning], ["Subject use", result.subject], ["Flexibility", result.flexibility], ["Communication", result.clarity]] as const
    return <main className="min-h-screen bg-[#f2f5f5] text-[#172b3a]"><div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
      <div className="mb-8 flex items-center justify-between"><Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-[#46616d]"><ArrowLeft className="size-4" />Preparation studio</Link><Badge variant="outline">Interview complete</Badge></div>
      <div className="grid gap-5 xl:grid-cols-[.8fr_1.2fr]">
        <Card className="border-0 bg-[#102a43] text-white shadow-none"><CardHeader><p className="text-xs font-bold uppercase tracking-[.18em] text-[#8dd7de]">Practice skills profile</p><div className="flex items-end gap-2"><CardTitle className="font-serif text-6xl">{result.total}</CardTitle><span className="pb-2 text-white/45">/100</span></div><CardDescription className="text-white/55">A practice signal, not an admissions prediction.</CardDescription></CardHeader><CardContent className="space-y-4">{dimensions.map(([label, value]) => <div key={label}><div className="mb-1 flex justify-between text-xs"><span>{label}</span><span>{value}/25</span></div><Progress value={value * 4} className="bg-white/15 [&_[data-slot=progress-indicator]]:bg-[#8dd7de]" /></div>)}<div className="rounded-2xl bg-white/8 p-4 text-sm leading-6 text-white/75"><strong className="text-white">Confidence calibration</strong><p className="mt-1">{calibration}</p></div><Button className="w-full bg-white text-[#102a43] hover:bg-[#edf7f8]" onClick={() => resetSession(seed + 1)}>Start another interview <RotateCcw /></Button></CardContent></Card>
        <div className="space-y-5"><Card><CardHeader><CardTitle className="font-serif text-2xl">Academic feedback</CardTitle><CardDescription>Focus on the reasoning behaviour you can repeat, not memorising a model answer.</CardDescription></CardHeader><CardContent className="grid gap-4 md:grid-cols-2"><div className="rounded-2xl bg-emerald-50 p-4"><p className="text-sm font-bold text-emerald-900">What worked</p><div className="mt-3 space-y-2">{result.strengths.length ? result.strengths.map(x => <p key={x} className="flex gap-2 text-sm leading-6 text-emerald-900"><Check className="mt-1 size-4 shrink-0" />{x}</p>) : <p className="text-sm text-emerald-900">You completed the full reasoning cycle and stayed with the problem.</p>}</div></div><div className="rounded-2xl bg-amber-50 p-4"><p className="text-sm font-bold text-amber-950">Next interview target</p><div className="mt-3 space-y-2">{result.next.slice(0, 3).map(x => <p key={x} className="flex gap-2 text-sm leading-6 text-amber-950"><Target className="mt-1 size-4 shrink-0" />{x}</p>)}</div></div></CardContent></Card>
          <Card><CardHeader><div className="flex items-center justify-between"><div><CardTitle className="font-serif text-2xl">Transcript</CardTitle><CardDescription>{candidateTurns} candidate turns · {Math.round(elapsed / 60)} minutes</CardDescription></div><Badge variant="outline">{persona.label}</Badge></div></CardHeader><CardContent className="space-y-4">{turns.map((turn, i) => <div key={i} className={`rounded-2xl p-4 ${turn.role === "interviewer" ? "bg-[#edf7f8]" : "ml-0 border bg-white sm:ml-10"}`}><div className="mb-1 flex flex-wrap items-center justify-between gap-2"><p className="text-[11px] font-bold uppercase tracking-[.14em] text-[#657582]">{turn.role}</p>{turn.role === "candidate" && turn.quality && turn.quality !== "responsive" && <Badge variant="outline" className="text-[10px]">{qualityLabel(turn.quality)}</Badge>}</div><p className="text-sm leading-6">{turn.text}</p></div>)}</CardContent></Card>
        </div>
      </div>
    </div></main>
  }

  return <main className="min-h-screen bg-[#eef2f3] text-[#172b3a]">
    <div className="mx-auto flex min-h-screen max-w-[1500px] flex-col">
      <header className="sticky top-0 z-20 border-b border-[#d9e3e5] bg-white/95 px-4 py-3 backdrop-blur sm:px-6"><div className="flex items-center justify-between gap-4"><div className="flex min-w-0 items-center gap-3"><span className="hidden size-9 place-items-center rounded-xl bg-[#102a43] text-[#8dd7de] sm:grid"><Brain className="size-4" /></span><div className="min-w-0"><p className="truncate text-xs font-bold uppercase tracking-[.14em] text-[#147d91]">Formal interview · {course}</p><p className="truncate text-sm font-semibold text-[#657582]">{persona.label} · {mode}</p></div></div><div className="flex items-center gap-2"><div className="rounded-full border bg-white px-3 py-1.5 text-sm font-bold tabular-nums"><Clock3 className="mr-1 inline size-4 text-[#147d91]" />{formatTime(seconds)}</div><Button variant="outline" size="sm" onClick={() => setRunning(r => !r)}>{running ? "Pause" : "Resume"}</Button><Button variant="ghost" size="sm" onClick={() => resetSession(seed)}>Exit</Button></div></div><Progress value={progressValue} className="mt-3 h-1.5" /></header>
      <div className="grid flex-1 gap-0 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="flex min-h-[calc(100vh-84px)] flex-col bg-white p-4 sm:p-7 lg:p-10">
          <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col">
            <div className="mb-7 flex flex-wrap gap-2"><Badge>{source === "Published" ? "Published example" : "Original practice"}</Badge><Badge variant="outline">{difficulty}</Badge><Badge variant="outline">Turn {candidateTurns + 1}</Badge></div>
            <div className="flex flex-1 flex-col justify-center py-4 sm:py-8"><p className="text-xs font-bold uppercase tracking-[.18em] text-[#657582]">Interviewer</p><h1 className="mt-4 font-serif text-3xl font-bold leading-tight tracking-tight sm:text-4xl lg:text-[2.7rem]">{question}</h1>{turns.length > 2 && <details className="mt-6 rounded-2xl border bg-[#f8fafb] p-4"><summary className="cursor-pointer text-sm font-semibold text-[#46616d]">Review conversation so far</summary><div className="mt-4 space-y-3">{turns.slice(1, -1).map((t, i) => <div key={i}><p className="text-[11px] font-bold uppercase tracking-wider text-[#657582]">{t.role}</p><p className="mt-1 text-sm leading-6">{t.text}</p></div>)}</div></details>}
              {hint && <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4"><p className="text-xs font-bold uppercase tracking-wider text-amber-800">Tutor scaffold</p><p className="mt-1 text-sm leading-6 text-amber-950">{hint}</p></div>}
            </div>
            <div className="border-t pt-5"><div className="mb-3 flex flex-wrap items-center justify-between gap-3"><label className="text-sm font-semibold">Your response</label><span className="text-xs text-[#657582]">{answer.trim() ? answer.trim().split(/\s+/).length : 0} words</span></div><Textarea value={answer} onChange={e => setAnswer(e.target.value)} rows={7} disabled={thinking} className="min-h-44 resize-y rounded-2xl border-[#cddadd] bg-[#fbfcfc] text-base leading-7 focus:bg-white" placeholder="Think aloud. State what you notice, what you are assuming, and why each step follows…" /><div className="mt-4 flex flex-wrap items-center justify-between gap-3"><div className="flex flex-wrap gap-2"><Button variant={listening ? "default" : "outline"} onClick={listening ? stopVoice : startVoice} disabled={thinking}>{listening ? <MicOff /> : <Mic />}{listening ? "Stop" : "Voice"}</Button><Button variant="outline" onClick={() => speak(question)} disabled={thinking}>Hear question</Button>{mode === "Tutor" && <Button variant="outline" onClick={() => setHint(`Start by identifying what the question is asking, then name the simplest useful case or assumption you could test.`)} disabled={thinking}><Lightbulb />Scaffold</Button>}<Button variant="outline" disabled={thinking} onClick={() => { const m = mutationPrompts[track][(seed + candidateTurns) % mutationPrompts[track].length]; setQuestion(m); setTurns(t => [...t, { role: "interviewer", text: m }]); setHint("") }}><WandSparkles />Change condition</Button></div><div className="flex gap-2"><Button variant="outline" onClick={() => void submitTurn()} disabled={!answer.trim() || thinking}>{thinking ? "Checking response…" : "Continue discussion"}{!thinking && <ArrowRight />}</Button><Button onClick={finishInterview} disabled={thinking || (!answer.trim() && candidateTurns === 0)} className="bg-[#102a43] hover:bg-[#173b59]">Conclude</Button></div></div></div>
          </div>
        </section>
        <aside className="border-t border-[#d9e3e5] bg-[#f7f9f9] p-4 sm:p-6 xl:border-l xl:border-t-0">
          <div className="sticky top-24 space-y-4"><Card className="shadow-none"><CardHeader><CardTitle className="font-serif text-xl">Interview settings</CardTitle><CardDescription>These stay secondary while the academic problem remains central.</CardDescription></CardHeader><CardContent className="space-y-4"><label className="space-y-1.5"><span className="text-xs font-bold uppercase tracking-wider text-[#657582]">Confidence before feedback</span><NativeSelect value={String(confidence)} onChange={e => setConfidence(Number(e.target.value))} className="w-full bg-white">{[1,2,3,4,5].map(x => <NativeSelectOption key={x} value={String(x)}>{x} / 5</NativeSelectOption>)}</NativeSelect></label><div className="rounded-xl bg-[#edf7f8] p-3 text-sm leading-6 text-[#46616d]"><strong className="text-[#102a43]">Course emphasis</strong><p className="mt-1">{profile.emphasis.slice(0,4).join(" · ")}</p></div><Button variant="outline" className="w-full" onClick={() => setShowScratch(v => !v)}>{showScratch ? "Hide scratchpad" : "Open scratchpad"}</Button>{showScratch && <Textarea value={scratch} onChange={e => setScratch(e.target.value)} rows={8} placeholder="Private notes, equations or structure…" />}</CardContent></Card><Card className="shadow-none"><CardHeader><CardTitle className="font-serif text-xl">Interview discipline</CardTitle></CardHeader><CardContent className="space-y-3 text-sm leading-6 text-[#657582]"><p>Answer the question in front of you rather than delivering prepared material.</p><p>Do not treat a challenge as a signal that the previous answer was wrong.</p><p>When new evidence matters, say explicitly what part of your view changes.</p></CardContent></Card></div>
        </aside>
      </div>
    </div>
  </main>
}

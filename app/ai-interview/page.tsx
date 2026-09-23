"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { ArrowLeft, ArrowRight, Brain, CheckCircle2, Clock3, GraduationCap, Lightbulb, Loader2, Mic, MicOff, RefreshCw, ShieldCheck, Sparkles } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import { interviewQuestions, tracks, type TrackId } from "@/lib/oxbridge-data"
import { generatedInterviewQuestion, pathwayDetails } from "@/lib/oxbridge-expanded"
import { interviewerPersonas, type InterviewMode, type InterviewPersonaKey } from "@/lib/coach-suite"
import { interviewProfileFor } from "@/lib/prep-suite"

type Turn = { role: "interviewer" | "candidate"; text: string }
type Phase = "lobby" | "live" | "review"
type AiReply = { reply: string; provider: "openai" | "local"; configured?: boolean; degraded?: boolean }
type Result = { total: number; reasoning: number; subject: number; flexibility: number; clarity: number; error: string; strengths: string[]; next: string[] }

type SavedProgress = {
  sessions?: number
  interviewScores?: number[]
  logs?: Array<{ id: string; title: string; score: number; date: string; events: string[]; dimensions?: { reasoning: number; subject: number; flexibility: number; clarity: number } }>
  misconceptions?: Record<string, number>
  [key: string]: unknown
}

const profileKey = "oxbridge-tutor-profile-v2"
const progressKey = "oxbridge-tutor-progress-v2"

function scoreResponse(text: string, concepts: string[]): Result {
  const clean = text.toLowerCase().trim()
  const words = clean ? clean.split(/\s+/).length : 0
  const reasoningHits = ["because", "therefore", "if", "then", "since", "implies", "hence"].filter(x => clean.includes(x)).length
  const flexibilityHits = ["however", "alternative", "assumption", "counter", "depends", "unless", "could"].filter(x => clean.includes(x)).length
  const conceptHits = concepts.filter(x => clean.includes(x.toLowerCase())).length
  const reasoning = Math.min(25, 7 + reasoningHits * 4 + (words > 70 ? 4 : 0))
  const subject = Math.min(25, 6 + Math.round((conceptHits / Math.max(1, concepts.length)) * 19))
  const flexibility = Math.min(25, 6 + flexibilityHits * 4 + (/example|case|limit/i.test(clean) ? 3 : 0))
  const clarity = Math.min(25, words >= 55 && words <= 320 ? 22 : words >= 30 ? 17 : words >= 15 ? 11 : 5)
  const total = reasoning + subject + flexibility + clarity
  const strengths: string[] = []
  const next: string[] = []
  if (reasoning >= 18) strengths.push("Reasoning was visible rather than hidden behind the conclusion.")
  else next.push("Make the chain explicit: observation → principle → test → provisional conclusion.")
  if (subject >= 17) strengths.push("Relevant subject ideas were used deliberately.")
  else next.push(`Connect the reasoning more clearly to ${concepts.slice(0, 3).join(", ")}.`)
  if (flexibility >= 17) strengths.push("You tested assumptions or alternatives rather than defending the first idea automatically.")
  else next.push("Test one assumption, limiting case or counterexample before settling on the conclusion.")
  if (clarity >= 18) strengths.push("The explanation stayed developed and focused.")
  else next.push("Slow the structure down so each inferential step does one clear job.")
  const error = words < 20 ? "Under-developed reasoning" : conceptHits === 0 ? "Knowledge connection" : reasoningHits < 2 ? "Logical chain" : flexibilityHits === 0 ? "Unexamined assumption" : "No dominant error"
  return { total, reasoning, subject, flexibility, clarity, error, strengths, next }
}

function formatTime(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`
}

export default function AiInterviewPage() {
  const [phase, setPhase] = useState<Phase>("lobby")
  const [track, setTrack] = useState<TrackId>("physical")
  const [course, setCourse] = useState("Physics")
  const [difficulty, setDifficulty] = useState("Stretch")
  const [personaKey, setPersonaKey] = useState<InterviewPersonaKey>("Socratic")
  const [mode, setMode] = useState<InterviewMode>("Realistic")
  const [seed, setSeed] = useState(1)
  const [turns, setTurns] = useState<Turn[]>([])
  const [question, setQuestion] = useState("")
  const [answer, setAnswer] = useState("")
  const [seconds, setSeconds] = useState(15 * 60)
  const [running, setRunning] = useState(false)
  const [thinking, setThinking] = useState(false)
  const [provider, setProvider] = useState<"openai" | "local" | null>(null)
  const [configured, setConfigured] = useState<boolean | null>(null)
  const [result, setResult] = useState<Result | null>(null)
  const [listening, setListening] = useState(false)
  const [notice, setNotice] = useState("")
  const recognitionRef = useRef<{ stop: () => void } | null>(null)

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(profileKey) || "{}") as { track?: TrackId; course?: string }
      if (saved.track) setTrack(saved.track)
      if (saved.course) setCourse(saved.course)
    } catch { /* defaults */ }
  }, [])

  useEffect(() => {
    if (!running || seconds <= 0) return
    const id = window.setInterval(() => setSeconds(s => Math.max(0, s - 1)), 1000)
    return () => window.clearInterval(id)
  }, [running, seconds])

  const original = useMemo(() => interviewQuestions.filter(q => q.track === track), [track])
  const persona = interviewerPersonas[personaKey]
  const profile = interviewProfileFor(course, track)
  const skill = pathwayDetails[track].skills[seed % pathwayDetails[track].skills.length]
  const generated = generatedInterviewQuestion(track, difficulty, skill, seed)
  const base = original[seed % Math.max(1, original.length)]
  const concepts = base?.concepts ?? pathwayDetails[track].topics
  const opening = base?.prompt ?? generated.prompt
  const candidateTurns = turns.filter(t => t.role === "candidate").length
  const progressValue = Math.min(100, candidateTurns * 20)

  const speak = (text: string) => {
    if (!("speechSynthesis" in window)) return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = "en-GB"
    utterance.rate = .95
    window.speechSynthesis.speak(utterance)
  }

  const startVoice = () => {
    type Rec = { continuous: boolean; interimResults: boolean; onresult: (e: { results: ArrayLike<{ 0: { transcript: string } }> }) => void; onend: () => void; start: () => void; stop: () => void }
    const w = window as unknown as { SpeechRecognition?: new () => Rec; webkitSpeechRecognition?: new () => Rec }
    const SR = w.SpeechRecognition ?? w.webkitSpeechRecognition
    if (!SR) { setNotice("Voice transcription is not supported in this browser. Typed practice remains available."); return }
    const rec = new SR()
    rec.continuous = true
    rec.interimResults = false
    rec.onresult = e => setAnswer(a => `${a} ${Array.from(e.results).map(r => r[0].transcript).join(" ")}`.trim())
    rec.onend = () => setListening(false)
    recognitionRef.current = rec
    rec.start()
    setListening(true)
  }

  const stopVoice = () => {
    recognitionRef.current?.stop()
    setListening(false)
  }

  const startInterview = () => {
    const firstTurns: Turn[] = [
      { role: "interviewer", text: persona.opening },
      { role: "interviewer", text: opening },
    ]
    setTurns(firstTurns)
    setQuestion(opening)
    setSeconds(mode === "Stress" ? 8 * 60 : 15 * 60)
    setRunning(true)
    setPhase("live")
    setProvider(null)
    setConfigured(null)
    setResult(null)
    setNotice("")
    speak(persona.opening)
  }

  const getAiFollowUp = async (candidate: string) => {
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
        turns,
      }),
    })
    if (!response.ok) throw new Error("Interview service unavailable")
    return response.json() as Promise<AiReply>
  }

  const submitTurn = async () => {
    const candidate = answer.trim()
    if (!candidate || thinking) return
    setThinking(true)
    setNotice("")
    const withCandidate = [...turns, { role: "candidate" as const, text: candidate }]
    setTurns(withCandidate)
    setAnswer("")
    try {
      const data = await getAiFollowUp(candidate)
      const nextQuestion = data.reply.trim()
      setTurns(t => [...t, { role: "interviewer", text: nextQuestion }])
      setQuestion(nextQuestion)
      setProvider(data.provider)
      setConfigured(data.configured ?? null)
      if (data.degraded) setNotice("The cloud interviewer was temporarily unavailable, so this turn used the built-in academic challenge engine.")
      speak(nextQuestion)
    } catch {
      const fallback = "Which assumption in your answer is least secure, and how would your conclusion change if that assumption failed?"
      setTurns(t => [...t, { role: "interviewer", text: fallback }])
      setQuestion(fallback)
      setProvider("local")
      setNotice("The interview service could not be reached, so the session continued with the built-in academic challenge engine.")
    } finally {
      setThinking(false)
    }
  }

  const finish = () => {
    const finalTurns = answer.trim() ? [...turns, { role: "candidate" as const, text: answer.trim() }] : turns
    const combined = finalTurns.filter(t => t.role === "candidate").map(t => t.text).join(" ")
    if (!combined) return
    const scored = scoreResponse(combined, concepts)
    setTurns([...finalTurns, { role: "interviewer", text: persona.closing }])
    setResult(scored)
    setRunning(false)
    setPhase("review")
    speak(persona.closing)

    try {
      const saved = JSON.parse(localStorage.getItem(progressKey) || "{}") as SavedProgress
      const logs = Array.isArray(saved.logs) ? saved.logs : []
      const scores = Array.isArray(saved.interviewScores) ? saved.interviewScores : []
      const misconceptions = saved.misconceptions && typeof saved.misconceptions === "object" ? saved.misconceptions : {}
      const events = [...finalTurns.map(t => `${t.role === "interviewer" ? "Interviewer" : "Candidate"}: ${t.text}`), `Engine: ${provider ?? "local"}`]
      localStorage.setItem(progressKey, JSON.stringify({
        ...saved,
        sessions: Number(saved.sessions ?? 0) + 1,
        interviewScores: [...scores, scored.total],
        misconceptions: scored.error === "No dominant error" ? misconceptions : { ...misconceptions, [scored.error]: Number(misconceptions[scored.error] ?? 0) + 1 },
        logs: [{ id: `ai-${Date.now()}`, title: `AI Interview · ${course}`, score: scored.total, date: new Date().toLocaleDateString("en-GB"), events, dimensions: { reasoning: scored.reasoning, subject: scored.subject, flexibility: scored.flexibility, clarity: scored.clarity } }, ...logs].slice(0, 40),
      }))
    } catch { /* session still completes */ }
  }

  const reset = () => {
    setSeed(s => s + 1)
    setPhase("lobby")
    setTurns([])
    setQuestion("")
    setAnswer("")
    setSeconds(15 * 60)
    setRunning(false)
    setThinking(false)
    setProvider(null)
    setConfigured(null)
    setResult(null)
    setNotice("")
  }

  if (phase === "lobby") return <main className="min-h-screen bg-[#f3f6f6] text-[#172b3a]">
    <div className="mx-auto max-w-6xl px-4 py-7 sm:px-6 lg:px-8 lg:py-11">
      <div className="mb-7 flex items-center justify-between gap-3">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-[#526a75]"><ArrowLeft className="size-4" />Preparation Studio</Link>
        <Badge className="border-0 bg-[#102a43] text-white"><Sparkles className="mr-1 size-3" />AI interviewer</Badge>
      </div>
      <section className="grid overflow-hidden rounded-[2rem] border border-[#dbe5e7] bg-white shadow-[0_30px_90px_rgba(16,42,67,.09)] lg:grid-cols-[1.1fr_.9fr]">
        <div className="p-6 sm:p-9 lg:p-12">
          <div className="mb-7 flex items-center gap-3"><span className="grid size-12 place-items-center rounded-2xl bg-[#102a43] text-[#8dd7de]"><Brain className="size-5" /></span><div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#147d91]">AI academic interview</p><h1 className="font-serif text-3xl font-bold sm:text-4xl">{course}</h1></div></div>
          <p className="max-w-2xl text-base leading-7 text-[#667984]">The interviewer reads the conversation and generates the next academic challenge from what you actually said. It is instructed to probe reasoning without revealing the solution or giving a model answer mid-interview.</p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <label className="space-y-1.5"><span className="text-xs font-bold uppercase tracking-wider text-[#667984]">Subject family</span><NativeSelect value={track} onChange={e => { const next=e.target.value as TrackId; setTrack(next); const found=tracks.find(t=>t.id===next); if(found) setCourse(found.courses[0]) }}>{tracks.map(t => <NativeSelectOption key={t.id} value={t.id}>{t.short}</NativeSelectOption>)}</NativeSelect></label>
            <label className="space-y-1.5"><span className="text-xs font-bold uppercase tracking-wider text-[#667984]">Course</span><NativeSelect value={course} onChange={e => setCourse(e.target.value)}>{(tracks.find(t=>t.id===track)?.courses ?? [course]).map(c => <NativeSelectOption key={c}>{c}</NativeSelectOption>)}</NativeSelect></label>
            <label className="space-y-1.5"><span className="text-xs font-bold uppercase tracking-wider text-[#667984]">Interviewer</span><NativeSelect value={personaKey} onChange={e => setPersonaKey(e.target.value as InterviewPersonaKey)}>{Object.keys(interviewerPersonas).map(p => <NativeSelectOption key={p}>{p}</NativeSelectOption>)}</NativeSelect></label>
            <label className="space-y-1.5"><span className="text-xs font-bold uppercase tracking-wider text-[#667984]">Mode</span><NativeSelect value={mode} onChange={e => setMode(e.target.value as InterviewMode)}>{["Tutor","Realistic","No-hint","Stress"].map(m => <NativeSelectOption key={m}>{m}</NativeSelectOption>)}</NativeSelect></label>
            <label className="space-y-1.5"><span className="text-xs font-bold uppercase tracking-wider text-[#667984]">Difficulty</span><NativeSelect value={difficulty} onChange={e => setDifficulty(e.target.value)}>{["Foundation","Stretch","Challenge"].map(d => <NativeSelectOption key={d}>{d}</NativeSelectOption>)}</NativeSelect></label>
          </div>
          <Button className="mt-7 h-12 rounded-xl px-6" onClick={startInterview}>Enter AI interview <ArrowRight /></Button>
        </div>
        <aside className="border-t bg-[#102a43] p-6 text-white sm:p-9 lg:border-l lg:border-t-0 lg:p-10">
          <Badge className="border-white/15 bg-white/10 text-white">{persona.label}</Badge>
          <h2 className="mt-5 font-serif text-2xl font-bold">What changes in AI mode?</h2>
          <div className="mt-6 space-y-4 text-sm leading-6 text-blue-50/75">
            <p><strong className="text-white">Conversation memory.</strong> The next question can refer to earlier claims and revisions.</p>
            <p><strong className="text-white">Adaptive direction.</strong> The interview can switch from evidence to assumptions, definitions, counterexamples or transfer.</p>
            <p><strong className="text-white">Safe fallback.</strong> If the cloud model is not configured or temporarily fails, the local challenge engine continues the interview.</p>
            <p><strong className="text-white">No client secret.</strong> API credentials are read only on the server and are never placed in browser code.</p>
          </div>
          <div className="mt-7 rounded-2xl bg-white/8 p-4 text-sm"><p className="font-semibold text-white">Course emphasis</p><div className="mt-3 flex flex-wrap gap-2">{profile.emphasis.map(x => <Badge key={x} className="border-white/15 bg-white/10 text-white">{x}</Badge>)}</div></div>
        </aside>
      </section>
    </div>
  </main>

  if (phase === "review" && result) return <main className="min-h-screen bg-[#f3f6f6] text-[#172b3a]">
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 lg:py-11">
      <div className="mb-7 flex flex-wrap items-center justify-between gap-3"><Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-[#526a75]"><ArrowLeft className="size-4" />Preparation Studio</Link><Button variant="outline" onClick={reset}><RefreshCw />New interview</Button></div>
      <section className="grid gap-5 lg:grid-cols-[.8fr_1.2fr]">
        <Card className="border-0 bg-[#102a43] text-white shadow-none"><CardHeader><p className="text-xs font-bold uppercase tracking-[.17em] text-blue-200/70">Practice skills profile</p><CardTitle className="font-serif text-6xl">{result.total}<span className="text-xl text-white/45">/100</span></CardTitle><CardDescription className="text-blue-50/65">This is a practice signal, not an admissions prediction.</CardDescription></CardHeader><CardContent className="space-y-4">{[["Reasoning",result.reasoning],["Subject use",result.subject],["Flexibility",result.flexibility],["Communication",result.clarity]].map(([label,value]) => <div key={String(label)}><div className="mb-1 flex justify-between text-xs"><span>{label}</span><span>{value}/25</span></div><Progress value={Number(value)*4} className="bg-white/15" /></div>)}<div className="rounded-xl bg-white/8 p-3"><p className="font-semibold">Next priority · {result.error}</p>{result.next.slice(0,2).map(x => <p className="mt-2 text-sm leading-5 text-white/75" key={x}>→ {x}</p>)}</div></CardContent></Card>
        <div className="space-y-5"><Card><CardHeader><div className="flex flex-wrap items-center gap-2"><CardTitle className="font-serif text-2xl">Interview transcript</CardTitle>{provider && <Badge variant="outline">Last engine: {provider === "openai" ? "AI" : "Local fallback"}</Badge>}</div><CardDescription>Review where your reasoning changed after challenge rather than looking for a memorised ideal answer.</CardDescription></CardHeader><CardContent className="max-h-[620px] space-y-3 overflow-y-auto">{turns.map((turn,i) => <div key={i} className={`rounded-2xl p-4 ${turn.role === "interviewer" ? "mr-8 bg-[#edf7f8]" : "ml-8 border bg-white"}`}><p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-[#147d91]">{turn.role}</p><p className="text-sm leading-6">{turn.text}</p></div>)}</CardContent></Card><div className="grid gap-3 sm:grid-cols-2">{result.strengths.map(x => <div key={x} className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6"><CheckCircle2 className="mb-2 size-5 text-emerald-700" />{x}</div>)}</div></div>
      </section>
    </div>
  </main>

  return <main className="min-h-screen bg-[#eef3f3] text-[#172b3a]">
    <div className="sticky top-0 z-30 border-b border-[#dbe5e7] bg-white/95 backdrop-blur"><div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8"><div className="flex min-w-0 items-center gap-3"><span className="grid size-9 flex-none place-items-center rounded-xl bg-[#102a43] text-[#8dd7de]"><GraduationCap className="size-4" /></span><div className="min-w-0"><p className="truncate text-sm font-bold">AI Interview · {course}</p><p className="truncate text-xs text-[#71828a]">{persona.label} · {difficulty}</p></div></div><div className="flex items-center gap-2"><Badge variant="outline" className="hidden sm:inline-flex">Turn {candidateTurns + 1}</Badge><span className="inline-flex items-center gap-1.5 rounded-full border bg-white px-3 py-1.5 text-sm font-bold tabular-nums"><Clock3 className="size-4 text-[#147d91]" />{formatTime(seconds)}</span></div></div><Progress value={progressValue} className="h-1 rounded-none" /></div>
    <div className="mx-auto grid max-w-7xl gap-5 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:px-8 lg:py-8">
      <Card className="overflow-hidden border-[#d7e2e4] shadow-[0_16px_50px_rgba(16,42,67,.06)]"><CardHeader className="border-b bg-white p-5 sm:p-7"><div className="flex flex-wrap items-center gap-2"><Badge>{mode}</Badge><Badge variant="outline">{difficulty}</Badge>{provider && <Badge variant="outline">{provider === "openai" ? "AI follow-up" : "Local fallback"}</Badge>}</div><p className="mt-5 text-xs font-bold uppercase tracking-[.16em] text-[#147d91]">Interviewer</p><CardTitle className="mt-2 max-w-4xl font-serif text-2xl leading-snug sm:text-3xl">{question}</CardTitle></CardHeader><CardContent className="space-y-5 p-5 sm:p-7">
        {turns.length > 2 && <details className="rounded-xl border bg-[#f8fafb] p-4"><summary className="cursor-pointer text-sm font-semibold">Recent conversation</summary><div className="mt-3 space-y-2">{turns.slice(-6,-1).map((turn,i) => <p className="text-sm leading-6 text-[#60737d]" key={i}><strong>{turn.role === "interviewer" ? "Interviewer:" : "You:"}</strong> {turn.text}</p>)}</div></details>}
        {notice && <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm leading-5 text-amber-900">{notice}</div>}
        <label className="block"><span className="mb-2 block text-sm font-semibold">Your reasoning</span><Textarea value={answer} onChange={e => setAnswer(e.target.value)} rows={12} className="min-h-64 resize-y text-base leading-7" placeholder="Think aloud: what do you notice, what are you assuming, what principle are you using, and what would make you revise the argument?" /></label>
        <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex flex-wrap gap-2"><Button variant={listening ? "default" : "outline"} onClick={listening ? stopVoice : startVoice}>{listening ? <MicOff /> : <Mic />}{listening ? "Stop voice" : "Answer by voice"}</Button><Button variant="outline" onClick={() => speak(question)}>Hear question</Button></div><div className="flex flex-wrap gap-2"><Button variant="outline" onClick={submitTurn} disabled={!answer.trim() || thinking}>{thinking ? <Loader2 className="animate-spin" /> : <Sparkles />}{thinking ? "Interviewer thinking…" : "Submit reasoning"}</Button><Button onClick={finish} disabled={(!answer.trim() && candidateTurns === 0) || thinking}>Conclude interview</Button></div></div>
      </CardContent></Card>
      <aside className="space-y-4"><Card className="shadow-none"><CardHeader><CardTitle className="font-serif text-xl">Live interview</CardTitle><CardDescription>The interface intentionally hides scoring until you finish.</CardDescription></CardHeader><CardContent className="space-y-3"><div className="flex items-center justify-between text-sm"><span>Candidate turns</span><strong>{candidateTurns}</strong></div><div className="flex items-center justify-between text-sm"><span>Interviewer</span><strong>{personaKey}</strong></div><div className="flex items-center justify-between text-sm"><span>Engine</span><strong>{provider === "openai" ? "Server AI" : provider === "local" ? "Local fallback" : "Checking on first turn"}</strong></div>{configured === false && <div className="rounded-xl bg-[#edf7f8] p-3 text-xs leading-5 text-[#49636e]"><ShieldCheck className="mb-1 size-4 text-[#147d91]" />No server API key is configured yet, so the built-in challenge engine is being used automatically.</div>}</CardContent></Card><Card className="shadow-none"><CardHeader><CardTitle className="font-serif text-xl">What the interviewer is probing</CardTitle></CardHeader><CardContent className="flex flex-wrap gap-2">{profile.emphasis.slice(0,6).map(x => <Badge key={x} variant="outline">{x}</Badge>)}</CardContent></Card>{mode === "Tutor" && <Card className="border-amber-200 bg-amber-50 shadow-none"><CardHeader><div className="flex items-center gap-2"><Lightbulb className="size-5 text-amber-700" /><CardTitle className="font-serif text-lg">Tutor mode</CardTitle></div></CardHeader><CardContent className="text-sm leading-6 text-amber-900">Use this mode while learning the subject. For realistic practice, switch to Realistic or No-hint before the session.</CardContent></Card>}</aside>
    </div>
  </main>
}

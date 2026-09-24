"use client"

import Link from "next/link"
import { useEffect, useMemo, useRef, useState } from "react"
import { ArrowLeft, ArrowRight, Camera, CheckCircle2, Headphones, Loader2, Mic, MicOff, RefreshCw, Sparkles, Users, Video, Volume2, VolumeX } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import { VideoInterviewMonitor, type VideoInterviewMetrics } from "@/components/video-interview-monitor"
import { interviewQuestions, tracks, type TrackId } from "@/lib/oxbridge-data"
import { generatedInterviewQuestion, pathwayDetails } from "@/lib/oxbridge-expanded"
import { interviewerPersonas, type InterviewMode, type InterviewPersonaKey } from "@/lib/coach-suite"

type PanelTurn = { role: "interviewer" | "candidate"; text: string; speaker: string; confidence?: number }
type Phase = "lobby" | "live" | "review"
type AiReply = { reply: string; provider: "gemini" | "local"; configured?: boolean; degraded?: boolean }
type Result = { total: number; reasoning: number; subject: number; flexibility: number; clarity: number; error: string; strengths: string[]; next: string[] }
type Reflection = { changed: string; missed: string; next: string }
type VoiceName = "Gacrux" | "Kore" | "Sulafat" | "Sadaltager" | "Iapetus" | "Schedar" | "Achird" | "Algieba" | "Rasalgethi" | "Aoede" | "Orus" | "Charon"
type Delivery = "natural" | "formal" | "warm" | "challenging"
type WrittenContext = { title?: string; course?: string; analysis?: { openingQuestion?: string; defenceQuestions?: string[] } }

const profileKey = "oxbridge-tutor-profile-v2"
const progressKey = "oxbridge-tutor-progress-v2"
const writtenContextKey = "oxbridge-panel-written-work-v1"
const EMPTY_VIDEO: VideoInterviewMetrics = { samples: 0, faceVisible: 0, cameraFacing: 0, framing: 0, expressionVariation: 0, headSteadiness: 0 }

const voiceChoices: Array<{ id: VoiceName; label: string; tone: string }> = [
  { id: "Gacrux", label: "Gacrux", tone: "Mature & thoughtful" },
  { id: "Kore", label: "Kore", tone: "Firm & precise" },
  { id: "Sulafat", label: "Sulafat", tone: "Warm & conversational" },
  { id: "Sadaltager", label: "Sadaltager", tone: "Knowledgeable & measured" },
  { id: "Iapetus", label: "Iapetus", tone: "Clear & composed" },
  { id: "Schedar", label: "Schedar", tone: "Even & understated" },
  { id: "Achird", label: "Achird", tone: "Friendly & serious" },
  { id: "Algieba", label: "Algieba", tone: "Smooth & calm" },
  { id: "Rasalgethi", label: "Rasalgethi", tone: "Informative & assured" },
  { id: "Aoede", label: "Aoede", tone: "Light & conversational" },
  { id: "Orus", label: "Orus", tone: "Direct & firm" },
  { id: "Charon", label: "Charon", tone: "Grounded & analytical" },
]

function scoreResponse(text: string, concepts: string[]): Result {
  const clean = text.toLowerCase().trim(), words = clean ? clean.split(/\s+/).length : 0
  const reasoningHits = ["because", "therefore", "if", "then", "since", "implies", "hence"].filter(x => clean.includes(x)).length
  const flexibilityHits = ["however", "alternative", "assumption", "counter", "depends", "unless", "could", "change"].filter(x => clean.includes(x)).length
  const conceptHits = concepts.filter(x => clean.includes(x.toLowerCase())).length
  const reasoning = Math.min(25, 7 + reasoningHits * 4 + (words > 75 ? 4 : 0))
  const subject = Math.min(25, 6 + Math.round((conceptHits / Math.max(1, concepts.length)) * 19))
  const flexibility = Math.min(25, 6 + flexibilityHits * 4 + (/example|case|limit/i.test(clean) ? 3 : 0))
  const clarity = Math.min(25, words >= 60 && words <= 360 ? 22 : words >= 32 ? 17 : words >= 15 ? 11 : 5)
  const total = reasoning + subject + flexibility + clarity, strengths: string[] = [], next: string[] = []
  if (reasoning >= 18) strengths.push("You made the reasoning chain visible."); else next.push("Make each inference explicit before moving to the next claim.")
  if (subject >= 17) strengths.push("You connected subject knowledge to the problem rather than reciting it."); else next.push(`Connect your reasoning more directly to ${concepts.slice(0, 3).join(", ")}.`)
  if (flexibility >= 17) strengths.push("You adapted when the second interviewer changed the pressure on the argument."); else next.push("Treat a challenge as a cue to test, refine or replace an assumption.")
  if (clarity >= 18) strengths.push("Your explanation stayed structured while thinking aloud."); else next.push("State the claim you are defending before adding the next layer of detail.")
  const error = words < 25 ? "Under-developed reasoning" : conceptHits === 0 ? "Knowledge connection" : reasoningHits < 2 ? "Logical chain" : flexibilityHits === 0 ? "Panel flexibility" : "No dominant error"
  return { total, reasoning, subject, flexibility, clarity, error, strengths, next }
}

export default function PanelInterviewPage() {
  const [phase, setPhase] = useState<Phase>("lobby")
  const [track, setTrack] = useState<TrackId>("physical")
  const [course, setCourse] = useState("Physics")
  const [difficulty, setDifficulty] = useState("Stretch")
  const [mode, setMode] = useState<InterviewMode>("Realistic")
  const [personaA, setPersonaA] = useState<InterviewPersonaKey>("Socratic")
  const [personaB, setPersonaB] = useState<InterviewPersonaKey>("Technical")
  const [voiceA, setVoiceA] = useState<VoiceName>("Gacrux")
  const [voiceB, setVoiceB] = useState<VoiceName>("Kore")
  const [delivery, setDelivery] = useState<Delivery>("natural")
  const [practiceMode, setPracticeMode] = useState<"voice" | "video">("voice")
  const [autoListen, setAutoListen] = useState(true)
  const [seed, setSeed] = useState(2)
  const [turns, setTurns] = useState<PanelTurn[]>([])
  const [question, setQuestion] = useState("")
  const [activeSpeaker, setActiveSpeaker] = useState<"A" | "B">("A")
  const [answer, setAnswer] = useState("")
  const [thinking, setThinking] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const [provider, setProvider] = useState<"gemini" | "local" | null>(null)
  const [notice, setNotice] = useState("")
  const [result, setResult] = useState<Result | null>(null)
  const [listening, setListening] = useState(false)
  const [muted, setMuted] = useState(false)
  const [voiceProvider, setVoiceProvider] = useState<"gemini" | "browser" | null>(null)
  const [confidence, setConfidence] = useState(3)
  const [reflection, setReflection] = useState<Reflection>({ changed: "", missed: "", next: "" })
  const [writtenContext, setWrittenContext] = useState<WrittenContext | null>(null)
  const [videoMetrics, setVideoMetrics] = useState<VideoInterviewMetrics>(EMPTY_VIDEO)
  const recognitionRef = useRef<{ stop: () => void } | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(profileKey) || "{}") as { track?: TrackId; course?: string }
      if (saved.track) setTrack(saved.track)
      if (saved.course) setCourse(saved.course)
      const wc = JSON.parse(localStorage.getItem(writtenContextKey) || "null") as WrittenContext | null
      if (wc) { setWrittenContext(wc); if (wc.course) setCourse(wc.course) }
    } catch { /* ignore malformed local state */ }
  }, [])

  const original = useMemo(() => interviewQuestions.filter(q => q.track === track), [track])
  const skill = pathwayDetails[track].skills[seed % pathwayDetails[track].skills.length]
  const generated = generatedInterviewQuestion(track, difficulty, skill, seed)
  const base = original[seed % Math.max(1, original.length)]
  const concepts = base?.concepts ?? pathwayDetails[track].topics
  const opening = writtenContext?.analysis?.openingQuestion || base?.prompt || generated.prompt
  const courses = tracks.find(t => t.id === track)?.courses ?? [course]
  const interviewerA = interviewerPersonas[personaA], interviewerB = interviewerPersonas[personaB]
  const candidateTurns = turns.filter(t => t.role === "candidate").length

  function stopVoice() { recognitionRef.current?.stop(); setListening(false) }

  function startVoice() {
    if (listening || speaking || phase !== "live") return
    type Rec = { continuous: boolean; interimResults: boolean; lang: string; onresult: (e: { results: ArrayLike<{ 0: { transcript: string } }> }) => void; onend: () => void; onerror?: () => void; start: () => void; stop: () => void }
    const w = window as unknown as { SpeechRecognition?: new () => Rec; webkitSpeechRecognition?: new () => Rec }
    const SR = w.SpeechRecognition ?? w.webkitSpeechRecognition
    if (!SR) { setNotice("Voice transcription is not supported in this browser. You can still type your answer."); return }
    const rec = new SR()
    rec.continuous = true
    rec.interimResults = false
    rec.lang = "en-GB"
    rec.onresult = e => setAnswer(a => `${a} ${Array.from(e.results).map(r => r[0].transcript).join(" ")}`.trim())
    rec.onend = () => setListening(false)
    rec.onerror = () => setListening(false)
    recognitionRef.current = rec
    try { rec.start(); setListening(true) } catch { setListening(false) }
  }

  function afterSpeech(allowAutoListen = true) {
    setSpeaking(false)
    if (allowAutoListen && autoListen && phase === "live") window.setTimeout(() => startVoice(), 350)
  }

  async function speak(text: string, speaker: "A" | "B", allowAutoListen = true) {
    if (muted) { afterSpeech(false); return }
    stopVoice()
    audioRef.current?.pause()
    window.speechSynthesis?.cancel()
    setSpeaking(true)
    const voice = speaker === "A" ? voiceA : voiceB
    try {
      const response = await fetch("/api/natural-speech", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text, voice, delivery, interviewer: speaker }) })
      if (!response.ok) throw new Error("tts")
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const audio = new Audio(url)
      audioRef.current = audio
      audio.onended = () => { URL.revokeObjectURL(url); afterSpeech(allowAutoListen) }
      audio.onerror = () => { URL.revokeObjectURL(url); afterSpeech(false) }
      await audio.play()
      setVoiceProvider("gemini")
      return
    } catch { /* browser voice fallback below */ }
    if ("speechSynthesis" in window) {
      const u = new SpeechSynthesisUtterance(text)
      u.lang = "en-GB"
      u.rate = delivery === "challenging" ? 1 : delivery === "warm" ? 0.92 : speaker === "A" ? 0.96 : 0.94
      u.pitch = speaker === "A" ? 0.98 : 1.04
      const voices = window.speechSynthesis.getVoices().filter(v => v.lang.toLowerCase().startsWith("en"))
      if (voices.length) u.voice = voices[speaker === "A" ? 0 : Math.min(1, voices.length - 1)]
      u.onend = () => afterSpeech(allowAutoListen)
      u.onerror = () => afterSpeech(false)
      window.speechSynthesis.speak(u)
      setVoiceProvider("browser")
    } else afterSpeech(false)
  }

  function startPanel() {
    stopVoice()
    const intro = writtenContext
      ? `Good morning. We've read your written work, “${writtenContext.title || "your submitted piece"}”. We'll begin there, but we may move beyond it.`
      : interviewerA.opening
    const openingTurns: PanelTurn[] = [{ role: "interviewer", speaker: "Interviewer A", text: intro }, { role: "interviewer", speaker: "Interviewer A", text: opening }]
    setTurns(openingTurns); setQuestion(opening); setActiveSpeaker("A"); setAnswer(""); setResult(null); setNotice(""); setVideoMetrics(EMPTY_VIDEO); setPhase("live")
    window.setTimeout(() => void speak(`${intro} ${opening}`, "A"), 100)
  }

  async function submitTurn() {
    const candidate = answer.trim()
    if (!candidate || thinking) return
    stopVoice()
    const nextSpeaker: "A" | "B" = activeSpeaker === "A" ? "B" : "A"
    const nextPersona = nextSpeaker === "A" ? personaA : personaB
    const nextRole = nextSpeaker === "A" ? "Lead interviewer" : "Second interviewer / challenger"
    const other = nextSpeaker === "A" ? `Interviewer B (${interviewerB.label})` : `Interviewer A (${interviewerA.label})`
    const candidateTurn: PanelTurn = { role: "candidate", speaker: "Candidate", text: candidate, confidence }
    const history = [...turns, candidateTurn]
    setTurns(history); setAnswer(""); setThinking(true); setNotice("")
    try {
      const response = await fetch("/api/interview-turn", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ course, track, difficulty, mode, persona: nextPersona, question, answer: candidate, concepts, turns: history, panelMode: true, interviewerRole: `${nextRole} (${nextSpeaker})`, otherInterviewer: other, delivery }) })
      if (!response.ok) throw new Error("panel")
      const data = await response.json() as AiReply
      const nextQuestion = data.reply.replace(/^([^:]{1,40}:\s*)/, "").trim()
      const label = nextSpeaker === "A" ? "Interviewer A" : "Interviewer B"
      setTurns(t => [...t, { role: "interviewer", speaker: label, text: nextQuestion }])
      setQuestion(nextQuestion); setActiveSpeaker(nextSpeaker); setProvider(data.provider)
      if (data.degraded) setNotice("The cloud interviewer was temporarily unavailable, so this turn used the built-in challenge engine.")
      void speak(nextQuestion, nextSpeaker)
    } catch {
      const fallback = nextSpeaker === "B" ? "Okay. Let's test that from another angle. Which assumption in your answer is most vulnerable?" : "Right. Go back to your original claim. Does it still survive the challenge you've just been given?"
      const label = nextSpeaker === "A" ? "Interviewer A" : "Interviewer B"
      setTurns(t => [...t, { role: "interviewer", speaker: label, text: fallback }]); setQuestion(fallback); setActiveSpeaker(nextSpeaker); setProvider("local"); setNotice("The cloud panel could not be reached, so built-in panel logic continued the interview."); void speak(fallback, nextSpeaker)
    } finally { setThinking(false) }
  }

  function finish() {
    stopVoice(); audioRef.current?.pause(); window.speechSynthesis?.cancel(); setSpeaking(false)
    const finalTurns = answer.trim() ? [...turns, { role: "candidate" as const, speaker: "Candidate", text: answer.trim(), confidence }] : turns
    const combined = finalTurns.filter(t => t.role === "candidate").map(t => t.text).join(" ")
    if (!combined) return
    const scored = scoreResponse(combined, concepts)
    setTurns([...finalTurns, { role: "interviewer", speaker: "Panel", text: "Thank you. We'll finish the interview there." }]); setResult(scored); setPhase("review")
    try {
      const saved = JSON.parse(localStorage.getItem(progressKey) || "{}") as Record<string, unknown>
      const logs = Array.isArray(saved.logs) ? saved.logs as Array<Record<string, unknown>> : []
      const scores = Array.isArray(saved.interviewScores) ? saved.interviewScores as number[] : []
      const confidenceLogs = Array.isArray(saved.confidenceLogs) ? saved.confidenceLogs as unknown[] : []
      const avgConfidence = finalTurns.filter(t => t.role === "candidate" && t.confidence).reduce((sum, t) => sum + Number(t.confidence ?? 0), 0) / Math.max(1, finalTurns.filter(t => t.role === "candidate" && t.confidence).length)
      localStorage.setItem(progressKey, JSON.stringify({ ...saved, sessions: Number(saved.sessions ?? 0) + 1, interviewScores: [...scores, scored.total], confidenceLogs: [...confidenceLogs, { score: scored.total, confidence: avgConfidence, date: new Date().toISOString(), source: "panel" }].slice(-100), logs: [{ id: `panel-${Date.now()}`, title: `Two-Interviewer ${practiceMode === "video" ? "Video " : ""}Panel · ${course}`, score: scored.total, date: new Date().toISOString(), events: finalTurns.map(t => `${t.speaker}: ${t.text}`), dimensions: { reasoning: scored.reasoning, subject: scored.subject, flexibility: scored.flexibility, clarity: scored.clarity }, panel: true, voices: { A: voiceA, B: voiceB, delivery }, video: practiceMode === "video" ? videoMetrics : null }, ...logs].slice(0, 40) }))
    } catch { /* local progress remains optional */ }
  }

  function saveReflection() {
    if (!result) return
    try {
      const saved = JSON.parse(localStorage.getItem(progressKey) || "{}") as Record<string, unknown>
      const items = Array.isArray(saved.postInterviewReflections) ? saved.postInterviewReflections as unknown[] : []
      localStorage.setItem(progressKey, JSON.stringify({ ...saved, postInterviewReflections: [{ ...reflection, course, score: result.total, date: new Date().toISOString(), type: "panel", video: practiceMode === "video" ? videoMetrics : null }, ...items].slice(0, 50) }))
      setNotice("Reflection saved to your preparation evidence.")
    } catch { setNotice("Reflection could not be saved in this browser.") }
  }

  function reset() {
    stopVoice(); audioRef.current?.pause(); window.speechSynthesis?.cancel(); setSeed(s => s + 1); setPhase("lobby"); setTurns([]); setQuestion(""); setAnswer(""); setResult(null); setProvider(null); setNotice(""); setActiveSpeaker("A"); setReflection({ changed: "", missed: "", next: "" }); setVideoMetrics(EMPTY_VIDEO); setWrittenContext(null); localStorage.removeItem(writtenContextKey)
  }

  if (phase === "lobby") return <main className="min-h-screen bg-[#f3f6f6] text-[#172b3a]">
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-11">
      <div className="mb-7 flex items-center justify-between"><Link href="/interviews" className="inline-flex items-center gap-2 text-sm font-semibold text-[#526a75]"><ArrowLeft className="size-4"/>Interview Hub</Link><Badge className="bg-[#102a43] text-white"><Users className="size-3.5"/>Two-person interview studio</Badge></div>
      <section className="grid gap-7 rounded-[2rem] border bg-white p-6 shadow-[0_30px_90px_rgba(16,42,67,.09)] xl:grid-cols-[1.05fr_.95fr] lg:p-10">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.18em] text-[#147d91]">Natural panel conversation</p>
          <h1 className="mt-2 font-serif text-4xl font-bold sm:text-5xl">Two interviewers that sound and respond more like real academics.</h1>
          <p className="mt-4 max-w-2xl leading-7 text-[#667984]">Choose two distinct voices and a delivery style. The panel now uses shorter, less scripted follow-ups, natural conversational reactions and automatic microphone hand-off after each interviewer finishes speaking.</p>
          {writtenContext && <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4"><strong>Written-work defence loaded</strong><p className="mt-1 text-sm">{writtenContext.title || "Your written work"}</p></div>}
          <div className="mt-7 grid gap-4 sm:grid-cols-2">
            <Field label="Subject family"><NativeSelect value={track} onChange={e => { const t = e.target.value as TrackId; setTrack(t); const found = tracks.find(x => x.id === t); if (found) setCourse(found.courses[0]) }}>{tracks.map(t => <NativeSelectOption key={t.id} value={t.id}>{t.short}</NativeSelectOption>)}</NativeSelect></Field>
            <Field label="Course"><NativeSelect value={course} onChange={e => setCourse(e.target.value)}>{courses.map(c => <NativeSelectOption key={c} value={c}>{c}</NativeSelectOption>)}</NativeSelect></Field>
            <Field label="Difficulty"><NativeSelect value={difficulty} onChange={e => setDifficulty(e.target.value)}><NativeSelectOption value="Standard">Standard</NativeSelectOption><NativeSelectOption value="Stretch">Stretch</NativeSelectOption><NativeSelectOption value="Oxbridge">Oxbridge</NativeSelectOption></NativeSelect></Field>
            <Field label="Interview mode"><NativeSelect value={mode} onChange={e => setMode(e.target.value as InterviewMode)}>{(["Tutor", "Realistic", "No-hint", "Stress"] as InterviewMode[]).map(item => <NativeSelectOption key={item} value={item}>{item}</NativeSelectOption>)}</NativeSelect></Field>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <button type="button" onClick={() => setPracticeMode("voice")} className={`rounded-2xl border p-4 text-left ${practiceMode === "voice" ? "border-[#147d91] bg-[#edf7f8]" : "bg-white"}`}><Headphones className="mb-2 size-5"/><strong>Voice interview</strong><p className="mt-1 text-xs text-slate-500">Natural two-person audio panel.</p></button>
            <button type="button" onClick={() => setPracticeMode("video")} className={`rounded-2xl border p-4 text-left ${practiceMode === "video" ? "border-[#147d91] bg-[#edf7f8]" : "bg-white"}`}><Video className="mb-2 size-5"/><strong>Video interview</strong><p className="mt-1 text-xs text-slate-500">Adds local camera-facing, framing and expression-movement coaching.</p></button>
          </div>
          <label className="mt-4 flex items-center gap-2 rounded-xl border bg-slate-50 p-3 text-sm"><input type="checkbox" checked={autoListen} onChange={e => setAutoListen(e.target.checked)}/><span><strong>Automatic microphone hand-off</strong> — start listening shortly after each interviewer finishes.</span></label>
          <Button className="mt-6 h-12 px-6" onClick={startPanel}><Sparkles/>Start {practiceMode === "video" ? "video" : "voice"} panel <ArrowRight/></Button>
        </div>
        <div className="space-y-4">
          <Card className="shadow-none"><CardHeader><CardTitle className="font-serif text-2xl">Interviewer A</CardTitle><CardDescription>Lead academic · {interviewerA.label}</CardDescription></CardHeader><CardContent className="space-y-3"><NativeSelect value={personaA} onChange={e => setPersonaA(e.target.value as InterviewPersonaKey)}>{Object.entries(interviewerPersonas).map(([key, value]) => <NativeSelectOption key={key} value={key}>{value.label}</NativeSelectOption>)}</NativeSelect><VoicePicker value={voiceA} onChange={setVoiceA}/><Button type="button" size="sm" variant="outline" onClick={() => void speak("Good morning. Let's begin with the way you're thinking about the problem.", "A", false)}><Volume2/>Preview voice</Button></CardContent></Card>
          <Card className="shadow-none"><CardHeader><CardTitle className="font-serif text-2xl">Interviewer B</CardTitle><CardDescription>Second academic · {interviewerB.label}</CardDescription></CardHeader><CardContent className="space-y-3"><NativeSelect value={personaB} onChange={e => setPersonaB(e.target.value as InterviewPersonaKey)}>{Object.entries(interviewerPersonas).map(([key, value]) => <NativeSelectOption key={key} value={key}>{value.label}</NativeSelectOption>)}</NativeSelect><VoicePicker value={voiceB} onChange={setVoiceB}/><Button type="button" size="sm" variant="outline" onClick={() => void speak("Okay. I want to challenge one part of that argument from a different angle.", "B", false)}><Volume2/>Preview voice</Button></CardContent></Card>
          <Card className="border-[#b9d8dd] bg-[#edf7f8] shadow-none"><CardHeader><CardTitle className="font-serif text-xl">Voice delivery</CardTitle></CardHeader><CardContent><NativeSelect value={delivery} onChange={e => setDelivery(e.target.value as Delivery)}><NativeSelectOption value="natural">Natural conversation</NativeSelectOption><NativeSelectOption value="formal">Formal tutorial</NativeSelectOption><NativeSelectOption value="warm">Warm academic</NativeSelectOption><NativeSelectOption value="challenging">Challenging panel</NativeSelectOption></NativeSelect><p className="mt-2 text-xs text-slate-500">For the clearest panel effect, choose different voices for A and B.</p></CardContent></Card>
        </div>
      </section>
    </div>
  </main>

  if (phase === "review" && result) return <main className="min-h-screen bg-[#f3f6f6] text-[#172b3a]">
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6">
      <div className="flex items-center justify-between"><Button variant="ghost" onClick={reset}><RefreshCw/>New interview</Button><Badge variant="outline">Panel review</Badge></div>
      <section className="grid gap-4 md:grid-cols-5"><Score title="Overall" value={result.total}/><Score title="Reasoning" value={result.reasoning * 4}/><Score title="Subject" value={result.subject * 4}/><Score title="Flexibility" value={result.flexibility * 4}/><Score title="Clarity" value={result.clarity * 4}/></section>
      {practiceMode === "video" && videoMetrics.samples > 0 && <Card className="shadow-none"><CardHeader><CardTitle className="font-serif text-2xl">Video presentation signals</CardTitle><CardDescription>These are observable presentation cues only. They do not infer emotion, personality or interview outcome.</CardDescription></CardHeader><CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5"><MiniMetric label="Face visible" value={videoMetrics.faceVisible}/><MiniMetric label="Camera-facing" value={videoMetrics.cameraFacing}/><MiniMetric label="Framing" value={videoMetrics.framing}/><MiniMetric label="Expression variation" value={videoMetrics.expressionVariation}/><MiniMetric label="Head steadiness" value={videoMetrics.headSteadiness}/></CardContent></Card>}
      <section className="grid gap-5 lg:grid-cols-2"><Card className="shadow-none"><CardHeader><CardTitle className="font-serif text-2xl">What worked</CardTitle></CardHeader><CardContent className="space-y-2">{result.strengths.map(item => <p key={item} className="flex gap-2 text-sm"><CheckCircle2 className="mt-0.5 size-4 text-emerald-600"/>{item}</p>)}</CardContent></Card><Card className="shadow-none"><CardHeader><CardTitle className="font-serif text-2xl">Next pressure points</CardTitle></CardHeader><CardContent className="space-y-2">{result.next.map(item => <p key={item} className="text-sm leading-6">• {item}</p>)}</CardContent></Card></section>
      <Card className="shadow-none"><CardHeader><CardTitle className="font-serif text-2xl">Post-interview reflection</CardTitle><CardDescription>Use this to turn the interview into evidence for the next practice session.</CardDescription></CardHeader><CardContent className="grid gap-3 md:grid-cols-3"><Textarea value={reflection.changed} onChange={e => setReflection(r => ({ ...r, changed: e.target.value }))} placeholder="Where did your thinking change?"/><Textarea value={reflection.missed} onChange={e => setReflection(r => ({ ...r, missed: e.target.value }))} placeholder="What did you initially miss?"/><Textarea value={reflection.next} onChange={e => setReflection(r => ({ ...r, next: e.target.value }))} placeholder="What will you do differently next time?"/><div className="md:col-span-3"><Button onClick={saveReflection}>Save reflection</Button></div></CardContent></Card>
      {notice && <p className="rounded-xl border bg-white p-3 text-sm">{notice}</p>}
    </div>
  </main>

  return <main className="min-h-screen bg-[#eef2f2] text-[#172b3a]">
    <header className="border-b bg-white"><div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3"><Button asChild variant="ghost"><Link href="/interviews"><ArrowLeft/>Interview Hub</Link></Button><div className="flex items-center gap-2"><Badge variant="outline">{course}</Badge><Badge>{activeSpeaker === "A" ? `A · ${voiceA}` : `B · ${voiceB}`}</Badge><Button size="icon" variant="ghost" onClick={() => setMuted(v => !v)}>{muted ? <VolumeX/> : <Volume2/>}</Button></div></div></header>
    <div className="mx-auto grid max-w-7xl gap-5 px-4 py-6 xl:grid-cols-[1fr_380px]">
      <div className="space-y-4">
        <Card className="overflow-hidden shadow-none"><CardHeader className={activeSpeaker === "A" ? "bg-[#102a43] text-white" : "bg-[#174f5c] text-white"}><div className="flex items-start justify-between gap-3"><div><p className="text-xs uppercase tracking-[.18em] text-white/60">{activeSpeaker === "A" ? "Lead interviewer" : "Second interviewer"}</p><CardTitle className="mt-1 font-serif text-2xl">Interviewer {activeSpeaker}</CardTitle><CardDescription className="text-white/65">{activeSpeaker === "A" ? interviewerA.label : interviewerB.label} · {activeSpeaker === "A" ? voiceA : voiceB}</CardDescription></div><div className="flex gap-2">{speaking && <Badge className="bg-white/15 text-white">Speaking…</Badge>}{voiceProvider && <Badge className="bg-white/15 text-white">{voiceProvider === "gemini" ? "Gemini natural voice" : "Browser fallback"}</Badge>}</div></div></CardHeader><CardContent className="p-6"><p className="font-serif text-xl leading-8">{question}</p></CardContent></Card>
        {notice && <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">{notice}</div>}
        <Card className="shadow-none"><CardHeader><CardTitle className="font-serif text-2xl">Your response</CardTitle><CardDescription>Think aloud. You can type, dictate, or combine both.</CardDescription></CardHeader><CardContent className="space-y-4"><Textarea rows={7} value={answer} onChange={e => setAnswer(e.target.value)} placeholder="Explain what you notice, what you are assuming, and why each step follows…"/><div><div className="mb-1 flex justify-between text-xs"><span>How confident are you?</span><strong>{confidence}/5</strong></div><input className="w-full" type="range" min={1} max={5} value={confidence} onChange={e => setConfidence(Number(e.target.value))}/></div><div className="flex flex-wrap gap-2"><Button variant={listening ? "default" : "outline"} onClick={listening ? stopVoice : startVoice} disabled={speaking}>{listening ? <MicOff/> : <Mic/>}{listening ? "Stop listening" : "Speak answer"}</Button><Button onClick={() => void submitTurn()} disabled={!answer.trim() || thinking}>{thinking ? <Loader2 className="animate-spin"/> : <ArrowRight/>}{thinking ? "Interviewer thinking…" : "Send answer"}</Button><Button variant="outline" onClick={finish} disabled={candidateTurns === 0 && !answer.trim()}>Finish interview</Button></div></CardContent></Card>
        <Card className="shadow-none"><CardHeader><CardTitle className="font-serif text-xl">Conversation</CardTitle></CardHeader><CardContent className="max-h-[420px] space-y-3 overflow-y-auto">{turns.map((turn, i) => <div key={`${turn.speaker}-${i}`} className={`rounded-2xl p-3 text-sm leading-6 ${turn.role === "candidate" ? "ml-8 bg-[#edf7f8]" : "mr-8 border bg-white"}`}><div className="mb-1 flex items-center gap-2"><strong>{turn.speaker}</strong>{turn.confidence && <Badge variant="outline">confidence {turn.confidence}/5</Badge>}</div>{turn.text}</div>)}</CardContent></Card>
      </div>
      <aside className="space-y-4">
        {practiceMode === "video" ? <VideoInterviewMonitor active={phase === "live"} onMetrics={setVideoMetrics}/> : <Card className="shadow-none"><CardHeader><Headphones className="size-5 text-[#147d91]"/><CardTitle className="font-serif text-2xl">Voice-only panel</CardTitle><CardDescription>Use headphones if possible so speech transcription does not pick up the interviewers.</CardDescription></CardHeader><CardContent className="space-y-3 text-sm"><p><strong>Interviewer A:</strong> {voiceA}</p><p><strong>Interviewer B:</strong> {voiceB}</p><p><strong>Delivery:</strong> {delivery}</p><p><strong>Automatic hand-off:</strong> {autoListen ? "On" : "Off"}</p></CardContent></Card>}
        <Card className="shadow-none"><CardHeader><CardTitle className="font-serif text-xl">Session status</CardTitle></CardHeader><CardContent className="space-y-3 text-sm"><div className="flex justify-between"><span>Candidate responses</span><strong>{candidateTurns}</strong></div><div className="flex justify-between"><span>Current interviewer</span><strong>{activeSpeaker}</strong></div><div className="flex justify-between"><span>Question engine</span><strong>{provider || "starting"}</strong></div><div className="flex justify-between"><span>Microphone</span><strong>{listening ? "listening" : speaking ? "waiting" : "ready"}</strong></div></CardContent></Card>
        {practiceMode === "video" && <Card className="border-[#b9d8dd] bg-[#edf7f8] shadow-none"><CardHeader><Camera className="size-5"/><CardTitle className="font-serif text-xl">What video mode measures</CardTitle></CardHeader><CardContent className="text-xs leading-5 text-slate-600">Camera-facing gaze proxy, whether your face remains visible, framing, head steadiness and variation in visible facial movement. It deliberately does not label emotions or infer confidence, honesty, personality or admissions potential.</CardContent></Card>}
      </aside>
    </div>
  </main>
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label><span className="mb-1 block text-xs font-bold uppercase tracking-wider">{label}</span>{children}</label> }
function VoicePicker({ value, onChange }: { value: VoiceName; onChange: (voice: VoiceName) => void }) { return <NativeSelect value={value} onChange={e => onChange(e.target.value as VoiceName)}>{voiceChoices.map(voice => <NativeSelectOption key={voice.id} value={voice.id}>{voice.label} — {voice.tone}</NativeSelectOption>)}</NativeSelect> }
function Score({ title, value }: { title: string; value: number }) { return <Card className="shadow-none"><CardHeader><CardDescription>{title}</CardDescription><CardTitle className="font-serif text-3xl">{Math.round(value)}%</CardTitle></CardHeader><CardContent><Progress value={value}/></CardContent></Card> }
function MiniMetric({ label, value }: { label: string; value: number }) { const percent = Math.round(value * 100); return <div className="rounded-xl border bg-white p-3"><div className="mb-1 flex justify-between text-xs"><span>{label}</span><strong>{percent}%</strong></div><Progress value={percent}/></div> }

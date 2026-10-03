"use client"

import Link from "next/link"
import { useEffect, useMemo, useRef, useState } from "react"
import { ArrowLeft, Brain, CheckCircle2, Clock3, Headphones, Loader2, Mic, MicOff, RefreshCw, ShieldCheck, Sparkles, Volume2 } from "lucide-react"
import { AdvancedInterviewExperience } from "@/components/advanced-interview-experience"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { interviewerPersonas, type InterviewMode, type InterviewPersonaKey } from "@/lib/coach-suite"
import { PROGRESS_KEY, PROFILE_KEY } from "@/lib/personal-tutor"
import { tracks, type TrackId } from "@/lib/oxbridge-data"

type LivePhase = "lobby" | "connecting" | "live" | "review"
type TranscriptTurn = { role: "candidate" | "interviewer"; text: string }
type SessionPayload = {
  token?: string
  model?: string
  voice?: string
  instructions?: string
  revision?: string
  error?: string
  code?: string
}
type FeedbackAnswer = {
  score?: number
  strengths?: string[]
  improvements?: string[]
  nextMove?: string
  dominantTarget?: string
}
type Feedback = {
  overallSummary?: string
  recurringStrengths?: string[]
  recurringWeaknesses?: string[]
  priorityTarget?: string
  nextInterviewPlan?: string[]
  answers?: FeedbackAnswer[]
}
type ServerMessage = {
  setupComplete?: Record<string, unknown>
  serverContent?: {
    modelTurn?: { parts?: Array<{ inlineData?: { data?: string; mimeType?: string } }> }
    inputTranscription?: { text?: string }
    outputTranscription?: { text?: string }
    turnComplete?: boolean
    interrupted?: boolean
  }
  goAway?: { timeLeft?: string }
}

const LIVE_ENDPOINT = "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContentConstrained"
const VOICES = ["Gacrux", "Sulafat", "Sadaltager", "Kore"] as const

function formatTime(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`
}

function appendChunk(current: string, chunk: string) {
  const clean = chunk.replace(/\s+/g, " ").trim()
  if (!clean) return current
  if (!current) return clean
  if (current.endsWith(clean)) return current
  return `${current} ${clean}`.replace(/\s+/g, " ").trim()
}

function floatToPcm16Base64(input: Float32Array, inputRate: number) {
  const outputRate = 16000
  const ratio = inputRate / outputRate
  const outputLength = Math.max(1, Math.floor(input.length / ratio))
  const pcm = new Int16Array(outputLength)
  for (let index = 0; index < outputLength; index += 1) {
    const start = Math.floor(index * ratio)
    const end = Math.max(start + 1, Math.min(input.length, Math.floor((index + 1) * ratio)))
    let sum = 0
    for (let sample = start; sample < end; sample += 1) sum += input[sample]
    const value = Math.max(-1, Math.min(1, sum / Math.max(1, end - start)))
    pcm[index] = value < 0 ? Math.round(value * 0x8000) : Math.round(value * 0x7fff)
  }
  const bytes = new Uint8Array(pcm.buffer)
  let binary = ""
  for (let index = 0; index < bytes.length; index += 1) binary += String.fromCharCode(bytes[index])
  return btoa(binary)
}

function decodePcm16(base64: string) {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index)
  const view = new DataView(bytes.buffer)
  const samples = new Float32Array(Math.floor(bytes.byteLength / 2))
  for (let index = 0; index < samples.length; index += 1) samples[index] = view.getInt16(index * 2, true) / 32768
  return samples
}

function extractRate(mimeType?: string) {
  const match = mimeType?.match(/rate=(\d+)/i)
  return match ? Number(match[1]) : 24000
}

export function GeminiLiveInterviewExperience() {
  const [fallback, setFallback] = useState(false)
  const [fallbackReason, setFallbackReason] = useState("")
  const [phase, setPhase] = useState<LivePhase>("lobby")
  const [track, setTrack] = useState<TrackId>("physical")
  const [course, setCourse] = useState("Physics")
  const [persona, setPersona] = useState<InterviewPersonaKey>("Socratic")
  const [mode, setMode] = useState<InterviewMode>("Realistic")
  const [panel, setPanel] = useState(true)
  const [voice, setVoice] = useState<(typeof VOICES)[number]>("Gacrux")
  const [status, setStatus] = useState("Ready")
  const [notice, setNotice] = useState("")
  const [seconds, setSeconds] = useState(0)
  const [muted, setMuted] = useState(false)
  const [turns, setTurns] = useState<TranscriptTurn[]>([])
  const [candidateDraft, setCandidateDraft] = useState("")
  const [interviewerDraft, setInterviewerDraft] = useState("")
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const [feedbackProvider, setFeedbackProvider] = useState("")

  const socketRef = useRef<WebSocket | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const captureContextRef = useRef<AudioContext | null>(null)
  const captureProcessorRef = useRef<ScriptProcessorNode | null>(null)
  const playbackContextRef = useRef<AudioContext | null>(null)
  const playbackSourcesRef = useRef(new Set<AudioBufferSourceNode>())
  const playbackCursorRef = useRef(0)
  const candidateDraftRef = useRef("")
  const interviewerDraftRef = useRef("")
  const captureStartedRef = useRef(false)
  const setupCompleteRef = useRef(false)
  const intentionalCloseRef = useRef(false)
  const startedAtRef = useRef<number | null>(null)

  const courses = tracks.find(item => item.id === track)?.courses ?? [course]
  const personaName = useMemo(() => interviewerPersonas[persona]?.name || persona, [persona])

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(PROFILE_KEY) || "{}") as { track?: TrackId; course?: string }
      if (saved.track) setTrack(saved.track)
      if (saved.course) setCourse(saved.course)
    } catch {}
  }, [])

  useEffect(() => {
    if (phase !== "live") return
    const timer = window.setInterval(() => setSeconds(Math.max(0, Math.floor((Date.now() - (startedAtRef.current || Date.now())) / 1000))), 1000)
    return () => window.clearInterval(timer)
  }, [phase])

  useEffect(() => () => cleanupLiveSession(), [])

  function chooseTrack(next: TrackId) {
    setTrack(next)
    const firstCourse = tracks.find(item => item.id === next)?.courses[0]
    if (firstCourse) setCourse(firstCourse)
  }

  function stopPlayback() {
    for (const source of playbackSourcesRef.current) {
      try { source.stop() } catch {}
    }
    playbackSourcesRef.current.clear()
    playbackCursorRef.current = playbackContextRef.current?.currentTime || 0
  }

  async function playAudio(base64: string, mimeType?: string) {
    if (!base64) return
    const AudioContextClass = window.AudioContext
    if (!playbackContextRef.current) playbackContextRef.current = new AudioContextClass()
    const context = playbackContextRef.current
    if (context.state === "suspended") await context.resume().catch(() => undefined)
    const samples = decodePcm16(base64)
    if (!samples.length) return
    const rate = extractRate(mimeType)
    const buffer = context.createBuffer(1, samples.length, rate)
    buffer.copyToChannel(samples, 0)
    const source = context.createBufferSource()
    source.buffer = buffer
    source.connect(context.destination)
    const startAt = Math.max(context.currentTime + 0.02, playbackCursorRef.current)
    playbackCursorRef.current = startAt + buffer.duration
    playbackSourcesRef.current.add(source)
    source.onended = () => playbackSourcesRef.current.delete(source)
    source.start(startAt)
  }

  async function startAudioCapture(stream: MediaStream) {
    if (captureStartedRef.current) return
    const context = new AudioContext()
    await context.resume().catch(() => undefined)
    const source = context.createMediaStreamSource(stream)
    const processor = context.createScriptProcessor(2048, 1, 1)
    const silent = context.createGain()
    silent.gain.value = 0
    source.connect(processor)
    processor.connect(silent)
    silent.connect(context.destination)
    processor.onaudioprocess = event => {
      const socket = socketRef.current
      if (!socket || socket.readyState !== WebSocket.OPEN || muted || !setupCompleteRef.current) return
      const data = floatToPcm16Base64(event.inputBuffer.getChannelData(0), context.sampleRate)
      socket.send(JSON.stringify({ realtimeInput: { audio: { data, mimeType: "audio/pcm;rate=16000" } } }))
    }
    captureContextRef.current = context
    captureProcessorRef.current = processor
    captureStartedRef.current = true
    setStatus("Listening · Gemini Live")
  }

  function flushTurn() {
    const candidate = candidateDraftRef.current.trim()
    const interviewer = interviewerDraftRef.current.trim()
    if (candidate || interviewer) {
      setTurns(current => [
        ...current,
        ...(candidate ? [{ role: "candidate" as const, text: candidate }] : []),
        ...(interviewer ? [{ role: "interviewer" as const, text: interviewer }] : []),
      ])
    }
    candidateDraftRef.current = ""
    interviewerDraftRef.current = ""
    setCandidateDraft("")
    setInterviewerDraft("")
  }

  function cleanupLiveSession() {
    captureProcessorRef.current?.disconnect()
    captureProcessorRef.current = null
    captureContextRef.current?.close().catch(() => undefined)
    captureContextRef.current = null
    captureStartedRef.current = false
    streamRef.current?.getTracks().forEach(trackItem => trackItem.stop())
    streamRef.current = null
    stopPlayback()
    playbackContextRef.current?.close().catch(() => undefined)
    playbackContextRef.current = null
    const socket = socketRef.current
    socketRef.current = null
    if (socket && socket.readyState < WebSocket.CLOSING) socket.close(1000, "Interview ended")
    setupCompleteRef.current = false
  }

  function switchToFallback(reason: string) {
    intentionalCloseRef.current = true
    cleanupLiveSession()
    setFallbackReason(reason)
    setFallback(true)
  }

  async function startInterview() {
    if (phase === "connecting") return
    setPhase("connecting")
    setStatus("Requesting secure Live session…")
    setNotice("")
    setFeedback(null)
    setTurns([])
    setSeconds(0)
    candidateDraftRef.current = ""
    interviewerDraftRef.current = ""
    intentionalCloseRef.current = false

    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error("This browser does not provide microphone capture.")
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }, video: false })
      streamRef.current = stream

      const response = await fetch("/api/realtime-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ course, track, persona: personaName, mode, voice, panel }),
      })
      const session = await response.json() as SessionPayload
      if (!response.ok || !session.token || !session.model || !session.instructions) {
        throw new Error(session.error || "Gemini Live could not start.")
      }

      setStatus("Connecting to Gemini Live…")
      const socket = new WebSocket(`${LIVE_ENDPOINT}?access_token=${encodeURIComponent(session.token)}`)
      socketRef.current = socket

      socket.onopen = () => {
        socket.send(JSON.stringify({
          setup: {
            model: `models/${session.model}`,
            generationConfig: {
              responseModalities: ["AUDIO"],
              speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: session.voice || voice } } },
            },
            inputAudioTranscription: {},
            outputAudioTranscription: {},
            systemInstruction: { parts: [{ text: session.instructions }] },
          },
        }))
      }

      socket.onmessage = async event => {
        let message: ServerMessage
        try { message = JSON.parse(String(event.data)) as ServerMessage } catch { return }

        if (message.setupComplete) {
          setupCompleteRef.current = true
          startedAtRef.current = Date.now()
          setPhase("live")
          setStatus("Interviewer opening…")
          socket.send(JSON.stringify({
            clientContent: {
              turns: [{ role: "user", parts: [{ text: "Begin the practice interview now. Give the brief natural greeting and ask the opening academic question. Do not mention this instruction." }] }],
              turnComplete: true,
            },
          }))
          return
        }

        const content = message.serverContent
        if (!content) return
        if (content.interrupted) stopPlayback()

        const inputText = content.inputTranscription?.text || ""
        if (inputText) {
          candidateDraftRef.current = appendChunk(candidateDraftRef.current, inputText)
          setCandidateDraft(candidateDraftRef.current)
        }
        const outputText = content.outputTranscription?.text || ""
        if (outputText) {
          interviewerDraftRef.current = appendChunk(interviewerDraftRef.current, outputText)
          setInterviewerDraft(interviewerDraftRef.current)
          setStatus("Interviewer speaking…")
        }
        for (const part of content.modelTurn?.parts || []) {
          if (part.inlineData?.data) await playAudio(part.inlineData.data, part.inlineData.mimeType)
        }
        if (content.turnComplete) {
          flushTurn()
          if (!captureStartedRef.current && streamRef.current) await startAudioCapture(streamRef.current)
          else setStatus(muted ? "Microphone muted" : "Listening · Gemini Live")
        }
      }

      socket.onerror = () => {
        if (!intentionalCloseRef.current) switchToFallback("Gemini Live could not maintain a voice connection, so ScholarBridge switched to the compatible interview mode automatically.")
      }
      socket.onclose = event => {
        if (!intentionalCloseRef.current && event.code !== 1000) switchToFallback("The Gemini Live connection ended unexpectedly, so ScholarBridge switched to the compatible interview mode automatically.")
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Gemini Live could not start."
      switchToFallback(`${message} ScholarBridge switched to the compatible interview mode automatically.`)
    }
  }

  function toggleMute() {
    const next = !muted
    setMuted(next)
    const trackItem = streamRef.current?.getAudioTracks()[0]
    if (trackItem) trackItem.enabled = !next
    if (next && socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ realtimeInput: { audioStreamEnd: true } }))
    }
    setStatus(next ? "Microphone muted" : "Listening · Gemini Live")
  }

  async function finishInterview() {
    if (phase !== "live") return
    intentionalCloseRef.current = true
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ realtimeInput: { audioStreamEnd: true } }))
    }
    flushTurn()
    const finalTurns = [
      ...turns,
      ...(candidateDraftRef.current.trim() ? [{ role: "candidate" as const, text: candidateDraftRef.current.trim() }] : []),
      ...(interviewerDraftRef.current.trim() ? [{ role: "interviewer" as const, text: interviewerDraftRef.current.trim() }] : []),
    ]
    cleanupLiveSession()
    setPhase("review")
    setStatus("Interview complete")

    const exchanges: Array<{ question: string; answer: string }> = []
    let currentQuestion = "Opening interview question"
    for (const turn of finalTurns) {
      if (turn.role === "interviewer") currentQuestion = turn.text
      else exchanges.push({ question: currentQuestion, answer: turn.text })
    }

    try {
      if (exchanges.length) {
        const response = await fetch("/api/interview-feedback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ course, sessionTitle: "Gemini Live interview", exchanges }),
        })
        if (response.ok) {
          const payload = await response.json() as { analysis?: Feedback; provider?: string }
          setFeedback(payload.analysis || null)
          setFeedbackProvider(payload.provider || "")
        }
      }
    } catch {}

    try {
      const saved = JSON.parse(localStorage.getItem(PROGRESS_KEY) || "{}") as Record<string, unknown> & { logs?: Array<Record<string, unknown>>; sessions?: number }
      const logs = Array.isArray(saved.logs) ? saved.logs : []
      localStorage.setItem(PROGRESS_KEY, JSON.stringify({
        ...saved,
        sessions: Number(saved.sessions || 0) + 1,
        logs: [{
          id: `gemini-live-${Date.now()}`,
          title: `Gemini Live Interview · ${course}`,
          date: new Date().toISOString(),
          durationSeconds: seconds,
          provider: "gemini-live",
          transcript: finalTurns,
          events: finalTurns.map(turn => `${turn.role === "candidate" ? "Candidate" : "Interviewer"}: ${turn.text}`),
        }, ...logs].slice(0, 50),
      }))
    } catch {}
  }

  function reset() {
    intentionalCloseRef.current = true
    cleanupLiveSession()
    setPhase("lobby")
    setTurns([])
    setCandidateDraft("")
    setInterviewerDraft("")
    setFeedback(null)
    setFeedbackProvider("")
    setNotice("")
    setSeconds(0)
    setMuted(false)
    setStatus("Ready")
  }

  if (fallback) {
    return <>
      <div className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm text-amber-950">
        <strong>Voice fallback active.</strong> {fallbackReason}
        <button type="button" className="ml-2 font-semibold underline" onClick={() => { setFallback(false); setFallbackReason(""); reset() }}>Try Gemini Live again</button>
      </div>
      <AdvancedInterviewExperience variant="ai" />
    </>
  }

  if (phase === "review") {
    return <main className="min-h-screen bg-slate-50 text-slate-950">
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button asChild variant="ghost"><Link href="/interviews"><ArrowLeft />Interview Hub</Link></Button>
          <Button onClick={reset}><RefreshCw />New live interview</Button>
        </div>
        <Card className="border-[#cfe1e4]"><CardHeader><Badge className="w-fit border-0 bg-emerald-100 text-emerald-800"><CheckCircle2 className="mr-1 size-3.5" />Gemini Live complete</Badge><CardTitle className="font-serif text-3xl">Live interview review</CardTitle><CardDescription>{course} · {formatTime(seconds)} · transcript saved to your interview history</CardDescription></CardHeader></Card>
        {feedback && <Card><CardHeader><CardTitle>Reasoning analysis</CardTitle><CardDescription>{feedbackProvider === "gemini" ? "Gemini-reviewed practice analysis" : "Built-in practice analysis"} · not an official admissions score</CardDescription></CardHeader><CardContent className="space-y-4"><p className="text-sm leading-7 text-slate-700">{feedback.overallSummary}</p><div className="grid gap-4 md:grid-cols-2"><div className="rounded-2xl bg-emerald-50 p-4"><p className="font-semibold text-emerald-950">Recurring strengths</p>{(feedback.recurringStrengths || []).map(item => <p key={item} className="mt-2 text-sm text-emerald-900">• {item}</p>)}</div><div className="rounded-2xl bg-amber-50 p-4"><p className="font-semibold text-amber-950">Priority improvements</p>{(feedback.recurringWeaknesses || []).map(item => <p key={item} className="mt-2 text-sm text-amber-900">• {item}</p>)}</div></div>{feedback.priorityTarget && <div className="rounded-2xl border p-4"><p className="text-xs font-bold uppercase tracking-wider text-slate-500">Next priority</p><p className="mt-1 font-semibold">{feedback.priorityTarget}</p></div>}</CardContent></Card>}
        <Card><CardHeader><CardTitle>Interview transcript</CardTitle><CardDescription>The spoken input/output transcription from your Gemini Live session.</CardDescription></CardHeader><CardContent className="space-y-3">{turns.length ? turns.map((turn, index) => <div key={`${turn.role}-${index}`} className={`rounded-2xl p-4 ${turn.role === "interviewer" ? "bg-[#102a43] text-white" : "ml-auto max-w-4xl bg-white ring-1 ring-slate-200"}`}><p className="mb-1 text-xs font-bold uppercase tracking-wider opacity-65">{turn.role === "interviewer" ? "Interviewer" : "Candidate"}</p><p className="text-sm leading-7">{turn.text}</p></div>) : <p className="text-sm text-slate-500">No transcript was returned for this session.</p>}</CardContent></Card>
      </div>
    </main>
  }

  if (phase === "live" || phase === "connecting") {
    return <main className="min-h-screen bg-[#eef3f4] text-[#172b3a]">
      <div className="mx-auto max-w-6xl space-y-5 px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3"><Button asChild variant="ghost"><Link href="/interviews"><ArrowLeft />Interview Hub</Link></Button><div className="flex items-center gap-2"><Badge className="border-0 bg-[#102a43] text-white"><Sparkles className="mr-1 size-3.5" />Gemini Live</Badge><Badge variant="outline"><Clock3 className="mr-1 size-3.5" />{formatTime(seconds)}</Badge></div></div>
        <Card className="overflow-hidden border-[#cfe1e4] shadow-sm"><CardHeader className="bg-[#102a43] text-white"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#8dd7de]">Live academic interview</p><CardTitle className="mt-1 font-serif text-3xl text-white">{course}</CardTitle><CardDescription className="text-white/65">{personaName} · {mode}{panel ? " · two-interviewer panel" : ""}</CardDescription></div><div className="flex items-center gap-2"><span className={`size-2.5 rounded-full ${phase === "live" ? "bg-emerald-400" : "animate-pulse bg-amber-300"}`} /><span className="text-sm text-white/80">{status}</span></div></div></CardHeader><CardContent className="p-5 sm:p-7"><div className="grid gap-5 lg:grid-cols-[1fr_280px]"><div className="min-h-[420px] space-y-3 rounded-2xl bg-slate-50 p-4 sm:p-5">{turns.map((turn, index) => <div key={`${turn.role}-${index}`} className={`max-w-[90%] rounded-2xl px-4 py-3 text-sm leading-6 ${turn.role === "interviewer" ? "bg-[#102a43] text-white" : "ml-auto bg-white ring-1 ring-slate-200"}`}><p className="mb-1 text-[10px] font-bold uppercase tracking-wider opacity-60">{turn.role === "interviewer" ? "Interviewer" : "You"}</p>{turn.text}</div>)}{candidateDraft && <div className="ml-auto max-w-[90%] rounded-2xl bg-white px-4 py-3 text-sm leading-6 ring-1 ring-[#8dd7de]"><p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-[#147d91]">You · live transcript</p>{candidateDraft}</div>}{interviewerDraft && <div className="max-w-[90%] rounded-2xl bg-[#102a43] px-4 py-3 text-sm leading-6 text-white"><p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-[#8dd7de]">Interviewer · speaking</p>{interviewerDraft}</div>}{phase === "connecting" && <div className="grid min-h-[300px] place-items-center text-center"><div><Loader2 className="mx-auto size-8 animate-spin text-[#147d91]" /><p className="mt-3 font-semibold">Preparing secure Gemini Live session</p><p className="mt-1 text-sm text-slate-500">Your long-lived Gemini key stays on the server.</p></div></div>}</div><aside className="space-y-3"><div className="rounded-2xl border bg-white p-4"><p className="text-xs font-bold uppercase tracking-wider text-slate-500">Voice controls</p><Button className="mt-3 w-full" variant={muted ? "default" : "outline"} onClick={toggleMute} disabled={phase !== "live"}>{muted ? <Mic /> : <MicOff />}{muted ? "Unmute microphone" : "Mute microphone"}</Button><Button className="mt-2 w-full" variant="destructive" onClick={finishInterview} disabled={phase !== "live"}>End interview</Button></div><div className="rounded-2xl border bg-white p-4 text-sm leading-6 text-slate-600"><div className="flex items-center gap-2 font-semibold text-slate-900"><Headphones className="size-4" />Natural conversation</div><p className="mt-2">Speak normally. Gemini uses voice activity detection, can hear your reasoning as you think aloud, and can be interrupted naturally.</p></div><div className="rounded-2xl border bg-white p-4 text-sm leading-6 text-slate-600"><div className="flex items-center gap-2 font-semibold text-slate-900"><ShieldCheck className="size-4" />Secure session</div><p className="mt-2">The browser receives only a short-lived Live token. The permanent Gemini credential is never sent to the browser.</p></div></aside></div>{notice && <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{notice}</p>}</CardContent></Card>
      </div>
    </main>
  }

  return <main className="min-h-screen bg-[#f2f5f5] text-[#172b3a]">
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
      <div className="mb-7 flex flex-wrap items-center justify-between gap-3"><Button asChild variant="ghost"><Link href="/interviews"><ArrowLeft />Interview Hub</Link></Button><Badge className="border-0 bg-[#102a43] text-white"><Volume2 className="mr-1 size-3.5" />Gemini Live voice</Badge></div>
      <section className="grid overflow-hidden rounded-[2rem] border border-[#dbe5e7] bg-white shadow-[0_28px_80px_rgba(16,42,67,.08)] lg:grid-cols-[1.08fr_.92fr]">
        <div className="p-6 sm:p-9 lg:p-12"><div className="flex items-start gap-4"><span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[#102a43] text-[#8dd7de]"><Sparkles className="size-5" /></span><div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#147d91]">Gemini Live interviewer</p><h1 className="mt-1 font-serif text-3xl font-bold sm:text-4xl">Have the interview as a real spoken academic conversation.</h1></div></div><p className="mt-5 max-w-3xl text-base leading-7 text-[#667984]">The primary voice mode now connects your microphone directly to Gemini Live using a short-lived secure token. It listens continuously, responds with native audio, follows your reasoning and provides a transcript for review.</p><div className="mt-7 grid gap-3 sm:grid-cols-2">{["Native two-way voice", "Live input transcription", "Spoken interviewer output", "Natural interruption / barge-in", "Automatic compatible fallback", "Saved transcript + analysis"].map(item => <div key={item} className="rounded-xl border border-[#dbe5e7] bg-[#f8fafb] px-4 py-3 text-sm font-semibold text-[#526a75]">{item}</div>)}</div><div className="mt-8 grid gap-4 sm:grid-cols-2"><label className="space-y-1.5"><span className="text-xs font-bold uppercase tracking-wider text-[#667984]">Subject family</span><NativeSelect value={track} onChange={event => chooseTrack(event.target.value as TrackId)}>{tracks.map(item => <NativeSelectOption key={item.id} value={item.id}>{item.short}</NativeSelectOption>)}</NativeSelect></label><label className="space-y-1.5"><span className="text-xs font-bold uppercase tracking-wider text-[#667984]">Course</span><NativeSelect value={course} onChange={event => setCourse(event.target.value)}>{courses.map(item => <NativeSelectOption key={item}>{item}</NativeSelectOption>)}</NativeSelect></label><label className="space-y-1.5"><span className="text-xs font-bold uppercase tracking-wider text-[#667984]">Interview mode</span><NativeSelect value={mode} onChange={event => setMode(event.target.value as InterviewMode)}>{["Realistic", "Tutor", "Stress"].map(item => <NativeSelectOption key={item}>{item}</NativeSelectOption>)}</NativeSelect></label><label className="space-y-1.5"><span className="text-xs font-bold uppercase tracking-wider text-[#667984]">Interviewer style</span><NativeSelect value={persona} onChange={event => setPersona(event.target.value as InterviewPersonaKey)}>{Object.keys(interviewerPersonas).map(item => <NativeSelectOption key={item}>{item}</NativeSelectOption>)}</NativeSelect></label><label className="space-y-1.5"><span className="text-xs font-bold uppercase tracking-wider text-[#667984]">Voice</span><NativeSelect value={voice} onChange={event => setVoice(event.target.value as typeof voice)}>{VOICES.map(item => <NativeSelectOption key={item}>{item}</NativeSelectOption>)}</NativeSelect></label><button type="button" onClick={() => setPanel(value => !value)} className={`rounded-xl border px-4 py-3 text-left text-sm ${panel ? "border-[#147d91] bg-[#edf7f8]" : "bg-white"}`}><span className="font-semibold">Two-interviewer panel</span><span className="mt-1 block text-xs text-slate-500">{panel ? "On · Gemini alternates A/B academic roles" : "Off · single interviewer"}</span></button></div><div className="mt-8 flex flex-wrap gap-3"><Button size="lg" onClick={startInterview}><Mic />Start live interview</Button><Button variant="outline" size="lg" onClick={() => switchToFallback("You selected the compatible interview mode.")}><Brain />Use compatible mode</Button></div></div>
        <aside className="bg-[#102a43] p-6 text-white sm:p-8 lg:p-10"><p className="text-xs font-bold uppercase tracking-[.18em] text-[#8dd7de]">How it behaves</p><h2 className="mt-2 font-serif text-2xl font-bold">Conversation first, not push-to-talk.</h2><div className="mt-6 space-y-4 text-sm leading-6 text-white/75"><p>Gemini opens with one academic question, listens to your spoken reasoning and makes the next challenge depend on what you actually said.</p><p>When your reasoning is strong it can deepen the problem; when a step is weak it should test that exact assumption rather than immediately reveal the answer.</p><p>If Live voice cannot connect, the page automatically switches to the existing ScholarBridge interviewer so practice can continue.</p></div><div className="mt-7 rounded-xl bg-white/10 p-4 text-sm leading-6 text-white/75"><ShieldCheck className="mb-2 size-5 text-[#8dd7de]" />Microphone access is used for the live session. The app stores the resulting practice transcript in your local interview history for review.</div></aside>
      </section>
    </div>
  </main>
}

"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { ArrowLeft, AudioLines, Brain, CheckCircle2, Headphones, Loader2, Mic, MicOff, PhoneOff, RefreshCw, ShieldCheck, Sparkles, Volume2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { tracks, type TrackId } from "@/lib/oxbridge-data"
import { interviewerPersonas, type InterviewMode, type InterviewPersonaKey } from "@/lib/coach-suite"

type Phase = "lobby" | "connecting" | "live" | "ended"
type State = "idle" | "connecting" | "connected" | "speaking" | "thinking" | "interviewer" | "error"
type GeminiVoice = "Gacrux" | "Sulafat" | "Sadaltager" | "Kore"
type Turn = { id: string; role: "interviewer" | "candidate" | "system"; text: string; feedback?: string }
type TokenResponse = { token?: string; model?: string; voice?: GeminiVoice; instructions?: string; error?: string }
type ConfigResponse = { configured?: boolean; model?: string; voices?: GeminiVoice[] }
type GeminiMessage = {
  error?: { message?: string }
  setupComplete?: Record<string, never>
  serverContent?: {
    modelTurn?: { parts?: Array<{ inlineData?: { data?: string; mimeType?: string } }> }
    interimInputTranscription?: { text?: string }
    inputTranscription?: { text?: string }
    outputTranscription?: { text?: string }
    turnComplete?: boolean
    interrupted?: boolean
  }
  goAway?: { timeLeft?: string }
}

const profileKey = "oxbridge-tutor-profile-v2"
const progressKey = "oxbridge-tutor-progress-v2"

const voiceLabels: Record<GeminiVoice, string> = {
  Gacrux: "Gacrux · mature academic",
  Sulafat: "Sulafat · warm conversational",
  Sadaltager: "Sadaltager · knowledgeable measured",
  Kore: "Kore · firm probing",
}

function formatTime(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`
}

function resample16k(input: Float32Array, inputRate: number) {
  const outputLength = Math.max(1, Math.round(input.length * 16000 / inputRate))
  const output = new Int16Array(outputLength)
  for (let i = 0; i < outputLength; i += 1) {
    const pos = i * (input.length - 1) / Math.max(1, outputLength - 1)
    const left = Math.floor(pos)
    const right = Math.min(input.length - 1, left + 1)
    const fraction = pos - left
    const sample = input[left] * (1 - fraction) + input[right] * fraction
    const clipped = Math.max(-1, Math.min(1, sample))
    output[i] = clipped < 0 ? Math.round(clipped * 32768) : Math.round(clipped * 32767)
  }
  return output
}

function pcmToBase64(pcm: Int16Array) {
  const bytes = new Uint8Array(pcm.buffer, pcm.byteOffset, pcm.byteLength)
  let binary = ""
  for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...Array.from(bytes.subarray(i, i + 8192)))
  return btoa(binary)
}

function base64ToPcm(base64: string) {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  const view = new DataView(bytes.buffer)
  const samples = new Float32Array(Math.floor(bytes.byteLength / 2))
  for (let i = 0; i < samples.length; i += 1) samples[i] = view.getInt16(i * 2, true) / 32768
  return samples
}

function splitFeedbackAndQuestion(text: string) {
  const clean = text.replace(/\s+/g, " ").trim()
  const sentence = clean.match(/^(.+?[.!])\s+([\s\S]+)$/)
  if (sentence) return { feedback: sentence[1].trim(), followUp: sentence[2].trim() }
  const questionIndex = clean.indexOf("?")
  if (questionIndex > 0) return { feedback: "", followUp: clean.slice(0, questionIndex + 1).trim() }
  return { feedback: clean, followUp: "" }
}

export default function GeminiLiveInterviewPage() {
  const [phase, setPhase] = useState<Phase>("lobby")
  const [status, setStatus] = useState<State>("idle")
  const [track, setTrack] = useState<TrackId>("physical")
  const [course, setCourse] = useState("Physics")
  const [personaKey, setPersonaKey] = useState<InterviewPersonaKey>("Socratic")
  const [mode, setMode] = useState<InterviewMode>("Realistic")
  const [voice, setVoice] = useState<GeminiVoice>("Gacrux")
  const [muted, setMuted] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [notice, setNotice] = useState("")
  const [turns, setTurns] = useState<Turn[]>([])
  const [candidateLive, setCandidateLive] = useState("")
  const [interviewerLive, setInterviewerLive] = useState("")
  const [connectedAt, setConnectedAt] = useState<number | null>(null)
  const [configured, setConfigured] = useState<boolean | null>(null)
  const [serverModel, setServerModel] = useState("gemini-3.8-live")

  const startedAtRef = useRef<number | null>(null)
  const playbackEpochRef = useRef(0)
  const generationRef = useRef(0)
  const setupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const finishTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputTextRef = useRef("")
  const savedRef = useRef(false)
  const wsRef = useRef<WebSocket | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const inputCtxRef = useRef<AudioContext | null>(null)
  const outputCtxRef = useRef<AudioContext | null>(null)
  const processorRef = useRef<ScriptProcessorNode | null>(null)
  const micSourceRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const silentGainRef = useRef<GainNode | null>(null)
  const outputSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set())
  const nextAudioRef = useRef(0)
  const outputTextRef = useRef("")
  const turnsRef = useRef<Turn[]>([])
  const mutedRef = useRef(false)
  const modelSpeakingRef = useRef(false)
  const openingRef = useRef(true)
  const endingRef = useRef(false)
  const lastCandidateIdRef = useRef<string | null>(null)
  const lastCandidateTextRef = useRef("")

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(profileKey) || "{}") as { track?: TrackId; course?: string }
      if (saved.track) setTrack(saved.track)
      if (saved.course) setCourse(saved.course)
    } catch { /* defaults */ }

    fetch("/api/realtime-session")
      .then(async response => {
        if (!response.ok) return { configured: false } as ConfigResponse
        return response.json() as Promise<ConfigResponse>
      })
      .then((data: ConfigResponse) => {
        setConfigured(Boolean(data.configured))
        if (data.model) setServerModel(data.model)
      })
      .catch(() => setConfigured(false))
  }, [])

  useEffect(() => {
    if (!connectedAt || phase !== "live") return
    const timer = window.setInterval(() => setSeconds(Math.floor((Date.now() - connectedAt) / 1000)), 1000)
    return () => window.clearInterval(timer)
  }, [connectedAt, phase])

  useEffect(() => () => close(false), [])

  const courses = tracks.find(item => item.id === track)?.courses ?? [course]
  const persona = interviewerPersonas[personaKey]
  const feedbackCount = turns.filter(turn => turn.role === "candidate" && turn.feedback).length

  function syncTurns(next: Turn[]) {
    turnsRef.current = next
    setTurns(next)
  }

  function addTurn(role: Turn["role"], text: string) {
    const clean = text.replace(/\s+/g, " ").trim()
    if (!clean) return null
    const id = `${Date.now()}-${Math.random()}`
    syncTurns([...turnsRef.current, { id, role, text: clean }])
    return id
  }

  function attachFeedback(candidateId: string | null, feedback: string) {
    if (!candidateId || !feedback.trim()) return
    syncTurns(turnsRef.current.map(turn => turn.id === candidateId ? { ...turn, feedback: feedback.trim() } : turn))
  }

  function stopOutput() {
    playbackEpochRef.current += 1
    for (const source of outputSourcesRef.current) {
      try { source.stop() } catch { /* already stopped */ }
    }
    outputSourcesRef.current.clear()
    if (outputCtxRef.current) nextAudioRef.current = outputCtxRef.current.currentTime
  }

  async function playAudio(base64: string) {
    const generation = generationRef.current
    const playbackEpoch = playbackEpochRef.current
    const ctx = outputCtxRef.current
    if (!ctx) return
    if (ctx.state === "suspended") await ctx.resume()
    if (generation !== generationRef.current || playbackEpoch !== playbackEpochRef.current || ctx !== outputCtxRef.current) return
    const samples = base64ToPcm(base64)
    if (!samples.length) return
    const buffer = ctx.createBuffer(1, samples.length, 24000)
    buffer.copyToChannel(samples, 0)
    const source = ctx.createBufferSource()
    source.buffer = buffer
    source.connect(ctx.destination)
    const startAt = Math.max(ctx.currentTime + 0.015, nextAudioRef.current || ctx.currentTime)
    nextAudioRef.current = startAt + buffer.duration
    outputSourcesRef.current.add(source)
    source.onended = () => {
      outputSourcesRef.current.delete(source)
      if (!outputSourcesRef.current.size && !modelSpeakingRef.current && !endingRef.current && wsRef.current) setStatus("connected")
    }
    source.start(startAt)
  }

  async function startMic(ws: WebSocket) {
    if (processorRef.current) return
    const stream = streamRef.current ?? await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } })
    streamRef.current = stream

    let ctx = inputCtxRef.current
    if (!ctx) {
      ctx = new AudioContext()
      inputCtxRef.current = ctx
    }
    if (ctx.state === "suspended") await ctx.resume()
    if (wsRef.current !== ws || endingRef.current) return

    const source = ctx.createMediaStreamSource(stream)
    const processor = ctx.createScriptProcessor(1024, 1, 1)
    const silent = ctx.createGain()
    silent.gain.value = 0
    micSourceRef.current = source
    processorRef.current = processor
    silentGainRef.current = silent

    processor.onaudioprocess = event => {
      if (ws.readyState !== WebSocket.OPEN || mutedRef.current || endingRef.current) return
      const pcm = resample16k(event.inputBuffer.getChannelData(0), ctx!.sampleRate)
      if (!pcm.length) return
      ws.send(JSON.stringify({ realtimeInput: { audio: { data: pcmToBase64(pcm), mimeType: "audio/pcm;rate=16000" } } }))
    }

    source.connect(processor)
    processor.connect(silent)
    silent.connect(ctx.destination)
  }

  function sendOpening(ws: WebSocket) {
    openingRef.current = true
    ws.send(JSON.stringify({
      clientContent: {
        turns: [{ role: "user", parts: [{ text: `Begin the formal ${course} practice interview now. Give a brief, natural greeting and then ask exactly one challenging but accessible opening question appropriate to ${course}. Do not give feedback before the candidate has answered.` }] }],
        turnComplete: true,
      },
    }))
  }

  function closeAfterAudio(save: boolean) {
    const ctx = outputCtxRef.current
    const remainingMs = ctx ? Math.max(500, Math.ceil((nextAudioRef.current - ctx.currentTime) * 1000) + 350) : 650
    if (finishTimerRef.current) clearTimeout(finishTimerRef.current)
    finishTimerRef.current = setTimeout(() => close(save), remainingMs)
  }

  function handleMessage(message: GeminiMessage, ws: WebSocket) {
    if (wsRef.current !== ws) return
    if (message.error) {
      failConnection(message.error.message || "Gemini rejected the live session.")
      return
    }
    if (message.setupComplete) {
      if (setupTimerRef.current) clearTimeout(setupTimerRef.current)
      setStatus("connected")
      setPhase("live")
      startedAtRef.current = Date.now()
      setConnectedAt(startedAtRef.current)
      addTurn("system", `Gemini Live connected using ${serverModel}. Your microphone audio is streamed for the live conversation and is not intentionally saved by this app.`)
      void startMic(ws).then(() => {
        if (wsRef.current === ws && ws.readyState === WebSocket.OPEN) sendOpening(ws)
      }).catch(error => failConnection(error instanceof Error ? error.message : "Microphone could not start"))
      return
    }

    if (message.goAway) setNotice("Gemini Live is preparing to end this session. Finish the current turn or start a new interview.")
    const content = message.serverContent
    if (!content) return

    if (content.interrupted) {
      stopOutput()
      modelSpeakingRef.current = false
      outputTextRef.current = ""
      setInterviewerLive("")
    }

    const interim = content.interimInputTranscription?.text?.trim()
    if (interim) {
      setCandidateLive(interim)
      setStatus("speaking")
    }

    const input = content.inputTranscription?.text
    if (input) {
      inputTextRef.current += input
      setCandidateLive(inputTextRef.current)
      setStatus("speaking")
    }
    if (inputTextRef.current && (content.outputTranscription?.text || content.modelTurn || content.turnComplete)) {
      lastCandidateIdRef.current = addTurn("candidate", inputTextRef.current)
      inputTextRef.current = ""
      setCandidateLive("")
    }

    const output = content.outputTranscription?.text
    if (output) {
      const current = outputTextRef.current
      outputTextRef.current = output.startsWith(current) ? output : `${current}${output}`
      setInterviewerLive(outputTextRef.current)
      setStatus("interviewer")
    }

    for (const part of content.modelTurn?.parts ?? []) {
      const audio = part.inlineData?.data
      if (audio) {
        modelSpeakingRef.current = true
        setStatus("interviewer")
        void playAudio(audio)
      }
    }

    if (!content.turnComplete) return
    const finalOutput = outputTextRef.current.replace(/\s+/g, " ").trim()
    if (finalOutput) {
      addTurn("interviewer", finalOutput)
      if (!openingRef.current && lastCandidateIdRef.current) {
        const parsed = splitFeedbackAndQuestion(finalOutput)
        attachFeedback(lastCandidateIdRef.current, parsed.feedback)
      }
    }

    outputTextRef.current = ""
    setInterviewerLive("")
    modelSpeakingRef.current = false

    if (openingRef.current) {
      openingRef.current = false
      if (!outputSourcesRef.current.size) setStatus("connected")
      return
    }

    if (endingRef.current) {
      closeAfterAudio(true)
      return
    }

    if (!outputSourcesRef.current.size) setStatus("connected")
  }

  function failConnection(message: string) {
    close(false)
    setPhase("lobby")
    setStatus("error")
    setNotice(message)
  }

  async function start() {
    if (phase === "connecting") return
    if (configured === false) {
      setNotice("Gemini Live is not configured on this Vercel deployment yet. Add GEMINI_API_KEY to the project environment and redeploy.")
      setStatus("error")
      return
    }

    close(false)
    const generation = generationRef.current
    savedRef.current = false
    mutedRef.current = false
    setMuted(false)
    inputTextRef.current = ""
    outputTextRef.current = ""
    startedAtRef.current = null
    setConnectedAt(null)
    setPhase("connecting")
    setStatus("connecting")
    setNotice("")
    syncTurns([])
    setCandidateLive("")
    setInterviewerLive("")
    setSeconds(0)
    openingRef.current = true
    endingRef.current = false
    lastCandidateIdRef.current = null
    lastCandidateTextRef.current = ""

    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error("Microphone access is not available in this browser.")

      const outputCtx = new AudioContext()
      outputCtxRef.current = outputCtx
      await outputCtx.resume()
      nextAudioRef.current = outputCtx.currentTime

      const inputCtx = new AudioContext()
      inputCtxRef.current = inputCtx
      await inputCtx.resume()

      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } })
      if (generation !== generationRef.current) { stream.getTracks().forEach(track => track.stop()); return }
      streamRef.current = stream

      const response = await fetch("/api/realtime-session", {
        method: "POST",
        signal: AbortSignal.timeout(30000),
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ course, track, persona: personaKey, mode, voice }),
      })
      const data = await response.json() as TokenResponse
      if (generation !== generationRef.current) return
      if (!response.ok || !data.token || !data.model || !data.instructions) throw new Error(data.error || "Could not create the Gemini Live session.")
      setServerModel(data.model)

      const socketUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContentConstrained?access_token=${encodeURIComponent(data.token)}`
      const ws = new WebSocket(socketUrl)
      wsRef.current = ws
      ws.binaryType = "arraybuffer"
      setupTimerRef.current = setTimeout(() => {
        if (wsRef.current === ws) failConnection("Gemini did not finish connecting. Please try again.")
      }, 20000)

      ws.onopen = () => {
        if (wsRef.current !== ws) return
        setStatus("connecting")
        ws.send(JSON.stringify({
          setup: {
            model: `models/${data.model}`,
            generationConfig: {
              responseModalities: ["AUDIO"],
              speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: data.voice || voice } } },
            },
            systemInstruction: { parts: [{ text: data.instructions }] },
            realtimeInputConfig: {
              automaticActivityDetection: {
                disabled: false,
                startOfSpeechSensitivity: "START_SENSITIVITY_LOW",
                endOfSpeechSensitivity: "END_SENSITIVITY_LOW",
                prefixPaddingMs: 300,
                silenceDurationMs: 1200,
              },
              activityHandling: "START_OF_ACTIVITY_INTERRUPTS",
            },
            inputAudioTranscription: {},
            outputAudioTranscription: {},
          },
        }))
      }

      // Binary WebSocket frames must be decoded before JSON parsing.
      let messages = Promise.resolve()
      ws.onmessage = event => {
        messages = messages.then(async () => {
          const raw = typeof event.data === "string" ? event.data
            : event.data instanceof Blob ? await event.data.text()
            : new TextDecoder().decode(event.data)
          if (wsRef.current === ws) handleMessage(JSON.parse(raw) as GeminiMessage, ws)
        }).catch(() => {
          if (wsRef.current === ws) failConnection("Could not read the Gemini audio stream. Please restart the interview.")
        })
      }

      ws.onerror = () => {
        if (wsRef.current === ws) failConnection("Gemini Live could not connect. Please retry and check your network allows secure WebSockets.")
      }

      ws.onclose = event => {
        if (wsRef.current !== ws) return
        if (endingRef.current) { close(true); return }
        failConnection(event.reason || `Gemini Live disconnected (code ${event.code}). Please start a new interview.`)
      }
    } catch (error) {
      if (generation !== generationRef.current) return
      close(false)
      setPhase("lobby")
      setStatus("error")
      setNotice(error instanceof Error ? error.message : "Could not start Gemini Live voice.")
    }
  }

  function toggleMute() {
    const next = !mutedRef.current
    mutedRef.current = next
    setMuted(next)
    streamRef.current?.getAudioTracks().forEach(track => { track.enabled = !next })
    if (next && wsRef.current?.readyState === WebSocket.OPEN) wsRef.current.send(JSON.stringify({ realtimeInput: { audioStreamEnd: true } }))
  }

  function finishInterview() {
    const ws = wsRef.current
    if (!ws || ws.readyState !== WebSocket.OPEN || endingRef.current) {
      close(true)
      return
    }
    finishTimerRef.current = setTimeout(() => close(true), 20000)
    endingRef.current = true
    mutedRef.current = true
    setMuted(true)
    streamRef.current?.getAudioTracks().forEach(track => { track.enabled = false })
    setStatus("thinking")
    ws.send(JSON.stringify({ realtimeInput: { audioStreamEnd: true } }))
    ws.send(JSON.stringify({ clientContent: { turns: [{ role: "user", parts: [{ text: "The candidate has chosen to end the interview. Give the concise final spoken debrief described in your instructions, then clearly say that the interview is complete. Do not ask another question." }] }], turnComplete: true } }))
  }

  function saveProgress() {
    if (!turnsRef.current.length || savedRef.current) return
    savedRef.current = true
    try {
      const saved = JSON.parse(localStorage.getItem(progressKey) || "{}") as Record<string, unknown>
      const logs = Array.isArray(saved.logs) ? saved.logs as Array<Record<string, unknown>> : []
      const sessions = Number(saved.sessions ?? 0)
      const events = turnsRef.current.filter(turn => turn.role !== "system").map(turn => `${turn.role === "candidate" ? "Candidate" : "Interviewer"}: ${turn.text}${turn.feedback ? ` | Feedback: ${turn.feedback}` : ""}`)
      localStorage.setItem(progressKey, JSON.stringify({ ...saved, sessions: sessions + 1, logs: [{ id: `gemini-live-${Date.now()}`, title: `Gemini Live Interview · ${course}`, score: 0, date: new Date().toLocaleDateString("en-GB"), events: [...events, `Duration: ${formatTime(startedAtRef.current ? Math.floor((Date.now() - startedAtRef.current) / 1000) : 0)}`, `Feedback notes: ${turnsRef.current.filter(turn => turn.feedback).length}`] }, ...logs].slice(0, 40) }))
    } catch { /* interview completion does not depend on local persistence */ }
  }

  function close(save = true) {
    if (save) saveProgress()
    generationRef.current += 1
    if (setupTimerRef.current) clearTimeout(setupTimerRef.current)
    if (finishTimerRef.current) clearTimeout(finishTimerRef.current)
    setupTimerRef.current = null
    finishTimerRef.current = null
    endingRef.current = true
    const ws = wsRef.current
    wsRef.current = null
    try { ws?.close(1000, "Interview ended") } catch { /* ignore */ }
    stopOutput()
    try { processorRef.current?.disconnect() } catch { /* ignore */ }
    try { micSourceRef.current?.disconnect() } catch { /* ignore */ }
    try { silentGainRef.current?.disconnect() } catch { /* ignore */ }
    processorRef.current = null
    micSourceRef.current = null
    silentGainRef.current = null
    streamRef.current?.getTracks().forEach(track => track.stop())
    streamRef.current = null
    void inputCtxRef.current?.close().catch(() => {})
    void outputCtxRef.current?.close().catch(() => {})
    inputCtxRef.current = null
    outputCtxRef.current = null
    if (save) {
      setPhase("ended")
      setStatus("idle")
    }
  }

  function reset() {
    close(false)
    setPhase("lobby")
    setStatus("idle")
    setNotice("")
    setSeconds(0)
    setConnectedAt(null)
    syncTurns([])
    lastCandidateTextRef.current = ""
    lastCandidateIdRef.current = null
    endingRef.current = false
    mutedRef.current = false
    setMuted(false)
  }

  const statusLabel = status === "speaking" ? "Listening to you" : status === "thinking" ? "Interviewer is thinking" : status === "interviewer" ? "Interviewer is speaking" : status === "connected" ? "Live and listening" : status === "connecting" ? "Connecting to Gemini" : status === "error" ? "Connection issue" : "Ready"

  if (phase === "lobby" || phase === "connecting") return <main className="min-h-screen bg-[#f2f5f5] text-[#172b3a]">
    <div className="mx-auto max-w-6xl px-4 py-7 sm:px-6 lg:px-8 lg:py-11">
      <div className="mb-7 flex items-center justify-between gap-3"><Link href="/interviews" className="inline-flex items-center gap-2 text-sm font-semibold text-[#526a75]"><ArrowLeft className="size-4" />Interview Hub</Link><Badge className="border-0 bg-[#102a43] text-white"><AudioLines className="mr-1 size-3" />Gemini 3.8 Live</Badge></div>
      <section className="grid overflow-hidden rounded-[2rem] border border-[#dbe5e7] bg-white shadow-[0_30px_90px_rgba(16,42,67,.09)] lg:grid-cols-[1.08fr_.92fr]">
        <div className="p-6 sm:p-9 lg:p-12"><div className="mb-7 flex items-center gap-3"><span className="grid size-12 place-items-center rounded-2xl bg-[#102a43] text-[#8dd7de]"><Headphones className="size-5" /></span><div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#147d91]">Gemini Live Interview</p><h1 className="font-serif text-3xl font-bold sm:text-4xl">A more realistic spoken interview.</h1></div></div><p className="max-w-2xl text-base leading-7 text-[#667984]">Speak naturally. Gemini listens to your reasoning, gives one concise piece of spoken feedback after each answer, shows that same feedback in writing, then asks one course-specific follow-up. You can also interrupt naturally, as you could in a real academic conversation.</p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2"><label className="space-y-1.5"><span className="text-xs font-bold uppercase tracking-wider text-[#667984]">Subject family</span><NativeSelect value={track} onChange={event => { const next = event.target.value as TrackId; setTrack(next); const found = tracks.find(item => item.id === next); if (found) setCourse(found.courses[0]) }}>{tracks.map(item => <NativeSelectOption key={item.id} value={item.id}>{item.short}</NativeSelectOption>)}</NativeSelect></label><label className="space-y-1.5"><span className="text-xs font-bold uppercase tracking-wider text-[#667984]">Course</span><NativeSelect value={course} onChange={event => setCourse(event.target.value)}>{courses.map(item => <NativeSelectOption key={item}>{item}</NativeSelectOption>)}</NativeSelect></label><label className="space-y-1.5"><span className="text-xs font-bold uppercase tracking-wider text-[#667984]">Interviewer style</span><NativeSelect value={personaKey} onChange={event => setPersonaKey(event.target.value as InterviewPersonaKey)}>{Object.keys(interviewerPersonas).map(item => <NativeSelectOption key={item}>{item}</NativeSelectOption>)}</NativeSelect></label><label className="space-y-1.5"><span className="text-xs font-bold uppercase tracking-wider text-[#667984]">Session style</span><NativeSelect value={mode} onChange={event => setMode(event.target.value as InterviewMode)}>{["Tutor", "Realistic", "No-hint", "Stress"].map(item => <NativeSelectOption key={item}>{item}</NativeSelectOption>)}</NativeSelect></label><label className="space-y-1.5 sm:col-span-2"><span className="text-xs font-bold uppercase tracking-wider text-[#667984]">Voice</span><NativeSelect value={voice} onChange={event => setVoice(event.target.value as GeminiVoice)}>{(Object.keys(voiceLabels) as GeminiVoice[]).map(item => <NativeSelectOption key={item} value={item}>{voiceLabels[item]}</NativeSelectOption>)}</NativeSelect></label></div>
          {configured === false && <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm leading-5 text-amber-900"><strong>Gemini key missing on this deployment.</strong> Add <code>GEMINI_API_KEY</code> to the Vercel project environment, then redeploy.</div>}
          {notice && <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm leading-5 text-amber-900">{notice}</div>}
          <div className="mt-7 flex flex-wrap gap-2"><Button className="h-12 rounded-xl px-6" onClick={start} disabled={phase === "connecting" || configured === false}>{phase === "connecting" ? <><Loader2 className="animate-spin" />Connecting…</> : <><Mic />Start Gemini Live interview</>}</Button><Button variant="outline" asChild><Link href="/natural-ai-interview"><Sparkles />Use Gemini natural voice fallback</Link></Button></div>
        </div>
        <aside className="border-t bg-[#102a43] p-6 text-white sm:p-9 lg:border-l lg:border-t-0 lg:p-10"><Badge className="border-white/15 bg-white/10 text-white">Realism upgrades</Badge><div className="mt-6 space-y-5 text-sm leading-6 text-white/70"><div className="flex gap-3"><Brain className="mt-0.5 size-5 shrink-0 text-[#8dd7de]" /><div><strong className="text-white">Answer-specific challenge</strong><p>The next question is based on what you actually said, not a fixed script.</p></div></div><div className="flex gap-3"><Volume2 className="mt-0.5 size-5 shrink-0 text-[#8dd7de]" /><div><strong className="text-white">Natural turn-taking</strong><p>Lower-latency audio and live barge-in mean you can speak naturally rather than waiting for a rigid bot turn.</p></div></div><div className="flex gap-3"><ShieldCheck className="mt-0.5 size-5 shrink-0 text-[#8dd7de]" /><div><strong className="text-white">Real interview tone</strong><p>Minimal generic praise, one question at a time, assumption testing, counterexamples and changed conditions.</p></div></div></div><div className="mt-7 rounded-2xl bg-white/8 p-4 text-sm text-white/65"><strong className="text-white">{persona.label}</strong><p className="mt-1">{persona.followupPrefix}</p><p className="mt-3 text-xs">Model: {serverModel}</p></div></aside>
      </section>
    </div>
  </main>

  if (phase === "ended") {
    const candidateTurns = turns.filter(turn => turn.role === "candidate")
    return <main className="min-h-screen bg-[#f2f5f5] text-[#172b3a]"><div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8"><Card className="border-[#dbe5e7] shadow-sm"><CardHeader><div className="flex items-center gap-3"><CheckCircle2 className="size-7 text-[#147d91]" /><div><CardTitle className="font-serif text-3xl">Interview complete</CardTitle><CardDescription>{course} · {formatTime(seconds)} · {candidateTurns.length} substantive answer{candidateTurns.length === 1 ? "" : "s"}</CardDescription></div></div></CardHeader><CardContent className="space-y-5"><div className="grid gap-3 sm:grid-cols-2">{candidateTurns.map((turn, index) => <div key={turn.id} className="rounded-2xl border bg-white p-4"><p className="text-xs font-bold uppercase tracking-wider text-[#147d91]">Answer {index + 1}</p><p className="mt-2 text-sm leading-6 text-[#526a75]">{turn.text}</p><div className="mt-3 rounded-xl bg-[#edf7f8] p-3"><p className="text-xs font-bold uppercase tracking-wider text-[#147d91]">Written feedback</p><p className="mt-1 text-sm leading-5">{turn.feedback || "No separate feedback transcript was captured for this answer."}</p></div></div>)}</div><div className="flex flex-wrap gap-2"><Button onClick={reset}><RefreshCw />New interview</Button><Button variant="outline" asChild><Link href="/interviews">Interview Hub</Link></Button></div></CardContent></Card></div></main>
  }

  return <main className="min-h-screen bg-[#f2f5f5] text-[#172b3a]"><div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8"><div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-[#147d91]">Gemini Live · {course}</p><h1 className="font-serif text-2xl font-bold">{statusLabel}</h1></div><div className="flex items-center gap-2"><Badge variant="outline">{formatTime(seconds)}</Badge><Badge className="border-0 bg-[#147d91] text-white">{feedbackCount} feedback note{feedbackCount === 1 ? "" : "s"}</Badge></div></div>{notice && <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{notice}</div>}<div className="grid gap-5 lg:grid-cols-[1.15fr_.85fr]"><Card className="min-h-[660px] border-[#dbe5e7] shadow-sm"><CardHeader><CardTitle className="font-serif text-2xl">Interview conversation</CardTitle><CardDescription>The spoken feedback sentence is also attached beneath each answer as a written note.</CardDescription></CardHeader><CardContent><div className="max-h-[540px] space-y-3 overflow-y-auto rounded-2xl bg-[#f8fafb] p-4">{turns.filter(turn => turn.role !== "system").map(turn => <div key={turn.id} className={`rounded-2xl p-4 ${turn.role === "candidate" ? "ml-auto max-w-[90%] bg-[#102a43] text-white" : "bg-white shadow-sm"}`}><p className={`mb-1 text-[11px] font-bold uppercase tracking-wider ${turn.role === "candidate" ? "text-[#8dd7de]" : "text-[#147d91]"}`}>{turn.role === "candidate" ? "You" : "Interviewer"}</p><p className="text-sm leading-6">{turn.text}</p>{turn.role === "candidate" && turn.feedback && <div className="mt-3 rounded-xl bg-white/10 p-3"><p className="text-[10px] font-bold uppercase tracking-[.14em] text-[#8dd7de]">Written feedback</p><p className="mt-1 text-sm leading-5 text-white/90">{turn.feedback}</p></div>}</div>)}{candidateLive && <div className="ml-auto max-w-[90%] rounded-2xl border border-dashed border-[#8dd7de] bg-[#102a43]/90 p-4 text-white"><p className="text-[11px] font-bold uppercase tracking-wider text-[#8dd7de]">Listening…</p><p className="mt-1 text-sm leading-6">{candidateLive}</p></div>}{interviewerLive && <div className="rounded-2xl border border-dashed border-[#9fcbd1] bg-white p-4"><p className="text-[11px] font-bold uppercase tracking-wider text-[#147d91]">Interviewer speaking…</p><p className="mt-1 text-sm leading-6">{interviewerLive}</p></div>}</div></CardContent></Card><div className="space-y-5"><Card className="border-[#dbe5e7] shadow-sm"><CardHeader><CardTitle className="font-serif text-xl">Live controls</CardTitle></CardHeader><CardContent className="space-y-3"><div className="rounded-xl bg-[#edf7f8] p-3 text-sm"><strong>{statusLabel}</strong><p className="mt-1 text-[#667984]">{voiceLabels[voice]} · {mode}</p></div><Button className="w-full" variant={muted ? "default" : "outline"} onClick={toggleMute}>{muted ? <Mic /> : <MicOff />}{muted ? "Unmute microphone" : "Mute microphone"}</Button><Button className="w-full" variant="destructive" onClick={finishInterview}><PhoneOff />Finish and hear debrief</Button></CardContent></Card><Card className="border-[#dbe5e7] shadow-sm"><CardHeader><CardTitle className="font-serif text-xl">What makes this realistic</CardTitle></CardHeader><CardContent className="space-y-3 text-sm leading-6 text-[#667984]"><p>• One question at a time.</p><p>• Specific feedback instead of generic praise.</p><p>• Follow-ups use your exact reasoning.</p><p>• You can interrupt naturally and Gemini stops its queued audio.</p><p>• Assumptions, counterexamples, estimates and changed conditions are used naturally.</p><p>• Changing your mind for a good reason is treated as flexible thinking.</p></CardContent></Card></div></div></div></main>
}


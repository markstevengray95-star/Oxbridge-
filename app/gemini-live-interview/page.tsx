"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { ArrowLeft, AudioLines, Brain, CheckCircle2, Clock3, GraduationCap, Headphones, Loader2, Mic, MicOff, PhoneOff, RefreshCw, ShieldCheck, Sparkles, Volume2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { tracks, type TrackId } from "@/lib/oxbridge-data"
import { interviewerPersonas, type InterviewMode, type InterviewPersonaKey } from "@/lib/coach-suite"
import { interviewProfileFor } from "@/lib/prep-suite"

type Phase = "lobby" | "connecting" | "live" | "ended"
type ConnectionState = "idle" | "connecting" | "connected" | "speaking" | "thinking" | "interviewer" | "error"
type GeminiVoice = "Gacrux" | "Sulafat" | "Sadaltager" | "Kore"
type TranscriptTurn = { id: string; role: "interviewer" | "candidate" | "system"; text: string }
type TokenResponse = { token?: string; model?: string; voice?: GeminiVoice; instructions?: string; error?: string }
type GeminiMessage = {
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

function resampleTo16k(input: Float32Array, inputRate: number) {
  const targetRate = 16000
  const outputLength = Math.max(1, Math.round(input.length * targetRate / inputRate))
  const output = new Int16Array(outputLength)
  for (let i = 0; i < outputLength; i += 1) {
    const position = i * (input.length - 1) / Math.max(1, outputLength - 1)
    const left = Math.floor(position)
    const right = Math.min(input.length - 1, left + 1)
    const mix = position - left
    const sample = input[left] * (1 - mix) + input[right] * mix
    const clipped = Math.max(-1, Math.min(1, sample))
    output[i] = clipped < 0 ? Math.round(clipped * 32768) : Math.round(clipped * 32767)
  }
  return output
}

function pcmToBase64(pcm: Int16Array) {
  const bytes = new Uint8Array(pcm.buffer, pcm.byteOffset, pcm.byteLength)
  let binary = ""
  for (let i = 0; i < bytes.length; i += 8192) {
    binary += String.fromCharCode(...Array.from(bytes.subarray(i, Math.min(bytes.length, i + 8192))))
  }
  return btoa(binary)
}

function base64ToFloat32(base64: string) {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  const view = new DataView(bytes.buffer)
  const samples = new Float32Array(Math.floor(bytes.byteLength / 2))
  for (let i = 0; i < samples.length; i += 1) samples[i] = view.getInt16(i * 2, true) / 32768
  return samples
}

export default function GeminiLiveInterviewPage() {
  const [phase, setPhase] = useState<Phase>("lobby")
  const [connectionState, setConnectionState] = useState<ConnectionState>("idle")
  const [track, setTrack] = useState<TrackId>("physical")
  const [course, setCourse] = useState("Physics")
  const [personaKey, setPersonaKey] = useState<InterviewPersonaKey>("Socratic")
  const [mode, setMode] = useState<InterviewMode>("Realistic")
  const [voice, setVoice] = useState<GeminiVoice>("Gacrux")
  const [muted, setMuted] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [notice, setNotice] = useState("")
  const [transcript, setTranscript] = useState<TranscriptTurn[]>([])
  const [candidateLiveTranscript, setCandidateLiveTranscript] = useState("")
  const [interviewerLiveTranscript, setInterviewerLiveTranscript] = useState("")
  const [connectedAt, setConnectedAt] = useState<number | null>(null)
  const [feedbackPending, setFeedbackPending] = useState(false)

  const wsRef = useRef<WebSocket | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const inputContextRef = useRef<AudioContext | null>(null)
  const outputContextRef = useRef<AudioContext | null>(null)
  const processorRef = useRef<ScriptProcessorNode | null>(null)
  const outputSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set())
  const nextAudioTimeRef = useRef(0)
  const outputTranscriptRef = useRef("")
  const transcriptRef = useRef<TranscriptTurn[]>([])
  const mutedRef = useRef(false)
  const modelSpeakingRef = useRef(false)
  const openingPendingRef = useRef(true)
  const feedbackPendingRef = useRef(false)
  const endingRef = useRef(false)

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(profileKey) || "{}") as { track?: TrackId; course?: string }
      if (saved.track) setTrack(saved.track)
      if (saved.course) setCourse(saved.course)
    } catch { /* defaults */ }
  }, [])

  useEffect(() => {
    if (!connectedAt || phase !== "live") return
    const id = window.setInterval(() => setSeconds(Math.floor((Date.now() - connectedAt) / 1000)), 1000)
    return () => window.clearInterval(id)
  }, [connectedAt, phase])

  useEffect(() => () => closeConnection(false), [])

  const profile = useMemo(() => interviewProfileFor(course, track), [course, track])
  const persona = interviewerPersonas[personaKey]
  const subjectCourses = tracks.find(item => item.id === track)?.courses ?? [course]

  const appendTurn = (role: TranscriptTurn["role"], text: string) => {
    const clean = text.trim()
    if (!clean) return
    const turn = { id: `${Date.now()}-${Math.random()}`, role, text: clean }
    transcriptRef.current = [...transcriptRef.current, turn]
    setTranscript(transcriptRef.current)
  }

  const stopOutputAudio = () => {
    for (const source of outputSourcesRef.current) {
      try { source.stop() } catch { /* already stopped */ }
    }
    outputSourcesRef.current.clear()
    if (outputContextRef.current) nextAudioTimeRef.current = outputContextRef.current.currentTime
  }

  const playPcmChunk = async (base64: string) => {
    let ctx = outputContextRef.current
    if (!ctx) {
      ctx = new AudioContext()
      outputContextRef.current = ctx
      nextAudioTimeRef.current = ctx.currentTime
    }
    if (ctx.state === "suspended") await ctx.resume()
    const samples = base64ToFloat32(base64)
    if (!samples.length) return
    const buffer = ctx.createBuffer(1, samples.length, 24000)
    buffer.copyToChannel(samples, 0)
    const source = ctx.createBufferSource()
    source.buffer = buffer
    source.connect(ctx.destination)
    const startAt = Math.max(ctx.currentTime + 0.02, nextAudioTimeRef.current)
    nextAudioTimeRef.current = startAt + buffer.duration
    outputSourcesRef.current.add(source)
    source.onended = () => outputSourcesRef.current.delete(source)
    source.start(startAt)
  }

  const startMicrophone = async (ws: WebSocket) => {
    if (processorRef.current) return
    const stream = streamRef.current ?? await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    })
    streamRef.current = stream

    const ctx = new AudioContext()
    inputContextRef.current = ctx
    if (ctx.state === "suspended") await ctx.resume()
    const source = ctx.createMediaStreamSource(stream)
    // 4096 input frames normally becomes about 1365-1486 frames at 16 kHz,
    // matching Google's recommended 1024-2048 frame Live API chunks.
    const processor = ctx.createScriptProcessor(4096, 1, 1)
    processorRef.current = processor
    const silentGain = ctx.createGain()
    silentGain.gain.value = 0

    processor.onaudioprocess = event => {
      if (ws.readyState !== WebSocket.OPEN || mutedRef.current || modelSpeakingRef.current || feedbackPendingRef.current) return
      const input = event.inputBuffer.getChannelData(0)
      const pcm = resampleTo16k(input, ctx.sampleRate)
      if (pcm.length < 1024) return
      ws.send(JSON.stringify({
        realtimeInput: {
          audio: {
            data: pcmToBase64(pcm),
            mimeType: "audio/pcm;rate=16000",
          },
        },
      }))
    }

    source.connect(processor)
    processor.connect(silentGain)
    silentGain.connect(ctx.destination)
  }

  const sendOpeningPrompt = (ws: WebSocket) => {
    openingPendingRef.current = true
    ws.send(JSON.stringify({
      clientContent: {
        turns: [{
          role: "user",
          parts: [{ text: `Begin the formal ${course} practice interview now. Give a brief, natural professional greeting, then ask exactly one challenging but accessible opening question appropriate to ${course}. Do not explain the answer.` }],
        }],
        turnComplete: true,
      },
    }))
  }

  const scheduleCloseAfterAudio = () => {
    const ctx = outputContextRef.current
    const waitMs = ctx ? Math.max(500, Math.ceil((nextAudioTimeRef.current - ctx.currentTime) * 1000) + 450) : 700
    window.setTimeout(() => closeConnection(true), waitMs)
  }

  const handleGeminiMessage = (message: GeminiMessage, ws: WebSocket) => {
    if (message.setupComplete) {
      setConnectionState("connected")
      setPhase("live")
      setConnectedAt(Date.now())
      appendTurn("system", "Gemini Live connected using a short-lived token. The app does not intentionally save microphone recordings.")
      sendOpeningPrompt(ws)
      return
    }

    if (message.goAway) {
      setNotice("Gemini Live is preparing to end this session. Finish your current answer or restart a new interview.")
    }

    const content = message.serverContent
    if (!content) return

    if (content.interrupted) {
      stopOutputAudio()
      modelSpeakingRef.current = false
      outputTranscriptRef.current = ""
      setInterviewerLiveTranscript("")
    }

    const interim = content.interimInputTranscription?.text?.trim()
    if (interim) {
      setCandidateLiveTranscript(interim)
      setConnectionState("speaking")
    }

    const candidateFinal = content.inputTranscription?.text?.trim()
    if (candidateFinal) {
      appendTurn("candidate", candidateFinal)
      setCandidateLiveTranscript("")
      setConnectionState("thinking")
    }

    const outputText = content.outputTranscription?.text
    if (outputText) {
      outputTranscriptRef.current += outputText
      setInterviewerLiveTranscript(outputTranscriptRef.current)
      setConnectionState("interviewer")
    }

    for (const part of content.modelTurn?.parts ?? []) {
      const audio = part.inlineData?.data
      if (audio) {
        modelSpeakingRef.current = true
        setConnectionState("interviewer")
        void playPcmChunk(audio)
      }
    }

    if (content.turnComplete) {
      const finalText = outputTranscriptRef.current.trim()
      if (finalText) appendTurn("interviewer", finalText)
      outputTranscriptRef.current = ""
      setInterviewerLiveTranscript("")
      modelSpeakingRef.current = false

      if (openingPendingRef.current) {
        openingPendingRef.current = false
        void startMicrophone(ws).then(() => setConnectionState("connected")).catch(error => {
          setNotice(error instanceof Error ? error.message : "Microphone could not start")
          setConnectionState("error")
        })
        return
      }

      if (feedbackPendingRef.current) {
        feedbackPendingRef.current = false
        setFeedbackPending(false)
        scheduleCloseAfterAudio()
        return
      }

      setConnectionState("connected")
    }
  }

  const startInterview = async () => {
    if (phase === "connecting") return
    setPhase("connecting")
    setConnectionState("connecting")
    setNotice("")
    transcriptRef.current = []
    setTranscript([])
    setCandidateLiveTranscript("")
    setInterviewerLiveTranscript("")
    setSeconds(0)
    setFeedbackPending(false)
    feedbackPendingRef.current = false
    endingRef.current = false
    openingPendingRef.current = true

    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error("Microphone access is not available in this browser.")
      // Ask for permission on the user click, but do not upload audio until the opening question is finished.
      streamRef.current = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      })

      const response = await fetch("/api/realtime-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ course, track, persona: personaKey, mode, voice }),
      })
      const data = await response.json() as TokenResponse
      if (!response.ok || !data.token || !data.model || !data.instructions) throw new Error(data.error || "Could not create the Gemini Live session.")

      const ws = new WebSocket(`wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContentConstrained?access_token=${encodeURIComponent(data.token)}`)
      wsRef.current = ws

      ws.onopen = () => {
        ws.send(JSON.stringify({
          setup: {
            model: `models/${data.model}`,
            generationConfig: {
              responseModalities: ["AUDIO"],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: data.voice || voice },
                },
              },
            },
            systemInstruction: { parts: [{ text: data.instructions }] },
            inputAudioTranscription: { mode: "SMART", languageCodes: ["en-GB"] },
            outputAudioTranscription: {},
            realtimeInputConfig: {
              automaticActivityDetection: {
                disabled: false,
                startOfSpeechSensitivity: "START_SENSITIVITY_LOW",
                endOfSpeechSensitivity: "END_SENSITIVITY_LOW",
                prefixPaddingMs: 160,
                silenceDurationMs: 1250,
              },
            },
          },
        }))
      }

      ws.onmessage = event => {
        try { handleGeminiMessage(JSON.parse(event.data) as GeminiMessage, ws) }
        catch (error) {
          console.error("Gemini Live message error", error)
          setNotice("Gemini sent an unexpected live message. The session can be restarted safely.")
        }
      }
      ws.onerror = () => {
        setConnectionState("error")
        setNotice("Gemini Live connection failed. Check that GEMINI_API_KEY is set on this deployment and that your browser allows microphone/WebSocket access.")
      }
      ws.onclose = event => {
        if (event.code !== 1000 && !endingRef.current) {
          setConnectionState("error")
          setNotice(event.reason || `Gemini Live connection closed unexpectedly (code ${event.code}).`)
        }
      }
    } catch (error) {
      closeConnection(false)
      setPhase("lobby")
      setConnectionState("error")
      setNotice(error instanceof Error ? error.message : "Could not start Gemini Live voice.")
    }
  }

  const toggleMute = () => {
    const next = !mutedRef.current
    mutedRef.current = next
    setMuted(next)
    streamRef.current?.getAudioTracks().forEach(trackItem => { trackItem.enabled = !next })
    if (next && wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ realtimeInput: { audioStreamEnd: true } }))
    }
  }

  const sendInterviewerNudge = () => {
    const ws = wsRef.current
    if (!ws || ws.readyState !== WebSocket.OPEN || feedbackPendingRef.current) return
    ws.send(JSON.stringify({
      clientContent: {
        turns: [{ role: "user", parts: [{ text: "Continue the interview. Briefly mention one specific thing about my most recent reasoning that I should notice, then ask exactly one natural follow-up question based on what I actually said. Do not give the answer." }] }],
        turnComplete: true,
      },
    }))
    setConnectionState("thinking")
  }

  const finishWithFeedback = () => {
    const ws = wsRef.current
    if (!ws || ws.readyState !== WebSocket.OPEN || feedbackPendingRef.current) return
    feedbackPendingRef.current = true
    setFeedbackPending(true)
    mutedRef.current = true
    setMuted(true)
    streamRef.current?.getAudioTracks().forEach(trackItem => { trackItem.enabled = false })
    ws.send(JSON.stringify({ realtimeInput: { audioStreamEnd: true } }))
    ws.send(JSON.stringify({
      clientContent: {
        turns: [{
          role: "user",
          parts: [{ text: "Finish the interview now. Give me a natural spoken debrief based only on this conversation: one specific reasoning strength, one specific weakness or missing habit, one concrete example from something I said, and one next practice action. Keep it concise and do not predict admissions outcomes. End by saying the practice interview is complete." }],
        }],
        turnComplete: true,
      },
    }))
    setConnectionState("thinking")
  }

  function closeConnection(save = true) {
    endingRef.current = true
    try { processorRef.current?.disconnect() } catch { /* ignore */ }
    processorRef.current = null
    streamRef.current?.getTracks().forEach(trackItem => trackItem.stop())
    streamRef.current = null
    if (inputContextRef.current) void inputContextRef.current.close().catch(() => {})
    inputContextRef.current = null
    stopOutputAudio()
    if (outputContextRef.current) void outputContextRef.current.close().catch(() => {})
    outputContextRef.current = null
    try { wsRef.current?.close(1000, "Interview ended") } catch { /* ignore */ }
    wsRef.current = null

    if (!save) return
    setPhase("ended")
    setConnectionState("idle")
    if (connectedAt) {
      try {
        const saved = JSON.parse(localStorage.getItem(progressKey) || "{}") as Record<string, unknown>
        const logs = Array.isArray(saved.logs) ? saved.logs as Array<Record<string, unknown>> : []
        const sessions = Number(saved.sessions ?? 0)
        const events = transcriptRef.current.filter(t => t.role !== "system").map(t => `${t.role === "candidate" ? "Candidate" : "Interviewer"}: ${t.text}`)
        localStorage.setItem(progressKey, JSON.stringify({
          ...saved,
          sessions: sessions + 1,
          logs: [{ id: `gemini-live-${Date.now()}`, title: `Gemini Live Interview · ${course}`, score: 0, date: new Date().toLocaleDateString("en-GB"), events: [...events, `Duration: ${formatTime(seconds)}`, `Voice: ${voice}`] }, ...logs].slice(0, 40),
        }))
      } catch { /* session still ends */ }
    }
  }

  const statusLabel = connectionState === "speaking" ? "You are speaking" : connectionState === "thinking" ? "Interviewer is thinking" : connectionState === "interviewer" ? "Interviewer is speaking" : connectionState === "connected" ? "Live and listening" : connectionState === "connecting" ? "Connecting" : connectionState === "error" ? "Connection issue" : "Ready"

  if (phase === "lobby" || phase === "connecting") return <main className="min-h-screen bg-[#f2f5f5] text-[#172b3a]">
    <div className="mx-auto max-w-6xl px-4 py-7 sm:px-6 lg:px-8 lg:py-11">
      <div className="mb-7 flex items-center justify-between gap-3"><Link href="/interviews" className="inline-flex items-center gap-2 text-sm font-semibold text-[#526a75]"><ArrowLeft className="size-4" />Interview Hub</Link><Badge className="border-0 bg-[#102a43] text-white"><AudioLines className="mr-1 size-3" />Gemini 3.8 Live</Badge></div>
      <section className="grid overflow-hidden rounded-[2rem] border border-[#dbe5e7] bg-white shadow-[0_30px_90px_rgba(16,42,67,.09)] lg:grid-cols-[1.1fr_.9fr]">
        <div className="p-6 sm:p-9 lg:p-12"><div className="mb-7 flex items-center gap-3"><span className="grid size-12 place-items-center rounded-2xl bg-[#102a43] text-[#8dd7de]"><Headphones className="size-5" /></span><div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#147d91]">Gemini Live Interview</p><h1 className="font-serif text-3xl font-bold sm:text-4xl">Speak naturally. Get challenged naturally.</h1></div></div><p className="max-w-2xl text-base leading-7 text-[#667984]">Continuous Gemini audio-to-audio interviewing. Each substantive answer receives a brief spoken observation followed by one follow-up question based on your actual reasoning.</p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2"><label className="space-y-1.5"><span className="text-xs font-bold uppercase tracking-wider text-[#667984]">Subject family</span><NativeSelect value={track} onChange={e => { const next=e.target.value as TrackId; setTrack(next); const found=tracks.find(t=>t.id===next); if(found) setCourse(found.courses[0]) }}>{tracks.map(t => <NativeSelectOption key={t.id} value={t.id}>{t.short}</NativeSelectOption>)}</NativeSelect></label><label className="space-y-1.5"><span className="text-xs font-bold uppercase tracking-wider text-[#667984]">Course</span><NativeSelect value={course} onChange={e => setCourse(e.target.value)}>{subjectCourses.map(c => <NativeSelectOption key={c}>{c}</NativeSelectOption>)}</NativeSelect></label><label className="space-y-1.5"><span className="text-xs font-bold uppercase tracking-wider text-[#667984]">Interviewer style</span><NativeSelect value={personaKey} onChange={e => setPersonaKey(e.target.value as InterviewPersonaKey)}>{Object.keys(interviewerPersonas).map(p => <NativeSelectOption key={p}>{p}</NativeSelectOption>)}</NativeSelect></label><label className="space-y-1.5"><span className="text-xs font-bold uppercase tracking-wider text-[#667984]">Session</span><NativeSelect value={mode} onChange={e => setMode(e.target.value as InterviewMode)}>{["Tutor","Realistic","No-hint","Stress"].map(m => <NativeSelectOption key={m}>{m}</NativeSelectOption>)}</NativeSelect></label><label className="space-y-1.5 sm:col-span-2"><span className="text-xs font-bold uppercase tracking-wider text-[#667984]">Gemini voice</span><NativeSelect value={voice} onChange={e => setVoice(e.target.value as GeminiVoice)}>{Object.entries(voiceLabels).map(([key,label]) => <NativeSelectOption key={key} value={key}>{label}</NativeSelectOption>)}</NativeSelect></label></div>
          {notice && <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm leading-5 text-amber-900">{notice}</div>}
          <div className="mt-7 flex flex-wrap gap-2"><Button className="h-12 rounded-xl px-6" onClick={startInterview} disabled={phase === "connecting"}>{phase === "connecting" ? <><Loader2 className="animate-spin" />Connecting Gemini…</> : <><Mic />Start Gemini Live interview</>}</Button>{notice && <Button variant="outline" asChild><Link href="/natural-ai-interview"><Sparkles />Use Gemini TTS fallback</Link></Button>}</div>
        </div>
        <aside className="border-t bg-[#102a43] p-6 text-white sm:p-9 lg:border-l lg:border-t-0 lg:p-10"><Badge className="border-white/15 bg-white/10 text-white">{persona.label}</Badge><h2 className="mt-5 font-serif text-2xl font-bold">More like a tutorial conversation</h2><div className="mt-6 space-y-4 text-sm leading-6 text-blue-50/75"><p><strong className="text-white">Specific spoken feedback.</strong> The interviewer briefly notices something real in your answer before asking the next question.</p><p><strong className="text-white">Patient pauses.</strong> Turn detection allows longer thinking gaps before deciding your answer is finished.</p><p><strong className="text-white">Less echo.</strong> Your microphone is not uploaded while Gemini itself is speaking, reducing self-listening and duplicated turns.</p></div><div className="mt-7 rounded-2xl bg-white/8 p-4 text-sm"><ShieldCheck className="mb-2 size-5 text-[#8dd7de]" /><p className="font-semibold">Server-kept API key</p><p className="mt-1 leading-5 text-white/65">The browser receives a short-lived Live token, not your long-lived Gemini key.</p></div></aside>
      </section>
    </div>
  </main>

  if (phase === "ended") return <main className="min-h-screen bg-[#f2f5f5] text-[#172b3a]"><div className="mx-auto max-w-4xl px-4 py-12 sm:px-6"><Card className="border-0 shadow-[0_24px_70px_rgba(16,42,67,.08)]"><CardHeader><Badge className="w-fit">Session complete</Badge><CardTitle className="font-serif text-3xl">Gemini Live interview finished</CardTitle><CardDescription>{course} · {persona.label} · {voice} · {formatTime(seconds)}</CardDescription></CardHeader><CardContent className="space-y-5"><div className="grid gap-3 sm:grid-cols-3"><div className="rounded-2xl bg-[#edf7f8] p-4"><p className="text-xs uppercase tracking-wider text-[#657582]">Duration</p><p className="mt-1 text-2xl font-bold">{formatTime(seconds)}</p></div><div className="rounded-2xl bg-[#edf7f8] p-4"><p className="text-xs uppercase tracking-wider text-[#657582]">Transcript turns</p><p className="mt-1 text-2xl font-bold">{transcript.filter(t=>t.role!=="system").length}</p></div><div className="rounded-2xl bg-[#edf7f8] p-4"><p className="text-xs uppercase tracking-wider text-[#657582]">Voice</p><p className="mt-1 text-sm font-semibold">{voice}</p></div></div><div className="rounded-2xl border p-4 text-sm leading-6 text-[#60737d]"><CheckCircle2 className="mb-2 size-5 text-emerald-700" />Your live transcript is saved locally to practice history when available, including the final spoken debrief.</div><div className="flex flex-wrap gap-2"><Button onClick={() => { endingRef.current=false; openingPendingRef.current=true; feedbackPendingRef.current=false; mutedRef.current=false; transcriptRef.current=[]; setPhase("lobby"); setConnectionState("idle"); setTranscript([]); setCandidateLiveTranscript(""); setInterviewerLiveTranscript(""); setNotice(""); setMuted(false); setConnectedAt(null); setSeconds(0); setFeedbackPending(false) }}><RefreshCw />New Gemini Live interview</Button><Button variant="outline" asChild><Link href="/natural-ai-interview"><Brain />Gemini TTS fallback</Link></Button><Button variant="outline" asChild><Link href="/interviews">Interview Hub</Link></Button></div></CardContent></Card></div></main>

  return <main className="min-h-screen bg-[#eef3f3] text-[#172b3a]">
    <div className="sticky top-0 z-30 border-b border-[#dbe5e7] bg-white/95 backdrop-blur"><div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8"><div className="flex min-w-0 items-center gap-3"><span className="grid size-9 flex-none place-items-center rounded-xl bg-[#102a43] text-[#8dd7de]"><GraduationCap className="size-4" /></span><div className="min-w-0"><p className="truncate text-sm font-bold">Gemini Live · {course}</p><p className="truncate text-xs text-[#71828a]">{persona.label} · {voice}</p></div></div><div className="flex items-center gap-2"><Badge variant="outline" className={connectionState === "error" ? "border-red-300 text-red-700" : ""}>{statusLabel}</Badge><span className="inline-flex items-center gap-1.5 rounded-full border bg-white px-3 py-1.5 text-sm font-bold tabular-nums"><Clock3 className="size-4 text-[#147d91]" />{formatTime(seconds)}</span></div></div></div>
    <div className="mx-auto grid max-w-7xl gap-5 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:px-8 lg:py-8"><Card className="min-h-[620px] overflow-hidden border-[#d7e2e4] shadow-[0_16px_50px_rgba(16,42,67,.06)]"><CardHeader className="border-b bg-white p-5 sm:p-7"><div className="flex flex-wrap gap-2"><Badge>{mode}</Badge><Badge variant="outline">{personaKey}</Badge><Badge variant="outline">Gemini 3.8 Live</Badge></div><p className="mt-5 text-xs font-bold uppercase tracking-[.16em] text-[#147d91]">Conversation</p><CardTitle className="mt-2 font-serif text-2xl sm:text-3xl">Think aloud. The interviewer reacts to your reasoning.</CardTitle><CardDescription>After each substantive answer, expect a brief specific spoken observation and one follow-up based on what you actually said.</CardDescription></CardHeader><CardContent className="space-y-4 p-5 sm:p-7">{notice && <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{notice}</div>}<div className="max-h-[420px] space-y-3 overflow-y-auto rounded-2xl bg-[#f8fafb] p-4">{transcript.length === 0 && !interviewerLiveTranscript && !candidateLiveTranscript && <div className="grid min-h-64 place-items-center text-center"><div><Volume2 className="mx-auto size-8 text-[#147d91]" /><p className="mt-3 text-sm font-semibold">The interviewer is preparing the opening question…</p></div></div>}{transcript.map(turn => <div key={turn.id} className={`rounded-2xl p-4 ${turn.role === "interviewer" ? "bg-white shadow-sm" : turn.role === "candidate" ? "ml-auto max-w-[90%] bg-[#102a43] text-white" : "border border-[#cfe4e6] bg-[#edf7f8] text-[#526a75]"}`}><p className={`mb-1 text-[11px] font-bold uppercase tracking-wider ${turn.role === "candidate" ? "text-[#8dd7de]" : "text-[#147d91]"}`}>{turn.role}</p><p className="text-sm leading-6">{turn.text}</p></div>)}{candidateLiveTranscript && <div className="ml-auto max-w-[90%] rounded-2xl bg-[#102a43]/80 p-4 text-white"><p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-[#8dd7de]">You · live</p><p className="text-sm leading-6">{candidateLiveTranscript}</p></div>}{interviewerLiveTranscript && <div className="rounded-2xl bg-white p-4 shadow-sm"><p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-[#147d91]">Interviewer · live</p><p className="text-sm leading-6">{interviewerLiveTranscript}</p></div>}</div><div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4"><div className="flex flex-wrap gap-2"><Button variant="outline" onClick={toggleMute} disabled={feedbackPending}>{muted ? <MicOff /> : <Mic />}{muted ? "Unmute" : "Mute"}</Button><Button variant="outline" onClick={sendInterviewerNudge} disabled={feedbackPending || connectionState === "interviewer"}><Sparkles />Prompt follow-up</Button></div><div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => closeConnection(true)} disabled={feedbackPending}><PhoneOff />End now</Button><Button onClick={finishWithFeedback} disabled={feedbackPending}>{feedbackPending ? <><Loader2 className="animate-spin" />Giving feedback…</> : <><Brain />Finish + verbal feedback</>}</Button></div></div></CardContent></Card>
      <aside className="space-y-4"><Card><CardHeader><CardTitle className="text-base">Interviewer profile</CardTitle></CardHeader><CardContent className="space-y-3 text-sm"><div><p className="font-semibold">{profile.interviewer}</p><p className="text-[#71828a]">{persona.description}</p></div><div className="rounded-xl bg-[#edf7f8] p-3 text-[#526a75]">The interviewer should notice your actual reasoning before choosing the next challenge.</div></CardContent></Card><Card><CardHeader><CardTitle className="text-base">Natural conversation rules</CardTitle></CardHeader><CardContent className="space-y-2 text-sm leading-5 text-[#60737d]"><p>• One question at a time.</p><p>• Specific feedback, not generic praise.</p><p>• Longer thinking pauses before turn-end.</p><p>• Follow-ups tied to your last answer.</p><p>• Final verbal debrief on request.</p></CardContent></Card></aside>
    </div>
  </main>
}

"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { ArrowLeft, Brain, Camera, CameraOff, CheckCircle2, Gauge, Headphones, Loader2, Mic, MicOff, PhoneOff, RefreshCw, ScanSearch, Users, Volume2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { tracks, type TrackId } from "@/lib/oxbridge-data"
import { interviewerPersonas, type InterviewMode, type InterviewPersonaKey } from "@/lib/coach-suite"
import { PROFILE_KEY, PROGRESS_KEY } from "@/lib/personal-tutor"
import { INTERVIEW_CONTEXT_KEY, LIVE_REPLAY_KEY, ORAL_RETEST_KEY, buildReasoningReplay, oralRetestFromReplay, type LiveTurnRecord, type OralRetest } from "@/lib/nextgen-prep"

type Phase = "lobby" | "connecting" | "live" | "ended"
type State = "idle" | "connecting" | "connected" | "speaking" | "thinking" | "interviewer" | "error"
type GeminiVoice = "Gacrux" | "Sulafat" | "Sadaltager" | "Kore"
type Turn = LiveTurnRecord
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

type ContextPayload = { source?: string; title?: string; material?: string; prompts?: string[]; notes?: string; course?: string }

const voiceLabels: Record<GeminiVoice, string> = {
  Gacrux: "Gacrux · mature academic",
  Sulafat: "Sulafat · warm conversational",
  Sadaltager: "Sadaltager · knowledgeable measured",
  Kore: "Kore · firm probing",
}

function formatTime(seconds: number) { return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}` }

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

function parsePanelPrefix(text: string) {
  const clean = text.trim()
  if (/^A:\s*/i.test(clean)) return { interviewer: "A" as const, text: clean.replace(/^A:\s*/i, "") }
  if (/^B:\s*/i.test(clean)) return { interviewer: "B" as const, text: clean.replace(/^B:\s*/i, "") }
  return { interviewer: undefined, text: clean }
}

function splitFeedbackAndQuestion(text: string) {
  const clean = text.replace(/\s+/g, " ").trim()
  const panel = parsePanelPrefix(clean)
  const sentence = panel.text.match(/^(.+?[.!])\s+([\s\S]+)$/)
  if (sentence) return { feedback: sentence[1].trim(), followUp: sentence[2].trim(), interviewer: panel.interviewer }
  const questionIndex = panel.text.indexOf("?")
  if (questionIndex > 0) return { feedback: "", followUp: panel.text.slice(0, questionIndex + 1).trim(), interviewer: panel.interviewer }
  return { feedback: panel.text, followUp: "", interviewer: panel.interviewer }
}

function readContext() {
  try { return JSON.parse(localStorage.getItem(INTERVIEW_CONTEXT_KEY) || "{}") as ContextPayload } catch { return {} }
}

function readDueRetest(course: string) {
  try {
    const value = JSON.parse(localStorage.getItem(ORAL_RETEST_KEY) || "[]")
    if (!Array.isArray(value)) return null
    return (value as OralRetest[]).find(item => !item.completedAt && item.course === course && new Date(item.dueAt).getTime() <= Date.now()) ?? null
  } catch { return null }
}

export default function GeminiLiveNextPage() {
  const [phase, setPhase] = useState<Phase>("lobby")
  const [status, setStatus] = useState<State>("idle")
  const [track, setTrack] = useState<TrackId>("physical")
  const [course, setCourse] = useState("Physics")
  const [personaKey, setPersonaKey] = useState<InterviewPersonaKey>("Socratic")
  const [mode, setMode] = useState<InterviewMode>("Realistic")
  const [voice, setVoice] = useState<GeminiVoice>("Gacrux")
  const [panelMode, setPanelMode] = useState(false)
  const [muted, setMuted] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [notice, setNotice] = useState("")
  const [turns, setTurns] = useState<Turn[]>([])
  const [candidateLive, setCandidateLive] = useState("")
  const [interviewerLive, setInterviewerLive] = useState("")
  const [connectedAt, setConnectedAt] = useState<number | null>(null)
  const [configured, setConfigured] = useState<boolean | null>(null)
  const [serverModel, setServerModel] = useState("gemini-3.8-live")
  const [contextPayload, setContextPayload] = useState<ContextPayload>({})
  const [retestFocus, setRetestFocus] = useState("")
  const [cameraOn, setCameraOn] = useState(false)
  const [cameraAnalysing, setCameraAnalysing] = useState(false)
  const [workingAnalysis, setWorkingAnalysis] = useState("")
  const [confidenceTarget, setConfidenceTarget] = useState<string | null>(null)

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const cameraStreamRef = useRef<MediaStream | null>(null)
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

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(PROFILE_KEY) || "{}") as { track?: TrackId; course?: string }
      const nextTrack = saved.track ?? "physical"
      const nextCourse = saved.course ?? "Physics"
      setTrack(nextTrack)
      setCourse(nextCourse)
      setRetestFocus(readDueRetest(nextCourse)?.focus ?? "")
    } catch {}
    setContextPayload(readContext())
    fetch("/api/realtime-session").then(async response => response.ok ? response.json() as Promise<ConfigResponse> : { configured: false }).then(data => { setConfigured(Boolean(data.configured)); if (data.model) setServerModel(data.model) }).catch(() => setConfigured(false))
  }, [])

  useEffect(() => {
    if (!connectedAt || phase !== "live") return
    const timer = window.setInterval(() => setSeconds(Math.floor((Date.now() - connectedAt) / 1000)), 1000)
    return () => window.clearInterval(timer)
  }, [connectedAt, phase])

  useEffect(() => () => close(false), [])

  const courses = tracks.find(item => item.id === track)?.courses ?? [course]

  function syncTurns(next: Turn[]) { turnsRef.current = next; setTurns(next) }
  function addTurn(role: Turn["role"], text: string, extra: Partial<Turn> = {}) {
    const clean = text.replace(/\s+/g, " ").trim()
    if (!clean) return null
    const id = `${Date.now()}-${Math.random()}`
    syncTurns([...turnsRef.current, { id, role, text: clean, createdAt: new Date().toISOString(), ...extra }])
    return id
  }
  function patchTurn(id: string | null, patch: Partial<Turn>) { if (!id) return; syncTurns(turnsRef.current.map(turn => turn.id === id ? { ...turn, ...patch } : turn)) }

  function stopOutput() {
    playbackEpochRef.current += 1
    for (const source of outputSourcesRef.current) { try { source.stop() } catch {} }
    outputSourcesRef.current.clear()
    if (outputCtxRef.current) nextAudioRef.current = outputCtxRef.current.currentTime
    if (typeof window !== "undefined") window.speechSynthesis?.cancel()
  }

  async function playAudio(base64: string) {
    if (panelMode) return
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
    source.onended = () => outputSourcesRef.current.delete(source)
    source.start(startAt)
  }

  function speakPanel(text: string, interviewer?: "A" | "B") {
    if (!panelMode || typeof window === "undefined" || !window.speechSynthesis) return
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = "en-GB"
    const voices = window.speechSynthesis.getVoices().filter(item => item.lang.toLowerCase().startsWith("en"))
    if (voices.length) utterance.voice = interviewer === "B" ? voices[Math.min(1, voices.length - 1)] : voices[0]
    utterance.rate = interviewer === "B" ? 1.03 : 0.96
    window.speechSynthesis.speak(utterance)
  }

  async function startMic(ws: WebSocket) {
    if (processorRef.current) return
    const stream = streamRef.current ?? await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } })
    streamRef.current = stream
    let ctx = inputCtxRef.current
    if (!ctx) { ctx = new AudioContext(); inputCtxRef.current = ctx }
    if (ctx.state === "suspended") await ctx.resume()
    if (wsRef.current !== ws || endingRef.current) return
    const source = ctx.createMediaStreamSource(stream)
    const processor = ctx.createScriptProcessor(1024, 1, 1)
    const silent = ctx.createGain(); silent.gain.value = 0
    micSourceRef.current = source; processorRef.current = processor; silentGainRef.current = silent
    processor.onaudioprocess = event => {
      if (ws.readyState !== WebSocket.OPEN || mutedRef.current || endingRef.current) return
      const pcm = resample16k(event.inputBuffer.getChannelData(0), ctx!.sampleRate)
      if (pcm.length) ws.send(JSON.stringify({ realtimeInput: { audio: { data: pcmToBase64(pcm), mimeType: "audio/pcm;rate=16000" } } }))
    }
    source.connect(processor); processor.connect(silent); silent.connect(ctx.destination)
  }

  function sendOpening(ws: WebSocket) {
    openingRef.current = true
    const contextHint = contextPayload.material ? " Start with the unseen material already provided in your system instructions." : ""
    ws.send(JSON.stringify({ clientContent: { turns: [{ role: "user", parts: [{ text: `Begin the formal ${course} practice interview now.${contextHint} Give a brief natural greeting and then ask exactly one challenging but accessible opening question.` }] }], turnComplete: true } }))
  }

  function handleMessage(message: GeminiMessage, ws: WebSocket) {
    if (wsRef.current !== ws) return
    if (message.error) { failConnection(message.error.message || "Gemini rejected the live session."); return }
    if (message.setupComplete) {
      if (setupTimerRef.current) clearTimeout(setupTimerRef.current)
      setStatus("connected"); setPhase("live"); startedAtRef.current = Date.now(); setConnectedAt(startedAtRef.current)
      addTurn("system", `Gemini Live connected using ${serverModel}. Camera images are only captured when you press Analyse working.`)
      void startMic(ws).then(() => { if (wsRef.current === ws && ws.readyState === WebSocket.OPEN) sendOpening(ws) }).catch(error => failConnection(error instanceof Error ? error.message : "Microphone could not start"))
      return
    }
    if (message.goAway) setNotice("Gemini Live is preparing to end this session. Finish the current turn or start a new interview.")
    const content = message.serverContent
    if (!content) return
    if (content.interrupted) { stopOutput(); modelSpeakingRef.current = false; outputTextRef.current = ""; setInterviewerLive("") }
    const interim = content.interimInputTranscription?.text?.trim()
    if (interim) { setCandidateLive(interim); setStatus("speaking") }
    const input = content.inputTranscription?.text
    if (input) { inputTextRef.current += input; setCandidateLive(inputTextRef.current); setStatus("speaking") }
    if (inputTextRef.current && (content.outputTranscription?.text || content.modelTurn || content.turnComplete)) {
      const id = addTurn("candidate", inputTextRef.current)
      lastCandidateIdRef.current = id
      setConfidenceTarget(id)
      inputTextRef.current = ""; setCandidateLive("")
    }
    const output = content.outputTranscription?.text
    if (output) { const current = outputTextRef.current; outputTextRef.current = output.startsWith(current) ? output : `${current}${output}`; setInterviewerLive(outputTextRef.current); setStatus("interviewer") }
    for (const part of content.modelTurn?.parts ?? []) { const audio = part.inlineData?.data; if (audio) { modelSpeakingRef.current = true; setStatus("interviewer"); void playAudio(audio) } }
    if (!content.turnComplete) return
    const finalOutput = outputTextRef.current.replace(/\s+/g, " ").trim()
    if (finalOutput) {
      const parsed = splitFeedbackAndQuestion(finalOutput)
      const shown = parsed.followUp ? `${parsed.feedback} ${parsed.followUp}`.trim() : parsed.feedback
      addTurn("interviewer", shown, { interviewer: parsed.interviewer })
      if (!openingRef.current && lastCandidateIdRef.current && parsed.feedback) patchTurn(lastCandidateIdRef.current, { feedback: parsed.feedback })
      if (panelMode) speakPanel(shown, parsed.interviewer)
    }
    outputTextRef.current = ""; setInterviewerLive(""); modelSpeakingRef.current = false
    if (openingRef.current) { openingRef.current = false; setStatus("connected"); return }
    if (endingRef.current) { window.setTimeout(() => close(true), 900); return }
    setStatus("connected")
  }

  function failConnection(message: string) { close(false); setPhase("lobby"); setStatus("error"); setNotice(message) }

  async function start() {
    if (phase === "connecting") return
    if (configured === false) { setNotice("Gemini Live is not configured on this deployment."); setStatus("error"); return }
    close(false)
    const generation = generationRef.current
    savedRef.current = false; mutedRef.current = false; setMuted(false); inputTextRef.current = ""; outputTextRef.current = ""; startedAtRef.current = null; setConnectedAt(null); setPhase("connecting"); setStatus("connecting"); setNotice(""); syncTurns([]); setCandidateLive(""); setInterviewerLive(""); setSeconds(0); openingRef.current = true; endingRef.current = false; lastCandidateIdRef.current = null; setWorkingAnalysis(""); setConfidenceTarget(null)
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error("Microphone access is not available in this browser.")
      const outputCtx = new AudioContext(); outputCtxRef.current = outputCtx; await outputCtx.resume(); nextAudioRef.current = outputCtx.currentTime
      const inputCtx = new AudioContext(); inputCtxRef.current = inputCtx; await inputCtx.resume()
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } })
      if (generation !== generationRef.current) { stream.getTracks().forEach(track => track.stop()); return }
      streamRef.current = stream
      const response = await fetch("/api/realtime-session", { method: "POST", signal: AbortSignal.timeout(30000), headers: { "Content-Type": "application/json" }, body: JSON.stringify({ course, track, persona: personaKey, mode, voice, panel: panelMode, material: contextPayload.material || "", preparationNotes: contextPayload.notes || "", focus: retestFocus }) })
      const data = await response.json() as TokenResponse
      if (generation !== generationRef.current) return
      if (!response.ok || !data.token || !data.model || !data.instructions) throw new Error(data.error || "Could not create the Gemini Live session.")
      setServerModel(data.model)
      const socketUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContentConstrained?access_token=${encodeURIComponent(data.token)}`
      const ws = new WebSocket(socketUrl); wsRef.current = ws; ws.binaryType = "arraybuffer"
      setupTimerRef.current = setTimeout(() => { if (wsRef.current === ws) failConnection("Gemini did not finish connecting. Please try again.") }, 20000)
      ws.onopen = () => {
        if (wsRef.current !== ws) return
        setStatus("connecting")
        ws.send(JSON.stringify({ setup: { model: `models/${data.model}`, generationConfig: { responseModalities: ["AUDIO"], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: data.voice || voice } } } }, systemInstruction: { parts: [{ text: data.instructions }] }, realtimeInputConfig: { automaticActivityDetection: { disabled: false, startOfSpeechSensitivity: "START_SENSITIVITY_LOW", endOfSpeechSensitivity: "END_SENSITIVITY_LOW", prefixPaddingMs: 300, silenceDurationMs: 1200 }, activityHandling: "START_OF_ACTIVITY_INTERRUPTS" }, inputAudioTranscription: {}, outputAudioTranscription: {} } }))
      }
      let messages = Promise.resolve()
      ws.onmessage = event => { messages = messages.then(async () => { const raw = typeof event.data === "string" ? event.data : event.data instanceof Blob ? await event.data.text() : new TextDecoder().decode(event.data); if (wsRef.current === ws) handleMessage(JSON.parse(raw) as GeminiMessage, ws) }).catch(() => { if (wsRef.current === ws) failConnection("Could not read the Gemini audio stream. Please restart the interview.") }) }
      ws.onerror = () => { if (wsRef.current === ws) failConnection("Gemini Live could not connect. Please retry.") }
      ws.onclose = event => { if (wsRef.current !== ws) return; if (endingRef.current) { close(true); return }; failConnection(event.reason || `Gemini Live disconnected (code ${event.code}).`) }
    } catch (error) { if (generation !== generationRef.current) return; close(false); setPhase("lobby"); setStatus("error"); setNotice(error instanceof Error ? error.message : "Could not start Gemini Live voice.") }
  }

  async function toggleCamera() {
    if (cameraOn) {
      cameraStreamRef.current?.getTracks().forEach(track => track.stop()); cameraStreamRef.current = null; if (videoRef.current) videoRef.current.srcObject = null; setCameraOn(false); return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false })
      cameraStreamRef.current = stream
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play() }
      setCameraOn(true)
    } catch { setNotice("Camera access was not available. You can continue the interview without it.") }
  }

  async function analyseCameraWorking() {
    const video = videoRef.current
    if (!video || !cameraOn || cameraAnalysing) return
    setCameraAnalysing(true)
    try {
      const canvas = document.createElement("canvas")
      canvas.width = video.videoWidth || 1280; canvas.height = video.videoHeight || 720
      const ctx = canvas.getContext("2d")
      if (!ctx) return
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      const image = canvas.toDataURL("image/jpeg", 0.86)
      const response = await fetch("/api/analyse-working", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ image, subject: course, context: `This is a still camera snapshot voluntarily captured during a live ${course} interview. Analyse only visible academic working, graph, diagram or notes. Do not comment on the student's appearance.` }) })
      const data = await response.json() as { analysis?: string; error?: string }
      const analysis = data.analysis || data.error || "No working analysis was returned."
      setWorkingAnalysis(analysis)
      if (lastCandidateIdRef.current) patchTurn(lastCandidateIdRef.current, { workingSummary: analysis })
      const ws = wsRef.current
      if (response.ok && ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ clientContent: { turns: [{ role: "user", parts: [{ text: `Camera working analysis from a still image the candidate chose to share:\n${analysis}\nUse only this summary as evidence about the visible working. Ask one academically useful follow-up grounded in it; do not comment on appearance.` }] }], turnComplete: true } }))
    } catch { setWorkingAnalysis("The camera snapshot could not be analysed. The live interview can continue normally.") } finally { setCameraAnalysing(false) }
  }

  function setConfidence(value: number) { if (!confidenceTarget) return; patchTurn(confidenceTarget, { confidence: value }); setConfidenceTarget(null) }

  function toggleMute() { const next = !mutedRef.current; mutedRef.current = next; setMuted(next); streamRef.current?.getAudioTracks().forEach(track => { track.enabled = !next }); if (next && wsRef.current?.readyState === WebSocket.OPEN) wsRef.current.send(JSON.stringify({ realtimeInput: { audioStreamEnd: true } })) }

  function finishInterview() {
    const ws = wsRef.current
    if (!ws || ws.readyState !== WebSocket.OPEN || endingRef.current) { close(true); return }
    finishTimerRef.current = setTimeout(() => close(true), 20000)
    endingRef.current = true; mutedRef.current = true; setMuted(true); streamRef.current?.getAudioTracks().forEach(track => { track.enabled = false }); setStatus("thinking")
    ws.send(JSON.stringify({ realtimeInput: { audioStreamEnd: true } }))
    ws.send(JSON.stringify({ clientContent: { turns: [{ role: "user", parts: [{ text: "The candidate has chosen to end the interview. Give the concise final spoken debrief described in your instructions, then clearly say that the interview is complete. Do not ask another question." }] }], turnComplete: true } }))
  }

  function saveProgress() {
    if (!turnsRef.current.length || savedRef.current) return
    savedRef.current = true
    const duration = startedAtRef.current ? Math.max(0, Math.round((Date.now() - startedAtRef.current) / 1000)) : seconds
    const replay = buildReasoningReplay(course, turnsRef.current, duration)
    try {
      const existingReplays = JSON.parse(localStorage.getItem(LIVE_REPLAY_KEY) || "[]")
      const replays = Array.isArray(existingReplays) ? existingReplays : []
      localStorage.setItem(LIVE_REPLAY_KEY, JSON.stringify([replay, ...replays].slice(0, 30)))
      const oldRetestsRaw = JSON.parse(localStorage.getItem(ORAL_RETEST_KEY) || "[]")
      const oldRetests = Array.isArray(oldRetestsRaw) ? oldRetestsRaw : []
      localStorage.setItem(ORAL_RETEST_KEY, JSON.stringify([oralRetestFromReplay(replay), ...oldRetests].slice(0, 40)))
      const saved = JSON.parse(localStorage.getItem(PROGRESS_KEY) || "{}") as Record<string, unknown>
      const logs = Array.isArray(saved.logs) ? saved.logs as Array<Record<string, unknown>> : []
      const events = turnsRef.current.filter(turn => turn.role !== "system").map(turn => `${turn.role === "candidate" ? "Candidate" : `Interviewer ${turn.interviewer ?? ""}`.trim()}: ${turn.text}${turn.feedback ? ` | Feedback: ${turn.feedback}` : ""}${typeof turn.confidence === "number" ? ` | Confidence: ${turn.confidence}%` : ""}`)
      localStorage.setItem(PROGRESS_KEY, JSON.stringify({ ...saved, sessions: Number(saved.sessions ?? 0) + 1, logs: [{ id: replay.id, title: `Gemini Live Next · ${course}`, score: 0, date: new Date().toLocaleDateString("en-GB"), events, replayId: replay.id }, ...logs].slice(0, 50) }))
      if (contextPayload.material) localStorage.removeItem(INTERVIEW_CONTEXT_KEY)
      if (retestFocus) {
        const raw = JSON.parse(localStorage.getItem(ORAL_RETEST_KEY) || "[]")
        if (Array.isArray(raw)) localStorage.setItem(ORAL_RETEST_KEY, JSON.stringify((raw as OralRetest[]).map(item => item.focus === retestFocus && !item.completedAt ? { ...item, completedAt: new Date().toISOString() } : item)))
      }
    } catch {}
  }

  function close(save = true) {
    if (save) saveProgress()
    generationRef.current += 1
    if (setupTimerRef.current) clearTimeout(setupTimerRef.current); if (finishTimerRef.current) clearTimeout(finishTimerRef.current)
    setupTimerRef.current = null; finishTimerRef.current = null; endingRef.current = true
    const ws = wsRef.current; wsRef.current = null; try { ws?.close(1000, "Interview ended") } catch {}
    stopOutput(); try { processorRef.current?.disconnect() } catch {}; try { micSourceRef.current?.disconnect() } catch {}; try { silentGainRef.current?.disconnect() } catch {}
    processorRef.current = null; micSourceRef.current = null; silentGainRef.current = null
    streamRef.current?.getTracks().forEach(track => track.stop()); streamRef.current = null
    cameraStreamRef.current?.getTracks().forEach(track => track.stop()); cameraStreamRef.current = null; setCameraOn(false)
    void inputCtxRef.current?.close().catch(() => {}); void outputCtxRef.current?.close().catch(() => {}); inputCtxRef.current = null; outputCtxRef.current = null
    if (save) { setPhase("ended"); setStatus("idle") }
  }

  function reset() { close(false); setPhase("lobby"); setStatus("idle"); setNotice(""); setSeconds(0); setConnectedAt(null); syncTurns([]); endingRef.current = false; mutedRef.current = false; setMuted(false); setWorkingAnalysis(""); setConfidenceTarget(null) }

  const statusLabel = status === "speaking" ? "Listening to you" : status === "thinking" ? "Interviewer is thinking" : status === "interviewer" ? "Interviewer is speaking" : status === "connected" ? "Live and listening" : status === "connecting" ? "Connecting to Gemini" : status === "error" ? "Connection issue" : "Ready"

  if (phase === "lobby" || phase === "connecting") return <main className="min-h-screen bg-[#f2f5f5] text-[#172b3a]"><div className="mx-auto max-w-6xl px-4 py-8"><div className="mb-6 flex items-center justify-between"><Button asChild variant="ghost"><Link href="/interviews"><ArrowLeft />Interview Hub</Link></Button><Badge className="bg-[#102a43] text-white"><Headphones className="size-3.5" />Gemini Live Next</Badge></div><section className="grid gap-5 lg:grid-cols-[1.15fr_.85fr]"><Card className="shadow-none"><CardHeader><CardTitle className="font-serif text-3xl">Adaptive live academic interview</CardTitle><CardDescription>Voice conversation, branching follow-ups, optional two-interviewer roles, unseen material, confidence calibration and camera-based analysis of working.</CardDescription></CardHeader><CardContent className="grid gap-4 sm:grid-cols-2"><label><span className="mb-1 block text-xs font-bold uppercase text-slate-500">Subject family</span><NativeSelect value={track} onChange={event => { const next = event.target.value as TrackId; setTrack(next); const found = tracks.find(item => item.id === next); if (found) setCourse(found.courses[0]) }}>{tracks.map(item => <NativeSelectOption key={item.id} value={item.id}>{item.short}</NativeSelectOption>)}</NativeSelect></label><label><span className="mb-1 block text-xs font-bold uppercase text-slate-500">Course</span><NativeSelect value={course} onChange={event => setCourse(event.target.value)}>{courses.map(item => <NativeSelectOption key={item}>{item}</NativeSelectOption>)}</NativeSelect></label><label><span className="mb-1 block text-xs font-bold uppercase text-slate-500">Interviewer style</span><NativeSelect value={personaKey} onChange={event => setPersonaKey(event.target.value as InterviewPersonaKey)}>{Object.keys(interviewerPersonas).map(item => <NativeSelectOption key={item}>{item}</NativeSelectOption>)}</NativeSelect></label><label><span className="mb-1 block text-xs font-bold uppercase text-slate-500">Session style</span><NativeSelect value={mode} onChange={event => setMode(event.target.value as InterviewMode)}>{["Tutor","Realistic","No-hint","Stress"].map(item => <NativeSelectOption key={item}>{item}</NativeSelectOption>)}</NativeSelect></label><label className="sm:col-span-2"><span className="mb-1 block text-xs font-bold uppercase text-slate-500">Voice</span><NativeSelect value={voice} onChange={event => setVoice(event.target.value as GeminiVoice)}>{(Object.keys(voiceLabels) as GeminiVoice[]).map(item => <NativeSelectOption key={item} value={item}>{voiceLabels[item]}</NativeSelectOption>)}</NativeSelect></label><button onClick={() => setPanelMode(value => !value)} className={`sm:col-span-2 rounded-xl border p-4 text-left ${panelMode ? "border-cyan-500 bg-cyan-50" : "bg-white"}`}><div className="flex items-center gap-2"><Users className="size-4" /><strong>Two-interviewer panel</strong></div><p className="mt-1 text-sm text-slate-500">Alternates a developing interviewer and a challenging interviewer. In panel mode the browser uses two available English speech voices for clearer speaker distinction.</p></button>{contextPayload.material && <div className="sm:col-span-2 rounded-xl border border-blue-200 bg-blue-50 p-4"><strong>Unseen material loaded: {contextPayload.title}</strong><p className="mt-1 text-sm text-blue-900">Your preparation notes will be available to the interviewer.</p></div>}{retestFocus && <div className="sm:col-span-2 rounded-xl border border-amber-200 bg-amber-50 p-4"><strong>Delayed oral retest is due.</strong><p className="mt-1 text-sm text-amber-900">The interviewer will test the same reasoning habit through a fresh problem without revealing the target first.</p></div>}{notice && <div className="sm:col-span-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{notice}</div>}<div className="sm:col-span-2 flex flex-wrap gap-2"><Button size="lg" onClick={() => void start()} disabled={phase === "connecting" || configured === false}>{phase === "connecting" ? <Loader2 className="animate-spin" /> : <Mic />}{phase === "connecting" ? "Connecting…" : "Start live interview"}</Button><Button asChild variant="outline"><Link href="/pre-interview-material">Prepare unseen material first</Link></Button></div></CardContent></Card><Card className="border-0 bg-[#102a43] text-white shadow-none"><CardHeader><Brain className="size-5 text-[#8dd7de]" /><CardTitle className="font-serif text-2xl">What is new</CardTitle></CardHeader><CardContent className="space-y-3 text-sm leading-6 text-white/80"><p>• Branches from what you actually say rather than a fixed follow-up ladder.</p><p>• Optional still-camera analysis of handwritten working, graphs and diagrams.</p><p>• Confidence check after your answers feeds calibration analysis.</p><p>• Reasoning replay shows challenge, repair, transfer and revision moments.</p><p>• Weaknesses return later as disguised oral retention checks.</p></CardContent></Card></section></div></main>

  if (phase === "ended") return <main className="min-h-screen bg-[#f2f5f5] text-[#172b3a]"><div className="mx-auto max-w-4xl px-4 py-12"><Card className="shadow-none"><CardHeader><CheckCircle2 className="size-8 text-emerald-600" /><CardTitle className="font-serif text-3xl">Interview saved to Reasoning Replay</CardTitle><CardDescription>Your transcript, confidence ratings, feedback, branch path and any shared working summary have been saved locally for analysis.</CardDescription></CardHeader><CardContent className="flex flex-wrap gap-2"><Button asChild><Link href="/reasoning-replay">Open reasoning replay</Link></Button><Button variant="outline" onClick={reset}><RefreshCw />New interview</Button></CardContent></Card></div></main>

  return <main className="min-h-screen bg-[#eef2f3] text-[#172b3a]"><header className="sticky top-0 z-50 border-b bg-white"><div className="mx-auto flex max-w-[1500px] flex-wrap items-center gap-3 px-4 py-3"><Badge className="bg-emerald-700">Live</Badge><strong className="mr-auto">{course} · {statusLabel}</strong><Badge variant="outline">{formatTime(seconds)}</Badge><Button size="sm" variant="outline" onClick={toggleMute}>{muted ? <MicOff /> : <Mic />}{muted ? "Unmute" : "Mute"}</Button><Button size="sm" variant="destructive" onClick={finishInterview}><PhoneOff />Finish</Button></div></header><div className="mx-auto grid max-w-[1500px] gap-4 px-4 py-5 xl:grid-cols-[minmax(0,1fr)_390px]"><section className="space-y-4"><Card className="shadow-none"><CardHeader><CardTitle className="font-serif text-2xl">Live conversation</CardTitle><CardDescription>{panelMode ? "Two academic roles are alternating." : "One adaptive interviewer."} Speak naturally and interrupt if you need clarification.</CardDescription></CardHeader><CardContent className="space-y-3">{turns.filter(turn => turn.role !== "system").map(turn => <div key={turn.id} className={`rounded-2xl p-4 ${turn.role === "candidate" ? "ml-8 bg-white border" : "mr-8 bg-[#102a43] text-white"}`}><div className="flex flex-wrap items-center gap-2"><Badge variant={turn.role === "candidate" ? "outline" : "secondary"}>{turn.role === "candidate" ? "You" : `Interviewer ${turn.interviewer ?? ""}`.trim()}</Badge>{typeof turn.confidence === "number" && <Badge variant="outline" className={turn.role === "candidate" ? "" : "border-white/30 text-white"}>Confidence {turn.confidence}%</Badge>}</div><p className="mt-2 text-sm leading-6">{turn.text}</p>{turn.feedback && <p className={`mt-2 rounded-xl p-3 text-xs leading-5 ${turn.role === "candidate" ? "bg-amber-50 text-amber-950" : "bg-white/10"}`}><strong>Feedback:</strong> {turn.feedback}</p>}</div>)}{candidateLive && <div className="ml-8 rounded-2xl border bg-white p-4 text-sm text-slate-500">{candidateLive}</div>}{interviewerLive && <div className="mr-8 rounded-2xl bg-[#102a43] p-4 text-sm text-white/80">{interviewerLive}</div>}{confidenceTarget && <div className="rounded-2xl border border-cyan-200 bg-cyan-50 p-4"><div className="flex items-center gap-2"><Gauge className="size-4 text-cyan-800" /><strong>How confident were you in that answer?</strong></div><div className="mt-3 flex flex-wrap gap-2">{[20,40,60,80,100].map(value => <Button key={value} size="sm" variant="outline" onClick={() => setConfidence(value)}>{value}%</Button>)}</div></div>}</CardContent></Card></section><aside className="space-y-4"><Card className="shadow-none"><CardHeader><div className="flex items-center justify-between"><div><Camera className="size-5 text-[#147d91]" /><CardTitle className="mt-2 font-serif text-xl">Show your working</CardTitle></div><Button size="sm" variant="outline" onClick={() => void toggleCamera()}>{cameraOn ? <CameraOff /> : <Camera />}{cameraOn ? "Stop" : "Camera"}</Button></div><CardDescription>No continuous video is uploaded. A still is captured only when you press Analyse working.</CardDescription></CardHeader><CardContent className="space-y-3"><div className="aspect-video overflow-hidden rounded-xl border bg-slate-950"><video ref={videoRef} className="h-full w-full object-cover" muted playsInline /></div><Button className="w-full" onClick={() => void analyseCameraWorking()} disabled={!cameraOn || cameraAnalysing}>{cameraAnalysing ? <Loader2 className="animate-spin" /> : <ScanSearch />}{cameraAnalysing ? "Analysing…" : "Analyse working"}</Button>{workingAnalysis && <details className="rounded-xl bg-slate-50 p-3" open><summary className="cursor-pointer text-sm font-semibold">Latest working analysis</summary><p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-slate-600">{workingAnalysis}</p></details>}</CardContent></Card>{contextPayload.material && <Card className="shadow-none"><CardHeader><CardTitle className="font-serif text-xl">Unseen material</CardTitle><CardDescription>{contextPayload.title}</CardDescription></CardHeader><CardContent><p className="text-sm leading-6 line-clamp-6">{contextPayload.material}</p></CardContent></Card>}<Card className="border-0 bg-[#102a43] text-white shadow-none"><CardContent className="space-y-2 p-5 text-sm text-white/75"><p className="flex items-center gap-2"><Volume2 className="size-4" />{panelMode ? "Panel mode uses two browser speech voices." : "Gemini streaming audio active."}</p><p>Confidence ratings are private coaching data and are not admissions predictions.</p></CardContent></Card></aside></div></main>
}

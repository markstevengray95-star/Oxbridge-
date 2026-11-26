"use client"

import Link from "next/link"
import {readInterviewLaunch} from "@/lib/interview-launch"
import { useEffect, useRef, useState } from "react"
import {
  ArrowLeft,
  Brain,
  Camera,
  CameraOff,
  CheckCircle2,
  Gauge,
  Headphones,
  Loader2,
  Mic,
  MicOff,
  PhoneOff,
  RefreshCw,
  ScanSearch,
  Users,
  Volume2,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { tracks, type TrackId } from "@/lib/oxbridge-data"
import { subjectInterviewPathway, subjectInterviewStarter } from "@/lib/subject-interview-pathways"
import { realisticInterviewQuestions } from "@/lib/realistic-interview-bank"
import { mockDurations, mockInterviewFormat, mockInterviewStage, mockCompletionReport, type MockDuration, type MockStageId } from "@/lib/full-mock-interview"
import { InterviewEvidencePanel } from "@/components/interview-evidence-panel"
import { InterviewEvidenceReview } from "@/components/interview-evidence-review"
import { buildEvidenceLinkedFeedback, extractInsightSnapshots, type EvidenceLinkedFeedback } from "@/lib/interview-feedback-intelligence"
import { evidenceChallengeForCourse, evidenceContext , canRevealNextEvidence, nextEvidenceStage } from "@/lib/interview-evidence-challenges"
import {
  buildLiveResumePrompt,
  canSendLiveAudio,
  detectVoiceBargeIn,
  liveAudioRms,
  liveSocketErrorMessage,
  liveSpeechDetection,
  mergeLiveTranscription,
  newVoiceBargeInState,
  type InterviewVoicePace,
} from "@/lib/gemini/live-conversation-control"
import { interviewerPersonas, type InterviewMode, type InterviewPersonaKey } from "@/lib/coach-suite"
import { PROFILE_KEY, PROGRESS_KEY } from "@/lib/personal-tutor"
import {
  INTERVIEW_CONTEXT_KEY,
  LIVE_REPLAY_KEY,
  ORAL_RETEST_KEY,
  buildReasoningReplay,
  oralRetestFromReplay,
  type LiveTurnRecord,
  type OralRetest,
} from "@/lib/nextgen-prep"

type Phase = "lobby" | "connecting" | "live" | "reconnect" | "ended"
type LiveState = "idle" | "connecting" | "connected" | "speaking" | "thinking" | "interviewer" | "error"
type GeminiVoice = "Gacrux" | "Sulafat" | "Sadaltager" | "Kore"
type Turn = LiveTurnRecord

type TokenResponse = {
  token?: string
  model?: string
  voice?: GeminiVoice
  instructions?: string
  error?: string
}

type ConfigResponse = {
  configured?: boolean
  model?: string
  voices?: GeminiVoice[]
}

type GeminiMessage = {
  error?: { message?: string }
  setupComplete?: Record<string, never>
  serverContent?: {
    modelTurn?: { parts?: Array<{ inlineData?: { data?: string; mimeType?: string }; text?: string }> }
    interimInputTranscription?: { text?: string }
    inputTranscription?: { text?: string }
    outputTranscription?: { text?: string }
    turnComplete?: boolean
    interrupted?: boolean
  }
  goAway?: { timeLeft?: string }
}

type InterviewContext = {
  source?: string
  title?: string
  material?: string
  prompts?: string[]
  notes?: string
  course?: string
}

const voiceLabels: Record<GeminiVoice, string> = {
  Gacrux: "Gacrux · mature academic",
  Sulafat: "Sulafat · warm conversational",
  Sadaltager: "Sadaltager · measured academic",
  Kore: "Kore · firm probing",
}

function formatTime(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`
}

function resample16k(input: Float32Array, inputRate: number) {
  const length = Math.max(1, Math.round(input.length * 16000 / inputRate))
  const output = new Int16Array(length)
  for (let index = 0; index < length; index += 1) {
    const position = index * (input.length - 1) / Math.max(1, length - 1)
    const left = Math.floor(position)
    const right = Math.min(input.length - 1, left + 1)
    const fraction = position - left
    const sample = input[left] * (1 - fraction) + input[right] * fraction
    const clipped = Math.max(-1, Math.min(1, sample))
    output[index] = clipped < 0 ? Math.round(clipped * 32768) : Math.round(clipped * 32767)
  }
  return output
}

function pcmToBase64(pcm: Int16Array) {
  const bytes = new Uint8Array(pcm.buffer, pcm.byteOffset, pcm.byteLength)
  let binary = ""
  for (let index = 0; index < bytes.length; index += 8192) {
    binary += String.fromCharCode(...Array.from(bytes.subarray(index, index + 8192)))
  }
  return btoa(binary)
}

function base64ToPcm(base64: string) {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index)
  const view = new DataView(bytes.buffer)
  const samples = new Float32Array(Math.floor(bytes.byteLength / 2))
  for (let index = 0; index < samples.length; index += 1) samples[index] = view.getInt16(index * 2, true) / 32768
  return samples
}

function parsePanelPrefix(text: string) {
  const clean = text.trim()
  if (/^A:\s*/i.test(clean)) return { interviewer: "A" as const, text: clean.replace(/^A:\s*/i, "") }
  if (/^B:\s*/i.test(clean)) return { interviewer: "B" as const, text: clean.replace(/^B:\s*/i, "") }
  return { interviewer: undefined, text: clean }
}

function splitFeedbackAndQuestion(text: string) {
  const panel = parsePanelPrefix(text.replace(/\s+/g, " ").trim())
  const sentence = panel.text.match(/^(.+?[.!])\s+([\s\S]+)$/)
  if (sentence && /^(?:your|the) (?:reasoning|answer|argument|assumption|conclusion|method|explanation|idea)\b|^that (?:claim|assumption|step|reasoning)\b/i.test(sentence[1])) {
    return {
      feedback: sentence[1].trim(),
      followUp: sentence[2].trim(),
      interviewer: panel.interviewer,
    }
  }
  // A question's conversational lead-in is not necessarily marking feedback.
  const questionIndex = panel.text.lastIndexOf("?")
  if (questionIndex > 0) {
    return {
      feedback: "",
      followUp: panel.text.slice(0, questionIndex + 1).trim(),
      interviewer: panel.interviewer,
    }
  }
  return { feedback: panel.text, followUp: "", interviewer: panel.interviewer }
}

function readInterviewContext(): InterviewContext {
  try {
    return JSON.parse(localStorage.getItem(INTERVIEW_CONTEXT_KEY) || "{}") as InterviewContext
  } catch {
    return {}
  }
}

function readDueOralRetest(course: string) {
  try {
    const stored = JSON.parse(localStorage.getItem(ORAL_RETEST_KEY) || "[]")
    if (!Array.isArray(stored)) return null
    return (stored as OralRetest[]).find(item =>
      !item.completedAt &&
      item.course === course &&
      new Date(item.dueAt).getTime() <= Date.now()
    ) ?? null
  } catch {
    return null
  }
}

export default function GeminiLiveNextPage() {
  const [phase, setPhase] = useState<Phase>("lobby")
  const [status, setStatus] = useState<LiveState>("idle")
  const [track, setTrack] = useState<TrackId>("physical")
  const [course, setCourse] = useState("Physics")
  const [personaKey, setPersonaKey] = useState<InterviewPersonaKey>("Socratic")
  const [mode, setMode] = useState<InterviewMode>("Realistic")
  const [voice, setVoice] = useState<GeminiVoice>("Gacrux")
  const [panelMode, setPanelMode] = useState(false)
  const [evidenceEnabled, setEvidenceEnabled] = useState(false)
  const [evidenceStage, setEvidenceStage] = useState(-1)
  const [evidenceLastAnswerCount, setEvidenceLastAnswerCount] = useState(0)
  const [mockDuration, setMockDuration] = useState<MockDuration | null>(null)
  const [mockStageIndex, setMockStageIndex] = useState(0)
  const [mockVisited, setMockVisited] = useState<MockStageId[]>([])
  const [secondProblemSent, setSecondProblemSent] = useState(false)
  const [voicePace, setVoicePace] = useState<InterviewVoicePace>("thoughtful")
  const [allowBargeIn, setAllowBargeIn] = useState(true)
  const [muted, setMuted] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [notice, setNotice] = useState("")
  const [turns, setTurns] = useState<Turn[]>([])
  const [candidateLive, setCandidateLive] = useState("")
  const [interviewerLive, setInterviewerLive] = useState("")
  const [connectedAt, setConnectedAt] = useState<number | null>(null)
  const [configured, setConfigured] = useState<boolean | null>(null)
  const [serverModel, setServerModel] = useState("gemini-3.8-live")
  const [interviewContext, setInterviewContext] = useState<InterviewContext>({})
  const [retestFocus, setRetestFocus] = useState("")
  const [cameraOn, setCameraOn] = useState(false)
  const [cameraAnalysing, setCameraAnalysing] = useState(false)
  const [workingAnalysis, setWorkingAnalysis] = useState("")
  const [confidenceTarget, setConfidenceTarget] = useState<string | null>(null)
  const [feedbackReport,setFeedbackReport] = useState<EvidenceLinkedFeedback | null>(null)

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const cameraStreamRef = useRef<MediaStream | null>(null)
  const startedAtRef = useRef<number | null>(null)
  const playbackEpochRef = useRef(0)
  const generationRef = useRef(0)
  const setupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const finishTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputTextRef = useRef("")
  const outputTextRef = useRef("")
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
  const turnsRef = useRef<Turn[]>([])
  const mutedRef = useRef(false)
  const openingRef = useRef(true)
  const endingRef = useRef(false)
  const lastCandidateIdRef = useRef<string | null>(null)
  const speechStateRef = useRef(newVoiceBargeInState())
  const localInterruptionRef = useRef(false)
  const resumeRef = useRef(false)
  const setupReadyRef = useRef(false)
  const bargeInRef = useRef(true)
  const droppedAudioWarningRef = useRef(false)
  const lastMockAnswerCountRef = useRef(0)

  useEffect(()=>{const requested=mockInterviewFormat(Number(new URLSearchParams(window.location.search).get("mock")));if(requested)setMockDuration(requested.minutes)},[])

  useEffect(() => {
    try {
      const profile = JSON.parse(localStorage.getItem(PROFILE_KEY) || "{}") as { track?: TrackId; course?: string }
      const launch=readInterviewLaunch(window.location.search,tracks)
      const matched=tracks.find(t=>t.courses.includes(profile.course??""))
      const nextTrack = (launch.track as TrackId|null) ?? matched?.id ?? "physical"
      const nextCourse = launch.course ?? (matched?profile.course:undefined) ?? "Physics"
      setTrack(nextTrack)
      setCourse(nextCourse)
      setRetestFocus(readDueOralRetest(nextCourse)?.focus ?? "")
    } catch {
      setTrack("physical")
      setCourse("Physics")
    }

    setInterviewContext(readInterviewContext())

    fetch("/api/realtime-session")
      .then(async (response): Promise<ConfigResponse> => {
        if (!response.ok) return { configured: false }
        return response.json() as Promise<ConfigResponse>
      })
      .then(data => {
        setConfigured(Boolean(data.configured))
        if (data.model) setServerModel(data.model)
      })
      .catch(() => setConfigured(false))
  }, [])

  useEffect(() => {
    if (!connectedAt || phase !== "live") return
    const timer = window.setInterval(() => {
      setSeconds(Math.floor((Date.now() - connectedAt) / 1000))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [connectedAt, phase])

  useEffect(() => () => teardown(false), [])

  const courses = tracks.find(item => item.id === track)?.courses ?? [course]
  const evidenceChallenge = evidenceEnabled ? evidenceChallengeForCourse(course, track) : null
  const candidateTurnCount = turns.filter(turn => turn.role === "candidate").length
  const mockStatus = mockDuration ? mockInterviewStage({minutes:mockDuration,elapsedSeconds:seconds,candidateAnswers:candidateTurnCount,previousStageIndex:mockStageIndex}):null
  const secondProblem = realisticInterviewQuestions.find(item=>item.track===track && item.prompt!==subjectInterviewStarter(course,track).prompt)
  const coursePathway = subjectInterviewPathway(course, track)

  useEffect(() => {
    if (phase !== "live" || !mockDuration || candidateTurnCount <= lastMockAnswerCountRef.current) return
    lastMockAnswerCountRef.current = candidateTurnCount
    const stage = mockInterviewStage({ minutes:mockDuration, elapsedSeconds:seconds, candidateAnswers:candidateTurnCount, previousStageIndex:mockStageIndex })
    if (stage && stage.index !== mockStageIndex) {
      setMockStageIndex(stage.index)
      setMockVisited(previous => [...new Set([...previous, stage.stage.id])])
    }
  }, [phase, mockDuration, candidateTurnCount, seconds, mockStageIndex])

  function startSecondProblem() {
    const ws = wsRef.current
    if (!mockStatus || mockStatus.stage.id !== "second-problem" || secondProblemSent || !ws || ws.readyState !== WebSocket.OPEN) return
    const question = secondProblem?.prompt || subjectInterviewStarter(course, track, "Challenge").prompt
    ws.send(JSON.stringify({ clientContent: { turns: [{ role: "user", parts: [{ text:
      "The interview has moved to the second academic problem. This is a facilitator instruction, not the candidate answer. Ask this new course-relevant problem, without supplying the solution: " + question
    }] }], turnComplete: true } }))
    setSecondProblemSent(true)
    addTurn("system", "Second academic problem introduced: " + question)
  }

  function plannedVoiceReconnect() {
    if (phase !== "live" || !mockDuration || mockDuration < 40) return
    preserveUnfinishedTranscript()
    teardown(false)
    setPhase("reconnect")
    setNotice("Timed mock paused for a secure voice reconnection. Resume to continue with your transcript and elapsed time.")
  }

  function syncTurns(next: Turn[]) {
    turnsRef.current = next
    setTurns(next)
  }

  function addTurn(role: Turn["role"], text: string, extra: Partial<Turn> = {}) {
    const clean = text.replace(/\s+/g, " ").trim()
    if (!clean) return null
    const id = `${Date.now()}-${Math.random()}`
    syncTurns([
      ...turnsRef.current,
      { id, role, text: clean, createdAt: new Date().toISOString(), ...extra },
    ])
    return id
  }

  function patchTurn(id: string | null, patch: Partial<Turn>) {
    if (!id) return
    syncTurns(turnsRef.current.map(turn => turn.id === id ? { ...turn, ...patch } : turn))
  }

  function stopOutput() {
    speechStateRef.current = newVoiceBargeInState()
    playbackEpochRef.current += 1
    for (const source of outputSourcesRef.current) {
      try { source.stop() } catch { /* source already ended */ }
    }
    outputSourcesRef.current.clear()
    if (outputCtxRef.current) nextAudioRef.current = outputCtxRef.current.currentTime
    if (typeof window !== "undefined") window.speechSynthesis?.cancel()
  }

  async function playGeminiAudio(base64: string) {
    if (panelMode || localInterruptionRef.current) return
    const context = outputCtxRef.current
    const generation = generationRef.current
    const epoch = playbackEpochRef.current
    if (!context) return
    if (context.state === "suspended") await context.resume()
    if (generation !== generationRef.current || epoch !== playbackEpochRef.current) return

    const samples = base64ToPcm(base64)
    if (!samples.length) return
    const buffer = context.createBuffer(1, samples.length, 24000)
    buffer.copyToChannel(samples, 0)
    if (generation !== generationRef.current || epoch !== playbackEpochRef.current || localInterruptionRef.current) return
    const source = context.createBufferSource()
    source.buffer = buffer
    source.connect(context.destination)
    const startAt = Math.max(context.currentTime + 0.015, nextAudioRef.current || context.currentTime)
    nextAudioRef.current = startAt + buffer.duration
    outputSourcesRef.current.add(source)
    source.onended = () => outputSourcesRef.current.delete(source)
    source.start(startAt)
  }

  function speakPanelTurn(text: string, interviewer?: "A" | "B") {
    if (!panelMode || typeof window === "undefined" || !window.speechSynthesis) return
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = "en-GB"
    const available = window.speechSynthesis.getVoices().filter(item => item.lang.toLowerCase().startsWith("en"))
    if (available.length) {
      utterance.voice = interviewer === "B"
        ? available[Math.min(1, available.length - 1)]
        : available[0]
    }
    utterance.rate = interviewer === "B" ? 1.03 : 0.96
    window.speechSynthesis.speak(utterance)
  }

  async function startMicrophone(ws: WebSocket) {
    if (processorRef.current) return
    const stream = streamRef.current ?? await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    })
    streamRef.current = stream

    let context = inputCtxRef.current
    if (!context) {
      context = new AudioContext()
      inputCtxRef.current = context
    }
    if (context.state === "suspended") await context.resume()
    if (wsRef.current !== ws || endingRef.current) return

    const source = context.createMediaStreamSource(stream)
    const processor = context.createScriptProcessor(1024, 1, 1)
    const silent = context.createGain()
    silent.gain.value = 0
    micSourceRef.current = source
    processorRef.current = processor
    silentGainRef.current = silent

    processor.onaudioprocess = event => {
      if (wsRef.current !== ws || endingRef.current) return
      if (!canSendLiveAudio(ws.readyState, ws.bufferedAmount, mutedRef.current)) {
        if (ws.readyState === WebSocket.OPEN && ws.bufferedAmount >= 524288 && !droppedAudioWarningRef.current) {
          droppedAudioWarningRef.current = true
          setNotice("Your connection is struggling to send audio. Please check your connection; the interviewer may miss part of your response.")
        }
        return
      }
      droppedAudioWarningRef.current = false
      const channel = event.inputBuffer.getChannelData(0)
      const audible = outputSourcesRef.current.size > 0 || (panelMode && Boolean(window.speechSynthesis?.speaking))
      const activity = detectVoiceBargeIn(speechStateRef.current, {
        rms: liveAudioRms(channel),
        nowMs: performance.now(),
        modelAudible: audible,
        enabled: bargeInRef.current && !openingRef.current,
      })
      speechStateRef.current = activity.state
      if (activity.interrupt) {
        localInterruptionRef.current = true
        stopOutput()
        setStatus("speaking")
      }
      const pcm = resample16k(channel, context!.sampleRate)
      if (!pcm.length) return
      try {
        ws.send(JSON.stringify({
          realtimeInput: {
            audio: { data: pcmToBase64(pcm), mimeType: "audio/pcm;rate=16000" },
          },
        }))
      } catch {
        // The socket closing is handled by the connection lifecycle.
      }
    }

    source.connect(processor)
    processor.connect(silent)
    silent.connect(context.destination)
  }

  function revealEvidence() {
    const ws=wsRef.current
    const candidateCount=turnsRef.current.filter(turn=>turn.role==="candidate").length
    if(!evidenceChallenge||!ws||ws.readyState!==WebSocket.OPEN||endingRef.current||!canRevealNextEvidence(evidenceStage,candidateCount,evidenceLastAnswerCount))return
    const nextState=nextEvidenceStage(evidenceChallenge,evidenceStage,candidateCount,evidenceLastAnswerCount)
    if(!nextState)return
    const next=nextState.index
    const exhibit=nextState.stage
    const current=evidenceContext({challengeId:evidenceChallenge.id,stage:next})
    if(!current)return
    setEvidenceStage(next)
    setEvidenceLastAnswerCount(candidateCount)
    stopOutput()
    addTurn("system",`New evidence released: ${exhibit.change}. ${exhibit.material.title}`)
    setNotice("New evidence shown. The interviewer will now ask how it changes your reasoning.")
    ws.send(JSON.stringify({clientContent:{turns:[{role:"user",parts:[{text:"The student has chosen to view a new academic exhibit in the interview. This is original fictional practice evidence, not their spoken answer. Only these exhibits have been shown:\n"+current.material+"\nAsk this next academic question verbatim, without revealing the answer: "+exhibit.question}]}],turnComplete:true}}))
  }

  function sendOpening(ws: WebSocket) {
    openingRef.current = true
    const materialHint = interviewContext.material
      ? " Start with the unseen or supercurricular material supplied in your system instructions."
      : ""
    const prompt = resumeRef.current
      ? buildLiveResumePrompt(course, turnsRef.current) + (evidenceChallenge && evidenceStage>=0 ? "\n\nCurrent interactive evidence already shown to the student:\n" + (evidenceContext({challengeId:evidenceChallenge.id,stage:evidenceStage})?.material || "") : "")
      : interviewContext.material
        ? `Begin the formal ${course} practice interview now.${materialHint} Ask one challenging but accessible question grounded in the supplied material.`
        : `Begin the formal ${course} practice interview now. Give a brief natural greeting, then ask this opening academic problem without answering it: ${subjectInterviewStarter(course, track).prompt}`
    ws.send(JSON.stringify({
      clientContent: {
        turns: [{
          role: "user",
          parts: [{ text: prompt }],
        }],
        turnComplete: true,
      },
    }))
  }

  function preserveUnfinishedTranscript() {
    if (inputTextRef.current.trim()) {
      addTurn("candidate", inputTextRef.current)
      inputTextRef.current = ""
      setCandidateLive("")
    }
    if (outputTextRef.current.trim()) {
      addTurn("interviewer", outputTextRef.current)
      outputTextRef.current = ""
      setInterviewerLive("")
    }
  }

  function failConnection(message: string) {
    preserveUnfinishedTranscript()
    const canResume = turnsRef.current.some(turn => turn.role === "candidate" || turn.role === "interviewer")
    teardown(false)
    setPhase(canResume ? "reconnect" : "lobby")
    setStatus("error")
    setNotice(canResume ? message + " Your transcript is preserved. Resume or save this interview." : message)
  }

  function handleGeminiMessage(message: GeminiMessage, ws: WebSocket) {
    if (wsRef.current !== ws) return
    if (message.error) {
      failConnection(message.error.message || "Gemini rejected the live session.")
      return
    }

    if (message.setupComplete) {
      if (setupTimerRef.current) clearTimeout(setupTimerRef.current)
      setupReadyRef.current = true
      setStatus("connected")
      setPhase("live")
      startedAtRef.current = startedAtRef.current ?? Date.now()
      setConnectedAt(startedAtRef.current)
      addTurn("system", resumeRef.current
        ? "A new secure voice connection was established and the previous academic discussion was restored."
        : `Gemini Live connected using ${serverModel}. Camera images are captured only when you press Analyse working.`)
      void startMicrophone(ws)
        .then(() => {
          if (wsRef.current === ws && ws.readyState === WebSocket.OPEN) sendOpening(ws)
        })
        .catch(error => failConnection(error instanceof Error ? error.message : "Microphone could not start."))
      return
    }

    if (message.goAway) {
      setNotice("Gemini Live may close this voice connection soon. Your transcript will be preserved so you can resume if needed.")
    }

    const content = message.serverContent
    if (!content) return

    if (content.interrupted) {
      // Keep the words actually spoken before the candidate interrupted.
      if (outputTextRef.current.trim()) addTurn("interviewer", outputTextRef.current.trim())
      stopOutput()
      localInterruptionRef.current = true
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
      inputTextRef.current = mergeLiveTranscription(inputTextRef.current, input)
      setCandidateLive(inputTextRef.current)
      setStatus("speaking")
    }

    if (inputTextRef.current && (content.outputTranscription?.text || content.modelTurn || content.turnComplete)) {
      const candidateId = addTurn("candidate", inputTextRef.current)
      lastCandidateIdRef.current = candidateId
      setConfidenceTarget(candidateId)
      inputTextRef.current = ""
      localInterruptionRef.current = false
      speechStateRef.current = newVoiceBargeInState()
      setCandidateLive("")
    }

    const output = content.outputTranscription?.text
      || (content.modelTurn?.parts ?? []).map(part => part.text || "").join(" ")
    if (output) {
      outputTextRef.current = mergeLiveTranscription(outputTextRef.current, output)
      setInterviewerLive(outputTextRef.current)
      setStatus("interviewer")
    }

    for (const part of content.modelTurn?.parts ?? []) {
      const audio = part.inlineData?.data
      if (audio) {
        setStatus("interviewer")
        void playGeminiAudio(audio)
      }
    }

    if (!content.turnComplete) return
    localInterruptionRef.current = false

    const finalOutput = outputTextRef.current.replace(/\s+/g, " ").trim()
    if (finalOutput) {
      const parsed = splitFeedbackAndQuestion(finalOutput)
      const displayText = parsed.followUp
        ? `${parsed.feedback} ${parsed.followUp}`.trim()
        : parsed.feedback
      addTurn("interviewer", displayText, { interviewer: parsed.interviewer })
      if (!openingRef.current && lastCandidateIdRef.current && parsed.feedback) {
        patchTurn(lastCandidateIdRef.current, { feedback: parsed.feedback })
      }
      if (panelMode) speakPanelTurn(displayText, parsed.interviewer)
    }

    outputTextRef.current = ""
    setInterviewerLive("")

    if (openingRef.current) {
      openingRef.current = false
      setStatus("connected")
      return
    }

    if (endingRef.current) {
      window.setTimeout(() => { preserveUnfinishedTranscript(); teardown(true) }, 900)
      return
    }

    setStatus("connected")
  }

  async function startInterview(resume = false) {
    if (phase === "connecting") return
    if (configured === false) {
      setStatus("error")
      setNotice("Gemini Live is not configured on this deployment.")
      return
    }

    const restore = resume && turnsRef.current.some(turn => turn.role === "candidate" || turn.role === "interviewer")
    teardown(false)
    const generation = generationRef.current
    resumeRef.current = restore
    setupReadyRef.current = false
    localInterruptionRef.current = false
    speechStateRef.current = newVoiceBargeInState()
    bargeInRef.current = allowBargeIn
    droppedAudioWarningRef.current = false
    savedRef.current = false
    mutedRef.current = false
    setMuted(false)
    inputTextRef.current = ""
    outputTextRef.current = ""
    if (!restore) {
      startedAtRef.current = null
      setConnectedAt(null)
    }
    setPhase("connecting")
    setStatus("connecting")
    setNotice("")
    if (!restore) { syncTurns([]);setEvidenceStage(-1);setEvidenceLastAnswerCount(0);setMockStageIndex(0);setMockVisited(mockDuration?["opening"]:[]);setSecondProblemSent(false);lastMockAnswerCountRef.current=0 }
    setCandidateLive("")
    setInterviewerLive("")
    if (!restore) setSeconds(0)
    if (!restore) setWorkingAnalysis("")
    setConfidenceTarget(null)
    openingRef.current = true
    endingRef.current = false
    lastCandidateIdRef.current = null

    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error("Microphone access is unavailable in this browser.")

      const outputContext = new AudioContext()
      outputCtxRef.current = outputContext
      await outputContext.resume()
      nextAudioRef.current = outputContext.currentTime

      const inputContext = new AudioContext()
      inputCtxRef.current = inputContext
      await inputContext.resume()

      const microphone = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      })
      if (generation !== generationRef.current) {
        microphone.getTracks().forEach(trackItem => trackItem.stop())
        return
      }
      streamRef.current = microphone
      for (const audioTrack of microphone.getAudioTracks()) {
        audioTrack.addEventListener("ended", () => {
          if (generation === generationRef.current && !endingRef.current)
            failConnection("The microphone stopped unexpectedly. Check your device permissions before resuming.")
        }, { once: true })
      }

      const response = await fetch("/api/realtime-session", {
        method: "POST",
        signal: AbortSignal.timeout(30000),
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          course,
          track,
          persona: personaKey,
          mode,
          voice,
          panel: panelMode,
          resume: restore,
          mockMinutes: mockDuration || undefined,
          material: interviewContext.material || "",
          preparationNotes: interviewContext.notes || "",
          focus: retestFocus,
        }),
      })

      const data = await response.json() as TokenResponse
      if (generation !== generationRef.current) return
      if (!response.ok || !data.token || !data.model || !data.instructions) {
        throw new Error(data.error || "Could not create the Gemini Live session.")
      }
      setServerModel(data.model)

      const socketUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContentConstrained?access_token=${encodeURIComponent(data.token)}`
      const ws = new WebSocket(socketUrl)
      wsRef.current = ws
      ws.binaryType = "arraybuffer"

      setupTimerRef.current = setTimeout(() => {
        if (wsRef.current === ws && !setupReadyRef.current) failConnection("Gemini did not finish connecting. Please retry.")
      }, 20000)

      ws.onopen = () => {
        if (wsRef.current !== ws) return
        setStatus("connecting")
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
            realtimeInputConfig: {
              automaticActivityDetection: liveSpeechDetection(voicePace),
              activityHandling: "START_OF_ACTIVITY_INTERRUPTS",
            },
            inputAudioTranscription: {},
            outputAudioTranscription: {},
          },
        }))
      }

      let messageQueue = Promise.resolve()
      ws.onmessage = event => {
        messageQueue = messageQueue.then(async () => {
          const raw = typeof event.data === "string"
            ? event.data
            : event.data instanceof Blob
              ? await event.data.text()
              : new TextDecoder().decode(event.data)
          if (wsRef.current === ws) handleGeminiMessage(JSON.parse(raw) as GeminiMessage, ws)
        }).catch(() => {
          if (wsRef.current === ws) failConnection("Could not read the Gemini audio stream. Please restart the interview.")
        })
      }

      ws.onerror = () => {
        if (wsRef.current === ws) failConnection("Gemini Live could not connect. Please retry.")
      }

      ws.onclose = event => {
        if (wsRef.current !== ws) return
        if (endingRef.current) {
          preserveUnfinishedTranscript()
          teardown(true)
          return
        }
        failConnection(liveSocketErrorMessage(event.code, event.reason, !setupReadyRef.current))
      }
    } catch (error) {
      if (generation !== generationRef.current) return
      teardown(false)
      setPhase(restore ? "reconnect" : "lobby")
      setStatus("error")
      setNotice((error instanceof Error ? error.message : "Could not start Gemini Live voice.") + (restore ? " Your previous transcript is preserved." : ""))
    }
  }

  async function toggleCamera() {
    if (cameraOn) {
      cameraStreamRef.current?.getTracks().forEach(trackItem => trackItem.stop())
      cameraStreamRef.current = null
      if (videoRef.current) videoRef.current.srcObject = null
      setCameraOn(false)
      return
    }

    try {
      const camera = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      })
      cameraStreamRef.current = camera
      if (videoRef.current) {
        videoRef.current.srcObject = camera
        await videoRef.current.play()
      }
      setCameraOn(true)
    } catch {
      setNotice("Camera access was unavailable. You can continue the interview without it.")
    }
  }

  async function analyseCameraWorking() {
    const video = videoRef.current
    if (!video || !cameraOn || cameraAnalysing) return
    setCameraAnalysing(true)

    try {
      const canvas = document.createElement("canvas")
      canvas.width = video.videoWidth || 1280
      canvas.height = video.videoHeight || 720
      const context = canvas.getContext("2d")
      if (!context) throw new Error("Camera frame could not be captured.")
      context.drawImage(video, 0, 0, canvas.width, canvas.height)
      const image = canvas.toDataURL("image/jpeg", 0.86)

      const response = await fetch("/api/analyse-working", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image,
          subject: course,
          context: `This is a still camera snapshot voluntarily captured during a live ${course} interview. Analyse only visible academic working, graphs, diagrams or notes. Do not comment on the student's appearance.`,
        }),
      })
      const data = await response.json() as { analysis?: string; error?: string }
      const analysis = data.analysis || data.error || "No working analysis was returned."
      setWorkingAnalysis(analysis)

      if (lastCandidateIdRef.current) {
        patchTurn(lastCandidateIdRef.current, { workingSummary: analysis })
      }

      const ws = wsRef.current
      if (response.ok && ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          clientContent: {
            turns: [{
              role: "user",
              parts: [{
                text: `Camera working analysis from a still image the candidate chose to share:\n${analysis}\nUse only this summary as evidence about the visible working. Ask one academically useful follow-up grounded in it and do not comment on appearance.`,
              }],
            }],
            turnComplete: true,
          },
        }))
      }
    } catch (error) {
      setWorkingAnalysis(error instanceof Error ? error.message : "The camera snapshot could not be analysed.")
    } finally {
      setCameraAnalysing(false)
    }
  }

  function setConfidence(value: number) {
    if (!confidenceTarget) return
    patchTurn(confidenceTarget, { confidence: value })
    setConfidenceTarget(null)
  }

  function toggleMute() {
    const next = !mutedRef.current
    mutedRef.current = next
    setMuted(next)
    streamRef.current?.getAudioTracks().forEach(trackItem => { trackItem.enabled = !next })
    if (next && wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ realtimeInput: { audioStreamEnd: true } }))
    }
  }

  function finishInterview() {
    const ws = wsRef.current
    if (!ws || ws.readyState !== WebSocket.OPEN || endingRef.current) {
      preserveUnfinishedTranscript()
      teardown(true)
      return
    }

    endingRef.current = true
    mutedRef.current = true
    setMuted(true)
    streamRef.current?.getAudioTracks().forEach(trackItem => { trackItem.enabled = false })
    setStatus("thinking")

    finishTimerRef.current = setTimeout(() => { preserveUnfinishedTranscript(); teardown(true) }, 20000)
    ws.send(JSON.stringify({ realtimeInput: { audioStreamEnd: true } }))
    ws.send(JSON.stringify({
      clientContent: {
        turns: [{
          role: "user",
          parts: [{
            text: "The candidate has chosen to end the interview. Give the concise final spoken debrief described in your instructions, then clearly say that the interview is complete. Do not ask another question.",
          }],
        }],
        turnComplete: true,
      },
    }))
  }

  function saveProgress() {
    if (!turnsRef.current.length || savedRef.current) return
    savedRef.current = true
    const duration = startedAtRef.current
      ? Math.max(0, Math.round((Date.now() - startedAtRef.current) / 1000))
      : seconds
    const replay = buildReasoningReplay(course, turnsRef.current, duration)
    const mockSession = mockDuration ? mockCompletionReport({minutes:mockDuration,elapsedSeconds:duration,candidateAnswers:turnsRef.current.filter(turn=>turn.role==="candidate").length,visitedStages:mockVisited,endedBy:"student"}) : null

    try {
      const existingReplayValue = JSON.parse(localStorage.getItem(LIVE_REPLAY_KEY) || "[]")
      const existingReplays = Array.isArray(existingReplayValue) ? existingReplayValue : []
      localStorage.setItem(LIVE_REPLAY_KEY, JSON.stringify([replay, ...existingReplays].slice(0, 30)))

      const oldRetestValue = JSON.parse(localStorage.getItem(ORAL_RETEST_KEY) || "[]")
      const oldRetests = Array.isArray(oldRetestValue) ? oldRetestValue as OralRetest[] : []
      const completedOldRetests = retestFocus
        ? oldRetests.map(item => item.focus === retestFocus && !item.completedAt
          ? { ...item, completedAt: new Date().toISOString() }
          : item)
        : oldRetests
      localStorage.setItem(
        ORAL_RETEST_KEY,
        JSON.stringify([oralRetestFromReplay(replay), ...completedOldRetests].slice(0, 40)),
      )

      const progress = JSON.parse(localStorage.getItem(PROGRESS_KEY) || "{}") as Record<string, unknown>
      const logs = Array.isArray(progress.logs) ? progress.logs as Array<Record<string, unknown>> : []
      const feedbackReport=buildEvidenceLinkedFeedback({sessionId:replay.id,course,source:"voice",turns:turnsRef.current.map(turn=>({role:turn.role,text:turn.text,feedback:turn.feedback})),createdAt:new Date().toISOString(),previous:extractInsightSnapshots(logs)})
      setFeedbackReport(feedbackReport)
      const events = turnsRef.current
        .filter(turn => turn.role !== "system")
        .map(turn => {
          const speaker = turn.role === "candidate"
            ? "Candidate"
            : `Interviewer ${turn.interviewer ?? ""}`.trim()
          const feedback = turn.feedback ? ` | Feedback: ${turn.feedback}` : ""
          const confidence = typeof turn.confidence === "number" ? ` | Confidence: ${turn.confidence}%` : ""
          return `${speaker}: ${turn.text}${feedback}${confidence}`
        })

      localStorage.setItem(PROGRESS_KEY, JSON.stringify({
        ...progress,
        sessions: Number(progress.sessions ?? 0) + 1,
        logs: [{
          id: replay.id,
          title: `Gemini Live Next · ${course}`,
          score: 0,
          date: new Date().toISOString(),
          events,
          replayId: replay.id,
          durationSeconds: duration,
          feedbackReport,
          mockSession,
        }, ...logs].slice(0, 50),
      }))

      if (interviewContext.material) localStorage.removeItem(INTERVIEW_CONTEXT_KEY)
    } catch {
      // Completion should not fail only because local storage is unavailable.
    }
  }

  function teardown(save: boolean) {
    if (save) saveProgress()
    generationRef.current += 1
    if (setupTimerRef.current) clearTimeout(setupTimerRef.current)
    if (finishTimerRef.current) clearTimeout(finishTimerRef.current)
    setupTimerRef.current = null
    finishTimerRef.current = null
    endingRef.current = true
    setupReadyRef.current = false

    const ws = wsRef.current
    wsRef.current = null
    try { ws?.close(1000, "Interview ended") } catch { /* already closed */ }

    stopOutput()
    try { processorRef.current?.disconnect() } catch { /* ignore */ }
    try { micSourceRef.current?.disconnect() } catch { /* ignore */ }
    try { silentGainRef.current?.disconnect() } catch { /* ignore */ }
    processorRef.current = null
    micSourceRef.current = null
    silentGainRef.current = null

    streamRef.current?.getTracks().forEach(trackItem => trackItem.stop())
    streamRef.current = null
    cameraStreamRef.current?.getTracks().forEach(trackItem => trackItem.stop())
    cameraStreamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setCameraOn(false)

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
    teardown(false)
    setPhase("lobby")
    setStatus("idle")
    setNotice("")
    setSeconds(0)
    setConnectedAt(null)
    syncTurns([])
    setWorkingAnalysis("")
    setConfidenceTarget(null)
    setFeedbackReport(null)
    setMockStageIndex(0)
    setMockVisited([])
    setSecondProblemSent(false)
    lastMockAnswerCountRef.current=0
    endingRef.current = false
    mutedRef.current = false
    setMuted(false)
  }

  const statusLabel = status === "speaking"
    ? "Listening to you"
    : status === "thinking"
      ? "Interviewer is thinking"
      : status === "interviewer"
        ? "Interviewer is speaking"
        : status === "connected"
          ? "Live and listening"
          : status === "connecting"
            ? "Connecting to Gemini"
            : status === "error"
              ? "Connection issue"
              : "Ready"

  if (phase === "lobby" || phase === "connecting" || phase === "reconnect") {
    return <main className="min-h-screen bg-[#f2f5f5] text-[#172b3a]">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between gap-3">
          <Button asChild variant="ghost"><Link href="/interviews"><ArrowLeft />Interview Hub</Link></Button>
          <Badge className="bg-[#102a43] text-white"><Headphones className="size-3.5" />Gemini Live Next</Badge>
        </div>
        <section className="grid gap-5 lg:grid-cols-[1.15fr_.85fr]">
          <Card className="shadow-none">
            <CardHeader>
              <CardTitle className="font-serif text-3xl">Adaptive live academic interview</CardTitle>
              <CardDescription>Natural voice conversation with branching follow-ups, optional two-interviewer roles, unseen material, confidence calibration and camera analysis of written working.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <label><span className="mb-1 block text-xs font-bold uppercase text-slate-500">Subject family</span><NativeSelect value={track} onChange={event => { const next = event.target.value as TrackId; setTrack(next); const found = tracks.find(item => item.id === next); if (found) setCourse(found.courses[0]) }}>{tracks.map(item => <NativeSelectOption key={item.id} value={item.id}>{item.short}</NativeSelectOption>)}</NativeSelect></label>
              <label><span className="mb-1 block text-xs font-bold uppercase text-slate-500">Course</span><NativeSelect value={course} onChange={event => setCourse(event.target.value)}>{courses.map(item => <NativeSelectOption key={item}>{item}</NativeSelectOption>)}</NativeSelect></label>
              <label><span className="mb-1 block text-xs font-bold uppercase text-slate-500">Interviewer style</span><NativeSelect value={personaKey} onChange={event => setPersonaKey(event.target.value as InterviewPersonaKey)}>{Object.keys(interviewerPersonas).map(item => <NativeSelectOption key={item}>{item}</NativeSelectOption>)}</NativeSelect></label>
              <label><span className="mb-1 block text-xs font-bold uppercase text-slate-500">Session style</span><NativeSelect value={mode} onChange={event => setMode(event.target.value as InterviewMode)}>{["Tutor", "Realistic", "No-hint", "Stress"].map(item => <NativeSelectOption key={item}>{item}</NativeSelectOption>)}</NativeSelect></label>
              <label className="sm:col-span-2"><span className="mb-1 block text-xs font-bold uppercase text-slate-500">Voice</span><NativeSelect value={voice} onChange={event => setVoice(event.target.value as GeminiVoice)}>{(Object.keys(voiceLabels) as GeminiVoice[]).map(item => <NativeSelectOption key={item} value={item}>{voiceLabels[item]}</NativeSelectOption>)}</NativeSelect></label>
              <label className="sm:col-span-2"><span className="mb-1 block text-xs font-bold uppercase text-slate-500">Full-length mock session</span><NativeSelect value={mockDuration??"standard"} onChange={event=>setMockDuration(event.target.value==="standard"?null:Number(event.target.value) as MockDuration)}><NativeSelectOption value="standard">Standard voice interview</NativeSelectOption>{mockDurations.map(minutes=><NativeSelectOption key={minutes} value={String(minutes)}>{minutes}-minute academic mock</NativeSelectOption>)}</NativeSelect><span className="mt-1 block text-xs text-slate-500">A planned academic pace, never an interruption. Longer voice mocks need a controlled secure reconnect.</span></label>
              <label><span className="mb-1 block text-xs font-bold uppercase text-slate-500">Time to think</span><NativeSelect value={voicePace} onChange={event => setVoicePace(event.target.value as InterviewVoicePace)}><NativeSelectOption value="thoughtful">Thoughtful · longer pauses</NativeSelectOption><NativeSelectOption value="balanced">Natural conversation</NativeSelectOption><NativeSelectOption value="quick">Quick responses</NativeSelectOption></NativeSelect></label>
              <button type="button" onClick={() => setAllowBargeIn(value => !value)} className="rounded-xl border bg-white p-3 text-left"><strong>{allowBargeIn ? "Interruptions allowed" : "Interruptions disabled"}</strong><p className="mt-1 text-xs text-slate-500">Let the student speak over the interviewer naturally. Headphones recommended.</p></button>

              <button onClick={() => setPanelMode(value => !value)} className={`sm:col-span-2 rounded-xl border p-4 text-left ${panelMode ? "border-cyan-500 bg-cyan-50" : "bg-white"}`}>
                <div className="flex items-center gap-2"><Users className="size-4" /><strong>Two-interviewer panel</strong></div>
                <p className="mt-1 text-sm text-slate-500">Interviewer A develops your reasoning; Interviewer B pressure-tests assumptions and alternatives.</p>
              </button>

              {interviewContext.material && <div className="sm:col-span-2 rounded-xl border border-blue-200 bg-blue-50 p-4"><strong>Interview context loaded: {interviewContext.title || "unseen material"}</strong><p className="mt-1 text-sm text-blue-900">The interviewer will use the material and your preparation notes.</p></div>}
              <button type="button" onClick={() => setEvidenceEnabled(value => !value)} className="sm:col-span-2 rounded-xl border bg-white p-3 text-left text-sm"><strong>{evidenceEnabled ? "Interactive evidence on" : "Add interactive unseen evidence"}</strong><p className="mt-1 text-xs text-slate-500">Reveal charts, data and changed conditions between spoken answers.</p></button>
              {retestFocus && <div className="sm:col-span-2 rounded-xl border border-amber-200 bg-amber-50 p-4"><strong>Delayed oral retest due</strong><p className="mt-1 text-sm text-amber-900">The same reasoning habit will return through a fresh problem without revealing the target first.</p></div>}
              {notice && <div className="sm:col-span-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{notice}</div>}
              {phase === "reconnect" && <div className="sm:col-span-2 rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">Your interview transcript is still here. Resuming creates a fresh secure voice connection and recaps the academic discussion; you do not need to start over.</div>}

              <div className="sm:col-span-2 flex flex-wrap gap-2">
                <Button size="lg" onClick={() => void startInterview(phase === "reconnect")} disabled={phase === "connecting" || configured === false}>{phase === "connecting" ? <Loader2 className="animate-spin" /> : <Mic />}{phase === "connecting" ? "Connecting…" : phase === "reconnect" ? "Resume interview" : "Start live interview"}</Button>
                {phase === "reconnect" && <><Button variant="outline" onClick={() => teardown(true)}>Save & finish</Button><Button variant="ghost" onClick={reset}>Start a new interview</Button></>}
                <Button asChild variant="outline"><Link href="/pre-interview-material">Prepare unseen material first</Link></Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 bg-[#102a43] text-white shadow-none">
            <CardHeader><Brain className="size-5 text-[#8dd7de]" /><CardTitle className="font-serif text-2xl">{coursePathway.label} interview pathway</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm leading-6 text-white/80">
              {coursePathway.reasoningFocus.map(item => <p key={item}>• {item}</p>)}
              <p className="pt-2 text-white/60">Your interviewer also examines how you deepen, repair or revise reasoning after a challenge.</p>
              <p>• Whether your confidence matches the quality of your argument.</p>
              <p>• How you respond to unfamiliar material and changed conditions.</p>
              <p>• Whether written calculations and diagrams support what you say.</p>
              <p>• Which reasoning habit should return later as a retention check.</p>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  }

  if (phase === "ended") {
    return <main className="min-h-screen bg-[#f2f5f5] text-[#172b3a]">
      <div className="mx-auto max-w-4xl px-4 py-12">
        <Card className="shadow-none">
          <CardHeader><CheckCircle2 className="size-8 text-emerald-600" /><CardTitle className="font-serif text-3xl">Interview saved to Reasoning Replay</CardTitle><CardDescription>Your transcript, confidence estimates, branching path, feedback and any shared working summary are ready for review.{mockDuration ? <span className="mt-2 block font-semibold text-[#147d91]">{mockCompletionReport({minutes:mockDuration,elapsedSeconds:seconds,candidateAnswers:candidateTurnCount,visitedStages:mockVisited})?.status}. Actual practice: {(seconds/60).toFixed(1)} of {mockDuration} minutes; {mockVisited.length} academic stages reached.</span> : null}</CardDescription></CardHeader>
          <CardContent className="flex flex-wrap gap-2"><Button asChild><Link href="/reasoning-replay">Open reasoning replay</Link></Button><Button variant="outline" onClick={reset}><RefreshCw />New interview</Button></CardContent>
        </Card>
        {feedbackReport?<InterviewEvidenceReview report={feedbackReport}/>:null}
      </div>
    </main>
  }

  return <main className="min-h-screen bg-[#eef2f3] text-[#172b3a]">
    <header className="sticky top-0 z-50 border-b bg-white">
      <div className="mx-auto flex max-w-[1500px] flex-wrap items-center gap-3 px-4 py-3">
        <Badge className="bg-emerald-700">Live</Badge>
        <strong className="mr-auto">{course} · {statusLabel}</strong>
        <Badge variant="outline">{formatTime(seconds)}</Badge>
        {mockStatus ? <Badge variant="outline">{mockStatus.stage.label} · {mockStatus.remainingSeconds===0?"time reached":formatTime(mockStatus.remainingSeconds)+" left"}</Badge> : null}
        <Button size="sm" variant="outline" onClick={toggleMute}>{muted ? <MicOff /> : <Mic />}{muted ? "Unmute" : "Mute"}</Button>
        <Button size="sm" variant="destructive" onClick={finishInterview}><PhoneOff />Finish</Button>
      </div>
    </header>

    <div className="mx-auto grid max-w-[1500px] gap-4 px-4 py-5 xl:grid-cols-[minmax(0,1fr)_390px]">
      <section>
        <Card className="shadow-none">
          <CardHeader><CardTitle className="font-serif text-2xl">Live conversation</CardTitle><CardDescription>{panelMode ? "Two academic roles are alternating." : "One adaptive academic interviewer."} Speak naturally and ask for clarification when needed.</CardDescription></CardHeader>
          <CardContent className="space-y-3">
            {turns.filter(turn => turn.role !== "system").map(turn => <div key={turn.id} className={`rounded-2xl p-4 ${turn.role === "candidate" ? "ml-8 border bg-white" : "mr-8 bg-[#102a43] text-white"}`}>
              <div className="flex flex-wrap items-center gap-2"><Badge variant={turn.role === "candidate" ? "outline" : "secondary"}>{turn.role === "candidate" ? "You" : `Interviewer ${turn.interviewer ?? ""}`.trim()}</Badge>{typeof turn.confidence === "number" && <Badge variant="outline" className={turn.role === "candidate" ? "" : "border-white/30 text-white"}>Confidence {turn.confidence}%</Badge>}</div>
              <p className="mt-2 text-sm leading-6">{turn.text}</p>
              {turn.feedback && <p className={`mt-2 rounded-xl p-3 text-xs leading-5 ${turn.role === "candidate" ? "bg-amber-50 text-amber-950" : "bg-white/10"}`}><strong>Feedback:</strong> {turn.feedback}</p>}
              {turn.workingSummary && <p className="mt-2 rounded-xl bg-cyan-50 p-3 text-xs leading-5 text-cyan-950"><strong>Working snapshot:</strong> {turn.workingSummary}</p>}
            </div>)}
            {candidateLive && <div className="ml-8 rounded-2xl border bg-white p-4 text-sm text-slate-500">{candidateLive}</div>}
            {interviewerLive && <div className="mr-8 rounded-2xl bg-[#102a43] p-4 text-sm text-white/80">{interviewerLive}</div>}
            {confidenceTarget && <div className="rounded-2xl border border-cyan-200 bg-cyan-50 p-4"><div className="flex items-center gap-2"><Gauge className="size-4 text-cyan-800" /><strong>How confident were you in that answer?</strong></div><div className="mt-3 flex flex-wrap gap-2">{[20, 40, 60, 80, 100].map(value => <Button key={value} size="sm" variant="outline" onClick={() => setConfidence(value)}>{value}%</Button>)}</div></div>}
          </CardContent>
        </Card>
      </section>

      <aside className="space-y-4">
        {mockStatus && mockDuration ? <Card className="border-cyan-200 bg-cyan-50"><CardHeader><CardTitle className="text-lg">Timed mock · {mockDuration} minutes</CardTitle><CardDescription>Stage {mockStatus.index+1} of {mockStatus.format.stages.length}: {mockStatus.stage.label}. {mockStatus.scheduledTimeReached?"Scheduled time reached: finish naturally after your reasoning.":"Progression occurs after completed candidate answers."}</CardDescription></CardHeader><CardContent className="space-y-2">{mockStatus.stage.id==="second-problem"&&!secondProblemSent?<Button type="button" onClick={startSecondProblem} className="w-full">Introduce second academic problem</Button>:null}{mockDuration>=40&&seconds>=24*60?<><p className="text-xs text-slate-600">A new secure connection may be needed to finish this longer mock. Your transcript and elapsed time stay in this browser.</p><Button type="button" variant="outline" onClick={plannedVoiceReconnect} className="w-full">Reconnect voice to continue</Button></>:null}</CardContent></Card> : null}
        {evidenceChallenge ? <InterviewEvidencePanel challenge={evidenceChallenge} stageIndex={evidenceStage} canReveal={canRevealNextEvidence(evidenceStage,candidateTurnCount,evidenceLastAnswerCount)} onReveal={revealEvidence} disabled={phase!=="live"}/> : null}
        <Card className="shadow-none">
          <CardHeader><div className="flex items-center justify-between gap-3"><div><Camera className="size-5 text-[#147d91]" /><CardTitle className="mt-2 font-serif text-xl">Show your working</CardTitle></div><Button size="sm" variant="outline" onClick={() => void toggleCamera()}>{cameraOn ? <CameraOff /> : <Camera />}{cameraOn ? "Stop" : "Camera"}</Button></div><CardDescription>No continuous video is uploaded. A still image is captured only when you press Analyse working.</CardDescription></CardHeader>
          <CardContent className="space-y-3"><div className="aspect-video overflow-hidden rounded-xl border bg-slate-950"><video ref={videoRef} className="h-full w-full object-cover" muted playsInline /></div><Button className="w-full" onClick={() => void analyseCameraWorking()} disabled={!cameraOn || cameraAnalysing}>{cameraAnalysing ? <Loader2 className="animate-spin" /> : <ScanSearch />}{cameraAnalysing ? "Analysing…" : "Analyse working"}</Button>{workingAnalysis && <details className="rounded-xl bg-slate-50 p-3" open><summary className="cursor-pointer text-sm font-semibold">Latest working analysis</summary><p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-slate-600">{workingAnalysis}</p></details>}</CardContent>
        </Card>

        {interviewContext.material && <Card className="shadow-none"><CardHeader><CardTitle className="font-serif text-xl">Interview material</CardTitle><CardDescription>{interviewContext.title}</CardDescription></CardHeader><CardContent><p className="line-clamp-6 text-sm leading-6">{interviewContext.material}</p></CardContent></Card>}

        <Card className="border-0 bg-[#102a43] text-white shadow-none"><CardContent className="space-y-2 p-5 text-sm text-white/75"><p className="flex items-center gap-2"><Volume2 className="size-4" />{panelMode ? "Panel roles use two available English browser voices for clearer speaker distinction." : "Gemini streaming audio active."}</p><p>Confidence ratings are private coaching evidence, not admissions predictions.</p></CardContent></Card>
      </aside>
    </div>
  </main>
}

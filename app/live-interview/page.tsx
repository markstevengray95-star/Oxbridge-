"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { ArrowLeft, AudioLines, Brain, CheckCircle2, Clock3, GraduationCap, Headphones, Loader2, Mic, MicOff, PhoneOff, RefreshCw, ShieldCheck, Sparkles, Volume2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { Progress } from "@/components/ui/progress"
import { tracks, type TrackId } from "@/lib/oxbridge-data"
import { interviewerPersonas, type InterviewMode, type InterviewPersonaKey } from "@/lib/coach-suite"
import { interviewProfileFor } from "@/lib/prep-suite"

type Phase = "lobby" | "connecting" | "live" | "ended"
type ConnectionState = "idle" | "connecting" | "connected" | "speaking" | "thinking" | "error"
type TranscriptTurn = { id: string; role: "interviewer" | "system"; text: string; final?: boolean }
type RealtimeEvent = { type?: string; [key: string]: unknown }

const profileKey = "oxbridge-tutor-profile-v2"
const progressKey = "oxbridge-tutor-progress-v2"
const clientIdKey = "oxbridge-client-id-v1"

function formatTime(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`
}

function stableClientId() {
  const existing = localStorage.getItem(clientIdKey)
  if (existing) return existing
  const value = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `client-${Date.now()}-${Math.random().toString(36).slice(2)}`
  localStorage.setItem(clientIdKey, value)
  return value
}

export default function LiveInterviewPage() {
  const [phase, setPhase] = useState<Phase>("lobby")
  const [connectionState, setConnectionState] = useState<ConnectionState>("idle")
  const [track, setTrack] = useState<TrackId>("physical")
  const [course, setCourse] = useState("Physics")
  const [personaKey, setPersonaKey] = useState<InterviewPersonaKey>("Socratic")
  const [mode, setMode] = useState<InterviewMode>("Realistic")
  const [muted, setMuted] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [notice, setNotice] = useState("")
  const [transcript, setTranscript] = useState<TranscriptTurn[]>([])
  const [liveTranscript, setLiveTranscript] = useState("")
  const [connectedAt, setConnectedAt] = useState<number | null>(null)

  const pcRef = useRef<RTCPeerConnection | null>(null)
  const dcRef = useRef<RTCDataChannel | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

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

  const appendSystem = (text: string) => setTranscript(t => [...t, { id: `${Date.now()}-${Math.random()}`, role: "system", text, final: true }])

  const handleRealtimeEvent = (event: RealtimeEvent) => {
    const type = typeof event.type === "string" ? event.type : ""
    if (type === "session.created" || type === "session.updated") {
      setConnectionState("connected")
      return
    }
    if (type === "input_audio_buffer.speech_started") {
      setConnectionState("speaking")
      return
    }
    if (type === "input_audio_buffer.speech_stopped") {
      setConnectionState("thinking")
      return
    }
    if (type === "response.output_audio_transcript.delta") {
      const delta = typeof event.delta === "string" ? event.delta : ""
      if (delta) setLiveTranscript(current => current + delta)
      setConnectionState("connected")
      return
    }
    if (type === "response.output_audio_transcript.done") {
      const finalText = (typeof event.transcript === "string" ? event.transcript : liveTranscript).trim()
      if (finalText) setTranscript(t => [...t, { id: `${Date.now()}-${Math.random()}`, role: "interviewer", text: finalText, final: true }])
      setLiveTranscript("")
      setConnectionState("connected")
      return
    }
    if (type === "response.done") {
      setConnectionState("connected")
      return
    }
    if (type === "error") {
      const error = event.error && typeof event.error === "object" ? event.error as { message?: unknown } : undefined
      setNotice(typeof error?.message === "string" ? error.message : "The realtime interview reported an error. You can continue in AI Interview mode.")
      setConnectionState("error")
    }
  }

  const startInterview = async () => {
    if (phase === "connecting") return
    setPhase("connecting")
    setConnectionState("connecting")
    setNotice("")
    setTranscript([])
    setLiveTranscript("")
    setSeconds(0)

    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error("Microphone access is not available in this browser.")

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const pc = new RTCPeerConnection()
      pcRef.current = pc
      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
          setConnectionState("error")
          setNotice("The live audio connection ended unexpectedly. Your interview can continue in the text/voice AI Interview room.")
        }
      }

      const remoteAudio = new Audio()
      remoteAudio.autoplay = true
      audioRef.current = remoteAudio
      pc.ontrack = event => {
        remoteAudio.srcObject = event.streams[0]
        void remoteAudio.play().catch(() => {})
      }

      stream.getTracks().forEach(trackItem => pc.addTrack(trackItem, stream))

      const dc = pc.createDataChannel("oai-events")
      dcRef.current = dc
      dc.addEventListener("message", message => {
        try { handleRealtimeEvent(JSON.parse(message.data) as RealtimeEvent) } catch { /* ignore non-JSON events */ }
      })
      dc.addEventListener("open", () => {
        setConnectionState("connected")
        const update = {
          type: "session.update",
          session: {
            type: "realtime",
            output_modalities: ["audio"],
            audio: {
              input: { turn_detection: { type: "semantic_vad" } },
              output: { voice: "marin" },
            },
          },
        }
        dc.send(JSON.stringify(update))
        dc.send(JSON.stringify({
          type: "response.create",
          response: {
            instructions: `Begin the formal ${course} practice interview now. Give a brief professional greeting, then ask one challenging but accessible opening question appropriate to ${course}. Do not explain the answer.`,
          },
        }))
      })

      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)
      const params = new URLSearchParams({ course, track, persona: personaKey, mode })
      const response = await fetch(`/api/realtime-session?${params.toString()}`, {
        method: "POST",
        body: offer.sdp,
        headers: {
          "Content-Type": "application/sdp",
          "x-oxbridge-client-id": stableClientId(),
        },
      })
      if (!response.ok) {
        const text = await response.text().catch(() => "")
        throw new Error(response.status === 503 ? "Live Realtime voice is not configured on the server yet." : text || "Could not create the live voice session.")
      }
      const answerSdp = await response.text()
      await pc.setRemoteDescription({ type: "answer", sdp: answerSdp })
      setConnectedAt(Date.now())
      setPhase("live")
      appendSystem("Live voice session connected. Audio is processed for the realtime conversation; this app does not intentionally save microphone recordings.")
    } catch (error) {
      closeConnection(false)
      setPhase("lobby")
      setConnectionState("error")
      setNotice(error instanceof Error ? error.message : "Could not start live voice. Use AI Interview as the fallback.")
    }
  }

  const toggleMute = () => {
    const next = !muted
    streamRef.current?.getAudioTracks().forEach(trackItem => { trackItem.enabled = !next })
    setMuted(next)
  }

  const sendInterviewerNudge = () => {
    const dc = dcRef.current
    if (!dc || dc.readyState !== "open") return
    dc.send(JSON.stringify({
      type: "response.create",
      response: {
        instructions: "The candidate has asked you to continue. Ask one concise follow-up that probes the weakest or least justified part of their most recent reasoning. Do not give the answer.",
      },
    }))
    setConnectionState("thinking")
  }

  function closeConnection(save = true) {
    try { dcRef.current?.close() } catch { /* ignore */ }
    try { pcRef.current?.close() } catch { /* ignore */ }
    streamRef.current?.getTracks().forEach(trackItem => trackItem.stop())
    if (audioRef.current) audioRef.current.srcObject = null
    dcRef.current = null
    pcRef.current = null
    streamRef.current = null
    audioRef.current = null
    setRunningStateAfterClose(save)
  }

  const setRunningStateAfterClose = (save: boolean) => {
    if (!save) return
    setPhase("ended")
    setConnectionState("idle")
    if (connectedAt) {
      try {
        const saved = JSON.parse(localStorage.getItem(progressKey) || "{}") as Record<string, unknown>
        const logs = Array.isArray(saved.logs) ? saved.logs as Array<Record<string, unknown>> : []
        const sessions = Number(saved.sessions ?? 0)
        const events = transcript.filter(t => t.role !== "system").map(t => `Interviewer: ${t.text}`)
        localStorage.setItem(progressKey, JSON.stringify({
          ...saved,
          sessions: sessions + 1,
          logs: [{ id: `live-${Date.now()}`, title: `Live Voice Interview · ${course}`, score: 0, date: new Date().toLocaleDateString("en-GB"), events: [...events, `Duration: ${formatTime(seconds)}`, "Live voice session completed; no automated score assigned because candidate audio is not stored as a transcript by this interface."] }, ...logs].slice(0, 40),
        }))
      } catch { /* session completion does not depend on persistence */ }
    }
  }

  const statusLabel = connectionState === "speaking" ? "You are speaking" : connectionState === "thinking" ? "Interviewer is thinking" : connectionState === "connected" ? "Live and listening" : connectionState === "connecting" ? "Connecting" : connectionState === "error" ? "Connection issue" : "Ready"

  if (phase === "lobby" || phase === "connecting") return <main className="min-h-screen bg-[#f2f5f5] text-[#172b3a]">
    <div className="mx-auto max-w-6xl px-4 py-7 sm:px-6 lg:px-8 lg:py-11">
      <div className="mb-7 flex items-center justify-between gap-3"><Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-[#526a75]"><ArrowLeft className="size-4" />Preparation Studio</Link><Badge className="border-0 bg-[#102a43] text-white"><AudioLines className="mr-1 size-3" />Realtime voice</Badge></div>
      <section className="grid overflow-hidden rounded-[2rem] border border-[#dbe5e7] bg-white shadow-[0_30px_90px_rgba(16,42,67,.09)] lg:grid-cols-[1.1fr_.9fr]">
        <div className="p-6 sm:p-9 lg:p-12"><div className="mb-7 flex items-center gap-3"><span className="grid size-12 place-items-center rounded-2xl bg-[#102a43] text-[#8dd7de]"><Headphones className="size-5" /></span><div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#147d91]">Live Voice Interview</p><h1 className="font-serif text-3xl font-bold sm:text-4xl">Speak naturally. Be challenged live.</h1></div></div><p className="max-w-2xl text-base leading-7 text-[#667984]">A continuous academic conversation using your microphone and live interviewer audio. The interviewer listens for each turn, responds aloud and adapts the next question to the discussion.</p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2"><label className="space-y-1.5"><span className="text-xs font-bold uppercase tracking-wider text-[#667984]">Subject family</span><NativeSelect value={track} onChange={e => { const next=e.target.value as TrackId; setTrack(next); const found=tracks.find(t=>t.id===next); if(found) setCourse(found.courses[0]) }}>{tracks.map(t => <NativeSelectOption key={t.id} value={t.id}>{t.short}</NativeSelectOption>)}</NativeSelect></label><label className="space-y-1.5"><span className="text-xs font-bold uppercase tracking-wider text-[#667984]">Course</span><NativeSelect value={course} onChange={e => setCourse(e.target.value)}>{subjectCourses.map(c => <NativeSelectOption key={c}>{c}</NativeSelectOption>)}</NativeSelect></label><label className="space-y-1.5"><span className="text-xs font-bold uppercase tracking-wider text-[#667984]">Interviewer</span><NativeSelect value={personaKey} onChange={e => setPersonaKey(e.target.value as InterviewPersonaKey)}>{Object.keys(interviewerPersonas).map(p => <NativeSelectOption key={p}>{p}</NativeSelectOption>)}</NativeSelect></label><label className="space-y-1.5"><span className="text-xs font-bold uppercase tracking-wider text-[#667984]">Session</span><NativeSelect value={mode} onChange={e => setMode(e.target.value as InterviewMode)}>{["Tutor","Realistic","No-hint","Stress"].map(m => <NativeSelectOption key={m}>{m}</NativeSelectOption>)}</NativeSelect></label></div>
          {notice && <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm leading-5 text-amber-900">{notice}</div>}
          <div className="mt-7 flex flex-wrap gap-2"><Button className="h-12 rounded-xl px-6" onClick={startInterview} disabled={phase === "connecting"}>{phase === "connecting" ? <><Loader2 className="animate-spin" />Connecting microphone…</> : <><Mic />Start live interview</>}</Button>{notice && <Button variant="outline" asChild><Link href="/ai-interview"><Sparkles />Use AI Interview fallback</Link></Button>}</div>
        </div>
        <aside className="border-t bg-[#102a43] p-6 text-white sm:p-9 lg:border-l lg:border-t-0 lg:p-10"><Badge className="border-white/15 bg-white/10 text-white">{persona.label}</Badge><h2 className="mt-5 font-serif text-2xl font-bold">Before you connect</h2><div className="mt-6 space-y-4 text-sm leading-6 text-blue-50/75"><p><strong className="text-white">Microphone permission.</strong> Your browser will ask for access before the session starts.</p><p><strong className="text-white">Natural turn-taking.</strong> Speak in full reasoning chains; the interviewer responds after detecting the end of your turn.</p><p><strong className="text-white">No client API secret.</strong> The browser exchanges session data through the app server.</p><p><strong className="text-white">Fallback retained.</strong> If realtime voice cannot connect, the AI Interview text/voice room remains available.</p></div><div className="mt-7 rounded-2xl bg-white/8 p-4 text-sm"><ShieldCheck className="mb-2 size-5 text-[#8dd7de]" /><p className="font-semibold">Privacy-conscious design</p><p className="mt-1 leading-5 text-white/65">This interface does not intentionally save microphone recordings. Only session metadata and interviewer transcript fragments may be written to local progress.</p></div></aside>
      </section>
    </div>
  </main>

  if (phase === "ended") return <main className="min-h-screen bg-[#f2f5f5] text-[#172b3a]"><div className="mx-auto max-w-4xl px-4 py-12 sm:px-6"><Card className="border-0 shadow-[0_24px_70px_rgba(16,42,67,.08)]"><CardHeader><Badge className="w-fit">Session complete</Badge><CardTitle className="font-serif text-3xl">Live interview finished</CardTitle><CardDescription>{course} · {persona.label} · {formatTime(seconds)}</CardDescription></CardHeader><CardContent className="space-y-5"><div className="grid gap-3 sm:grid-cols-3"><div className="rounded-2xl bg-[#edf7f8] p-4"><p className="text-xs uppercase tracking-wider text-[#657582]">Duration</p><p className="mt-1 text-2xl font-bold">{formatTime(seconds)}</p></div><div className="rounded-2xl bg-[#edf7f8] p-4"><p className="text-xs uppercase tracking-wider text-[#657582]">Interviewer turns captured</p><p className="mt-1 text-2xl font-bold">{transcript.filter(t=>t.role==="interviewer").length}</p></div><div className="rounded-2xl bg-[#edf7f8] p-4"><p className="text-xs uppercase tracking-wider text-[#657582]">Scoring</p><p className="mt-1 text-sm font-semibold">Not auto-scored</p></div></div><div className="rounded-2xl border p-4 text-sm leading-6 text-[#60737d]"><CheckCircle2 className="mb-2 size-5 text-emerald-700" />For live audio, this mode deliberately avoids inventing a detailed score when the candidate’s full spoken transcript has not been retained. Use the AI Interview room when you want transcript-based analytics.</div><div className="flex flex-wrap gap-2"><Button onClick={() => { setPhase("lobby"); setConnectionState("idle"); setTranscript([]); setLiveTranscript(""); setNotice(""); setMuted(false); setConnectedAt(null); setSeconds(0) }}><RefreshCw />New live interview</Button><Button variant="outline" asChild><Link href="/ai-interview"><Brain />Open scored AI Interview</Link></Button><Button variant="outline" asChild><Link href="/">Preparation Studio</Link></Button></div></CardContent></Card></div></main>

  return <main className="min-h-screen bg-[#eef3f3] text-[#172b3a]">
    <div className="sticky top-0 z-30 border-b border-[#dbe5e7] bg-white/95 backdrop-blur"><div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8"><div className="flex min-w-0 items-center gap-3"><span className="grid size-9 flex-none place-items-center rounded-xl bg-[#102a43] text-[#8dd7de]"><GraduationCap className="size-4" /></span><div className="min-w-0"><p className="truncate text-sm font-bold">Live Voice · {course}</p><p className="truncate text-xs text-[#71828a]">{persona.label}</p></div></div><div className="flex items-center gap-2"><Badge variant="outline" className={connectionState === "error" ? "border-red-300 text-red-700" : ""}>{statusLabel}</Badge><span className="inline-flex items-center gap-1.5 rounded-full border bg-white px-3 py-1.5 text-sm font-bold tabular-nums"><Clock3 className="size-4 text-[#147d91]" />{formatTime(seconds)}</span></div></div></div>
    <div className="mx-auto grid max-w-7xl gap-5 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:px-8 lg:py-8"><Card className="min-h-[620px] overflow-hidden border-[#d7e2e4] shadow-[0_16px_50px_rgba(16,42,67,.06)]"><CardHeader className="border-b bg-white p-5 sm:p-7"><div className="flex flex-wrap gap-2"><Badge>{mode}</Badge><Badge variant="outline">{personaKey}</Badge><Badge variant="outline">Live audio</Badge></div><p className="mt-5 text-xs font-bold uppercase tracking-[.16em] text-[#147d91]">Conversation</p><CardTitle className="mt-2 font-serif text-2xl sm:text-3xl">Think aloud rather than trying to sound polished.</CardTitle><CardDescription>The interviewer will respond after detecting the end of your spoken turn. You can mute temporarily without ending the interview.</CardDescription></CardHeader><CardContent className="space-y-4 p-5 sm:p-7">{notice && <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{notice}</div>}<div className="max-h-[420px] space-y-3 overflow-y-auto rounded-2xl bg-[#f8fafb] p-4">{transcript.length === 0 && !liveTranscript && <div className="grid min-h-64 place-items-center text-center"><div><Volume2 className="mx-auto size-8 text-[#147d91]" /><p className="mt-3 font-serif text-xl font-bold">Listening for the interviewer…</p><p className="mt-1 text-sm text-[#71828a]">The opening question will arrive as audio.</p></div></div>}{transcript.map(turn => <div key={turn.id} className={turn.role === "system" ? "rounded-xl border border-dashed p-3 text-xs text-[#657582]" : "rounded-2xl bg-white p-4 shadow-sm"}><p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-[#147d91]">{turn.role === "system" ? "Session" : "Interviewer"}</p><p className="text-sm leading-6">{turn.text}</p></div>)}{liveTranscript && <div className="rounded-2xl bg-white p-4 shadow-sm"><p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-[#147d91]">Interviewer · speaking</p><p className="text-sm leading-6">{liveTranscript}<span className="animate-pulse">▍</span></p></div>}</div><div className="flex flex-wrap items-center justify-between gap-3"><div className="flex flex-wrap gap-2"><Button variant={muted ? "default" : "outline"} onClick={toggleMute}>{muted ? <MicOff /> : <Mic />}{muted ? "Unmute" : "Mute"}</Button><Button variant="outline" onClick={sendInterviewerNudge} disabled={connectionState === "thinking"}>Ask interviewer to continue</Button></div><Button variant="destructive" onClick={() => closeConnection(true)}><PhoneOff />End interview</Button></div></CardContent></Card><aside className="space-y-4"><Card className="shadow-none"><CardHeader><CardTitle className="font-serif text-xl">Live status</CardTitle></CardHeader><CardContent className="space-y-3"><div className="flex items-center justify-between text-sm"><span>Connection</span><strong>{statusLabel}</strong></div><div className="flex items-center justify-between text-sm"><span>Microphone</span><strong>{muted ? "Muted" : "On"}</strong></div><div className="flex items-center justify-between text-sm"><span>Elapsed</span><strong>{formatTime(seconds)}</strong></div></CardContent></Card><Card className="shadow-none"><CardHeader><CardTitle className="font-serif text-xl">Academic focus</CardTitle><CardDescription>The interviewer has been briefed to probe these areas.</CardDescription></CardHeader><CardContent className="flex flex-wrap gap-2">{profile.emphasis.slice(0,6).map(item => <Badge key={item} variant="outline">{item}</Badge>)}</CardContent></Card><Card className="border-[#cfe5e8] bg-[#edf7f8] shadow-none"><CardContent className="p-4 text-sm leading-6 text-[#4f6772]"><Sparkles className="mb-2 size-5 text-[#147d91]" /><strong>Interview behaviour:</strong> the live tutor is instructed to challenge reasoning, not hand over solutions. Revising an answer after new evidence is treated as part of the discussion.</CardContent></Card></aside></div>
  </main>
}

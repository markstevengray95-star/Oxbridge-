"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { ArrowLeft, ArrowRight, Brain, CheckCircle2, GraduationCap, Loader2, Mic, MicOff, RefreshCw, Sparkles, Users } from "lucide-react"
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

type PanelTurn = { role: "interviewer" | "candidate"; text: string; speaker: string }
type Phase = "lobby" | "live" | "review"
type AiReply = { reply: string; provider: "openai" | "local"; configured?: boolean; degraded?: boolean }
type Result = { total: number; reasoning: number; subject: number; flexibility: number; clarity: number; error: string; strengths: string[]; next: string[] }

const profileKey = "oxbridge-tutor-profile-v2"
const progressKey = "oxbridge-tutor-progress-v2"

function scoreResponse(text: string, concepts: string[]): Result {
  const clean = text.toLowerCase().trim()
  const words = clean ? clean.split(/\s+/).length : 0
  const reasoningHits = ["because", "therefore", "if", "then", "since", "implies", "hence"].filter(x => clean.includes(x)).length
  const flexibilityHits = ["however", "alternative", "assumption", "counter", "depends", "unless", "could"].filter(x => clean.includes(x)).length
  const conceptHits = concepts.filter(x => clean.includes(x.toLowerCase())).length
  const reasoning = Math.min(25, 7 + reasoningHits * 4 + (words > 75 ? 4 : 0))
  const subject = Math.min(25, 6 + Math.round((conceptHits / Math.max(1, concepts.length)) * 19))
  const flexibility = Math.min(25, 6 + flexibilityHits * 4 + (/example|case|limit/i.test(clean) ? 3 : 0))
  const clarity = Math.min(25, words >= 60 && words <= 360 ? 22 : words >= 32 ? 17 : words >= 15 ? 11 : 5)
  const total = reasoning + subject + flexibility + clarity
  const strengths: string[] = [], next: string[] = []
  if (reasoning >= 18) strengths.push("You exposed the reasoning chain instead of only giving conclusions."); else next.push("Make each inference explicit before moving to the next claim.")
  if (subject >= 17) strengths.push("You used course-relevant ideas purposefully."); else next.push(`Connect more directly to ${concepts.slice(0, 3).join(", ")}.`)
  if (flexibility >= 17) strengths.push("You adapted when the panel changed perspective or challenged an assumption."); else next.push("Use the second interviewer as a cue to test an alternative or revise an assumption.")
  if (clarity >= 18) strengths.push("Your explanations stayed structured across multiple interviewers."); else next.push("Signpost when you are answering Interviewer A versus responding to Interviewer B's challenge.")
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
  const [seed, setSeed] = useState(2)
  const [turns, setTurns] = useState<PanelTurn[]>([])
  const [question, setQuestion] = useState("")
  const [activeSpeaker, setActiveSpeaker] = useState<"A" | "B">("A")
  const [answer, setAnswer] = useState("")
  const [thinking, setThinking] = useState(false)
  const [provider, setProvider] = useState<"openai" | "local" | null>(null)
  const [notice, setNotice] = useState("")
  const [result, setResult] = useState<Result | null>(null)
  const [listening, setListening] = useState(false)
  const recognitionRef = useRef<{ stop: () => void } | null>(null)

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(profileKey) || "{}") as { track?: TrackId; course?: string }
      if (saved.track) setTrack(saved.track)
      if (saved.course) setCourse(saved.course)
    } catch { /* defaults */ }
  }, [])

  const original = useMemo(() => interviewQuestions.filter(q => q.track === track), [track])
  const profile = interviewProfileFor(course, track)
  const skill = pathwayDetails[track].skills[seed % pathwayDetails[track].skills.length]
  const generated = generatedInterviewQuestion(track, difficulty, skill, seed)
  const base = original[seed % Math.max(1, original.length)]
  const concepts = base?.concepts ?? pathwayDetails[track].topics
  const opening = base?.prompt ?? generated.prompt
  const courses = tracks.find(t => t.id === track)?.courses ?? [course]
  const interviewerA = interviewerPersonas[personaA]
  const interviewerB = interviewerPersonas[personaB]
  const candidateTurns = turns.filter(t => t.role === "candidate").length

  const speak = (text: string) => {
    if (!("speechSynthesis" in window)) return
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.lang = "en-GB"
    u.rate = .96
    u.pitch = activeSpeaker === "A" ? 1 : .92
    window.speechSynthesis.speak(u)
  }

  const startVoice = () => {
    type Rec = { continuous: boolean; interimResults: boolean; onresult: (e: { results: ArrayLike<{ 0: { transcript: string } }> }) => void; onend: () => void; start: () => void; stop: () => void }
    const w = window as unknown as { SpeechRecognition?: new () => Rec; webkitSpeechRecognition?: new () => Rec }
    const SR = w.SpeechRecognition ?? w.webkitSpeechRecognition
    if (!SR) { setNotice("Voice transcription is not supported in this browser. Typed answers remain available."); return }
    const rec = new SR(); rec.continuous = true; rec.interimResults = false
    rec.onresult = e => setAnswer(a => `${a} ${Array.from(e.results).map(r => r[0].transcript).join(" ")}`.trim())
    rec.onend = () => setListening(false)
    recognitionRef.current = rec; rec.start(); setListening(true)
  }

  const stopVoice = () => { recognitionRef.current?.stop(); setListening(false) }

  const startPanel = () => {
    const openingTurns: PanelTurn[] = [
      { role: "interviewer", speaker: "Interviewer A", text: interviewerA.opening },
      { role: "interviewer", speaker: "Interviewer A", text: opening },
    ]
    setTurns(openingTurns); setQuestion(opening); setActiveSpeaker("A"); setAnswer(""); setResult(null); setNotice(""); setPhase("live")
    speak(interviewerA.opening)
  }

  const submitTurn = async () => {
    const candidate = answer.trim()
    if (!candidate || thinking) return
    const nextSpeaker: "A" | "B" = activeSpeaker === "A" ? "B" : "A"
    const nextPersona = nextSpeaker === "A" ? personaA : personaB
    const nextRole = nextSpeaker === "A" ? "Lead interviewer" : "Second interviewer / challenger"
    const other = nextSpeaker === "A" ? `Interviewer B (${interviewerB.label})` : `Interviewer A (${interviewerA.label})`
    const candidateTurn: PanelTurn = { role: "candidate", speaker: "Candidate", text: candidate }
    const history = [...turns, candidateTurn]
    setTurns(history); setAnswer(""); setThinking(true); setNotice("")
    try {
      const response = await fetch("/api/interview-turn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          course, track, difficulty, mode, persona: nextPersona, question, answer: candidate, concepts,
          turns: history,
          panelMode: true,
          interviewerRole: `${nextRole} (${nextSpeaker})`,
          otherInterviewer: other,
        }),
      })
      if (!response.ok) throw new Error("Panel interviewer unavailable")
      const data = await response.json() as AiReply
      const nextQuestion = data.reply.replace(/^([^:]{1,40}:\s*)/, "").trim()
      const label = nextSpeaker === "A" ? "Interviewer A" : "Interviewer B"
      setTurns(t => [...t, { role: "interviewer", speaker: label, text: nextQuestion }])
      setQuestion(nextQuestion); setActiveSpeaker(nextSpeaker); setProvider(data.provider)
      if (data.degraded) setNotice("The cloud interviewer was temporarily unavailable, so this panel turn used the built-in challenge engine.")
      speak(nextQuestion)
    } catch {
      const fallback = nextSpeaker === "B" ? "I want to test that from a different angle. Which assumption would you challenge first, and why?" : "Return to your original claim. Does it still survive the challenge you have just been given?"
      const label = nextSpeaker === "A" ? "Interviewer A" : "Interviewer B"
      setTurns(t => [...t, { role: "interviewer", speaker: label, text: fallback }]); setQuestion(fallback); setActiveSpeaker(nextSpeaker); setProvider("local"); setNotice("The cloud panel could not be reached, so the built-in panel logic continued the interview.")
      speak(fallback)
    } finally { setThinking(false) }
  }

  const finish = () => {
    const finalTurns = answer.trim() ? [...turns, { role: "candidate" as const, speaker: "Candidate", text: answer.trim() }] : turns
    const combined = finalTurns.filter(t => t.role === "candidate").map(t => t.text).join(" ")
    if (!combined) return
    const scored = scoreResponse(combined, concepts)
    setTurns([...finalTurns, { role: "interviewer", speaker: "Panel", text: "Thank you. We will finish the interview there." }]); setResult(scored); setPhase("review")
    try {
      const saved = JSON.parse(localStorage.getItem(progressKey) || "{}") as Record<string, unknown>
      const logs = Array.isArray(saved.logs) ? saved.logs as Array<Record<string, unknown>> : []
      const scores = Array.isArray(saved.interviewScores) ? saved.interviewScores as number[] : []
      const misconceptions = saved.misconceptions && typeof saved.misconceptions === "object" ? saved.misconceptions as Record<string, number> : {}
      localStorage.setItem(progressKey, JSON.stringify({ ...saved, sessions: Number(saved.sessions ?? 0)+1, interviewScores:[...scores,scored.total], misconceptions: scored.error === "No dominant error" ? misconceptions : { ...misconceptions, [scored.error]:(misconceptions[scored.error]??0)+1 }, logs:[{id:`panel-${Date.now()}`,title:`Two-Interviewer Panel · ${course}`,score:scored.total,date:new Date().toLocaleDateString("en-GB"),events:finalTurns.map(t=>`${t.speaker}: ${t.text}`),dimensions:{reasoning:scored.reasoning,subject:scored.subject,flexibility:scored.flexibility,clarity:scored.clarity}},...logs].slice(0,40) }))
    } catch { /* complete without persistence */ }
  }

  const reset = () => { setSeed(s=>s+1); setPhase("lobby"); setTurns([]); setQuestion(""); setAnswer(""); setResult(null); setProvider(null); setNotice(""); setActiveSpeaker("A") }

  if (phase === "lobby") return <main className="min-h-screen bg-[#f3f6f6] text-[#172b3a]"><div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 lg:py-11"><div className="mb-7 flex items-center justify-between"><Link href="/interviews" className="inline-flex items-center gap-2 text-sm font-semibold text-[#526a75]"><ArrowLeft className="size-4" />Interview Hub</Link><Badge className="border-0 bg-[#102a43] text-white"><Users className="mr-1 size-3" />Two-interviewer panel</Badge></div><section className="grid overflow-hidden rounded-[2rem] border bg-white shadow-[0_30px_90px_rgba(16,42,67,.09)] lg:grid-cols-[1.1fr_.9fr]"><div className="p-6 sm:p-9 lg:p-12"><div className="mb-7 flex items-center gap-3"><span className="grid size-12 place-items-center rounded-2xl bg-[#102a43] text-[#8dd7de]"><Users className="size-5" /></span><div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#147d91]">Academic panel</p><h1 className="font-serif text-3xl font-bold sm:text-4xl">Two different interviewers. One shared argument.</h1></div></div><p className="max-w-2xl leading-7 text-[#667984]">Interviewer A leads the problem. Interviewer B deliberately approaches your reasoning from a different angle. Both share the transcript, so you may be asked to reconcile what you said to one academic with a later challenge from the other.</p><div className="mt-8 grid gap-4 sm:grid-cols-2"><label className="space-y-1.5"><span className="text-xs font-bold uppercase tracking-wider text-[#667984]">Subject family</span><NativeSelect value={track} onChange={e=>{const next=e.target.value as TrackId;setTrack(next);const found=tracks.find(t=>t.id===next);if(found)setCourse(found.courses[0])}}>{tracks.map(t=><NativeSelectOption key={t.id} value={t.id}>{t.short}</NativeSelectOption>)}</NativeSelect></label><label className="space-y-1.5"><span className="text-xs font-bold uppercase tracking-wider text-[#667984]">Course</span><NativeSelect value={course} onChange={e=>setCourse(e.target.value)}>{courses.map(c=><NativeSelectOption key={c}>{c}</NativeSelectOption>)}</NativeSelect></label><label className="space-y-1.5"><span className="text-xs font-bold uppercase tracking-wider text-[#667984]">Interviewer A</span><NativeSelect value={personaA} onChange={e=>setPersonaA(e.target.value as InterviewPersonaKey)}>{Object.keys(interviewerPersonas).map(p=><NativeSelectOption key={p}>{p}</NativeSelectOption>)}</NativeSelect></label><label className="space-y-1.5"><span className="text-xs font-bold uppercase tracking-wider text-[#667984]">Interviewer B</span><NativeSelect value={personaB} onChange={e=>setPersonaB(e.target.value as InterviewPersonaKey)}>{Object.keys(interviewerPersonas).map(p=><NativeSelectOption key={p}>{p}</NativeSelectOption>)}</NativeSelect></label><label className="space-y-1.5"><span className="text-xs font-bold uppercase tracking-wider text-[#667984]">Difficulty</span><NativeSelect value={difficulty} onChange={e=>setDifficulty(e.target.value)}>{["Foundation","Stretch","Challenge"].map(d=><NativeSelectOption key={d}>{d}</NativeSelectOption>)}</NativeSelect></label><label className="space-y-1.5"><span className="text-xs font-bold uppercase tracking-wider text-[#667984]">Session</span><NativeSelect value={mode} onChange={e=>setMode(e.target.value as InterviewMode)}>{["Tutor","Realistic","No-hint","Stress"].map(m=><NativeSelectOption key={m}>{m}</NativeSelectOption>)}</NativeSelect></label></div><Button className="mt-7 h-12 rounded-xl px-6" onClick={startPanel}>Enter panel interview <ArrowRight /></Button></div><aside className="border-t bg-[#102a43] p-6 text-white sm:p-9 lg:border-l lg:border-t-0 lg:p-10"><h2 className="font-serif text-2xl font-bold">Panel roles</h2><div className="mt-5 space-y-4"><div className="rounded-2xl bg-white/8 p-4"><p className="text-xs font-bold uppercase tracking-wider text-[#8dd7de]">Interviewer A</p><p className="mt-1 font-semibold">{interviewerA.label}</p><p className="mt-2 text-sm leading-6 text-white/65">Leads the academic thread and returns to the central problem after detours.</p></div><div className="rounded-2xl bg-white/8 p-4"><p className="text-xs font-bold uppercase tracking-wider text-[#8dd7de]">Interviewer B</p><p className="mt-1 font-semibold">{interviewerB.label}</p><p className="mt-2 text-sm leading-6 text-white/65">Challenges a different assumption, piece of evidence or interpretation.</p></div></div><div className="mt-6 flex flex-wrap gap-2">{profile.emphasis.slice(0,6).map(x=><Badge key={x} className="border-white/15 bg-white/10 text-white">{x}</Badge>)}</div></aside></section></div></main>

  if (phase === "review" && result) return <main className="min-h-screen bg-[#f3f6f6] text-[#172b3a]"><div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8"><div className="mb-6 flex justify-between gap-3"><Link href="/interviews" className="inline-flex items-center gap-2 text-sm font-semibold text-[#526a75]"><ArrowLeft className="size-4" />Interview Hub</Link><Button variant="outline" onClick={reset}><RefreshCw />New panel</Button></div><section className="grid gap-5 lg:grid-cols-[.8fr_1.2fr]"><Card className="border-0 bg-[#102a43] text-white"><CardHeader><p className="text-xs font-bold uppercase tracking-[.16em] text-blue-200/70">Panel skills profile</p><CardTitle className="font-serif text-6xl">{result.total}<span className="text-xl text-white/45">/100</span></CardTitle><CardDescription className="text-white/60">Practice signal only; not an admissions prediction.</CardDescription></CardHeader><CardContent className="space-y-4">{[["Reasoning",result.reasoning],["Subject use",result.subject],["Panel flexibility",result.flexibility],["Communication",result.clarity]].map(([label,value])=><div key={String(label)}><div className="mb-1 flex justify-between text-xs"><span>{label}</span><span>{value}/25</span></div><Progress value={Number(value)*4} className="bg-white/15" /></div>)}<div className="rounded-xl bg-white/8 p-3"><p className="font-semibold">Next target · {result.error}</p>{result.next.slice(0,2).map(x=><p key={x} className="mt-2 text-sm text-white/70">→ {x}</p>)}</div></CardContent></Card><Card><CardHeader><CardTitle className="font-serif text-2xl">Shared panel transcript</CardTitle><CardDescription>Notice whether the second perspective changed, refined or strengthened the original reasoning.</CardDescription></CardHeader><CardContent className="max-h-[650px] space-y-3 overflow-y-auto">{turns.map((turn,i)=><div key={i} className={`rounded-2xl p-4 ${turn.role==="candidate"?"ml-8 border bg-white":turn.speaker==="Interviewer A"?"mr-8 bg-[#edf7f8]":"mr-8 bg-[#f5f1ea]"}`}><p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-[#147d91]">{turn.speaker}</p><p className="text-sm leading-6">{turn.text}</p></div>)}</CardContent></Card></section><div className="mt-5 grid gap-3 sm:grid-cols-2">{result.strengths.map(x=><div key={x} className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6"><CheckCircle2 className="mb-2 size-5 text-emerald-700" />{x}</div>)}</div></div></main>

  const activeLabel = activeSpeaker === "A" ? "Interviewer A" : "Interviewer B"
  const activePersona = activeSpeaker === "A" ? interviewerA : interviewerB
  return <main className="min-h-screen bg-[#eef3f3] text-[#172b3a]"><div className="sticky top-0 z-30 border-b bg-white/95 backdrop-blur"><div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8"><div className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-xl bg-[#102a43] text-[#8dd7de]"><GraduationCap className="size-4" /></span><div><p className="text-sm font-bold">Panel Interview · {course}</p><p className="text-xs text-[#71828a]">{activeLabel} · {activePersona.label}</p></div></div><div className="flex gap-2"><Badge variant={activeSpeaker==="A"?"default":"outline"}>A</Badge><Badge variant={activeSpeaker==="B"?"default":"outline"}>B</Badge></div></div><Progress value={Math.min(100,candidateTurns*20)} className="h-1 rounded-none" /></div><div className="mx-auto grid max-w-7xl gap-5 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:px-8"><Card className="overflow-hidden"><CardHeader className={`border-b p-5 sm:p-7 ${activeSpeaker==="A"?"bg-white":"bg-[#fbf8f3]"}`}><div className="flex flex-wrap gap-2"><Badge>{activeLabel}</Badge><Badge variant="outline">{activePersona.label}</Badge>{provider&&<Badge variant="outline">{provider==="openai"?"AI":"Local fallback"}</Badge>}</div><CardTitle className="mt-4 font-serif text-2xl leading-snug sm:text-3xl">{question}</CardTitle></CardHeader><CardContent className="space-y-5 p-5 sm:p-7">{notice&&<div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{notice}</div>}<details className="rounded-xl border bg-[#f8fafb] p-4" open={candidateTurns<2}><summary className="cursor-pointer text-sm font-semibold">Panel conversation</summary><div className="mt-3 max-h-48 space-y-2 overflow-y-auto">{turns.slice(-8).map((t,i)=><p key={i} className="text-sm leading-6 text-[#60737d]"><strong>{t.speaker}:</strong> {t.text}</p>)}</div></details><Textarea value={answer} onChange={e=>setAnswer(e.target.value)} rows={12} className="min-h-64 text-base leading-7" placeholder={`Answer ${activeLabel}, but remember the other interviewer can return to anything you say…`} /><div className="flex flex-wrap items-center justify-between gap-3"><Button variant={listening?"default":"outline"} onClick={listening?stopVoice:startVoice}>{listening?<MicOff/>:<Mic/>}{listening?"Stop voice":"Answer by voice"}</Button><div className="flex gap-2"><Button variant="outline" onClick={submitTurn} disabled={!answer.trim()||thinking}>{thinking?<Loader2 className="animate-spin"/>:<Sparkles/>}{thinking?"Other interviewer thinking…":"Submit to panel"}</Button><Button onClick={finish} disabled={(!answer.trim()&&candidateTurns===0)||thinking}>Finish panel</Button></div></div></CardContent></Card><aside className="space-y-4"><Card className={activeSpeaker==="A"?"border-[#68c6d0]":""}><CardHeader><CardTitle className="font-serif text-lg">Interviewer A</CardTitle><CardDescription>{interviewerA.label}</CardDescription></CardHeader><CardContent className="text-sm leading-6 text-[#657582]">Lead thread: definitions, structure and the central problem.</CardContent></Card><Card className={activeSpeaker==="B"?"border-[#d4ad72]":""}><CardHeader><CardTitle className="font-serif text-lg">Interviewer B</CardTitle><CardDescription>{interviewerB.label}</CardDescription></CardHeader><CardContent className="text-sm leading-6 text-[#657582]">Second perspective: evidence, exceptions, transfer or challenge.</CardContent></Card><Card className="bg-[#edf7f8]"><CardContent className="p-4 text-sm leading-6 text-[#526a75]"><Brain className="mb-2 size-5 text-[#147d91]" />A strong panel response does not try to please both interviewers. Keep one coherent argument and revise it only when a challenge genuinely changes the reasoning.</CardContent></Card></aside></div></main>
}

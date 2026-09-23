"use client"

import Link from "next/link"
import { useEffect, useMemo, useRef, useState } from "react"
import { ArrowLeft, AudioLines, Headphones, Loader2, Mic, MicOff, Sparkles, Volume2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { Textarea } from "@/components/ui/textarea"
import { interviewQuestions, tracks, type TrackId } from "@/lib/oxbridge-data"

type Turn = { role: "interviewer" | "candidate"; text: string }
type GeminiVoice = "Gacrux" | "Sulafat" | "Sadaltager" | "Kore"
type Capabilities = { gemini?: boolean; voices?: GeminiVoice[]; defaultVoice?: GeminiVoice }
type AiReply = { reply?: string; provider?: string; configured?: boolean; degraded?: boolean }

const voiceLabels: Record<GeminiVoice, string> = {
  Gacrux: "Gacrux · mature and academic",
  Sulafat: "Sulafat · warm and conversational",
  Sadaltager: "Sadaltager · knowledgeable and measured",
  Kore: "Kore · firm and probing",
}

export default function NaturalAiInterviewPage() {
  const [track, setTrack] = useState<TrackId>("physical")
  const [course, setCourse] = useState("Physics")
  const [voice, setVoice] = useState<GeminiVoice>("Gacrux")
  const [started, setStarted] = useState(false)
  const [question, setQuestion] = useState("")
  const [answer, setAnswer] = useState("")
  const [turns, setTurns] = useState<Turn[]>([])
  const [thinking, setThinking] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const [listening, setListening] = useState(false)
  const [notice, setNotice] = useState("")
  const [caps, setCaps] = useState<Capabilities>({})
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const recognitionRef = useRef<{ stop: () => void } | null>(null)

  const subjectCourses = tracks.find(t => t.id === track)?.courses ?? [course]
  const subjectQuestions = useMemo(() => interviewQuestions.filter(q => q.track === track), [track])
  const opening = subjectQuestions[0]?.prompt ?? `What is one difficult question in ${course} that you think is worth investigating, and how would you begin?`
  const concepts = subjectQuestions[0]?.concepts ?? []

  useEffect(() => {
    fetch("/api/natural-speech")
      .then(r => r.ok ? r.json() : {})
      .then(data => {
        const next = data as Capabilities
        setCaps(next)
        if (next.defaultVoice) setVoice(next.defaultVoice)
      })
      .catch(() => setCaps({}))
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.src = ""
      }
    }
  }, [])

  const speak = async (text: string) => {
    if (!text.trim()) return
    setSpeaking(true)
    setNotice("")
    try {
      const response = await fetch("/api/natural-speech", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, voice }),
      })
      if (!response.ok) throw new Error((await response.json().catch(() => ({})) as { error?: string }).error || "Gemini natural voice unavailable")
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const audio = new Audio(url)
      audioRef.current = audio
      audio.onended = () => { URL.revokeObjectURL(url); setSpeaking(false) }
      audio.onerror = () => { URL.revokeObjectURL(url); setSpeaking(false); setNotice("Gemini voice audio could not play, so the interview can continue in text.") }
      await audio.play()
    } catch (error) {
      setSpeaking(false)
      const message = error instanceof Error ? error.message : "Gemini natural voice unavailable"
      setNotice(message)
      if ("speechSynthesis" in window) {
        const utterance = new SpeechSynthesisUtterance(text)
        utterance.lang = "en-GB"
        utterance.rate = 0.94
        window.speechSynthesis.speak(utterance)
      }
    }
  }

  const startInterview = () => {
    const first = opening
    setQuestion(first)
    setTurns([{ role: "interviewer", text: first }])
    setStarted(true)
    void speak(first)
  }

  const submit = async () => {
    const candidate = answer.trim()
    if (!candidate || thinking) return
    setThinking(true)
    setNotice("")
    const history = [...turns, { role: "candidate" as const, text: candidate }]
    setTurns(history)
    setAnswer("")
    try {
      const response = await fetch("/api/interview-turn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          course,
          track,
          difficulty: "Stretch",
          persona: "Socratic",
          mode: "Realistic",
          question,
          answer: candidate,
          concepts,
          turns: history,
        }),
      })
      if (!response.ok) throw new Error("Gemini interview reasoning service unavailable")
      const data = await response.json() as AiReply
      const next = data.reply?.trim() || "Which assumption in that answer is least secure, and how could you test it?"
      setQuestion(next)
      setTurns(t => [...t, { role: "interviewer", text: next }])
      if (data.degraded) setNotice("Gemini temporarily fell back to the built-in interviewer for this turn.")
      await speak(next)
    } catch {
      const next = "Which assumption in that answer is least secure, and how could you test it?"
      setQuestion(next)
      setTurns(t => [...t, { role: "interviewer", text: next }])
      setNotice("Gemini could not be reached, so the built-in interviewer continued the discussion.")
      await speak(next)
    } finally {
      setThinking(false)
    }
  }

  const startListening = () => {
    type Rec = { continuous: boolean; interimResults: boolean; lang: string; onresult: (e: { results: ArrayLike<{ 0: { transcript: string } }> }) => void; onend: () => void; start: () => void; stop: () => void }
    const w = window as unknown as { SpeechRecognition?: new () => Rec; webkitSpeechRecognition?: new () => Rec }
    const SR = w.SpeechRecognition ?? w.webkitSpeechRecognition
    if (!SR) { setNotice("Browser speech recognition is not available here. You can still type your answer."); return }
    const rec = new SR()
    rec.continuous = true
    rec.interimResults = false
    rec.lang = "en-GB"
    rec.onresult = e => setAnswer(a => `${a} ${Array.from(e.results).map(r => r[0].transcript).join(" ")}`.trim())
    rec.onend = () => setListening(false)
    recognitionRef.current = rec
    rec.start()
    setListening(true)
  }

  const stopListening = () => {
    recognitionRef.current?.stop()
    setListening(false)
  }

  return <main className="min-h-screen bg-[#f2f5f5] text-[#172b3a]">
    <div className="mx-auto max-w-6xl px-4 py-7 sm:px-6 lg:px-8 lg:py-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Button asChild variant="ghost"><Link href="/interviews"><ArrowLeft />Interview Hub</Link></Button>
        <Badge className="border-0 bg-[#102a43] text-white"><AudioLines className="mr-1 size-3" />Gemini natural voice</Badge>
      </div>

      <section className="grid gap-5 lg:grid-cols-[.9fr_1.1fr]">
        <Card className="border-[#dbe5e7] shadow-sm">
          <CardHeader>
            <CardTitle className="font-serif text-2xl">Gemini voice setup</CardTitle>
            <CardDescription>Uses Gemini for the adaptive academic follow-up and Gemini TTS for a natural spoken interviewer.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <label className="space-y-1.5"><span className="text-xs font-bold uppercase tracking-wider text-[#667984]">Subject family</span><NativeSelect value={track} onChange={e => { const next=e.target.value as TrackId; setTrack(next); const t=tracks.find(x=>x.id===next); if(t) setCourse(t.courses[0]) }}>{tracks.map(t => <NativeSelectOption key={t.id} value={t.id}>{t.short}</NativeSelectOption>)}</NativeSelect></label>
            <label className="space-y-1.5"><span className="text-xs font-bold uppercase tracking-wider text-[#667984]">Course</span><NativeSelect value={course} onChange={e => setCourse(e.target.value)}>{subjectCourses.map(c => <NativeSelectOption key={c}>{c}</NativeSelectOption>)}</NativeSelect></label>
            <label className="space-y-1.5"><span className="text-xs font-bold uppercase tracking-wider text-[#667984]">Gemini interviewer voice</span><NativeSelect value={voice} onChange={e => setVoice(e.target.value as GeminiVoice)}>{(caps.voices ?? ["Gacrux", "Sulafat", "Sadaltager", "Kore"]).map(v => <NativeSelectOption key={v} value={v}>{voiceLabels[v]}</NativeSelectOption>)}</NativeSelect></label>
            <div className="rounded-2xl bg-[#edf7f8] p-4 text-sm leading-6 text-[#526a75]"><Headphones className="mb-2 size-5 text-[#147d91]" /><strong>Natural delivery:</strong> Gemini is directed to sound like a British university academic rather than an assistant or announcer, with restrained intonation and realistic pauses.</div>
            {!caps.gemini && <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Gemini is not configured on this deployment yet. Add <code>GEMINI_API_KEY</code> on the server and redeploy.</div>}
            {!started && <Button className="w-full" onClick={startInterview}><Volume2 />Start Gemini interview</Button>}
          </CardContent>
        </Card>

        <Card className="min-h-[620px] border-[#dbe5e7] shadow-sm">
          <CardHeader><CardTitle className="font-serif text-2xl">Conversation</CardTitle><CardDescription>Think aloud. The interviewer should challenge reasoning rather than reward polished answers.</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            {notice && <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{notice}</div>}
            <div className="max-h-[360px] space-y-3 overflow-y-auto rounded-2xl bg-[#f8fafb] p-4">
              {!started && <div className="grid min-h-64 place-items-center text-center text-sm text-[#71828a]">Choose your course and Gemini voice, then start the interview.</div>}
              {turns.map((turn, i) => <div key={`${turn.role}-${i}`} className={`rounded-2xl p-4 ${turn.role === "interviewer" ? "bg-white shadow-sm" : "ml-auto max-w-[90%] bg-[#102a43] text-white"}`}><p className={`mb-1 text-[11px] font-bold uppercase tracking-wider ${turn.role === "interviewer" ? "text-[#147d91]" : "text-[#8dd7de]"}`}>{turn.role}</p><p className="text-sm leading-6">{turn.text}</p></div>)}
            </div>

            {started && <>
              <Textarea value={answer} onChange={e => setAnswer(e.target.value)} rows={5} placeholder="Type your reasoning, or use the microphone button if your browser supports speech recognition…" />
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex gap-2"><Button variant="outline" onClick={listening ? stopListening : startListening}>{listening ? <MicOff /> : <Mic />}{listening ? "Stop listening" : "Speak answer"}</Button><Button variant="outline" onClick={() => void speak(question)} disabled={speaking}>{speaking ? <Loader2 className="animate-spin" /> : <Volume2 />}Repeat question</Button></div>
                <Button onClick={submit} disabled={!answer.trim() || thinking}>{thinking ? <><Loader2 className="animate-spin" />Thinking…</> : <><Sparkles />Send answer</>}</Button>
              </div>
            </>}
          </CardContent>
        </Card>
      </section>
    </div>
  </main>
}

"use client"

import Link from "next/link"
import { useEffect, useMemo, useRef, useState } from "react"
import { ArrowLeft, AudioLines, CheckCircle2, Headphones, Mic, ShieldCheck, Sparkles, Volume2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const SCRIPT_ID = "elevenlabs-convai-widget-script"
const SCRIPT_SRC = "https://unpkg.com/@elevenlabs/convai-widget-embed"
const voiceStorageKey = "oxbridge-elevenlabs-voice-v1"

const voices = [
  {
    key: "george",
    name: "George",
    agentId: "agent_5401m378eya4e769k56h0z44wc1d",
    style: "Warm academic",
    description: "Natural British male voice with warmer tutorial-style delivery, patient pauses and a conversational academic presence.",
  },
  {
    key: "alice",
    name: "Alice",
    agentId: "agent_0101m37beg40f3ntny35m3wb4fb0",
    style: "Clear academic",
    description: "Clear British female educator voice with precise diction, calm pacing and a focused tutorial style.",
  },
  {
    key: "daniel",
    name: "Daniel",
    agentId: "agent_3101m37bfhejekrb0m558w5k8fgg",
    style: "Formal academic",
    description: "Steady British male voice with a more formal interview presence for realistic higher-pressure practice.",
  },
] as const

type VoiceKey = typeof voices[number]["key"]

export default function ElevenLabsInterviewPage() {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const [voiceKey, setVoiceKey] = useState<VoiceKey>("george")
  const [ready, setReady] = useState(false)
  const [error, setError] = useState("")

  const selectedVoice = useMemo(() => voices.find(voice => voice.key === voiceKey) ?? voices[0], [voiceKey])

  useEffect(() => {
    try {
      const saved = localStorage.getItem(voiceStorageKey) as VoiceKey | null
      if (saved && voices.some(voice => voice.key === saved)) setVoiceKey(saved)
    } catch { /* keep default */ }
  }, [])

  useEffect(() => {
    try { localStorage.setItem(voiceStorageKey, voiceKey) } catch { /* preference persistence is optional */ }
  }, [voiceKey])

  useEffect(() => {
    let cancelled = false
    let widget: HTMLElement | null = null
    let loadHandler: (() => void) | null = null
    setReady(false)
    setError("")

    const mountWidget = () => {
      if (cancelled || !hostRef.current) return
      try {
        widget = document.createElement("elevenlabs-convai")
        widget.setAttribute("agent-id", selectedVoice.agentId)
        widget.setAttribute("variant", "full")
        hostRef.current.replaceChildren(widget)
        setReady(true)
      } catch {
        setError("Could not initialise the ElevenLabs interview widget in this browser.")
      }
    }

    const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null
    if (existing) {
      if (customElements.get("elevenlabs-convai")) mountWidget()
      else {
        loadHandler = mountWidget
        existing.addEventListener("load", loadHandler, { once: true })
      }
    } else {
      const script = document.createElement("script")
      script.id = SCRIPT_ID
      script.src = SCRIPT_SRC
      script.async = true
      script.type = "text/javascript"
      script.addEventListener("load", mountWidget, { once: true })
      script.addEventListener("error", () => setError("Could not load the ElevenLabs voice interface."), { once: true })
      document.head.appendChild(script)
    }

    const timer = window.setTimeout(() => {
      if (!cancelled && customElements.get("elevenlabs-convai") && !widget) mountWidget()
    }, 1200)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
      if (existing && loadHandler) existing.removeEventListener("load", loadHandler)
      if (widget?.parentNode) widget.parentNode.removeChild(widget)
    }
  }, [selectedVoice.agentId])

  const chooseVoice = (key: VoiceKey) => {
    if (key === voiceKey) return
    setVoiceKey(key)
  }

  return <main className="min-h-screen bg-[#f2f5f5] text-[#172b3a]">
    <header className="border-b border-[#dbe5e7] bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-8">
        <Button asChild variant="ghost"><Link href="/interviews"><ArrowLeft />Interview Hub</Link></Button>
        <Badge className="border-0 bg-[#102a43] text-white"><AudioLines className="mr-1 size-3" />ElevenLabs natural voice</Badge>
      </div>
    </header>

    <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-8 lg:py-10">
      <section className="mb-6 grid gap-5 lg:grid-cols-[1.05fr_.95fr]">
        <div className="rounded-[2rem] border border-[#dbe5e7] bg-white p-6 shadow-[0_30px_90px_rgba(16,42,67,.08)] sm:p-9">
          <div className="flex items-start gap-4">
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[#102a43] text-[#8dd7de]"><Headphones className="size-5" /></span>
            <div>
              <p className="text-xs font-bold uppercase tracking-[.18em] text-[#147d91]">Natural voice interview</p>
              <h1 className="mt-1 font-serif text-3xl font-bold sm:text-4xl">Choose an academic voice, then speak naturally.</h1>
            </div>
          </div>
          <p className="mt-5 max-w-3xl text-base leading-7 text-[#667984]">Each interviewer uses ElevenLabs realtime speech with GPT-5.6 Sol for academic reasoning. They share the same Socratic interview method but have genuinely different British voices and conversational presence.</p>

          <div className="mt-7 grid gap-3 sm:grid-cols-3">
            {voices.map(voice => {
              const active = voice.key === voiceKey
              return <button key={voice.key} type="button" onClick={() => chooseVoice(voice.key)} className={`rounded-2xl border p-4 text-left transition ${active ? "border-[#147d91] bg-[#edf7f8] shadow-sm" : "border-[#dbe5e7] bg-white hover:border-[#9fcbd1] hover:bg-[#f8fbfb]"}`} aria-pressed={active}>
                <div className="flex items-center justify-between gap-2"><strong className="font-serif text-xl">{voice.name}</strong>{active && <Badge className="border-0 bg-[#147d91] text-white">Selected</Badge>}</div>
                <p className="mt-1 text-xs font-bold uppercase tracking-[.12em] text-[#147d91]">{voice.style}</p>
                <p className="mt-2 text-sm leading-6 text-[#667984]">{voice.description}</p>
              </button>
            })}
          </div>

          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            {["Patient turn detection", "Natural contractions and varied cadence", "Sparse conversational acknowledgements", "Adaptive Socratic follow-ups"].map(item => <div key={item} className="flex items-center gap-2 rounded-xl bg-[#edf7f8] p-3 text-sm font-semibold"><CheckCircle2 className="size-4 text-[#147d91]" />{item}</div>)}
          </div>

          <div className="mt-7 rounded-2xl border border-[#cfe1e4] bg-[#f8fbfb] p-4">
            <div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 size-5 text-[#147d91]" /><div><strong className="text-sm">Practice only</strong><p className="mt-1 text-sm leading-6 text-[#667984]">This is an AI practice interviewer and does not represent Oxford or Cambridge. It should not be used to predict admissions decisions. Avoid sharing sensitive personal information.</p></div></div>
          </div>

          <div className="mt-6 flex flex-wrap gap-2"><Button asChild variant="outline"><Link href="/live-interview"><Mic />Use OpenAI realtime voice</Link></Button><Button asChild variant="ghost"><Link href="/ai-interview"><Sparkles />Use transcript-based AI interview</Link></Button></div>
        </div>

        <aside className="rounded-[2rem] bg-[#102a43] p-6 text-white sm:p-8">
          <div className="flex items-center gap-2 text-[#8dd7de]"><Volume2 className="size-5" /><p className="text-xs font-bold uppercase tracking-[.18em]">Current interviewer</p></div>
          <h2 className="mt-3 font-serif text-3xl font-bold">{selectedVoice.name}</h2>
          <p className="mt-1 text-sm font-semibold text-[#8dd7de]">{selectedVoice.style}</p>
          <p className="mt-3 text-sm leading-6 text-white/70">{selectedVoice.description}</p>
          <div className="my-6 h-px bg-white/10" />
          <p className="text-xs font-bold uppercase tracking-[.18em] text-[#8dd7de]">Before you start</p>
          <div className="mt-5 space-y-4 text-sm leading-6 text-white/70">
            <p><strong className="text-white">1.</strong> Allow microphone access when prompted.</p>
            <p><strong className="text-white">2.</strong> Tell the interviewer your subject/course when it asks.</p>
            <p><strong className="text-white">3.</strong> Think aloud. Silence for a few seconds is fine.</p>
            <p><strong className="text-white">4.</strong> If you are stuck, say what you do know rather than immediately asking for the answer.</p>
            <p><strong className="text-white">5.</strong> Finish the current call before changing voice.</p>
          </div>
        </aside>
      </section>

      <Card className="overflow-hidden border-[#dbe5e7] shadow-[0_24px_70px_rgba(16,42,67,.07)]">
        <CardHeader className="border-b bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3"><div><CardTitle className="font-serif text-2xl">{selectedVoice.name} · ElevenLabs interview room</CardTitle><CardDescription>Use headphones if possible to reduce echo and make turn-taking more natural.</CardDescription></div><div className="flex flex-wrap gap-2"><Badge variant="outline">{selectedVoice.style}</Badge><Badge variant="outline">GPT-5.6 Sol</Badge></div></div>
        </CardHeader>
        <CardContent className="bg-[#f8fafb] p-4 sm:p-6">
          {error ? <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">{error} <Link href="/live-interview" className="font-bold underline">Use the existing live voice interviewer instead.</Link></div> : <div ref={hostRef} className="min-h-[520px] rounded-2xl border border-[#dbe5e7] bg-white p-2">{!ready && <div className="grid min-h-[500px] place-items-center text-sm text-[#667984]">Loading {selectedVoice.name}…</div>}</div>}
        </CardContent>
      </Card>
    </div>
  </main>
}

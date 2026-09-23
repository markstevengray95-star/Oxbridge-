"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { ArrowLeft, AudioLines, CheckCircle2, Headphones, Mic, ShieldCheck, Sparkles } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const AGENT_ID = "agent_5401m378eya4e769k56h0z44wc1d"
const SCRIPT_ID = "elevenlabs-convai-widget-script"
const SCRIPT_SRC = "https://unpkg.com/@elevenlabs/convai-widget-embed"

export default function ElevenLabsInterviewPage() {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    let cancelled = false
    let widget: HTMLElement | null = null

    const mountWidget = () => {
      if (cancelled || !hostRef.current || widget) return
      try {
        widget = document.createElement("elevenlabs-convai")
        widget.setAttribute("agent-id", AGENT_ID)
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
      else existing.addEventListener("load", mountWidget, { once: true })
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
      if (!cancelled && !ready && customElements.get("elevenlabs-convai")) mountWidget()
    }, 1200)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
      if (widget?.parentNode) widget.parentNode.removeChild(widget)
    }
  }, [ready])

  return <main className="min-h-screen bg-[#f2f5f5] text-[#172b3a]">
    <header className="border-b border-[#dbe5e7] bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-8">
        <Button asChild variant="ghost"><Link href="/interviews"><ArrowLeft />Interview Hub</Link></Button>
        <Badge className="border-0 bg-[#102a43] text-white"><AudioLines className="mr-1 size-3" />ElevenLabs live voice</Badge>
      </div>
    </header>

    <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-8 lg:py-10">
      <section className="mb-6 grid gap-5 lg:grid-cols-[1.05fr_.95fr]">
        <div className="rounded-[2rem] border border-[#dbe5e7] bg-white p-6 shadow-[0_30px_90px_rgba(16,42,67,.08)] sm:p-9">
          <div className="flex items-start gap-4">
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[#102a43] text-[#8dd7de]"><Headphones className="size-5" /></span>
            <div>
              <p className="text-xs font-bold uppercase tracking-[.18em] text-[#147d91]">Natural voice interview</p>
              <h1 className="mt-1 font-serif text-3xl font-bold sm:text-4xl">A more realistic spoken academic conversation.</h1>
            </div>
          </div>
          <p className="mt-5 max-w-3xl text-base leading-7 text-[#667984]">This interviewer uses ElevenLabs realtime speech with GPT-5.6 Sol behind the academic reasoning. It is tuned to wait for thinking time, ask one question at a time, challenge assumptions, and avoid giving away full solutions during the interview.</p>

          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            {["Patient turn detection", "One question at a time", "Adaptive Socratic follow-ups", "30-minute interview sessions"].map(item => <div key={item} className="flex items-center gap-2 rounded-xl bg-[#edf7f8] p-3 text-sm font-semibold"><CheckCircle2 className="size-4 text-[#147d91]" />{item}</div>)}
          </div>

          <div className="mt-7 rounded-2xl border border-[#cfe1e4] bg-[#f8fbfb] p-4">
            <div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 size-5 text-[#147d91]" /><div><strong className="text-sm">Practice only</strong><p className="mt-1 text-sm leading-6 text-[#667984]">This is an AI practice interviewer and does not represent Oxford or Cambridge. It should not be used to predict admissions decisions. Avoid sharing sensitive personal information.</p></div></div>
          </div>

          <div className="mt-6 flex flex-wrap gap-2"><Button asChild variant="outline"><Link href="/live-interview"><Mic />Use OpenAI realtime voice</Link></Button><Button asChild variant="ghost"><Link href="/ai-interview"><Sparkles />Use transcript-based AI interview</Link></Button></div>
        </div>

        <aside className="rounded-[2rem] bg-[#102a43] p-6 text-white sm:p-8">
          <p className="text-xs font-bold uppercase tracking-[.18em] text-[#8dd7de]">Before you start</p>
          <h2 className="mt-2 font-serif text-2xl font-bold">Treat it like the real thing.</h2>
          <div className="mt-5 space-y-4 text-sm leading-6 text-white/70">
            <p><strong className="text-white">1.</strong> Allow microphone access when prompted.</p>
            <p><strong className="text-white">2.</strong> Tell the interviewer your subject/course when it asks.</p>
            <p><strong className="text-white">3.</strong> Think aloud. Silence for a few seconds is fine.</p>
            <p><strong className="text-white">4.</strong> If you are stuck, say what you do know rather than asking immediately for the answer.</p>
            <p><strong className="text-white">5.</strong> Say you want to finish when you are ready for the short debrief.</p>
          </div>
        </aside>
      </section>

      <Card className="overflow-hidden border-[#dbe5e7] shadow-[0_24px_70px_rgba(16,42,67,.07)]">
        <CardHeader className="border-b bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3"><div><CardTitle className="font-serif text-2xl">ElevenLabs interview room</CardTitle><CardDescription>Use headphones if possible to reduce echo and make turn-taking more natural.</CardDescription></div><Badge variant="outline">GPT-5.6 Sol interviewer</Badge></div>
        </CardHeader>
        <CardContent className="bg-[#f8fafb] p-4 sm:p-6">
          {error ? <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">{error} <Link href="/live-interview" className="font-bold underline">Use the existing live voice interviewer instead.</Link></div> : <div ref={hostRef} className="min-h-[520px] rounded-2xl border border-[#dbe5e7] bg-white p-2">{!ready && <div className="grid min-h-[500px] place-items-center text-sm text-[#667984]">Loading ElevenLabs interview room…</div>}</div>}
        </CardContent>
      </Card>
    </div>
  </main>
}

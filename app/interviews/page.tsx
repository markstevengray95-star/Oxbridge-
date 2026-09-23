import Link from "next/link"
import { ArrowRight, AudioLines, Brain, GraduationCap, Headphones, MessageSquareText, Sparkles, Users } from "lucide-react"

const modes = [
  {
    href: "/interview-room",
    icon: MessageSquareText,
    title: "Formal Interview Room",
    eyebrow: "Structured practice",
    description: "Focused academic interview with deterministic adaptive challenges, whiteboard tools and feedback after the session.",
    best: "Reliable offline-capable practice",
  },
  {
    href: "/ai-interview",
    icon: Sparkles,
    title: "Gemini AI Interview",
    eyebrow: "Adaptive reasoning",
    description: "Server-side Gemini interviewer that reads the conversation and generates a new follow-up from what the candidate actually said.",
    best: "Deep transcript-based practice",
  },
  {
    href: "/live-interview",
    icon: AudioLines,
    title: "Gemini Live Voice",
    eyebrow: "Recommended live voice",
    description: "Gemini 3.8 Live audio-to-audio interview with native speech, patient voice detection and adaptive academic follow-up.",
    best: "Natural low-latency spoken interview rehearsal",
  },
  {
    href: "/natural-ai-interview",
    icon: Brain,
    title: "Gemini Natural Voice",
    eyebrow: "Reliable voice fallback",
    description: "Adaptive Gemini reasoning followed by high-quality Gemini TTS, with selectable academic voices and no persistent live socket required.",
    best: "Natural speech when live streaming is unreliable",
  },
  {
    href: "/elevenlabs-interview",
    icon: Headphones,
    title: "ElevenLabs Voice",
    eyebrow: "Alternative provider",
    description: "Realtime ElevenLabs interviewer voices remain available as an alternative natural-voice route.",
    best: "Comparing voice styles and provider behaviour",
  },
  {
    href: "/panel-interview",
    icon: Users,
    title: "Two-Interviewer Panel",
    eyebrow: "Multiple perspectives",
    description: "Two distinct academics share the same discussion and alternate challenges, forcing the candidate to keep one coherent argument across perspectives.",
    best: "Responding flexibly to different academics",
  },
]

export default function InterviewHubPage() {
  return <main className="min-h-screen bg-[#f3f6f6] text-[#172b3a]">
    <section className="border-b bg-[#102a43] text-white"><div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14"><div className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-2xl bg-white/10 text-[#8dd7de]"><GraduationCap className="size-5" /></span><div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#8dd7de]">Interview Hub</p><h1 className="font-serif text-3xl font-bold sm:text-4xl">Choose the kind of academic conversation you need.</h1></div></div><p className="mt-5 max-w-3xl text-base leading-7 text-blue-50/70">Gemini now powers the adaptive reasoning and primary natural-voice routes. ElevenLabs remains available as an alternative voice provider.</p></div></section>
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-[#147d91]">Six interview environments</p><h2 className="mt-1 font-serif text-2xl font-bold">One preparation platform</h2></div><Link href="/" className="text-sm font-semibold text-[#147d91] underline underline-offset-4">Back to Preparation Studio</Link></div>
      <section className="grid gap-5 md:grid-cols-2">{modes.map((mode, i) => { const Icon=mode.icon; return <Link href={mode.href} key={mode.href} className="group rounded-[1.6rem] border border-[#dbe5e7] bg-white p-6 shadow-[0_12px_35px_rgba(16,42,67,.05)] transition hover:-translate-y-0.5 hover:border-[#9fcbd1] hover:shadow-[0_20px_45px_rgba(16,42,67,.08)] sm:p-7"><div className="flex items-start justify-between gap-4"><span className={`grid size-12 place-items-center rounded-2xl ${i===2?"bg-[#147d91] text-white":"bg-[#edf7f8] text-[#147d91]"}`}><Icon className="size-5" /></span><ArrowRight className="size-5 text-[#8da0a8] transition group-hover:translate-x-1 group-hover:text-[#147d91]" /></div><p className="mt-6 text-xs font-bold uppercase tracking-[.16em] text-[#147d91]">{mode.eyebrow}</p><h3 className="mt-2 font-serif text-2xl font-bold">{mode.title}</h3><p className="mt-3 text-sm leading-6 text-[#667984]">{mode.description}</p><div className="mt-5 rounded-xl bg-[#f6f9f9] p-3 text-sm"><strong>Best for:</strong> <span className="text-[#667984]">{mode.best}</span></div></Link> })}</section>
      <section className="mt-7 grid gap-4 lg:grid-cols-[1.1fr_.9fr]"><div className="rounded-[1.5rem] border bg-white p-6"><div className="flex items-center gap-2"><Brain className="size-5 text-[#147d91]" /><h3 className="font-serif text-xl font-bold">Suggested progression</h3></div><div className="mt-4 grid gap-3 sm:grid-cols-5">{["Formal","Gemini AI","Gemini Live","Natural Voice","Panel"].map((step,i)=><div key={step} className="rounded-xl bg-[#edf7f8] p-3"><span className="text-xs font-bold text-[#147d91]">{i+1}</span><p className="mt-1 text-sm font-semibold">{step}</p></div>)}</div><p className="mt-4 text-sm leading-6 text-[#667984]">Start with visible structure, then reduce scaffolding. Use Gemini Live for the closest continuous conversation, Natural Voice when you want a more reliable turn-by-turn speech path, then move to panel practice.</p></div><div className="rounded-[1.5rem] bg-[#102a43] p-6 text-white"><AudioLines className="size-5 text-[#8dd7de]" /><h3 className="mt-3 font-serif text-xl font-bold">Recommended: Gemini Live</h3><p className="mt-2 text-sm leading-6 text-white/65">Gemini 3.8 Live produces native audio directly, uses patient voice activity detection and adapts the academic follow-up to the spoken discussion.</p><Link href="/live-interview" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-bold text-[#102a43]">Open Gemini Live <ArrowRight className="size-4" /></Link></div></section>
    </div>
  </main>
}

import Link from "next/link"
import { ArrowLeft, ArrowRight, AudioLines, Brain, Clock3, GraduationCap, MessageSquareText, ShieldCheck } from "lucide-react"
import { mockDurations, mockInterviewFormat } from "@/lib/full-mock-interview"

const engines = [
  { label:"Formal academic mock", href:"/interview-room", icon:MessageSquareText, desc:"Typed answers with an adaptive academic interviewer, structured follow-ups and a reasoned review." },
  { label:"Reasoning Studio mock", href:"/reasoning-interview", icon:Brain, desc:"Typed problem solving, branching reasoning, interactive exhibits and evidence-based feedback." },
  { label:"Live voice mock", href:"/gemini-live-next", icon:AudioLines, desc:"Natural voice interview with pauses and interruptions. Longer sessions need a planned secure connection refresh." },
]
export default function FullMockInterviewPage(){
  return <main className="min-h-screen bg-[#f3f6f6] text-[#172b3a]">
    <div className="mx-auto max-w-6xl space-y-7 px-4 py-8 sm:px-6 lg:py-12">
      <Link href="/interviews" className="inline-flex items-center gap-2 text-sm font-semibold text-[#147d91] hover:underline"><ArrowLeft className="size-4"/>Interview Hub</Link>
      <section className="rounded-[2rem] bg-[#102a43] p-7 text-white sm:p-10">
        <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[#8dd7de]"><GraduationCap className="size-4"/>FELLOW mock interviews</span>
        <h1 className="mt-5 max-w-3xl font-serif text-4xl font-bold sm:text-5xl">Full-length academic interview practice</h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-white/70">Choose a session length and a mode. The interviewer follows your reasoning through linked questions, challenges, changing evidence, a second academic problem where appropriate, and a final synthesis. The timer never interrupts you mid-answer.</p>
      </section>
      <section aria-labelledby="format-title">
        <div className="mb-4 flex items-center gap-2"><Clock3 className="size-5 text-[#147d91]"/><h2 id="format-title" className="font-serif text-2xl font-bold">Choose your interview length</h2></div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {mockDurations.map(minutes=>{
            const format=mockInterviewFormat(minutes)!
            return <div key={minutes} className="rounded-2xl border border-[#dbe5e7] bg-white p-5 shadow-sm">
              <span className="text-xs font-bold uppercase tracking-widest text-[#147d91]">{minutes} minutes</span>
              <h3 className="mt-2 font-serif text-xl font-bold">{format.label}</h3>
              <p className="mt-2 min-h-12 text-sm leading-6 text-slate-600">{format.description}</p>
              <p className="mt-3 text-xs text-slate-500">{format.stages.length} planned academic stages · reasoning-led progression</p>
              <div className="mt-4 grid gap-2">{engines.map(engine=><Link key={engine.href} href={engine.href+"?mock="+minutes} className="flex items-center justify-between rounded-xl border border-[#cfe1e4] bg-[#edf7f8] px-3 py-2 text-sm font-semibold text-[#102a43] hover:border-[#147d91]">{engine.label}<ArrowRight className="size-4"/></Link>)}</div>
            </div>
          })}
        </div>
      </section>
      <section className="grid gap-4 rounded-2xl border bg-white p-6 md:grid-cols-[auto_1fr]">
        <ShieldCheck className="size-6 text-[#147d91]"/>
        <div><h2 className="font-serif text-xl font-bold">What to expect</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">All formats are FELLOW-designed practice simulations, not official Oxford or Cambridge interviews or admissions predictions. A session stopped early is recorded as a partial mock with its actual duration. A 40- or 60-minute voice mock may require a short reconnection because voice tokens have limited lifetimes. Your ongoing voice transcript is retained in the current browser during that reconnection, but it is not yet a cross-device school account record.</p>
          <div className="mt-3 flex flex-wrap gap-2">{engines.map(engine=>{const Icon=engine.icon;return <span key={engine.href} title={engine.desc} className="inline-flex items-center gap-1 rounded-lg bg-slate-50 px-2 py-1 text-xs text-slate-600"><Icon className="size-3"/>{engine.label}</span>})}</div>
        </div>
      </section>
    </div>
  </main>
}

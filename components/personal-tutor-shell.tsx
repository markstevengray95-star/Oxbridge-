import Link from "next/link"
import { BarChart3, BookOpenCheck, Brain, CalendarCheck2, Compass, History, Lightbulb, Mic2, TimerReset, TrendingUp, Wrench } from "lucide-react"
import { PersonalTutorDashboard } from "@/components/personal-tutor-dashboard"
import { TutorCompletedWork } from "@/components/tutor-completed-work"
import { TutorDeepInsightLoader } from "@/components/tutor-deep-insight-loader"
import { TutorExecutionLoopLoader } from "@/components/tutor-execution-loop-loader"
import { TutorEvidenceQuality } from "@/components/tutor-evidence-quality"
import { TutorIntelligenceProvider } from "@/components/tutor-intelligence-context"
import { TutorProgressRecordsHub } from "@/components/tutor-progress-records-hub"
import { TutorStrategicBrief } from "@/components/tutor-strategic-brief"
import { NextgenTutorPanel } from "@/components/nextgen-tutor-panel"

const tutorSections = [
  { href: "#tutor-today", label: "Today", icon: Compass },
  { href: "#tutor-insight", label: "Deep insight", icon: BarChart3 },
  { href: "#tutor-week", label: "Weekly loop", icon: CalendarCheck2 },
  { href: "#tutor-progress-records", label: "Progress & records", icon: History },
  { href: "#tutor-strategy", label: "Strategy", icon: Lightbulb },
  { href: "#tutor-tools", label: "Tools", icon: Wrench },
]

export function PersonalTutorShell() {
  return (
    <TutorIntelligenceProvider>
      <div id="tutor-today" className="scroll-mt-24"><PersonalTutorDashboard /></div>

      <nav className="sticky top-14 z-[70] border-y border-[#dbe5e7] bg-white/95 shadow-sm backdrop-blur" aria-label="Tutor command centre sections">
        <div className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-3 py-2 sm:px-6">
          {tutorSections.map(item => {
            const Icon = item.icon
            return <a key={item.href} href={item.href} className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl px-3 text-xs font-semibold text-slate-600 transition hover:bg-[#edf7f8] hover:text-[#102a43] sm:text-sm"><Icon className="size-4 text-[#147d91]" />{item.label}</a>
          })}
          <Link href="/learning-trajectory" className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl bg-[#edf7f8] px-3 text-xs font-semibold text-[#102a43] transition hover:bg-[#dff1f3] sm:text-sm"><TrendingUp className="size-4 text-[#147d91]"/>Trajectory</Link>
        </div>
      </nav>

      <TutorEvidenceQuality />
      <div id="tutor-insight" className="scroll-mt-28"><TutorDeepInsightLoader /></div>
      <div id="tutor-week" className="scroll-mt-28"><TutorExecutionLoopLoader /></div>
      <TutorProgressRecordsHub />
      <TutorCompletedWork />
      <div id="tutor-strategy" className="scroll-mt-28"><TutorStrategicBrief /></div>
      <div id="tutor-tools" className="scroll-mt-28"><NextgenTutorPanel /></div>

      <nav className="fixed bottom-3 left-1/2 z-[120] flex w-[min(96vw,31rem)] -translate-x-1/2 items-center justify-around rounded-2xl border border-[#dbe5e7] bg-white/95 p-2 shadow-[0_16px_50px_rgba(16,42,67,.18)] backdrop-blur md:hidden" aria-label="Tutor quick actions">
        <Link href="/tutor" className="flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl px-1 py-2 text-[10px] font-semibold text-[#172b3a]"><Brain className="size-4 text-[#147d91]" />Tutor</Link>
        <Link href="/gemini-live-interview" className="flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl px-1 py-2 text-[10px] font-semibold text-[#172b3a]"><Mic2 className="size-4 text-[#147d91]" />Interview</Link>
        <Link href="/test-player" className="flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl px-1 py-2 text-[10px] font-semibold text-[#172b3a]"><TimerReset className="size-4 text-[#147d91]" />Test</Link>
        <Link href="/learning-trajectory" className="flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl px-1 py-2 text-[10px] font-semibold text-[#172b3a]"><TrendingUp className="size-4 text-[#147d91]" />Trajectory</Link>
        <a href="#tutor-progress-records" aria-label="Jump to progress and records" className="flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl px-1 py-2 text-[10px] font-semibold text-[#172b3a]"><History className="size-4 text-[#147d91]" />Records</a>
        <Link href="/reading-room" className="flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl px-1 py-2 text-[10px] font-semibold text-[#172b3a]"><BookOpenCheck className="size-4 text-[#147d91]" />Read</Link>
      </nav>
    </TutorIntelligenceProvider>
  )
}

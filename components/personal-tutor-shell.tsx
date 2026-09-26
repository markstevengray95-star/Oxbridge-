import Link from "next/link"
import { BookOpenCheck, Brain, Mic2, TimerReset } from "lucide-react"
import { PersonalTutorDashboard } from "@/components/personal-tutor-dashboard"
import { TutorDeepInsightLoader } from "@/components/tutor-deep-insight-loader"
import { TutorEvidenceStrip } from "@/components/tutor-evidence-strip"
import { NextgenTutorPanel } from "@/components/nextgen-tutor-panel"

export function PersonalTutorShell() {
  return (
    <>
      <PersonalTutorDashboard />
      <TutorDeepInsightLoader />
      <TutorEvidenceStrip />
      <NextgenTutorPanel />

      <nav className="fixed bottom-3 left-1/2 z-[120] flex w-[min(94vw,28rem)] -translate-x-1/2 items-center justify-around rounded-2xl border border-[#dbe5e7] bg-white/95 p-2 shadow-[0_16px_50px_rgba(16,42,67,.18)] backdrop-blur md:hidden" aria-label="Tutor quick actions">
        <Link href="/tutor" className="flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl px-2 py-2 text-[11px] font-semibold text-[#172b3a]"><Brain className="size-4 text-[#147d91]" />Tutor</Link>
        <Link href="/gemini-live-interview" className="flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl px-2 py-2 text-[11px] font-semibold text-[#172b3a]"><Mic2 className="size-4 text-[#147d91]" />Interview</Link>
        <Link href="/test-player" className="flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl px-2 py-2 text-[11px] font-semibold text-[#172b3a]"><TimerReset className="size-4 text-[#147d91]" />Test</Link>
        <Link href="/reading-room" className="flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl px-2 py-2 text-[11px] font-semibold text-[#172b3a]"><BookOpenCheck className="size-4 text-[#147d91]" />Read</Link>
      </nav>
    </>
  )
}

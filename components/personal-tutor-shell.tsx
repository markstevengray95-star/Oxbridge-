import Link from "next/link"
import {TutorDisclosure} from "@/components/tutor-disclosure"
import { BarChart3, Brain, CalendarCheck2, Compass, History, Lightbulb, TrendingUp, Wrench } from "lucide-react"
import { PersonalTutorDashboard } from "@/components/personal-tutor-dashboard"
import { TutorCompletedWork } from "@/components/tutor-completed-work"
import { TutorDeepInsightLoader } from "@/components/tutor-deep-insight-loader"
import { TutorExecutionLoopLoader } from "@/components/tutor-execution-loop-loader"
import { TutorEvidenceQuality } from "@/components/tutor-evidence-quality"
import { TutorIntelligenceProvider } from "@/components/tutor-intelligence-context"
import { TutorProgressRecordsHub } from "@/components/tutor-progress-records-hub"
import { TutorStrategicBrief } from "@/components/tutor-strategic-brief"
import { AcademicCoach } from "@/components/academic-coach"
import { NextgenTutorPanel } from "@/components/nextgen-tutor-panel"

const tutorSections = [
  { href: "#tutor-today", label: "Today", icon: Compass },
  { href: "#academic-coach", label: "Academic coach", icon: Brain },
  { href: "#tutor-insight", label: "Deep insight", icon: BarChart3 },
  { href: "#tutor-week", label: "Weekly loop", icon: CalendarCheck2 },
  { href: "#tutor-progress-records", label: "Progress & records", icon: History },
  { href: "#tutor-strategy", label: "Strategy", icon: Lightbulb },
  { href: "#tutor-tools", label: "Tools", icon: Wrench },
]

export function PersonalTutorShell() {
  return (
    <TutorIntelligenceProvider>
      <div className="fellow-ui min-h-screen pb-12">
      <div className="fellow-page-header mx-auto max-w-7xl px-4 pt-6"><p className="fellow-eyebrow">My Tutor</p><h1 className="fellow-page-title mt-2">Your academic coaching workspace</h1><p className="fellow-description mt-2">Start with coaching. Open planning, analysis or saved records when you need them.</p></div>
      <TutorDisclosure title="Today’s plan and tutor conversation" defaultOpen><div id="tutor-today" className="scroll-mt-24"><PersonalTutorDashboard /></div></TutorDisclosure>

      <nav className="fellow-tutor-subnav sticky top-14 z-[70] border-y bg-white/95 backdrop-blur" aria-label="Tutor command centre sections">
        <div className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-3 py-2 sm:px-6">
          {tutorSections.map(item => {
            const Icon = item.icon
            return <a key={item.href} href={item.href} className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl px-3 text-xs font-semibold text-slate-600 transition hover:bg-[#e9f1ee] hover:text-[#142d3e] sm:text-sm"><Icon className="size-4 text-[#326d71]" />{item.label}</a>
          })}
          <Link href="/learning-trajectory" className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl bg-[#e9f1ee] px-3 text-xs font-semibold text-[#142d3e] transition hover:bg-[#dff1f3] sm:text-sm"><TrendingUp className="size-4 text-[#326d71]"/>Trajectory</Link>
        </div>
      </nav>

      <section className="mx-auto max-w-7xl px-4 pt-5 sm:px-6"><div className="fellow-panel flex flex-wrap items-center justify-between gap-3 p-4"><div><p className="font-semibold text-[#142d3e]">Academic assessment report</p><p className="mt-1 text-sm text-slate-600">Compare saved reasoning evidence, recurring missed items and delayed coaching checks.</p></div><Link href="/assessment-report" className="fellow-primary">View private report</Link></div></section>
      <section className="mx-auto max-w-7xl px-4 pt-4 sm:px-6"><div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-white p-4"><div><p className="font-semibold text-[#142d3e]">Personal preparation pathway</p><p className="mt-1 text-sm text-slate-600">Plan course-specific academic activities, check official requirements and develop supercurricular evidence.</p></div><Link href="/preparation-pathway" className="rounded-xl bg-[#142d3e] px-4 py-2 text-sm font-semibold text-white">Build your pathway</Link></div></section>
      <TutorDisclosure title="Academic coach" defaultOpen><AcademicCoach /></TutorDisclosure>
      <TutorDisclosure title="Detailed academic analysis"><TutorEvidenceQuality />
      <div id="tutor-insight" className="scroll-mt-28"><TutorDeepInsightLoader /></div></TutorDisclosure>
      <TutorDisclosure title="Weekly preparation programme"><div id="tutor-week" className="scroll-mt-28"><TutorExecutionLoopLoader /></div></TutorDisclosure>
      <TutorDisclosure title="Saved progress and completed work"><TutorProgressRecordsHub />
      <TutorCompletedWork /></TutorDisclosure>
      <TutorDisclosure title="Preparation strategy"><div id="tutor-strategy" className="scroll-mt-28"><TutorStrategicBrief /></div></TutorDisclosure>
      <TutorDisclosure title="Advanced coaching tools"><div id="tutor-tools" className="scroll-mt-28"><NextgenTutorPanel /></div></TutorDisclosure>

      </div>
    </TutorIntelligenceProvider>
  )
}

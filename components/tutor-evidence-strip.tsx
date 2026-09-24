"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { ArrowRight, BookOpenCheck, CheckCircle2, FileText, Gauge, Sparkles, Target, TrendingUp } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PROGRESS_KEY } from "@/lib/personal-tutor"

type JsonRecord = Record<string, unknown>

type EvidenceState = {
  interviews: number
  papers: number
  essays: number
  readings: number
  latestPaper?: { label: string; score: number }
  latestEssay?: { weakness: string; score?: number }
  latestRetest?: { label: string; before: number; after: number }
}

function record(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {}
}

function array(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function numberValue(value: unknown, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function newest(items: unknown[]) {
  return items
    .map(record)
    .sort((a, b) => new Date(String(b.date ?? b.createdAt ?? b.savedAt ?? 0)).getTime() - new Date(String(a.date ?? a.createdAt ?? a.savedAt ?? 0)).getTime())[0]
}

function readEvidence(): EvidenceState {
  try {
    const progress = record(JSON.parse(localStorage.getItem(PROGRESS_KEY) || "{}"))
    const paperRows = array(progress.fullPaperResults)
    const essayRows = array(progress.essayAnalyses)
    const interventionRows = array(progress.interventionResults)
    const readingRows = array(JSON.parse(localStorage.getItem("oxbridge-reading-reflections-v1") || "[]"))
    const latestPaperRow = newest(paperRows)
    const latestEssayRow = newest(essayRows)
    const latestInterventionRow = newest(interventionRows)

    const analysis = record(latestEssayRow?.analysis)
    const dimensions = array(analysis.dimensions).map(record)
    const weakestDimension = dimensions
      .filter(item => typeof item.label === "string")
      .sort((a, b) => numberValue(a.score, 100) - numberValue(b.score, 100))[0]

    return {
      interviews: numberValue(progress.sessions, array(progress.logs).length),
      papers: paperRows.length,
      essays: essayRows.length,
      readings: readingRows.length,
      latestPaper: latestPaperRow && Object.keys(latestPaperRow).length
        ? { label: String(latestPaperRow.test ?? latestPaperRow.title ?? "Full paper"), score: numberValue(latestPaperRow.accuracy ?? latestPaperRow.score) }
        : undefined,
      latestEssay: latestEssayRow && Object.keys(latestEssayRow).length
        ? { weakness: String(weakestDimension?.label ?? latestEssayRow.weakest ?? "Argument precision"), score: weakestDimension ? numberValue(weakestDimension.score) : undefined }
        : undefined,
      latestRetest: latestInterventionRow && Object.keys(latestInterventionRow).length
        ? {
            label: String(latestInterventionRow.test ?? "Targeted retest"),
            before: numberValue(latestInterventionRow.originalAccuracy),
            after: numberValue(latestInterventionRow.retestAccuracy),
          }
        : undefined,
    }
  } catch {
    return { interviews: 0, papers: 0, essays: 0, readings: 0 }
  }
}

export function TutorEvidenceStrip() {
  const [evidence, setEvidence] = useState<EvidenceState>({ interviews: 0, papers: 0, essays: 0, readings: 0 })
  useEffect(() => setEvidence(readEvidence()), [])

  const insight = useMemo(() => {
    if (evidence.latestRetest) {
      const delta = evidence.latestRetest.after - evidence.latestRetest.before
      if (delta >= 8) return {
        title: "A targeted intervention is working",
        body: `${evidence.latestRetest.label} improved from ${evidence.latestRetest.before}% to ${evidence.latestRetest.after}%. Keep the retention check in the plan so the gain is tested after a delay.`,
        href: "/paper-intervention",
        action: "Review intervention",
      }
      return {
        title: "One weakness is still open",
        body: `${evidence.latestRetest.label} is at ${evidence.latestRetest.after}% after targeted practice. Keep this in the Tutor plan until it is secure on a fresh retest.`,
        href: "/paper-intervention",
        action: "Continue intervention",
      }
    }
    if (evidence.latestEssay) return {
      title: "Your latest writing target",
      body: `${evidence.latestEssay.weakness}${typeof evidence.latestEssay.score === "number" ? ` is currently ${evidence.latestEssay.score}%` : ""}. The next essay should deliberately practise this one feature rather than trying to improve everything at once.`,
      href: "/essay-tutor",
      action: "Practise writing",
    }
    if (evidence.latestPaper) return {
      title: "Turn your latest paper into a plan",
      body: `${evidence.latestPaper.label} is currently ${evidence.latestPaper.score}% in the saved evidence. Use the intervention loop to convert mistakes into a targeted retest.`,
      href: "/paper-intervention",
      action: "Target weaknesses",
    }
    return {
      title: "Build your first evidence baseline",
      body: "Complete one interview and one timed paper. The Tutor becomes much more useful once it can compare how you reason aloud with how you perform under test conditions.",
      href: "/gemini-live-interview",
      action: "Start baseline",
    }
  }, [evidence])

  const metrics = [
    { label: "Interviews", value: evidence.interviews, icon: Gauge },
    { label: "Full papers", value: evidence.papers, icon: Target },
    { label: "Essays", value: evidence.essays, icon: FileText },
    { label: "Reading reflections", value: evidence.readings, icon: BookOpenCheck },
  ]

  return (
    <section className="mx-auto max-w-7xl px-4 pb-6 sm:px-6">
      <Card className="overflow-hidden border-[#dbe5e7] bg-white shadow-none">
        <CardHeader className="border-b bg-[#f8fbfb] pb-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[.18em] text-[#147d91]">Your latest evidence</p>
              <CardTitle className="mt-1 font-serif text-2xl">See progress without hunting through every tool.</CardTitle>
            </div>
            <Badge variant="outline"><Sparkles className="size-3.5" />Evidence-led coaching</Badge>
          </div>
        </CardHeader>
        <CardContent className="grid gap-5 p-5 lg:grid-cols-[1fr_.9fr]">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {metrics.map(item => <div key={item.label} className="rounded-2xl border bg-[#fbfcfc] p-4"><item.icon className="mb-3 size-4 text-[#147d91]" /><p className="text-2xl font-bold text-[#172b3a]">{item.value}</p><p className="mt-1 text-xs text-[#667984]">{item.label}</p></div>)}
          </div>
          <div className="rounded-2xl bg-[#102a43] p-5 text-white">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.15em] text-[#8dd7de]"><TrendingUp className="size-4" />Tutor interpretation</div>
            <h3 className="mt-3 font-serif text-xl font-bold">{insight.title}</h3>
            <p className="mt-2 text-sm leading-6 text-blue-50/75">{insight.body}</p>
            <Button asChild size="sm" className="mt-4 bg-white text-[#102a43] hover:bg-blue-50"><Link href={insight.href}>{insight.action} <ArrowRight /></Link></Button>
          </div>
        </CardContent>
      </Card>
    </section>
  )
}

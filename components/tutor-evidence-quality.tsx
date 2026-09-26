"use client"

import Link from "next/link"
import { Activity, ArrowRight, Clock3, DatabaseZap, ShieldCheck } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { useTutorIntelligence } from "@/components/tutor-intelligence-context"

function ageLabel(days: number | null) {
  if (days === null) return "No dated evidence"
  if (days === 0) return "Updated today"
  if (days === 1) return "Updated yesterday"
  return `Latest evidence ${days} days ago`
}

export function TutorEvidenceQuality() {
  const { evidenceQuality, intelligence, ready } = useTutorIntelligence()
  if (!ready) return null

  const status = evidenceQuality.freshness === "stale"
    ? "Refresh needed"
    : evidenceQuality.confidence >= 70
      ? "Well supported"
      : evidenceQuality.confidence >= 45
        ? "Developing evidence"
        : "Provisional"

  return (
    <section className="mx-auto max-w-7xl px-4 pt-5 sm:px-6" aria-label="Tutor evidence confidence">
      <Card className="border-[#dbe5e7] bg-white shadow-none">
        <CardContent className="grid gap-4 p-4 md:grid-cols-[1.2fr_.8fr_auto] md:items-center md:p-5">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <DatabaseZap className="size-4 text-[#147d91]" />
              <p className="text-sm font-bold text-[#172b3a]">Tutor evidence confidence</p>
              <Badge variant={evidenceQuality.confidence >= 70 && evidenceQuality.freshness !== "stale" ? "default" : "outline"}>{status}</Badge>
            </div>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{evidenceQuality.summary}</p>
            <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1"><Clock3 className="size-3.5" />{ageLabel(evidenceQuality.latestEvidenceAgeDays)}</span>
              <span className="inline-flex items-center gap-1"><Activity className="size-3.5" />{evidenceQuality.totalEvidenceCount} evidence item{evidenceQuality.totalEvidenceCount === 1 ? "" : "s"}</span>
              <span className="inline-flex items-center gap-1"><ShieldCheck className="size-3.5" />{evidenceQuality.coveredDomains}/3 core domains covered</span>
            </div>
          </div>

          <div className="rounded-2xl bg-[#f4f8f8] p-4">
            <div className="flex items-end justify-between gap-3"><span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Diagnostic confidence</span><strong className="text-2xl text-[#172b3a]">{evidenceQuality.confidence}%</strong></div>
            <Progress className="mt-2" value={evidenceQuality.confidence} />
            <p className="mt-2 text-xs leading-5 text-slate-500">Priority: {intelligence.priority?.label ?? "Build baseline"}. Confidence describes the evidence base, not admissions chances.</p>
          </div>

          {(evidenceQuality.freshness === "stale" || evidenceQuality.confidence < 70) && (
            <Button asChild className="md:justify-self-end">
              <Link href={evidenceQuality.refreshAction.href}>{evidenceQuality.refreshAction.label} <ArrowRight /></Link>
            </Button>
          )}
        </CardContent>
      </Card>
    </section>
  )
}

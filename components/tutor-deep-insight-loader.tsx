"use client"

import { TutorDeepInsight } from "@/components/tutor-deep-insight"
import { useTutorIntelligence } from "@/components/tutor-intelligence-context"

export function TutorDeepInsightLoader() {
  const { intelligence, ready } = useTutorIntelligence()

  if (!ready) return <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6"><div className="h-40 animate-pulse rounded-3xl border bg-white" /></section>

  return <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6"><TutorDeepInsight intelligence={intelligence} /></div>
}

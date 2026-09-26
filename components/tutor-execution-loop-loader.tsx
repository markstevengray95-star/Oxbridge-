"use client"

import { TutorExecutionLoop } from "@/components/tutor-execution-loop"
import { useTutorIntelligence } from "@/components/tutor-intelligence-context"

export function TutorExecutionLoopLoader() {
  const { intelligence, ready } = useTutorIntelligence()

  if (!ready) return <section className="mx-auto max-w-7xl px-4 pb-8 sm:px-6"><div className="h-44 animate-pulse rounded-3xl border bg-white" /></section>

  return <TutorExecutionLoop intelligence={intelligence} />
}

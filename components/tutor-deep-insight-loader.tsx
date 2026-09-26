"use client"

import { useEffect, useMemo, useState } from "react"
import { TutorDeepInsight } from "@/components/tutor-deep-insight"
import { TutorExecutionLoop } from "@/components/tutor-execution-loop"
import { PROFILE_KEY, PROGRESS_KEY, buildStudentIntelligence } from "@/lib/personal-tutor"

function readRecord(key: string) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "{}")
    return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}
  } catch {
    return {}
  }
}

export function TutorDeepInsightLoader() {
  const [profile, setProfile] = useState<Record<string, unknown>>({ university: "Both", course: "Physics", year: "2027" })
  const [progress, setProgress] = useState<Record<string, unknown>>({})
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const refresh = () => {
      setProfile({ university: "Both", course: "Physics", year: "2027", ...readRecord(PROFILE_KEY) })
      setProgress(readRecord(PROGRESS_KEY))
      setReady(true)
    }
    refresh()
    window.addEventListener("focus", refresh)
    window.addEventListener("storage", refresh)
    return () => {
      window.removeEventListener("focus", refresh)
      window.removeEventListener("storage", refresh)
    }
  }, [])

  const intelligence = useMemo(() => buildStudentIntelligence(profile, progress), [profile, progress])

  if (!ready) return <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6"><div className="h-40 animate-pulse rounded-3xl border bg-white" /></section>

  return <>
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6"><TutorDeepInsight intelligence={intelligence} /></div>
    <TutorExecutionLoop intelligence={intelligence} />
  </>
}

"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import {
  PROFILE_KEY,
  PROGRESS_KEY,
  buildStudentIntelligence,
} from "@/lib/personal-tutor"
import {
  buildTutorEvidenceQuality,
  refineStudentIntelligence,
  type RefinedStudentIntelligence,
  type TutorEvidenceQuality,
} from "@/lib/tutor-evidence-quality"

type JsonRecord = Record<string, unknown>

type TutorIntelligenceContextValue = {
  profile: JsonRecord
  progress: JsonRecord
  intelligence: RefinedStudentIntelligence
  evidenceQuality: TutorEvidenceQuality
  ready: boolean
  refresh: () => void
}

const DEFAULT_PROFILE: JsonRecord = { university: "Both", course: "Physics", year: "2027" }
const EMPTY_BASE = buildStudentIntelligence(DEFAULT_PROFILE, {})
const EMPTY_INTELLIGENCE = refineStudentIntelligence(EMPTY_BASE, {})
const EMPTY_QUALITY = buildTutorEvidenceQuality({}, EMPTY_BASE)

const TutorIntelligenceContext = createContext<TutorIntelligenceContextValue>({
  profile: DEFAULT_PROFILE,
  progress: {},
  intelligence: EMPTY_INTELLIGENCE,
  evidenceQuality: EMPTY_QUALITY,
  ready: false,
  refresh: () => undefined,
})

function readRecord(key: string) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "{}")
    return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {}
  } catch {
    return {}
  }
}

export function TutorIntelligenceProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<JsonRecord>(DEFAULT_PROFILE)
  const [progress, setProgress] = useState<JsonRecord>({})
  const [ready, setReady] = useState(false)

  const refresh = useCallback(() => {
    setProfile({ ...DEFAULT_PROFILE, ...readRecord(PROFILE_KEY) })
    setProgress(readRecord(PROGRESS_KEY))
    setReady(true)
  }, [])

  useEffect(() => {
    refresh()
    const onStorage = (event: StorageEvent) => {
      if (!event.key || event.key === PROFILE_KEY || event.key === PROGRESS_KEY) refresh()
    }
    window.addEventListener("focus", refresh)
    window.addEventListener("storage", onStorage)
    window.addEventListener("scholarbridge-progress-updated", refresh as EventListener)
    return () => {
      window.removeEventListener("focus", refresh)
      window.removeEventListener("storage", onStorage)
      window.removeEventListener("scholarbridge-progress-updated", refresh as EventListener)
    }
  }, [refresh])

  const baseIntelligence = useMemo(() => buildStudentIntelligence(profile, progress), [profile, progress])
  const intelligence = useMemo(() => refineStudentIntelligence(baseIntelligence, progress), [baseIntelligence, progress])
  const evidenceQuality = intelligence.evidenceQuality
  const value = useMemo(() => ({ profile, progress, intelligence, evidenceQuality, ready, refresh }), [profile, progress, intelligence, evidenceQuality, ready, refresh])

  return <TutorIntelligenceContext.Provider value={value}>{children}</TutorIntelligenceContext.Provider>
}

export function useTutorIntelligence() {
  return useContext(TutorIntelligenceContext)
}

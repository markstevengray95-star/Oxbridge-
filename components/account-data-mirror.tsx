"use client"

import { useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { PROFILE_KEY, PROGRESS_KEY, buildStudentIntelligence } from "@/lib/personal-tutor"
import { PLAN_ONBOARDING_STATE_KEY, onboardingCompleted } from "@/lib/onboarding"

function parseStored(raw: string | null): unknown {
  if (!raw) return null
  try {
    return JSON.parse(raw) as unknown
  } catch {
    return null
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

function textValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null
}

function applicationYear(value: unknown) {
  const year = Number(value)
  return Number.isInteger(year) && year >= 2020 && year <= 2100 ? year : null
}

export function AccountDataMirror() {
  useEffect(() => {
    const supabase = createClient()
    let cancelled = false
    let activeUserId: string | null = null
    let timer: number | null = null
    let syncing = false
    let lastFingerprint = ""

    function stopTimer() {
      if (timer) window.clearInterval(timer)
      timer = null
    }

    async function syncDerivedData(userId: string, force = false) {
      if (cancelled || syncing || userId !== activeUserId || !navigator.onLine) return

      const profileRaw = localStorage.getItem(PROFILE_KEY)
      const progressRaw = localStorage.getItem(PROGRESS_KEY)
      const onboardingRaw = localStorage.getItem(PLAN_ONBOARDING_STATE_KEY)
      const fingerprint = `${profileRaw ?? ""}\u0000${progressRaw ?? ""}\u0000${onboardingRaw ?? ""}`
      if (!force && fingerprint === lastFingerprint) return

      syncing = true
      try {
        const profileValue = parseStored(profileRaw)
        const progressValue = parseStored(progressRaw)
        const onboardingValue = parseStored(onboardingRaw)
        const profile = asRecord(profileValue)
        const now = new Date().toISOString()
        const writes: Array<PromiseLike<{ error: { message: string } | null }>> = []

        if (profileRaw !== null || onboardingRaw !== null) {
          const row: Record<string, unknown> = { id: userId, updated_at: now }
          const displayName = textValue(profile.displayName ?? profile.name)
          const university = textValue(profile.university ?? profile.targetUniversity)
          const course = textValue(profile.course ?? profile.targetCourse)
          const year = applicationYear(profile.year ?? profile.applicationYear)

          if (displayName) row.display_name = displayName
          if (university === "Oxford" || university === "Cambridge" || university === "Both") row.target_university = university
          if (course) row.target_course = course
          if (year) row.application_year = year
          if (onboardingRaw !== null) row.onboarding_completed = onboardingCompleted(onboardingValue)

          writes.push(supabase.from("profiles").upsert(row, { onConflict: "id" }))
        }

        if (profileRaw !== null || progressRaw !== null) {
          const snapshot = buildStudentIntelligence(profileValue ?? {}, progressValue ?? {})
          writes.push(supabase.from("student_intelligence").upsert({
            user_id: userId,
            snapshot,
            updated_at: now,
          }, { onConflict: "user_id" }))
        }

        if (!writes.length) {
          lastFingerprint = fingerprint
          return
        }

        const results = await Promise.all(writes)
        const failed = results.find(result => result.error)
        if (failed?.error) {
          console.warn("Oxbridge structured account sync failed", failed.error.message)
          return
        }

        lastFingerprint = fingerprint
      } finally {
        syncing = false
      }
    }

    async function initialise(userId: string) {
      activeUserId = userId
      lastFingerprint = ""
      stopTimer()
      await syncDerivedData(userId, true)
      timer = window.setInterval(() => { void syncDerivedData(userId) }, 10000)
    }

    async function refreshUser() {
      const { data } = await supabase.auth.getUser()
      const userId = data.user?.id ?? null
      if (!userId) {
        activeUserId = null
        lastFingerprint = ""
        stopTimer()
        return
      }
      if (userId !== activeUserId) await initialise(userId)
    }

    void refreshUser()

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      const userId = session?.user?.id ?? null
      if (!userId) {
        activeUserId = null
        lastFingerprint = ""
        stopTimer()
        return
      }
      if (userId !== activeUserId) void initialise(userId)
    })

    const onStorage = (event: StorageEvent) => {
      const userId = activeUserId
      if (!userId) return
      if (event.key === PROFILE_KEY || event.key === PROGRESS_KEY || event.key === PLAN_ONBOARDING_STATE_KEY) {
        void syncDerivedData(userId)
      }
    }
    const onCloudUpdate = () => {
      const userId = activeUserId
      if (userId) void syncDerivedData(userId, true)
    }
    const onFocus = () => {
      const userId = activeUserId
      if (userId) void syncDerivedData(userId)
    }
    const onOnline = () => {
      const userId = activeUserId
      if (userId) void syncDerivedData(userId, true)
    }

    window.addEventListener("storage", onStorage)
    window.addEventListener("oxbridge-cloud-state-updated", onCloudUpdate)
    window.addEventListener("focus", onFocus)
    window.addEventListener("online", onOnline)

    return () => {
      cancelled = true
      stopTimer()
      authListener.subscription.unsubscribe()
      window.removeEventListener("storage", onStorage)
      window.removeEventListener("oxbridge-cloud-state-updated", onCloudUpdate)
      window.removeEventListener("focus", onFocus)
      window.removeEventListener("online", onOnline)
    }
  }, [])

  return null
}

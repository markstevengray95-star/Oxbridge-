"use client"

import { useEffect } from "react"
import { createClient } from "@/lib/supabase/client"

const PROFILE_KEY = "oxbridge-tutor-profile-v2"
const PROGRESS_KEY = "oxbridge-tutor-progress-v2"
const STATE_KEYS = [PROFILE_KEY, PROGRESS_KEY] as const
const RESTORE_MARKER = "oxbridge-cloud-restore-v1"

type ProgressLog = {
  id?: unknown
  title?: unknown
  date?: unknown
  events?: unknown
}

function parseStored(raw: string | null) {
  if (!raw) return null
  try {
    return JSON.parse(raw) as unknown
  } catch {
    return null
  }
}

function serialise(value: unknown) {
  try {
    return JSON.stringify(value ?? {})
  } catch {
    return "{}"
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null
}

function durationSeconds(events: string[]) {
  const duration = events.find(event => event.startsWith("Duration:"))?.replace("Duration:", "").trim()
  if (!duration) return 0
  const [minutes, seconds] = duration.split(":").map(Number)
  if (!Number.isFinite(minutes) || !Number.isFinite(seconds)) return 0
  return Math.max(0, Math.round(minutes * 60 + seconds))
}

function turnFromEvent(event: string) {
  if (event.startsWith("Candidate: ")) {
    const raw = event.slice("Candidate: ".length)
    const marker = " | Feedback: "
    const markerIndex = raw.indexOf(marker)
    return {
      role: "candidate",
      content: markerIndex >= 0 ? raw.slice(0, markerIndex) : raw,
      feedback: markerIndex >= 0 ? raw.slice(markerIndex + marker.length) : null,
    }
  }
  if (event.startsWith("Interviewer: ")) {
    return { role: "interviewer", content: event.slice("Interviewer: ".length), feedback: null }
  }
  return null
}

export function CloudProgressSync() {
  useEffect(() => {
    const supabase = createClient()
    let cancelled = false
    let timer: number | null = null
    let activeUserId: string | null = null
    const lastSeen = new Map<string, string>()

    async function importInterviewLogs(userId: string, progressValue: unknown) {
      const progress = asRecord(progressValue)
      const logs = Array.isArray(progress?.logs) ? progress.logs as ProgressLog[] : []

      for (const [logIndex, log] of logs.slice(0, 40).entries()) {
        const title = typeof log.title === "string" ? log.title : ""
        if (!title.startsWith("Gemini Live Interview")) continue

        const events = Array.isArray(log.events) ? log.events.filter((item): item is string => typeof item === "string") : []
        const sourceRef = typeof log.id === "string" && log.id ? log.id : `gemini-import-${logIndex}-${title}-${String(log.date ?? "")}`
        const course = title.includes("·") ? title.split("·").slice(1).join("·").trim() || "General" : "General"

        let sessionId: string | null = null
        const { data: existing } = await supabase
          .from("interview_sessions")
          .select("id")
          .eq("user_id", userId)
          .eq("source_ref", sourceRef)
          .maybeSingle()

        if (existing?.id) {
          sessionId = existing.id
        } else {
          const { data: created, error } = await supabase
            .from("interview_sessions")
            .insert({
              user_id: userId,
              course,
              duration_seconds: durationSeconds(events),
              summary: "Saved Gemini Live interview",
              overall_feedback: { source: "cloud_progress_sync" },
              source_ref: sourceRef,
            })
            .select("id")
            .single()

          if (error) {
            console.warn("Oxbridge interview history import failed", error.message)
            continue
          }
          sessionId = created.id
        }

        const parsedTurns = events.map(turnFromEvent).filter((turn): turn is NonNullable<ReturnType<typeof turnFromEvent>> => Boolean(turn))
        if (parsedTurns.length) {
          const rows = parsedTurns.map((turn, index) => ({
            session_id: sessionId,
            user_id: userId,
            turn_index: index,
            role: turn.role,
            content: turn.content,
            feedback: turn.feedback,
          }))
          const { error } = await supabase.from("interview_turns").upsert(rows, { onConflict: "session_id,turn_index" })
          if (error) console.warn("Oxbridge interview turns import failed", error.message)
        }

        for (const turn of parsedTurns) {
          if (!turn.feedback) continue
          const { error } = await supabase.from("memory_items").insert({
            user_id: userId,
            category: "note",
            subject: course,
            content: turn.feedback,
            confidence: 0.7,
            source_type: "interview_feedback",
            source_id: sessionId,
            is_active: true,
          })
          if (error && error.code !== "23505") console.warn("Oxbridge learning memory import failed", error.message)
        }
      }
    }

    async function pushKey(userId: string, key: string, raw: string) {
      const value = parseStored(raw)
      if (value === null) return
      const { error } = await supabase.from("user_state").upsert({
        user_id: userId,
        state_key: key,
        state_value: value,
      }, { onConflict: "user_id,state_key" })
      if (!error) {
        lastSeen.set(key, raw)
        if (key === PROGRESS_KEY) await importInterviewLogs(userId, value)
      } else {
        console.warn("Oxbridge cloud save failed", key, error.message)
      }
    }

    async function syncLocalChanges() {
      if (!activeUserId || cancelled) return
      for (const key of STATE_KEYS) {
        const raw = localStorage.getItem(key)
        if (!raw || lastSeen.get(key) === raw) continue
        await pushKey(activeUserId, key, raw)
      }
    }

    async function initialise(userId: string) {
      activeUserId = userId
      lastSeen.clear()

      const { data, error } = await supabase
        .from("user_state")
        .select("state_key,state_value,updated_at")
        .eq("user_id", userId)
        .in("state_key", [...STATE_KEYS])

      if (cancelled) return
      if (error) {
        console.warn("Oxbridge cloud restore failed", error.message)
        return
      }

      const rows = new Map((data ?? []).map(row => [row.state_key, row]))
      let restored = false

      for (const key of STATE_KEYS) {
        const localRaw = localStorage.getItem(key)
        const cloudRow = rows.get(key)

        if (cloudRow) {
          const cloudRaw = serialise(cloudRow.state_value)
          if (localRaw !== cloudRaw) {
            localStorage.setItem(key, cloudRaw)
            restored = true
          }
          lastSeen.set(key, cloudRaw)
          if (key === PROGRESS_KEY) await importInterviewLogs(userId, cloudRow.state_value)
        } else if (localRaw) {
          await pushKey(userId, key, localRaw)
        }
      }

      const marker = `${userId}:${STATE_KEYS.join(",")}`
      if (restored && sessionStorage.getItem(RESTORE_MARKER) !== marker) {
        sessionStorage.setItem(RESTORE_MARKER, marker)
        window.location.reload()
        return
      }

      if (timer) window.clearInterval(timer)
      timer = window.setInterval(() => { void syncLocalChanges() }, 2500)
    }

    async function refreshUser() {
      const { data } = await supabase.auth.getUser()
      const userId = data.user?.id ?? null
      if (!userId) {
        activeUserId = null
        lastSeen.clear()
        if (timer) window.clearInterval(timer)
        timer = null
        return
      }
      await initialise(userId)
    }

    void refreshUser()

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      const userId = session?.user?.id ?? null
      if (!userId) {
        activeUserId = null
        lastSeen.clear()
        if (timer) window.clearInterval(timer)
        timer = null
        return
      }
      if (userId !== activeUserId) void initialise(userId)
    })

    const onStorage = (event: StorageEvent) => {
      if (!activeUserId || !event.key || !STATE_KEYS.includes(event.key as (typeof STATE_KEYS)[number]) || !event.newValue) return
      void pushKey(activeUserId, event.key, event.newValue)
    }

    const onFocus = () => { void syncLocalChanges() }
    window.addEventListener("storage", onStorage)
    window.addEventListener("focus", onFocus)

    return () => {
      cancelled = true
      if (timer) window.clearInterval(timer)
      authListener.subscription.unsubscribe()
      window.removeEventListener("storage", onStorage)
      window.removeEventListener("focus", onFocus)
    }
  }, [])

  return null
}

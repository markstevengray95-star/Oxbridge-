"use client"

import { useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { PROGRESS_KEY } from "@/lib/personal-tutor"

const APP_STATE_PREFIX = "oxbridge-"
const LOCAL_CACHE_OWNER_KEY = "__oxbridge_local_cache_owner_v1"
const RESTORE_MARKER = "oxbridge-cloud-restore-v3"
const RAW_STORAGE_FORMAT_KEY = "__oxbridge_storage_format"
const RAW_STORAGE_FORMAT = "raw-v1"

type ProgressLog = {
  id?: unknown
  title?: unknown
  date?: unknown
  events?: unknown
}

function isAppStateKey(key: string | null): key is string {
  return Boolean(key?.startsWith(APP_STATE_PREFIX))
}

function localAppStateKeys() {
  const keys: string[] = []
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index)
    if (isAppStateKey(key)) keys.push(key)
  }
  return keys.sort()
}

function clearLocalAppState() {
  for (const key of localAppStateKeys()) localStorage.removeItem(key)
}

function toCloudValue(raw: string): unknown {
  try {
    return JSON.parse(raw) as unknown
  } catch {
    return { [RAW_STORAGE_FORMAT_KEY]: RAW_STORAGE_FORMAT, value: raw }
  }
}

function fromCloudValue(value: unknown) {
  const record = asRecord(value)
  if (record?.[RAW_STORAGE_FORMAT_KEY] === RAW_STORAGE_FORMAT && typeof record.value === "string") return record.value
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

    function stopTimer() {
      if (timer) window.clearInterval(timer)
      timer = null
    }

    function resetSignedOutCache() {
      activeUserId = null
      lastSeen.clear()
      stopTimer()
      clearLocalAppState()
      localStorage.removeItem(LOCAL_CACHE_OWNER_KEY)
      sessionStorage.removeItem(RESTORE_MARKER)
    }

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
      if (!isAppStateKey(key) || cancelled || userId !== activeUserId) return
      const value = toCloudValue(raw)
      const { error } = await supabase.from("user_state").upsert({
        user_id: userId,
        state_key: key,
        state_value: value,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id,state_key" })

      if (error) {
        console.warn("Oxbridge cloud save failed", key, error.message)
        return
      }

      lastSeen.set(key, raw)
      if (key === PROGRESS_KEY) await importInterviewLogs(userId, value)
    }

    async function deleteKey(userId: string, key: string) {
      if (!isAppStateKey(key) || cancelled || userId !== activeUserId) return
      const { error } = await supabase
        .from("user_state")
        .delete()
        .eq("user_id", userId)
        .eq("state_key", key)

      if (error) {
        console.warn("Oxbridge cloud delete failed", key, error.message)
        return
      }
      lastSeen.delete(key)
    }

    async function syncLocalChanges() {
      const userId = activeUserId
      if (!userId || cancelled) return

      const currentKeys = new Set(localAppStateKeys())
      const keys = new Set([...currentKeys, ...lastSeen.keys()])

      for (const key of keys) {
        if (cancelled || userId !== activeUserId) return
        const raw = localStorage.getItem(key)
        if (raw === null) {
          if (lastSeen.has(key)) await deleteKey(userId, key)
          continue
        }
        if (lastSeen.get(key) !== raw) await pushKey(userId, key, raw)
      }
    }

    async function initialise(userId: string) {
      stopTimer()
      const previousOwner = localStorage.getItem(LOCAL_CACHE_OWNER_KEY)
      const switchedAccount = Boolean(previousOwner && previousOwner !== userId)
      if (switchedAccount) clearLocalAppState()

      activeUserId = userId
      lastSeen.clear()
      localStorage.setItem(LOCAL_CACHE_OWNER_KEY, userId)

      const { data, error } = await supabase
        .from("user_state")
        .select("state_key,state_value")
        .eq("user_id", userId)

      if (cancelled || userId !== activeUserId) return
      if (error) {
        console.warn("Oxbridge cloud restore failed", error.message)
        return
      }

      const rows = new Map(
        (data ?? [])
          .filter(row => isAppStateKey(row.state_key))
          .map(row => [row.state_key, row] as const),
      )
      const keys = new Set([...rows.keys(), ...localAppStateKeys()])
      let restored = switchedAccount

      for (const key of keys) {
        if (cancelled || userId !== activeUserId) return
        const localRaw = localStorage.getItem(key)
        const cloudRow = rows.get(key)

        if (cloudRow) {
          const cloudRaw = fromCloudValue(cloudRow.state_value)
          if (localRaw !== cloudRaw) {
            localStorage.setItem(key, cloudRaw)
            restored = true
          }
          lastSeen.set(key, cloudRaw)
          if (key === PROGRESS_KEY) await importInterviewLogs(userId, cloudRow.state_value)
        } else if (localRaw !== null) {
          await pushKey(userId, key, localRaw)
        }
      }

      const marker = `${userId}:all-app-state-v3`
      if (restored && sessionStorage.getItem(RESTORE_MARKER) !== marker) {
        sessionStorage.setItem(RESTORE_MARKER, marker)
        window.location.reload()
        return
      }

      timer = window.setInterval(() => { void syncLocalChanges() }, 1000)
    }

    async function refreshUser() {
      const { data } = await supabase.auth.getUser()
      const userId = data.user?.id ?? null
      if (!userId) {
        resetSignedOutCache()
        return
      }
      if (userId !== activeUserId) await initialise(userId)
    }

    void refreshUser()

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      const userId = session?.user?.id ?? null
      if (!userId) {
        resetSignedOutCache()
        return
      }
      if (userId !== activeUserId) void initialise(userId)
    })

    const onStorage = (event: StorageEvent) => {
      const userId = activeUserId
      if (!userId || !isAppStateKey(event.key)) return
      if (event.newValue === null) void deleteKey(userId, event.key)
      else void pushKey(userId, event.key, event.newValue)
    }

    const onFocus = () => { void syncLocalChanges() }
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") void syncLocalChanges()
    }

    window.addEventListener("storage", onStorage)
    window.addEventListener("focus", onFocus)
    document.addEventListener("visibilitychange", onVisibilityChange)

    return () => {
      cancelled = true
      stopTimer()
      authListener.subscription.unsubscribe()
      window.removeEventListener("storage", onStorage)
      window.removeEventListener("focus", onFocus)
      document.removeEventListener("visibilitychange", onVisibilityChange)
    }
  }, [])

  return null
}

"use client"

import { useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { PROGRESS_KEY } from "@/lib/personal-tutor"

type Log = { id?: unknown; title?: unknown; date?: unknown; events?: unknown; score?: unknown; dimensions?: unknown; feedbackReport?: unknown; mockSession?: unknown }
type TestResult = { id?: unknown; test?: unknown; form?: unknown; title?: unknown; date?: unknown; rawScore?: unknown; maxRawMarks?: unknown; totalQuestions?: unknown; accuracy?: unknown; durationSeconds?: unknown; [key: string]: unknown }

type Turn = { role: "candidate" | "interviewer"; content: string; feedback: string | null }
const LAST_PAPER_KEY = "oxbridge-last-full-test-result-v1"

function record(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

function integer(value: unknown, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? Math.round(parsed) : fallback
}

function optionalInteger(value: unknown) {
  if (value === null || value === undefined || value === "") return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? Math.round(parsed) : null
}

function dateValue(value: unknown) {
  if (typeof value === "string" && value.trim()) {
    const direct = new Date(value)
    if (!Number.isNaN(direct.getTime())) return direct.toISOString()
    const uk = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
    if (uk) return new Date(Date.UTC(Number(uk[3]), Number(uk[2]) - 1, Number(uk[1]), 12)).toISOString()
  }
  return new Date().toISOString()
}

function parseTurn(event: string): Turn | null {
  const candidate = event.match(/^Candidate:\s*(.+)$/i)
  if (candidate) {
    const marker = " | Feedback: "
    const at = candidate[1].indexOf(marker)
    const content = (at >= 0 ? candidate[1].slice(0, at) : candidate[1]).replace(/\s+\|\s+Confidence:\s*\d+%?\s*$/i, "").trim()
    const feedback = at >= 0 ? candidate[1].slice(at + marker.length).replace(/\s+\|\s+Confidence:\s*\d+%?\s*$/i, "").trim() : ""
    return content ? { role: "candidate", content, feedback: feedback || null } : null
  }
  const interviewer = event.match(/^Interviewer(?:\s+[A-Za-z0-9/ -]+)?:\s*(.+)$/i)
  return interviewer?.[1]?.trim() ? { role: "interviewer", content: interviewer[1].trim(), feedback: null } : null
}

function duration(events: string[]) {
  const raw = events.find(item => /^Duration:/i.test(item))?.replace(/^Duration:\s*/i, "")
  if (!raw) return 0
  const [minutes, seconds] = raw.split(":").map(Number)
  return Number.isFinite(minutes) && Number.isFinite(seconds) ? Math.max(0, Math.round(minutes * 60 + seconds)) : 0
}

export function HistoryCloudMirror() {
  useEffect(() => {
    const supabase = createClient()
    let activeUserId: string | null = null
    let readyUserId: string | null = null
    let syncing = false
    let lastRaw = ""

    async function mirror(userId: string, force = false) {
      if (syncing || userId !== activeUserId || userId !== readyUserId || !navigator.onLine) return
      const raw = localStorage.getItem(PROGRESS_KEY) || "{}"
      const lastPaperRaw = localStorage.getItem(LAST_PAPER_KEY) || "{}"
      const fingerprint = raw + "\\u0000" + lastPaperRaw
      if (!force && fingerprint === lastRaw) return
      let progress: Record<string, unknown>
      try { progress = record(JSON.parse(raw)) } catch { return }
      syncing = true
      try {
        const logs = Array.isArray(progress.logs) ? progress.logs as Log[] : []
        for (const [index, log] of logs.filter(item => /interview|panel|gemini live next/i.test(String(item.title ?? ""))).slice(0, 100).entries()) {
          const events = Array.isArray(log.events) ? log.events.filter((item): item is string => typeof item === "string") : []
          const turns = events.map(parseTurn).filter((item): item is Turn => Boolean(item))
          if (!turns.length) continue
          const title = String(log.title || "Saved interview")
          const sourceRef = typeof log.id === "string" && log.id ? log.id : `history-${index}-${title}-${String(log.date ?? "")}`
          const course = title.includes("·") ? title.split("·").slice(1).join("·").trim() || "General" : "General"
          const mock = record(log.mockSession)
          const feedback = { source: "history_cloud_mirror", title, score: typeof log.score === "number" ? log.score : null, dimensions: record(log.dimensions), feedbackReport: record(log.feedbackReport), mockSession: mock }
          const savedDuration = Math.max(0, Math.min(7200, integer(mock.elapsedSeconds, duration(events))))
          const existing = await supabase.from("interview_sessions").select("id").eq("user_id", userId).eq("source_ref", sourceRef).maybeSingle()
          if (existing.error) throw existing.error
          let sessionId = existing.data?.id as string | undefined
          if (sessionId) {
            const updated = await supabase.from("interview_sessions").update({ course, duration_seconds: savedDuration, summary: title, overall_feedback: feedback, updated_at: new Date().toISOString() }).eq("id", sessionId).eq("user_id", userId)
            if (updated.error) throw updated.error
          } else {
            const created = await supabase.from("interview_sessions").insert({ user_id: userId, course, duration_seconds: duration(events), summary: title, overall_feedback: feedback, source_ref: sourceRef, created_at: dateValue(log.date) }).select("id").single()
            if (created.error) throw created.error
            sessionId = created.data?.id as string | undefined
          }
          if (!sessionId) continue
          const savedTurns = await supabase.from("interview_turns").upsert(turns.map((turn, turnIndex) => ({ session_id: sessionId, user_id: userId, turn_index: turnIndex, role: turn.role, content: turn.content, feedback: turn.feedback })), { onConflict: "session_id,turn_index" })
          if (savedTurns.error) throw savedTurns.error
        }

        const results = Array.isArray(progress.fullPaperResults) ? [...progress.fullPaperResults] as TestResult[] : []
        try {
          const savedLast = record(JSON.parse(lastPaperRaw)) as TestResult
          if (typeof savedLast.id === "string" && typeof savedLast.test === "string"
            && !results.some(item => item.id === savedLast.id)) results.unshift(savedLast)
        } catch {
          // A malformed older result cannot block the rest of this account's history.
        }
        if (results.length) {
          const written = await supabase.from("test_results").upsert(results.slice(0, 100).map((item, index) => ({
            user_id: userId,
            source_ref: typeof item.id === "string" && item.id ? item.id : `test-${index}-${String(item.test ?? "practice")}-${String(item.date ?? "")}`,
            test: typeof item.test === "string" && item.test ? item.test : "Practice test",
            form: optionalInteger(item.form),
            title: typeof item.title === "string" ? item.title : null,
            completed_at: dateValue(item.date),
            raw_score: integer(item.rawScore),
            max_raw_marks: optionalInteger(item.maxRawMarks),
            total_questions: Math.max(0, integer(item.totalQuestions)),
            accuracy: Math.max(0, Math.min(100, integer(item.accuracy))),
            duration_seconds: optionalInteger(item.durationSeconds),
            payload: item,
            updated_at: new Date().toISOString(),
          })), { onConflict: "user_id,source_ref" })
          if (written.error) throw written.error
        }
        lastRaw = fingerprint
        window.dispatchEvent(new CustomEvent("oxbridge-history-updated", { detail: { userId } }))
      } catch (error) {
        // Leave lastRaw unchanged so the next interval reattempts unsaved history.
        console.warn("Oxbridge history cloud mirror will retry", error instanceof Error ? error.message : "unknown error")
      } finally { syncing = false }
    }

    async function refreshUser() {
      const { data } = await supabase.auth.getUser()
      activeUserId = data.user?.id ?? null
      readyUserId = null
      lastRaw = ""
    }
    void refreshUser()

    const auth = supabase.auth.onAuthStateChange((_event, session) => {
      activeUserId = session?.user?.id ?? null
      readyUserId = null
      lastRaw = ""
    })
    const ready = (event: Event) => {
      const userId = (event as CustomEvent<{ userId?: string }>).detail?.userId
      if (!userId || userId !== activeUserId) return
      readyUserId = userId
      void mirror(userId, true)
    }
    const notReady = () => { readyUserId = null; lastRaw = "" }
    const refresh = () => { if (activeUserId && activeUserId === readyUserId) void mirror(activeUserId) }

    window.addEventListener("oxbridge-cloud-ready", ready)
    window.addEventListener("oxbridge-cloud-not-ready", notReady)
    window.addEventListener("focus", refresh)
    window.addEventListener("online", refresh)
    window.addEventListener("oxbridge-cloud-state-updated", refresh)
    const timer = window.setInterval(refresh, 3000)

    return () => {
      window.clearInterval(timer)
      auth.data.subscription.unsubscribe()
      window.removeEventListener("oxbridge-cloud-ready", ready)
      window.removeEventListener("oxbridge-cloud-not-ready", notReady)
      window.removeEventListener("focus", refresh)
      window.removeEventListener("online", refresh)
      window.removeEventListener("oxbridge-cloud-state-updated", refresh)
    }
  }, [])
  return null
}

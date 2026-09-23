"use client"

import { useEffect } from "react"
import { createClient } from "@/lib/supabase/client"

const STATE_KEYS = [
  "oxbridge-tutor-profile-v2",
  "oxbridge-tutor-progress-v2",
] as const

const RESTORE_MARKER = "oxbridge-cloud-restore-v1"

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

export function CloudProgressSync() {
  useEffect(() => {
    const supabase = createClient()
    let cancelled = false
    let timer: number | null = null
    let activeUserId: string | null = null
    const lastSeen = new Map<string, string>()

    async function pushKey(userId: string, key: string, raw: string) {
      const value = parseStored(raw)
      if (value === null) return
      const { error } = await supabase.from("user_state").upsert({
        user_id: userId,
        state_key: key,
        state_value: value,
      }, { onConflict: "user_id,state_key" })
      if (!error) lastSeen.set(key, raw)
      else console.warn("Oxbridge cloud save failed", key, error.message)
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

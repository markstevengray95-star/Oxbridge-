"use client"

import { useEffect, useState } from "react"
import { CheckCircle2, CircleAlert, LoaderCircle } from "lucide-react"

type HealthState =
  | { state: "checking" }
  | { state: "online"; checkedAt: string }
  | { state: "unavailable" }

export function ServiceStatusProbe() {
  const [health, setHealth] = useState<HealthState>({ state: "checking" })

  useEffect(() => {
    const controller = new AbortController()

    async function check() {
      try {
        const response = await fetch("/api/health", {
          cache: "no-store",
          signal: controller.signal,
        })
        const body = await response.json().catch(() => null)
        if (!response.ok || body?.status !== "ok") {
          setHealth({ state: "unavailable" })
          return
        }
        setHealth({ state: "online", checkedAt: body.checkedAt || new Date().toISOString() })
      } catch (error) {
        if (!controller.signal.aborted) setHealth({ state: "unavailable" })
      }
    }

    void check()
    return () => controller.abort()
  }, [])

  if (health.state === "checking") {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-5" role="status">
        <LoaderCircle className="size-6 animate-spin text-[#147d91]" aria-hidden="true" />
        <div><p className="font-bold text-[#102a43]">Checking ScholarBridge</p><p className="mt-1 text-sm text-slate-600">Testing the public application health endpoint.</p></div>
      </div>
    )
  }

  if (health.state === "unavailable") {
    return (
      <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-5" role="status">
        <CircleAlert className="mt-0.5 size-6 text-amber-700" aria-hidden="true" />
        <div><p className="font-bold text-amber-950">Health check could not be confirmed</p><p className="mt-1 text-sm leading-6 text-amber-900">The status page loaded, but the application health endpoint did not return a successful response. Try again shortly or use Support if the issue continues.</p></div>
      </div>
    )
  }

  return (
    <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-5" role="status">
      <CheckCircle2 className="mt-0.5 size-6 text-emerald-700" aria-hidden="true" />
      <div>
        <p className="font-bold text-emerald-950">ScholarBridge web application is responding</p>
        <p className="mt-1 text-sm leading-6 text-emerald-900">Application health check passed at <time dateTime={health.checkedAt}>{new Date(health.checkedAt).toLocaleString("en-GB")}</time>.</p>
      </div>
    </div>
  )
}

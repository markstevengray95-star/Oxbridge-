"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"

export const PRIVACY_COOKIE = "scholarbridge_privacy_choices_v1"
export type PrivacyChoice = "essential" | "optional"

function readChoice(): PrivacyChoice | null {
  if (typeof document === "undefined") return null
  const item = document.cookie.split("; ").find(part => part.startsWith(`${PRIVACY_COOKIE}=`))
  const value = item?.split("=")[1]
  return value === "essential" || value === "optional" ? value : null
}

function writeChoice(choice: PrivacyChoice) {
  const maxAge = 60 * 60 * 24 * 180
  document.cookie = `${PRIVACY_COOKIE}=${choice}; Max-Age=${maxAge}; Path=/; SameSite=Lax; Secure`
  window.dispatchEvent(new CustomEvent("scholarbridge-privacy-change", { detail: choice }))
}

export function PrivacyConsentBanner() {
  const [choice, setChoice] = useState<PrivacyChoice | null>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const saved = readChoice()
    setChoice(saved)
    setOpen(!saved)
  }, [])

  function save(next: PrivacyChoice) {
    writeChoice(next)
    setChoice(next)
    setOpen(false)
  }

  if (!open) {
    return <button type="button" onClick={() => setOpen(true)} className="fixed bottom-3 right-3 z-[160] rounded-full border border-slate-200 bg-white/95 px-3 py-2 text-xs font-semibold text-slate-700 shadow-lg backdrop-blur hover:bg-slate-50" aria-label="Manage privacy choices">Privacy choices</button>
  }

  return <div className="fixed inset-x-3 bottom-3 z-[170] mx-auto max-w-4xl rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl sm:p-5" role="dialog" aria-live="polite" aria-label="Privacy choices">
    <div className="flex items-start gap-3">
      <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl bg-[#edf7f8] text-[#147d91]"><ShieldCheck className="size-5" /></span>
      <div className="min-w-0 flex-1">
        <p className="font-serif text-lg font-bold text-[#102a43]">Your privacy choices</p>
        <p className="mt-1 text-sm leading-6 text-slate-600">ScholarBridge uses essential storage for sign-in, security, plan access and saving your choices. Optional third-party tools, such as external voice services, are only enabled when you allow them or choose to use that feature.</p>
        <p className="mt-2 text-xs leading-5 text-slate-500">You can change this choice later. Read the <Link href="/privacy" className="font-semibold text-[#147d91] hover:underline">Privacy Notice</Link> and <Link href="/cookies" className="font-semibold text-[#147d91] hover:underline">Cookie Notice</Link>.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => save("essential")}>Essential only</Button>
          <Button type="button" onClick={() => save("optional")}>Allow optional</Button>
        </div>
      </div>
    </div>
  </div>
}

export function hasOptionalPrivacyConsent() {
  return readChoice() === "optional"
}

export function grantOptionalPrivacyConsent() {
  writeChoice("optional")
}

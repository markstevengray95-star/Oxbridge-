"use client"

import { FormEvent, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, CheckCircle2, KeyRound, Loader2, LockKeyhole } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [ready, setReady] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")

  useEffect(() => {
    let active = true
    const supabase = createClient()

    void supabase.auth.getUser().then(({ data, error }) => {
      if (!active) return
      if (error || !data.user) {
        setError("This password-reset session is missing or has expired. Request a new reset email.")
      } else {
        setReady(true)
      }
    })

    return () => { active = false }
  }, [])

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError("")
    setMessage("")

    if (password.length < 8) {
      setError("Use a password with at least 8 characters.")
      return
    }
    if (password !== confirmPassword) {
      setError("The two passwords do not match.")
      return
    }

    setBusy(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      setMessage("Password updated successfully. Taking you back to your account…")
      window.setTimeout(() => {
        router.replace("/account")
        router.refresh()
      }, 700)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update the password.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#f2f5f5] px-4 py-10 text-[#172b3a] sm:px-6">
      <div className="mx-auto max-w-xl">
        <Link href="/login" className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-[#526a75]"><ArrowLeft className="size-4" />Back to sign in</Link>
        <Card className="rounded-[2rem] border-[#dbe5e7] shadow-[0_25px_70px_rgba(16,42,67,.08)]">
          <CardHeader className="space-y-3">
            <div className="grid size-12 place-items-center rounded-2xl bg-[#102a43] text-white"><KeyRound /></div>
            <CardTitle className="font-serif text-3xl">Choose a new password</CardTitle>
            <CardDescription>Use a new password for your Oxbridge Prep account.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4">
              <label className="block space-y-1.5">
                <span className="text-sm font-semibold">New password</span>
                <div className="relative"><LockKeyhole className="absolute left-3 top-3 size-4 text-[#7b8d96]" /><Input className="pl-9" type="password" value={password} onChange={event => setPassword(event.target.value)} minLength={8} autoComplete="new-password" required disabled={!ready || busy} /></div>
                <p className="text-xs text-[#7b8d96]">Use at least 8 characters.</p>
              </label>

              <label className="block space-y-1.5">
                <span className="text-sm font-semibold">Confirm new password</span>
                <div className="relative"><CheckCircle2 className="absolute left-3 top-3 size-4 text-[#7b8d96]" /><Input className="pl-9" type="password" value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} minLength={8} autoComplete="new-password" required disabled={!ready || busy} /></div>
              </label>

              {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>}
              {message && <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">{message}</div>}

              <Button className="h-11 w-full" disabled={!ready || busy}>{busy ? <><Loader2 className="animate-spin" />Updating…</> : "Set new password"}</Button>
            </form>

            {!ready && <p className="mt-4 text-sm text-[#667984]">If your reset link has expired, return to sign in and request another one.</p>}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}

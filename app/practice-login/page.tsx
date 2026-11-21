"use client"

import Link from "next/link"
import { FormEvent, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { GraduationCap, KeyRound, Loader2, LockKeyhole, UserRound } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

function nextPath() {
  if (typeof window === "undefined") return "/student-home"
  const next = new URLSearchParams(window.location.search).get("next")
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/student-home"
}

export default function PracticeLoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    const status = new URLSearchParams(window.location.search).get("status")
    if (status === "expired") setError("This practice login has expired. Please ask your administrator for a new expiry date.")
    if (status === "removed") setError("This practice login has been removed. Please contact your administrator.")
    if (status === "unavailable") setError("Practice access could not be verified. Please try again.")
  }, [])

  async function submit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError("")
    try {
      const response = await fetch("/api/auth/practice-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      })
      const data = await response.json() as { error?: string; nextPath?: string }
      if (!response.ok) throw new Error(data.error || "Could not sign in.")
      const requested = nextPath()
      router.replace(requested === "/student-home" && data.nextPath === "/teacher-dashboard" ? "/teacher-dashboard" : requested)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in.")
    } finally {
      setBusy(false)
    }
  }

  return <main className="min-h-screen bg-[#f2f5f5] px-4 py-8 text-[#172b3a] sm:px-6 lg:py-12">
    <div className="mx-auto max-w-xl">
      <Link href="/login" className="mb-6 inline-flex items-center gap-2 font-serif text-lg font-bold text-[#102a43]"><GraduationCap className="size-5 text-[#147d91]" />Fellow</Link>
      <Card className="overflow-hidden rounded-[2rem] border-[#dbe5e7] shadow-[0_30px_90px_rgba(16,42,67,.09)]">
        <div className="bg-[#102a43] p-7 text-white sm:p-9">
          <div className="grid size-12 place-items-center rounded-2xl bg-white/10 text-[#8dd7de]"><KeyRound /></div>
          <h1 className="mt-5 font-serif text-3xl font-bold">Practice and teacher access</h1>
          <p className="mt-3 text-sm leading-6 text-white/70">Use the username and password your administrator gave you. Student practice accounts keep progress saved for each learner, while teacher accounts open their own school progress dashboard.</p>
        </div>
        <CardHeader className="pb-2"><CardTitle className="font-serif text-2xl">Sign in with your issued username</CardTitle><CardDescription>No email address is required for this managed login.</CardDescription></CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <label className="block space-y-1.5"><span className="text-sm font-semibold">Username</span><div className="relative"><UserRound className="absolute left-3 top-3 size-4 text-[#7b8d96]" /><Input className="pl-9" value={username} onChange={event => setUsername(event.target.value)} autoCapitalize="none" autoCorrect="off" autoComplete="username" required /></div></label>
            <label className="block space-y-1.5"><span className="text-sm font-semibold">Password</span><div className="relative"><LockKeyhole className="absolute left-3 top-3 size-4 text-[#7b8d96]" /><Input className="pl-9" value={password} onChange={event => setPassword(event.target.value)} type="password" minLength={8} maxLength={128} autoComplete="current-password" required /></div></label>
            {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>}
            <Button className="h-11 w-full" disabled={busy}>{busy ? <><Loader2 className="animate-spin" />Signing in…</> : <><KeyRound />Start practising</>}</Button>
          </form>
          <div className="mt-5 border-t pt-4 text-sm"><Link href="/login" className="font-semibold text-[#147d91] hover:underline">Use a normal email account instead</Link></div>
        </CardContent>
      </Card>
    </div>
  </main>
}

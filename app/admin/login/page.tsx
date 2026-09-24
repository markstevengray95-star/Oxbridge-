"use client"

import Link from "next/link"
import { FormEvent, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, CheckCircle2, KeyRound, Loader2, LockKeyhole, Mail, ShieldCheck } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { createClient } from "@/lib/supabase/client"

export default function AdminLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [busy, setBusy] = useState(false)
  const [checking, setChecking] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get("error") === "not-authorized") {
      setError("That account is signed in, but it has not been granted administrator access.")
    }

    void fetch("/api/admin/me", { cache: "no-store" })
      .then(async response => response.ok ? response.json() as Promise<{ isAdmin?: boolean }> : { isAdmin: false })
      .then(data => {
        if (data.isAdmin) {
          router.replace("/admin")
          router.refresh()
        }
      })
      .finally(() => setChecking(false))
  }, [router])

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (busy) return
    setBusy(true)
    setError("")

    try {
      const supabase = createClient()
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })
      if (authError) throw authError

      const response = await fetch("/api/admin/me", { cache: "no-store" })
      const access = await response.json() as { isAdmin?: boolean }
      if (!response.ok || !access.isAdmin) {
        setError("The login is valid, but this account is not authorised as an app administrator.")
        return
      }

      router.replace("/admin")
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in as an administrator.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#eef3f4] px-4 py-8 text-[#172b3a] sm:px-6 lg:py-12">
      <div className="mx-auto max-w-5xl">
        <Link href="/" className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-[#526a75]"><ArrowLeft className="size-4" />Back to Oxbridge Prep</Link>
        <div className="grid overflow-hidden rounded-[2rem] border border-[#d8e2e5] bg-white shadow-[0_30px_90px_rgba(16,42,67,.1)] lg:grid-cols-[.9fr_1.1fr]">
          <section className="bg-[#102a43] p-7 text-white sm:p-10">
            <div className="grid size-12 place-items-center rounded-2xl bg-white/10 text-[#8dd7de]"><ShieldCheck /></div>
            <Badge className="mt-6 border-white/15 bg-white/10 text-white">Administrator access</Badge>
            <h1 className="mt-4 font-serif text-3xl font-bold">Full app access from one secure login.</h1>
            <p className="mt-4 text-sm leading-6 text-white/70">Administrator accounts bypass the normal Free, Pro and School feature gates and do not consume the monthly Gemini Live allowance.</p>
            <div className="mt-7 space-y-3 text-sm text-white/80">
              <p className="flex gap-2"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[#8dd7de]" />Unlimited Gemini Live sessions</p>
              <p className="flex gap-2"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[#8dd7de]" />Access to all Pro and School tools</p>
              <p className="flex gap-2"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[#8dd7de]" />Role checked on the server and in Supabase</p>
            </div>
          </section>

          <section className="p-6 sm:p-10">
            <Card className="border-0 shadow-none">
              <CardHeader className="px-0 pt-0">
                <CardTitle className="font-serif text-3xl">Admin sign in</CardTitle>
                <CardDescription>Use the same email/password account that has been granted the administrator role.</CardDescription>
              </CardHeader>
              <CardContent className="px-0">
                <form onSubmit={submit} className="space-y-4">
                  <label className="block space-y-1.5">
                    <span className="text-sm font-semibold">Admin email</span>
                    <div className="relative"><Mail className="absolute left-3 top-3 size-4 text-[#7b8d96]" /><Input className="pl-9" type="email" value={email} onChange={event => setEmail(event.target.value)} autoComplete="email" required /></div>
                  </label>
                  <label className="block space-y-1.5">
                    <span className="text-sm font-semibold">Password</span>
                    <div className="relative"><LockKeyhole className="absolute left-3 top-3 size-4 text-[#7b8d96]" /><Input className="pl-9" type="password" value={password} onChange={event => setPassword(event.target.value)} autoComplete="current-password" required /></div>
                  </label>

                  {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>}

                  <Button className="h-11 w-full" disabled={busy || checking}>
                    {busy || checking ? <><Loader2 className="animate-spin" />{checking ? "Checking access…" : "Signing in…"}</> : <><KeyRound />Open admin console</>}
                  </Button>
                </form>

                <div className="mt-5 border-t pt-5 text-sm text-[#667984]">
                  <p>This page does not create administrator privileges. The account must already be on the server-side administrator allowlist or in the protected admin-role table.</p>
                  <Button asChild variant="link" className="mt-2 h-auto p-0"><Link href="/login">Use the normal student/teacher sign in</Link></Button>
                </div>
              </CardContent>
            </Card>
          </section>
        </div>
      </div>
    </main>
  )
}

"use client"

import { FormEvent, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, CheckCircle2, GraduationCap, Loader2, LockKeyhole, Mail, UserPlus } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

function nextPath() {
  if (typeof window === "undefined") return "/account"
  const next = new URLSearchParams(window.location.search).get("next")
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/account"
}

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<"signin" | "signup">("signin")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  async function submit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError("")
    setMessage("")

    try {
      const supabase = createClient()
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { display_name: displayName.trim() || email.split("@")[0] },
            emailRedirectTo: `${window.location.origin}/account`,
          },
        })
        if (error) throw error
        if (data.session) {
          router.replace(nextPath())
          router.refresh()
        } else {
          setMessage("Account created. Check your email to confirm your address, then sign in.")
          setMode("signin")
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        router.replace(nextPath())
        router.refresh()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not authenticate. Please try again.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#f2f5f5] px-4 py-8 text-[#172b3a] sm:px-6 lg:py-12">
      <div className="mx-auto max-w-5xl">
        <Link href="/" className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-[#526a75]"><ArrowLeft className="size-4" />Back to Oxbridge Prep</Link>
        <div className="grid overflow-hidden rounded-[2rem] border border-[#dbe5e7] bg-white shadow-[0_30px_90px_rgba(16,42,67,.09)] lg:grid-cols-[.9fr_1.1fr]">
          <section className="bg-[#102a43] p-7 text-white sm:p-10">
            <div className="grid size-12 place-items-center rounded-2xl bg-white/10 text-[#8dd7de]"><GraduationCap /></div>
            <h1 className="mt-6 font-serif text-3xl font-bold">Your preparation, saved to your account.</h1>
            <p className="mt-4 text-sm leading-6 text-white/70">Your interviews, test attempts, strengths, weaknesses and study plan are linked to your login, so you can continue on another device without sharing progress with anyone else.</p>
            <div className="mt-7 space-y-3 text-sm text-white/80">
              <p className="flex gap-2"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[#8dd7de]" />Separate progress and memory for every user</p>
              <p className="flex gap-2"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[#8dd7de]" />Secure row-level database permissions</p>
              <p className="flex gap-2"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[#8dd7de]" />Cloud history across phone, tablet and computer</p>
            </div>
          </section>

          <section className="p-6 sm:p-10">
            <Card className="border-0 shadow-none">
              <CardHeader className="px-0 pt-0">
                <CardTitle className="font-serif text-3xl">{mode === "signin" ? "Sign in" : "Create your account"}</CardTitle>
                <CardDescription>{mode === "signin" ? "Continue your saved Oxbridge preparation." : "Create a private account for your own preparation history."}</CardDescription>
              </CardHeader>
              <CardContent className="px-0">
                <form onSubmit={submit} className="space-y-4">
                  {mode === "signup" && <label className="block space-y-1.5"><span className="text-sm font-semibold">Name</span><div className="relative"><UserPlus className="absolute left-3 top-3 size-4 text-[#7b8d96]" /><Input className="pl-9" value={displayName} onChange={event => setDisplayName(event.target.value)} placeholder="Your name" autoComplete="name" /></div></label>}
                  <label className="block space-y-1.5"><span className="text-sm font-semibold">Email</span><div className="relative"><Mail className="absolute left-3 top-3 size-4 text-[#7b8d96]" /><Input className="pl-9" value={email} onChange={event => setEmail(event.target.value)} type="email" placeholder="you@example.com" autoComplete="email" required /></div></label>
                  <label className="block space-y-1.5"><span className="text-sm font-semibold">Password</span><div className="relative"><LockKeyhole className="absolute left-3 top-3 size-4 text-[#7b8d96]" /><Input className="pl-9" value={password} onChange={event => setPassword(event.target.value)} type="password" minLength={8} autoComplete={mode === "signin" ? "current-password" : "new-password"} required /></div><p className="text-xs text-[#7b8d96]">Use at least 8 characters.</p></label>
                  {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>}
                  {message && <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">{message}</div>}
                  <Button className="h-11 w-full" disabled={busy}>{busy ? <><Loader2 className="animate-spin" />Please wait…</> : mode === "signin" ? "Sign in" : "Create account"}</Button>
                </form>
                <button type="button" className="mt-5 text-sm font-semibold text-[#147d91] hover:underline" onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(""); setMessage("") }}>{mode === "signin" ? "New here? Create an account" : "Already have an account? Sign in"}</button>
              </CardContent>
            </Card>
          </section>
        </div>
      </div>
    </main>
  )
}

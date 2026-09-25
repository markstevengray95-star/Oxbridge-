"use client"

import { FormEvent, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle2, GraduationCap, KeyRound, Loader2, LockKeyhole, Mail, RefreshCw, UserPlus } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

type Mode = "signin" | "signup" | "forgot"

function nextPath() {
  if (typeof window === "undefined") return "/post-login"
  const next = new URLSearchParams(window.location.search).get("next")
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/post-login"
}

function confirmationRedirect(next = nextPath()) {
  return `${window.location.origin}/auth/confirm?next=${encodeURIComponent(next)}`
}

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>("signin")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const authError = params.get("error")
    const authMessage = params.get("message")
    if (authError) setError(authError)
    if (authMessage) setMessage(authMessage)
  }, [])

  async function submit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError("")
    setMessage("")

    try {
      const supabase = createClient()

      if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: confirmationRedirect("/reset-password"),
        })
        if (error) throw error
        setMessage("If an account uses that email address, a password-reset email has been sent. Check your inbox and spam folder.")
        return
      }

      if (mode === "signup") {
        const afterConfirm = nextPath()
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: { display_name: displayName.trim() || email.split("@")[0] },
            emailRedirectTo: confirmationRedirect(afterConfirm),
          },
        })
        if (error) throw error

        if (data.session) {
          router.replace(afterConfirm)
          router.refresh()
        } else {
          setMessage("Account created. Check your email to confirm your address; the confirmation link will continue to plan selection.")
          setMode("signin")
          setPassword("")
        }
        return
      }

      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
      if (error) throw error
      router.replace(nextPath())
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not authenticate. Please try again.")
    } finally {
      setBusy(false)
    }
  }

  async function resendConfirmation() {
    if (!email.trim()) {
      setError("Enter the email address you registered with first.")
      return
    }

    setBusy(true)
    setError("")
    setMessage("")
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: email.trim(),
        options: { emailRedirectTo: confirmationRedirect(nextPath()) },
      })
      if (error) throw error
      setMessage("A new confirmation email has been requested. Check your inbox and spam folder.")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not resend the confirmation email.")
    } finally {
      setBusy(false)
    }
  }

  function changeMode(nextMode: Mode) {
    setMode(nextMode)
    setError("")
    setMessage("")
    if (nextMode !== "signup") setDisplayName("")
    if (nextMode === "forgot") setPassword("")
  }

  const heading = mode === "signin" ? "Sign in" : mode === "signup" ? "Create your account" : "Reset your password"
  const description = mode === "signin"
    ? "Sign in to continue. New accounts choose a plan before entering the app."
    : mode === "signup"
      ? "Create your private account first. You will choose Free, Pro or School next."
      : "Enter your email and we’ll send a secure password-reset link."

  return (
    <main className="min-h-screen bg-[#f2f5f5] px-4 py-8 text-[#172b3a] sm:px-6 lg:py-12">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center gap-2 font-serif text-lg font-bold text-[#102a43]"><GraduationCap className="size-5 text-[#147d91]" />ScholarBridge</div>
        <div className="grid overflow-hidden rounded-[2rem] border border-[#dbe5e7] bg-white shadow-[0_30px_90px_rgba(16,42,67,.09)] lg:grid-cols-[.9fr_1.1fr]">
          <section className="bg-[#102a43] p-7 text-white sm:p-10">
            <div className="grid size-12 place-items-center rounded-2xl bg-white/10 text-[#8dd7de]"><GraduationCap /></div>
            <h1 className="mt-6 font-serif text-3xl font-bold">Create your account before entering ScholarBridge.</h1>
            <p className="mt-4 text-sm leading-6 text-white/70">Your interviews, test attempts, strengths, weaknesses and study plan stay linked to your own login. After account creation you will choose Free, Pro or School before the app opens.</p>
            <div className="mt-7 space-y-3 text-sm text-white/80">
              <p className="flex gap-2"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[#8dd7de]" />Separate progress and memory for every user</p>
              <p className="flex gap-2"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[#8dd7de]" />Plan choice shown before app access</p>
              <p className="flex gap-2"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[#8dd7de]" />Cloud history across phone, tablet and computer</p>
            </div>
          </section>

          <section className="p-6 sm:p-10">
            <Card className="border-0 shadow-none">
              <CardHeader className="px-0 pt-0">
                <CardTitle className="font-serif text-3xl">{heading}</CardTitle>
                <CardDescription>{description}</CardDescription>
              </CardHeader>
              <CardContent className="px-0">
                <form onSubmit={submit} className="space-y-4">
                  {mode === "signup" && <label className="block space-y-1.5"><span className="text-sm font-semibold">Name</span><div className="relative"><UserPlus className="absolute left-3 top-3 size-4 text-[#7b8d96]" /><Input className="pl-9" value={displayName} onChange={event => setDisplayName(event.target.value)} placeholder="Your name" autoComplete="name" /></div></label>}
                  <label className="block space-y-1.5"><span className="text-sm font-semibold">Email</span><div className="relative"><Mail className="absolute left-3 top-3 size-4 text-[#7b8d96]" /><Input className="pl-9" value={email} onChange={event => setEmail(event.target.value)} type="email" placeholder="you@example.com" autoComplete="email" required /></div></label>
                  {mode !== "forgot" && <label className="block space-y-1.5"><span className="text-sm font-semibold">Password</span><div className="relative"><LockKeyhole className="absolute left-3 top-3 size-4 text-[#7b8d96]" /><Input className="pl-9" value={password} onChange={event => setPassword(event.target.value)} type="password" minLength={8} autoComplete={mode === "signin" ? "current-password" : "new-password"} required /></div>{mode === "signup" && <p className="text-xs text-[#7b8d96]">Use at least 8 characters.</p>}</label>}
                  {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>}
                  {message && <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">{message}</div>}
                  <Button className="h-11 w-full" disabled={busy}>{busy ? <><Loader2 className="animate-spin" />Please wait…</> : mode === "signin" ? "Sign in" : mode === "signup" ? "Create account" : <><KeyRound />Send reset email</>}</Button>
                </form>
                {mode === "signin" && <div className="mt-5 flex flex-col gap-2 text-sm"><button type="button" className="w-fit font-semibold text-[#147d91] hover:underline" onClick={() => changeMode("signup")}>New here? Create an account</button><button type="button" className="w-fit font-semibold text-[#147d91] hover:underline" onClick={() => changeMode("forgot")}>Forgot your password?</button><button type="button" disabled={busy} className="inline-flex w-fit items-center gap-1.5 font-semibold text-[#526a75] hover:underline disabled:opacity-50" onClick={resendConfirmation}><RefreshCw className="size-3.5" />Resend confirmation email</button></div>}
                {mode === "signup" && <button type="button" className="mt-5 text-sm font-semibold text-[#147d91] hover:underline" onClick={() => changeMode("signin")}>Already have an account? Sign in</button>}
                {mode === "forgot" && <button type="button" className="mt-5 text-sm font-semibold text-[#147d91] hover:underline" onClick={() => changeMode("signin")}>Back to sign in</button>}
              </CardContent>
            </Card>
          </section>
        </div>
      </div>
    </main>
  )
}

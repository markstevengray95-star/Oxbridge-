"use client"

import Link from "next/link"
import { FormEvent, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle2, GraduationCap, KeyRound, Loader2, LockKeyhole, Mail, RefreshCw, UserPlus } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

type Mode = "signin" | "signup" | "forgot"
type AgeBand = "13-15" | "16-17" | "18+" | ""
const TERMS_VERSION="2026-09-25"
const PRIVACY_VERSION="2026-09-25"

function nextPath() {
  if (typeof window === "undefined") return "/post-login"
  const next = new URLSearchParams(window.location.search).get("next")
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/post-login"
}
function confirmationRedirect(next = nextPath()) { return `${window.location.origin}/auth/confirm?next=${encodeURIComponent(next)}` }

export default function LoginPage() {
  const router = useRouter()
  const [mode,setMode]=useState<Mode>("signin")
  const [email,setEmail]=useState("")
  const [password,setPassword]=useState("")
  const [displayName,setDisplayName]=useState("")
  const [ageBand,setAgeBand]=useState<AgeBand>("")
  const [acceptedTerms,setAcceptedTerms]=useState(false)
  const [acceptedPrivacy,setAcceptedPrivacy]=useState(false)
  const [busy,setBusy]=useState(false)
  const [message,setMessage]=useState("")
  const [error,setError]=useState("")

  useEffect(()=>{const params=new URLSearchParams(window.location.search);const authError=params.get("error");const authMessage=params.get("message");if(authError)setError(authError);if(authMessage)setMessage(authMessage)},[])

  async function submit(event:FormEvent){
    event.preventDefault();setBusy(true);setError("");setMessage("")
    try{
      const supabase=createClient()
      if(mode==="forgot"){
        const {error}=await supabase.auth.resetPasswordForEmail(email.trim(),{redirectTo:confirmationRedirect("/reset-password")})
        if(error)throw error
        setMessage("If an account uses that email address, a password-reset email has been sent. Check your inbox and spam folder.");return
      }
      if(mode==="signup"){
        if(!ageBand)throw new Error("Choose your age band. ScholarBridge uses this only to apply age-appropriate protections; we do not need your date of birth.")
        if(!acceptedTerms||!acceptedPrivacy)throw new Error("Please read and accept the Terms and acknowledge the Privacy Notice before creating an account.")
        const afterConfirm=nextPath(),acceptedAt=new Date().toISOString()
        const {data,error}=await supabase.auth.signUp({email:email.trim(),password,options:{data:{display_name:displayName.trim()||email.split("@")[0],age_band:ageBand,terms_version:TERMS_VERSION,privacy_version:PRIVACY_VERSION,legal_accepted_at:acceptedAt},emailRedirectTo:confirmationRedirect(afterConfirm)}})
        if(error)throw error
        if(data.session){router.replace(afterConfirm);router.refresh()}
        else{setMessage("Account created. Check your email to confirm your address; the confirmation link will continue to plan selection.");setMode("signin");setPassword("")}
        return
      }
      const {error}=await supabase.auth.signInWithPassword({email:email.trim(),password});if(error)throw error
      router.replace(nextPath());router.refresh()
    }catch(err){setError(err instanceof Error?err.message:"Could not authenticate. Please try again.")}
    finally{setBusy(false)}
  }

  async function resendConfirmation(){
    if(!email.trim()){setError("Enter the email address you registered with first.");return}
    setBusy(true);setError("");setMessage("")
    try{const supabase=createClient();const {error}=await supabase.auth.resend({type:"signup",email:email.trim(),options:{emailRedirectTo:confirmationRedirect(nextPath())}});if(error)throw error;setMessage("A new confirmation email has been requested. Check your inbox and spam folder.")}
    catch(err){setError(err instanceof Error?err.message:"Could not resend the confirmation email.")}
    finally{setBusy(false)}
  }

  function changeMode(nextMode:Mode){setMode(nextMode);setError("");setMessage("");if(nextMode!=="signup"){setDisplayName("");setAgeBand("");setAcceptedTerms(false);setAcceptedPrivacy(false)}if(nextMode==="forgot")setPassword("")}
  const heading=mode==="signin"?"Sign in":mode==="signup"?"Create your account":"Reset your password"
  const description=mode==="signin"?"Sign in to continue. New accounts choose a plan before entering the app.":mode==="signup"?"Create a private account with age-appropriate privacy protections, then choose Free, Pro or School.":"Enter your email and we’ll send a secure password-reset link."

  return <main className="min-h-screen bg-[#f2f5f5] px-4 py-8 text-[#172b3a] sm:px-6 lg:py-12"><div className="mx-auto max-w-5xl">
    <div className="mb-6 flex items-center gap-2 font-serif text-lg font-bold text-[#102a43]"><GraduationCap className="size-5 text-[#147d91]"/>ScholarBridge</div>
    <div className="grid overflow-hidden rounded-[2rem] border border-[#dbe5e7] bg-white shadow-[0_30px_90px_rgba(16,42,67,.09)] lg:grid-cols-[.9fr_1.1fr]">
      <section className="bg-[#102a43] p-7 text-white sm:p-10"><div className="grid size-12 place-items-center rounded-2xl bg-white/10 text-[#8dd7de]"><GraduationCap/></div><h1 className="mt-6 font-serif text-3xl font-bold">Private, age-appropriate admissions preparation.</h1><p className="mt-4 text-sm leading-6 text-white/70">Your interviews, test attempts, strengths, weaknesses and study plan stay linked to your own login. Optional services remain separate from essential account functions.</p><div className="mt-7 space-y-3 text-sm text-white/80"><p className="flex gap-2"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[#8dd7de]"/>High-privacy defaults for younger users</p><p className="flex gap-2"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[#8dd7de]"/>Self-service data export and account deletion</p><p className="flex gap-2"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[#8dd7de]"/>Human safeguarding reporting route</p></div></section>
      <section className="p-6 sm:p-10"><Card className="border-0 shadow-none"><CardHeader className="px-0 pt-0"><CardTitle className="font-serif text-3xl">{heading}</CardTitle><CardDescription>{description}</CardDescription></CardHeader><CardContent className="px-0"><form onSubmit={submit} className="space-y-4">
        {mode==="signup"&&<><label className="block space-y-1.5"><span className="text-sm font-semibold">Name</span><div className="relative"><UserPlus className="absolute left-3 top-3 size-4 text-[#7b8d96]"/><Input className="pl-9" value={displayName} onChange={e=>setDisplayName(e.target.value)} placeholder="Your name" autoComplete="name"/></div></label><label className="block space-y-1.5"><span className="text-sm font-semibold">Age band</span><select value={ageBand} onChange={e=>setAgeBand(e.target.value as AgeBand)} required className="h-10 w-full rounded-md border bg-white px-3 text-sm"><option value="">Choose an age band</option><option value="13-15">13–15</option><option value="16-17">16–17</option><option value="18+">18 or over</option></select><p className="text-xs leading-5 text-[#7b8d96]">We use a broad age band instead of your date of birth to minimise personal data. If you are under 13, do not self-register; ask a parent/guardian or your school about an appropriate managed route.</p></label></>}
        <label className="block space-y-1.5"><span className="text-sm font-semibold">Email</span><div className="relative"><Mail className="absolute left-3 top-3 size-4 text-[#7b8d96]"/><Input className="pl-9" value={email} onChange={e=>setEmail(e.target.value)} type="email" placeholder="you@example.com" autoComplete="email" required/></div></label>
        {mode!=="forgot"&&<label className="block space-y-1.5"><span className="text-sm font-semibold">Password</span><div className="relative"><LockKeyhole className="absolute left-3 top-3 size-4 text-[#7b8d96]"/><Input className="pl-9" value={password} onChange={e=>setPassword(e.target.value)} type="password" minLength={8} autoComplete={mode==="signin"?"current-password":"new-password"} required/></div>{mode==="signup"&&<p className="text-xs text-[#7b8d96]">Use at least 8 characters.</p>}</label>}
        {mode==="signup"&&<div className="space-y-3 rounded-xl bg-slate-50 p-4 text-sm"><label className="flex items-start gap-2"><input className="mt-1" type="checkbox" checked={acceptedPrivacy} onChange={e=>setAcceptedPrivacy(e.target.checked)} required/><span>I have read the <Link href="/privacy" target="_blank" className="font-semibold text-[#147d91] underline">Privacy Notice</Link>, including how AI and service providers may process my data.</span></label><label className="flex items-start gap-2"><input className="mt-1" type="checkbox" checked={acceptedTerms} onChange={e=>setAcceptedTerms(e.target.checked)} required/><span>I agree to the <Link href="/terms" target="_blank" className="font-semibold text-[#147d91] underline">Terms of Service</Link>. If I am under 18, I understand I can involve a parent, guardian, teacher or other trusted adult.</span></label><p className="text-xs leading-5 text-slate-500">Safety concern? Read <Link href="/safeguarding" target="_blank" className="font-semibold underline">Safeguarding & student safety</Link>.</p></div>}
        {error&&<div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>}{message&&<div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">{message}</div>}
        <Button className="h-11 w-full" disabled={busy}>{busy?<><Loader2 className="animate-spin"/>Please wait…</>:mode==="signin"?"Sign in":mode==="signup"?"Create account":<><KeyRound/>Send reset email</>}</Button>
      </form>
      {mode==="signin"&&<div className="mt-5 flex flex-col gap-2 text-sm"><button type="button" className="w-fit font-semibold text-[#147d91] hover:underline" onClick={()=>changeMode("signup")}>New here? Create an account</button><button type="button" className="w-fit font-semibold text-[#147d91] hover:underline" onClick={()=>changeMode("forgot")}>Forgot your password?</button><button type="button" disabled={busy} className="inline-flex w-fit items-center gap-1.5 font-semibold text-[#526a75] hover:underline disabled:opacity-50" onClick={resendConfirmation}><RefreshCw className="size-3.5"/>Resend confirmation email</button></div>}
      {mode==="signup"&&<button type="button" className="mt-5 text-sm font-semibold text-[#147d91] hover:underline" onClick={()=>changeMode("signin")}>Already have an account? Sign in</button>}{mode==="forgot"&&<button type="button" className="mt-5 text-sm font-semibold text-[#147d91] hover:underline" onClick={()=>changeMode("signin")}>Back to sign in</button>}
      </CardContent></Card></section>
    </div></div></main>
}

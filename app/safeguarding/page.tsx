"use client"

import Link from "next/link"
import { FormEvent, useState } from "react"
import { AlertTriangle, CheckCircle2, GraduationCap, Loader2, ShieldAlert, Users } from "lucide-react"
import { Button } from "@/components/ui/button"

const safeguardingEmail = process.env.NEXT_PUBLIC_SAFEGUARDING_CONTACT_EMAIL || "Safeguarding contact to be configured before launch"
const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || process.env.NEXT_PUBLIC_PRIVACY_CONTACT_EMAIL || "Support contact to be configured before launch"

export default function SafeguardingPage() {
  const [category,setCategory]=useState("safety")
  const [details,setDetails]=useState("")
  const [contactRequested,setContactRequested]=useState(false)
  const [busy,setBusy]=useState(false)
  const [message,setMessage]=useState("")
  const [error,setError]=useState("")

  async function submit(event:FormEvent){
    event.preventDefault();setBusy(true);setMessage("");setError("")
    try{
      const response=await fetch("/api/safeguarding/report",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({category,details,contactRequested})})
      const body=await response.json() as {message?:string;error?:string}
      if(!response.ok) throw new Error(body.error||"Could not submit the concern.")
      setMessage(body.message||"Your concern has been recorded for human review.");setDetails("");setContactRequested(false)
    }catch(err){setError(err instanceof Error?err.message:"Could not submit the concern.")}
    finally{setBusy(false)}
  }

  return <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900 sm:px-6">
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center gap-2 text-sm font-semibold text-teal-800"><GraduationCap className="size-5"/>ScholarBridge</div>
      <section className="rounded-3xl bg-[#102a43] p-7 text-white sm:p-9"><p className="text-xs font-bold uppercase tracking-[.18em] text-cyan-200">Safeguarding & student safety</p><h1 className="mt-3 font-serif text-4xl font-bold">You can report something that feels unsafe or inappropriate.</h1><p className="mt-4 max-w-3xl leading-7 text-slate-200">ScholarBridge is an educational service. Safety reports are intended for human review; AI feedback is not used to decide whether a safeguarding concern is genuine.</p></section>

      <div className="grid gap-4 md:grid-cols-2">
        <Info icon={<ShieldAlert/>} title="If something on ScholarBridge concerns you">Stop using the feature if you want to. Tell a trusted adult such as a parent, carer, teacher or safeguarding lead, and use the report form below. You do not need to provide unnecessary private details.</Info>
        <Info icon={<Users/>} title="If this involves your school">Follow your school's safeguarding process as well. A School-plan administrator should not replace the school's designated safeguarding procedures.</Info>
      </div>

      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-950"><div className="flex gap-3"><AlertTriangle className="mt-0.5 size-5 shrink-0"/><div><strong>ScholarBridge is not an emergency service.</strong><p className="mt-1">If someone is in immediate danger, contact the appropriate emergency service or a trusted adult who can act now. Do not wait for a ScholarBridge report to be reviewed.</p></div></div></section>

      <section className="rounded-2xl border bg-white p-6"><h2 className="font-serif text-2xl font-bold">Report a concern</h2><p className="mt-2 text-sm leading-6 text-slate-600">This form is for signed-in users and records the concern in a restricted safeguarding queue. Keep the description brief and factual. Do not include passwords, payment-card details, or sensitive information that is not needed to understand the concern.</p>
        <form onSubmit={submit} className="mt-5 space-y-4">
          <label className="block"><span className="mb-1 block text-sm font-semibold">What is the concern about?</span><select className="h-11 w-full rounded-xl border bg-white px-3" value={category} onChange={e=>setCategory(e.target.value)}><option value="safety">Safety</option><option value="bullying">Bullying or harassment</option><option value="inappropriate-content">Inappropriate content or AI response</option><option value="privacy">Privacy or personal data</option><option value="school-concern">School-account concern</option><option value="other">Other</option></select></label>
          <label className="block"><span className="mb-1 block text-sm font-semibold">Briefly explain what happened</span><textarea required minLength={10} maxLength={3000} rows={7} value={details} onChange={e=>setDetails(e.target.value)} className="w-full rounded-xl border p-3 text-sm leading-6" placeholder="Describe what happened and where in ScholarBridge. Avoid unnecessary sensitive details."/><span className="mt-1 block text-xs text-slate-500">{details.length}/3000 characters</span></label>
          <label className="flex items-start gap-2 rounded-xl bg-slate-50 p-3 text-sm"><input type="checkbox" checked={contactRequested} onChange={e=>setContactRequested(e.target.checked)} className="mt-1"/><span>I would like the safeguarding/contact team to follow up with me using the email on my account.</span></label>
          {error&&<div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error} If the form is unavailable, contact {safeguardingEmail}.</div>}
          {message&&<div className="flex gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900"><CheckCircle2 className="mt-0.5 size-4 shrink-0"/>{message}</div>}
          <Button disabled={busy||details.trim().length<10}>{busy?<><Loader2 className="animate-spin"/>Sending…</>:"Submit for human review"}</Button>
        </form>
      </section>

      <section className="rounded-2xl border bg-white p-6"><h2 className="font-serif text-2xl font-bold">Other ways to contact us</h2><div className="mt-3 space-y-2 text-sm leading-6 text-slate-600"><p><strong>Safeguarding:</strong> {safeguardingEmail}</p><p><strong>General support:</strong> {supportEmail}</p><p>For personal-data rights, use the <Link href="/privacy-centre" className="font-semibold text-teal-800 underline">Privacy Centre</Link>.</p></div></section>
      <div className="flex flex-wrap gap-4 text-sm font-semibold"><Link href="/terms" className="text-teal-800 underline">Terms</Link><Link href="/privacy" className="text-teal-800 underline">Privacy Notice</Link><Link href="/student-home" className="text-teal-800 underline">Student Home</Link></div>
    </div>
  </main>
}

function Info({icon,title,children}:{icon:React.ReactNode;title:string;children:React.ReactNode}){return <section className="rounded-2xl border bg-white p-5"><div className="flex gap-3"><span className="mt-0.5 text-teal-700">{icon}</span><div><h2 className="font-serif text-xl font-bold">{title}</h2><p className="mt-2 text-sm leading-6 text-slate-600">{children}</p></div></div></section>}

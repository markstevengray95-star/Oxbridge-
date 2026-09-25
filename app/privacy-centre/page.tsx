"use client"

import Link from "next/link"
import { FormEvent, useState } from "react"
import { AlertTriangle, CheckCircle2, Download, GraduationCap, Loader2, ShieldCheck, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"

const privacyEmail=process.env.NEXT_PUBLIC_PRIVACY_CONTACT_EMAIL||"Privacy contact to be configured before launch"

export default function PrivacyCentrePage(){
  const [requestType,setRequestType]=useState("correction")
  const [details,setDetails]=useState("")
  const [rightsBusy,setRightsBusy]=useState(false)
  const [rightsMessage,setRightsMessage]=useState("")
  const [rightsError,setRightsError]=useState("")
  const [deleteText,setDeleteText]=useState("")
  const [deleteBusy,setDeleteBusy]=useState(false)
  const [deleteError,setDeleteError]=useState("")

  async function downloadData(){
    setRightsError("")
    const response=await fetch("/api/privacy/export",{cache:"no-store"})
    if(!response.ok){const body=await response.json().catch(()=>({})) as {error?:string};setRightsError(body.error||"Could not prepare your data export.");return}
    const cloud=await response.json() as Record<string,unknown>
    const local:Record<string,unknown>={}
    for(let i=0;i<localStorage.length;i++){
      const key=localStorage.key(i);if(!key||(!key.startsWith("oxbridge-")&&!key.startsWith("scholarbridge_")))continue
      const raw=localStorage.getItem(key);if(raw===null)continue
      try{local[key]=JSON.parse(raw)}catch{local[key]=raw}
    }
    const exportData={...cloud,device_local_storage:local}
    const url=URL.createObjectURL(new Blob([JSON.stringify(exportData,null,2)],{type:"application/json"}))
    const a=document.createElement("a");a.href=url;a.download=`scholarbridge-data-${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)
  }

  async function submitRights(event:FormEvent){
    event.preventDefault();setRightsBusy(true);setRightsMessage("");setRightsError("")
    try{const response=await fetch("/api/privacy/request",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({requestType,details})});const body=await response.json() as {message?:string;error?:string};if(!response.ok)throw new Error(body.error||"Could not submit the request.");setRightsMessage(body.message||"Request recorded.");setDetails("")}
    catch(error){setRightsError(error instanceof Error?error.message:"Could not submit the request.")}
    finally{setRightsBusy(false)}
  }

  async function deleteAccount(){
    if(deleteText!=="DELETE MY ACCOUNT")return
    setDeleteBusy(true);setDeleteError("")
    try{const response=await fetch("/api/privacy/delete-account",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({confirmation:deleteText})});const body=await response.json() as {message?:string;error?:string;billingActionRequired?:boolean};if(!response.ok)throw new Error(body.error||"Could not delete the account.");localStorage.clear();sessionStorage.clear();window.location.assign(`/login?message=${encodeURIComponent(body.message||"Account deleted.")}`)}
    catch(error){setDeleteError(error instanceof Error?error.message:"Could not delete the account.")}
    finally{setDeleteBusy(false)}
  }

  return <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900 sm:px-6"><div className="mx-auto max-w-4xl space-y-6">
    <div className="flex items-center gap-2 text-sm font-semibold text-teal-800"><GraduationCap className="size-5"/>ScholarBridge</div>
    <section className="rounded-3xl bg-[#102a43] p-7 text-white sm:p-9"><p className="text-xs font-bold uppercase tracking-[.18em] text-cyan-200">Privacy Centre</p><h1 className="mt-3 font-serif text-4xl font-bold">Your data, your controls.</h1><p className="mt-4 max-w-3xl leading-7 text-slate-200">Download your ScholarBridge data, request a correction or restriction, change optional privacy choices, or delete your account. These controls are designed to be usable by students without needing to find a hidden support form.</p></section>

    <section className="grid gap-4 md:grid-cols-2">
      <Card title="Download my data" icon={<Download/>}><p>Creates a JSON copy of accessible ScholarBridge cloud data and this device's ScholarBridge local storage. It does not contain full card details because Stripe holds those separately.</p><Button className="mt-4" onClick={()=>void downloadData()}><Download/>Download data</Button></Card>
      <Card title="Privacy choices" icon={<ShieldCheck/>}><p>Optional services stay separate from essential sign-in, security and plan storage. Use the privacy button at the bottom-right of any page to switch between Essential only and Allow optional.</p><div className="mt-4 flex gap-3 text-sm font-semibold"><Link href="/cookies" className="text-teal-800 underline">Cookie Notice</Link><Link href="/privacy" className="text-teal-800 underline">Privacy Notice</Link></div></Card>
    </section>

    <section className="rounded-2xl border bg-white p-6"><h2 className="font-serif text-2xl font-bold">Ask us to act on your data</h2><p className="mt-2 text-sm leading-6 text-slate-600">Use this for correction, restriction, objection, portability or another privacy request that cannot be completed automatically. Do not include passwords or payment details.</p><form onSubmit={submitRights} className="mt-5 space-y-4"><label className="block"><span className="mb-1 block text-sm font-semibold">Request</span><select className="h-11 w-full rounded-xl border bg-white px-3" value={requestType} onChange={e=>setRequestType(e.target.value)}><option value="correction">Correct my information</option><option value="restriction">Restrict processing</option><option value="objection">Object to processing</option><option value="portability">Data portability</option><option value="access">Access question</option><option value="erasure">Erasure question</option><option value="other">Other privacy request</option></select></label><label className="block"><span className="mb-1 block text-sm font-semibold">Details</span><textarea rows={5} maxLength={3000} className="w-full rounded-xl border p-3 text-sm" value={details} onChange={e=>setDetails(e.target.value)} placeholder="Tell us what you want changed or reviewed."/></label>{rightsError&&<div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{rightsError} You can also contact {privacyEmail}.</div>}{rightsMessage&&<div className="flex gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900"><CheckCircle2 className="mt-0.5 size-4"/>{rightsMessage}</div>}<Button disabled={rightsBusy}>{rightsBusy?<><Loader2 className="animate-spin"/>Sending…</>:"Submit privacy request"}</Button></form></section>

    <section className="rounded-2xl border border-red-200 bg-white p-6"><div className="flex gap-3"><Trash2 className="mt-1 size-5 text-red-700"/><div className="flex-1"><h2 className="font-serif text-2xl font-bold">Delete my account</h2><p className="mt-2 text-sm leading-6 text-slate-600">This permanently removes your ScholarBridge login and user-linked cloud data. If you have an active paid subscription that is still set to renew, ScholarBridge will make you cancel it first so deleting the login cannot leave a live recurring charge. Some payment or legal records may remain with processors where retention is required by law.</p><div className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-900"><AlertTriangle className="mr-2 inline size-4"/>Type <strong>DELETE MY ACCOUNT</strong> to confirm.</div><input value={deleteText} onChange={e=>setDeleteText(e.target.value)} className="mt-3 h-11 w-full rounded-xl border px-3" aria-label="Deletion confirmation"/>{deleteError&&<div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{deleteError}</div>}<Button variant="destructive" className="mt-3" onClick={()=>void deleteAccount()} disabled={deleteBusy||deleteText!=="DELETE MY ACCOUNT"}>{deleteBusy?<><Loader2 className="animate-spin"/>Deleting…</>:<><Trash2/>Permanently delete account</>}</Button></div></div></section>

    <p className="text-xs leading-5 text-slate-500">For questions about identity verification, school-controlled information or requests that cannot be completed here, contact {privacyEmail}. Read the <Link href="/privacy" className="font-semibold underline">full Privacy Notice</Link>.</p>
  </div></main>
}

function Card({title,icon,children}:{title:string;icon:React.ReactNode;children:React.ReactNode}){return <section className="rounded-2xl border bg-white p-5"><div className="flex items-center gap-2 text-teal-700">{icon}<h2 className="font-serif text-xl font-bold text-slate-900">{title}</h2></div><div className="mt-3 text-sm leading-6 text-slate-600">{children}</div></section>}

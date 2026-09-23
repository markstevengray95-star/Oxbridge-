"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { ArrowLeft, CheckCircle2, Eye, Plus, Trash2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

type Settings={largeText:boolean;highContrast:boolean;reducedMotion:boolean;readingSupport:boolean}
type Profile={id:string;name:string;settings:Settings}
const ACCESS="oxbridge-tutor-accessibility-v1"
const PROFILES="oxbridge-accessibility-profiles-v1"
const defaults:Settings={largeText:false,highContrast:false,reducedMotion:false,readingSupport:false}

export default function AccessibilityProfilesPage(){
  const [settings,setSettings]=useState<Settings>(defaults)
  const [profiles,setProfiles]=useState<Profile[]>([])
  const [name,setName]=useState("")
  const [message,setMessage]=useState("")
  useEffect(()=>{try{const a=localStorage.getItem(ACCESS),p=localStorage.getItem(PROFILES);if(a)setSettings({...defaults,...JSON.parse(a)});if(p)setProfiles(JSON.parse(p))}catch{}},[])
  const apply=(next:Settings,label?:string)=>{setSettings(next);localStorage.setItem(ACCESS,JSON.stringify(next));setMessage(label?`${label} applied. Reload or return to the studio to see all interface changes.`:"Accessibility settings updated.")}
  const toggle=(key:keyof Settings)=>apply({...settings,[key]:!settings[key]})
  const save=()=>{if(!name.trim())return;const profile={id:`a11y-${Date.now()}`,name:name.trim(),settings};const next=[profile,...profiles].slice(0,10);setProfiles(next);localStorage.setItem(PROFILES,JSON.stringify(next));setName("");setMessage("Accessibility profile saved.")}
  const remove=(id:string)=>{const next=profiles.filter(p=>p.id!==id);setProfiles(next);localStorage.setItem(PROFILES,JSON.stringify(next))}

  const presets:Profile[]=[
    {id:"reading",name:"Reading support",settings:{largeText:true,highContrast:false,reducedMotion:true,readingSupport:true}},
    {id:"contrast",name:"High clarity",settings:{largeText:true,highContrast:true,reducedMotion:true,readingSupport:false}},
    {id:"minimal",name:"Reduced distraction",settings:{largeText:false,highContrast:false,reducedMotion:true,readingSupport:false}},
  ]

  return <main className="min-h-screen bg-[#f6f8f8] text-[#172b3a]">
    <header className="border-b bg-white"><div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6"><Button asChild variant="ghost"><Link href="/student-home"><ArrowLeft/>Student Home</Link></Button><Badge variant="outline"><Eye className="size-3.5"/>Accessibility profiles</Badge></div></header>
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <section className="mb-6"><p className="text-xs font-bold uppercase tracking-[.18em] text-[#147d91]">Saved learning preferences</p><h1 className="mt-2 font-serif text-4xl font-bold">Switch the whole interface setup at once.</h1><p className="mt-2 max-w-3xl text-slate-600">Profiles control learning-mode presentation. Formal timed assessments should still follow the adjustments actually approved for that assessment.</p></section>

      <section className="grid gap-5 lg:grid-cols-[1fr_1fr]"><Card className="shadow-none"><CardHeader><CardTitle className="font-serif text-2xl">Current settings</CardTitle><CardDescription>These use the same accessibility key already read by the main preparation studio.</CardDescription></CardHeader><CardContent className="space-y-2"><Toggle label="Larger text" checked={settings.largeText} onClick={()=>toggle("largeText")}/><Toggle label="High contrast" checked={settings.highContrast} onClick={()=>toggle("highContrast")}/><Toggle label="Reduced motion" checked={settings.reducedMotion} onClick={()=>toggle("reducedMotion")}/><Toggle label="Reading support / read aloud" checked={settings.readingSupport} onClick={()=>toggle("readingSupport")}/><div className="mt-4 flex gap-2"><input value={name} onChange={e=>setName(e.target.value)} className="min-w-0 flex-1 rounded-xl border px-3 py-2" placeholder="Profile name"/><Button onClick={save} disabled={!name.trim()}><Plus/>Save profile</Button></div></CardContent></Card>

      <aside className="space-y-4"><Card className="shadow-none"><CardHeader><CardTitle className="font-serif text-xl">Quick presets</CardTitle></CardHeader><CardContent className="space-y-2">{presets.map(p=><button key={p.id} onClick={()=>apply(p.settings,p.name)} className="flex w-full items-center justify-between rounded-xl border bg-white p-3 text-left hover:border-[#147d91]"><span><strong className="block text-sm">{p.name}</strong><small className="text-slate-500">{Object.entries(p.settings).filter(([,v])=>v).map(([k])=>k.replace(/([A-Z])/g," $1").toLowerCase()).join(" · ")||"standard"}</small></span><CheckCircle2 className="size-4 text-[#147d91]"/></button>)}</CardContent></Card><Card className="shadow-none"><CardHeader><CardTitle className="font-serif text-xl">My saved profiles</CardTitle></CardHeader><CardContent className="space-y-2">{profiles.length?profiles.map(p=><div key={p.id} className="flex items-center gap-2 rounded-xl border p-2"><button className="min-w-0 flex-1 p-1 text-left" onClick={()=>apply(p.settings,p.name)}><strong className="block truncate text-sm">{p.name}</strong><small className="text-slate-500">Apply saved settings</small></button><Button size="sm" variant="ghost" onClick={()=>remove(p.id)}><Trash2/></Button></div>):<p className="text-sm text-slate-500">No custom profiles saved yet.</p>}</CardContent></Card></aside></section>
      {message&&<p className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}
    </div>
  </main>
}

function Toggle({label,checked,onClick}:{label:string;checked:boolean;onClick:()=>void}){return <button onClick={onClick} className={`flex w-full items-center justify-between rounded-xl border p-3 text-left ${checked?"border-[#147d91] bg-[#edf7f8]":"bg-white"}`}><span className="font-semibold">{label}</span><span className={`grid size-6 place-items-center rounded-full border ${checked?"border-[#147d91] bg-[#147d91] text-white":"border-slate-300"}`}>{checked&&<CheckCircle2 className="size-4"/>}</span></button>}

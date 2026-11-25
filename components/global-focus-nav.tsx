"use client"

import Link from "next/link"
import {usePathname} from "next/navigation"
import {useEffect,useRef,useState} from "react"
import {Home,Brain,MessageSquareText,ClipboardCheck,BookOpen,BarChart3,GraduationCap,Menu,Search,Settings,Smartphone,X} from "lucide-react"
import {routeArea,studentAreas,searchTools,visibleTools,type Area} from "@/lib/navigation-directory"
import {useNavigationAccess} from "@/components/navigation-access-provider"

const icons={home:Home,tutor:Brain,interviews:MessageSquareText,tests:ClipboardCheck,application:BookOpen,progress:BarChart3}
const groups:Area[]=["home","tutor","interviews","tests","application","progress","school","admin","account"]
const labels:Record<Area,string>={home:"Home",tutor:"My Tutor",interviews:"Interviews",tests:"Admissions Tests",application:"My Application",progress:"My Progress",school:"School workspace",admin:"Administration",account:"Account and settings"}
const short={home:"Home",tutor:"Tutor",interviews:"Interviews",tests:"Tests",application:"Application",progress:"Progress"}
const compactKey="scholarbridge-mobile-mode"

export function GlobalFocusNav(){
 const pathname=usePathname()
 const access=useNavigationAccess()
 const active=routeArea(pathname)
 const [phone,setPhone]=useState(false)
 const [forced,setForced]=useState(false)
 const [query,setQuery]=useState("")
 const [showTools,setShowTools]=useState(false)
 const dialog=useRef<HTMLDialogElement>(null)
 const search=useRef<HTMLInputElement>(null)
 const trigger=useRef<HTMLElement|null>(null)
 const mobileMode=phone||forced
 const available=visibleTools(access)
 const matches=searchTools(access,query)
 const close=()=>dialog.current?.close()
 const open=()=>{
  if(!dialog.current||dialog.current.open)return
  trigger.current=document.activeElement instanceof HTMLElement?document.activeElement:null
  setQuery("");setShowTools(false)
  dialog.current.showModal()
  search.current?.focus()
 }
 useEffect(()=>{
  const media=window.matchMedia("(max-width: 767px)")
  const sync=()=>setPhone(media.matches)
  sync();media.addEventListener("change",sync)
  try{setForced(localStorage.getItem(compactKey)==="compact")}catch{}
  return()=>media.removeEventListener("change",sync)
 },[])
 useEffect(()=>{
  document.documentElement.dataset.mobileUi=mobileMode?"true":"false"
  return()=>{delete document.documentElement.dataset.mobileUi}
 },[mobileMode])
 useEffect(()=>{dialog.current?.close()},[pathname,access.signedIn])
 useEffect(()=>{
  const handler=(e:KeyboardEvent)=>{
   if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="k"&&access.signedIn){
    e.preventDefault()
    if(dialog.current?.open)close();else open()
   }
  }
  window.addEventListener("keydown",handler);return()=>window.removeEventListener("keydown",handler)
 },[access.signedIn])
 const toggleCompact=()=>{
  const value=!forced;setForced(value)
  try{localStorage.setItem(compactKey,value?"compact":"auto")}catch{}
 }
 const navClass=(selected:boolean)=>"rounded-lg font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#147d91] "+(selected?"bg-[#102a43] text-white":"text-slate-600 hover:bg-slate-100 hover:text-[#102a43]")
 if(!access.signedIn)return null
 const compactAreas=studentAreas.filter(a=>["home","tutor","interviews","tests"].includes(a.id))
 return <>
  <nav aria-label="Primary navigation" className="sticky top-0 z-[80] border-b border-slate-200 bg-white/95 backdrop-blur">
   <div className="mx-auto flex min-h-14 max-w-7xl items-center gap-2 px-3 sm:px-5">
    <Link href="/student-home" aria-label="FELLOW home" className="flex shrink-0 items-center gap-2 rounded-lg px-1 py-2 text-[#102a43]"><GraduationCap className="size-5 text-[#147d91]" aria-hidden="true"/><span className="font-serif text-lg font-bold tracking-wide">FELLOW</span></Link>
    {!mobileMode&&<div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto py-1">{studentAreas.map(a=><Link key={a.id} href={a.href} aria-current={active===a.id?"location":undefined} className={navClass(active===a.id)+" whitespace-nowrap px-2.5 py-2 text-xs lg:px-3 lg:text-sm"}>{a.label}</Link>)}</div>}
    {mobileMode&&<span className="min-w-0 flex-1 truncate text-sm text-slate-600">{active?labels[active]:"Preparation"}</span>}
    <button type="button" onClick={open} aria-label="Search tools and open account menu" aria-haspopup="dialog" className="grid size-10 shrink-0 place-items-center rounded-lg border text-[#102a43] hover:bg-slate-50 focus-visible:outline focus-visible:outline-2"><Search className="size-5" aria-hidden="true"/></button>
    {!mobileMode&&<button type="button" onClick={open} aria-label="Account and settings" aria-haspopup="dialog" className="grid size-10 shrink-0 place-items-center rounded-lg hover:bg-slate-100 text-[#102a43]"><Settings className="size-5" aria-hidden="true"/></button>}
   </div>
  </nav>
  {mobileMode&&<nav aria-label="Quick mobile navigation" className="mobile-bottom-nav fixed inset-x-0 bottom-0 z-[90] border-t bg-white/95 px-2 pb-[max(.35rem,env(safe-area-inset-bottom))] pt-1 backdrop-blur">
   <div className="mx-auto grid max-w-md grid-cols-5 gap-1">{compactAreas.map(a=>{const Icon=icons[a.id];return <Link key={a.id} href={a.href} aria-current={active===a.id?"location":undefined} className={navClass(active===a.id)+" flex min-h-12 flex-col items-center justify-center gap-1 text-[11px]"}><Icon className="size-5" aria-hidden="true"/>{short[a.id]}</Link>})}
   <button type="button" onClick={open} aria-label="More navigation options" aria-haspopup="dialog" className={navClass(active==="application"||active==="progress"||active==="school"||active==="admin"||active==="account")+" flex min-h-12 flex-col items-center justify-center gap-1 text-[11px]"}><Menu className="size-5" aria-hidden="true"/>More</button></div>
  </nav>}
  <dialog ref={dialog} aria-labelledby="navigation-title" onClose={()=>{trigger.current?.focus();trigger.current=null}} onClick={e=>{if(e.target===dialog.current)close()}} className="fixed inset-0 m-auto max-h-[85dvh] w-[min(94vw,42rem)] overflow-y-auto rounded-2xl border bg-white p-0 text-[#102a43] shadow-2xl backdrop:bg-slate-950/45">
   <div className="sticky top-0 z-10 border-b bg-white p-4">
    <div className="flex items-center justify-between gap-3"><h2 id="navigation-title" className="font-serif text-xl font-bold">Find your next activity</h2><button type="button" aria-label="Close navigation" onClick={close} className="grid size-10 place-items-center rounded-lg bg-slate-100"><X className="size-5" aria-hidden="true"/></button></div>
    <label className="mt-3 flex items-center gap-2 rounded-lg border px-3"><Search className="size-4 text-slate-500" aria-hidden="true"/><input ref={search} aria-label="Find a tool" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Find a tool…" className="h-11 min-w-0 flex-1 bg-transparent outline-none"/></label>
   </div>
   <div className="space-y-4 p-4">
    {!query.trim()&&<>
     <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{studentAreas.map(a=>{const Icon=icons[a.id];return <Link key={a.id} onClick={close} href={a.href} className="flex items-center gap-2 rounded-xl border p-3 text-sm font-semibold hover:bg-slate-50"><Icon className="size-4 shrink-0 text-[#147d91]" aria-hidden="true"/>{a.label}</Link>})}</div>
     {(access.staff||access.owner||access.admin)&&<section><h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">Staff workspaces</h3><div className="space-y-1">{available.filter(t=>t.featured&&(t.area==="school"||t.area==="admin")).map(t=><Link key={t.href} href={t.href} onClick={close} className="block rounded-lg border px-3 py-2 text-sm font-semibold hover:bg-slate-50">{t.label}</Link>)}</div></section>}
     <section><h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">Account and settings</h3><div className="grid grid-cols-2 gap-2">{available.filter(t=>t.area==="account").map(t=><Link key={t.href} href={t.href} onClick={close} className="rounded-lg border p-2 text-sm hover:bg-slate-50">{t.label}</Link>)}</div></section>
     <button type="button" onClick={()=>setShowTools(v=>!v)} aria-expanded={showTools} className="w-full rounded-lg border px-3 py-2 text-left text-sm font-semibold">{showTools?"Hide all tools":"Browse all tools"}</button>
    </>}
    {(query.trim()||showTools)&&<div>{groups.map(g=>{
     const items=matches.filter(t=>t.area===g)
     if(!items.length)return null
     return <section key={g} className="mb-4"><h3 className="mb-1 text-xs font-bold uppercase tracking-wider text-[#147d91]">{labels[g]}</h3>{items.map(t=><Link key={t.href} href={t.href} onClick={close} className="block rounded-lg border-b p-2 hover:bg-slate-50"><span className="block text-sm font-semibold">{t.label}</span><span className="text-xs text-slate-500">{t.description}</span></Link>)}</section>
    })}{!matches.length&&<p role="status" className="text-sm text-slate-600">No matching tools. Try a topic, test or activity.</p>}</div>}
    <button type="button" onClick={toggleCompact} aria-pressed={forced} className="flex w-full items-center gap-2 rounded-lg border p-3 text-sm text-slate-600"><Smartphone className="size-4" aria-hidden="true"/>{forced?"Use automatic navigation layout":"Use compact navigation on larger screens"}</button>
   </div>
  </dialog>
 </>
}

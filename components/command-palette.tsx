"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Search, X } from "lucide-react"

const destinations = [
  { label:"Student Home", href:"/student-home", keywords:"home next progress dashboard" },
  { label:"Preparation Studio", href:"/", keywords:"studio tutor application plan teacher progress" },
  { label:"Interview Hub", href:"/interviews", keywords:"interview formal ai live voice panel" },
  { label:"Formal Interview Room", href:"/interview-room", keywords:"formal interview realistic academic" },
  { label:"AI Interview", href:"/ai-interview", keywords:"ai adaptive interview follow up" },
  { label:"Live Voice Interview", href:"/live-interview", keywords:"voice realtime interview microphone" },
  { label:"Panel Interview", href:"/panel-interview", keywords:"two interviewer panel" },
  { label:"Cambridge Interview Day", href:"/cambridge-interview-day", keywords:"cambridge college interview day december" },
  { label:"Cambridge Assessment Centre", href:"/cambridge-assessments", keywords:"cambridge college assessment architecture linguistics mml" },
  { label:"Deep Course Bank", href:"/course-bank", keywords:"course physics law medicine maths engineering questions" },
  { label:"Unseen Material Lab", href:"/unseen-lab", keywords:"unseen graph data source interview stimulus" },
  { label:"Working Analysis", href:"/working-analysis", keywords:"handwritten photo image equations reasoning" },
  { label:"Advanced Practice", href:"/advanced-practice", keywords:"test admissions challenge ladder questions" },
  { label:"Adaptive Paper", href:"/adaptive-paper", keywords:"paper weak areas unseen tmua esat tara lnat ucat" },
  { label:"Timing Trainer", href:"/timing-trainer", keywords:"time flag skip move on test decision" },
  { label:"Essay Tutor", href:"/essay-tutor", keywords:"lnat tara essay writing argument" },
  { label:"Question Quality", href:"/question-quality", keywords:"validate question bank duplicate options quality" },
  { label:"Reasoning Lab", href:"/reasoning-lab", keywords:"rewind argument map fingerprint misconception" },
  { label:"Targeted Intervention", href:"/intervention-session", keywords:"weakness intervention mistake remediation" },
  { label:"Requirements & Audit", href:"/requirements", keywords:"course requirement test written work college assessment" },
  { label:"Timeline Autopilot", href:"/timeline", keywords:"deadline calendar ucas application" },
  { label:"Official Source Watcher", href:"/source-health", keywords:"official source freshness oxford cambridge test provider" },
  { label:"Personal Statement Defence", href:"/personal-statement-map", keywords:"personal statement defence claims reading motivation" },
  { label:"Written Work Vault", href:"/written-work-vault", keywords:"essay submitted work defence claims" },
  { label:"Reading Room", href:"/reading-room", keywords:"unseen extract annotate tutorial" },
  { label:"Knowledge Graph", href:"/knowledge-graph", keywords:"supercurricular books lectures concepts" },
  { label:"Research Project", href:"/research-project", keywords:"research thesis evidence counterargument defence" },
  { label:"Mock Week", href:"/mock-week", keywords:"no feedback interview week" },
  { label:"Technology Rehearsal", href:"/technology-rehearsal", keywords:"camera microphone interview tech" },
  { label:"Learning Support", href:"/learning-support", keywords:"eal mandarin bilingual glossary sentence frames" },
  { label:"Teacher Coach", href:"/teacher-coach", keywords:"teacher meeting tutor comments interview packs mentor" },
  { label:"Backup Centre", href:"/backup-center", keywords:"backup export import move device encrypted" },
  { label:"Accessibility Profiles", href:"/accessibility-profiles", keywords:"large text contrast reading reduced motion" },
]

export function CommandPalette(){
  const [open,setOpen]=useState(false)
  const [query,setQuery]=useState("")
  const [active,setActive]=useState(0)
  const router=useRouter()
  const inputRef=useRef<HTMLInputElement>(null)
  const results=useMemo(()=>{const q=query.trim().toLowerCase();return q?destinations.filter(item=>`${item.label} ${item.keywords}`.toLowerCase().includes(q)).slice(0,12):destinations.slice(0,12)},[query])
  const go=(href:string)=>{setOpen(false);setQuery("");router.push(href)}
  useEffect(()=>{const handler=(e:KeyboardEvent)=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="k"){e.preventDefault();setOpen(v=>!v)}if(e.key==="Escape")setOpen(false)};window.addEventListener("keydown",handler);return()=>window.removeEventListener("keydown",handler)},[])
  useEffect(()=>{if(open){setActive(0);window.setTimeout(()=>inputRef.current?.focus(),0)}},[open])
  useEffect(()=>{if(active>=results.length)setActive(0)},[results.length,active])
  if(!open)return <button onClick={()=>setOpen(true)} aria-label="Open command palette" title="Search tools (Ctrl/Cmd+K)" className="fixed bottom-20 left-3 z-[60] grid size-11 place-items-center rounded-2xl border border-slate-200 bg-white/95 text-slate-600 shadow-xl backdrop-blur hover:text-[#102a43] lg:bottom-5 lg:left-5"><Search className="size-4"/></button>
  return <div className="fixed inset-0 z-[100] bg-slate-950/35 p-4 backdrop-blur-sm" onMouseDown={e=>{if(e.target===e.currentTarget)setOpen(false)}}><div className="mx-auto mt-[10vh] max-w-xl overflow-hidden rounded-2xl border bg-white shadow-2xl"><div className="flex items-center gap-3 border-b px-4"><Search className="size-5 text-slate-400"/><input ref={inputRef} value={query} onChange={e=>{setQuery(e.target.value);setActive(0)}} onKeyDown={e=>{if(e.key==="ArrowDown"){e.preventDefault();setActive(i=>Math.min(results.length-1,i+1))}if(e.key==="ArrowUp"){e.preventDefault();setActive(i=>Math.max(0,i-1))}if(e.key==="Enter"&&results[active])go(results[active].href)}} placeholder="Search Oxbridge Tutor…" className="h-14 min-w-0 flex-1 border-0 bg-transparent outline-none"/><button onClick={()=>setOpen(false)} className="grid size-9 place-items-center rounded-lg hover:bg-slate-100"><X className="size-4"/></button></div><div className="max-h-[60vh] overflow-y-auto p-2">{results.length?results.map((item,i)=><button key={item.href} onMouseEnter={()=>setActive(i)} onClick={()=>go(item.href)} className={`flex w-full items-center justify-between rounded-xl px-3 py-3 text-left ${i===active?"bg-[#edf7f8] text-[#102a43]":"text-slate-600"}`}><span><strong className="block text-sm">{item.label}</strong><small className="text-xs text-slate-400">{item.keywords}</small></span><kbd className="rounded border bg-white px-1.5 py-0.5 text-[10px] text-slate-400">↵</kbd></button>):<p className="p-6 text-center text-sm text-slate-500">No matching tool. Try a course, test or task name.</p>}</div><div className="flex justify-between border-t bg-slate-50 px-4 py-2 text-[11px] text-slate-400"><span>↑↓ navigate · Enter open</span><span>Esc close · Ctrl/Cmd+K toggle</span></div></div></div>
}

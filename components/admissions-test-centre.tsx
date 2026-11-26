"use client"
import Link from "next/link"
import {useEffect,useState} from "react"
import {ArrowRight,BarChart3,BookOpen,Clock3,FileQuestion,FileText,Flag,RefreshCw,Search,Target} from "lucide-react"
import {createClient} from "@/lib/supabase/client"
import {admissionsTests,practiceOptions,centreDestination,selectedTest,type AdmissionsTest,type PracticeMode,type RecentPaper} from "@/lib/admissions-centre"
type RecentStatus="loading"|"ready"|"error"|"signin"
const studyNotes:Record<AdmissionsTest,{label:string;description:string}>={
 TMUA:{label:"Mathematics",description:"Two timed mathematical reasoning papers in the existing mock engine."},
 ESAT:{label:"Science, engineering and mathematics",description:"Mathematics 1 and two additional selectable modules."},
 TARA:{label:"Critical thinking and problem solving",description:"Reasoning questions plus a writing exercise."},
 LNAT:{label:"Law",description:"Passage-based reasoning and an unscored practice essay."},
 UCAT:{label:"Medicine",description:"Verbal, decision-making, quantitative and situational judgement practice."},
}
export function AdmissionsTestCentre(){
 const [test,setTest]=useState<AdmissionsTest>("TMUA")
 const [mode,setMode]=useState<PracticeMode>("mock")
 const [results,setResults]=useState<RecentPaper[]>([])
 const [status,setStatus]=useState<RecentStatus>("loading")
 const [notice,setNotice]=useState("")
 const [lastChecked,setLastChecked]=useState("")
 const [refresh,setRefresh]=useState(0)
 useEffect(()=>{const current=selectedTest(window.location.search);if(current)setTest(current)},[])
 useEffect(()=>{
  const supabase=createClient()
  let currentUser:string|null=null,generation=0,closed=false,controller:AbortController|null=null
  const load=async()=>{
   if(!currentUser||closed)return
   const token=++generation
   controller?.abort();const ctrl=new AbortController();controller=ctrl
   setStatus("loading");setNotice("")
   try{
    const res=await fetch("/api/admissions-centre",{cache:"no-store",signal:ctrl.signal})
    if(!res.ok)throw Error("Results not available")
    const data=await res.json() as {results?:RecentPaper[];asOf?:string}
    if(closed||token!==generation)return
    setResults(Array.isArray(data.results)?data.results:[])
    setLastChecked(typeof data.asOf==="string"?data.asOf:"")
    setStatus("ready")
   }catch{
    if(!closed&&token===generation){setStatus("error");setResults([]);setNotice("Recent cloud results could not be loaded. Existing practice tools are still available.")}
   }
  }
  const {data}=supabase.auth.onAuthStateChange((_event,session)=>{
   const id=session?.user.id??null
   if(id!==currentUser){currentUser=id;generation++;controller?.abort();setResults([]);setLastChecked("")}
   if(id)void load();else setStatus("signin")
  })
  const focus=()=>{if(currentUser)void load()}
  window.addEventListener("focus",focus)
  return()=>{closed=true;generation++;controller?.abort();data.subscription.unsubscribe();window.removeEventListener("focus",focus)}
 },[refresh])
 const current=practiceOptions.find(p=>p.id===mode)!
 const destination=centreDestination(mode,test)
 return <main className="fellow-ui min-h-screen"><div className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6">
  <header className="fellow-page-header"><Link href="/student-home" className="text-sm font-semibold text-[#326d71]">Home /</Link><p className="fellow-eyebrow mt-3">Fellow · Admissions preparation</p><h1 className="fellow-page-title mt-2">Admissions Test Centre</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">Choose a test and the kind of practice you need. All questions are independent preparation material, not official papers. Check your course's current admissions requirements separately.</p></header>
  <section className="fellow-panel p-5 sm:p-6"><fieldset><legend className="fellow-section-title">1. Choose a test</legend><div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-5">{admissionsTests.map(name=><label key={name} className={"fellow-choice cursor-pointer p-3 text-center text-sm font-bold "+(test===name?"border-[#397c80] bg-[#e9f1ee] text-[#142d3e]":"text-slate-600 hover:bg-slate-50")}><input type="radio" name="selected-test" value={name} checked={test===name} onChange={()=>setTest(name)} className="sr-only"/>{name}</label>)}</div><p className="mt-3 text-sm font-semibold">{studyNotes[test].label}</p><p className="mt-1 text-sm text-slate-600">{studyNotes[test].description}</p></fieldset>
  <fieldset className="mt-7"><legend className="fellow-section-title">2. What would you like to do?</legend><div className="mt-4 grid gap-3 sm:grid-cols-2">{practiceOptions.map(option=><label key={option.id} className={"fellow-choice flex cursor-pointer gap-3 p-4 "+(mode===option.id?"border-[#397c80] bg-[#e9f1ee]":"bg-white hover:bg-slate-50")}><input type="radio" name="practice-type" value={option.id} checked={mode===option.id} onChange={()=>setMode(option.id)} className="mt-1 accent-[#397c80]"/><span><strong className="block">{option.title}</strong><span className="mt-1 block text-sm leading-5 text-slate-600">{option.description}</span><span className="mt-2 block text-xs font-semibold text-[#326d71]">{option.duration}</span></span></label>)}</div></fieldset>
  <div className="fellow-hero mt-6 p-5"><p className="text-xs font-bold uppercase tracking-widest text-[#8dd7de]">Ready to practise</p><h2 className="fellow-section-title mt-2">{test} · {current.title}</h2><p className="mt-2 text-sm text-white/80">{mode==="review"?"The retest opens your most recent saved "+test+" full paper, if one is available.":"Your selection will be loaded in the existing practice engine."}</p><Link href={destination} className="fellow-primary mt-4">Continue to {mode==="mock"?"paper setup":mode==="review"?"retest":"practice"} <ArrowRight className="size-4" aria-hidden="true"/></Link></div></section>
  <section className="rounded-2xl border bg-white p-5 sm:p-6"><div className="flex flex-wrap items-center justify-between gap-2"><div><h2 className="fellow-section-title">Recent test results</h2><p className="mt-1 text-sm text-slate-600">Up to five recently saved account records.</p></div><button type="button" onClick={()=>setRefresh(n=>n+1)} disabled={status==="loading"||status==="signin"} className="inline-flex min-h-10 items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold disabled:opacity-50"><RefreshCw className="size-4" aria-hidden="true"/>Refresh</button></div>
  {status==="loading"&&<p role="status" className="mt-4 text-sm text-slate-600">Loading saved results…</p>}
  {status==="signin"&&<p className="mt-4 text-sm text-slate-600">Sign in to view previous results.</p>}
  {status==="error"&&<p role="alert" className="mt-4 text-sm text-amber-800">{notice}</p>}
  {status==="ready"&&(results.length?<div className="mt-4 divide-y">{results.map(item=><div key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><p className="text-sm font-semibold">{item.title}</p><p className="text-xs text-slate-600">{item.test}{item.date?" · "+new Date(item.date).toLocaleDateString("en-GB"):""} · Saved practice</p></div><span className="text-sm font-semibold">{item.score!==null&&item.maxMarks!==null?item.score+"/"+item.maxMarks+" raw marks":"Mark breakdown unavailable"}</span></div>)}</div>:<p className="mt-4 text-sm text-slate-600">No synced paper results yet. Complete a practice paper to begin tracking your progress.</p>)}
  <div className="mt-4 flex flex-wrap gap-3"><Link href="/study/progress" className="inline-flex items-center gap-2 text-sm font-semibold text-[#326d71] underline">My Progress <ArrowRight className="size-4" aria-hidden="true"/></Link><Link href="/test-results" className="inline-flex items-center gap-2 text-sm font-semibold text-[#326d71] underline">Detailed results</Link></div>{lastChecked&&<p className="mt-3 text-xs text-slate-500">Checked {new Date(lastChecked).toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"})}. Recent device work may still be syncing.</p>}</section>
  <details className="fellow-panel p-5"><summary className="cursor-pointer font-semibold">More test tools and support</summary><div className="mt-4 grid gap-3 sm:grid-cols-2">{[{href:"/advanced-practice",title:"Advanced practice",desc:"Difficulty-focused individual questions",icon:Target},{href:"/timing-trainer",title:"Timing decisions",desc:"When to continue, flag or move on",icon:Clock3},{href:"/lnat-passage-intelligence",title:"LNAT passage practice",desc:"Reading and reasoning from passages",icon:BookOpen},{href:"/exam-intelligence",title:"Exam analysis",desc:"Patterns and topics for improvement",icon:BarChart3},{href:"/question-quality",title:"Question quality",desc:"Check quality and provenance notes",icon:FileQuestion},{href:"/test-player",title:"Alternative test simulator",desc:"Additional existing assessment modes",icon:FileText},{href:"/paper-intervention",title:"Retest and retention",desc:"Revisit the latest saved full paper",icon:Flag},{href:"/study/progress",title:"Saved feedback",desc:"Results, individual answers and next steps",icon:Search}].map(item=>{const Icon=item.icon;return <Link key={item.href} href={item.href} className="flex items-center gap-3 rounded-lg border p-3 text-sm hover:bg-slate-50"><Icon className="size-4 shrink-0 text-[#326d71]" aria-hidden="true"/><span><strong>{item.title}</strong><span className="block text-xs text-slate-600">{item.desc}</span></span></Link>})}</div></details>
 </div></main>
}

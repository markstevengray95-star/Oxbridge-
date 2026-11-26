"use client"
import Link from "next/link"
import {useEffect,useState,useRef} from "react"
import {ArrowRight,BookOpen,Brain,ClipboardCheck,MessageSquareText,BarChart3,CalendarDays,Clock3,RefreshCw} from "lucide-react"
import {createClient} from "@/lib/supabase/client"
import {nextHomeActivity,pendingAssignments,type HomeSummary} from "@/lib/student-home"

const sections=[
 {href:"/tutor",label:"My Tutor",detail:"Personal coaching and weekly plan",icon:Brain},
 {href:"/study/interviews",label:"Interviews",detail:"Practise academic discussion",icon:MessageSquareText},
 {href:"/study/tests",label:"Admissions Tests",detail:"Questions, papers and retests",icon:ClipboardCheck},
 {href:"/study/application",label:"My Application",detail:"Requirements and academic portfolio",icon:BookOpen},
 {href:"/study/progress",label:"My Progress",detail:"Saved results and feedback",icon:BarChart3},
]
const dateLabel=(date:string)=>new Date(date).toLocaleDateString("en-GB",{day:"numeric",month:"short"})
export function StudentHomeDashboard(){
 const [summary,setSummary]=useState<HomeSummary|null>(null)
 const [school,setSchool]=useState<unknown>(null)
 const [schoolStatus,setSchoolStatus]=useState<"loading"|"ready"|"unavailable">("loading")
 const [status,setStatus]=useState<"loading"|"ready"|"error"|"signed-out">("loading")
 const refreshRef=useRef<()=>void>(()=>{})
 useEffect(()=>{
  const supabase=createClient()
  let generation=0,closed=false,currentUser:string|null=null,timer:ReturnType<typeof setTimeout>|undefined,abort:AbortController|undefined
  const refresh=async()=>{
   if(!currentUser||closed)return
   const version=++generation
   abort?.abort()
   const controller=new AbortController();abort=controller
   const valid=()=>!closed&&generation===version
   const load=async(path:string)=>{
    const response=await fetch(path,{cache:"no-store",signal:controller.signal})
    if(!response.ok)throw Error(String(response.status))
    return response.json()
   }
   const [home,classroom]=await Promise.allSettled([load("/api/student-home"),load("/api/school-targeted")])
   if(!valid())return
   if(home.status==="fulfilled"){
    const data=home.value as HomeSummary
    if(data?.profile&&data?.week&&typeof data.asOf==="string"){setSummary(data);setStatus("ready")}
    else{setSummary(null);setStatus("error")}
   }else{setSummary(null);setStatus("error")}
   if(classroom.status==="fulfilled"&&Array.isArray(classroom.value?.joined)){setSchool(classroom.value);setSchoolStatus("ready")}
   else{setSchool(null);setSchoolStatus("unavailable")}
  }
  const queue=()=>{if(timer)clearTimeout(timer);timer=setTimeout(()=>void refresh(),350)}
  refreshRef.current=()=>{setStatus("loading");setSchoolStatus("loading");void refresh()}
  const {data}=supabase.auth.onAuthStateChange((_event,session)=>{
   const next=session?.user.id??null
   if(next!==currentUser){++generation;abort?.abort();if(timer)clearTimeout(timer);currentUser=next;setSummary(null);setSchool(null);setSchoolStatus("loading")}
   if(next){setStatus("loading");queue()}else setStatus("signed-out")
  })
  const events=["focus","oxbridge-cloud-state-updated","oxbridge-history-updated","oxbridge-cloud-ready","scholarbridge-progress-updated"]
  events.forEach(e=>window.addEventListener(e,queue))
  return()=>{closed=true;++generation;abort?.abort();if(timer)clearTimeout(timer);data.subscription.unsubscribe();events.forEach(e=>window.removeEventListener(e,queue));refreshRef.current=()=>{}}
 },[])
 const activity=summary?nextHomeActivity(summary,school):null
 const pending=pendingAssignments(school)
 const profile=summary?.profile
 const goals=[profile?.university==="Both"?"Oxford & Cambridge":profile?.university,profile?.course,profile?.year?profile.year+" entry":null].filter(Boolean).join(" · ")
 const counts=summary?[{label:"Interview records",value:summary.week.interviews},{label:"Test records",value:summary.week.tests},{label:"Coaching exercises",value:summary.week.coaching}]:[]
 return <main className="min-h-screen bg-[#f5f7f8] text-[#102a43]"><div className="mx-auto max-w-6xl space-y-6 px-4 py-7 sm:px-6 lg:py-10">
  <header className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[.18em] text-[#147d91]">Fellow · Your preparation</p><h1 className="mt-2 font-serif text-3xl font-bold sm:text-4xl">What will you work on today?</h1><p className="mt-2 text-sm text-slate-600">{goals||"A clear next step for your university preparation."}</p></div><button type="button" onClick={()=>refreshRef.current()} disabled={status==="loading"||status==="signed-out"} className="inline-flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm font-semibold disabled:opacity-50"><RefreshCw className="size-4" aria-hidden="true"/>Refresh</button></header>
  {status==="loading"&&<div role="status" className="rounded-2xl border bg-white p-6 text-sm text-slate-600">Loading your saved preparation…</div>}
  {status==="signed-out"&&<div className="rounded-2xl border bg-white p-6"><p>Sign in to see your personal preparation.</p><Link href="/login" className="mt-3 inline-block font-semibold underline">Sign in</Link></div>}
  {status==="error"&&<div role="alert" className="rounded-2xl border bg-white p-6"><p className="font-semibold">Your saved preparation could not be loaded.</p><p className="mt-2 text-sm text-slate-600">Refresh to try again. You can still open your preparation tools below.</p></div>}
  {status==="ready"&&summary&&activity&&<>
   <section aria-label="Recommended next activity" className="rounded-2xl bg-[#102a43] p-6 text-white sm:p-8"><p className="text-xs font-semibold uppercase tracking-widest text-[#a9e0e3]">Your next activity</p><h2 className="mt-3 max-w-3xl font-serif text-2xl font-bold sm:text-3xl">{activity.title}</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-200">{activity.detail}</p>{activity.minutes&&<p className="mt-3 flex items-center gap-2 text-sm text-slate-200"><Clock3 className="size-4" aria-hidden="true"/>About {activity.minutes} minutes</p>}<div className="mt-5 flex flex-wrap items-center gap-4"><Link href={activity.href} className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-[#102a43] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">{activity.button}<ArrowRight className="size-4" aria-hidden="true"/></Link><Link href="/preparation-pathway" className="text-sm font-semibold text-white underline underline-offset-4">Adjust my study plan</Link></div></section>
   <section className="rounded-2xl border bg-white p-5 sm:p-6"><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="flex items-center gap-2 font-serif text-xl font-bold"><CalendarDays className="size-5 text-[#147d91]" aria-hidden="true"/>Your last 7 days</h2><Link href="/study/progress" className="text-sm font-semibold text-[#147d91] underline">View progress</Link></div><div className="mt-4 grid grid-cols-3 gap-2 sm:gap-4">{counts.map(c=><div key={c.label} className="rounded-xl bg-slate-50 p-3 sm:p-4"><p className="font-serif text-2xl font-bold sm:text-3xl">{c.value??"—"}</p><p className="mt-1 text-xs leading-4 text-slate-600 sm:text-sm">{c.label}</p></div>)}</div><p className="mt-3 text-xs text-slate-500">Saved account activity only. Counts describe practice, not admissions readiness.{counts.some(c=>c.value===null)?" Some records could not be loaded.":""}</p></section>
   {schoolStatus==="ready"&&pending.length>0&&<section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-white p-4"><div><h2 className="font-semibold">School assignments</h2><p className="mt-1 text-sm text-slate-600">{pending.length} outstanding{pending.some(t=>t.overdue)?" · "+pending.filter(t=>t.overdue).length+" overdue":""}{pending[0].dueAt?" · First deadline "+dateLabel(pending[0].dueAt):""}</p></div><Link href="/school-classroom" className="text-sm font-semibold text-[#147d91] underline">Open classroom</Link></section>}
   {schoolStatus==="unavailable"&&<p className="text-xs text-slate-500">Classroom assignments could not be checked. <Link href="/school-classroom" className="underline">Open classroom</Link> if you are linked to a school.</p>}
  </>}
  <section aria-label="Preparation areas"><h2 className="font-serif text-xl font-bold">Your preparation areas</h2><div className="mt-3 divide-y rounded-2xl border bg-white">{sections.map(s=>{const Icon=s.icon;return <Link key={s.href} href={s.href} className="flex min-h-16 items-center gap-3 px-4 py-3 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#147d91]"><span className="grid size-10 shrink-0 place-items-center rounded-lg bg-[#edf7f8] text-[#147d91]"><Icon className="size-5" aria-hidden="true"/></span><span className="min-w-0 flex-1"><strong className="block text-sm sm:text-base">{s.label}</strong><span className="block text-xs text-slate-600 sm:text-sm">{s.detail}</span></span><ArrowRight className="size-4 shrink-0 text-slate-400" aria-hidden="true"/></Link>})}</div></section>
  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500"><span>{summary?"Cloud snapshot checked "+new Date(summary.asOf).toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"})+". Recent device work may still be syncing.":"Your detailed tools remain available in their sections."}</span><Link href="/account" className="font-semibold underline">Account and settings</Link></div>
 </div></main>
}

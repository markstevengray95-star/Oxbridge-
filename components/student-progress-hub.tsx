"use client"
import Link from "next/link"
import {useEffect,useMemo,useRef,useState} from "react"
import {ArrowRight,BarChart3,FileText,MessageSquareText,RefreshCw,Search,School} from "lucide-react"
import {createClient} from "@/lib/supabase/client"
import {pendingAssignments} from "@/lib/student-home"
import type {ProgressKind,ProgressRecord} from "@/lib/progress-hub"
import type {AssessmentReport} from "@/lib/assessment-intelligence"

type Overview={records:ProgressRecord[];availability:{interviews:boolean;tests:boolean;writing:boolean};totals:{interviews:number|null;tests:number|null;writing:number|null};notices:string[];asOf:string;limitNote:string}
type SchoolData={joined:Array<{cohort:{id:string;name:string};assignments:unknown[];progress:unknown[]}>}
type Status="loading"|"ready"|"error"|"signin"
type Filter="all"|ProgressKind
const filters:{id:Filter;label:string}[]=[{id:"all",label:"All records"},{id:"interview",label:"Interviews"},{id:"test",label:"Admissions tests"},{id:"writing",label:"Written work"}]
const kinds:{[K in ProgressKind]:string}={interview:"Interview",test:"Admissions test",writing:"Writing"}
const when=(d:string|null)=>d?new Date(d).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"}):"Date not recorded"
const loadJson=async(path:string,signal:AbortSignal)=>{
 const response=await fetch(path,{cache:"no-store",signal})
 if(!response.ok)throw new Error(String(response.status))
 return response.json() as Promise<unknown>
}
export function StudentProgressHub(){
 const [status,setStatus]=useState<Status>("loading")
 const [data,setData]=useState<Overview|null>(null)
 const [report,setReport]=useState<AssessmentReport|null>(null)
 const [reportUnavailable,setReportUnavailable]=useState(false)
 const [school,setSchool]=useState<SchoolData|null>(null)
 const [schoolUnavailable,setSchoolUnavailable]=useState(false)
 const [filter,setFilter]=useState<Filter>("all")
 const [query,setQuery]=useState("")
 const [selectedId,setSelectedId]=useState("")
 const refreshRef=useRef<()=>void>(()=>{})
 useEffect(()=>{
  const supabase=createClient()
  let currentUser:string|null=null,generation=0,closed=false,timer:ReturnType<typeof setTimeout>|undefined,abort:AbortController|undefined
  const refresh=async()=>{
   if(!currentUser||closed)return
   const token=++generation
   abort?.abort();const controller=new AbortController();abort=controller
   setStatus("loading")
   const all=await Promise.allSettled([loadJson("/api/progress-hub",controller.signal),loadJson("/api/assessment-report",controller.signal),loadJson("/api/school-targeted",controller.signal)])
   if(closed||generation!==token)return
   const [overview,recommendation,classroom]=all
   if(overview.status==="fulfilled"&&overview.value&&typeof overview.value==="object"&&Array.isArray((overview.value as Overview).records)){
    const next=overview.value as Overview
    setData(next);setStatus("ready");setSelectedId(id=>next.records.some(r=>r.id===id)?id:next.records[0]?.id??"")
   }else{setData(null);setStatus("error")}
   setReport(recommendation.status==="fulfilled"&&recommendation.value&&typeof recommendation.value==="object"&&"next" in recommendation.value?recommendation.value as AssessmentReport:null)
   setReportUnavailable(recommendation.status==="rejected")
   setSchool(classroom.status==="fulfilled"&&classroom.value&&typeof classroom.value==="object"&&Array.isArray((classroom.value as SchoolData).joined)?classroom.value as SchoolData:null)
   setSchoolUnavailable(classroom.status==="rejected")
  }
  const queue=()=>{if(timer)clearTimeout(timer);timer=setTimeout(()=>{void refresh()},300)}
  refreshRef.current=()=>{if(currentUser)void refresh()}
  const {data:listener}=supabase.auth.onAuthStateChange((_event,session)=>{
   const user=session?.user.id??null
   if(currentUser!==user){
    currentUser=user;++generation;abort?.abort();if(timer)clearTimeout(timer)
    setData(null);setReport(null);setSchool(null);setFilter("all");setQuery("");setSelectedId("");setReportUnavailable(false);setSchoolUnavailable(false)
   }
   if(user)queue()
   else setStatus("signin")
  })
  const events=["focus","oxbridge-cloud-state-updated","oxbridge-history-updated","scholarbridge-progress-updated"]
  events.forEach(e=>window.addEventListener(e,queue))
  return()=>{closed=true;++generation;abort?.abort();if(timer)clearTimeout(timer);listener.subscription.unsubscribe();events.forEach(e=>window.removeEventListener(e,queue));refreshRef.current=()=>{}}
 },[])
 const records=data?.records??[]
 const visible=useMemo(()=>records.filter(r=>(filter==="all"||r.kind===filter)&&(!query.trim()||[r.title,r.summary,r.kind].join(" ").toLowerCase().includes(query.trim().toLowerCase()))),[records,filter,query])
 const selected=visible.find(r=>r.id===selectedId)??visible[0]
 const tasks=pendingAssignments(school)
 const counts=[{label:"Interviews",value:data?.totals.interviews,icon:MessageSquareText},{label:"Tests",value:data?.totals.tests,icon:BarChart3},{label:"Writing records",value:data?.totals.writing,icon:FileText}]
 return <main className="min-h-screen bg-[#f5f7f8] text-[#102a43]"><div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6">
  <header className="flex flex-wrap items-start justify-between gap-3"><div><Link href="/student-home" className="text-sm font-semibold text-[#147d91]">Home /</Link><p className="mt-4 text-xs font-semibold uppercase tracking-[.18em] text-[#147d91]">Fellow · Your evidence</p><h1 className="mt-2 font-serif text-4xl font-bold">My Progress</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Find your saved interviews, test questions and written-work feedback in one place. Practice evidence is not a prediction of admissions success.</p></div><button type="button" onClick={()=>refreshRef.current()} disabled={status==="loading"||status==="signin"} className="flex min-h-11 items-center gap-2 rounded-xl border bg-white px-4 text-sm font-semibold disabled:opacity-50"><RefreshCw className="size-4" aria-hidden="true"/> Refresh</button></header>
  {status==="loading"&&<p role="status" className="rounded-xl border bg-white p-5 text-sm">Loading your saved preparation evidence…</p>}
  {status==="signin"&&<p className="rounded-xl border bg-white p-5 text-sm">Sign in to access your private progress records. <Link className="font-semibold underline" href="/login">Sign in</Link></p>}
  {status==="error"&&<p role="alert" className="rounded-xl border bg-white p-5 text-sm">Your progress records could not be loaded. Try Refresh, or open <Link href="/history" className="font-semibold underline">full activity history</Link>.</p>}
  {status==="ready"&&data&&<>
   {data.notices.length>0&&<div role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{data.notices.join(" ")}</div>}
   <section aria-label="Saved practice overview" className="grid grid-cols-3 gap-2 sm:gap-4">{counts.map(item=>{const Icon=item.icon;return <div key={item.label} className="rounded-2xl border bg-white p-3 sm:p-5"><Icon className="size-5 text-[#147d91]" aria-hidden="true"/><p className="mt-3 font-serif text-2xl font-bold sm:text-3xl">{item.value??"—"}</p><p className="mt-1 text-xs text-slate-600 sm:text-sm">{item.label}</p></div>})}</section>
   <section aria-label="Recommended next step" className="rounded-2xl bg-[#102a43] p-5 text-white sm:p-7"><p className="text-xs font-bold uppercase tracking-widest text-[#8dd7de]">Your next academic action</p>{report?<><h2 className="mt-2 font-serif text-2xl font-bold">{report.next.title}</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-white/80">{report.next.detail}</p><p className="mt-2 text-sm text-white/80"><strong>Success criterion:</strong> {report.next.success}</p><Link href={report.next.href} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-[#102a43]">Start recommended practice <ArrowRight className="size-4" aria-hidden="true"/></Link></>:<><h2 className="mt-2 font-serif text-xl font-bold">Review your recorded evidence</h2><p className="mt-2 text-sm text-white/80">{reportUnavailable?"The assessment recommendation is temporarily unavailable. Your saved records remain accessible below.":"A reliable next-step recommendation is not available."}</p><Link href="/tutor#academic-coach" className="mt-3 inline-block text-sm font-semibold underline">Open academic coach</Link></>}</section>
   <section className="rounded-2xl border bg-white p-5 sm:p-6"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="flex items-center gap-2 font-serif text-xl font-bold"><School className="size-5 text-[#147d91]" aria-hidden="true"/>School assignments</h2><p className="mt-1 text-sm text-slate-600">{school?tasks.length+" outstanding assignment"+(tasks.length===1?"":"s"):schoolUnavailable?"Could not check assignments.":"No classroom assignment data available."}</p></div><Link href="/school-classroom" className="text-sm font-semibold text-[#147d91] underline">Open classroom</Link></div>{tasks.length>0&&<div className="mt-3 space-y-2">{tasks.slice(0,3).map(t=><div key={t.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 p-3 text-sm"><span className="font-semibold">{t.title}</span><span className={t.overdue?"text-amber-800":"text-slate-600"}>{t.dueAt?(t.overdue?"Overdue · ":"Due ")+when(t.dueAt):"No due date recorded"}</span></div>)}</div>}</section>
   <section aria-label="Saved activity and original evidence" className="rounded-2xl border bg-white p-4 sm:p-6"><h2 className="font-serif text-2xl font-bold">Saved activity</h2><p className="mt-1 text-sm text-slate-600">Select a record to inspect its original answer, writing excerpt or transcript and any saved feedback.</p>
    <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Filter activity by type">{filters.map(f=><button type="button" key={f.id} aria-pressed={filter===f.id} onClick={()=>{setFilter(f.id);setSelectedId("")}} className={"rounded-lg px-3 py-2 text-sm font-semibold "+(filter===f.id?"bg-[#102a43] text-white":"border bg-white text-slate-600")}>{f.label}</button>)}</div>
    <label className="mt-4 flex items-center gap-2 rounded-lg border px-3"><Search className="size-4 text-slate-500" aria-hidden="true"/><input value={query} onChange={e=>{setQuery(e.target.value);setSelectedId("")}} aria-label="Search saved activity" placeholder="Search records…" className="min-w-0 flex-1 py-3 text-sm outline-none"/></label>
    {visible.length>0?<div className="mt-5 grid gap-5 lg:grid-cols-[minmax(220px,.8fr)_minmax(0,1.5fr)]"><div className="max-h-[55rem] space-y-2 overflow-y-auto" aria-label="Saved records">{visible.map(r=><button key={r.id} type="button" aria-pressed={selected?.id===r.id} onClick={()=>setSelectedId(r.id)} className={"w-full rounded-xl border p-3 text-left "+(selected?.id===r.id?"border-[#147d91] bg-[#edf7f8]":"bg-white hover:bg-slate-50")}><span className="text-xs font-semibold uppercase text-[#147d91]">{kinds[r.kind]}</span><strong className="mt-1 block text-sm">{r.title}</strong><span className="mt-1 block text-xs text-slate-600">{when(r.date)} · {r.source==="cloud"?"Cloud record":"Synced device record"}</span></button>)}</div>
     {selected&&<article key={selected.id} className="min-w-0 space-y-4 rounded-xl border bg-[#fbfcfc] p-4 sm:p-5"><div><p className="text-xs font-semibold uppercase text-[#147d91]">{kinds[selected.kind]} · {when(selected.date)}</p><h3 className="mt-2 font-serif text-2xl font-bold">{selected.title}</h3>{selected.summary&&<p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">{selected.summary}</p>}{selected.score&&<p className="mt-3 text-sm font-semibold">Raw practice marks: {selected.score.raw}/{selected.score.max} (not a university scaled score)</p>}</div>
      {selected.feedback.length>0&&<section><h4 className="font-semibold">Saved feedback and priorities</h4><div className="mt-2 space-y-2">{selected.feedback.map((f,i)=><p key={i} className="rounded-lg border bg-white p-3 text-sm leading-6">{f}</p>)}</div></section>}
      {selected.transcript.length>0&&<details open className="rounded-xl border bg-white"><summary className="cursor-pointer p-3 font-semibold">Interview transcript ({selected.transcript.length} recorded lines)</summary><div className="max-h-[30rem] space-y-2 overflow-y-auto px-3 pb-3">{selected.transcript.map((t,i)=><div key={i} className="rounded-lg bg-slate-50 p-3 text-sm"><strong>{t.speaker}</strong><p className="mt-1 whitespace-pre-wrap leading-6">{t.text}</p>{t.feedback&&<p className="mt-2 text-xs text-slate-600">Recorded feedback: {t.feedback}</p>}</div>)}</div></details>}
      {selected.questions.length>0&&<details open className="rounded-xl border bg-white"><summary className="cursor-pointer p-3 font-semibold">Question-by-question responses ({selected.questions.length})</summary><div className="max-h-[35rem] space-y-3 overflow-y-auto px-3 pb-3">{selected.questions.map((q,i)=><div key={i} className="rounded-lg bg-slate-50 p-3 text-sm"><strong>Question {i+1}: {q.question}</strong><p className="mt-2 whitespace-pre-wrap"><b>Your answer:</b> {q.answer}</p>{q.expected&&<p className="mt-1 whitespace-pre-wrap"><b>Recorded answer:</b> {q.expected}</p>}{q.marks&&<p className="mt-1">Marks: {q.marks.raw}/{q.marks.max}</p>}{q.explanation&&<p className="mt-2 text-slate-600">{q.explanation}</p>}</div>)}</div></details>}
      {selected.original&&<details className="rounded-xl border bg-white"><summary className="cursor-pointer p-3 font-semibold">Original writing excerpt</summary><p className="max-h-[30rem] overflow-y-auto whitespace-pre-wrap px-3 pb-3 text-sm leading-6">{selected.original}</p>{selected.originalTruncated&&<p className="p-3 text-xs text-amber-800">This excerpt is shortened. Check the original document for the full draft.</p>}</details>}
      {!selected.transcript.length&&!selected.questions.length&&!selected.original&&<p className="rounded-lg bg-white p-3 text-sm text-slate-600">This record has no detailed answers available in the overview. Open the specialist viewer for any additional saved material.</p>}
      {selected.truncated&&<p className="text-xs text-amber-800">Only the first part of the saved answers is displayed here. The specialist history viewer may contain additional details.</p>}
      <div className="flex flex-wrap gap-3 border-t pt-4"><Link href={selected.href} className="rounded-xl bg-[#102a43] px-4 py-3 text-sm font-semibold text-white">Open specialist viewer</Link><Link href="/assessment-report" className="rounded-xl border bg-white px-4 py-3 text-sm font-semibold">Detailed assessment report</Link></div>
     </article>}
    </div>:<p className="mt-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">No matching saved records. You can begin new preparation in <Link className="font-semibold underline" href="/tutor">My Tutor</Link> or explore earlier local work in the specialist tools.</p>}
   </section>
   <section className="rounded-2xl border bg-white p-5"><h2 className="font-serif text-xl font-bold">More detailed reports</h2><div className="mt-3 grid gap-2 sm:grid-cols-2">{[["/assessment-report","Academic assessment report"],["/interview-insights","Transcript-linked interview analysis"],["/test-results","Full test results and answers"],["/written-work-vault","Written work and portfolio"],["/history","Older activity history"],["/student/teacher-links","Linked teachers"]].map(([href,label])=><Link key={href} href={href} className="flex items-center justify-between rounded-lg border p-3 text-sm font-semibold hover:bg-slate-50">{label}<ArrowRight className="size-4 text-[#147d91]" aria-hidden="true"/></Link>)}</div></section>
   <p className="text-xs leading-5 text-slate-500">{data.limitNote} Synced-device records appear after they have reached your account. Snapshot checked {new Date(data.asOf).toLocaleString("en-GB")}. A missing record is not proof that practice never took place.</p>
  </>}
 </div></main>
}

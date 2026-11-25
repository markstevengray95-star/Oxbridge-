"use client"
import Link from "next/link"
import { CoachWrittenPractice } from "@/components/coach-written-practice"
import { useEffect, useRef, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { coachPacks, skillLabels, type CoachAttempt } from "@/lib/academic-coach"

type CoachData={attempts:CoachAttempt[];recommendation:{packId:string|null;reason:string;course:string|null;nextReviewAt:string|null};reviewSchedule:{packId:string;skill:keyof typeof skillLabels;dueAt:string;due:boolean}[]}
const primary="rounded-xl bg-[#102a43] px-5 py-3 text-sm font-semibold text-white disabled:opacity-40"
const secondary="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-[#102a43] hover:bg-slate-50 disabled:opacity-40"

export function AcademicCoach(){
 const [data,setData]=useState<CoachData|null>(null)
 const [status,setStatus]=useState<"loading"|"ready"|"signin"|"error">("loading")
 const [diagnostic,setDiagnostic]=useState<number|null>(null)
 const [transfer,setTransfer]=useState<number|null>(null)
 const [stage,setStage]=useState<"diagnose"|"learn"|"transfer"|"result">("diagnose")
 const [result,setResult]=useState<CoachAttempt|null>(null)
 const [writtenPack,setWrittenPack]=useState<string|null>(null)
 const [busy,setBusy]=useState(false)
 const [error,setError]=useState("")
 const generation=useRef(0)
 const authId=useRef<string|null>(null)
 async function load(reset=true){
  const token=++generation.current
  setStatus("loading");setData(null);setError("");setBusy(false)
  if(reset){setDiagnostic(null);setTransfer(null);setStage("diagnose");setResult(null);setWrittenPack(null)}
  try{
   const response=await fetch("/api/academic-coach",{cache:"no-store"})
   if(token!==generation.current)return
   if(response.status===401){setStatus("signin");return}
   if(!response.ok){setStatus("error");return}
   const payload=await response.json() as CoachData
   if(token!==generation.current)return
   setData(payload);setStatus("ready")
  }catch{if(token===generation.current)setStatus("error")}
 }
 useEffect(()=>{
  const supabase=createClient()
  const {data:listener}=supabase.auth.onAuthStateChange((_event,session)=>{
   const userId=session?.user.id??null
   if(userId===authId.current&&_event!=="INITIAL_SESSION")return
   authId.current=userId
   ++generation.current
   setData(null);setDiagnostic(null);setTransfer(null);setResult(null);setWrittenPack(null);setStage("diagnose");setError("");setBusy(false)
   if(userId)void load();else setStatus("signin")
  })
  return()=>{++generation.current;listener.subscription.unsubscribe()}
 },[])
 const pack=coachPacks.find(p=>p.id===data?.recommendation.packId)
 async function save(){
  if(!pack||diagnostic===null||transfer===null||busy)return
  const token=generation.current
  setBusy(true);setError("")
  try{
   const response=await fetch("/api/academic-coach",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({packId:pack.id,diagnostic,transfer})})
   const payload=await response.json()
   if(token!==generation.current)return
   if(!response.ok){setError(payload.error||"Could not save this exercise.");return}
   setResult(payload.attempt as CoachAttempt);setStage("result")
  }catch{if(token===generation.current)setError("Connection failed. Your choices are still available to retry.")}
  finally{if(token===generation.current)setBusy(false)}
 }
 const question=stage==="diagnose"?pack?.diagnostic:pack?.transfer
 const selection=stage==="diagnose"?diagnostic:transfer
 return <section id="academic-coach" className="mx-auto max-w-7xl scroll-mt-28 px-4 py-6 sm:px-6">
  <div className="rounded-3xl border border-[#dbe5e7] bg-white p-5 shadow-sm sm:p-8">
   <p className="text-xs font-bold uppercase tracking-widest text-[#147d91]">Academic coach · Phase 11</p>
   <h2 className="mt-2 font-serif text-2xl font-bold text-[#102a43] sm:text-3xl">Diagnose, learn, transfer</h2>
   <p className="mt-2 max-w-3xl text-sm text-slate-600">A short targeted practice cycle based on your saved learning evidence. It is formative practice, not a validated admissions assessment or AI judgement of your ability.</p>
   {status==="loading"&&<p role="status" className="mt-5 text-sm text-slate-600">Loading your account evidence…</p>}
   {status==="signin"&&<div className="mt-5"><p className="mb-3 text-sm">Sign in to keep your coaching history private and available across devices.</p><Link className={primary} href="/account">Open account</Link></div>}
   {status==="error"&&<div className="mt-5"><p role="alert" className="mb-3 text-sm">Your saved practice could not be loaded.</p><button className={secondary} onClick={()=>void load()}>Retry</button></div>}
   {status==="ready"&&data&&<>
    <div className="my-5 grid gap-3 sm:grid-cols-3">
     <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs text-slate-600">Completed practice pairs</p><p className="text-2xl font-bold text-[#102a43]">{data.attempts.length}</p></div>
     <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs text-slate-600">Fresh questions correct</p><p className="text-2xl font-bold text-[#102a43]">{data.attempts.filter(a=>a.transferCorrect).length} / {data.attempts.length}</p></div>
     <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs text-slate-600">Course profile</p><p className="mt-1 font-semibold text-[#102a43]">{data.recommendation.course||"Not yet saved"}</p></div>
    </div>
    {data.reviewSchedule.length>0&&<div className="mb-5 rounded-xl border p-4"><h3 className="font-semibold text-[#102a43]">Spaced review schedule</h3><ul className="mt-2 space-y-1 text-sm">{data.reviewSchedule.map(r=><li key={r.packId}>{skillLabels[r.skill]} — {r.due?"Due now":new Date(r.dueAt).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"})}</li>)}</ul><p className="mt-2 text-xs text-slate-600">Fresh review questions are scheduled one day after a missed transfer or three days after a correct transfer. One review pair per skill in this release.</p></div>}
    {pack?<div className="rounded-2xl border border-slate-200 p-4 sm:p-6">
     <p className="text-xs font-semibold text-[#147d91]">{skillLabels[pack.skill]} · {stage==="diagnose"?"Step 1 of 3":stage==="learn"?"Step 2 of 3":stage==="transfer"?"Step 3 of 3":"Practice recorded"}</p>
     <h3 className="mt-1 text-xl font-bold text-[#102a43]">{pack.title}</h3>
     <p className="mt-2 text-sm text-slate-600">{data.recommendation.reason}</p>
     {(stage==="diagnose"||stage==="transfer")&&question&&<fieldset disabled={busy} className="mt-5 space-y-3"><legend className="mb-3 font-semibold text-slate-900">{question.prompt}</legend>
      {question.options.map((option,i)=><label key={i} className={"flex cursor-pointer gap-3 rounded-xl border p-3 text-sm "+(selection===i?"border-[#147d91] bg-[#edf7f8]":"border-slate-200")}><input type="radio" name={stage} checked={selection===i} onChange={()=>stage==="diagnose"?setDiagnostic(i):setTransfer(i)} className="mt-1 accent-[#147d91]"/><span>{option}</span></label>)}
     </fieldset>}
     {stage==="diagnose"&&<button className={primary+" mt-5"} disabled={diagnostic===null} onClick={()=>setStage("learn")}>Check and learn</button>}
     {stage==="learn"&&<div className="mt-5 rounded-xl bg-[#edf7f8] p-4"><p className="font-bold text-[#102a43]">{diagnostic===pack.diagnostic.correct?"Diagnostic correct":"Diagnostic needs another look"}</p><p className="mt-2 text-sm">{pack.diagnostic.explanation}</p><h4 className="mt-4 font-semibold">How to approach the next question</h4><p className="mt-1 text-sm">{pack.lesson}</p><button className={primary+" mt-4"} onClick={()=>setStage("transfer")}>Try a fresh question</button></div>}
     {stage==="transfer"&&<button className={primary+" mt-5"} disabled={transfer===null||busy} onClick={()=>void save()}>{busy?"Saving…":"Check and save practice"}</button>}
     {stage==="result"&&result&&<div role="status" className="mt-5 rounded-xl bg-slate-50 p-4"><h4 className="font-bold text-[#102a43]">{result.transferCorrect?(result.diagnosticCorrect?"Both answers correct":"Fresh answer correct after teaching"):"Further practice recommended"}</h4><p className="mt-2 text-sm">{pack.transfer.explanation}</p><p className="mt-2 text-xs text-slate-600">Your first completed pair is saved. Two items are not enough to establish mastery.</p><button className={primary+" mt-4"} onClick={()=>void load()}>Get next recommendation</button></div>}
     {error&&<p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
    </div>:<p className="rounded-xl bg-slate-50 p-4 text-sm">{data.recommendation.reason}</p>}
    {data.attempts.length>0&&<details className="mt-5"><summary className="cursor-pointer font-semibold text-[#102a43]">Your completed coaching exercises</summary><ul className="mt-3 space-y-2 text-sm">{data.attempts.slice().sort((a,b)=>b.completedAt.localeCompare(a.completedAt)).map(a=><li key={a.packId} className="rounded-xl border p-3">{coachPacks.find(p=>p.id===a.packId)?.title}: diagnostic {a.diagnosticCorrect?"correct":"incorrect"} · fresh question {a.transferCorrect?"correct":"incorrect"} <button type="button" className="ml-2 font-semibold text-[#147d91] underline" onClick={()=>setWrittenPack(a.packId)}>Written practice</button></li>)}</ul></details>}
    {(writtenPack||(stage==="result"&&result?pack?.id:null))&&<CoachWrittenPractice key={writtenPack??pack?.id} packId={(writtenPack??pack?.id)!}/>}
    <div className="mt-5 flex flex-wrap gap-2"><Link className={secondary} href="/paper-intervention">Subject-specific test intervention</Link><Link className={secondary} href="/interview-room">Apply reasoning in an interview</Link><Link className={secondary} href="/essay-tutor">Writing practice</Link></div>
   </>}
  </div>
 </section>
}

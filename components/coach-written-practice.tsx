"use client"
import { useEffect,useRef,useState } from "react"
import { coachWrittenTask } from "@/lib/academic-coach"

export function CoachWrittenPractice({packId}:{packId:string}){
 const task=coachWrittenTask(packId)
 const [answer,setAnswer]=useState("")
 const [followUp,setFollowUp]=useState("")
 const [showCriteria,setShowCriteria]=useState(false)
 const [consent,setConsent]=useState(false)
 const [feedback,setFeedback]=useState<{provider:string;feedback:string}|null>(null)
 const [busy,setBusy]=useState(false)
 const [error,setError]=useState("")
 const controller=useRef<AbortController|null>(null)
 useEffect(()=>()=>controller.current?.abort(),[])
 async function review(){
  if(busy||!consent||answer.trim().length<15)return
  const request=new AbortController();controller.current=request
  setBusy(true);setError("")
  try{
   const response=await fetch("/api/personal-tutor/academic-coach",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({packId,answer,followUp,consent}),signal:request.signal})
   const body=await response.json()
   if(request.signal.aborted)return
   if(!response.ok){setError(body.error||"Feedback unavailable. Use the criteria below.");setShowCriteria(true);return}
   if(typeof body.feedback!=="string"){setError("Feedback unavailable. Use the criteria below.");setShowCriteria(true);return}
   setFeedback({provider:body.provider,feedback:body.feedback});setShowCriteria(true)
  }catch{if(!request.signal.aborted){setError("Connection unavailable. You can still use the rubric.");setShowCriteria(true)}}
  finally{if(!request.signal.aborted){setBusy(false);setConsent(false)}}
 }
 if(!task)return null
 return <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
  <h4 className="text-lg font-bold text-[#102a43]">Extend your reasoning</h4>
  <p className="mt-2 text-sm text-slate-700">{task.prompt}</p>
  <label className="mt-4 block text-sm font-semibold" htmlFor="coach-written-answer">Your written explanation</label>
  <textarea id="coach-written-answer" className="mt-2 w-full rounded-xl border p-3 text-sm" rows={5} maxLength={2500} value={answer} disabled={busy} onChange={e=>setAnswer(e.target.value)} placeholder="Explain the principle, justify each step and consider a limitation."/>
  <p className="text-xs text-slate-600">This is a formative exercise. Your written answer is not saved by this feature. Avoid including names or personal information.</p>
  <button type="button" className="mt-3 rounded-xl border px-4 py-2 text-sm font-semibold" onClick={()=>setShowCriteria(v=>!v)}>{showCriteria?"Hide self-review criteria":"Show self-review criteria"}</button>
  {showCriteria&&<ul className="mt-3 list-disc space-y-1 pl-5 text-sm">{task.criteria.map(c=><li key={c}>{c}</li>)}</ul>}
  {feedback&&<div role="status" className="mt-4 rounded-xl bg-slate-50 p-4"><p className="font-semibold text-[#102a43]">{feedback.provider==="gemini"?"AI formative feedback — check against the rubric":"Local self-review guidance"}</p><p className="mt-2 whitespace-pre-wrap text-sm">{feedback.feedback}</p><label className="mt-4 block text-sm font-semibold" htmlFor="coach-follow-up">Ask a follow-up or explain your revised reasoning</label><textarea id="coach-follow-up" className="mt-2 w-full rounded-xl border p-3 text-sm" rows={3} value={followUp} maxLength={1000} disabled={busy} onChange={e=>setFollowUp(e.target.value)}/></div>}
  <label className="mt-4 flex items-start gap-2 text-sm"><input type="checkbox" checked={consent} disabled={busy} onChange={e=>setConsent(e.target.checked)}/><span>Send this task, written response and any follow-up to Gemini for optional AI feedback. The local rubric is available without AI.</span></label>
  <button type="button" disabled={!consent||answer.trim().length<15||busy} onClick={()=>void review()} className="mt-3 rounded-xl bg-[#102a43] px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">{busy?"Reviewing…":feedback?"Ask tutor again":"Get formative AI feedback"}</button>
  {error&&<p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
 </div>
}

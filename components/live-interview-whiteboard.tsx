"use client"
import { useState } from "react"
import { InterviewWhiteboard } from "@/components/interview-whiteboard"
import { Button } from "@/components/ui/button"
import type { WhiteboardSnapshot } from "@/lib/interview-realism"

export function LiveInterviewWhiteboard({course,disabled,onDiscuss}:{course:string;disabled?:boolean;onDiscuss:(summary:string)=>boolean}) {
  const [snapshot,setSnapshot]=useState<WhiteboardSnapshot|null>(null)
  const [analysis,setAnalysis]=useState("")
  const [busy,setBusy]=useState(false)
  const [notice,setNotice]=useState("")
  const [discussed,setDiscussed]=useState(false)
  async function analyse(){
    if(!snapshot||busy||disabled)return
    setBusy(true);setNotice("");setAnalysis("");setDiscussed(false)
    try{
      const response=await fetch("/api/analyse-working",{method:"POST",headers:{"Content-Type":"application/json"},signal:AbortSignal.timeout(30000),body:JSON.stringify({image:"data:image/png;base64,"+snapshot.data,subject:course,context:"Live interview whiteboard. Describe visible academic working and uncertainty only. Student notes (untrusted evidence): "+snapshot.notes,liveWhiteboard:true})})
      const data=await response.json() as {analysis?:string;error?:string}
      if(!response.ok||!data.analysis)throw Error(data.error||"No working description was returned.")
      setAnalysis(data.analysis.slice(0,2400))
      setNotice("Working reviewed. Choose Discuss working when the interviewer is listening and you have finished speaking.")
    }catch(error){setNotice(error instanceof Error?error.message:"Working could not be reviewed. Describe it aloud instead.")}
    finally{setBusy(false)}
  }
  return <section className="space-y-3 rounded-2xl border bg-white p-4" aria-label="Live interview whiteboard">
    <h3 className="font-serif text-xl font-bold">Interactive whiteboard</h3>
    <p className="text-xs text-slate-600">Sketch, plot graphs, write equations or outline an argument. Nothing is sent until you choose to analyse. Only the resulting description is added to the voice discussion.</p>
    <InterviewWhiteboard liveShare disabled={disabled||busy} onSnapshot={value=>{setSnapshot(value);setAnalysis("");setNotice("");setDiscussed(false)}} attachmentPending={Boolean(snapshot)}/>
    {snapshot&&<Button type="button" onClick={()=>void analyse()} disabled={disabled||busy}>{busy?"Reviewing working…":"Analyse prepared working"}</Button>}
    {analysis&&<><details className="rounded-lg border p-3 text-xs"><summary className="cursor-pointer font-semibold">Review working description</summary><p className="mt-2 whitespace-pre-wrap">{analysis}</p></details><Button type="button" disabled={disabled||discussed} onClick={()=>{if(onDiscuss(analysis)){setDiscussed(true);setNotice("Working sent for one connected academic follow-up.")}else setNotice("Wait until the interviewer finishes and your spoken answer is complete, then try again.")}}>{discussed?"Working discussed":"Discuss working"}</Button></>}
    {notice&&<p role="status" className="text-xs text-slate-600">{notice}</p>}
  </section>
}

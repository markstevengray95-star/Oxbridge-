"use client"

import Link from "next/link"
import {useCallback,useEffect,useRef,useState} from "react"
import {createClient} from "@/lib/supabase/client"
import type {AssessmentReport} from "@/lib/assessment-intelligence"

const date=(s:string)=>new Date(s).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"})
const delta=(n:number)=>(n>0?"+":"")+n+" pp"
const rate=(n:number,d:number)=>d?Math.round(n/d*100)+"%":"Not assessed"
const card="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7 print:rounded-none print:shadow-none"
const button="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-[#102a43] disabled:opacity-40"
const heading="font-serif text-2xl font-bold text-[#102a43]"
const selectClass="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
export default function AssessmentReportPage(){
 const [report,setReport]=useState<AssessmentReport|null>(null)
 const [status,setStatus]=useState<"loading"|"ready"|"signin"|"error">("loading")
 const [test,setTest]=useState("all")
 const generation=useRef(0)
 const account=useRef<string|null>(null)
 const reload=useCallback(async()=>{
  const token=++generation.current
  setStatus("loading");setReport(null)
  try{
   const res=await fetch("/api/assessment-report",{cache:"no-store"})
   if(token!==generation.current)return
   if(res.status===401){setStatus("signin");return}
   if(!res.ok){setStatus("error");return}
   const body=await res.json() as AssessmentReport
   if(token!==generation.current)return
   setReport(body);setStatus("ready")
  }catch{if(token===generation.current)setStatus("error")}
 },[])
 useEffect(()=>{
  const supabase=createClient()
  const {data}=supabase.auth.onAuthStateChange((event,session)=>{
   const id=session?.user.id??null
   if(id===account.current&&event!=="INITIAL_SESSION")return
   account.current=id;++generation.current;setReport(null);setTest("all")
   if(id)void reload();else setStatus("signin")
  })
  const focus=()=>{if(account.current)void reload()}
  window.addEventListener("scholarbridge-progress-updated",focus)
  return()=>{++generation.current;data.subscription.unsubscribe();window.removeEventListener("scholarbridge-progress-updated",focus)}
 },[reload])
 const testNames=report?[...new Set([...report.paperTrends.map(t=>t.test),...report.recurring.map(t=>t.test),...report.retests.map(t=>t.test)])]:[]
 return <main className="min-h-screen bg-[#f3f6f6] text-[#172b3a] print:bg-white">
  <div className="mx-auto max-w-6xl space-y-5 px-4 py-8 sm:px-6 print:max-w-none print:p-0">
   <div className="flex flex-wrap items-center justify-between gap-3 print:hidden"><Link href="/tutor" className="text-sm font-semibold text-[#147d91]">← Tutor command centre</Link><div className="flex gap-2"><button className={button} onClick={()=>void reload()} disabled={status==="loading"}>Refresh saved evidence</button><button className={button} disabled={!report} onClick={()=>window.print()}>Print / save PDF</button></div></div>
   <header className={card}><p className="text-xs font-semibold uppercase tracking-widest text-[#147d91]">FELLOW · Academic development</p><h1 className="mt-2 font-serif text-3xl font-bold sm:text-4xl">Academic assessment report</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">A private review of the most recent 90 days of saved academic practice. This report separates observable interview habits, raw admissions-test marks and coaching outcomes. It does not predict admissions or provide a combined ability score.</p>{report&&<p className="mt-3 text-sm font-semibold">{report.course??"No saved course"} · Generated {date(report.asOf)}</p>}</header>
   {status==="loading"&&<p role="status" className={card}>Loading your saved account evidence…</p>}
   {status==="signin"&&<div className={card}><p>Sign in to access your private assessment report.</p><Link href="/account" className="mt-3 inline-block font-semibold text-[#147d91] underline">Open account</Link></div>}
   {status==="error"&&<p className={card} role="alert">The saved evidence could not be loaded. Refresh to retry. No score has been estimated.</p>}
   {status==="ready"&&report&&<>
    <div className="grid gap-3 sm:grid-cols-3">{[{name:"Comparable-course interview sessions",n:report.interviewCount},{name:"Saved full papers",n:report.paperCount},{name:"Completed coaching pairs",n:report.coachCount}].map(x=><div key={x.name} className={card}><p className="text-sm text-slate-600">{x.name}</p><p className="mt-1 text-3xl font-bold tabular-nums">{x.n}</p></div>)}</div>
    <section className={card}><h2 className={heading}>Your next academic action</h2><p className="mt-3 font-semibold">{report.next.title}</p><p className="mt-1 text-sm leading-6">{report.next.detail}</p><p className="mt-2 text-sm"><strong>Success criterion:</strong> {report.next.success}</p><Link href={report.next.href} className="mt-3 inline-block rounded-xl bg-[#102a43] px-4 py-2 text-sm font-semibold text-white print:hidden">Open recommended practice</Link></section>
    <section className={card}><h2 className={heading}>Interview reasoning over time</h2><p className="mt-2 text-sm text-slate-600">Only saved sessions in the selected course and same interview mode are compared. Each session must have at least three answers. These counts reflect explicit reasoning language, not proven correctness; differences compare the latest two sessions with the preceding two.</p>
     {!report.interviews.length&&<p className="mt-4 text-sm">No qualifying interview evidence yet. Complete an interview with at least three substantive answers and save it.</p>}
     {report.interviews.map(g=><article key={g.mode} className="mt-5 rounded-xl border p-4"><h3 className="font-semibold capitalize">{g.mode} interviews · {g.sessionCount} sessions</h3>{g.comparison?<p className="mt-2 text-sm">Reasoning links: <strong>{delta(g.comparison.reasoningDelta)}</strong> · Evidence checks: <strong>{delta(g.comparison.testingDelta)}</strong> ({g.comparison.earlierAnswers} earlier / {g.comparison.recentAnswers} recent answers)</p>:<p className="mt-2 text-sm text-slate-600">Four qualifying sessions are needed for a two-period comparison.</p>}
      <div className="mt-3 overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b text-slate-600"><th scope="col" className="p-2">Date</th><th scope="col" className="p-2">Reasoned</th><th scope="col" className="p-2">Checks</th><th scope="col" className="p-2">Revisions</th></tr></thead><tbody>{g.points.slice(-8).map((p,i)=><tr key={p.date+i} className="border-b"><td className="p-2">{date(p.date)}</td><td className="p-2">{p.reasoning}/{p.answers}</td><td className="p-2">{p.testing}/{p.answers}</td><td className="p-2">{p.revision}/{p.answers}</td></tr>)}</tbody></table></div>
      {g.examples.length>0&&<details className="mt-3"><summary className="cursor-pointer text-sm font-semibold">Transcript-linked areas to review</summary>{g.examples.map((e,i)=><div key={i} className="mt-3 border-l-2 border-slate-300 pl-3 text-sm"><p className="text-xs text-slate-600">{date(e.date)}</p><p className="mt-1 font-semibold">{e.question}</p><blockquote className="my-2">“{e.quote}”</blockquote><p>{e.observation}</p></div>)}</details>}
     </article>)}
    </section>
    <section className={card}><div className="flex flex-wrap items-center justify-between gap-3"><h2 className={heading}>Admissions-test evidence</h2><label className="text-sm print:hidden">Filter test <select className={selectClass} value={test} onChange={e=>setTest(e.target.value)}><option value="all">All tests</option>{testNames.map(t=><option key={t}>{t}</option>)}</select></label></div><p className="mt-2 text-sm text-slate-600">Raw marks are shown separately by section and form. Different forms are not statistically equated, so changes in raw accuracy are descriptive only.</p>
     {!report.paperTrends.filter(t=>test==="all"||t.test===test).length&&<p className="mt-4 text-sm">No saved mark-aware paper sections in this selection.</p>}
     <div className="mt-4 grid gap-3 lg:grid-cols-2">{report.paperTrends.filter(t=>test==="all"||t.test===test).map(g=><article key={g.test+g.section} className="rounded-xl border p-4"><h3 className="text-sm font-semibold">{g.test} · {g.section}</h3><div className="mt-3 space-y-2">{g.points.map((p,i)=><div key={p.date+i}><div className="flex justify-between gap-2 text-xs"><span>{date(p.date)} · Form {p.form}</span><span>{p.raw}/{p.max} ({p.accuracy}%)</span></div><div className="mt-1 h-2 overflow-hidden rounded bg-slate-200"><div className="h-full bg-[#147d91]" style={{width:p.accuracy+"%"}}/></div></div>)}</div></article>)}</div>
     <h3 className="mt-6 text-lg font-semibold">Recurring missed-item patterns</h3><p className="mt-1 text-sm text-slate-600">A pattern requires attempted lost marks on distinct questions across at least two saved papers. This identifies material to investigate, not a proven misconception or a reason for the mistake. Unanswered items are counted separately.</p>
     {!report.recurring.filter(p=>test==="all"||p.test===test).length&&<p className="mt-4 text-sm">No recurring pattern meets the evidence threshold.</p>}
     {report.recurring.filter(p=>test==="all"||p.test===test).map(p=><article key={p.test+p.section} className="mt-4 rounded-xl border p-4"><h4 className="font-semibold">{p.test} · {p.section}</h4><p className="mt-2 text-sm">{p.missedCount}/{p.attemptedCount} attempted items lost marks · {p.distinctMissed} distinct missed items across {p.paperCount} papers · {p.omittedCount} omitted</p><p className="mt-2 text-sm">{p.action}</p><details className="mt-3"><summary className="cursor-pointer text-sm font-semibold">Review exact question evidence</summary>{p.examples.map((e,i)=><div key={i} className="mt-3 rounded-lg bg-slate-50 p-3 text-sm"><p className="text-xs text-slate-600">{date(e.date)} · {e.raw}/{e.max} marks</p><p className="mt-2 whitespace-pre-wrap font-semibold">{e.question}</p><p className="mt-2"><strong>Your response:</strong> {e.response}</p><p className="mt-1"><strong>Expected answer:</strong> {e.expected||"Not recorded"}</p><p className="mt-2 text-xs">Reflection: was the issue understanding the question, choosing a method, carrying it out, or checking the result? Use your working to decide.</p></div>)}</details><Link href="/paper-intervention" className="mt-3 inline-block text-sm font-semibold text-[#147d91] underline print:hidden">Open targeted retests</Link></article>)}
     <h3 className="mt-6 text-lg font-semibold">Targeted retest history</h3>{report.retests.filter(r=>test==="all"||r.test===test).length?<ul className="mt-3 space-y-2 text-sm">{report.retests.filter(r=>test==="all"||r.test===test).map((r,i)=><li key={r.date+i} className="rounded-lg border p-3">{date(r.date)} · {r.test} · {r.accuracy}% practice accuracy {r.questions!==null?"· "+r.questions+" items":""}{r.answered!==null?" · "+r.answered+" answered":""}{r.targets.length?<p className="mt-1 text-slate-600">{r.targets.join(", ")}</p>:null}</li>)}</ul>:<p className="mt-2 text-sm">No saved retests in this selection.</p>}
    </section>
    <section className={card}><h2 className={heading}>Academic coaching and delayed checks</h2><p className="mt-2 text-sm text-slate-600">First attempts and later fresh checks are reported separately. Different questions and small samples are not proof of mastery or causal learning gains.</p>
     {!report.coachSkills.length&&<p className="mt-4 text-sm">No completed account-linked coaching exercises yet.</p>}
     <div className="mt-4 grid gap-3 sm:grid-cols-2">{report.coachSkills.map(g=><article key={g.skill} className="rounded-xl border p-4"><h3 className="font-semibold">{g.skill}</h3><dl className="mt-3 space-y-2 text-sm"><div className="flex justify-between gap-2"><dt>Initial diagnosis</dt><dd>{g.diagnosticCorrect}/{g.completed} · {rate(g.diagnosticCorrect,g.completed)}</dd></div><div className="flex justify-between gap-2"><dt>Fresh transfer</dt><dd>{g.transferCorrect}/{g.completed} · {rate(g.transferCorrect,g.completed)}</dd></div><div className="flex justify-between gap-2"><dt>Delayed fresh checks</dt><dd>{g.delayedCorrect}/{g.delayedCompleted}</dd></div></dl><details className="mt-3 text-sm"><summary className="cursor-pointer font-semibold">Practice evidence</summary><ul className="mt-2 space-y-2">{g.records.map(r=><li key={r.id}>{date(r.date)} · {r.title}{r.course?" ("+r.course+")":""} — {r.transferCorrect?"fresh answer correct":"needs review"}</li>)}</ul></details></article>)}</div><Link href="/tutor#academic-coach" className="mt-3 inline-block text-sm font-semibold text-[#147d91] underline print:hidden">Return to the academic coach</Link>
    </section>
    <footer className="text-xs leading-5 text-slate-600">Includes saved cloud records available at generation time; recent activity may still be syncing. Records may be missing or inaccurate. This report is private to your signed-in account. Printed copies may contain your own academic responses; share only with people you choose.</footer>
   </>}
  </div>
 </main>
}

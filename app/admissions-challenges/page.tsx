"use client"
import Link from "next/link"
import {useEffect,useMemo,useState} from "react"
import {phase12QuestionBank,nextChallengeQuestion,type Phase12Question} from "@/lib/phase12-authored-bank"

type Attempt={id:string;correct:boolean;date:string}
const KEY="oxbridge-phase12-challenge-history-v1"
const tests=["TMUA","ESAT","TARA","LNAT","UCAT"] as const
export default function AdmissionsChallenges(){
 const [test,setTest]=useState<Phase12Question["test"]>("TMUA")
 const [section,setSection]=useState("")
 const [attempts,setAttempts]=useState<Attempt[]>([])
 const [selected,setSelected]=useState<number|null>(null)
 const [reviewed,setReviewed]=useState(false)
 const [question,setQuestion]=useState<Phase12Question|null>(null)
 const [ready,setReady]=useState(false)
 const [saveError,setSaveError]=useState("")
 useEffect(()=>{try{const raw=JSON.parse(localStorage.getItem(KEY)||"[]");if(Array.isArray(raw))setAttempts(raw.filter(a=>a&&typeof a.id==="string"&&typeof a.correct==="boolean"&&typeof a.date==="string").slice(0,100))}catch{}setReady(true)},[])
 const sections=useMemo(()=>[...new Set(phase12QuestionBank.filter(q=>q.test===test).map(q=>q.section))],[test])
 const pool=phase12QuestionBank.filter(q=>q.test===test&&(!section||q.section===section))
 const current=question??nextChallengeQuestion(pool,attempts)
 function changeTest(value:Phase12Question["test"]){setTest(value);setSection("");setQuestion(null);setSelected(null);setReviewed(false);setSaveError("")}
 function next(){setQuestion(null);setSelected(null);setReviewed(false);setSaveError("")}
 function mark(){
  if(!current||selected===null||reviewed)return
  setQuestion(current);setReviewed(true)
  const next=[{id:current.id,correct:selected===current.answer,date:new Date().toISOString()},...attempts.filter(a=>a.id!==current.id)].slice(0,100)
  setAttempts(next);try{localStorage.setItem(KEY,JSON.stringify(next))}catch{setSaveError("This result could not be saved on this device.")}
 }
 const completed=pool.filter(q=>attempts.some(a=>a.id===q.id))
 const topics=[...new Set(pool.map(q=>q.topic))]
 return <main className="min-h-screen bg-slate-50 text-slate-950"><div className="mx-auto max-w-5xl space-y-5 px-4 py-8"><Link href="/full-papers" className="text-sm font-semibold text-[#147d91]">← Full Paper Centre</Link><header><h1 className="font-serif text-3xl font-bold">Admissions topic challenges</h1><p className="mt-2 text-sm text-slate-600">Original practice reserve. These are independent exercises, not official questions or calibrated test scores. Results are formative and saved in this browser's app state. The next unseen question favours a missed topic and a suitable authored difficulty where available.</p></header>
 <div className="rounded-2xl border bg-white p-4"><label className="mr-3 text-sm font-semibold">Test <select className="ml-2 rounded-lg border p-2" value={test} onChange={e=>changeTest(e.target.value as Phase12Question["test"])}>{tests.map(t=><option key={t}>{t}</option>)}</select></label><label className="text-sm font-semibold">Section <select className="ml-2 rounded-lg border p-2" value={section} onChange={e=>{setSection(e.target.value);next()}}><option value="">All sections</option>{sections.map(s=><option key={s}>{s}</option>)}</select></label><p className="mt-3 text-sm">{completed.length}/{pool.length} first-pass questions completed · {completed.filter(q=>attempts.find(a=>a.id===q.id)?.correct).length} correct</p></div>
 {!ready?<p>Loading practice…</p>:current?<section className="rounded-2xl border bg-white p-5"><p className="text-xs font-semibold uppercase tracking-wide text-[#147d91]">{current.section} · {current.topic}</p><p className="mt-3 whitespace-pre-wrap text-lg font-semibold">{current.prompt}</p><fieldset className="mt-4 space-y-2" disabled={reviewed}><legend className="sr-only">Choose an answer</legend>{current.options.map((option,i)=><label key={i} className="flex gap-3 rounded-lg border p-3 text-sm"><input type="radio" name="answer" checked={selected===i} onChange={()=>setSelected(i)}/>{option}</label>)}</fieldset>{!reviewed?<button disabled={selected===null} className="mt-4 rounded-lg bg-[#102a43] px-4 py-2 font-semibold text-white disabled:opacity-40" onClick={mark}>Check answer</button>:<div role="status" className="mt-4 rounded-lg bg-slate-100 p-4"><p className="font-semibold">{selected===current.answer?"Correct":"Review the reasoning"}</p><p className="mt-1 text-sm">Correct answer: {current.options[current.answer]}</p><p className="mt-2 text-sm">{current.explanation}</p><button className="mt-3 rounded-lg bg-[#102a43] px-4 py-2 text-white" onClick={next}>Next unseen question</button></div>}{saveError&&<p role="alert" className="text-sm text-red-700">{saveError}</p>}</section>:<p className="rounded-xl border bg-white p-5">All questions in this selection have been attempted. Choose another section or return to the full papers.</p>}
 <section className="rounded-2xl border bg-white p-5"><h2 className="font-semibold">Topic breakdown</h2><p className="mt-1 text-xs text-slate-600">Small samples do not establish mastery.</p><ul className="mt-3 space-y-2 text-sm">{topics.map(t=>{const done=completed.filter(q=>q.topic===t);return <li key={t}>{t}: {done.filter(q=>attempts.find(a=>a.id===q.id)?.correct).length}/{done.length} correct ({pool.filter(q=>q.topic===t).length} available)</li>})}</ul></section></div></main>
}

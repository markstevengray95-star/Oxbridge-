"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { ArrowLeft, BookOpenCheck, ShieldQuestion } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { PERSONAL_STATEMENT_KEY } from "@/lib/digital-twin-2"

function extractClaims(text:string){
  return text.split(/(?<=[.!?])\s+/).map(x=>x.trim()).filter(x=>x.length>55).slice(0,14).map((sentence,i)=>{
    const lower=sentence.toLowerCase(); const academic=/read|book|paper|article|lecture|project|competition|research|course|subject|study/.test(lower)
    return {id:`claim-${i}`,sentence,status: academic?"Needs defence":"Context",questions:[`What exactly do you mean by this claim?`,`What evidence or experience supports it?`,`What is the strongest objection or limitation?`]}
  })
}

export default function PersonalStatementDefencePage(){
  const [text,setText]=useState("")
  const claims=useMemo(()=>extractClaims(text),[text])
  const save=()=>localStorage.setItem(PERSONAL_STATEMENT_KEY,JSON.stringify({text,claims,updatedAt:new Date().toISOString()}))
  const launch=()=>{save();localStorage.setItem("oxbridge-panel-context-v1",JSON.stringify({type:"personal-statement",title:"Personal statement defence",material:text,notes:claims.map(c=>c.sentence).join("\n")}));window.location.href="/panel-interview"}
  return <main className="min-h-screen bg-[#f5f7f7] px-4 py-8 text-[#172b3a]"><div className="mx-auto max-w-6xl space-y-5"><Link href="/digital-twin" className="inline-flex items-center gap-2 text-sm font-semibold"><ArrowLeft className="size-4"/>Digital Twin</Link><section><Badge>Application evidence</Badge><h1 className="mt-3 font-serif text-4xl font-bold">Personal Statement Defence</h1><p className="mt-2 max-w-3xl text-slate-600">Paste your statement. The app turns substantial academic claims into things you should be able to explain, evidence, qualify and defend in interview.</p></section><Card><CardHeader><CardTitle>Your statement</CardTitle></CardHeader><CardContent><Textarea value={text} onChange={e=>setText(e.target.value)} className="min-h-64" placeholder="Paste your personal statement here..."/></CardContent></Card>{claims.length>0&&<><div className="grid gap-3">{claims.map((c,i)=><Card key={c.id}><CardHeader><div className="flex items-center justify-between gap-3"><CardTitle className="text-lg">Claim {i+1}</CardTitle><Badge variant="outline">{c.status}</Badge></div></CardHeader><CardContent><p className="text-sm leading-6">{c.sentence}</p><div className="mt-3 grid gap-2 md:grid-cols-3">{c.questions.map(q=><div key={q} className="rounded-xl bg-slate-50 p-3 text-sm"><ShieldQuestion className="mb-2 size-4 text-[#147d91]"/>{q}</div>)}</div></CardContent></Card>)}</div><div className="flex flex-wrap gap-2"><Button onClick={save}>Save defence map</Button><Button onClick={launch} variant="outline"><BookOpenCheck/>Defend this in two-person interview</Button></div></>}</div></main>
}

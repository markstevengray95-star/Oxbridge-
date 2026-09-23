"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { ArrowLeft, ArrowRight, BookOpen, CirclePlus, Link2, Network, Sparkles, Trash2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"

type Node = { id:string; title:string; type:string; concepts:string[]; claim:string; question:string; links:string[]; created:string }

const KEY = "oxbridge-supercurricular-graph-v1"

export default function KnowledgeGraphPage() {
  const [nodes,setNodes]=useState<Node[]>([])
  const [title,setTitle]=useState("")
  const [type,setType]=useState("Book / article")
  const [concepts,setConcepts]=useState("")
  const [claim,setClaim]=useState("")
  const [question,setQuestion]=useState("")
  const [loaded,setLoaded]=useState(false)

  useEffect(()=>{ try { const saved=localStorage.getItem(KEY); if(saved) setNodes(JSON.parse(saved)); const progress=JSON.parse(localStorage.getItem("oxbridge-tutor-progress-v2")||"{}"); const activities=Array.isArray(progress.activities)?progress.activities:[]; if(!saved && activities.length) setNodes(activities.slice(0,20).map((a:{title?:string;type?:string;learned?:string;question?:string},i:number)=>({id:`imported-${i}`,title:a.title||`Activity ${i+1}`,type:a.type||"Academic activity",concepts:[],claim:a.learned||"",question:a.question||"",links:[],created:new Date().toISOString()}))) } catch {} setLoaded(true) },[])
  useEffect(()=>{ if(loaded) localStorage.setItem(KEY,JSON.stringify(nodes)) },[nodes,loaded])

  const allConcepts=useMemo(()=>Array.from(new Set(nodes.flatMap(n=>n.concepts))).sort(),[nodes])
  const suggestedLinks=useMemo(()=>nodes.map(node=>({id:node.id,related:nodes.filter(other=>other.id!==node.id && other.concepts.some(c=>node.concepts.includes(c))).map(x=>x.id)})),[nodes])

  const addNode=()=>{
    if(!title.trim()) return
    const conceptList=concepts.split(",").map(x=>x.trim().toLowerCase()).filter(Boolean)
    const id=`node-${Date.now()}`
    const linked=suggestedLinks.filter(x=>x.related.length).flatMap(x=>x.related).slice(0,3)
    const node:Node={id,title:title.trim(),type,concepts:conceptList,claim:claim.trim(),question:question.trim(),links:Array.from(new Set(linked)),created:new Date().toISOString()}
    setNodes(items=>[node,...items])
    setTitle(""); setConcepts(""); setClaim(""); setQuestion("")
    try {
      const progress=JSON.parse(localStorage.getItem("oxbridge-tutor-progress-v2")||"{}")
      const activities=Array.isArray(progress.activities)?progress.activities:[]
      progress.activities=[{title:node.title,type:node.type,learned:node.claim,question:node.question},...activities].slice(0,100)
      localStorage.setItem("oxbridge-tutor-progress-v2",JSON.stringify(progress))
    } catch {}
  }

  const toggleLink=(a:string,b:string)=>setNodes(items=>items.map(node=>node.id!==a?node:{...node,links:node.links.includes(b)?node.links.filter(x=>x!==b):[...node.links,b]}))

  return <main className="min-h-screen bg-[#f6f8f8] text-[#172b3a]">
    <header className="border-b bg-white"><div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6"><Button asChild variant="ghost"><Link href="/student-home"><ArrowLeft />Student Home</Link></Button><Badge variant="outline"><Network className="size-3.5" />Knowledge Graph</Badge></div></header>
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <section className="mb-6"><p className="text-xs font-bold uppercase tracking-[.18em] text-[#147d91]">Supercurricular depth</p><h1 className="mt-2 font-serif text-4xl font-bold">Connect what you have read, watched and investigated.</h1><p className="mt-2 max-w-3xl text-slate-600">The aim is not to collect impressive titles. It is to build links between ideas, disagreements, evidence and questions you could defend in interview.</p></section>

      <section className="grid gap-5 lg:grid-cols-[.75fr_1.25fr]">
        <Card className="shadow-none"><CardHeader><CirclePlus className="size-6 text-[#147d91]" /><CardTitle className="font-serif text-2xl">Add academic activity</CardTitle><CardDescription>One strong claim and one unresolved question are more useful than a long summary.</CardDescription></CardHeader><CardContent className="space-y-3"><input value={title} onChange={e=>setTitle(e.target.value)} className="w-full rounded-xl border px-3 py-2.5" placeholder="Book, lecture, article, project…" /><select value={type} onChange={e=>setType(e.target.value)} className="w-full rounded-xl border bg-white px-3 py-2.5"><option>Book / article</option><option>Lecture / podcast</option><option>Research project</option><option>Experiment / practical</option><option>Reading Room</option><option>Competition / problem set</option></select><input value={concepts} onChange={e=>setConcepts(e.target.value)} className="w-full rounded-xl border px-3 py-2.5" placeholder="Concepts, comma separated" /><Textarea rows={4} value={claim} onChange={e=>setClaim(e.target.value)} placeholder="What did this change, challenge or clarify in your thinking?" /><Textarea rows={3} value={question} onChange={e=>setQuestion(e.target.value)} placeholder="What question are you left with?" /><Button onClick={addNode} disabled={!title.trim()}><CirclePlus />Add to graph</Button></CardContent></Card>

        <div className="space-y-4"><Card className="shadow-none"><CardHeader><div className="flex items-center justify-between"><div><CardTitle className="font-serif text-2xl">Concept network</CardTitle><CardDescription>{nodes.length} activities · {allConcepts.length} recurring concepts</CardDescription></div><Sparkles className="size-6 text-[#147d91]" /></div></CardHeader><CardContent>{allConcepts.length ? <div className="flex flex-wrap gap-2">{allConcepts.map(concept=><Badge key={concept} variant="outline">{concept} · {nodes.filter(n=>n.concepts.includes(concept)).length}</Badge>)}</div> : <p className="text-sm text-slate-500">Add concepts to activities and the graph will begin surfacing recurring ideas automatically.</p>}</CardContent></Card>

        {nodes.map(node=><Card key={node.id} className="shadow-none"><CardHeader><div className="flex items-start justify-between gap-3"><div><Badge variant="outline">{node.type}</Badge><CardTitle className="mt-2 font-serif text-xl">{node.title}</CardTitle></div><Button size="sm" variant="ghost" onClick={()=>setNodes(items=>items.filter(x=>x.id!==node.id))}><Trash2 /></Button></div></CardHeader><CardContent className="space-y-3">{node.claim&&<div><p className="text-xs font-bold uppercase tracking-wider text-slate-500">What changed in my thinking</p><p className="mt-1 text-sm leading-relaxed">{node.claim}</p></div>}{node.question&&<div className="rounded-xl bg-[#edf7f8] p-3"><p className="text-xs font-bold uppercase tracking-wider text-[#147d91]">Unresolved question</p><p className="mt-1 font-serif">{node.question}</p></div>}<div className="flex flex-wrap gap-2">{node.concepts.map(c=><Badge key={c} variant="outline">{c}</Badge>)}</div>{nodes.length>1&&<div><p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">Connect to another activity</p><div className="flex flex-wrap gap-2">{nodes.filter(n=>n.id!==node.id).slice(0,6).map(other=><button key={other.id} onClick={()=>toggleLink(node.id,other.id)} className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs ${node.links.includes(other.id)?"border-[#147d91] bg-[#edf7f8] text-[#147d91]":"bg-white text-slate-500"}`}><Link2 className="size-3" />{other.title}</button>)}</div></div>}</CardContent></Card>)}</div>
      </section>

      <div className="mt-5 flex flex-wrap gap-2"><Button asChild><Link href="/reading-room"><BookOpen />Add depth in Reading Room</Link></Button><Button asChild variant="outline"><Link href="/research-project">Turn a connection into a research project <ArrowRight /></Link></Button></div>
    </div>
  </main>
}

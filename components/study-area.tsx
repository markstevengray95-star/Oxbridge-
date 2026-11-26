"use client"
import Link from "next/link"
import {ArrowRight,ChevronDown,Search} from "lucide-react"
import {useState} from "react"
import {useNavigationAccess} from "@/components/navigation-access-provider"
import {searchTools,workspaceTools,type Area,type Tool} from "@/lib/navigation-directory"
const descriptions:Partial<Record<Area,string>>={interviews:"Choose an interview format or build your interview skills.",tests:"Sit a practice test or improve your results.",application:"Plan your application, improve written work and build an academic portfolio.",progress:"Review saved evidence, revisit difficult topics and manage school assignments."}
function Activity({tool}:{tool:Tool}){return <Link href={tool.href} className="flex items-center gap-3 rounded-xl border bg-white p-4 hover:border-[#147d91] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#147d91]"><span className="min-w-0 flex-1"><strong className="block">{tool.label}</strong><span className="mt-1 block text-sm text-slate-600">{tool.description}</span></span><ArrowRight className="size-4 shrink-0 text-[#147d91]" aria-hidden="true"/></Link>}
export function StudyArea({area,title}:{area:Area;title:string}){
 const access=useNavigationAccess()
 const [query,setQuery]=useState("")
 const all=searchTools(access,query).filter(t=>t.area===area)
 const groups=workspaceTools(area,all)
 return <main className="min-h-screen bg-[#f5f7f8] text-[#102a43]"><div className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6">
 <header><Link href="/student-home" className="text-sm font-semibold text-[#147d91]">Home /</Link><h1 className="mt-3 font-serif text-4xl font-bold">{title}</h1><p className="mt-2 max-w-2xl text-slate-600">{descriptions[area]}</p></header>
 <label className="flex items-center gap-2 rounded-xl border bg-white px-4"><Search className="size-5 text-slate-500" aria-hidden="true"/><input aria-label={"Find activities in "+title} placeholder="Find an activity…" value={query} onChange={e=>setQuery(e.target.value)} className="min-w-0 flex-1 bg-transparent py-3 text-sm outline-none"/></label>
 {query.trim()?<section aria-label="Matching activities"><div className="grid gap-3 sm:grid-cols-2">{all.map(t=><Activity key={t.href} tool={t}/>)}</div></section>:groups.map(g=>{
 const primary=g.items.filter(t=>t.featured).slice(0,2)
 const visible=primary.length?primary:g.items.slice(0,1)
 const rest=g.items.filter(t=>!visible.some(x=>x.href===t.href))
 return <section key={g.title} className="rounded-2xl border bg-white p-4 sm:p-6"><h2 className="font-serif text-2xl font-bold">{g.title}</h2><p className="mt-1 text-sm text-slate-600">{g.description}</p><div className="mt-4 grid gap-3 sm:grid-cols-2">{visible.map(t=><Activity key={t.href} tool={t}/>)}</div>{rest.length>0&&<details className="mt-3"><summary className="flex cursor-pointer list-none items-center gap-2 rounded-lg px-2 py-3 text-sm font-semibold text-[#147d91]"><ChevronDown className="size-4" aria-hidden="true"/>More {g.title.toLowerCase()} options ({rest.length})</summary><div className="grid gap-2 sm:grid-cols-2">{rest.map(t=><Activity key={t.href} tool={t}/>)}</div></details>}</section>})}
 {!all.length&&<p className="text-sm text-slate-600">{access.signedIn?"No matching activities.":"Sign in to see your preparation activities."}</p>}
 </div></main>
}

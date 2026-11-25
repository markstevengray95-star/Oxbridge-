"use client"
import Link from "next/link"
import {ArrowRight,Search} from "lucide-react"
import {useState} from "react"
import {useNavigationAccess} from "@/components/navigation-access-provider"
import {searchTools,type Area} from "@/lib/navigation-directory"
const descriptions:Partial<Record<Area,string>>={interviews:"Choose an interview format, practise academic reasoning or explore the complete interview toolkit.",tests:"Start a timed paper, practise questions or revisit mistakes.",application:"Plan your application, prepare written work and develop your academic interests.",progress:"Review saved results, feedback and school assignments."}
export function StudyArea({area,title}:{area:Area;title:string}){
 const access=useNavigationAccess()
 const [query,setQuery]=useState("")
 const [expanded,setExpanded]=useState(false)
 const all=searchTools(access,query).filter(t=>t.area===area)
 const featured=all.filter(t=>t.featured)
 const more=all.filter(t=>!t.featured)
 return <main className="min-h-screen bg-[#f5f7f8] text-[#102a43]"><div className="mx-auto max-w-5xl space-y-5 px-4 py-8 sm:px-6">
 <header><Link href="/student-home" className="text-sm font-semibold text-[#147d91]">Home /</Link><h1 className="mt-3 font-serif text-4xl font-bold">{title}</h1><p className="mt-2 max-w-2xl text-slate-600">{descriptions[area]}</p></header>
 <label className="flex items-center gap-2 rounded-xl border bg-white px-4"><Search className="size-5 text-slate-500" aria-hidden="true"/><input aria-label={"Find activities in "+title} placeholder="Find an activity…" value={query} onChange={e=>setQuery(e.target.value)} className="min-w-0 flex-1 bg-transparent py-3 text-sm outline-none"/></label>
 <section aria-label="Recommended activities"><h2 className="mb-3 font-serif text-xl font-bold">{query.trim()?"Matching activities":"Start here"}</h2><div className="grid gap-3 sm:grid-cols-2">{(query.trim()?all:featured).map(t=><Link key={t.href} href={t.href} className="flex items-center gap-3 rounded-xl border bg-white p-4 hover:border-[#147d91] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#147d91]"><span className="min-w-0 flex-1"><strong className="block">{t.label}</strong><span className="mt-1 block text-sm text-slate-600">{t.description}</span></span><ArrowRight className="size-5 shrink-0 text-[#147d91]" aria-hidden="true"/></Link>)}</div>
 {!all.length&&<p className="text-sm text-slate-600">{access.signedIn?"No matching activities.":"Sign in to see your preparation activities."}</p>}</section>
 {!query.trim()&&more.length>0&&<section><button type="button" aria-expanded={expanded} onClick={()=>setExpanded(v=>!v)} className="w-full rounded-xl border bg-white px-4 py-3 text-left font-semibold">{expanded?"Hide":"Explore"} more activities ({more.length})</button>{expanded&&<div className="mt-3 grid gap-2 sm:grid-cols-2">{more.map(t=><Link key={t.href} href={t.href} className="rounded-lg border bg-white p-3 hover:border-[#147d91]"><strong className="block text-sm">{t.label}</strong><span className="mt-1 block text-xs text-slate-600">{t.description}</span></Link>)}</div>}</section>}
 </div></main>
}

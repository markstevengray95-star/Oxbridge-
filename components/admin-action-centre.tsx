import Link from "next/link"
import {Activity,ArrowRight,ClipboardCheck,FileLock2,GraduationCap,KeyRound,Mic2,ShieldAlert,Users} from "lucide-react"

/** Render only after the server has verified administrator access. */
export const adminActions=[
 {href:"/admin/practice-tracking",title:"Monitor practice activity",detail:"Account sign-ins, tests, transcripts and recorded study time",group:"monitoring",priority:true,icon:"activity"},
 {href:"/admin/practice-access",title:"Manage practice accounts",detail:"Create or disable test logins and manage access",group:"accounts",priority:true,icon:"key"},
 {href:"/admin/managed-school-logins",title:"Manage school logins",detail:"Teachers, students and school-linked accounts",group:"accounts",priority:true,icon:"school"},
 {href:"/admin/safeguarding",title:"Safeguarding review",detail:"Review requests that need human safeguarding oversight",group:"safety",priority:true,icon:"shield"},
 {href:"/admin/users",title:"Users and password resets",detail:"Account status and secure reset actions",group:"accounts",priority:false,icon:"users"},
 {href:"/school/teachers",title:"Teacher accounts and links",detail:"Role assignment and student connections",group:"accounts",priority:false,icon:"school"},
 {href:"/school-dashboard",title:"School workspace",detail:"Cohorts, assignments and school progress",group:"accounts",priority:false,icon:"school"},
 {href:"/admin/launch-readiness",title:"Launch readiness",detail:"Release, compliance and operational checks",group:"monitoring",priority:false,icon:"check"},
 {href:"/admin/quality",title:"Quality console",detail:"Question quality and platform review",group:"monitoring",priority:false,icon:"check"},
 {href:"/admin/privacy-requests",title:"Privacy requests",detail:"Data subject requests and privacy follow-up",group:"safety",priority:false,icon:"lock"},
 {href:"/gemini-live-interview",title:"Gemini Live",detail:"Inspect live voice experience",group:"advanced",priority:false,icon:"mic"},
 {href:"/panel-interview",title:"Two-voice panel",detail:"Alternative interview format",group:"advanced",priority:false,icon:"mic"},
 {href:"/tutor-autopilot",title:"Tutor Autopilot",detail:"Advanced tutor orchestration tools",group:"advanced",priority:false,icon:"check"},
] as const
const symbols={activity:Activity,key:KeyRound,school:GraduationCap,shield:ShieldAlert,users:Users,check:ClipboardCheck,lock:FileLock2,mic:Mic2}
const groups=[{id:"accounts",title:"Accounts and schools",detail:"Identity, school access and account administration"},{id:"monitoring",title:"Monitoring and quality",detail:"Platform readiness and review tools"},{id:"safety",title:"Safeguarding and privacy",detail:"Oversight and statutory requests"},{id:"advanced",title:"Advanced practice tools",detail:"Less frequently used practice engines"}] as const
export function AdminActionCentre(){
 const featured=adminActions.filter(a=>a.priority)
 return <section aria-labelledby="admin-actions-title" className="space-y-4">
  <div><p className="fellow-eyebrow">Administrator actions</p><h2 id="admin-actions-title" className="fellow-section-title mt-1">What needs attention?</h2><p className="fellow-description mt-1">Go straight to daily management. More specialised tools remain available below.</p></div>
  <div className="grid gap-3 sm:grid-cols-2">{featured.map(item=>{const Icon=symbols[item.icon];return <Link key={item.href} href={item.href} className="fellow-tile flex min-h-24 items-start gap-3 p-4"><span className="grid size-10 shrink-0 place-items-center rounded-lg bg-[#e9f1ee] text-[#326d71]"><Icon className="size-5" aria-hidden="true"/></span><span className="min-w-0 flex-1"><strong className="block text-sm">{item.title}</strong><span className="mt-1 block text-xs leading-5 text-slate-600">{item.detail}</span></span><ArrowRight className="mt-1 size-4 shrink-0 text-[#397c80]" aria-hidden="true"/></Link>})}</div>
  <details className="fellow-panel p-4 sm:p-5"><summary className="cursor-pointer font-semibold">More administrative tools ({adminActions.length-featured.length})</summary><div className="mt-4 space-y-5">{groups.map(group=>{const rows=adminActions.filter(a=>a.group===group.id&&!a.priority);if(!rows.length)return null;return <section key={group.id}><h3 className="font-semibold">{group.title}</h3><p className="mb-2 text-xs text-slate-600">{group.detail}</p><div className="grid gap-2 sm:grid-cols-2">{rows.map(item=><Link key={item.href} href={item.href} className="fellow-tile flex min-h-12 items-center justify-between gap-2 p-3 text-sm font-semibold">{item.title}<ArrowRight className="size-4 shrink-0 text-[#397c80]" aria-hidden="true"/></Link>)}</div></section>})}</div></details>
 </section>
}

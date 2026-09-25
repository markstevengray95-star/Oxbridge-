import Link from "next/link"
import { redirect } from "next/navigation"
import { AlertTriangle, ShieldCheck } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getAppAdminAccess } from "@/lib/auth/admin"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { updateSafeguardingStatus } from "./actions"

export const dynamic="force-dynamic"

type Report={id:string;user_id:string|null;category:string;details:string;contact_requested:boolean;status:string;created_at:string;updated_at:string}

export default async function AdminSafeguardingPage(){
  const supabase=await createClient()
  const {data}=await supabase.auth.getClaims()
  const userId=typeof data?.claims?.sub==="string"?data.claims.sub:null
  const email=typeof data?.claims?.email==="string"?data.claims.email:null
  if(!userId)redirect("/admin/login")
  const access=await getAppAdminAccess(userId,email)
  if(!access.isAdmin)redirect("/admin/login?error=not-authorized")
  const admin=createAdminClient()
  const {data:rows,error}=await admin.from("safeguarding_reports").select("id,user_id,category,details,contact_requested,status,created_at,updated_at").order("created_at",{ascending:false}).limit(100)
  const reports=(rows??[]) as Report[]
  const users=await Promise.all(reports.map(async report=>{
    if(!report.user_id)return [report.id,null] as const
    try{const {data:user}=await admin.auth.admin.getUserById(report.user_id);return [report.id,user.user?.email??null] as const}catch{return [report.id,null] as const}
  }))
  const emails=new Map(users)
  const open=reports.filter(r=>r.status==="open").length
  const reviewing=reports.filter(r=>r.status==="reviewing").length

  return <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 sm:px-6"><div className="mx-auto max-w-6xl space-y-6">
    <div className="flex items-center justify-between gap-3"><Button asChild variant="ghost"><Link href="/admin">← Admin</Link></Button><Badge><ShieldCheck className="mr-1 size-3"/>Admin only</Badge></div>
    <section><p className="text-xs font-bold uppercase tracking-[.18em] text-teal-700">Human review queue</p><h1 className="mt-2 font-serif text-4xl font-bold">Safeguarding concerns</h1><p className="mt-2 max-w-3xl text-slate-600">Treat these reports as confidential need-to-know records. AI must not decide whether a safeguarding concern is valid. Follow the organisation's safeguarding procedure and record only necessary information.</p></section>
    <div className="grid gap-4 sm:grid-cols-3"><Metric label="Open" value={open}/><Metric label="Reviewing" value={reviewing}/><Metric label="Last 100" value={reports.length}/></div>
    {error&&<div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm">Safeguarding table unavailable: {error.message}. Apply the launch compliance migration before using this dashboard.</div>}
    <div className="space-y-4">{reports.map(report=><Card key={report.id} className={report.status==="open"?"border-amber-300":""}><CardHeader><div className="flex flex-wrap items-center gap-2"><Badge variant={report.status==="open"?"default":"outline"}>{report.status}</Badge><Badge variant="outline">{report.category}</Badge>{report.contact_requested&&<Badge variant="outline">Contact requested</Badge>}<span className="ml-auto text-xs text-slate-500">{new Date(report.created_at).toLocaleString("en-GB")}</span></div><CardTitle className="font-serif text-xl">Report {report.id.slice(0,8)}</CardTitle><CardDescription>{emails.get(report.id)||report.user_id||"Account deleted / unavailable"}</CardDescription></CardHeader><CardContent className="space-y-4"><div className="rounded-xl bg-slate-50 p-4 text-sm leading-6 whitespace-pre-wrap">{report.details}</div><form action={updateSafeguardingStatus} className="flex flex-wrap items-center gap-2"><input type="hidden" name="id" value={report.id}/><select name="status" defaultValue={report.status} className="h-9 rounded-md border bg-white px-2 text-sm"><option value="open">Open</option><option value="reviewing">Reviewing</option><option value="actioned">Actioned</option><option value="closed">Closed</option></select><Button size="sm" type="submit">Update status</Button></form></CardContent></Card>)}{!reports.length&&!error&&<div className="rounded-2xl border bg-white p-8 text-center text-sm text-slate-500">No safeguarding reports are currently in the queue.</div>}</div>
    <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-900"><AlertTriangle className="mr-2 inline size-4"/><strong>Operational requirement:</strong> this dashboard must be monitored by a named human safeguarding owner. A dashboard alone does not create an effective safeguarding process.</div>
  </div></main>
}
function Metric({label,value}:{label:string;value:number}){return <Card><CardHeader><CardDescription>{label}</CardDescription><CardTitle className="font-serif text-3xl">{value}</CardTitle></CardHeader></Card>}

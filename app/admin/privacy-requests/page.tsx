import Link from "next/link"
import { redirect } from "next/navigation"
import { ShieldCheck } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getAppAdminAccess } from "@/lib/auth/admin"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { updatePrivacyRequestStatus } from "./actions"

export const dynamic="force-dynamic"
type RequestRow={id:string;user_id:string;request_type:string;details:string|null;status:string;created_at:string;updated_at:string}

export default async function AdminPrivacyRequestsPage(){
  const supabase=await createClient()
  const {data}=await supabase.auth.getClaims()
  const userId=typeof data?.claims?.sub==="string"?data.claims.sub:null
  const email=typeof data?.claims?.email==="string"?data.claims.email:null
  if(!userId)redirect("/admin/login")
  const access=await getAppAdminAccess(userId,email)
  if(!access.isAdmin)redirect("/admin/login?error=not-authorized")
  const admin=createAdminClient()
  const {data:rows,error}=await admin.from("privacy_requests").select("id,user_id,request_type,details,status,created_at,updated_at").order("created_at",{ascending:false}).limit(100)
  const requests=(rows??[]) as RequestRow[]
  const users=await Promise.all(requests.map(async row=>{try{const {data:user}=await admin.auth.admin.getUserById(row.user_id);return [row.id,user.user?.email??row.user_id] as const}catch{return [row.id,row.user_id] as const}}))
  const emails=new Map(users)
  return <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 sm:px-6"><div className="mx-auto max-w-6xl space-y-6">
    <div className="flex items-center justify-between"><Button asChild variant="ghost"><Link href="/admin">← Admin</Link></Button><Badge><ShieldCheck className="mr-1 size-3"/>Admin only</Badge></div>
    <section><p className="text-xs font-bold uppercase tracking-[.18em] text-teal-700">Data-protection operations</p><h1 className="mt-2 font-serif text-4xl font-bold">Privacy-rights requests</h1><p className="mt-2 max-w-3xl text-slate-600">Human review queue for correction, restriction, objection, portability, erasure and other requests. Record the minimum information needed and verify identity appropriately before releasing or changing personal data.</p></section>
    <div className="grid gap-4 sm:grid-cols-3"><Metric label="Open" value={requests.filter(r=>r.status==="open").length}/><Metric label="In progress" value={requests.filter(r=>r.status==="in_progress").length}/><Metric label="Last 100" value={requests.length}/></div>
    {error&&<div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm">Privacy request table unavailable: {error.message}. Apply the launch compliance migration before using this dashboard.</div>}
    <div className="space-y-4">{requests.map(row=><Card key={row.id}><CardHeader><div className="flex flex-wrap items-center gap-2"><Badge variant={row.status==="open"?"default":"outline"}>{row.status.replaceAll("_"," ")}</Badge><Badge variant="outline">{row.request_type}</Badge><span className="ml-auto text-xs text-slate-500">{new Date(row.created_at).toLocaleString("en-GB")}</span></div><CardTitle className="font-serif text-xl">{emails.get(row.id)}</CardTitle><CardDescription>Request {row.id.slice(0,8)}</CardDescription></CardHeader><CardContent className="space-y-4"><div className="rounded-xl bg-slate-50 p-4 text-sm leading-6 whitespace-pre-wrap">{row.details||"No additional details supplied."}</div><form action={updatePrivacyRequestStatus} className="flex flex-wrap items-center gap-2"><input type="hidden" name="id" value={row.id}/><select name="status" defaultValue={row.status} className="h-9 rounded-md border bg-white px-2 text-sm"><option value="open">Open</option><option value="in_progress">In progress</option><option value="completed">Completed</option><option value="rejected">Rejected</option></select><Button size="sm" type="submit">Update status</Button></form></CardContent></Card>)}{!requests.length&&!error&&<div className="rounded-2xl border bg-white p-8 text-center text-sm text-slate-500">No privacy-rights requests are currently in the queue.</div>}</div>
  </div></main>
}
function Metric({label,value}:{label:string;value:number}){return <Card><CardHeader><CardDescription>{label}</CardDescription><CardTitle className="font-serif text-3xl">{value}</CardTitle></CardHeader></Card>}

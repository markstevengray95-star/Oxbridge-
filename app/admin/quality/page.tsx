import Link from "next/link"
import { redirect } from "next/navigation"
import { BarChart3, Brain, Gauge, ShieldCheck, Sparkles, Users } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getAppAdminAccess } from "@/lib/auth/admin"
import { createAdminClient, hasSupabaseAdminConfig } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

type QualityStats = {
  users: number
  paid: number
  tutorPlans: number
  usageEvents: number
  storedStates: number
  interviewStates: number
  readingStates: number
}

async function stats(): Promise<QualityStats> {
  if (!hasSupabaseAdminConfig()) return { users:0, paid:0, tutorPlans:0, usageEvents:0, storedStates:0, interviewStates:0, readingStates:0 }
  const admin=createAdminClient()
  const [profiles,subs,plans,usage,states]=await Promise.all([
    admin.from("profiles").select("id",{count:"exact",head:true}),
    admin.from("subscriptions").select("user_id",{count:"exact",head:true}).in("status",["active","trialing"]),
    admin.from("tutor_plans").select("id",{count:"exact",head:true}),
    admin.from("usage_events").select("id",{count:"exact",head:true}),
    admin.from("user_state").select("state_key"),
  ])
  const keys=(states.data??[]).map(row=>String(row.state_key??""))
  return {
    users:profiles.count??0,
    paid:subs.count??0,
    tutorPlans:plans.count??0,
    usageEvents:usage.count??0,
    storedStates:keys.length,
    interviewStates:keys.filter(key=>/interview|gemini|reasoning/i.test(key)).length,
    readingStates:keys.filter(key=>/reading|supercurricular/i.test(key)).length,
  }
}

export default async function AdminQualityPage(){
 const supabase=await createClient();const {data}=await supabase.auth.getClaims();const claims=data?.claims
 const userId=typeof claims?.sub==="string"?claims.sub:null;const email=typeof claims?.email==="string"?claims.email:null
 if(!userId)redirect("/admin/login?next=/admin/quality")
 const access=await getAppAdminAccess(userId,email);if(!access.isAdmin)redirect("/admin/login?error=not-authorized")
 const s=await stats()
 const signals=[
  {label:"Accounts",value:s.users,note:"Profiles attached to the platform.",icon:Users},
  {label:"Active paid access",value:s.paid,note:"Active or trialling subscriptions.",icon:Sparkles},
  {label:"Tutor plans",value:s.tutorPlans,note:"Personalised plans generated and stored.",icon:Brain},
  {label:"Usage events",value:s.usageEvents,note:"Server-side metering/usage records.",icon:Gauge},
  {label:"Stored cloud states",value:s.storedStates,note:"Cross-device continuity records.",icon:BarChart3},
  {label:"Interview-linked states",value:s.interviewStates,note:"Interview/reasoning continuity records.",icon:ShieldCheck},
 ]
 return <main className="min-h-screen bg-[#eef3f4] px-4 py-8 text-[#172b3a] sm:px-6"><div className="mx-auto max-w-7xl space-y-6"><div className="flex flex-wrap items-center justify-between gap-4"><div><div className="flex gap-2"><Badge className="bg-[#102a43] text-white">Admin Quality Control</Badge><Badge variant="outline">Unrestricted</Badge></div><h1 className="mt-3 font-serif text-4xl font-bold">Improve the product from real usage signals.</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-[#667984]">This console focuses on operational quality and feature adoption. It does not expose passwords or private student transcript content.</p></div><Button asChild variant="outline"><Link href="/admin">Admin home</Link></Button></div>
 <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{signals.map(item=><Card key={item.label}><CardHeader><item.icon className="size-5 text-[#147d91]"/><CardDescription>{item.label}</CardDescription><CardTitle className="font-serif text-3xl">{item.value.toLocaleString()}</CardTitle></CardHeader><CardContent><p className="text-sm text-[#667984]">{item.note}</p></CardContent></Card>)}</section>
 <section className="grid gap-5 lg:grid-cols-2"><Card><CardHeader><CardTitle className="font-serif text-2xl">Admin entitlement</CardTitle><CardDescription>Your role is resolved on the server.</CardDescription></CardHeader><CardContent className="space-y-2">{access.capabilities.map(capability=><div key={capability} className="flex items-center gap-2 rounded-xl border p-3 text-sm"><ShieldCheck className="size-4 text-emerald-700"/><span>{capability.replaceAll("_"," ")}</span></div>)}</CardContent></Card><Card><CardHeader><CardTitle className="font-serif text-2xl">Quality workflow</CardTitle><CardDescription>Use these areas to spot where the experience needs refinement.</CardDescription></CardHeader><CardContent className="space-y-3"><Button asChild variant="outline" className="w-full justify-start"><Link href="/admin/users">Account activation / reset patterns</Link></Button><Button asChild variant="outline" className="w-full justify-start"><Link href="/question-provenance">Question provenance & quality</Link></Button><Button asChild variant="outline" className="w-full justify-start"><Link href="/preparation-readiness">Student-facing readiness UX</Link></Button><Button asChild variant="outline" className="w-full justify-start"><Link href="/tutor-autopilot">Autopilot experience</Link></Button><p className="pt-2 text-xs leading-5 text-slate-500">A future analytics event can be added whenever a new feature needs abandonment, latency or regeneration tracking. The server-side usage table remains the canonical source for metered AI usage.</p></CardContent></Card></section></div></main>
}

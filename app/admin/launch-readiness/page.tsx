import Link from "next/link"
import { redirect } from "next/navigation"
import { AlertTriangle, CheckCircle2, CircleDashed, ExternalLink, ShieldCheck } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getAppAdminAccess } from "@/lib/auth/admin"
import { createAdminClient, hasSupabaseAdminConfig } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { isStripeConfigured } from "@/lib/stripe/server"
import { hasGeminiApiKey } from "@/lib/gemini/api-key"

export const dynamic="force-dynamic"

type Check={label:string;ok:boolean;detail:string;action?:string;href?:string}

async function tableReady(table:string){
  if(!hasSupabaseAdminConfig())return false
  try{const admin=createAdminClient();const {error}=await admin.from(table).select("*").limit(1);return !error}catch{return false}
}

export default async function LaunchReadinessPage(){
  const supabase=await createClient()
  const {data}=await supabase.auth.getClaims()
  const userId=typeof data?.claims?.sub==="string"?data.claims.sub:null
  const email=typeof data?.claims?.email==="string"?data.claims.email:null
  if(!userId)redirect("/admin/login")
  const access=await getAppAdminAccess(userId,email)
  if(!access.isAdmin)redirect("/admin/login?error=not-authorized")

  const [legalAcceptance,privacyQueue,safeguardingQueue,subscriptions]=await Promise.all([
    tableReady("legal_acceptances"),tableReady("privacy_requests"),tableReady("safeguarding_reports"),tableReady("subscriptions")
  ])
  const controller=Boolean(process.env.NEXT_PUBLIC_DATA_CONTROLLER_NAME?.trim())
  const address=Boolean(process.env.NEXT_PUBLIC_DATA_CONTROLLER_ADDRESS?.trim())
  const privacyContact=Boolean(process.env.NEXT_PUBLIC_PRIVACY_CONTACT_EMAIL?.trim())
  const legalContact=Boolean(process.env.NEXT_PUBLIC_LEGAL_CONTACT_EMAIL?.trim())
  const safeguardingContact=Boolean(process.env.NEXT_PUBLIC_SAFEGUARDING_CONTACT_EMAIL?.trim())
  const supportContact=Boolean(process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim())
  const adminEmails=Boolean(process.env.ADMIN_EMAILS?.trim())
  const webhook=Boolean(process.env.STRIPE_WEBHOOK_SECRET?.trim())

  const checks:Check[]=[
    {label:"Controller identity",ok:controller&&address,detail:controller&&address?"Legal/controller name and contact address are configured.":"Add the real controller/trader name and contact address in Vercel.",action:"Vercel env"},
    {label:"Privacy contact",ok:privacyContact,detail:privacyContact?"A public privacy contact is configured.":"Set NEXT_PUBLIC_PRIVACY_CONTACT_EMAIL to a monitored inbox."},
    {label:"Legal/support contacts",ok:legalContact&&supportContact,detail:legalContact&&supportContact?"Legal and support contacts are configured.":"Configure legal and support inboxes before taking payments."},
    {label:"Safeguarding contact",ok:safeguardingContact,detail:safeguardingContact?"A public safeguarding contact is configured.":"Set a monitored safeguarding inbox and name a human owner."},
    {label:"Compliance database migration",ok:legalAcceptance&&privacyQueue&&safeguardingQueue,detail:legalAcceptance&&privacyQueue&&safeguardingQueue?"Legal acceptance, privacy-rights and safeguarding tables are available.":"Run supabase/migrations/20260925_add_launch_compliance_controls.sql in the production Supabase SQL Editor."},
    {label:"Billing database",ok:subscriptions,detail:subscriptions?"Subscription table is available.":"Restore the core billing schema before accepting payment."},
    {label:"Stripe server key",ok:isStripeConfigured(),detail:isStripeConfigured()?"Stripe Checkout can be created server-side.":"Set STRIPE_SECRET_KEY in production."},
    {label:"Stripe webhook",ok:webhook,detail:webhook?"Stripe webhook secret is configured.":"Set STRIPE_WEBHOOK_SECRET and verify the production webhook endpoint."},
    {label:"Supabase admin key",ok:hasSupabaseAdminConfig(),detail:hasSupabaseAdminConfig()?"Server-side admin operations can run.":"Set SUPABASE_SECRET_KEY server-side. Never expose it with NEXT_PUBLIC_."},
    {label:"Admin allowlist",ok:adminEmails,detail:adminEmails?"Admin access has an explicit server allowlist.":"Set ADMIN_EMAILS to only the intended administrator accounts."},
    {label:"Gemini",ok:hasGeminiApiKey(),detail:hasGeminiApiKey()?"AI services have a server credential; student safety policy is injected into core AI routes.":"Gemini AI will degrade to local fallbacks where available until GEMINI_API_KEY is configured."},
    {label:"Public legal surfaces",ok:true,detail:"Privacy Notice, Cookie Notice, Terms, Privacy Centre, Safeguarding and School Data pages are linked globally.",href:"/privacy"},
    {label:"Data rights controls",ok:true,detail:"Authenticated export, privacy-request and account-deletion routes are built. Their queues require the compliance database migration.",href:"/privacy-centre"},
    {label:"Human safety operations",ok:true,detail:"Admin-only safeguarding and privacy request queues are built. A named human must still monitor and operate them.",href:"/admin/safeguarding"},
  ]

  const critical=checks.filter(item=>!item.ok).length
  return <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 sm:px-6"><div className="mx-auto max-w-6xl space-y-6">
    <div className="flex items-center justify-between gap-3"><Button asChild variant="ghost"><Link href="/admin">← Admin</Link></Button><Badge><ShieldCheck className="mr-1 size-3"/>Admin only</Badge></div>
    <section className="grid gap-5 lg:grid-cols-[1.2fr_.8fr]"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-teal-700">Commercial launch gate</p><h1 className="mt-2 font-serif text-4xl font-bold">Public launch readiness</h1><p className="mt-3 max-w-3xl text-slate-600">This page checks technical configuration that ScholarBridge can verify itself. It cannot certify legal compliance, replace a DPIA, choose your lawful bases, sign school DPAs or appoint a safeguarding lead.</p></div><Card className={critical?"border-amber-300 bg-amber-50":"border-emerald-300 bg-emerald-50"}><CardHeader><CardDescription>Technical blockers detected</CardDescription><CardTitle className="font-serif text-5xl">{critical}</CardTitle></CardHeader><CardContent><p className="text-sm">{critical?"Resolve every red/amber configuration item before public paid launch.":"Automated technical checks are green. Complete the human/legal launch gates below."}</p></CardContent></Card></section>

    <section className="grid gap-3 md:grid-cols-2">{checks.map(item=><Card key={item.label} className={item.ok?"border-emerald-200":"border-amber-300 bg-amber-50"}><CardHeader className="pb-2"><div className="flex items-center gap-2">{item.ok?<CheckCircle2 className="size-5 text-emerald-700"/>:<AlertTriangle className="size-5 text-amber-700"/>}<CardTitle className="font-serif text-xl">{item.label}</CardTitle></div></CardHeader><CardContent><p className="text-sm leading-6 text-slate-600">{item.detail}</p>{item.href&&<Button asChild variant="link" className="mt-2 h-auto p-0"><Link href={item.href}>Open <ExternalLink className="size-3"/></Link></Button>}</CardContent></Card>)} </section>

    <Card><CardHeader><CardTitle className="font-serif text-2xl">Human/legal launch gates</CardTitle><CardDescription>These cannot be completed automatically by the app.</CardDescription></CardHeader><CardContent className="grid gap-3 md:grid-cols-2">{[
      "Complete and retain the Children’s Code / UK GDPR DPIA before launch.",
      "Document lawful bases, retention periods, processor/sub-processor arrangements and international transfers.",
      "Check whether the business must pay the ICO data-protection fee.",
      "Name and train the human who monitors safeguarding reports and document the response/escalation process.",
      "Review consumer Terms, refunds/cancellation and sales to under-18s for the actual business model.",
      "Put a reviewed school contract/data-processing agreement in place before importing school pupil data.",
      "Enable MFA on GitHub, Vercel, Supabase, Stripe, email and domain/DNS accounts.",
      "Run a production smoke test: signup → verify → plan → payment → cancellation → export → deletion.",
    ].map(text=><div key={text} className="flex gap-3 rounded-xl bg-slate-50 p-3 text-sm leading-6"><CircleDashed className="mt-1 size-4 shrink-0 text-slate-500"/><span>{text}</span></div>)}</CardContent></Card>
    <p className="text-xs leading-5 text-slate-500">The full operational checklist is stored in <code>docs/launch-compliance-checklist.md</code>.</p>
  </div></main>
}

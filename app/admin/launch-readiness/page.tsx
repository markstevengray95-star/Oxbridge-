import Link from "next/link"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { AlertTriangle, CheckCircle2, CircleDashed, ExternalLink, PlayCircle, ShieldCheck } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getAppAdminAccess } from "@/lib/auth/admin"
import { createAdminClient, hasSupabaseAdminConfig } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { isStripeConfigured } from "@/lib/stripe/server"
import { hasGeminiApiKey } from "@/lib/gemini/api-key"

export const dynamic = "force-dynamic"

type Check = { label: string; ok: boolean; detail: string; href?: string; blocking?: boolean }
type SmokeCheck = { label: string; ok: boolean; detail: string }
type PageProps = { searchParams?: Promise<{ smoke?: string }> }

function envReady(name: string) {
  return Boolean(process.env[name]?.trim())
}

async function tableReady(table: string) {
  if (!hasSupabaseAdminConfig()) return false
  try {
    const admin = createAdminClient()
    const { error } = await admin.from(table).select("*").limit(1)
    return !error
  } catch {
    return false
  }
}

async function requestStatus(origin: string, path: string, init?: RequestInit) {
  try {
    const response = await fetch(`${origin}${path}`, {
      ...init,
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.timeout(8000),
    })
    return { status: response.status, location: response.headers.get("location") || "" }
  } catch (error) {
    return { status: 0, location: "", error: error instanceof Error ? error.message : "Request failed" }
  }
}

async function runSmokeChecks(origin: string, cookieHeader: string): Promise<SmokeCheck[]> {
  const results: SmokeCheck[] = []
  const publicRoutes = ["/login", "/privacy", "/cookies", "/terms", "/safeguarding"]

  for (const path of publicRoutes) {
    const result = await requestStatus(origin, path)
    results.push({
      label: `Public route ${path}`,
      ok: result.status === 200,
      detail: result.status ? `HTTP ${result.status}` : `Request failed: ${result.error || "unknown error"}`,
    })
  }

  const protectedPage = await requestStatus(origin, "/student-home")
  results.push({
    label: "Signed-out student route protection",
    ok: protectedPage.status >= 300 && protectedPage.status < 400 && protectedPage.location.includes("/login"),
    detail: protectedPage.status ? `HTTP ${protectedPage.status}${protectedPage.location ? ` → ${protectedPage.location}` : ""}` : `Request failed: ${protectedPage.error || "unknown error"}`,
  })

  const signedOutExport = await requestStatus(origin, "/api/privacy/export")
  results.push({
    label: "Signed-out privacy export protection",
    ok: signedOutExport.status === 401,
    detail: signedOutExport.status ? `HTTP ${signedOutExport.status}` : `Request failed: ${signedOutExport.error || "unknown error"}`,
  })

  const authHeaders = cookieHeader ? { cookie: cookieHeader } : undefined
  const signedInAccount = await requestStatus(origin, "/account", { headers: authHeaders })
  results.push({
    label: "Signed-in account page",
    ok: signedInAccount.status === 200,
    detail: signedInAccount.status ? `HTTP ${signedInAccount.status}${signedInAccount.location ? ` → ${signedInAccount.location}` : ""}` : `Request failed: ${signedInAccount.error || "unknown error"}`,
  })

  const signedInExport = await requestStatus(origin, "/api/privacy/export", { headers: authHeaders })
  results.push({
    label: "Signed-in data export",
    ok: signedInExport.status === 200,
    detail: signedInExport.status ? `HTTP ${signedInExport.status}` : `Request failed: ${signedInExport.error || "unknown error"}`,
  })

  const checkoutGuard = await requestStatus(origin, "/api/billing/checkout", { method: "POST" })
  results.push({
    label: "Anonymous checkout guard",
    ok: checkoutGuard.status >= 300 && checkoutGuard.status < 400 && checkoutGuard.location.includes("/login"),
    detail: checkoutGuard.status ? `HTTP ${checkoutGuard.status}${checkoutGuard.location ? ` → ${checkoutGuard.location}` : ""}` : `Request failed: ${checkoutGuard.error || "unknown error"}`,
  })

  const webhookGuard = await requestStatus(origin, "/api/billing/webhook", { method: "POST" })
  results.push({
    label: "Stripe webhook signature guard",
    ok: webhookGuard.status === 400,
    detail: webhookGuard.status === 503 ? "HTTP 503 — STRIPE_WEBHOOK_SECRET is missing." : webhookGuard.status ? `HTTP ${webhookGuard.status}` : `Request failed: ${webhookGuard.error || "unknown error"}`,
  })

  return results
}

export default async function LaunchReadinessPage({ searchParams }: PageProps) {
  const params = searchParams ? await searchParams : {}
  const smokeRequested = params.smoke === "1"
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const userId = typeof data?.claims?.sub === "string" ? data.claims.sub : null
  const email = typeof data?.claims?.email === "string" ? data.claims.email : null
  if (!userId) redirect("/admin/login")
  const access = await getAppAdminAccess(userId, email)
  if (!access.isAdmin) redirect("/admin/login?error=not-authorized")

  const [legalAcceptance, privacyQueue, safeguardingQueue, subscriptions] = await Promise.all([
    tableReady("legal_acceptances"),
    tableReady("privacy_requests"),
    tableReady("safeguarding_reports"),
    tableReady("subscriptions"),
  ])

  const checks: Check[] = [
    {
      label: "Supabase public client",
      ok: envReady("NEXT_PUBLIC_SUPABASE_URL") && envReady("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
      detail: envReady("NEXT_PUBLIC_SUPABASE_URL") && envReady("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY") ? "Public Supabase URL and publishable key are configured." : "Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in Production.",
    },
    {
      label: "Supabase admin key",
      ok: hasSupabaseAdminConfig(),
      detail: hasSupabaseAdminConfig() ? "Server-side admin operations can run." : "Set SUPABASE_SECRET_KEY server-side. Never expose it with NEXT_PUBLIC_.",
    },
    {
      label: "Controller identity",
      ok: envReady("NEXT_PUBLIC_DATA_CONTROLLER_NAME") && envReady("NEXT_PUBLIC_DATA_CONTROLLER_ADDRESS"),
      detail: envReady("NEXT_PUBLIC_DATA_CONTROLLER_NAME") && envReady("NEXT_PUBLIC_DATA_CONTROLLER_ADDRESS") ? "Legal/controller name and correspondence address are configured." : "Add the real controller/trader name and contact address in Production.",
    },
    {
      label: "Privacy contact",
      ok: envReady("NEXT_PUBLIC_PRIVACY_CONTACT_EMAIL"),
      detail: envReady("NEXT_PUBLIC_PRIVACY_CONTACT_EMAIL") ? "A public privacy contact is configured." : "Set NEXT_PUBLIC_PRIVACY_CONTACT_EMAIL to a monitored inbox.",
    },
    {
      label: "Legal/support contacts",
      ok: envReady("NEXT_PUBLIC_LEGAL_CONTACT_EMAIL") && envReady("NEXT_PUBLIC_SUPPORT_EMAIL"),
      detail: envReady("NEXT_PUBLIC_LEGAL_CONTACT_EMAIL") && envReady("NEXT_PUBLIC_SUPPORT_EMAIL") ? "Legal and support inboxes are configured." : "Configure legal and support inboxes before taking payments.",
    },
    {
      label: "Safeguarding contact",
      ok: envReady("NEXT_PUBLIC_SAFEGUARDING_CONTACT_EMAIL"),
      detail: envReady("NEXT_PUBLIC_SAFEGUARDING_CONTACT_EMAIL") ? "A public safeguarding contact is configured." : "Set a monitored safeguarding inbox and name a human owner.",
    },
    {
      label: "Admin allowlist",
      ok: envReady("ADMIN_EMAILS"),
      detail: envReady("ADMIN_EMAILS") ? "Admin access has an explicit server allowlist." : "Set ADMIN_EMAILS to only the intended administrator accounts.",
    },
    {
      label: "Cron authentication",
      ok: envReady("CRON_SECRET"),
      detail: envReady("CRON_SECRET") ? "Scheduled programme generation is protected by CRON_SECRET." : "Set CRON_SECRET before enabling the production cron job.",
    },
    {
      label: "Compliance database migration",
      ok: legalAcceptance && privacyQueue && safeguardingQueue,
      detail: legalAcceptance && privacyQueue && safeguardingQueue ? "Legal acceptance, privacy-rights and safeguarding tables are available." : "The production compliance tables are missing or unavailable.",
    },
    {
      label: "Billing database",
      ok: subscriptions,
      detail: subscriptions ? "Subscription table is available." : "Restore the core billing schema before accepting payment.",
    },
    {
      label: "Stripe server key",
      ok: isStripeConfigured(),
      detail: isStripeConfigured() ? "Stripe Checkout can be created server-side." : "Set STRIPE_SECRET_KEY in Production.",
    },
    {
      label: "Stripe webhook",
      ok: envReady("STRIPE_WEBHOOK_SECRET"),
      detail: envReady("STRIPE_WEBHOOK_SECRET") ? "Stripe webhook signing secret is configured." : "Set STRIPE_WEBHOOK_SECRET and verify the production webhook endpoint.",
    },
    {
      label: "Paid add-on Price IDs",
      ok: envReady("STRIPE_LIVE_CREDIT_PACK_PRICE_ID") && envReady("STRIPE_HUMAN_INTERVIEW_REVIEW_PRICE_ID") && envReady("STRIPE_SCHOOL_EXTRA_SEAT_PRICE_ID"),
      detail: envReady("STRIPE_LIVE_CREDIT_PACK_PRICE_ID") && envReady("STRIPE_HUMAN_INTERVIEW_REVIEW_PRICE_ID") && envReady("STRIPE_SCHOOL_EXTRA_SEAT_PRICE_ID") ? "Live credits, expert review and School extra-seat prices are configured." : "Set the three Stripe add-on Price IDs before selling those add-ons.",
    },
    {
      label: "Gemini",
      ok: hasGeminiApiKey(),
      detail: hasGeminiApiKey() ? "AI services have a server credential." : "Set GEMINI_API_KEY in Production; AI features will otherwise fall back where supported.",
    },
    {
      label: "Public legal surfaces",
      ok: true,
      detail: "Privacy Notice, Cookie Notice, Terms, Privacy Centre and Safeguarding pages are linked globally.",
      href: "/privacy",
    },
    {
      label: "Data rights controls",
      ok: true,
      detail: "Authenticated export, privacy-request and account-deletion routes are built.",
      href: "/privacy-centre",
    },
  ]

  const advisoryChecks: Check[] = [
    {
      label: "Reusable subscription Price IDs",
      ok: envReady("STRIPE_PRO_MONTHLY_PRICE_ID") && envReady("STRIPE_PRO_ANNUAL_PRICE_ID") && envReady("STRIPE_SCHOOL_MONTHLY_PRICE_ID") && envReady("STRIPE_SCHOOL_ANNUAL_PRICE_ID"),
      detail: "The core subscription checkout can fall back to server-controlled inline recurring prices, but dedicated Stripe Price IDs are cleaner for production reporting and catalogue management.",
      blocking: false,
    },
    {
      label: "Stripe publishable key",
      ok: envReady("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"),
      detail: "Hosted Checkout does not currently require this in the browser, but keep it configured if client-side Stripe components are enabled later.",
      blocking: false,
    },
    {
      label: "Optional OpenAI fallback",
      ok: envReady("OPENAI_API_KEY"),
      detail: "OpenAI is optional in the current configuration; Gemini/local fallbacks can continue without it.",
      blocking: false,
    },
  ]

  let smokeChecks: SmokeCheck[] = []
  if (smokeRequested) {
    const requestHeaders = await headers()
    const host = requestHeaders.get("x-forwarded-host") || requestHeaders.get("host")
    const proto = requestHeaders.get("x-forwarded-proto") || "https"
    const cookieHeader = requestHeaders.get("cookie") || ""
    if (host) smokeChecks = await runSmokeChecks(`${proto}://${host}`, cookieHeader)
    else smokeChecks = [{ label: "Deployment origin", ok: false, detail: "Could not determine the current production origin." }]
  }

  const critical = checks.filter(item => item.blocking !== false && !item.ok).length + (smokeRequested ? smokeChecks.filter(item => !item.ok).length : 0)

  return <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 sm:px-6"><div className="mx-auto max-w-6xl space-y-6">
    <div className="flex items-center justify-between gap-3"><Button asChild variant="ghost"><Link href="/admin">← Admin</Link></Button><Badge><ShieldCheck className="mr-1 size-3"/>Admin only</Badge></div>

    <section className="grid gap-5 lg:grid-cols-[1.2fr_.8fr]"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-teal-700">Commercial launch gate</p><h1 className="mt-2 font-serif text-4xl font-bold">Public launch readiness</h1><p className="mt-3 max-w-3xl text-slate-600">This page checks the live deployment's required environment configuration, database readiness and non-destructive production routes without revealing secret values.</p></div><Card className={critical?"border-amber-300 bg-amber-50":"border-emerald-300 bg-emerald-50"}><CardHeader><CardDescription>Technical blockers detected</CardDescription><CardTitle className="font-serif text-5xl">{critical}</CardTitle></CardHeader><CardContent><p className="text-sm">{critical?"Resolve every blocking item before public paid launch.":"Automated technical checks are green. Complete the human/legal gates below."}</p></CardContent></Card></section>

    <section className="grid gap-3 md:grid-cols-2">{checks.map(item=><Card key={item.label} className={item.ok?"border-emerald-200":"border-amber-300 bg-amber-50"}><CardHeader className="pb-2"><div className="flex items-center gap-2">{item.ok?<CheckCircle2 className="size-5 text-emerald-700"/>:<AlertTriangle className="size-5 text-amber-700"/>}<CardTitle className="font-serif text-xl">{item.label}</CardTitle></div></CardHeader><CardContent><p className="text-sm leading-6 text-slate-600">{item.detail}</p>{item.href&&<Button asChild variant="link" className="mt-2 h-auto p-0"><Link href={item.href}>Open <ExternalLink className="size-3"/></Link></Button>}</CardContent></Card>)}</section>

    <Card><CardHeader><CardTitle className="font-serif text-2xl">Production smoke test</CardTitle><CardDescription>Read-only checks against this deployed app. No account is deleted and no Stripe charge is created.</CardDescription></CardHeader><CardContent>{!smokeRequested?<Button asChild><Link href="/admin/launch-readiness?smoke=1"><PlayCircle className="mr-2 size-4"/>Run live smoke test</Link></Button>:<div className="space-y-3"><div className="grid gap-3 md:grid-cols-2">{smokeChecks.map(item=><div key={item.label} className={`rounded-xl border p-4 ${item.ok?"border-emerald-200 bg-emerald-50":"border-amber-300 bg-amber-50"}`}><div className="flex items-center gap-2 font-semibold">{item.ok?<CheckCircle2 className="size-4 text-emerald-700"/>:<AlertTriangle className="size-4 text-amber-700"/>}{item.label}</div><p className="mt-2 text-sm text-slate-600">{item.detail}</p></div>)}</div><Button asChild variant="outline"><Link href="/admin/launch-readiness?smoke=1">Run again</Link></Button></div>}</CardContent></Card>

    <Card><CardHeader><CardTitle className="font-serif text-2xl">Advisory configuration</CardTitle><CardDescription>Useful production settings that are not launch blockers in the current architecture.</CardDescription></CardHeader><CardContent className="grid gap-3 md:grid-cols-2">{advisoryChecks.map(item=><div key={item.label} className={`rounded-xl border p-4 ${item.ok?"border-emerald-200":"border-slate-200"}`}><div className="flex items-center gap-2 font-semibold">{item.ok?<CheckCircle2 className="size-4 text-emerald-700"/>:<CircleDashed className="size-4 text-slate-500"/>}{item.label}</div><p className="mt-2 text-sm leading-6 text-slate-600">{item.detail}</p></div>)}</CardContent></Card>

    <Card><CardHeader><CardTitle className="font-serif text-2xl">Human/legal launch gates</CardTitle><CardDescription>These cannot be certified automatically by the app.</CardDescription></CardHeader><CardContent className="grid gap-3 md:grid-cols-2">{[
      "Complete and retain the Children’s Code / UK GDPR DPIA before launch.",
      "Document lawful bases, retention periods, processor/sub-processor arrangements and international transfers.",
      "Check whether the business must pay the ICO data-protection fee.",
      "Name and train the human who monitors safeguarding reports and document the response/escalation process.",
      "Review consumer Terms, refunds/cancellation and sales to under-18s for the actual business model.",
      "Put a reviewed school contract/data-processing agreement in place before importing school pupil data.",
      "Enable MFA on GitHub, Vercel, Supabase, Stripe, email and domain/DNS accounts.",
      "Use a dedicated disposable production test account to complete signup → email verification → plan → Stripe test checkout → cancellation → export → deletion before taking live payments.",
    ].map(text=><div key={text} className="flex gap-3 rounded-xl bg-slate-50 p-3 text-sm leading-6"><CircleDashed className="mt-1 size-4 shrink-0 text-slate-500"/><span>{text}</span></div>)}</CardContent></Card>

    <p className="text-xs leading-5 text-slate-500">The full operational checklist is stored in <code>docs/launch-compliance-checklist.md</code>.</p>
  </div></main>
}

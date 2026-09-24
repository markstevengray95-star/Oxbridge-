import Link from "next/link"
import { redirect } from "next/navigation"
import { BarChart3, Brain, GraduationCap, Mic2, ShieldCheck, Sparkles, Users } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getAppAdminAccess } from "@/lib/auth/admin"
import { createAdminClient, hasSupabaseAdminConfig } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

type AdminStats = {
  users: number
  activeSubscriptions: number
  cohorts: number
  tutorPlans: number
}

async function loadStats(): Promise<AdminStats> {
  if (!hasSupabaseAdminConfig()) return { users: 0, activeSubscriptions: 0, cohorts: 0, tutorPlans: 0 }
  const admin = createAdminClient()
  const [users, subscriptions, cohorts, tutorPlans] = await Promise.all([
    admin.from("profiles").select("id", { count: "exact", head: true }),
    admin.from("subscriptions").select("user_id", { count: "exact", head: true }).in("status", ["active", "trialing"]),
    admin.from("school_cohorts").select("id", { count: "exact", head: true }),
    admin.from("tutor_plans").select("id", { count: "exact", head: true }),
  ])
  return {
    users: users.count ?? 0,
    activeSubscriptions: subscriptions.count ?? 0,
    cohorts: cohorts.count ?? 0,
    tutorPlans: tutorPlans.count ?? 0,
  }
}

export default async function AdminPage() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const claims = data?.claims
  const userId = typeof claims?.sub === "string" ? claims.sub : null
  const email = typeof claims?.email === "string" ? claims.email : null
  if (!userId) redirect("/admin/login")

  const access = await getAppAdminAccess(userId, email)
  if (!access.isAdmin) redirect("/admin/login?error=not-authorized")

  const stats = await loadStats()

  return (
    <main className="min-h-screen bg-[#eef3f4] px-4 py-7 text-[#172b3a] sm:px-6 lg:px-8 lg:py-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2"><Badge className="bg-[#102a43] text-white"><ShieldCheck className="size-3.5" />Administrator</Badge><Badge variant="outline">Unlimited access</Badge></div>
            <h1 className="mt-3 font-serif text-4xl font-bold">Oxbridge Admin Console</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#667984]">Full app access, unlimited Gemini Live usage and a high-level view of the preparation platform.</p>
          </div>
          <div className="flex gap-2"><Button asChild variant="outline"><Link href="/account">Account</Link></Button><Button asChild><Link href="/tutor"><Brain />Open Tutor</Link></Button></div>
        </div>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card><CardHeader><Users className="size-5 text-[#147d91]" /><CardDescription>Accounts</CardDescription><CardTitle className="font-serif text-3xl">{stats.users}</CardTitle></CardHeader><CardContent><p className="text-sm text-[#667984]">Profiles currently attached to the platform.</p></CardContent></Card>
          <Card><CardHeader><Sparkles className="size-5 text-[#147d91]" /><CardDescription>Active paid access</CardDescription><CardTitle className="font-serif text-3xl">{stats.activeSubscriptions}</CardTitle></CardHeader><CardContent><p className="text-sm text-[#667984]">Active or trialling Pro/School subscriptions.</p></CardContent></Card>
          <Card><CardHeader><GraduationCap className="size-5 text-[#147d91]" /><CardDescription>School cohorts</CardDescription><CardTitle className="font-serif text-3xl">{stats.cohorts}</CardTitle></CardHeader><CardContent><p className="text-sm text-[#667984]">Cloud-linked teaching cohorts.</p></CardContent></Card>
          <Card><CardHeader><BarChart3 className="size-5 text-[#147d91]" /><CardDescription>Tutor plans generated</CardDescription><CardTitle className="font-serif text-3xl">{stats.tutorPlans}</CardTitle></CardHeader><CardContent><p className="text-sm text-[#667984]">Saved personalised preparation plans.</p></CardContent></Card>
        </section>

        <section className="grid gap-5 lg:grid-cols-[1.05fr_.95fr]">
          <Card className="border-emerald-200 bg-emerald-50"><CardHeader><CardTitle className="flex items-center gap-2 font-serif text-2xl"><ShieldCheck className="size-5 text-emerald-700" />Admin access is active</CardTitle><CardDescription>Your administrator role is verified on the server.</CardDescription></CardHeader><CardContent className="space-y-3 text-sm leading-6 text-emerald-950"><p>Gemini Live session reservations are bypassed for this account, so the normal monthly minute cap does not apply.</p><p>All Pro and School route gates are bypassed while the account remains an administrator.</p><p className="text-xs text-emerald-800">Role source: {access.source === "database" ? "protected Supabase admin table" : "server environment allowlist"}.</p></CardContent></Card>

          <Card><CardHeader><CardTitle className="font-serif text-2xl">Admin shortcuts</CardTitle><CardDescription>Jump directly into the areas you are testing or demonstrating.</CardDescription></CardHeader><CardContent className="grid gap-2 sm:grid-cols-2"><Button asChild><Link href="/gemini-live-interview"><Mic2 />Gemini Live</Link></Button><Button asChild variant="outline"><Link href="/tutorial-lab">Tutorial Lab</Link></Button><Button asChild variant="outline"><Link href="/school-dashboard">School dashboard</Link></Button><Button asChild variant="outline"><Link href="/mock-day">Mock day</Link></Button><Button asChild variant="outline"><Link href="/human-review">Human review</Link></Button><Button asChild variant="outline"><Link href="/premium">Premium overview</Link></Button></CardContent></Card>
        </section>
      </div>
    </main>
  )
}

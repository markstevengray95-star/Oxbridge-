import Link from "next/link"
import {AdminActionCentre} from "@/components/admin-action-centre"
import { redirect } from "next/navigation"
import { BarChart3, Brain, GraduationCap, KeyRound, ShieldCheck, Sparkles, Users } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getAppAdminAccess } from "@/lib/auth/admin"
import { createAdminClient, hasSupabaseAdminConfig } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"
type AdminStats = { users: number|null; activeSubscriptions: number|null; cohorts: number|null; tutorPlans: number|null }

async function loadStats(): Promise<AdminStats> {
  if (!hasSupabaseAdminConfig()) return { users: null, activeSubscriptions: null, cohorts: null, tutorPlans: null }
  const admin = createAdminClient()
  const [users, subscriptions, cohorts, tutorPlans] = await Promise.all([
    admin.from("profiles").select("id", { count: "exact", head: true }),
    admin.from("subscriptions").select("user_id", { count: "exact", head: true }).in("status", ["active", "trialing"]),
    admin.from("school_cohorts").select("id", { count: "exact", head: true }),
    admin.from("tutor_plans").select("id", { count: "exact", head: true }),
  ])
  return { users: users.error ? null : users.count ?? null, activeSubscriptions: subscriptions.error ? null : subscriptions.count ?? null, cohorts: cohorts.error ? null : cohorts.count ?? null, tutorPlans: tutorPlans.error ? null : tutorPlans.count ?? null }
}

type PracticeLoginRow = { user_id: string; username: string; display_name: string | null; active: boolean; unlimited_usage: boolean }

async function loadPracticeLogins(): Promise<{accounts:PracticeLoginRow[];error:string|null}> {
  if (!hasSupabaseAdminConfig()) return {accounts:[],error:"The admin data source is not configured."}
  const admin = createAdminClient()
  const { data, error } = await admin.from("practice_access_accounts")
    .select("user_id,username,display_name,active,unlimited_usage")
    .eq("account_type","student")
    .order("created_at", { ascending: false })
    .limit(200)
  if (error) {
    console.error("Could not load practice account roster", error.message)
    return {accounts:[],error:"Could not load managed practice accounts."}
  }
  return {accounts:data ?? [],error:null}
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
  const [stats, practiceRoster] = await Promise.all([loadStats(), loadPracticeLogins()])
  const practiceLogins=practiceRoster.accounts
  const metricsAvailable=Object.values(stats).every(v=>v!==null)

  return <main className="fellow-ui min-h-screen px-4 py-7 sm:px-6 lg:px-8 lg:py-10"><div className="mx-auto max-w-7xl space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-4"><div><div className="flex items-center gap-2"><Badge className="bg-[#102a43] text-white"><ShieldCheck className="size-3.5" />Administrator</Badge><Badge variant="outline">Server verified</Badge></div><h1 className="fellow-page-title mt-3">Fellow Admin Console</h1><p className="fellow-description mt-2">Server-verified access across subscriptions, AI, school tools, quality control and human privacy/safeguarding operations.</p></div><div className="flex gap-2"><Button asChild variant="outline"><Link href="/account">Account</Link></Button><Button asChild><Link href="/tutor"><Brain />Open Tutor</Link></Button></div></div>

    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"><Card><CardHeader><Users className="size-5 text-[#326d71]" /><CardDescription>Accounts</CardDescription><CardTitle className="font-serif text-3xl">{stats.users??"—"}</CardTitle></CardHeader><CardContent><p className="text-sm text-[#667984]">Profiles currently attached to the platform.</p></CardContent></Card><Card><CardHeader><Sparkles className="size-5 text-[#326d71]" /><CardDescription>Active subscription records</CardDescription><CardTitle className="font-serif text-3xl">{stats.activeSubscriptions??"—"}</CardTitle></CardHeader><CardContent><p className="text-sm text-[#667984]">Stored active or trialling subscription records; temporary free access is not counted.</p></CardContent></Card><Card><CardHeader><GraduationCap className="size-5 text-[#326d71]" /><CardDescription>School cohorts</CardDescription><CardTitle className="font-serif text-3xl">{stats.cohorts??"—"}</CardTitle></CardHeader><CardContent><p className="text-sm text-[#667984]">Cloud-linked teaching cohorts.</p></CardContent></Card><Card><CardHeader><BarChart3 className="size-5 text-[#326d71]" /><CardDescription>Tutor plans generated</CardDescription><CardTitle className="font-serif text-3xl">{stats.tutorPlans??"—"}</CardTitle></CardHeader><CardContent><p className="text-sm text-[#667984]">Saved personalised preparation plans.</p></CardContent></Card></section>

    {!metricsAvailable&&<p role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">Some platform counts could not be verified. A dash means unavailable, not zero.</p>}
    <AdminActionCentre />
    <details className="fellow-panel p-5"><summary className="cursor-pointer font-semibold">Administrator permissions and safety</summary>
      <p className="mt-3 text-sm text-slate-600">Administrator access was verified on the server. Permissions protect management routes, and password resets never reveal existing passwords.</p>
      <div className="mt-3 flex flex-wrap gap-2">{access.capabilities.map(capability=><Badge key={capability} variant="outline">{capability.replaceAll("_"," ")}</Badge>)}</div>
    </details>

    <section>
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 font-serif text-2xl"><KeyRound className="size-5 text-[#326d71]" />Recent practice usernames</CardTitle>
              <CardDescription>{practiceLogins.length} managed login{practiceLogins.length === 1 ? "" : "s"} in the recent account roster (maximum 200 loaded). Existing passwords and work are unchanged.</CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline"><Link href="/admin/practice-access">Manage logins</Link></Button>
              <Button asChild variant="outline"><Link href="/admin/practice-tracking">View progress</Link></Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {practiceRoster.error&&<p role="alert" className="mb-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{practiceRoster.error}</p>}
          {!practiceRoster.error&&<div className="mb-3 flex flex-wrap gap-2 text-xs font-semibold text-slate-600"><span>{practiceLogins.filter(a=>a.active).length} active</span><span>·</span><span>{practiceLogins.filter(a=>!a.active).length} disabled</span></div>}
          {practiceLogins.length ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {practiceLogins.slice(0,8).map(account => (
                <div key={account.user_id} className="rounded-xl border bg-white p-4">
                  <p className="font-semibold">{account.display_name || account.username}</p>
                  <p className="mt-1 font-mono text-sm text-[#526a75]">{account.username}</p>
                  <div className="mt-2 flex gap-2">
                    <Badge variant={account.active ? "default" : "destructive"}>{account.active ? "Active" : "Disabled"}</Badge>
                    {account.unlimited_usage && <Badge variant="outline">Unlimited practice</Badge>}
                  </div>
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-slate-500">{practiceRoster.error?"The roster is unavailable. No account changes have been made.":"No managed student practice accounts were found."}</p>}
          {practiceLogins.length>8&&<p className="mt-4 text-sm text-slate-600">Showing 8 of {practiceLogins.length} recent accounts. <Link className="fellow-link" href="/admin/practice-access">Manage all practice accounts</Link>.</p>}
        </CardContent>
      </Card>
    </section>
  </div></main>
}

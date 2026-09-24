"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { ArrowLeft, KeyRound, Loader2, RefreshCw, Search, ShieldCheck, UserCheck, Users } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

type UserRow = {
  id: string
  email: string
  displayName: string
  createdAt: string
  lastSignInAt: string | null
  emailConfirmedAt: string | null
  bannedUntil: string | null
  plan: string
  subscriptionStatus: string
  currentPeriodEnd: string | null
  lastPasswordResetEmailAt: string | null
}

function dateTime(value: string | null) {
  if (!value) return "Never"
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([])
  const [query, setQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  async function load() {
    setLoading(true); setError("")
    try {
      const response = await fetch("/api/admin/users?perPage=200", { cache: "no-store" })
      const data = await response.json() as { users?: UserRow[]; error?: string }
      if (!response.ok) throw new Error(data.error || "Could not load users.")
      setUsers(data.users ?? [])
    } catch (err) { setError(err instanceof Error ? err.message : "Could not load users.") } finally { setLoading(false) }
  }

  useEffect(() => { void load() }, [])

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    return term ? users.filter(user => `${user.email} ${user.displayName}`.toLowerCase().includes(term)) : users
  }, [users, query])

  async function sendReset(user: UserRow) {
    if (!window.confirm(`Send a password-reset email to ${user.email}? The password itself will never be shown to administrators.`)) return
    setBusyId(user.id); setMessage(""); setError("")
    try {
      const response = await fetch("/api/admin/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "send_password_reset", userId: user.id }) })
      const data = await response.json() as { message?: string; error?: string }
      if (!response.ok) throw new Error(data.error || "Could not send reset email.")
      setMessage(data.message || "Password-reset email requested.")
      await load()
    } catch (err) { setError(err instanceof Error ? err.message : "Could not send reset email.") } finally { setBusyId(null) }
  }

  return <main className="min-h-screen bg-[#eef3f4] px-4 py-7 text-[#172b3a] sm:px-6 lg:px-8 lg:py-10">
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div><Button asChild variant="ghost" className="mb-3 -ml-3"><Link href="/admin"><ArrowLeft />Admin console</Link></Button><div className="flex gap-2"><Badge className="bg-[#102a43] text-white"><ShieldCheck className="size-3.5" />Administrator</Badge><Badge variant="outline"><Users className="size-3.5" />Account management</Badge></div><h1 className="mt-3 font-serif text-4xl font-bold">Users & password recovery</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-[#667984]">Monitor account status, confirmation and recent sign-in activity. Passwords are never readable; reset actions send the user a secure recovery email and are recorded in the audit log.</p></div>
        <Button variant="outline" onClick={() => void load()} disabled={loading}><RefreshCw className={loading ? "animate-spin" : ""} />Refresh</Button>
      </div>

      <Card className="shadow-none"><CardContent className="p-4"><div className="relative max-w-xl"><Search className="absolute left-3 top-3 size-4 text-slate-400" /><Input className="pl-9" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search by name or email" /></div></CardContent></Card>
      {message && <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">{message}</div>}
      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>}

      <Card className="overflow-hidden shadow-none"><CardHeader><CardTitle className="font-serif text-2xl">Account monitor</CardTitle><CardDescription>{filtered.length} account{filtered.length === 1 ? "" : "s"} shown.</CardDescription></CardHeader><CardContent className="p-0">
        {loading ? <div className="flex items-center gap-2 p-6 text-sm text-slate-600"><Loader2 className="animate-spin" />Loading accounts…</div> : <div className="overflow-x-auto"><table className="w-full min-w-[1050px] text-left text-sm"><thead className="border-y bg-slate-50 text-xs uppercase tracking-wider text-slate-500"><tr><th className="px-4 py-3">User</th><th className="px-4 py-3">Email</th><th className="px-4 py-3">Plan</th><th className="px-4 py-3">Confirmed</th><th className="px-4 py-3">Last sign-in</th><th className="px-4 py-3">Joined</th><th className="px-4 py-3">Last reset sent</th><th className="px-4 py-3">Action</th></tr></thead><tbody>{filtered.map(user => <tr key={user.id} className="border-b align-top"><td className="px-4 py-4"><div className="flex items-center gap-2"><UserCheck className="size-4 text-[#147d91]" /><div><p className="font-semibold">{user.displayName || "Unnamed user"}</p><p className="text-xs text-slate-400">{user.id.slice(0, 8)}…</p></div></div></td><td className="px-4 py-4 font-medium">{user.email || "—"}</td><td className="px-4 py-4"><Badge variant="outline">{user.plan}</Badge><p className="mt-1 text-xs text-slate-500">{user.subscriptionStatus}</p></td><td className="px-4 py-4">{user.emailConfirmedAt ? <Badge className="bg-emerald-100 text-emerald-800">Confirmed</Badge> : <Badge variant="outline">Pending</Badge>}</td><td className="px-4 py-4 text-slate-600">{dateTime(user.lastSignInAt)}</td><td className="px-4 py-4 text-slate-600">{dateTime(user.createdAt)}</td><td className="px-4 py-4 text-slate-600">{dateTime(user.lastPasswordResetEmailAt)}</td><td className="px-4 py-4"><Button size="sm" variant="outline" onClick={() => void sendReset(user)} disabled={busyId === user.id || !user.email}>{busyId === user.id ? <Loader2 className="animate-spin" /> : <KeyRound />}Send reset email</Button></td></tr>)}{!filtered.length && <tr><td colSpan={8} className="p-8 text-center text-slate-500">No matching accounts.</td></tr>}</tbody></table></div>}
      </CardContent></Card>
    </div>
  </main>
}

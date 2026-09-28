"use client"

import Link from "next/link"
import { FormEvent, useCallback, useEffect, useState } from "react"
import { CheckCircle2, Copy, KeyRound, Loader2, RefreshCw, ShieldCheck, UserPlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

type PracticeAccount = {
  userId: string
  username: string
  displayName: string
  active: boolean
  unlimitedUsage: boolean
  createdAt: string
  updatedAt: string
  lastSignInAt: string | null
}

type CreatedCredentials = { username: string; password: string; displayName: string }

export default function PracticeAccessAdminPage() {
  const [accounts, setAccounts] = useState<PracticeAccount[]>([])
  const [displayName, setDisplayName] = useState("")
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [created, setCreated] = useState<CreatedCredentials | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const response = await fetch("/api/admin/practice-accounts", { cache: "no-store" })
      const data = await response.json() as { accounts?: PracticeAccount[]; error?: string }
      if (!response.ok) throw new Error(data.error || "Could not load practice accounts.")
      setAccounts(data.accounts || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load practice accounts.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  async function createAccount(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError("")
    setMessage("")
    setCreated(null)
    try {
      const chosenPassword = password
      const response = await fetch("/api/admin/practice-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create", username, password: chosenPassword, displayName }),
      })
      const data = await response.json() as { account?: PracticeAccount; error?: string; message?: string }
      if (!response.ok) throw new Error(data.error || "Could not create practice account.")
      const cleanUsername = data.account?.username || username.trim().toLowerCase()
      setCreated({ username: cleanUsername, password: chosenPassword, displayName: displayName.trim() || cleanUsername })
      setMessage(data.message || "Practice account created.")
      setDisplayName("")
      setUsername("")
      setPassword("")
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create practice account.")
    } finally {
      setBusy(false)
    }
  }

  async function setPasswordFor(account: PracticeAccount) {
    const nextPassword = window.prompt(`Enter a new password for ${account.username}. Use at least 8 characters.`)
    if (!nextPassword) return
    setError("")
    setMessage("")
    try {
      const response = await fetch("/api/admin/practice-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set_password", userId: account.userId, password: nextPassword }),
      })
      const data = await response.json() as { error?: string; message?: string }
      if (!response.ok) throw new Error(data.error || "Could not update password.")
      setMessage(data.message || "Password updated.")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update password.")
    }
  }

  async function copyCredentials() {
    if (!created) return
    const origin = typeof window === "undefined" ? "" : window.location.origin
    await navigator.clipboard.writeText(`ScholarBridge practice access\nSign in: ${origin}/practice-login\nUsername: ${created.username}\nPassword: ${created.password}`)
    setMessage("Sign-in details copied.")
  }

  return <main className="min-h-screen bg-[#f2f5f5] px-4 py-8 text-[#172b3a] sm:px-6">
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#147d91]">Admin</p><h1 className="mt-1 font-serif text-3xl font-bold text-[#102a43]">Practice access</h1><p className="mt-2 max-w-2xl text-sm text-[#526a75]">Create managed username/password logins with unlimited practice usage. Each login has its own account and saved progress.</p></div>
        <Button asChild variant="outline"><Link href="/admin">Back to admin</Link></Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[.9fr_1.1fr]">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><UserPlus className="size-5 text-[#147d91]" />Create practice login</CardTitle><CardDescription>You choose the username and initial password. No learner email address is needed.</CardDescription></CardHeader>
          <CardContent>
            <form onSubmit={createAccount} className="space-y-4">
              <label className="block space-y-1.5"><span className="text-sm font-semibold">Learner name</span><Input value={displayName} onChange={event => setDisplayName(event.target.value)} placeholder="Optional display name" maxLength={80} /></label>
              <label className="block space-y-1.5"><span className="text-sm font-semibold">Username</span><Input value={username} onChange={event => setUsername(event.target.value.toLowerCase())} placeholder="e.g. practice.alex" minLength={3} maxLength={32} autoCapitalize="none" autoCorrect="off" required /><p className="text-xs text-[#6f838c]">3–32 characters: lowercase letters, numbers, dots, dashes and underscores.</p></label>
              <label className="block space-y-1.5"><span className="text-sm font-semibold">Password</span><Input value={password} onChange={event => setPassword(event.target.value)} type="password" minLength={8} maxLength={128} autoComplete="new-password" required /><p className="text-xs text-[#6f838c]">The password is stored securely by Supabase Auth and cannot be read back later.</p></label>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900"><span className="inline-flex items-center gap-2 font-semibold"><ShieldCheck className="size-4" />Unlimited practice enabled</span><p className="mt-1 text-xs leading-5">This account bypasses normal practice usage limits and can use advanced learner practice features, but it does not receive school staff or administrator permissions.</p></div>
              <Button className="w-full" disabled={busy}>{busy ? <><Loader2 className="animate-spin" />Creating…</> : <><UserPlus />Create login</>}</Button>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {created && <Card className="border-emerald-200 bg-emerald-50/70"><CardHeader><CardTitle className="flex items-center gap-2 text-emerald-900"><CheckCircle2 className="size-5" />Login ready to share</CardTitle><CardDescription>This is the only place the current password is shown. Copy the details now.</CardDescription></CardHeader><CardContent className="space-y-3 text-sm"><div className="grid gap-2 rounded-xl bg-white p-4"><span><b>Sign-in page:</b> /practice-login</span><span><b>Username:</b> {created.username}</span><span><b>Password:</b> {created.password}</span></div><Button type="button" onClick={copyCredentials}><Copy />Copy sign-in details</Button></CardContent></Card>}
          {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>}
          {message && <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">{message}</div>}

          <Card>
            <CardHeader className="flex-row items-center justify-between gap-4"><div><CardTitle>Issued practice logins</CardTitle><CardDescription>Passwords are never displayed here. Set a new one if somebody forgets theirs.</CardDescription></div><Button type="button" variant="outline" size="sm" onClick={() => void load()} disabled={loading}><RefreshCw className={loading ? "animate-spin" : ""} />Refresh</Button></CardHeader>
            <CardContent>
              {loading ? <div className="flex items-center gap-2 py-8 text-sm text-[#6f838c]"><Loader2 className="animate-spin" />Loading accounts…</div> : accounts.length === 0 ? <p className="py-8 text-sm text-[#6f838c]">No practice logins yet.</p> : <div className="divide-y rounded-xl border bg-white">{accounts.map(account => <div key={account.userId} className="flex flex-wrap items-center justify-between gap-3 p-4"><div><div className="flex flex-wrap items-center gap-2"><span className="font-semibold text-[#102a43]">{account.displayName}</span><span className="rounded-full bg-[#e4f4f5] px-2 py-0.5 text-xs font-semibold text-[#126b79]">{account.username}</span>{account.unlimitedUsage && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">Unlimited</span>}</div><p className="mt-1 text-xs text-[#6f838c]">Created {new Date(account.createdAt).toLocaleDateString()} · {account.lastSignInAt ? `Last sign-in ${new Date(account.lastSignInAt).toLocaleString()}` : "Not signed in yet"}</p></div><Button type="button" variant="outline" size="sm" onClick={() => void setPasswordFor(account)}><KeyRound />Set password</Button></div>)}</div>}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  </main>
}

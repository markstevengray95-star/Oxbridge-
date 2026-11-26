"use client"

import Link from "next/link"
import { type FormEvent, useCallback, useEffect, useState } from "react"
import { CheckCircle2, Copy, GraduationCap, KeyRound, Loader2, RefreshCw, RotateCcw, ShieldCheck, Trash2, UserPlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

type PracticeAccount = {
  userId: string
  username: string
  displayName: string
  active: boolean
  unlimitedUsage: boolean
  expiresAt: string | null
  createdAt: string
  updatedAt: string
  lastSignInAt: string | null
}
type CreatedCredentials = { username: string; password: string; displayName: string; expiresOn: string | null }
type AccountAction = "set_expiry" | "remove" | "restore" | "set_password"

function dateValue(value: string | null) { return value ? value.slice(0, 10) : "" }
function accountStatus(account: PracticeAccount) {
  if (!account.active) return "Removed"
  if (account.expiresAt && Date.parse(account.expiresAt) <= Date.now()) return "Expired"
  return "Active"
}
function dateLabel(value: string | null) {
  return value ? new Date(value).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric",timeZone:"UTC"}) : "Never"
}

export default function PracticeAccessAdminPage() {
  const [accounts, setAccounts] = useState<PracticeAccount[]>([])
  const [displayName, setDisplayName] = useState("")
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [newExpiry, setNewExpiry] = useState("")
  const [expiryEdits, setExpiryEdits] = useState<Record<string,string>>({})
  const [showRemoved, setShowRemoved] = useState(false)
  const [resetFor, setResetFor] = useState("")
  const [resetPassword, setResetPassword] = useState("")
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [created, setCreated] = useState<CreatedCredentials | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/admin/practice-accounts", { cache: "no-store" })
      const data = await response.json() as { accounts?: PracticeAccount[]; error?: string }
      if (!response.ok) throw new Error(data.error || "Could not load practice accounts.")
      const list = data.accounts || []
      setAccounts(list)
      setExpiryEdits(Object.fromEntries(list.map(a => [a.userId, dateValue(a.expiresAt)])))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load practice accounts.")
    } finally {
      setLoading(false)
    }
  }, [])
  useEffect(() => { void load() }, [load])

  async function post(body: Record<string,unknown>) {
    const response = await fetch("/api/admin/practice-accounts", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    })
    const data = await response.json() as { account?: PracticeAccount; error?: string; message?: string }
    if (!response.ok) throw new Error(data.error || "Could not update practice account.")
    return data
  }

  async function createAccount(event: FormEvent) {
    event.preventDefault()
    setBusy(true);setError("");setMessage("");setCreated(null)
    try {
      const initialPassword = password
      const data = await post({ action: "create", username, password: initialPassword, displayName, expiresOn: newExpiry || null })
      const cleanUsername = data.account?.username || username.trim().toLowerCase()
      setCreated({ username: cleanUsername, password: initialPassword, displayName: displayName.trim() || cleanUsername, expiresOn: newExpiry || null })
      setMessage(data.message || "Practice account created.")
      setDisplayName("");setUsername("");setPassword("");setNewExpiry("")
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create practice account.")
    } finally { setBusy(false) }
  }

  async function changeAccount(account: PracticeAccount, action: AccountAction, passwordForReset?: string, expiryOverride?: string | null) {
    setBusy(true);setError("");setMessage("")
    try {
      const data = await post({
        action, userId: account.userId,
        ...(action === "set_expiry" ? { expiresOn: expiryOverride !== undefined ? expiryOverride : (expiryEdits[account.userId] || null) } : {}),
        ...(action === "set_password" ? { password: passwordForReset } : {}),
      })
      setMessage(data.message || "Account updated.")
      setResetFor("");setResetPassword("")
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update practice account.")
    } finally { setBusy(false) }
  }

  async function copyCredentials() {
    if (!created) return
    await navigator.clipboard.writeText(`Fellow practice access\nSign in: ${window.location.origin}/practice-login\nUsername: ${created.username}\nPassword: ${created.password}\nExpires: ${created.expiresOn || "Never"} (end of day UTC)`)
    setMessage("Sign-in details copied. Share them securely.")
  }

  const activeAccounts = accounts.filter(a => a.active)
  const removedAccounts = accounts.filter(a => !a.active)
  const visibleAccounts = showRemoved ? removedAccounts : activeAccounts

  return <main className="fellow-ui min-h-screen px-4 py-8 text-[#172b3a] sm:px-6">
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="fellow-page-header flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="fellow-eyebrow">Admin</p>
          <h1 className="fellow-page-title mt-1">Practice access</h1>
          <p className="mt-2 max-w-2xl text-sm text-[#526a75]">Create practice usernames, choose when access expires, and remove or restore logins without deleting saved student progress.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline"><Link href="/admin/managed-school-logins"><GraduationCap/>Teacher logins & school linking</Link></Button>
          <Button asChild variant="outline"><Link href="/admin">Back to admin</Link></Button>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[.85fr_1.15fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><UserPlus className="size-5 text-[#326d71]"/>Create practice login</CardTitle>
            <CardDescription>Issue a username and password. Optional expiry is inclusive of the chosen date (23:59 UTC).</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={createAccount} className="space-y-4">
              <label className="block space-y-1.5"><span className="text-sm font-semibold">Learner name</span>
                <Input value={displayName} onChange={e=>setDisplayName(e.target.value)} placeholder="Optional display name" maxLength={80}/>
              </label>
              <label className="block space-y-1.5"><span className="text-sm font-semibold">Username</span>
                <Input value={username} onChange={e=>setUsername(e.target.value.toLowerCase())} placeholder="e.g. practice.alex" minLength={3} maxLength={32} autoCapitalize="none" autoCorrect="off" required/>
                <p className="text-xs text-[#6f838c]">3–32 characters: lowercase letters, numbers, dots, dashes and underscores.</p>
              </label>
              <label className="block space-y-1.5"><span className="text-sm font-semibold">Password</span>
                <Input value={password} onChange={e=>setPassword(e.target.value)} type="password" minLength={8} maxLength={128} autoComplete="new-password" required/>
                <p className="text-xs text-[#6f838c]">Stored securely in Supabase Auth. An existing password cannot be read back later.</p>
              </label>
              <label className="block space-y-1.5"><span className="text-sm font-semibold">Expiry date (optional)</span>
                <Input value={newExpiry} onChange={e=>setNewExpiry(e.target.value)} type="date" min={new Date().toISOString().slice(0,10)}/>
                <p className="text-xs text-[#6f838c]">Leave empty for no expiry. The account stops working after the selected date (UTC).</p>
              </label>
              <div className="rounded-xl border p-3 text-sm"><span className="inline-flex items-center gap-2 font-semibold"><ShieldCheck className="size-4"/>Unlimited practice while active</span>
                <p className="mt-1 text-xs leading-5 text-[#526a75]">Issued student logins do not receive teacher or platform administrator permissions.</p>
              </div>
              <Button className="w-full" disabled={busy}>{busy?<><Loader2 className="animate-spin"/>Creating…</>:<><UserPlus/>Create login</>}</Button>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {created&&<Card className="border-[#a9d6dc] bg-[#edf6f7]">
            <CardHeader><CardTitle className="flex items-center gap-2"><CheckCircle2 className="size-5"/>Login ready to share</CardTitle><CardDescription>This is the only place the password is shown. Copy the details now.</CardDescription></CardHeader>
            <CardContent className="space-y-3 text-sm"><div className="grid gap-2 rounded-xl bg-white p-4">
              <span><b>Sign-in page:</b> /practice-login</span><span><b>Username:</b> {created.username}</span>
              <span><b>Password:</b> {created.password}</span><span><b>Expires:</b> {created.expiresOn || "Never"}</span>
            </div><Button type="button" onClick={()=>void copyCredentials()}><Copy/>Copy sign-in details</Button></CardContent>
          </Card>}
          {error&&<div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>}
          {message&&<div role="status" className="rounded-xl border bg-white p-3 text-sm text-[#225560]">{message}</div>}

          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <CardTitle>Issued practice logins</CardTitle>
                  <CardDescription>Changing expiry or removing access never deletes previous answers, scores or progress.</CardDescription>
                </div>
                <Button type="button" size="sm" variant="outline" onClick={()=>void load()} disabled={loading||busy}><RefreshCw className={loading?"animate-spin":""}/>Refresh</Button>
              </div>
              <div className="flex flex-wrap gap-2 pt-2">
                <Button size="sm" variant={showRemoved?"outline":"default"} onClick={()=>setShowRemoved(false)}>Active ({activeAccounts.length})</Button>
                <Button size="sm" variant={showRemoved?"default":"outline"} onClick={()=>setShowRemoved(true)}>Removed ({removedAccounts.length})</Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading?<div className="flex items-center gap-2 py-7 text-sm"><Loader2 className="animate-spin"/>Loading accounts…</div>
              :visibleAccounts.length===0?<p className="py-6 text-sm text-[#6f838c]">{showRemoved?"No removed logins.":"No active practice logins yet."}</p>
              :<div className="divide-y rounded-xl border bg-white">
                {visibleAccounts.map(account=>{
                  const status=accountStatus(account)
                  return <div key={account.userId} className="space-y-3 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-[#102a43]">{account.displayName}</span>
                          <span className="rounded-full bg-[#e4f4f5] px-2 py-0.5 font-mono text-xs text-[#126b79]">{account.username}</span>
                          <span className="rounded-full border px-2 py-0.5 text-xs">{status}</span>
                        </div>
                        <p className="mt-1 text-xs text-[#6f838c]">Created {new Date(account.createdAt).toLocaleDateString("en-GB")} · {account.lastSignInAt?`Last sign-in ${new Date(account.lastSignInAt).toLocaleDateString("en-GB")}`:"Not signed in yet"}</p>
                        <p className="mt-1 text-xs text-[#6f838c]">Expires: <strong>{dateLabel(account.expiresAt)}</strong></p>
                      </div>
                      {!account.active?<Button size="sm" variant="outline" disabled={busy||status==="Expired"} onClick={()=>void changeAccount(account,"restore")}><RotateCcw/>Restore login</Button>
                      :<Button size="sm" variant="outline" disabled={busy} onClick={()=>{
                        if(window.confirm(`Remove login access for "${account.username}"? They will no longer be able to use Fellow, but their account and saved work will remain stored. You can restore it later.`)) void changeAccount(account,"remove")
                      }}><Trash2/>Remove login</Button>}
                    </div>

                    <div className="flex flex-wrap items-end gap-2">
                      <label className="min-w-[145px] flex-1 space-y-1"><span className="text-xs font-semibold">Change expiry</span>
                        <Input type="date" value={expiryEdits[account.userId]??""} onChange={e=>setExpiryEdits(prev=>({...prev,[account.userId]:e.target.value}))} min={new Date().toISOString().slice(0,10)} disabled={busy}/>
                      </label>
                      <Button type="button" size="sm" variant="outline" disabled={busy||((expiryEdits[account.userId]??"")===dateValue(account.expiresAt))} onClick={()=>void changeAccount(account,"set_expiry")}>Save expiry</Button>
                      {account.expiresAt&&<Button type="button" size="sm" variant="ghost" disabled={busy} onClick={()=>void changeAccount(account,"set_expiry",undefined,null)}>Clear expiry</Button>}
                    </div>

                    <div className="border-t pt-3">
                      {resetFor===account.userId?<div className="flex flex-wrap items-end gap-2">
                        <label className="min-w-[150px] flex-1 space-y-1"><span className="text-xs font-semibold">New password</span>
                          <Input type="password" value={resetPassword} onChange={e=>setResetPassword(e.target.value)} minLength={8} maxLength={128} autoComplete="new-password" placeholder="8–128 characters"/>
                        </label>
                        <Button type="button" size="sm" disabled={busy||resetPassword.length<8} onClick={()=>void changeAccount(account,"set_password",resetPassword)}>Save password</Button>
                        <Button type="button" size="sm" variant="ghost" onClick={()=>{setResetFor("");setResetPassword("")}}>Cancel</Button>
                      </div>
                      :<Button type="button" size="sm" variant="ghost" disabled={busy} onClick={()=>{setResetFor(account.userId);setResetPassword("")}}><KeyRound/>Reset password</Button>}
                    </div>
                  </div>
                })}
              </div>}
              {showRemoved&&<p className="mt-4 text-xs text-[#6f838c]">Removed accounts stay archived, not deleted. If their expiry has also passed, clear or extend it before selecting Restore login.</p>}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  </main>
}

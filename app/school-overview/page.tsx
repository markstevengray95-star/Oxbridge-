"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { Activity, ArrowLeft, BookOpenCheck, Download, Gauge, Loader2, RefreshCw, School, Search, Sparkles, Users } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"

type Skill = { label?: string; score?: number; status?: string }
type Member = {
  userId: string
  role: "owner" | "member"
  joinedAt: string
  displayName: string
  email: string
  targetUniversity?: string | null
  targetCourse?: string | null
  applicationYear?: number | null
  preparationScore: number
  interviewCount: number
  fullPaperCount: number
  essayCount: number
  priority?: Skill | null
  strongest?: Skill | null
  cohortCount: number
  assignmentCompleted: number
  assignmentTotal: number
  assignmentCompletion: number
  geminiMinutesThisMonth: number
  lastActiveAt?: string | null
  activeThisWeek: boolean
}
type Analytics = {
  organization: { id: string; name: string; join_code: string; seat_limit: number; status: string; created_at: string }
  summary: { seatsUsed: number; seatsRemaining: number; extraSeats: number; averagePreparation: number; activeThisWeek: number; assignmentCompletion: number; geminiMinutesThisMonth: number }
  members: Member[]
}

function csvEscape(value: unknown) { return `"${String(value ?? "").replaceAll('"', '""')}"` }
function lastSeen(value?: string | null) {
  if (!value) return "No activity yet"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "No activity yet"
  const days = Math.max(0, Math.floor((Date.now() - date.getTime()) / 86400000))
  if (days === 0) return "Today"
  if (days === 1) return "Yesterday"
  if (days < 7) return `${days} days ago`
  return date.toLocaleDateString("en-GB")
}

export default function SchoolOverviewPage() {
  const [data, setData] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [search, setSearch] = useState("")
  const [selectedId, setSelectedId] = useState("")

  async function load() {
    setLoading(true)
    setError("")
    try {
      const response = await fetch("/api/school/analytics", { cache: "no-store" })
      const payload = await response.json() as Analytics & { error?: string }
      if (!response.ok) throw new Error(payload.error || "Could not load School analytics")
      setData(payload)
      if (!selectedId && payload.members[0]?.userId) setSelectedId(payload.members[0].userId)
      if (selectedId && !payload.members.some(member => member.userId === selectedId)) setSelectedId(payload.members[0]?.userId ?? "")
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load School analytics")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return data?.members ?? []
    return (data?.members ?? []).filter(member => [member.displayName, member.email, member.targetCourse, member.targetUniversity].some(value => String(value ?? "").toLowerCase().includes(term)))
  }, [data, search])

  const selected = data?.members.find(member => member.userId === selectedId) ?? filtered[0] ?? null

  function exportCsv() {
    if (!data) return
    const header = ["Name", "Email", "Role", "Target university", "Target course", "Application year", "Preparation score", "Interviews", "Full papers", "Essays", "Assignment completion", "Gemini minutes this month", "Cohorts", "Last activity", "Priority", "Strongest area"]
    const rows = data.members.map(member => [member.displayName, member.email, member.role, member.targetUniversity, member.targetCourse, member.applicationYear, member.preparationScore, member.interviewCount, member.fullPaperCount, member.essayCount, `${member.assignmentCompletion}%`, member.geminiMinutesThisMonth, member.cohortCount, member.lastActiveAt, member.priority?.label, member.strongest?.label])
    const csv = [header, ...rows].map(row => row.map(csvEscape).join(",")).join("\n")
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }))
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = `${data.organization.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-school-overview.csv`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  return <main className="min-h-screen bg-[#f5f7f7] text-[#172b3a]">
    <header className="border-b bg-white"><div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4"><Button asChild variant="ghost"><Link href="/school-seats"><ArrowLeft />School licence</Link></Button><div className="flex gap-2"><Badge variant="outline"><School className="size-3.5" />Subscription Dashboard</Badge><Button asChild size="sm" variant="outline"><Link href="/school-dashboard">Cohorts</Link></Button></div></div></header>

    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8">
      <section className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#147d91]">School subscription overview</p><h1 className="mt-2 font-serif text-4xl font-bold">Track every connected account from one place.</h1><p className="mt-3 max-w-3xl text-slate-600">See high-level preparation evidence, activity, assignments, account usage and seat capacity across the whole School licence. Private Tutor conversations and full interview transcripts are not shown.</p></div><div className="flex gap-2"><Button variant="outline" onClick={() => void load()} disabled={loading}><RefreshCw className={loading ? "animate-spin" : ""} />Refresh</Button>{data && <Button variant="outline" onClick={exportCsv}><Download />Export CSV</Button>}</div></section>

      {error && <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">{error}</div>}
      {loading && !data ? <Card><CardContent className="flex items-center gap-3 p-6"><Loader2 className="animate-spin" />Loading subscription analytics…</CardContent></Card> : data ? <>
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <Card className="border-0 bg-[#102a43] text-white"><CardHeader><Users className="size-5 text-white/75" /><CardDescription className="text-white/60">Accounts connected</CardDescription><CardTitle className="font-serif text-4xl">{data.summary.seatsUsed}/{data.organization.seat_limit}</CardTitle><p className="text-xs text-white/60">{data.summary.extraSeats ? `${data.summary.extraSeats} paid extra seat${data.summary.extraSeats === 1 ? "" : "s"}` : "5 included seats"}</p></CardHeader></Card>
          <Card><CardHeader><Gauge className="size-5 text-[#147d91]" /><CardDescription>Average preparation</CardDescription><CardTitle className="font-serif text-4xl">{data.summary.averagePreparation || "—"}{data.summary.averagePreparation ? "%" : ""}</CardTitle></CardHeader></Card>
          <Card><CardHeader><Activity className="size-5 text-[#147d91]" /><CardDescription>Active this week</CardDescription><CardTitle className="font-serif text-4xl">{data.summary.activeThisWeek}/{data.summary.seatsUsed}</CardTitle></CardHeader></Card>
          <Card><CardHeader><BookOpenCheck className="size-5 text-[#147d91]" /><CardDescription>Assignment completion</CardDescription><CardTitle className="font-serif text-4xl">{data.summary.assignmentCompletion}%</CardTitle><Progress value={data.summary.assignmentCompletion} /></CardHeader></Card>
          <Card><CardHeader><Sparkles className="size-5 text-[#147d91]" /><CardDescription>Gemini Live this month</CardDescription><CardTitle className="font-serif text-4xl">{data.summary.geminiMinutesThisMonth}</CardTitle><p className="text-xs text-slate-500">reserved minutes across connected accounts</p></CardHeader></Card>
        </section>

        <section className="grid gap-5 xl:grid-cols-[1.55fr_.8fr]">
          <Card className="shadow-none"><CardHeader><div className="flex flex-col justify-between gap-3 md:flex-row md:items-center"><div><CardTitle className="font-serif text-2xl">Connected accounts</CardTitle><CardDescription>Search and compare all users attached to {data.organization.name}.</CardDescription></div><label className="relative block min-w-[260px]"><Search className="absolute left-3 top-2.5 size-4 text-slate-400" /><input className="h-10 w-full rounded-md border bg-white pl-9 pr-3 text-sm" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search name, email or course" /></label></div></CardHeader><CardContent className="overflow-x-auto"><table className="w-full min-w-[980px] text-sm"><thead><tr className="border-b text-left text-xs uppercase tracking-wider text-slate-500"><th className="p-2">Account</th><th className="p-2">Target</th><th className="p-2">Preparation</th><th className="p-2">Practice activity</th><th className="p-2">Assignments</th><th className="p-2">Live AI</th><th className="p-2">Last activity</th></tr></thead><tbody>{filtered.map(member => <tr key={member.userId} onClick={() => setSelectedId(member.userId)} className={`cursor-pointer border-b last:border-0 ${selected?.userId === member.userId ? "bg-[#edf7f8]" : "hover:bg-slate-50"}`}><td className="p-2"><div className="flex items-center gap-2"><strong>{member.displayName}</strong><Badge variant="outline">{member.role}</Badge></div><p className="text-xs text-slate-500">{member.email}</p></td><td className="p-2"><p>{member.targetCourse || "Not set"}</p><p className="text-xs text-slate-500">{member.targetUniversity || "University not set"}{member.applicationYear ? ` · ${member.applicationYear}` : ""}</p></td><td className="p-2"><div className="flex items-center gap-2"><Progress value={member.preparationScore} className="w-20" /><strong>{member.preparationScore || "—"}{member.preparationScore ? "%" : ""}</strong></div></td><td className="p-2 text-xs text-slate-600">{member.interviewCount} interviews<br />{member.fullPaperCount} papers · {member.essayCount} essays</td><td className="p-2"><strong>{member.assignmentCompletion}%</strong><p className="text-xs text-slate-500">{member.assignmentCompleted}/{member.assignmentTotal} complete</p></td><td className="p-2">{member.geminiMinutesThisMonth} min</td><td className="p-2"><Badge variant={member.activeThisWeek ? "default" : "outline"}>{lastSeen(member.lastActiveAt)}</Badge></td></tr>)}{!filtered.length && <tr><td colSpan={7} className="p-5 text-center text-slate-500">No connected accounts match that search.</td></tr>}</tbody></table></CardContent></Card>

          <Card className="shadow-none"><CardHeader><CardTitle className="font-serif text-2xl">Account detail</CardTitle><CardDescription>Select a person to inspect their high-level preparation evidence.</CardDescription></CardHeader><CardContent>{selected ? <div className="space-y-5"><div><div className="flex items-center gap-2"><h2 className="text-xl font-bold">{selected.displayName}</h2><Badge variant="outline">{selected.role}</Badge></div><p className="text-sm text-slate-500">{selected.email}</p></div><div className="rounded-2xl bg-[#f6f9f9] p-4"><p className="text-xs font-bold uppercase tracking-wider text-slate-500">Preparation evidence</p><div className="mt-3 flex items-center gap-3"><Progress value={selected.preparationScore} className="flex-1" /><strong>{selected.preparationScore || "—"}{selected.preparationScore ? "%" : ""}</strong></div><p className="mt-3 text-sm"><strong>Current priority:</strong> {selected.priority?.label || "Building baseline"}</p><p className="mt-1 text-sm"><strong>Strongest area:</strong> {selected.strongest?.label || "Not enough evidence yet"}</p></div><div className="grid grid-cols-2 gap-3 text-sm"><div className="rounded-xl border p-3"><p className="text-slate-500">Interviews</p><strong className="text-xl">{selected.interviewCount}</strong></div><div className="rounded-xl border p-3"><p className="text-slate-500">Full papers</p><strong className="text-xl">{selected.fullPaperCount}</strong></div><div className="rounded-xl border p-3"><p className="text-slate-500">Essays</p><strong className="text-xl">{selected.essayCount}</strong></div><div className="rounded-xl border p-3"><p className="text-slate-500">Cohorts</p><strong className="text-xl">{selected.cohortCount}</strong></div></div><div className="text-sm leading-6"><p><strong>Assignments:</strong> {selected.assignmentCompleted}/{selected.assignmentTotal} completed</p><p><strong>Gemini Live:</strong> {selected.geminiMinutesThisMonth} minutes this month</p><p><strong>Last evidence update:</strong> {lastSeen(selected.lastActiveAt)}</p><p><strong>Joined licence:</strong> {new Date(selected.joinedAt).toLocaleDateString("en-GB")}</p></div></div> : <p className="text-sm text-slate-500">No account selected.</p>}</CardContent></Card>
        </section>

        <section className="grid gap-4 md:grid-cols-3"><Card className="shadow-none"><CardHeader><CardTitle className="font-serif text-xl">Seat management</CardTitle><CardDescription>{data.summary.seatsRemaining} seats remain. Add more for £5.99/month each.</CardDescription></CardHeader><CardContent><Button asChild className="w-full"><Link href="/school-seats">Manage seats</Link></Button></CardContent></Card><Card className="shadow-none"><CardHeader><CardTitle className="font-serif text-xl">Cohorts & assignments</CardTitle><CardDescription>Create groups, set preparation and track completion.</CardDescription></CardHeader><CardContent><Button asChild className="w-full" variant="outline"><Link href="/school-dashboard">Open cohort dashboard</Link></Button></CardContent></Card><Card className="shadow-none"><CardHeader><CardTitle className="font-serif text-xl">Privacy boundary</CardTitle><CardDescription>The dashboard intentionally shows evidence and activity summaries, not private Tutor conversations, raw interview audio or full transcripts.</CardDescription></CardHeader></Card></section>
      </> : null}
    </div>
  </main>
}

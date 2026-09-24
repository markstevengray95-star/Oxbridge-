"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { AlertTriangle, ArrowLeft, CheckCircle2, RefreshCw, ShieldCheck } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ADMISSIONS_UPDATE_KEY } from "@/lib/nextgen-prep"

type SourceResult = { id: string; label: string; url: string; finalUrl: string; ok: boolean; looksExpected: boolean; status: number; fingerprint?: string; matched?: string[] }
type Snapshot = { checkedAt: string; results: SourceResult[] }

function readPrevious(): Snapshot | null { try { return JSON.parse(localStorage.getItem(ADMISSIONS_UPDATE_KEY) || "null") as Snapshot | null } catch { return null } }

export default function AdmissionsUpdaterPage() {
  const [previous, setPrevious] = useState<Snapshot | null>(null)
  const [current, setCurrent] = useState<Snapshot | null>(null)
  const [loading, setLoading] = useState(false)
  useEffect(() => { setPrevious(readPrevious()); void check() }, [])

  async function check() {
    setLoading(true)
    try {
      const response = await fetch("/api/source-health", { cache: "no-store" })
      const data = await response.json() as Snapshot
      setCurrent(data)
      localStorage.setItem(ADMISSIONS_UPDATE_KEY, JSON.stringify(data))
    } finally { setLoading(false) }
  }

  const previousById = useMemo(() => new Map((previous?.results ?? []).map(item => [item.id, item])), [previous])
  const changes = (current?.results ?? []).filter(item => {
    const old = previousById.get(item.id)
    return old?.fingerprint && item.fingerprint && old.fingerprint !== item.fingerprint
  })

  return <main className="min-h-screen bg-[#f4f7f7] text-[#172b3a]">
    <header className="border-b bg-white"><div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4"><Button asChild variant="ghost"><Link href="/tutor"><ArrowLeft />Personal Tutor</Link></Button><Badge variant="outline"><ShieldCheck className="size-3.5" />Admissions updater</Badge></div></header>
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8">
      <section className="grid gap-4 lg:grid-cols-[1fr_auto]"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#147d91]">Official-source change detection</p><h1 className="mt-2 font-serif text-4xl font-bold">Flag admissions information that may have changed.</h1><p className="mt-3 max-w-3xl text-slate-600">The checker revisits official Oxford, Cambridge and admissions-test pages, confirms expected content is still present and compares a content fingerprint with the previous check. A change is a review flag, not automatic proof that a requirement changed.</p></div><Button onClick={() => void check()} disabled={loading}><RefreshCw className={loading ? "animate-spin" : ""} />{loading ? "Checking…" : "Check official sources"}</Button></section>
      {changes.length > 0 && <Card className="border-amber-300 bg-amber-50 shadow-none"><CardHeader><AlertTriangle className="size-5 text-amber-700" /><CardTitle className="font-serif text-xl">{changes.length} source{changes.length === 1 ? "" : "s"} changed since your last check</CardTitle><CardDescription>Open the official source and review the change before altering any student pathway or deadline.</CardDescription></CardHeader></Card>}
      <div className="grid gap-4 md:grid-cols-2">{(current?.results ?? []).map(item => { const old = previousById.get(item.id); const changed = Boolean(old?.fingerprint && item.fingerprint && old.fingerprint !== item.fingerprint); return <Card key={item.id} className="shadow-none"><CardHeader><div className="flex items-start justify-between gap-3"><div>{item.looksExpected ? <CheckCircle2 className="size-5 text-emerald-600" /> : <AlertTriangle className="size-5 text-amber-600" />}<CardTitle className="mt-2 font-serif text-xl">{item.label}</CardTitle></div>{changed && <Badge className="bg-amber-700">Changed</Badge>}</div><CardDescription>HTTP {item.status || "—"} · {item.looksExpected ? "expected signals found" : "review recommended"}</CardDescription></CardHeader><CardContent><a className="text-sm font-semibold text-blue-700 underline" href={item.finalUrl || item.url} target="_blank" rel="noreferrer">Open official source</a></CardContent></Card>})}</div>
      {current && <p className="text-xs text-slate-500">Last checked {new Date(current.checkedAt).toLocaleString("en-GB")}.</p>}
    </div>
  </main>
}

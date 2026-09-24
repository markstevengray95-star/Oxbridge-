"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { ArrowRight, BookOpenCheck, Camera, CalendarDays, Gauge, RefreshCw, ShieldCheck } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ORAL_RETEST_KEY, PREP_WEEK_KEY, type OralRetest } from "@/lib/nextgen-prep"

type PrepState = { completed?: string[] }

export function NextgenTutorPanel() {
  const [retests, setRetests] = useState<OralRetest[]>([])
  const [prepState, setPrepState] = useState<PrepState>({})
  useEffect(() => {
    try { const raw = JSON.parse(localStorage.getItem(ORAL_RETEST_KEY) || "[]"); if (Array.isArray(raw)) setRetests(raw) } catch {}
    try { setPrepState(JSON.parse(localStorage.getItem(PREP_WEEK_KEY) || "{}") as PrepState) } catch {}
  }, [])
  const due = useMemo(() => retests.find(item => !item.completedAt && new Date(item.dueAt).getTime() <= Date.now()), [retests])
  const completed = prepState.completed?.length ?? 0

  const cards = [
    { title: "Live interview + working", note: due ? `Oral retention check due: ${due.focus}` : "Use live voice, optional camera working analysis and confidence calibration.", href: "/gemini-live-interview", icon: Camera, badge: due ? "Due" : "Live" },
    { title: "Unseen material", note: "Prepare a graph, passage, dataset or scenario before the interviewer questions you on it.", href: "/pre-interview-material", icon: BookOpenCheck, badge: "Adaptive" },
    { title: "Reasoning Replay", note: "Inspect how your answer changed after challenge and whether confidence matched performance.", href: "/reasoning-replay", icon: Gauge, badge: "Evidence" },
    { title: "Preparation Week", note: completed ? `${completed} task${completed === 1 ? "" : "s"} completed in your current seven-day programme.` : "Run a seven-day diagnostic → intervention → interview → retention programme.", href: "/prep-week", icon: CalendarDays, badge: "Programme" },
    { title: "Test Player", note: "Practise keyboard navigation, flags, timing and accessibility controls in an exam-like interface.", href: "/test-player", icon: RefreshCw, badge: "Timed" },
    { title: "Admissions updater", note: "Re-check official sources and flag pages whose content changed since the previous check.", href: "/admissions-updater", icon: ShieldCheck, badge: "Official sources" },
  ]

  return <section className="mx-auto max-w-7xl px-4 pb-10 sm:px-6"><div className="mb-4 flex items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#147d91]">Tutor next-generation tools</p><h2 className="mt-1 font-serif text-2xl font-bold text-[#172b3a]">High-value preparation the Tutor can assign</h2></div><Button asChild size="sm" variant="outline"><Link href="/question-provenance">Question provenance</Link></Button></div><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{cards.map(item => <Card key={item.title} className="shadow-none"><CardHeader><div className="flex items-start justify-between gap-3"><item.icon className="size-5 text-[#147d91]" /><Badge variant="outline">{item.badge}</Badge></div><CardTitle className="font-serif text-xl">{item.title}</CardTitle><CardDescription>{item.note}</CardDescription></CardHeader><CardContent><Button asChild size="sm" variant="outline"><Link href={item.href}>Open <ArrowRight /></Link></Button></CardContent></Card>)}</div></section>
}

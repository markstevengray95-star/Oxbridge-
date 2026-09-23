"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { AlarmClock, ArrowRight, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PersonalTutorDashboard } from "@/components/personal-tutor-dashboard"
import { PROGRESS_KEY } from "@/lib/personal-tutor"

type Intervention = { id?: string; test?: string; retestAccuracy?: number; nextRetestAt?: string; targets?: string[] }

function readInterventions() {
  try {
    const progress = JSON.parse(localStorage.getItem(PROGRESS_KEY) || "{}") as { interventionResults?: Intervention[] }
    return Array.isArray(progress.interventionResults) ? progress.interventionResults : []
  } catch { return [] }
}

export function PersonalTutorShell() {
  const [interventions, setInterventions] = useState<Intervention[]>([])
  const [dismissed, setDismissed] = useState(false)
  useEffect(() => { setInterventions(readInterventions()) }, [])
  const due = useMemo(() => interventions.find(item => item.nextRetestAt && new Date(item.nextRetestAt).getTime() <= Date.now()), [interventions])

  return <>
    <PersonalTutorDashboard />
    {due && !dismissed && <div className="fixed bottom-4 right-4 z-[120] w-[min(26rem,calc(100vw-2rem))]"><Card className="border-amber-300 bg-amber-50 shadow-2xl"><CardHeader className="pb-2"><div className="flex items-start justify-between gap-3"><div><Badge className="mb-2 bg-amber-700"><AlarmClock className="size-3.5" />Retention check due</Badge><CardTitle className="font-serif text-xl">Bring this weakness back now</CardTitle></div><Button size="icon" variant="ghost" onClick={() => setDismissed(true)} aria-label="Dismiss retention reminder"><X className="size-4" /></Button></div><CardDescription>{due.test ?? "Admissions test"} · previous targeted retest {due.retestAccuracy ?? "—"}%{due.targets?.length ? ` · ${due.targets.slice(0, 2).join(" / ")}` : ""}</CardDescription></CardHeader><CardContent><p className="mb-3 text-sm leading-6 text-amber-950">The delay has passed, so this check tests retention rather than same-session familiarity.</p><Button asChild className="w-full"><Link href="/paper-intervention">Start spaced retest <ArrowRight /></Link></Button></CardContent></Card></div>}
  </>
}

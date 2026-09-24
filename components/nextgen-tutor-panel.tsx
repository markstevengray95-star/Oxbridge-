"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { ArrowRight, BookOpenCheck, Camera, CalendarDays, ChevronDown, Gauge, LibraryBig, RefreshCw, ScanSearch, ShieldCheck, Sparkles } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ORAL_RETEST_KEY, PREP_WEEK_KEY, type OralRetest } from "@/lib/nextgen-prep"

type PrepState = { completed?: string[] }

type ToolCard = {
  title: string
  note: string
  href: string
  badge: string
  icon: typeof Camera
  emphasis?: boolean
}

export function NextgenTutorPanel() {
  const [retests, setRetests] = useState<OralRetest[]>([])
  const [prepState, setPrepState] = useState<PrepState>({})
  const [readingCount, setReadingCount] = useState(0)

  useEffect(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(ORAL_RETEST_KEY) || "[]")
      if (Array.isArray(raw)) setRetests(raw)
    } catch {}
    try { setPrepState(JSON.parse(localStorage.getItem(PREP_WEEK_KEY) || "{}") as PrepState) } catch {}
    try {
      const readings = JSON.parse(localStorage.getItem("oxbridge-reading-reflections-v1") || "[]")
      if (Array.isArray(readings)) setReadingCount(readings.length)
    } catch {}
  }, [])

  const due = useMemo(
    () => retests.find(item => !item.completedAt && new Date(item.dueAt).getTime() <= Date.now()),
    [retests],
  )
  const completed = prepState.completed?.length ?? 0

  const priorities: ToolCard[] = [
    due
      ? { title: "Oral retention check", note: `A delayed check is due on: ${due.focus}`, href: "/gemini-live-interview", icon: Camera, badge: "Due now", emphasis: true }
      : { title: "Live interview + working", note: "Use live voice, optional still-camera working analysis and confidence calibration.", href: "/gemini-live-interview", icon: Camera, badge: "Live" },
    { title: "Unseen material", note: "Prepare a graph, passage, dataset or scenario, then defend your reasoning in interview.", href: "/pre-interview-material", icon: BookOpenCheck, badge: "Adaptive" },
    { title: "Test player", note: "Practise timing, keyboard navigation, flags and accessibility controls in an exam-like interface.", href: "/test-player", icon: RefreshCw, badge: "Timed" },
  ]

  const library: Array<{ heading: string; items: ToolCard[] }> = [
    {
      heading: "Interview intelligence",
      items: [
        { title: "Reasoning Replay", note: "See how an answer changed after challenge and whether confidence matched performance.", href: "/reasoning-replay", icon: Gauge, badge: "Evidence" },
        { title: "Preparation Week", note: completed ? `${completed} task${completed === 1 ? "" : "s"} completed in the current programme.` : "Run a seven-day diagnostic → intervention → interview → retention programme.", href: "/prep-week", icon: CalendarDays, badge: "Programme" },
      ],
    },
    {
      heading: "Academic depth",
      items: [
        { title: "Reading Room", note: readingCount ? `${readingCount} saved reading reflection${readingCount === 1 ? "" : "s"}. Continue with a new stretch extract.` : "Read, annotate and defend unfamiliar academic material.", href: "/reading-room", icon: LibraryBig, badge: "Reading" },
        { title: "Tutorial Lab", note: "Work visually on unfamiliar problems and let the Tutor inspect the reasoning in your working.", href: "/tutorial-lab", icon: ScanSearch, badge: "Visual" },
      ],
    },
    {
      heading: "Quality & requirements",
      items: [
        { title: "Question provenance", note: "See whether practice is original, official-published, specification-aligned, teacher-reviewed or AI-generated.", href: "/question-provenance", icon: Sparkles, badge: "Transparent" },
        { title: "Admissions updater", note: "Re-check official sources and flag pages whose requirements changed since the previous review.", href: "/admissions-updater", icon: ShieldCheck, badge: "Official sources" },
      ],
    },
  ]

  return (
    <section className="mx-auto max-w-7xl px-4 pb-28 sm:px-6 md:pb-10">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.18em] text-[#147d91]">Tutor recommendations</p>
          <h2 className="mt-1 font-serif text-2xl font-bold text-[#172b3a]">Do the next useful thing, not everything at once.</h2>
          <p className="mt-1 max-w-2xl text-sm text-[#667984]">The highest-value tools stay visible. Everything else is grouped below so the Tutor remains calm and focused.</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {priorities.map(item => (
          <Card key={item.title} className={item.emphasis ? "border-amber-300 bg-amber-50 shadow-none" : "shadow-none"}>
            <CardHeader>
              <div className="flex items-start justify-between gap-3"><item.icon className="size-5 text-[#147d91]" /><Badge variant={item.emphasis ? "default" : "outline"}>{item.badge}</Badge></div>
              <CardTitle className="font-serif text-xl">{item.title}</CardTitle>
              <CardDescription>{item.note}</CardDescription>
            </CardHeader>
            <CardContent><Button asChild size="sm" variant={item.emphasis ? "default" : "outline"}><Link href={item.href}>Start <ArrowRight /></Link></Button></CardContent>
          </Card>
        ))}
      </div>

      <details className="group mt-5 rounded-2xl border bg-white">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5">
          <div><p className="font-semibold text-[#172b3a]">Explore more preparation tools</p><p className="mt-1 text-sm text-[#667984]">Open this only when you want to choose manually.</p></div>
          <ChevronDown className="size-5 text-[#667984] transition-transform group-open:rotate-180" />
        </summary>
        <div className="grid gap-6 border-t p-5 lg:grid-cols-3">
          {library.map(group => (
            <div key={group.heading}>
              <p className="mb-3 text-xs font-bold uppercase tracking-[.15em] text-[#147d91]">{group.heading}</p>
              <div className="space-y-3">
                {group.items.map(item => (
                  <Link key={item.title} href={item.href} className="block rounded-xl border p-4 transition-colors hover:border-[#8dd7de] hover:bg-[#f8fbfb]">
                    <div className="flex items-start gap-3"><item.icon className="mt-0.5 size-4 shrink-0 text-[#147d91]" /><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><strong className="text-sm text-[#172b3a]">{item.title}</strong><Badge variant="outline" className="text-[10px]">{item.badge}</Badge></div><p className="mt-1 text-xs leading-5 text-[#667984]">{item.note}</p></div></div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </details>
    </section>
  )
}

import Link from "next/link"
import { ArrowLeft, BookOpen, BriefcaseBusiness, ClipboardEdit, FileText, FlaskConical, Network, ShieldCheck } from "lucide-react"
import { ApplicationDigitalTwinDashboard } from "@/components/application/application-digital-twin-dashboard"
import { CloudReadinessSummary } from "@/components/application/cloud-readiness-summary"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const tools = [
  ["Application profile", "Edit university, course, written work, reading, projects and interests feeding the Twin.", "/application-profile", ClipboardEdit],
  ["Written Work Defence", "Challenge the exact claims, assumptions and evidence in submitted work.", "/written-work-interview", FileText],
  ["Interview Replay Lab", "Return to a weak interview moment and practise a better branch without repeating the session.", "/interview-replay", ShieldCheck],
  ["Evidence locker", "Keep projects, written work, reading and reflections together.", "/evidence-locker", BriefcaseBusiness],
  ["Academic source notebook", "Record argument, evidence, weakness, connections and your own view.", "/source-notebook", BookOpen],
  ["Knowledge graph", "Connect sources, ideas, objections, course topics and interview questions.", "/knowledge-graph", Network],
  ["Research project", "Develop a mini-project from question to oral defence.", "/research-project", FlaskConical],
] as const

export default function DigitalTwinPage() {
  return <main className="min-h-screen bg-[#f3f6f6] text-[#172b3a]">
    <header className="border-b bg-white"><div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4"><Button asChild variant="ghost"><Link href="/tutor"><ArrowLeft />Personal Tutor</Link></Button><Badge variant="outline">Digital Twin 3.1</Badge></div></header>
    <div className="mx-auto max-w-7xl space-y-7 px-4 py-8 sm:px-6">
      <section className="rounded-[2rem] bg-[#102a43] p-7 text-white sm:p-10"><p className="text-xs font-bold uppercase tracking-[.18em] text-cyan-200">Your preparation, connected</p><h1 className="mt-3 max-w-4xl font-serif text-4xl font-bold sm:text-5xl">One live model of what you have done, what is improving and what to practise next.</h1><p className="mt-4 max-w-3xl text-sm leading-7 text-slate-200">The Digital Twin combines exam-paper results, interview evidence, essay analysis, application evidence, reading and human review. It is a preparation model—not an admissions prediction.</p><div className="mt-6 flex flex-wrap gap-2"><Button asChild className="bg-white text-[#102a43] hover:bg-slate-100"><Link href="/application-profile"><ClipboardEdit />Edit application profile</Link></Button><Button asChild variant="outline" className="border-white/30 bg-transparent text-white"><Link href="/tutor">Open Tutor</Link></Button></div></section>

      <CloudReadinessSummary />
      <ApplicationDigitalTwinDashboard />

      <section><h2 className="font-serif text-2xl font-bold">Connected preparation tools</h2><p className="mt-1 text-sm text-slate-600">These tools feed evidence back into the same preparation picture.</p><div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{tools.map(([title, note, href, Icon]) => <Card key={title} className="shadow-none"><CardHeader><Icon className="size-5 text-[#147d91]"/><CardTitle className="font-serif text-xl">{title}</CardTitle><CardDescription>{note}</CardDescription></CardHeader><CardContent><Button asChild variant="outline"><Link href={href}>Open</Link></Button></CardContent></Card>)}</div></section>
    </div>
  </main>
}

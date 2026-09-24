"use client"

import Link from "next/link"
import { ArrowLeft, BadgeCheck, BookOpenCheck, ShieldCheck, Sparkles } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { provenanceLegend } from "@/lib/nextgen-prep"

const examples = [
  { area: "Full Papers", source: "Original practice", aligned: "Current test structure", review: "Automatic consistency checks", status: "spec-aligned" },
  { area: "Course interview bank", source: "Original academic prompts", aligned: "Course reasoning skills", review: "Follow-up ladder validation", status: "original" },
  { area: "Official examples", source: "Published preparation material only", aligned: "Official source", review: "Copyright-limited excerpt/reference", status: "official-example" },
  { area: "Adaptive AI challenges", source: "AI generated", aligned: "Student weakness + course", review: "Clearly labelled; never presented as an official past question", status: "ai-generated" },
]

export default function QuestionProvenancePage() {
  return <main className="min-h-screen bg-[#f4f7f7] text-[#172b3a]">
    <header className="border-b bg-white"><div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4"><Button asChild variant="ghost"><Link href="/tutor"><ArrowLeft />Personal Tutor</Link></Button><Badge variant="outline"><ShieldCheck className="size-3.5" />Question provenance</Badge></div></header>
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <section><p className="text-xs font-bold uppercase tracking-[.18em] text-[#147d91]">Trust and quality layer</p><h1 className="mt-2 font-serif text-4xl font-bold">Know where practice material comes from.</h1><p className="mt-3 max-w-3xl text-slate-600">The app separates original practice, officially published examples and AI-generated challenges. It does not claim confidential interview questions or live exam material are official preparation resources.</p></section>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{provenanceLegend.map(item => <Card key={item.id} className="shadow-none"><CardHeader><BadgeCheck className="size-5 text-[#147d91]" /><CardTitle className="font-serif text-xl">{item.label}</CardTitle><CardDescription>{item.description}</CardDescription></CardHeader></Card>)}</div>
      <Card className="shadow-none"><CardHeader><BookOpenCheck className="size-5 text-[#147d91]" /><CardTitle className="font-serif text-2xl">How the current banks are labelled</CardTitle></CardHeader><CardContent className="space-y-3">{examples.map(item => <div key={item.area} className="grid gap-3 rounded-2xl border bg-white p-4 md:grid-cols-[1.1fr_1fr_1fr_auto]"><div><p className="font-semibold">{item.area}</p><p className="text-sm text-slate-500">{item.source}</p></div><div><p className="text-xs font-bold uppercase tracking-wider text-slate-400">Alignment</p><p className="text-sm">{item.aligned}</p></div><div><p className="text-xs font-bold uppercase tracking-wider text-slate-400">Quality check</p><p className="text-sm">{item.review}</p></div><Badge variant="outline" className="w-fit self-start">{item.status}</Badge></div>)}</CardContent></Card>
      <Card className="border-cyan-200 bg-cyan-50 shadow-none"><CardHeader><Sparkles className="size-5 text-cyan-800" /><CardTitle className="font-serif text-xl">Next quality signal</CardTitle><CardDescription>As real usage grows, the app can add anonymised item statistics such as completion rate, distractor selection and difficulty stability. These should be used to improve practice quality, not to make admissions predictions.</CardDescription></CardHeader></Card>
    </div>
  </main>
}

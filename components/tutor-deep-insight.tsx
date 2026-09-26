"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import {
  Activity,
  ArrowRight,
  BookOpen,
  Brain,
  CheckCircle2,
  CircleAlert,
  FileText,
  Gauge,
  Layers3,
  Lightbulb,
  MessageSquareText,
  Radar,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { createClient } from "@/lib/supabase/client"
import {
  APPLICATION_KEY,
  SUPERCURRICULAR_KEY,
  type SkillState,
  type StudentIntelligence,
} from "@/lib/personal-tutor"

type ApplicationSnapshot = Record<string, unknown>
type SupercurricularItem = { title?: string; type?: string; reflection?: string }
type DomainName = SkillState["domain"]

type DomainSummary = {
  domain: DomainName
  score: number
  evidence: number
  coverage: number
  weakest: SkillState | null
  strongest: SkillState | null
  trend: "up" | "flat" | "down"
  href: string
  note: string
}

const domainMeta: Record<DomainName, { href: string; note: string; icon: typeof Brain }> = {
  Interview: { href: "/interviews", note: "Reasoning aloud, assumptions, subject thinking and communication.", icon: MessageSquareText },
  "Admissions test": { href: "/full-papers", note: "Section-level accuracy, targeted retests and exam reasoning.", icon: Target },
  Writing: { href: "/essay-tutor", note: "Argument structure, evidence, precision and evaluation.", icon: FileText },
  Application: { href: "/application-profile", note: "Academic evidence, reading, projects and claims you may need to defend.", icon: BookOpen },
}

function safeRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

function readApplication() {
  try { return safeRecord(JSON.parse(localStorage.getItem(APPLICATION_KEY) || "{}")) } catch { return {} }
}

function readSupercurricular() {
  try {
    const value = JSON.parse(localStorage.getItem(SUPERCURRICULAR_KEY) || "[]")
    return Array.isArray(value) ? value as SupercurricularItem[] : []
  } catch { return [] }
}

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)))
}

function mean(values: number[], fallback = 0) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : fallback
}

function trendFromSkills(skills: SkillState[]) {
  const up = skills.filter(item => item.trend === "up").length
  const down = skills.filter(item => item.trend === "down").length
  return up > down ? "up" as const : down > up ? "down" as const : "flat" as const
}

function applicationCoverage(application: ApplicationSnapshot, supercurricular: SupercurricularItem[]) {
  const fields = ["epq", "books", "projects", "competitions", "writtenWork", "interests", "workExperience", "subjects", "predictedGrades"]
  const completed = fields.filter(key => String(application[key] ?? "").trim().length > 0).length
  const reflected = supercurricular.filter(item => String(item.reflection ?? "").trim().length >= 40).length
  return {
    completed,
    total: fields.length,
    reflected,
    score: clamp((completed / fields.length) * 75 + Math.min(25, reflected * 5)),
  }
}

function domainSummary(domain: DomainName, skills: SkillState[], applicationScore: number, applicationEvidence: number): DomainSummary {
  const meta = domainMeta[domain]
  if (domain === "Application") {
    return {
      domain,
      score: applicationScore,
      evidence: applicationEvidence,
      coverage: applicationScore,
      weakest: null,
      strongest: null,
      trend: "flat",
      href: meta.href,
      note: meta.note,
    }
  }
  const relevant = skills.filter(item => item.domain === domain)
  const evidenced = relevant.filter(item => item.evidenceCount > 0)
  const sorted = [...evidenced].sort((a, b) => a.score - b.score)
  const evidence = evidenced.reduce((sum, item) => sum + item.evidenceCount, 0)
  return {
    domain,
    score: clamp(mean(evidenced.map(item => item.score), 0)),
    evidence,
    coverage: relevant.length ? clamp((evidenced.length / relevant.length) * 100) : 0,
    weakest: sorted[0] ?? null,
    strongest: sorted.at(-1) ?? null,
    trend: trendFromSkills(evidenced),
    href: meta.href,
    note: meta.note,
  }
}

function shortDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Recent"
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" }).format(date)
}

export function TutorDeepInsight({ intelligence }: { intelligence: StudentIntelligence }) {
  const [application, setApplication] = useState<ApplicationSnapshot>({})
  const [supercurricular, setSupercurricular] = useState<SupercurricularItem[]>([])
  const [cloudApplicationCount, setCloudApplicationCount] = useState(0)
  const [cloudSupercurricularCount, setCloudSupercurricularCount] = useState(0)

  useEffect(() => {
    setApplication(readApplication())
    setSupercurricular(readSupercurricular())

    const loadCloud = async () => {
      try {
        const supabase = createClient()
        const { data } = await supabase.auth.getUser()
        if (!data.user) return
        const [applicationRows, superRows] = await Promise.all([
          supabase.from("application_evidence").select("id", { count: "exact", head: true }).eq("user_id", data.user.id),
          supabase.from("supercurricular_items").select("id", { count: "exact", head: true }).eq("user_id", data.user.id),
        ])
        setCloudApplicationCount(applicationRows.count ?? 0)
        setCloudSupercurricularCount(superRows.count ?? 0)
      } catch { /* local evidence still works */ }
    }
    void loadCloud()
  }, [])

  const insight = useMemo(() => {
    const app = applicationCoverage(application, supercurricular)
    const applicationEvidence = Math.max(app.completed + app.reflected, cloudApplicationCount + cloudSupercurricularCount)
    const domains: DomainSummary[] = [
      domainSummary("Interview", intelligence.skills, app.score, applicationEvidence),
      domainSummary("Admissions test", intelligence.skills, app.score, applicationEvidence),
      domainSummary("Writing", intelligence.skills, app.score, applicationEvidence),
      domainSummary("Application", intelligence.skills, app.score, applicationEvidence),
    ]
    const evidencedSkills = intelligence.skills.filter(item => item.evidenceCount > 0)
    const totalEvidence = evidencedSkills.reduce((sum, item) => sum + item.evidenceCount, 0) + applicationEvidence
    const evidenceConfidence = clamp(Math.min(100, totalEvidence * 5))
    const domainCoverage = clamp(mean(domains.map(item => item.coverage)))
    const ups = evidencedSkills.filter(item => item.trend === "up").length
    const downs = evidencedSkills.filter(item => item.trend === "down").length
    const momentum = evidencedSkills.length ? clamp(50 + (ups - downs) * 12) : 50
    const secure = evidencedSkills.filter(item => item.status === "Secure").length
    const developing = evidencedSkills.filter(item => item.status === "Developing").length
    const emerging = evidencedSkills.filter(item => item.status === "Emerging").length
    const readiness = clamp(intelligence.preparationScore * 0.7 + domainCoverage * 0.3)
    const gaps: string[] = []
    if (!intelligence.interviewCount) gaps.push("No interview baseline yet — complete one formal or live interview so reasoning-aloud evidence is available.")
    if (!intelligence.fullPaperCount) gaps.push("No full admissions-test paper yet — section-level targeting is still limited.")
    if (!intelligence.essayCount) gaps.push("No writing analysis yet — argument and essay feedback are not represented in the tutor model.")
    if (app.completed < 3) gaps.push("Application evidence is thin — add reading, projects, written work or academic interests so interview practice can use your real material.")
    if (!supercurricular.length && !cloudSupercurricularCount) gaps.push("No supercurricular reflection is connected yet — the tutor has little evidence of how you engage with ideas beyond the syllabus.")
    return { app, domains, totalEvidence, evidenceConfidence, domainCoverage, momentum, secure, developing, emerging, readiness, gaps }
  }, [application, cloudApplicationCount, cloudSupercurricularCount, intelligence, supercurricular])

  return <section className="space-y-5" aria-labelledby="deep-insight-title">
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.18em] text-[#147d91]"><Radar className="size-4" />Deep tutor intelligence</div>
        <h2 id="deep-insight-title" className="mt-2 font-serif text-3xl font-bold">What the evidence actually says</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">This is a preparation profile, not an admissions prediction. ScholarBridge separates performance, evidence depth and coverage so a high score in one activity is not mistaken for a complete picture.</p>
      </div>
      <Button asChild variant="outline"><Link href="/progress-proof">Open full evidence timeline <ArrowRight /></Link></Button>
    </div>

    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Card className="border-0 bg-[#102a43] text-white shadow-none"><CardHeader><Gauge className="size-5 text-[#8dd7de]" /><CardDescription className="text-white/60">Preparation profile</CardDescription><CardTitle className="font-serif text-4xl">{insight.readiness}%</CardTitle></CardHeader><CardContent><p className="text-sm leading-6 text-white/70">Blends evidenced skill level with how much of the preparation picture has actually been measured.</p></CardContent></Card>
      <Card className="shadow-none"><CardHeader><Layers3 className="size-5 text-[#147d91]" /><CardDescription>Evidence confidence</CardDescription><CardTitle className="font-serif text-4xl">{insight.evidenceConfidence}%</CardTitle></CardHeader><CardContent><Progress value={insight.evidenceConfidence} /><p className="mt-2 text-xs leading-5 text-slate-500">Based on {insight.totalEvidence} connected evidence point{insight.totalEvidence === 1 ? "" : "s"}; more independent evidence makes the profile less fragile.</p></CardContent></Card>
      <Card className="shadow-none"><CardHeader><Radar className="size-5 text-[#147d91]" /><CardDescription>Domain coverage</CardDescription><CardTitle className="font-serif text-4xl">{insight.domainCoverage}%</CardTitle></CardHeader><CardContent><Progress value={insight.domainCoverage} /><p className="mt-2 text-xs leading-5 text-slate-500">Interview, admissions tests, writing and application evidence are tracked separately so missing areas stay visible.</p></CardContent></Card>
      <Card className="shadow-none"><CardHeader>{insight.momentum > 55 ? <TrendingUp className="size-5 text-emerald-700" /> : insight.momentum < 45 ? <TrendingDown className="size-5 text-amber-700" /> : <Activity className="size-5 text-[#147d91]" />}<CardDescription>Recent momentum</CardDescription><CardTitle className="font-serif text-4xl">{insight.momentum}</CardTitle></CardHeader><CardContent><p className="text-sm leading-6 text-slate-600">{insight.secure} secure · {insight.developing} developing · {insight.emerging} emerging evidenced skills.</p></CardContent></Card>
    </div>

    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {insight.domains.map(domain => {
        const meta = domainMeta[domain.domain]
        const Icon = meta.icon
        return <Card key={domain.domain} className="shadow-none">
          <CardHeader>
            <div className="flex items-center justify-between gap-2"><Icon className="size-5 text-[#147d91]" /><Badge variant="outline">{domain.evidence} evidence</Badge></div>
            <CardTitle className="font-serif text-xl">{domain.domain}</CardTitle>
            <CardDescription>{domain.note}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div><div className="mb-1 flex justify-between text-xs"><span>Current profile</span><strong>{domain.score || "—"}{domain.score ? "%" : ""}</strong></div><Progress value={domain.score} /></div>
            <div><div className="mb-1 flex justify-between text-xs"><span>Coverage</span><strong>{domain.coverage}%</strong></div><Progress value={domain.coverage} /></div>
            {domain.weakest && <p className="text-xs leading-5 text-slate-600"><strong>Current constraint:</strong> {domain.weakest.label} ({domain.weakest.score}%).</p>}
            {domain.strongest && <p className="text-xs leading-5 text-slate-600"><strong>Best evidence:</strong> {domain.strongest.label} ({domain.strongest.score}%).</p>}
            {domain.domain === "Application" && <p className="text-xs leading-5 text-slate-600"><strong>Application map:</strong> {insight.app.completed}/{insight.app.total} core evidence areas populated; {Math.max(insight.app.reflected, cloudSupercurricularCount)} reflected supercurricular item{Math.max(insight.app.reflected, cloudSupercurricularCount) === 1 ? "" : "s"}.</p>}
            <Button asChild size="sm" variant="outline" className="w-full"><Link href={domain.href}>Strengthen this domain <ArrowRight /></Link></Button>
          </CardContent>
        </Card>
      })}
    </div>

    <div className="grid gap-5 xl:grid-cols-[1.1fr_.9fr]">
      <Card className="shadow-none">
        <CardHeader><div className="flex items-center gap-2"><Lightbulb className="size-5 text-[#147d91]" /><CardTitle className="font-serif text-2xl">Evidence → interpretation → action</CardTitle></div><CardDescription>Why the tutor is prioritising what it is prioritising.</CardDescription></CardHeader>
        <CardContent className="space-y-3">
          {intelligence.mistakes.length ? intelligence.mistakes.slice(0, 5).map((item, index) => <div key={item.id} className="rounded-2xl border bg-white p-4">
            <div className="flex flex-wrap items-center gap-2"><Badge variant={item.priority === "high" ? "destructive" : "outline"}>{item.priority}</Badge><span className="text-xs font-bold uppercase tracking-wider text-slate-500">Pattern {index + 1}</span><strong>{item.label}</strong></div>
            <div className="mt-3 grid gap-3 md:grid-cols-3"><div><p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Evidence</p><p className="mt-1 text-sm leading-6 text-slate-700">{item.evidence}</p></div><div><p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Interpretation</p><p className="mt-1 text-sm leading-6 text-slate-700">This is being treated as a repeated preparation signal, not a fixed trait.</p></div><div><p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Next test</p><p className="mt-1 text-sm leading-6 text-slate-700">{item.action}</p></div></div>
            <Button asChild variant="link" className="mt-2 h-auto p-0"><Link href={item.href}>Run targeted practice <ArrowRight /></Link></Button>
          </div>) : <div className="rounded-2xl border border-dashed p-5 text-sm leading-6 text-slate-600">No repeated weakness pattern is strong enough yet. Complete a full paper, interview and writing review to give the tutor independent evidence across formats.</div>}
        </CardContent>
      </Card>

      <div className="space-y-5">
        <Card className="shadow-none">
          <CardHeader><div className="flex items-center gap-2"><CircleAlert className="size-5 text-amber-700" /><CardTitle className="font-serif text-2xl">Blind spots</CardTitle></div><CardDescription>Areas where the tutor should be cautious because evidence is missing.</CardDescription></CardHeader>
          <CardContent className="space-y-3">{insight.gaps.length ? insight.gaps.map((gap, index) => <div key={gap} className="flex gap-3 rounded-xl bg-amber-50 p-3 text-sm leading-6 text-amber-950"><span className="grid size-6 shrink-0 place-items-center rounded-full bg-amber-100 text-xs font-bold">{index + 1}</span><span>{gap}</span></div>) : <div className="flex gap-3 rounded-xl bg-emerald-50 p-4 text-sm leading-6 text-emerald-950"><CheckCircle2 className="mt-0.5 size-5 shrink-0" />All four major preparation domains currently have usable evidence. Keep refreshing it with new work rather than relying on old results.</div>}</CardContent>
        </Card>
        <Card className="shadow-none"><CardHeader><Sparkles className="size-5 text-[#147d91]" /><CardTitle className="font-serif text-2xl">Integrated next moves</CardTitle><CardDescription>Jump directly from the insight to the tool that can test it.</CardDescription></CardHeader><CardContent className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">{intelligence.recommendations.slice(0, 5).map(action => <Button key={action.id} asChild variant="outline" className="h-auto justify-between py-3 text-left"><Link href={action.href}><span><span className="block font-semibold">{action.label}</span><span className="mt-0.5 block text-xs font-normal text-slate-500">{action.domain} · about {action.minutes} min</span></span><ArrowRight className="size-4" /></Link></Button>)}</CardContent></Card>
      </div>
    </div>

    <Card className="shadow-none">
      <CardHeader><div className="flex flex-wrap items-center justify-between gap-3"><div><CardTitle className="font-serif text-2xl">Recent evidence trail</CardTitle><CardDescription>What the tutor is currently using to form its view. Scores are practice signals, not admissions probabilities.</CardDescription></div><Button asChild variant="outline" size="sm"><Link href="/progress-proof">Inspect all evidence</Link></Button></div></CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{intelligence.evidence.length ? intelligence.evidence.slice(0, 6).map(item => <div key={item.id} className="rounded-2xl border bg-white p-4"><div className="flex items-center justify-between gap-2"><Badge variant="outline">{item.domain}</Badge><span className="text-xs text-slate-400">{shortDate(item.date)}</span></div><p className="mt-3 font-semibold">{item.skill}</p><div className="mt-2 flex items-center gap-2"><Progress value={item.score} className="flex-1" /><span className="text-xs font-bold">{item.score}%</span></div><p className="mt-2 text-xs leading-5 text-slate-500">{item.evidence}</p></div>) : <div className="col-span-full rounded-2xl border border-dashed p-5 text-sm text-slate-600">Complete preparation activities and the evidence trail will appear here.</div>}</CardContent>
    </Card>
  </section>
}

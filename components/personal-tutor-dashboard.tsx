"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { ArrowRight, Brain, CalendarCheck2, CheckCircle2, Clock3, MessageSquareText, RefreshCw, Sparkles, Target, TrendingUp } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import { createClient } from "@/lib/supabase/client"
import { PROFILE_KEY, PROGRESS_KEY, TUTOR_KEY, buildDailyPlan, buildStudentIntelligence, type TutorPlan, type TutorProfile } from "@/lib/personal-tutor"

type TutorState = {
  availableMinutes?: number
  currentPlan?: TutorPlan
  planHistory?: TutorPlan[]
  reflection?: string
  completedActionIds?: string[]
}

type ChatMessage = { role: "student" | "tutor"; text: string }

function readJson(key: string) {
  try { return JSON.parse(localStorage.getItem(key) || "{}") as Record<string, unknown> } catch { return {} }
}

export function PersonalTutorDashboard() {
  const [profile, setProfile] = useState<Record<string, unknown>>({ university: "Both", course: "Physics", year: "2027" })
  const [progressData, setProgressData] = useState<Record<string, unknown>>({})
  const [tutorState, setTutorState] = useState<TutorState>({ availableMinutes: 30, completedActionIds: [] })
  const [loaded, setLoaded] = useState(false)
  const [question, setQuestion] = useState("")
  const [chat, setChat] = useState<ChatMessage[]>([])
  const [asking, setAsking] = useState(false)
  const [cloudStatus, setCloudStatus] = useState<"idle" | "saved" | "local">("idle")

  useEffect(() => {
    try {
      setProfile({ university: "Both", course: "Physics", year: "2027", ...readJson(PROFILE_KEY) })
      setProgressData(readJson(PROGRESS_KEY))
      const saved = readJson(TUTOR_KEY) as TutorState
      setTutorState({ availableMinutes: 30, completedActionIds: [], ...saved })
    } finally { setLoaded(true) }
  }, [])

  const intelligence = useMemo(() => buildStudentIntelligence(profile, progressData), [profile, progressData])
  const availableMinutes = tutorState.availableMinutes ?? 30
  const plan = useMemo(() => tutorState.currentPlan?.availableMinutes === availableMinutes ? tutorState.currentPlan : buildDailyPlan(intelligence, availableMinutes), [tutorState.currentPlan, availableMinutes, intelligence])
  const completed = tutorState.completedActionIds ?? []
  const planMinutes = plan.actions.reduce((sum, item) => sum + item.minutes, 0)

  useEffect(() => {
    if (!loaded) return
    localStorage.setItem(TUTOR_KEY, JSON.stringify({ ...tutorState, currentPlan: plan }))
  }, [loaded, tutorState, plan])

  useEffect(() => {
    if (!loaded) return
    const supabase = createClient()
    let cancelled = false
    const save = async () => {
      const { data } = await supabase.auth.getUser()
      if (!data.user || cancelled) { if (!cancelled) setCloudStatus("local"); return }
      const { error } = await supabase.from("student_intelligence").upsert({ user_id: data.user.id, snapshot: intelligence, updated_at: new Date().toISOString() }, { onConflict: "user_id" })
      if (!cancelled) setCloudStatus(error ? "local" : "saved")
    }
    void save()
    return () => { cancelled = true }
  }, [loaded, intelligence])

  async function regeneratePlan(minutes = availableMinutes) {
    const next = buildDailyPlan(intelligence, minutes)
    const nextState: TutorState = { ...tutorState, availableMinutes: minutes, currentPlan: next, completedActionIds: [], planHistory: [next, ...(tutorState.planHistory ?? [])].slice(0, 20) }
    setTutorState(nextState)
    try {
      const supabase = createClient()
      const { data } = await supabase.auth.getUser()
      if (data.user) await supabase.from("tutor_plans").insert({ user_id: data.user.id, available_minutes: minutes, plan: next, status: "active" })
    } catch { /* offline-first plan still works */ }
  }

  function toggleAction(id: string) {
    const next = completed.includes(id) ? completed.filter(item => item !== id) : [...completed, id]
    setTutorState(current => ({ ...current, completedActionIds: next }))
  }

  async function askTutor() {
    const text = question.trim()
    if (!text || asking) return
    setQuestion("")
    setChat(current => [...current, { role: "student", text }])
    setAsking(true)
    try {
      const response = await fetch("/api/personal-tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: text, profile: intelligence.profile, intelligence: { priority: intelligence.priority, strongest: intelligence.strongest, mistakes: intelligence.mistakes.slice(0, 5), skills: intelligence.skills.filter(item => item.evidenceCount).slice(0, 10), counts: { interviews: intelligence.interviewCount, papers: intelligence.fullPaperCount, essays: intelligence.essayCount } }, plan, conversation: chat.slice(-6) }),
      })
      const data = await response.json() as { reply?: string }
      setChat(current => [...current, { role: "tutor", text: data.reply ?? "Focus on the highest-priority action in today's plan, then reflect on what changed in your reasoning." }])
    } catch {
      setChat(current => [...current, { role: "tutor", text: "Use today's highest-priority activity first. After it, record one mistake pattern you noticed and one thing you would do differently next time." }])
    } finally { setAsking(false) }
  }

  const priority = intelligence.priority
  const strongest = intelligence.strongest
  const profileTyped = profile as TutorProfile

  return <main className="min-h-screen bg-[#f4f7f7] text-[#172b3a]">
    <header className="border-b bg-[#102a43] text-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-5 sm:px-6">
        <div className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-2xl border border-white/15 bg-white/10"><Brain className="size-5 text-[#8dd7de]" /></span><div><p className="font-serif text-xl font-bold">Personal AI Tutor</p><p className="text-xs text-blue-100/65">{intelligence.profile.university} · {intelligence.profile.course} · {intelligence.profile.year} entry</p></div></div>
        <div className="flex items-center gap-2"><Badge className="border-white/15 bg-white/10 text-white">{cloudStatus === "saved" ? "Cloud intelligence saved" : cloudStatus === "local" ? "Offline/local mode" : "Building profile"}</Badge><Button asChild variant="outline" className="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white"><Link href="/">All tools</Link></Button></div>
      </div>
    </header>

    <div className="mx-auto max-w-7xl space-y-6 px-4 py-7 sm:px-6 lg:py-10">
      <section className="grid gap-5 xl:grid-cols-[1.25fr_.75fr]">
        <Card className="border-0 bg-white shadow-[0_20px_60px_rgba(16,42,67,.08)]"><CardHeader><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#147d91]">Your tutor recommends</p><CardTitle className="mt-2 font-serif text-4xl">{plan.focus}</CardTitle></div><Badge variant="outline"><Clock3 className="size-3.5" />{planMinutes} min session</Badge></div><CardDescription className="max-w-3xl text-sm leading-6">{plan.rationale}</CardDescription></CardHeader><CardContent className="space-y-3">{plan.actions.map((action, index) => { const done = completed.includes(action.id); return <div key={action.id} className={`flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center ${done ? "border-emerald-200 bg-emerald-50" : "bg-[#fbfcfc]"}`}><button onClick={() => toggleAction(action.id)} className={`grid size-9 shrink-0 place-items-center rounded-full border text-sm font-bold ${done ? "border-emerald-600 bg-emerald-600 text-white" : "border-slate-300 bg-white"}`}>{done ? <CheckCircle2 className="size-5" /> : index + 1}</button><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><strong>{action.label}</strong><Badge variant="outline">{action.minutes} min</Badge><Badge variant="outline">{action.domain}</Badge></div><p className="mt-1 text-sm leading-6 text-slate-600">{action.note}</p></div>{action.href.startsWith("/tutor#") ? <Button variant="outline" onClick={() => document.getElementById("reflection")?.scrollIntoView({ behavior: "smooth" })}>Reflect</Button> : <Button asChild><Link href={action.href}>Start <ArrowRight /></Link></Button>}</div>})}</CardContent></Card>

        <div className="space-y-4"><Card className="shadow-none"><CardHeader><CardTitle className="font-serif text-xl">How long have you got?</CardTitle><CardDescription>The tutor rebuilds the session around your available time.</CardDescription></CardHeader><CardContent><div className="grid grid-cols-3 gap-2">{[10,20,30,45,60,90].map(minutes => <Button key={minutes} variant={availableMinutes === minutes ? "default" : "outline"} onClick={() => void regeneratePlan(minutes)}>{minutes} min</Button>)}</div><Button variant="ghost" className="mt-3 w-full" onClick={() => void regeneratePlan()}><RefreshCw />Regenerate plan</Button></CardContent></Card>
          <Card className="shadow-none"><CardHeader><CardTitle className="font-serif text-xl">Preparation profile</CardTitle></CardHeader><CardContent className="grid grid-cols-2 gap-3"><div className="rounded-xl bg-[#edf7f8] p-3"><p className="text-2xl font-bold">{intelligence.interviewCount}</p><p className="text-xs text-slate-500">interviews</p></div><div className="rounded-xl bg-[#edf7f8] p-3"><p className="text-2xl font-bold">{intelligence.fullPaperCount}</p><p className="text-xs text-slate-500">full papers</p></div><div className="rounded-xl bg-[#edf7f8] p-3"><p className="text-2xl font-bold">{intelligence.essayCount}</p><p className="text-xs text-slate-500">essay analyses</p></div><div className="rounded-xl bg-[#edf7f8] p-3"><p className="text-2xl font-bold">{intelligence.preparationScore || "—"}{intelligence.preparationScore ? "%" : ""}</p><p className="text-xs text-slate-500">evidenced skills</p></div></CardContent></Card>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="border-amber-200 bg-amber-50 shadow-none"><CardHeader><Target className="size-5 text-amber-800" /><CardDescription>Priority</CardDescription><CardTitle className="font-serif text-xl">{priority?.label ?? "Build baseline"}</CardTitle></CardHeader><CardContent><p className="text-sm leading-6 text-slate-700">{priority?.note ?? "Complete a formal interview and full paper so the tutor can target preparation accurately."}</p>{priority && <div className="mt-3"><Progress value={priority.score} /><p className="mt-1 text-xs text-slate-500">{priority.score}% · {priority.status}</p></div>}</CardContent></Card>
        <Card className="border-emerald-200 bg-emerald-50 shadow-none"><CardHeader><TrendingUp className="size-5 text-emerald-700" /><CardDescription>Strongest evidenced area</CardDescription><CardTitle className="font-serif text-xl">{strongest?.label ?? "Not enough evidence yet"}</CardTitle></CardHeader><CardContent><p className="text-sm leading-6 text-slate-700">{strongest ? `${strongest.score}% across ${strongest.evidenceCount} evidence point${strongest.evidenceCount === 1 ? "" : "s"}.` : "The tutor will identify this as you complete preparation."}</p></CardContent></Card>
        <Card className="shadow-none"><CardHeader><Sparkles className="size-5 text-[#147d91]" /><CardDescription>Mistake DNA</CardDescription><CardTitle className="font-serif text-xl">{intelligence.mistakes[0]?.label ?? "Collecting patterns"}</CardTitle></CardHeader><CardContent><p className="text-sm leading-6 text-slate-600">{intelligence.mistakes[0]?.evidence ?? "The tutor looks for repeated reasoning behaviours across papers, interviews and essays."}</p><Button asChild variant="link" className="mt-2 h-auto p-0"><Link href="/mistake-dna">Open Mistake DNA <ArrowRight /></Link></Button></CardContent></Card>
        <Card className="shadow-none"><CardHeader><CalendarCheck2 className="size-5 text-[#147d91]" /><CardDescription>Application twin</CardDescription><CardTitle className="font-serif text-xl">{profileTyped.course ?? "Course"} evidence map</CardTitle></CardHeader><CardContent><p className="text-sm leading-6 text-slate-600">Connect books, projects, written work and academic interests to realistic interview questions.</p><Button asChild variant="link" className="mt-2 h-auto p-0"><Link href="/application-profile">Open digital twin <ArrowRight /></Link></Button></CardContent></Card>
      </section>

      <section className="grid gap-5 lg:grid-cols-[1fr_.9fr]">
        <Card className="shadow-none"><CardHeader><div className="flex items-center gap-2"><MessageSquareText className="size-5 text-[#147d91]" /><CardTitle className="font-serif text-2xl">Ask your tutor</CardTitle></div><CardDescription>The tutor receives your current preparation profile and today's priorities, so you do not need to re-explain your history every time.</CardDescription></CardHeader><CardContent className="space-y-4"><div className="max-h-80 space-y-3 overflow-y-auto">{chat.length ? chat.map((message, index) => <div key={`${message.role}-${index}`} className={`rounded-2xl p-4 text-sm leading-6 ${message.role === "tutor" ? "bg-[#edf7f8]" : "ml-8 border bg-white"}`}><p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-slate-500">{message.role}</p>{message.text}</div>) : <div className="rounded-2xl bg-[#edf7f8] p-4 text-sm leading-6 text-slate-700">Ask what to work on, why something is a priority, how to structure the week, or what your recurring mistakes suggest. The tutor should direct you back into active practice rather than becoming a passive answer machine.</div>}</div><Textarea value={question} onChange={event => setQuestion(event.target.value)} rows={4} placeholder="Ask your personal tutor…" /><div className="flex justify-end"><Button onClick={() => void askTutor()} disabled={!question.trim() || asking}>{asking ? "Thinking…" : "Ask tutor"} <ArrowRight /></Button></div></CardContent></Card>

        <Card id="reflection" className="shadow-none"><CardHeader><CardTitle className="font-serif text-2xl">Reflection & memory</CardTitle><CardDescription>Short reflections become useful learning context for future plans.</CardDescription></CardHeader><CardContent className="space-y-4"><Textarea value={tutorState.reflection ?? ""} onChange={event => setTutorState(current => ({ ...current, reflection: event.target.value }))} rows={7} placeholder="What changed in your thinking today? What mistake would you recognise earlier next time?" /><div className="rounded-2xl border bg-slate-50 p-4"><p className="text-xs font-bold uppercase tracking-wider text-slate-500">Current learning memory</p>{intelligence.mistakes.slice(0, 3).map(item => <p key={item.id} className="mt-2 text-sm leading-6">• {item.label}: {item.action}</p>)}{!intelligence.mistakes.length && <p className="mt-2 text-sm text-slate-600">Complete more activities and the tutor will build a durable mistake-and-strength profile.</p>}</div><Button asChild variant="outline" className="w-full"><Link href="/progress-proof">See proof of progress <ArrowRight /></Link></Button></CardContent></Card>
      </section>

      <section className="grid gap-3 md:grid-cols-2 lg:grid-cols-4"><Button asChild variant="outline" className="h-auto justify-between rounded-2xl p-4"><Link href="/daily-challenge"><span><strong className="block text-left">Daily challenge</strong><small className="text-slate-500">One high-quality academic problem</small></span><ArrowRight /></Link></Button><Button asChild variant="outline" className="h-auto justify-between rounded-2xl p-4"><Link href="/tutorial-lab"><span><strong className="block text-left">Tutorial Lab</strong><small className="text-slate-500">Draw, calculate and analyse working</small></span><ArrowRight /></Link></Button><Button asChild variant="outline" className="h-auto justify-between rounded-2xl p-4"><Link href="/mock-day"><span><strong className="block text-left">Mock interview day</strong><small className="text-slate-500">Adaptive interview-day simulation</small></span><ArrowRight /></Link></Button><Button asChild variant="outline" className="h-auto justify-between rounded-2xl p-4"><Link href="/supercurricular-coach"><span><strong className="block text-left">Explore & reflect</strong><small className="text-slate-500">Turn reading into interview material</small></span><ArrowRight /></Link></Button></section>
    </div>
  </main>
}

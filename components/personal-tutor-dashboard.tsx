"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import {
  ArrowRight,
  BookOpenCheck,
  Brain,
  CalendarCheck2,
  CheckCircle2,
  Cloud,
  Clock3,
  ListTodo,
  MessageSquareText,
  RefreshCw,
  Save,
  SearchCheck,
  Sparkles,
  Swords,
  Target,
  TrendingUp,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import { createClient } from "@/lib/supabase/client"
import {
  PROFILE_KEY,
  PROGRESS_KEY,
  TUTOR_KEY,
  buildDailyPlan,
  buildStudentIntelligence,
  type TutorPlan,
  type TutorProfile,
} from "@/lib/personal-tutor"

type TutorMode = "coach" | "challenge" | "explain" | "plan" | "review"
type ChatMessage = { role: "student" | "tutor"; text: string }

type TutorState = {
  availableMinutes?: number
  currentPlan?: TutorPlan
  planHistory?: TutorPlan[]
  reflection?: string
  completedActionIds?: string[]
  chat?: ChatMessage[]
  mode?: TutorMode
}

const CHAT_STATE_KEY = "oxbridge-personal-tutor-chat-v2"
const REFLECTION_STATE_KEY = "oxbridge-personal-tutor-reflection-v2"
const SETTINGS_STATE_KEY = "oxbridge-personal-tutor-settings-v2"

const modeOptions: Array<{
  id: TutorMode
  label: string
  description: string
  icon: typeof Brain
}> = [
  { id: "coach", label: "Coach", description: "Socratic prompts and targeted hints", icon: Brain },
  { id: "challenge", label: "Challenge", description: "Pressure-test assumptions and adapt", icon: Swords },
  { id: "explain", label: "Explain", description: "Short teaching chunks then application", icon: BookOpenCheck },
  { id: "plan", label: "Plan", description: "Prioritise the next preparation actions", icon: ListTodo },
  { id: "review", label: "Review", description: "Find recurring patterns in your evidence", icon: SearchCheck },
]

const quickPrompts: Array<{ label: string; prompt: string; mode: TutorMode }> = [
  { label: "What should I do next?", prompt: "What should I do next, based on my strongest current evidence and weakest recurring area?", mode: "plan" },
  { label: "Challenge my weakest area", prompt: "Challenge me on my weakest evidenced area. Start with one demanding question and adapt to my reasoning rather than giving the answer.", mode: "challenge" },
  { label: "Review my mistakes", prompt: "Review my recurring mistake patterns. Which one matters most now, what evidence supports that, and what should I do to break the pattern?", mode: "review" },
  { label: "Teach then test me", prompt: "Choose the most useful concept for me to strengthen. Explain it briefly, then test whether I can apply it to something unfamiliar.", mode: "explain" },
]

function readJson(key: string) {
  try { return JSON.parse(localStorage.getItem(key) || "{}") as Record<string, unknown> } catch { return {} }
}

function isTutorMode(value: unknown): value is TutorMode {
  return value === "coach" || value === "challenge" || value === "explain" || value === "plan" || value === "review"
}

function cleanChat(value: unknown): ChatMessage[] {
  if (!Array.isArray(value)) return []
  const messages: ChatMessage[] = []
  for (const item of value) {
    if (!item || typeof item !== "object") continue
    const raw = item as { role?: unknown; text?: unknown }
    if (raw.role !== "student" && raw.role !== "tutor") continue
    if (typeof raw.text !== "string" || !raw.text.trim()) continue
    messages.push({ role: raw.role, text: raw.text.trim() })
  }
  return messages.slice(-24)
}

export function PersonalTutorDashboard() {
  const [profile, setProfile] = useState<Record<string, unknown>>({ university: "Both", course: "Physics", year: "2027" })
  const [progressData, setProgressData] = useState<Record<string, unknown>>({})
  const [tutorState, setTutorState] = useState<TutorState>({ availableMinutes: 30, completedActionIds: [] })
  const [loaded, setLoaded] = useState(false)
  const [cloudHydrated, setCloudHydrated] = useState(false)
  const [question, setQuestion] = useState("")
  const [chat, setChat] = useState<ChatMessage[]>([])
  const [mode, setMode] = useState<TutorMode>("coach")
  const [asking, setAsking] = useState(false)
  const [savingReflection, setSavingReflection] = useState(false)
  const [lastSavedReflection, setLastSavedReflection] = useState("")
  const [cloudStatus, setCloudStatus] = useState<"idle" | "saved" | "local">("idle")

  useEffect(() => {
    const hydrate = async () => {
      try {
        setProfile({ university: "Both", course: "Physics", year: "2027", ...readJson(PROFILE_KEY) })
        setProgressData(readJson(PROGRESS_KEY))
        const saved = readJson(TUTOR_KEY) as TutorState
        setTutorState({ availableMinutes: 30, completedActionIds: [], ...saved })
        setChat(cleanChat(saved.chat))
        if (isTutorMode(saved.mode)) setMode(saved.mode)

        const supabase = createClient()
        const { data } = await supabase.auth.getUser()
        if (!data.user) {
          setCloudStatus("local")
          return
        }

        const { data: rows, error } = await supabase
          .from("user_state")
          .select("state_key,state_value")
          .eq("user_id", data.user.id)
          .in("state_key", [CHAT_STATE_KEY, REFLECTION_STATE_KEY, SETTINGS_STATE_KEY])

        if (error) {
          setCloudStatus("local")
          return
        }

        for (const row of rows ?? []) {
          const value = row.state_value as Record<string, unknown> | null
          if (row.state_key === CHAT_STATE_KEY) {
            const cloudChat = cleanChat(value?.messages)
            if (cloudChat.length) setChat(cloudChat)
          }
          if (row.state_key === REFLECTION_STATE_KEY && typeof value?.reflection === "string") {
            const reflection = value.reflection.slice(0, 2500)
            setTutorState(current => ({ ...current, reflection }))
            setLastSavedReflection(reflection)
          }
          if (row.state_key === SETTINGS_STATE_KEY && isTutorMode(value?.mode)) setMode(value.mode)
        }
        setCloudStatus("saved")
      } finally {
        setLoaded(true)
        setCloudHydrated(true)
      }
    }
    void hydrate()
  }, [])

  const intelligence = useMemo(() => buildStudentIntelligence(profile, progressData), [profile, progressData])
  const availableMinutes = tutorState.availableMinutes ?? 30
  const plan = useMemo(
    () => tutorState.currentPlan?.availableMinutes === availableMinutes ? tutorState.currentPlan : buildDailyPlan(intelligence, availableMinutes),
    [tutorState.currentPlan, availableMinutes, intelligence],
  )
  const completed = tutorState.completedActionIds ?? []
  const planMinutes = plan.actions.reduce((sum, item) => sum + item.minutes, 0)
  const priority = intelligence.priority
  const strongest = intelligence.strongest
  const profileTyped = profile as TutorProfile

  useEffect(() => {
    if (!loaded) return
    localStorage.setItem(TUTOR_KEY, JSON.stringify({ ...tutorState, currentPlan: plan, chat, mode }))
  }, [loaded, tutorState, plan, chat, mode])

  useEffect(() => {
    if (!loaded) return
    const supabase = createClient()
    let cancelled = false
    const save = async () => {
      const { data } = await supabase.auth.getUser()
      if (!data.user || cancelled) { if (!cancelled) setCloudStatus("local"); return }
      const { error } = await supabase.from("student_intelligence").upsert(
        { user_id: data.user.id, snapshot: intelligence, updated_at: new Date().toISOString() },
        { onConflict: "user_id" },
      )
      if (!cancelled) setCloudStatus(error ? "local" : "saved")
    }
    void save()
    return () => { cancelled = true }
  }, [loaded, intelligence])

  useEffect(() => {
    if (!cloudHydrated) return
    const saveMode = async () => {
      const supabase = createClient()
      const { data } = await supabase.auth.getUser()
      if (!data.user) return
      await supabase.from("user_state").upsert({
        user_id: data.user.id,
        state_key: SETTINGS_STATE_KEY,
        state_value: { mode },
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id,state_key" })
    }
    void saveMode()
  }, [cloudHydrated, mode])

  async function regeneratePlan(minutes = availableMinutes) {
    const next = buildDailyPlan(intelligence, minutes)
    const nextState: TutorState = {
      ...tutorState,
      availableMinutes: minutes,
      currentPlan: next,
      completedActionIds: [],
      planHistory: [next, ...(tutorState.planHistory ?? [])].slice(0, 20),
    }
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

  async function askTutor(customText?: string, customMode?: TutorMode) {
    const text = (customText ?? question).trim()
    if (!text || asking) return
    const selectedMode = customMode ?? mode
    if (customMode) setMode(customMode)
    setQuestion("")
    setChat(current => [...current, { role: "student" as const, text }].slice(-24))
    setAsking(true)

    try {
      const response = await fetch("/api/personal-tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: text,
          mode: selectedMode,
          reflection: tutorState.reflection ?? "",
          profile: intelligence.profile,
          intelligence: {
            priority: intelligence.priority,
            strongest: intelligence.strongest,
            mistakes: intelligence.mistakes.slice(0, 5),
            skills: intelligence.skills.filter(item => item.evidenceCount).slice(0, 10),
            counts: { interviews: intelligence.interviewCount, papers: intelligence.fullPaperCount, essays: intelligence.essayCount },
          },
          plan,
          conversation: chat.slice(-10),
        }),
      })
      const data = await response.json() as { reply?: string; authRequired?: boolean }
      const reply = data.reply ?? "Focus on the highest-priority action in today's plan, then reflect on what changed in your reasoning."
      setChat(current => [...current, { role: "tutor" as const, text: reply }].slice(-24))
      if (data.authRequired) setCloudStatus("local")
      else if (response.ok) setCloudStatus("saved")
    } catch {
      setChat(current => [...current, { role: "tutor" as const, text: "Use today's highest-priority activity first. After it, record one mistake pattern you noticed and one thing you would do differently next time." }].slice(-24))
    } finally {
      setAsking(false)
    }
  }

  async function saveReflection() {
    const reflection = (tutorState.reflection ?? "").trim()
    if (!reflection || savingReflection) return
    setSavingReflection(true)
    try {
      const supabase = createClient()
      const { data } = await supabase.auth.getUser()
      if (!data.user) {
        setLastSavedReflection(reflection)
        setCloudStatus("local")
        return
      }

      const now = new Date().toISOString()
      const { error } = await supabase.from("user_state").upsert({
        user_id: data.user.id,
        state_key: REFLECTION_STATE_KEY,
        state_value: { reflection: reflection.slice(0, 2500) },
        updated_at: now,
      }, { onConflict: "user_id,state_key" })

      if (!error && reflection !== lastSavedReflection) {
        await supabase.from("memory_items").insert({
          user_id: data.user.id,
          category: "strategy",
          content: reflection.slice(0, 1500),
          confidence: 0.85,
          source_type: "tutor_reflection",
          is_active: true,
          updated_at: now,
        })
      }

      setLastSavedReflection(reflection)
      setCloudStatus(error ? "local" : "saved")
    } finally {
      setSavingReflection(false)
    }
  }

  async function clearConversation() {
    setChat([])
    const supabase = createClient()
    const { data } = await supabase.auth.getUser()
    if (!data.user) return
    await supabase.from("user_state").upsert({
      user_id: data.user.id,
      state_key: CHAT_STATE_KEY,
      state_value: { messages: [] },
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id,state_key" })
  }

  return <main className="min-h-screen bg-[#f4f7f7] text-[#172b3a]">
    <header className="border-b bg-[#102a43] text-white">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-5 sm:px-6">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-2xl border border-white/15 bg-white/10"><Brain className="size-5 text-[#8dd7de]" /></span>
          <div><p className="font-serif text-xl font-bold">Personal AI Tutor</p><p className="text-xs text-blue-100/65">{intelligence.profile.university} · {intelligence.profile.course} · {intelligence.profile.year} entry</p></div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge className="border-white/15 bg-white/10 text-white"><Cloud className="size-3.5" />{cloudStatus === "saved" ? "Cloud continuity active" : cloudStatus === "local" ? "Local mode" : "Loading history"}</Badge>
          <Button asChild variant="outline" className="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white"><Link href="/">All tools</Link></Button>
        </div>
      </div>
    </header>

    <div className="mx-auto max-w-7xl space-y-6 px-4 py-7 sm:px-6 lg:py-10">
      <section className="grid gap-5 xl:grid-cols-[1.25fr_.75fr]">
        <Card className="border-0 bg-white shadow-[0_20px_60px_rgba(16,42,67,.08)]">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#147d91]">Your tutor recommends</p><CardTitle className="mt-2 font-serif text-4xl">{plan.focus}</CardTitle></div><Badge variant="outline"><Clock3 className="size-3.5" />{planMinutes} min session</Badge></div>
            <CardDescription className="max-w-3xl text-sm leading-6">{plan.rationale}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {plan.actions.map((action, index) => {
              const done = completed.includes(action.id)
              return <div key={action.id} className={`flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center ${done ? "border-emerald-200 bg-emerald-50" : "bg-[#fbfcfc]"}`}>
                <button onClick={() => toggleAction(action.id)} className={`grid size-9 shrink-0 place-items-center rounded-full border text-sm font-bold ${done ? "border-emerald-600 bg-emerald-600 text-white" : "border-slate-300 bg-white"}`}>{done ? <CheckCircle2 className="size-5" /> : index + 1}</button>
                <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><strong>{action.label}</strong><Badge variant="outline">{action.minutes} min</Badge><Badge variant="outline">{action.domain}</Badge></div><p className="mt-1 text-sm leading-6 text-slate-600">{action.note}</p></div>
                {action.href.startsWith("/tutor#") ? <Button variant="outline" onClick={() => document.getElementById("reflection")?.scrollIntoView({ behavior: "smooth" })}>Reflect</Button> : <Button asChild><Link href={action.href}>Start <ArrowRight /></Link></Button>}
              </div>
            })}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="shadow-none"><CardHeader><CardTitle className="font-serif text-xl">How long have you got?</CardTitle><CardDescription>The tutor rebuilds the session around your available time.</CardDescription></CardHeader><CardContent><div className="grid grid-cols-3 gap-2">{[10, 20, 30, 45, 60, 90].map(minutes => <Button key={minutes} variant={availableMinutes === minutes ? "default" : "outline"} onClick={() => void regeneratePlan(minutes)}>{minutes} min</Button>)}</div><Button variant="ghost" className="mt-3 w-full" onClick={() => void regeneratePlan()}><RefreshCw />Regenerate plan</Button></CardContent></Card>
          <Card className="shadow-none"><CardHeader><CardTitle className="font-serif text-xl">Preparation profile</CardTitle></CardHeader><CardContent className="grid grid-cols-2 gap-3"><div className="rounded-xl bg-[#edf7f8] p-3"><p className="text-2xl font-bold">{intelligence.interviewCount}</p><p className="text-xs text-slate-500">interviews</p></div><div className="rounded-xl bg-[#edf7f8] p-3"><p className="text-2xl font-bold">{intelligence.fullPaperCount}</p><p className="text-xs text-slate-500">full papers</p></div><div className="rounded-xl bg-[#edf7f8] p-3"><p className="text-2xl font-bold">{intelligence.essayCount}</p><p className="text-xs text-slate-500">essay analyses</p></div><div className="rounded-xl bg-[#edf7f8] p-3"><p className="text-2xl font-bold">{intelligence.preparationScore || "—"}{intelligence.preparationScore ? "%" : ""}</p><p className="text-xs text-slate-500">evidenced skills</p></div></CardContent></Card>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="border-amber-200 bg-amber-50 shadow-none"><CardHeader><Target className="size-5 text-amber-800" /><CardDescription>Priority</CardDescription><CardTitle className="font-serif text-xl">{priority?.label ?? "Build baseline"}</CardTitle></CardHeader><CardContent><p className="text-sm leading-6 text-slate-700">{priority?.note ?? "Complete a formal interview and full paper so the tutor can target preparation accurately."}</p>{priority && <div className="mt-3"><Progress value={priority.score} /><p className="mt-1 text-xs text-slate-500">{priority.score}% · {priority.status}</p></div>}</CardContent></Card>
        <Card className="border-emerald-200 bg-emerald-50 shadow-none"><CardHeader><TrendingUp className="size-5 text-emerald-700" /><CardDescription>Strongest evidenced area</CardDescription><CardTitle className="font-serif text-xl">{strongest?.label ?? "Not enough evidence yet"}</CardTitle></CardHeader><CardContent><p className="text-sm leading-6 text-slate-700">{strongest ? `${strongest.score}% across ${strongest.evidenceCount} evidence point${strongest.evidenceCount === 1 ? "" : "s"}.` : "The tutor will identify this as you complete preparation."}</p></CardContent></Card>
        <Card className="shadow-none"><CardHeader><Sparkles className="size-5 text-[#147d91]" /><CardDescription>Mistake DNA</CardDescription><CardTitle className="font-serif text-xl">{intelligence.mistakes[0]?.label ?? "Collecting patterns"}</CardTitle></CardHeader><CardContent><p className="text-sm leading-6 text-slate-600">{intelligence.mistakes[0]?.evidence ?? "The tutor looks for repeated reasoning behaviours across papers, interviews and essays."}</p><Button asChild variant="link" className="mt-2 h-auto p-0"><Link href="/mistake-dna">Open Mistake DNA <ArrowRight /></Link></Button></CardContent></Card>
        <Card className="shadow-none"><CardHeader><CalendarCheck2 className="size-5 text-[#147d91]" /><CardDescription>Application twin</CardDescription><CardTitle className="font-serif text-xl">{profileTyped.course ?? "Course"} evidence map</CardTitle></CardHeader><CardContent><p className="text-sm leading-6 text-slate-600">Connect books, projects, written work and academic interests to realistic interview questions.</p><Button asChild variant="link" className="mt-2 h-auto p-0"><Link href="/application-profile">Open digital twin <ArrowRight /></Link></Button></CardContent></Card>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.25fr_.75fr]">
        <Card className="shadow-none">
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex items-center gap-2"><MessageSquareText className="size-5 text-[#147d91]" /><CardTitle className="font-serif text-2xl">Ask your persistent tutor</CardTitle></div><CardDescription className="mt-2">Your signed-in tutor can use saved plans, mistakes, progress evidence, application evidence, supercurricular work and your previous reflections.</CardDescription></div>{chat.length > 0 && <Button variant="ghost" size="sm" onClick={() => void clearConversation()}>Start fresh chat</Button>}</div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2 sm:grid-cols-5">
              {modeOptions.map(option => {
                const Icon = option.icon
                return <button key={option.id} onClick={() => setMode(option.id)} className={`rounded-2xl border p-3 text-left transition ${mode === option.id ? "border-[#147d91] bg-[#edf7f8]" : "bg-white hover:bg-slate-50"}`}><div className="flex items-center gap-2 text-sm font-bold"><Icon className="size-4" />{option.label}</div><p className="mt-1 text-xs leading-5 text-slate-500">{option.description}</p></button>
              })}
            </div>

            <div className="flex flex-wrap gap-2">{quickPrompts.map(item => <Button key={item.label} variant="outline" size="sm" onClick={() => void askTutor(item.prompt, item.mode)} disabled={asking}>{item.label}</Button>)}</div>

            <div className="max-h-[28rem] space-y-3 overflow-y-auto rounded-2xl border bg-slate-50/50 p-3">
              {chat.length ? chat.map((message, index) => <div key={`${message.role}-${index}`} className={`rounded-2xl p-4 text-sm leading-6 ${message.role === "tutor" ? "mr-8 bg-[#edf7f8]" : "ml-8 border bg-white"}`}><p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-slate-500">{message.role === "tutor" ? `Tutor · ${mode}` : "Student"}</p>{message.text}</div>) : <div className="rounded-2xl bg-[#edf7f8] p-4 text-sm leading-6 text-slate-700">Ask what to work on, switch to Challenge mode for tutorial-style pressure testing, use Explain mode for a short teaching sequence, or ask Review mode to find a recurring pattern across your saved preparation.</div>}
            </div>

            <Textarea value={question} onChange={event => setQuestion(event.target.value)} rows={4} placeholder={`Ask the tutor in ${mode} mode…`} onKeyDown={event => { if ((event.ctrlKey || event.metaKey) && event.key === "Enter") void askTutor() }} />
            <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-slate-500">Ctrl/Cmd + Enter to send · {chat.length} saved conversation turn{chat.length === 1 ? "" : "s"}</p><Button onClick={() => void askTutor()} disabled={!question.trim() || asking}>{asking ? "Thinking…" : `Ask ${mode} tutor`} <ArrowRight /></Button></div>
          </CardContent>
        </Card>

        <Card id="reflection" className="shadow-none">
          <CardHeader><CardTitle className="font-serif text-2xl">Reflection & tutor memory</CardTitle><CardDescription>Save what changed in your thinking. The tutor can use this in later sessions instead of treating every visit as a blank slate.</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            <Textarea value={tutorState.reflection ?? ""} onChange={event => setTutorState(current => ({ ...current, reflection: event.target.value }))} rows={8} placeholder="What changed in your thinking today? Which assumption, mistake or strategy would you recognise earlier next time?" />
            <Button className="w-full" onClick={() => void saveReflection()} disabled={!(tutorState.reflection ?? "").trim() || savingReflection}><Save />{savingReflection ? "Saving…" : (tutorState.reflection ?? "").trim() === lastSavedReflection ? "Reflection saved" : "Save to tutor memory"}</Button>
            <div className="rounded-2xl border bg-slate-50 p-4"><p className="text-xs font-bold uppercase tracking-wider text-[#147d91]">Continuity</p><p className="mt-2 text-sm leading-6 text-slate-600">{cloudStatus === "saved" ? "Your tutor can continue from cloud-saved conversation and reflection context on another device when you sign into the same account." : "You can still use the tutor locally. Sign in to keep conversation and reflections across devices."}</p></div>
          </CardContent>
        </Card>
      </section>
    </div>
  </main>
}

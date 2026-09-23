"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { ArrowLeft, ArrowRight, CalendarDays, CheckCircle2, Flame, Target } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import { analyseInterviewAnswer } from "@/lib/feedback-engine"
import { PROFILE_KEY, PROGRESS_KEY, dailyChallengeFor } from "@/lib/personal-tutor"
import { createClient } from "@/lib/supabase/client"

type Profile = { course?: string }
type SavedChallenge = { date: string; subject: string; prompt: string; response: string; score: number }

function read(key: string) { try { return JSON.parse(localStorage.getItem(key) || "{}") as Record<string, unknown> } catch { return {} } }

export default function DailyChallengePage() {
  const [profile, setProfile] = useState<Profile>({ course: "Physics" })
  const [response, setResponse] = useState("")
  const [submitted, setSubmitted] = useState(false)
  const [history, setHistory] = useState<SavedChallenge[]>([])
  useEffect(() => {
    const p = read(PROFILE_KEY) as Profile
    setProfile({ course: p.course ?? "Physics" })
    const progress = read(PROGRESS_KEY)
    setHistory(Array.isArray(progress.dailyChallenges) ? progress.dailyChallenges as SavedChallenge[] : [])
  }, [])
  const course = profile.course ?? "Physics"
  const today = new Date()
  const prompt = useMemo(() => dailyChallengeFor(course, today), [course])
  const feedback = useMemo(() => submitted && response.trim() ? analyseInterviewAnswer(response) : null, [submitted, response])
  const dateKey = today.toISOString().slice(0, 10)
  const alreadyDone = history.some(item => item.date === dateKey)
  const streak = useMemo(() => {
    const dates = new Set(history.map(item => item.date))
    let count = 0
    const cursor = new Date()
    for (let i = 0; i < 365; i++) {
      const key = cursor.toISOString().slice(0, 10)
      if (!dates.has(key)) break
      count++
      cursor.setUTCDate(cursor.getUTCDate() - 1)
    }
    return count
  }, [history])

  async function saveResult() {
    if (!feedback || alreadyDone) return
    const entry: SavedChallenge = { date: dateKey, subject: course, prompt, response: response.trim(), score: feedback.score }
    const progress = read(PROGRESS_KEY)
    const existing = Array.isArray(progress.dailyChallenges) ? progress.dailyChallenges as SavedChallenge[] : []
    const next = [entry, ...existing.filter(item => item.date !== dateKey)].slice(0, 120)
    localStorage.setItem(PROGRESS_KEY, JSON.stringify({ ...progress, dailyChallenges: next }))
    setHistory(next)
    try {
      const supabase = createClient()
      const { data } = await supabase.auth.getUser()
      if (data.user) await supabase.from("daily_challenges").upsert({ user_id: data.user.id, challenge_date: dateKey, subject: course, prompt, response: response.trim(), feedback, status: "completed", updated_at: new Date().toISOString() }, { onConflict: "user_id,challenge_date,subject" })
    } catch { /* progress remains saved locally/cloud-state */ }
  }

  return <main className="min-h-screen bg-[#f5f7f7] text-[#172b3a]">
    <header className="border-b bg-white"><div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4"><Button asChild variant="ghost"><Link href="/tutor"><ArrowLeft />Personal Tutor</Link></Button><div className="flex gap-2"><Badge variant="outline"><CalendarDays className="size-3.5" />Daily challenge</Badge><Badge variant="outline"><Flame className="size-3.5" />{streak} day streak</Badge></div></div></header>
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <section><p className="text-xs font-bold uppercase tracking-[.18em] text-[#147d91]">One problem. Proper discussion.</p><h1 className="mt-2 font-serif text-4xl font-bold">Today’s {course} challenge</h1><p className="mt-3 max-w-3xl text-slate-600">The point is not to collect trivia. Explain the reasoning, state assumptions and test the idea as if an academic were listening.</p></section>
      <Card className="border-0 bg-[#102a43] text-white shadow-none"><CardHeader><Badge className="w-fit border-white/15 bg-white/10 text-white">TODAY</Badge><CardTitle className="font-serif text-3xl leading-tight">{prompt}</CardTitle><CardDescription className="text-white/60">Talk through what you notice before committing to a conclusion.</CardDescription></CardHeader></Card>
      <Card className="shadow-none"><CardHeader><CardTitle className="font-serif text-2xl">Your reasoning</CardTitle></CardHeader><CardContent className="space-y-4"><Textarea rows={10} value={response} onChange={event => { setResponse(event.target.value); setSubmitted(false) }} placeholder="Observation → principle → assumption → test → provisional conclusion…" /><div className="flex justify-end"><Button onClick={() => setSubmitted(true)} disabled={!response.trim()}><Target />Analyse reasoning</Button></div></CardContent></Card>
      {feedback && <Card className="shadow-none"><CardHeader><div className="flex items-center justify-between"><div><CardTitle className="font-serif text-2xl">Tutor feedback</CardTitle><CardDescription>Practice reasoning signal {feedback.score}/100.</CardDescription></div>{alreadyDone && <Badge className="bg-emerald-600"><CheckCircle2 className="size-3.5" />Saved today</Badge>}</div></CardHeader><CardContent className="space-y-4"><div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">{feedback.dimensions.map(item => <div key={item.label} className="rounded-xl border bg-white p-3"><div className="flex justify-between text-xs font-bold"><span>{item.label}</span><span>{item.score}</span></div><Progress value={item.score} className="mt-2" /><p className="mt-2 text-xs leading-5 text-slate-500">{item.evidence}</p></div>)}</div><div className="grid gap-4 md:grid-cols-2"><div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4"><p className="font-bold">What worked</p>{feedback.strengths.map(item => <p key={item} className="mt-2 text-sm leading-6">• {item}</p>)}</div><div className="rounded-2xl border border-amber-200 bg-amber-50 p-4"><p className="font-bold">Best next move</p><p className="mt-2 text-sm leading-6">{feedback.nextMove}</p></div></div><div className="flex flex-wrap gap-2"><Button onClick={() => void saveResult()} disabled={alreadyDone}>Save today’s challenge</Button><Button asChild variant="outline"><Link href="/interview-room">Continue this style in interview practice <ArrowRight /></Link></Button></div></CardContent></Card>}
      <Card className="shadow-none"><CardHeader><CardTitle className="font-serif text-xl">Recent challenges</CardTitle></CardHeader><CardContent className="grid gap-2 md:grid-cols-2">{history.slice(0, 6).map(item => <div key={`${item.date}-${item.subject}`} className="rounded-xl border bg-white p-3"><div className="flex justify-between gap-2"><strong>{item.subject}</strong><Badge variant="outline">{item.score}/100</Badge></div><p className="mt-1 text-xs text-slate-500">{item.date}</p><p className="mt-2 line-clamp-2 text-sm leading-6">{item.prompt}</p></div>)}</CardContent></Card>
    </div>
  </main>
}

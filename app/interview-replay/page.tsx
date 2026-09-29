"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import { ArrowLeft, CheckCircle2, Loader2, MessageSquareText, RefreshCw, RotateCcw, Save, Sparkles } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { createClient } from "@/lib/supabase/client"
import { PROGRESS_KEY } from "@/lib/personal-tutor"

type Turn = { turn_index: number; role: "candidate" | "interviewer" | "system"; content: string; feedback?: string | null }
type Session = { id: string; course: string; summary?: string | null; created_at: string; interview_turns?: Turn[] }
type Moment = { sessionId: string; course: string; summary: string; candidate: Turn; question: Turn | null; date: string }
type ReplayResult = { reply?: string; classification?: string; issue?: string; moveKind?: string; branchReason?: string; provider?: string; error?: string }

function findQuestion(turns: Turn[], candidateIndex: number) {
  return [...turns].filter(turn => turn.turn_index < candidateIndex && turn.role === "interviewer").sort((a, b) => b.turn_index - a.turn_index)[0] ?? null
}

export default function InterviewReplayPage() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [selectedSession, setSelectedSession] = useState<string>("")
  const [selectedMoment, setSelectedMoment] = useState<string>("")
  const [answer, setAnswer] = useState("")
  const [result, setResult] = useState<ReplayResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [signedIn, setSignedIn] = useState<boolean | null>(null)
  const [notice, setNotice] = useState("")
  const [saved, setSaved] = useState(false)

  const load = useCallback(async () => {
    setLoading(true); setNotice("")
    try {
      const supabase = createClient()
      const { data: auth } = await supabase.auth.getUser()
      if (!auth.user) { setSignedIn(false); setLoading(false); return }
      setSignedIn(true)
      const { data, error } = await supabase.from("interview_sessions")
        .select("id,course,summary,created_at,interview_turns(turn_index,role,content,feedback)")
        .eq("user_id", auth.user.id)
        .order("created_at", { ascending: false })
        .limit(60)
      if (error) throw error
      const rows = (data ?? []).map(item => ({ ...item, interview_turns: [...(item.interview_turns ?? [])].sort((a, b) => a.turn_index - b.turn_index) })) as Session[]
      setSessions(rows)
      setSelectedSession(current => current || rows[0]?.id || "")
    } catch {
      setNotice("Interview history could not be loaded from the account on this attempt.")
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { void load() }, [load])

  const currentSession = sessions.find(session => session.id === selectedSession)
  const moments = useMemo<Moment[]>(() => {
    if (!currentSession) return []
    const turns = currentSession.interview_turns ?? []
    return turns.filter(turn => turn.role === "candidate").map(candidate => ({
      sessionId: currentSession.id,
      course: currentSession.course,
      summary: currentSession.summary || `${currentSession.course} interview`,
      candidate,
      question: findQuestion(turns, candidate.turn_index),
      date: currentSession.created_at,
    })).filter(moment => moment.question)
  }, [currentSession])

  useEffect(() => {
    if (!moments.length) { setSelectedMoment(""); return }
    const stillExists = moments.some(moment => String(moment.candidate.turn_index) === selectedMoment)
    if (!stillExists) setSelectedMoment(String(moments[0].candidate.turn_index))
  }, [moments, selectedMoment])

  const moment = moments.find(item => String(item.candidate.turn_index) === selectedMoment)

  function chooseMoment(index: number) {
    setSelectedMoment(String(index)); setAnswer(""); setResult(null); setSaved(false); setNotice("")
  }

  async function replay() {
    if (!moment || !answer.trim() || busy) return
    setBusy(true); setResult(null); setSaved(false); setNotice("")
    try {
      const contextTurns = (currentSession?.interview_turns ?? []).filter(turn => turn.turn_index < moment.candidate.turn_index).slice(-16)
      const response = await fetch("/api/interview-turn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          course: moment.course,
          track: "Interview replay",
          difficulty: "Stretch",
          persona: "Socratic",
          mode: "Replay Lab",
          question: moment.question?.content,
          answer: answer.trim(),
          turns: contextTurns.map(turn => ({ role: turn.role, text: turn.content })),
        }),
      })
      const data = await response.json() as ReplayResult
      if (!response.ok || !data.reply) throw new Error(data.error || "The replay interviewer could not respond.")
      setResult(data)
      if (data.provider === "local") setNotice("The built-in interviewer evaluated this replay because cloud AI was unavailable.")
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "The replay could not be completed.")
    } finally { setBusy(false) }
  }

  async function saveReplay() {
    if (!moment || !result?.reply || !answer.trim() || saved) return
    const sourceRef = `interview-replay-${moment.sessionId}-${moment.candidate.turn_index}-${Date.now()}`
    const feedback = [result.classification, result.issue && result.issue !== "none" ? result.issue : ""].filter(Boolean).join(" · ")
    const record = { id: sourceRef, sourceSessionId: moment.sessionId, sourceTurn: moment.candidate.turn_index, question: moment.question?.content, originalAnswer: moment.candidate.content, improvedAnswer: answer.trim(), classification: result.classification, reply: result.reply, date: new Date().toISOString() }
    try {
      const progress = JSON.parse(localStorage.getItem(PROGRESS_KEY) || "{}") as Record<string, unknown>
      const previous = Array.isArray(progress.interviewReplays) ? progress.interviewReplays as unknown[] : []
      localStorage.setItem(PROGRESS_KEY, JSON.stringify({ ...progress, interviewReplays: [record, ...previous].slice(0, 50) }))
    } catch { /* cloud save below remains available */ }

    try {
      const supabase = createClient()
      const { data: auth } = await supabase.auth.getUser()
      if (!auth.user) throw new Error("Not signed in")
      const { data: session, error } = await supabase.from("interview_sessions").insert({
        user_id: auth.user.id,
        course: moment.course,
        duration_seconds: 0,
        summary: `Replay · ${moment.summary}`,
        overall_feedback: { mode: "interview_replay", source_session_id: moment.sessionId, source_turn: moment.candidate.turn_index, classification: result.classification, issue: result.issue },
        source_ref: sourceRef,
      }).select("id").single()
      if (error || !session) throw error || new Error("Replay session was not created")
      const turns = [
        { session_id: session.id, user_id: auth.user.id, turn_index: 0, role: "interviewer", content: moment.question?.content || "Replay question", feedback: "Original interview question" },
        { session_id: session.id, user_id: auth.user.id, turn_index: 1, role: "candidate", content: answer.trim(), feedback: feedback || "Replay response" },
        { session_id: session.id, user_id: auth.user.id, turn_index: 2, role: "interviewer", content: result.reply, feedback: result.branchReason || result.moveKind || null },
      ]
      const { error: turnError } = await supabase.from("interview_turns").insert(turns)
      if (turnError) throw turnError
      setSaved(true)
      setNotice("Replay saved to Completed Work. The Digital Twin can now use it as fresh interview evidence.")
      window.dispatchEvent(new Event("oxbridge-history-updated"))
    } catch {
      setSaved(true)
      setNotice("Replay saved on this device. Cloud history could not be updated on this attempt.")
    }
  }

  return <main className="min-h-screen bg-[#f5f7f7] text-[#172b3a]">
    <header className="border-b bg-white"><div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4"><Button asChild variant="ghost"><Link href="/tutor"><ArrowLeft />Personal Tutor</Link></Button><Badge variant="outline"><RotateCcw className="size-3.5"/>Interview Replay Lab</Badge></div></header>
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6">
      <section className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#147d91]">Practise the exact moment again</p><h1 className="mt-2 font-serif text-4xl font-bold">Replay one branch, not the whole interview.</h1><p className="mt-3 max-w-3xl text-slate-600">Choose a previous candidate response, inspect the original question and feedback, then give a better answer. The interviewer continues from your new reasoning so you can see whether the branch changes.</p></div><Button variant="outline" onClick={() => void load()}><RefreshCw />Refresh history</Button></section>

      {notice ? <div className="rounded-xl border border-[#cfe1e4] bg-[#edf7f8] p-3 text-sm text-[#34515f]">{notice}</div> : null}
      {signedIn === false ? <Card><CardHeader><CardTitle>Sign in to use Replay Lab</CardTitle><CardDescription>Replay Lab uses your private saved interview transcripts.</CardDescription></CardHeader><CardContent><Button asChild><Link href="/login">Sign in</Link></Button></CardContent></Card> : loading ? <Card><CardContent className="p-8 text-center text-slate-500">Loading interview history…</CardContent></Card> : !sessions.length ? <Card><CardHeader><CardTitle>No interview transcripts yet</CardTitle><CardDescription>Complete and save an interview first, then return here to replay individual branches.</CardDescription></CardHeader><CardContent><Button asChild><Link href="/interviews">Start an interview</Link></Button></CardContent></Card> : <div className="grid gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="space-y-4"><Card className="shadow-none"><CardHeader><CardTitle className="font-serif text-xl">Choose interview</CardTitle></CardHeader><CardContent className="space-y-2">{sessions.map(session => <button key={session.id} onClick={() => { setSelectedSession(session.id); setAnswer(""); setResult(null); setSaved(false) }} className={`w-full rounded-xl border p-3 text-left ${selectedSession === session.id ? "border-[#147d91] bg-[#edf7f8]" : "bg-white"}`}><strong className="block text-sm">{session.summary || `${session.course} interview`}</strong><span className="mt-1 block text-xs text-slate-500">{new Date(session.created_at).toLocaleDateString("en-GB")} · {session.interview_turns?.filter(turn => turn.role === "candidate").length ?? 0} responses</span></button>)}</CardContent></Card>
          <Card className="shadow-none"><CardHeader><CardTitle className="font-serif text-xl">Choose a moment</CardTitle><CardDescription>Moments with saved feedback are marked.</CardDescription></CardHeader><CardContent className="space-y-2">{moments.map(item => <button key={item.candidate.turn_index} onClick={() => chooseMoment(item.candidate.turn_index)} className={`w-full rounded-xl border p-3 text-left ${selectedMoment === String(item.candidate.turn_index) ? "border-[#147d91] bg-[#edf7f8]" : "bg-white"}`}><div className="flex items-center justify-between gap-2"><span className="text-xs font-bold uppercase tracking-wider text-slate-500">Response {item.candidate.turn_index}</span>{item.candidate.feedback ? <Badge variant="outline">Feedback</Badge> : null}</div><p className="mt-2 line-clamp-3 text-sm">{item.candidate.content}</p></button>)}</CardContent></Card></aside>

        <section className="space-y-4">{moment ? <><Card className="shadow-none"><CardHeader><p className="text-xs font-bold uppercase tracking-[.16em] text-[#147d91]">Original branch</p><CardTitle className="font-serif text-2xl">{moment.question?.content}</CardTitle></CardHeader><CardContent className="grid gap-3 md:grid-cols-2"><div className="rounded-xl bg-slate-100 p-4"><p className="text-xs font-bold uppercase tracking-wider text-slate-500">Original answer</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6">{moment.candidate.content}</p></div><div className="rounded-xl border border-amber-200 bg-amber-50 p-4"><p className="text-xs font-bold uppercase tracking-wider text-amber-800">Original feedback</p><p className="mt-2 text-sm leading-6">{moment.candidate.feedback || "No per-turn feedback was stored for this older response. You can still replay it."}</p></div></CardContent></Card>

          <Card className="shadow-none"><CardHeader><div className="flex items-center gap-2"><Sparkles className="size-5 text-[#147d91]"/><CardTitle className="font-serif text-2xl">Try the branch again</CardTitle></div><CardDescription>Do not merely polish the wording. Change the reasoning where the original answer was weak.</CardDescription></CardHeader><CardContent className="space-y-3"><Textarea rows={7} value={answer} onChange={event => { setAnswer(event.target.value); setResult(null); setSaved(false) }} placeholder="Give your improved answer…"/><div className="flex flex-wrap gap-2"><Button onClick={() => void replay()} disabled={!answer.trim() || busy}>{busy ? <Loader2 className="animate-spin"/> : <MessageSquareText />}{busy ? "Replaying…" : "Replay this moment"}</Button>{result?.reply ? <Button variant="outline" onClick={() => void saveReplay()} disabled={saved}><Save />{saved ? "Saved" : "Save replay"}</Button> : null}</div></CardContent></Card>

          {result?.reply ? <Card className="border-0 bg-[#102a43] text-white shadow-none"><CardHeader><div className="flex flex-wrap items-center justify-between gap-2"><CardTitle className="font-serif text-2xl">New branch</CardTitle><div className="flex gap-2">{result.classification ? <Badge className="bg-white/10 text-white">{result.classification}</Badge> : null}{result.moveKind ? <Badge className="bg-white/10 text-white">{result.moveKind}</Badge> : null}</div></div><CardDescription className="text-white/60">How the interviewer continues from your revised reasoning.</CardDescription></CardHeader><CardContent><p className="text-sm leading-7">{result.reply}</p>{result.branchReason ? <p className="mt-4 border-t border-white/10 pt-4 text-xs text-slate-300">Branch logic: {result.branchReason}</p> : null}{saved ? <p className="mt-4 flex items-center gap-2 text-sm text-emerald-200"><CheckCircle2 className="size-4"/>Replay saved.</p> : null}</CardContent></Card> : null}</> : <Card><CardContent className="p-8 text-center text-slate-500">Choose a candidate response to start replaying.</CardContent></Card>}</section>
      </div>}
    </div>
  </main>
}

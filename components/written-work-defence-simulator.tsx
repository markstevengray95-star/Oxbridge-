"use client"

import { useMemo, useRef, useState } from "react"
import { Brain, CheckCircle2, Loader2, MessageSquareText, RotateCcw, Save } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { createClient } from "@/lib/supabase/client"
import { PROGRESS_KEY } from "@/lib/personal-tutor"

type Analysis = {
  summary: string
  claims: string[]
  assumptions: string[]
  evidenceQuestions: string[]
  defenceQuestions: string[]
  openingQuestion: string
}

type Turn = {
  role: "interviewer" | "candidate"
  text: string
  feedback?: string
  classification?: string
  moveKind?: string
}

type ApiResult = {
  reply?: string
  classification?: string
  issue?: string
  moveKind?: string
  branchReason?: string
  provider?: string
  error?: string
}

function classificationSummary(turns: Turn[]) {
  const counts: Record<string, number> = {}
  for (const turn of turns) {
    if (turn.role !== "candidate" || !turn.classification) continue
    counts[turn.classification] = (counts[turn.classification] ?? 0) + 1
  }
  return counts
}

export function WrittenWorkDefenceSimulator({ title, course, work, analysis }: { title: string; course: string; work: string; analysis: Analysis }) {
  const initial = useMemo<Turn[]>(() => [{ role: "interviewer", text: analysis.openingQuestion }], [analysis.openingQuestion])
  const [turns, setTurns] = useState<Turn[]>(initial)
  const [answer, setAnswer] = useState("")
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState("")
  const [savedSessionId, setSavedSessionId] = useState<string | null>(null)
  const startedAt = useRef(Date.now())

  const candidateTurns = turns.filter(turn => turn.role === "candidate").length
  const classifications = classificationSummary(turns)
  const currentQuestion = [...turns].reverse().find(turn => turn.role === "interviewer")?.text ?? analysis.openingQuestion

  function reset() {
    setTurns([{ role: "interviewer", text: analysis.openingQuestion }])
    setAnswer("")
    setNotice("")
    setSavedSessionId(null)
    startedAt.current = Date.now()
  }

  async function respond() {
    const responseText = answer.trim()
    if (!responseText || busy) return
    setBusy(true); setNotice("")
    try {
      const response = await fetch("/api/interview-turn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          course,
          track: "Written work",
          difficulty: "Stretch",
          persona: "Socratic",
          mode: "Written Work Defence",
          question: currentQuestion,
          answer: responseText,
          concepts: analysis.claims.slice(0, 8),
          probes: [...analysis.defenceQuestions, ...analysis.evidenceQuestions].slice(0, 12),
          turns: turns.map(turn => ({ role: turn.role, text: turn.text })),
          stimulus: work.slice(0, 8000),
        }),
      })
      const result = await response.json() as ApiResult
      if (!response.ok || !result.reply) throw new Error(result.error || "The defence interviewer could not continue.")
      const feedback = [result.classification, result.issue && result.issue !== "none" ? result.issue : ""].filter(Boolean).join(" · ")
      setTurns(current => [
        ...current,
        { role: "candidate", text: responseText, feedback, classification: result.classification },
        { role: "interviewer", text: result.reply!, moveKind: result.moveKind, feedback: result.branchReason },
      ])
      setAnswer("")
      setSavedSessionId(null)
      setNotice(result.provider === "local" ? "The built-in interviewer continued this turn because the cloud model was unavailable." : "")
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "The defence interviewer could not continue.")
    } finally { setBusy(false) }
  }

  async function saveSession() {
    if (candidateTurns < 1 || savedSessionId) return
    const durationSeconds = Math.max(1, Math.round((Date.now() - startedAt.current) / 1000))
    const sourceRef = `written-work-defence-${Date.now()}`
    const classificationCounts = classificationSummary(turns)
    const localRecord = {
      id: sourceRef,
      title: title || "Written work defence",
      course,
      date: new Date().toISOString(),
      turns,
      durationSeconds,
      claims: analysis.claims,
      classificationCounts,
    }
    try {
      const progress = JSON.parse(localStorage.getItem(PROGRESS_KEY) || "{}") as Record<string, unknown>
      const previous = Array.isArray(progress.writtenWorkDefenceSessions) ? progress.writtenWorkDefenceSessions as unknown[] : []
      localStorage.setItem(PROGRESS_KEY, JSON.stringify({ ...progress, writtenWorkDefenceSessions: [localRecord, ...previous].slice(0, 30) }))
      window.dispatchEvent(new Event("oxbridge-history-updated"))
      window.dispatchEvent(new Event("oxbridge-cloud-state-updated"))
    } catch { /* cloud save below can still succeed */ }

    try {
      const supabase = createClient()
      const { data: auth } = await supabase.auth.getUser()
      if (!auth.user) {
        setSavedSessionId(sourceRef)
        setNotice("Saved on this device. Sign in to add this defence transcript to account history and the Digital Twin.")
        return
      }
      const { data: session, error } = await supabase.from("interview_sessions").insert({
        user_id: auth.user.id,
        course,
        duration_seconds: durationSeconds,
        summary: `Written work defence · ${title || "Submitted work"}`,
        overall_feedback: {
          mode: "written_work_defence",
          claims: analysis.claims,
          source_title: title || "Submitted work",
          classification_counts: classificationCounts,
          responses: candidateTurns,
        },
        source_ref: sourceRef,
      }).select("id").single()
      if (error || !session) throw error || new Error("Session was not created")
      const rows = turns.map((turn, index) => ({
        session_id: session.id,
        user_id: auth.user!.id,
        turn_index: index,
        role: turn.role,
        content: turn.text,
        feedback: turn.feedback || null,
      }))
      const { error: turnError } = await supabase.from("interview_turns").insert(rows)
      if (turnError) throw turnError

      await supabase.from("application_evidence").insert({
        user_id: auth.user.id,
        evidence_type: "written_work_defence",
        title: `Defended: ${title || "Submitted work"}`,
        detail: `${candidateTurns} adaptive response${candidateTurns === 1 ? "" : "s"} · ${analysis.claims.length} mapped claim${analysis.claims.length === 1 ? "" : "s"}`,
        metadata: {
          source_ref: sourceRef,
          session_id: session.id,
          course,
          responses: candidateTurns,
          classification_counts: classificationCounts,
          claims: analysis.claims.slice(0, 12),
          duration_seconds: durationSeconds,
        },
      })

      setSavedSessionId(String(session.id))
      setNotice("Defence transcript saved to Completed Work, Replay Lab and your Application Digital Twin evidence.")
      window.dispatchEvent(new Event("oxbridge-history-updated"))
      window.dispatchEvent(new Event("oxbridge-cloud-state-updated"))
    } catch {
      setSavedSessionId(sourceRef)
      setNotice("Saved on this device. Cloud history could not be updated on this attempt.")
    }
  }

  return <section className="space-y-4" aria-label="Live written work defence simulator">
    <Card className="border-0 bg-[#102a43] text-white shadow-none"><CardHeader><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-cyan-200">Live defence simulator</p><CardTitle className="mt-2 font-serif text-2xl">Defend the work in conversation</CardTitle><CardDescription className="mt-2 text-white/65">The interviewer stays anchored to the supplied work, challenges reasoning and adapts to each response.</CardDescription></div><Badge className="bg-white/10 text-white">{candidateTurns} response{candidateTurns === 1 ? "" : "s"}</Badge></div></CardHeader><CardContent>{candidateTurns ? <div className="flex flex-wrap gap-2">{Object.entries(classifications).map(([label, count]) => <Badge key={label} className="bg-white/10 text-white">{label}: {count}</Badge>)}</div> : <p className="text-xs text-white/60">Response-quality signals will appear here as the interview develops.</p>}</CardContent></Card>

    <Card className="shadow-none"><CardHeader><CardTitle className="font-serif text-xl">Interview transcript</CardTitle><CardDescription>Use this as a rehearsal: explain your reasoning rather than trying to guess a model answer.</CardDescription></CardHeader><CardContent className="space-y-3">{turns.map((turn, index) => <div key={`${turn.role}-${index}`} className={`rounded-2xl p-4 ${turn.role === "candidate" ? "ml-auto max-w-[92%] bg-slate-950 text-white" : "border bg-white"}`}><div className="flex items-center justify-between gap-2"><p className={`text-[11px] font-bold uppercase tracking-[.14em] ${turn.role === "candidate" ? "text-cyan-200" : "text-[#147d91]"}`}>{turn.role === "candidate" ? "You" : "Interviewer"}</p>{turn.moveKind ? <Badge variant="outline">{turn.moveKind}</Badge> : null}</div><p className="mt-2 whitespace-pre-wrap text-sm leading-6">{turn.text}</p>{turn.feedback ? <p className={`mt-3 text-xs ${turn.role === "candidate" ? "text-slate-300" : "text-slate-500"}`}>{turn.feedback}</p> : null}</div>)}</CardContent></Card>

    <Card className="shadow-none"><CardHeader><div className="flex items-center gap-2"><Brain className="size-5 text-[#147d91]"/><CardTitle className="font-serif text-xl">Your response</CardTitle></div><CardDescription>Current challenge: {currentQuestion}</CardDescription></CardHeader><CardContent className="space-y-3"><Textarea rows={6} value={answer} onChange={event => setAnswer(event.target.value)} placeholder="Think aloud. State assumptions, evidence, uncertainty and what would change your view…"/><div className="flex flex-wrap gap-2"><Button onClick={() => void respond()} disabled={!answer.trim() || busy}>{busy ? <Loader2 className="animate-spin"/> : <MessageSquareText />}{busy ? "Interviewer is responding…" : "Answer and continue"}</Button><Button variant="outline" onClick={() => void saveSession()} disabled={candidateTurns < 1 || Boolean(savedSessionId)}><Save />{savedSessionId ? "Saved" : "Save transcript"}</Button><Button variant="ghost" onClick={reset}><RotateCcw />Restart branch</Button></div>{notice ? <p className="text-sm text-slate-600">{notice}</p> : null}{savedSessionId ? <p className="flex items-center gap-2 text-sm text-emerald-700"><CheckCircle2 className="size-4"/>This defence can now appear in Completed Work and the Digital Twin.</p> : null}</CardContent></Card>
  </section>
}

"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import { ArrowLeft, BarChart3, Clock3, FileText, History, MessageSquareText, RefreshCw, ShieldCheck, Trophy } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/client"

type InterviewTurn = { turn_index: number; role: "candidate" | "interviewer" | "system"; content: string; feedback?: string | null }
type InterviewSession = {
  id: string
  course: string
  duration_seconds: number
  summary?: string | null
  overall_feedback?: Record<string, unknown> | null
  source_ref?: string | null
  created_at: string
  interview_turns?: InterviewTurn[]
}
type TestResult = {
  id: string
  source_ref: string
  test: string
  form?: number | null
  title?: string | null
  completed_at: string
  raw_score: number
  max_raw_marks?: number | null
  total_questions: number
  accuracy: number
  duration_seconds?: number | null
  payload?: Record<string, unknown> | null
}
type Filter = "all" | "interviews" | "tests"
type Selected = { kind: "interview"; id: string } | { kind: "test"; id: string } | null

type Section = { id?: string; title?: string; kind?: string; rawMark?: number; maxMarks?: number; correct?: number; total?: number; accuracy?: number; words?: number }
type Review = { questionId?: string; id?: string; section?: string; prompt?: string; answer?: string; selectedAnswer?: string; correctAnswer?: string; explanation?: string; correct?: boolean; rawMark?: number; maxMarks?: number }

function durationLabel(seconds?: number | null) {
  if (!seconds) return "Not recorded"
  const minutes = Math.floor(seconds / 60)
  const remainder = seconds % 60
  return minutes >= 60 ? `${Math.floor(minutes / 60)}h ${minutes % 60}m` : `${minutes}m ${remainder}s`
}

function numberValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null
}

function feedbackScore(session: InterviewSession) {
  return numberValue(session.overall_feedback?.score)
}

function testMax(result: TestResult) {
  return result.max_raw_marks ?? result.total_questions
}

export default function HistoryPage() {
  const [interviews, setInterviews] = useState<InterviewSession[]>([])
  const [tests, setTests] = useState<TestResult[]>([])
  const [filter, setFilter] = useState<Filter>("all")
  const [selected, setSelected] = useState<Selected>(null)
  const [loading, setLoading] = useState(true)
  const [signedIn, setSignedIn] = useState<boolean | null>(null)
  const [notice, setNotice] = useState("")

  const loadHistory = useCallback(async () => {
    const supabase = createClient()
    const { data: auth } = await supabase.auth.getUser()
    const user = auth.user
    if (!user) {
      setSignedIn(false)
      setLoading(false)
      return
    }
    setSignedIn(true)
    setLoading(true)

    const [interviewResponse, testResponse] = await Promise.all([
      supabase
        .from("interview_sessions")
        .select("id,course,duration_seconds,summary,overall_feedback,source_ref,created_at,interview_turns(turn_index,role,content,feedback)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("test_results")
        .select("id,source_ref,test,form,title,completed_at,raw_score,max_raw_marks,total_questions,accuracy,duration_seconds,payload")
        .eq("user_id", user.id)
        .order("completed_at", { ascending: false })
        .limit(100),
    ])

    if (interviewResponse.error || testResponse.error) {
      setNotice("Some history could not be loaded from the cloud. Your account-synced progress is still retained and will be mirrored again when the connection is available.")
    } else setNotice("")

    const nextInterviews = (interviewResponse.data ?? []).map(item => ({
      ...item,
      overall_feedback: item.overall_feedback && typeof item.overall_feedback === "object" ? item.overall_feedback as Record<string, unknown> : null,
      interview_turns: [...(item.interview_turns ?? [])].sort((a, b) => a.turn_index - b.turn_index),
    })) as InterviewSession[]
    const nextTests = (testResponse.data ?? []) as TestResult[]
    setInterviews(nextInterviews)
    setTests(nextTests)
    setSelected(current => current ?? (nextInterviews[0] ? { kind: "interview", id: nextInterviews[0].id } : nextTests[0] ? { kind: "test", id: nextTests[0].id } : null))
    setLoading(false)
  }, [])

  useEffect(() => {
    void loadHistory()
    const refresh = () => { void loadHistory() }
    window.addEventListener("oxbridge-history-updated", refresh)
    window.addEventListener("oxbridge-cloud-state-updated", refresh)
    return () => {
      window.removeEventListener("oxbridge-history-updated", refresh)
      window.removeEventListener("oxbridge-cloud-state-updated", refresh)
    }
  }, [loadHistory])

  const entries = useMemo(() => {
    const interviewEntries = interviews.map(item => ({ kind: "interview" as const, id: item.id, date: item.created_at, title: item.summary || `Interview · ${item.course}`, subtitle: item.course }))
    const testEntries = tests.map(item => ({ kind: "test" as const, id: item.id, date: item.completed_at, title: item.title || `${item.test} practice test`, subtitle: item.form ? `${item.test} · Form ${item.form}` : item.test }))
    return [...interviewEntries, ...testEntries]
      .filter(item => filter === "all" || (filter === "interviews" ? item.kind === "interview" : item.kind === "test"))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [interviews, tests, filter])

  const selectedInterview = selected?.kind === "interview" ? interviews.find(item => item.id === selected.id) : undefined
  const selectedTest = selected?.kind === "test" ? tests.find(item => item.id === selected.id) : undefined
  const testPayload = selectedTest?.payload && typeof selectedTest.payload === "object" ? selectedTest.payload : {}
  const sections = Array.isArray(testPayload.sections) ? testPayload.sections as Section[] : []
  const reviews = Array.isArray(testPayload.questionReview) ? testPayload.questionReview as Review[] : []
  const missed = reviews.filter(item => item.correct === false || (item.maxMarks !== undefined && item.rawMark !== undefined && item.rawMark < item.maxMarks))

  return <main className="min-h-screen bg-slate-50 text-slate-950">
    <header className="border-b bg-slate-950 text-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4">
        <Link href="/student-home" className="inline-flex items-center gap-2 text-sm font-semibold"><ArrowLeft className="size-4" />Student Home</Link>
        <Badge className="border-white/15 bg-white/10 text-white"><History className="size-3.5" />My History</Badge>
      </div>
    </header>

    <div className="mx-auto max-w-7xl px-4 py-8">
      <section className="mb-7 grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.18em] text-blue-700">Private account history</p>
          <h1 className="mt-2 font-serif text-4xl font-bold">Interviews and test results in one place</h1>
          <p className="mt-3 max-w-3xl text-slate-600">Completed interview transcripts and full-test results are saved to the signed-in account and can be reviewed across devices.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant={filter === "all" ? "default" : "outline"} onClick={() => setFilter("all")}>All</Button>
          <Button variant={filter === "interviews" ? "default" : "outline"} onClick={() => setFilter("interviews")}><MessageSquareText />Interviews</Button>
          <Button variant={filter === "tests" ? "default" : "outline"} onClick={() => setFilter("tests")}><FileText />Tests</Button>
          <Button variant="outline" onClick={() => void loadHistory()}><RefreshCw />Refresh</Button>
        </div>
      </section>

      <Card className="mb-6 border-emerald-200 bg-emerald-50 shadow-none">
        <CardContent className="flex gap-3 p-4 text-sm text-emerald-950"><ShieldCheck className="mt-0.5 size-5 shrink-0" /><p><strong>Private by account:</strong> database row-level security restricts interview transcripts and test results to the signed-in owner. Signing out clears the app-state cache from the browser.</p></CardContent>
      </Card>

      {notice ? <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{notice}</div> : null}

      {signedIn === false ? <Card><CardHeader><CardTitle>Sign in to see your history</CardTitle><CardDescription>Your saved account history is only available to its owner.</CardDescription></CardHeader><CardContent><Button asChild><Link href="/login">Sign in</Link></Button></CardContent></Card> : loading ? <Card><CardContent className="p-8 text-center text-slate-500">Loading your saved history…</CardContent></Card> : !entries.length ? <Card><CardHeader><CardTitle>No saved history yet</CardTitle><CardDescription>Complete an interview or a full test and it will appear here automatically.</CardDescription></CardHeader><CardContent className="flex flex-wrap gap-3"><Button asChild><Link href="/interviews">Start an interview</Link></Button><Button asChild variant="outline"><Link href="/full-papers">Take a full test</Link></Button></CardContent></Card> : <div className="grid gap-6 lg:grid-cols-[330px_minmax(0,1fr)]">
        <aside className="space-y-3 lg:sticky lg:top-20 lg:self-start">
          <div className="flex items-center justify-between"><p className="text-xs font-bold uppercase tracking-[.16em] text-slate-500">{entries.length} saved item{entries.length === 1 ? "" : "s"}</p><span className="text-xs text-slate-400">Newest first</span></div>
          <div className="max-h-[72vh] space-y-2 overflow-y-auto pr-1">
            {entries.map(item => {
              const active = selected?.kind === item.kind && selected.id === item.id
              return <button key={`${item.kind}-${item.id}`} onClick={() => setSelected({ kind: item.kind, id: item.id })} className={`w-full rounded-xl border p-4 text-left transition ${active ? "border-blue-500 bg-blue-50 ring-2 ring-blue-100" : "bg-white hover:border-slate-400"}`}>
                <div className="flex items-center gap-2">{item.kind === "interview" ? <MessageSquareText className="size-4 text-blue-700" /> : <FileText className="size-4 text-blue-700" />}<Badge variant="outline">{item.kind === "interview" ? "Interview" : "Test"}</Badge></div>
                <p className="mt-2 font-semibold leading-5">{item.title}</p><p className="mt-1 text-xs text-slate-500">{item.subtitle}</p><p className="mt-2 text-xs text-slate-400">{new Date(item.date).toLocaleString()}</p>
              </button>
            })}
          </div>
        </aside>

        <section className="space-y-5">
          {selectedInterview ? <>
            <Card><CardHeader><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-blue-700">Interview transcript</p><CardTitle className="mt-2 font-serif text-3xl">{selectedInterview.summary || `${selectedInterview.course} interview`}</CardTitle><CardDescription className="mt-2">{new Date(selectedInterview.created_at).toLocaleString()} · {durationLabel(selectedInterview.duration_seconds)}</CardDescription></div>{feedbackScore(selectedInterview) !== null ? <Badge variant="outline">Practice score {feedbackScore(selectedInterview)}/100</Badge> : null}</div></CardHeader></Card>
            <Card><CardHeader><CardTitle className="font-serif text-2xl">Full transcript</CardTitle><CardDescription>{selectedInterview.interview_turns?.length ?? 0} saved turns</CardDescription></CardHeader><CardContent className="space-y-3">{selectedInterview.interview_turns?.length ? selectedInterview.interview_turns.map(turn => <div key={`${selectedInterview.id}-${turn.turn_index}`} className={`rounded-2xl p-4 ${turn.role === "candidate" ? "ml-auto max-w-[92%] bg-slate-950 text-white" : "border bg-white"}`}><p className={`text-[11px] font-bold uppercase tracking-[.14em] ${turn.role === "candidate" ? "text-blue-200" : "text-blue-700"}`}>{turn.role}</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6">{turn.content}</p>{turn.feedback ? <div className={`mt-3 rounded-xl p-3 text-sm ${turn.role === "candidate" ? "bg-white/10 text-white" : "bg-blue-50 text-slate-700"}`}><strong>Feedback:</strong> {turn.feedback}</div> : null}</div>) : <p className="text-sm text-slate-500">No transcript turns were available for this older session.</p>}</CardContent></Card>
          </> : null}

          {selectedTest ? <>
            <Card><CardHeader><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-blue-700">{selectedTest.test}{selectedTest.form ? ` · Form ${selectedTest.form}` : ""}</p><CardTitle className="mt-2 font-serif text-3xl">{selectedTest.title || `${selectedTest.test} practice test`}</CardTitle><CardDescription className="mt-2">Completed {new Date(selectedTest.completed_at).toLocaleString()}</CardDescription></div><Badge variant="outline">Saved to account</Badge></div></CardHeader><CardContent className="grid gap-3 sm:grid-cols-3"><div className="rounded-xl bg-slate-100 p-4"><Trophy className="size-5 text-blue-700" /><p className="mt-2 text-3xl font-bold">{selectedTest.raw_score}/{testMax(selectedTest)}</p><p className="text-xs text-slate-500">raw practice marks</p></div><div className="rounded-xl bg-slate-100 p-4"><BarChart3 className="size-5 text-blue-700" /><p className="mt-2 text-3xl font-bold">{selectedTest.accuracy}%</p><p className="text-xs text-slate-500">mark accuracy</p></div><div className="rounded-xl bg-slate-100 p-4"><Clock3 className="size-5 text-blue-700" /><p className="mt-2 text-xl font-bold">{durationLabel(selectedTest.duration_seconds)}</p><p className="text-xs text-slate-500">time used</p></div></CardContent></Card>
            {sections.length ? <Card><CardHeader><CardTitle className="font-serif text-2xl">Section breakdown</CardTitle></CardHeader><CardContent className="grid gap-3 md:grid-cols-2">{sections.map((section, index) => <div key={section.id || index} className="rounded-xl border p-4"><p className="font-semibold">{section.title || `Section ${index + 1}`}</p>{section.kind === "essay" ? <p className="mt-2 text-sm text-slate-500">{section.words ?? 0} words · writing task</p> : <><p className="mt-2 text-2xl font-bold">{section.rawMark ?? section.correct ?? 0}/{section.maxMarks ?? section.total ?? 0}</p><p className="text-sm text-slate-500">{section.accuracy ?? 0}%</p></>}</div>)}</CardContent></Card> : null}
            {missed.length ? <Card><CardHeader><CardTitle className="font-serif text-2xl">Questions to review</CardTitle><CardDescription>{missed.length} item{missed.length === 1 ? "" : "s"} did not receive full marks.</CardDescription></CardHeader><CardContent className="space-y-4">{missed.map((item, index) => <div key={item.questionId || item.id || index} className="rounded-xl border p-4"><Badge variant="outline">{item.section || "Question"}</Badge><p className="mt-3 whitespace-pre-wrap font-semibold leading-6">{item.prompt}</p><div className="mt-3 space-y-2 text-sm"><p><strong>Your answer:</strong> {item.answer ?? item.selectedAnswer ?? "Unanswered"}</p><p><strong>Correct answer:</strong> {item.correctAnswer ?? "See question explanation"}</p>{item.explanation ? <p className="rounded-lg bg-slate-100 p-3"><strong>Explanation:</strong> {item.explanation}</p> : null}</div></div>)}</CardContent></Card> : null}
            <div className="flex flex-wrap gap-2"><Button asChild variant="outline"><Link href="/test-results">Open full results analysis</Link></Button><Button asChild variant="outline"><Link href="/full-papers">Take another full test</Link></Button></div>
          </> : null}
        </section>
      </div>}
    </div>
  </main>
}

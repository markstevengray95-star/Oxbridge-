"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import { Activity, ArrowLeft, BarChart3, CheckCircle2, Clock3, FileText, Loader2, MessageSquareText, RefreshCw, Target, UserRound, XCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

type AccountSummary = {
  userId: string
  username: string
  displayName: string
  active: boolean
  unlimitedUsage: boolean
  createdAt: string
  lastSignInAt: string | null
  testsCompleted: number
  averageAccuracy: number | null
  answersRecorded: number
  interviewSessions: number
  transcriptTurns: number
  latestActivityAt: string | null
}

type QuestionReview = {
  id?: string
  questionId?: string
  section?: string
  difficulty?: string
  prompt?: string
  responseType?: string
  selectedAnswer?: string | null
  answer?: string | null
  correctAnswer?: string
  rawMark?: number
  maxMarks?: number
  correct?: boolean
  explanation?: string
}

type TestAttempt = {
  id: string
  sourceRef: string
  test: string
  form: number | null
  title: string | null
  completedAt: string
  rawScore: number
  maxRawMarks: number | null
  totalQuestions: number
  accuracy: number
  durationSeconds: number | null
  payload: Record<string, unknown>
}

type TranscriptTurn = {
  id: string
  turnIndex: number
  role: "candidate" | "interviewer" | "system"
  content: string
  feedback: string | null
  createdAt: string
}

type InterviewAttempt = {
  id: string
  course: string
  durationSeconds: number
  summary: string | null
  overallFeedback: Record<string, unknown>
  createdAt: string
  updatedAt: string
  turns: TranscriptTurn[]
}

type DetailResponse = {
  account: {
    userId: string
    username: string
    displayName: string
    active: boolean
    unlimitedUsage: boolean
    createdAt: string
    updatedAt: string
    lastSignInAt: string | null
  }
  summary: {
    testsCompleted: number
    averageAccuracy: number | null
    answersRecorded: number
    essaysRecorded: number
    interviewSessions: number
    transcriptTurns: number
    candidateResponses: number
    interviewSeconds: number
    latestActivityAt: string | null
  }
  tests: TestAttempt[]
  interviews: InterviewAttempt[]
  scope: string
  notice: string
}

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

function stringMap(value: unknown): Record<string, string> {
  const input = object(value)
  return Object.fromEntries(Object.entries(input).filter((entry): entry is [string, string] => typeof entry[1] === "string"))
}

function questionReview(payload: Record<string, unknown>): QuestionReview[] {
  return Array.isArray(payload.questionReview) ? payload.questionReview as QuestionReview[] : []
}

function formatDuration(seconds?: number | null) {
  if (seconds === null || seconds === undefined) return "Not recorded"
  if (seconds < 60) return `${Math.max(0, Math.round(seconds))} sec`
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  return hours ? `${hours}h ${minutes}m` : `${minutes} min`
}

function formatDate(value?: string | null) {
  if (!value) return "No activity yet"
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? "Unknown" : date.toLocaleString()
}

function answerText(item: QuestionReview) {
  return item.answer ?? item.selectedAnswer ?? "Unanswered"
}

function scoreDenominator(test: TestAttempt) {
  return test.maxRawMarks ?? test.totalQuestions
}

function StatCard({ icon, label, value, detail }: { icon: React.ReactNode; label: string; value: string | number; detail: string }) {
  return <Card><CardHeader className="pb-2"><div className="text-[#147d91]">{icon}</div><CardDescription>{label}</CardDescription><CardTitle className="font-serif text-3xl">{value}</CardTitle></CardHeader><CardContent><p className="text-xs leading-5 text-[#667984]">{detail}</p></CardContent></Card>
}

export default function PracticeTrackingPage() {
  const [accounts, setAccounts] = useState<AccountSummary[]>([])
  const [selectedUserId, setSelectedUserId] = useState("")
  const [detail, setDetail] = useState<DetailResponse | null>(null)
  const [loadingAccounts, setLoadingAccounts] = useState(true)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [error, setError] = useState("")
  const [view, setView] = useState<"tests" | "interviews">("tests")
  const [openTestId, setOpenTestId] = useState("")
  const [openInterviewId, setOpenInterviewId] = useState("")

  const loadAccounts = useCallback(async () => {
    setLoadingAccounts(true)
    setError("")
    try {
      const response = await fetch("/api/admin/practice-tracking", { cache: "no-store" })
      const data = await response.json() as { accounts?: AccountSummary[]; error?: string }
      if (!response.ok) throw new Error(data.error || "Could not load practice activity.")
      const next = data.accounts ?? []
      setAccounts(next)
      setSelectedUserId(current => current && next.some(item => item.userId === current) ? current : next[0]?.userId ?? "")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load practice activity.")
    } finally {
      setLoadingAccounts(false)
    }
  }, [])

  const loadDetail = useCallback(async (userId: string) => {
    if (!userId) { setDetail(null); return }
    setLoadingDetail(true)
    setError("")
    setOpenTestId("")
    setOpenInterviewId("")
    try {
      const response = await fetch(`/api/admin/practice-tracking?userId=${encodeURIComponent(userId)}`, { cache: "no-store" })
      const data = await response.json() as DetailResponse & { error?: string }
      if (!response.ok) throw new Error(data.error || "Could not load learner detail.")
      setDetail(data)
      setOpenTestId(data.tests[0]?.id ?? "")
      setOpenInterviewId(data.interviews[0]?.id ?? "")
    } catch (err) {
      setDetail(null)
      setError(err instanceof Error ? err.message : "Could not load learner detail.")
    } finally {
      setLoadingDetail(false)
    }
  }, [])

  useEffect(() => { void loadAccounts() }, [loadAccounts])
  useEffect(() => { if (selectedUserId) void loadDetail(selectedUserId) }, [selectedUserId, loadDetail])

  const selectedSummary = useMemo(() => accounts.find(item => item.userId === selectedUserId) ?? null, [accounts, selectedUserId])

  async function refreshAll() {
    await loadAccounts()
    if (selectedUserId) await loadDetail(selectedUserId)
  }

  return <main className="min-h-screen bg-[#eef3f4] px-4 py-7 text-[#172b3a] sm:px-6 lg:px-8 lg:py-10">
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2"><Badge className="bg-[#102a43] text-white">Admin</Badge><Badge variant="outline">Managed practice accounts only</Badge></div>
          <h1 className="mt-3 font-serif text-4xl font-bold">Practice tracking</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#5b707a]">See what your issued practice logins have completed inside ScholarBridge: full-paper answers, essay responses, marks, timing, AI interview transcripts and feedback.</p>
        </div>
        <div className="flex flex-wrap gap-2"><Button asChild variant="outline"><Link href="/admin"><ArrowLeft />Admin</Link></Button><Button asChild variant="outline"><Link href="/admin/practice-access"><UserRound />Practice logins</Link></Button><Button onClick={() => void refreshAll()} disabled={loadingAccounts || loadingDetail}><RefreshCw className={loadingAccounts || loadingDetail ? "animate-spin" : ""} />Refresh</Button></div>
      </header>

      <Card className="border-blue-200 bg-blue-50 shadow-none"><CardContent className="p-4 text-sm leading-6 text-blue-950"><strong>Tracking scope:</strong> this page only shows activity saved by managed ScholarBridge practice logins. It does not monitor their device, other websites, private messages or activity outside ScholarBridge.</CardContent></Card>
      {error ? <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div> : null}

      {loadingAccounts && !accounts.length ? <Card><CardContent className="flex items-center gap-2 p-8 text-sm text-[#667984]"><Loader2 className="animate-spin" />Loading managed practice accounts…</CardContent></Card> : !accounts.length ? <Card><CardHeader><CardTitle>No managed practice logins yet</CardTitle><CardDescription>Create a practice login first; its in-app work will then appear here as it is saved to the cloud.</CardDescription></CardHeader><CardContent><Button asChild><Link href="/admin/practice-access">Create practice login</Link></Button></CardContent></Card> : <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="space-y-3 lg:sticky lg:top-6 lg:self-start">
          <p className="text-xs font-bold uppercase tracking-[.16em] text-[#667984]">Learners</p>
          {accounts.map(account => <button key={account.userId} onClick={() => setSelectedUserId(account.userId)} className={`w-full rounded-xl border p-4 text-left transition ${selectedUserId === account.userId ? "border-[#147d91] bg-white ring-2 ring-[#147d91]/15" : "bg-white/80 hover:border-[#9bb9bf]"}`}>
            <div className="flex items-start justify-between gap-3"><div><p className="font-semibold text-[#102a43]">{account.displayName}</p><p className="mt-0.5 text-xs text-[#667984]">@{account.username}</p></div><span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${account.active ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>{account.active ? "Active" : "Inactive"}</span></div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-[#526a75]"><span>{account.testsCompleted} tests</span><span>{account.interviewSessions} interviews</span><span>{account.answersRecorded} answers</span><span>{account.transcriptTurns} transcript turns</span></div>
            <p className="mt-3 border-t pt-2 text-[11px] text-[#7a8d95]">Latest: {formatDate(account.latestActivityAt)}</p>
          </button>)}
        </aside>

        <section className="min-w-0 space-y-5">
          {loadingDetail ? <Card><CardContent className="flex items-center gap-2 p-8 text-sm text-[#667984]"><Loader2 className="animate-spin" />Loading {selectedSummary?.displayName || "learner"}…</CardContent></Card> : detail ? <>
            <Card><CardHeader><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-[#147d91]">Managed learner</p><CardTitle className="mt-2 font-serif text-3xl">{detail.account.displayName}</CardTitle><CardDescription className="mt-1">@{detail.account.username} · last sign-in {formatDate(detail.account.lastSignInAt)}</CardDescription></div><div className="flex gap-2">{detail.account.unlimitedUsage ? <Badge className="bg-emerald-100 text-emerald-800">Unlimited practice</Badge> : null}<Badge variant="outline">Latest activity {formatDate(detail.summary.latestActivityAt)}</Badge></div></div></CardHeader></Card>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard icon={<Target className="size-5" />} label="Tests completed" value={detail.summary.testsCompleted} detail={`${detail.summary.answersRecorded} recorded question responses · ${detail.summary.essaysRecorded} essays`} />
              <StatCard icon={<BarChart3 className="size-5" />} label="Average accuracy" value={detail.summary.averageAccuracy === null ? "—" : `${detail.summary.averageAccuracy}%`} detail="Average raw practice accuracy across saved full papers." />
              <StatCard icon={<MessageSquareText className="size-5" />} label="Interview sessions" value={detail.summary.interviewSessions} detail={`${detail.summary.candidateResponses} candidate responses · ${detail.summary.transcriptTurns} total transcript turns`} />
              <StatCard icon={<Clock3 className="size-5" />} label="Interview time" value={formatDuration(detail.summary.interviewSeconds)} detail="Total recorded duration across saved interview sessions." />
            </div>

            <div className="flex flex-wrap gap-2"><Button variant={view === "tests" ? "default" : "outline"} onClick={() => setView("tests")}><FileText />Tests & answers</Button><Button variant={view === "interviews" ? "default" : "outline"} onClick={() => setView("interviews")}><MessageSquareText />Interview transcripts</Button></div>

            {view === "tests" ? <div className="space-y-4">
              {!detail.tests.length ? <Card><CardHeader><CardTitle>No cloud-saved tests yet</CardTitle><CardDescription>When this learner submits a full practice paper while signed in, their result and question-level review will appear here.</CardDescription></CardHeader></Card> : detail.tests.map(test => {
                const open = openTestId === test.id
                const reviews = questionReview(test.payload)
                const essayResponses = stringMap(test.payload.essayResponses)
                const essayPrompts = stringMap(test.payload.essayPrompts)
                const answered = reviews.filter(item => answerText(item) !== "Unanswered").length
                return <Card key={test.id} className={open ? "border-[#147d91]" : ""}>
                  <CardHeader className="cursor-pointer" onClick={() => setOpenTestId(open ? "" : test.id)}><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex flex-wrap gap-2"><Badge variant="outline">{test.test}</Badge>{test.form ? <Badge variant="outline">Form {test.form}</Badge> : null}<Badge variant="outline">{reviews.length ? `${reviews.length} saved responses` : "Summary only"}</Badge></div><CardTitle className="mt-2 font-serif text-2xl">{test.title || `${test.test} practice`}</CardTitle><CardDescription>{formatDate(test.completedAt)} · {formatDuration(test.durationSeconds)}</CardDescription></div><div className="text-right"><p className="text-2xl font-bold">{test.rawScore}/{scoreDenominator(test)}</p><p className="text-sm font-semibold text-[#147d91]">{test.accuracy}% accuracy</p></div></div></CardHeader>
                  {open ? <CardContent className="space-y-5 border-t pt-5">
                    <div className="grid gap-3 sm:grid-cols-3"><div className="rounded-xl bg-slate-100 p-3"><p className="text-xs text-slate-500">Questions</p><p className="text-xl font-bold">{test.totalQuestions}</p></div><div className="rounded-xl bg-slate-100 p-3"><p className="text-xs text-slate-500">Recorded answers</p><p className="text-xl font-bold">{reviews.length ? answered : "—"}</p></div><div className="rounded-xl bg-slate-100 p-3"><p className="text-xs text-slate-500">Writing responses</p><p className="text-xl font-bold">{Object.keys(essayResponses).length}</p></div></div>

                    {reviews.length ? <div className="space-y-3"><h3 className="font-serif text-xl font-bold">Question-by-question answers</h3>{reviews.map((item, index) => {
                      const fullyCorrect = Boolean(item.correct)
                      const partial = !fullyCorrect && typeof item.rawMark === "number" && item.rawMark > 0
                      return <div key={item.questionId || item.id || `${test.id}-${index}`} className="rounded-xl border bg-white p-4">
                        <div className="flex flex-wrap items-center gap-2">{fullyCorrect ? <Badge className="bg-emerald-100 text-emerald-800"><CheckCircle2 className="size-3" />Correct</Badge> : partial ? <Badge className="bg-amber-100 text-amber-800">Partial credit</Badge> : <Badge className="bg-red-100 text-red-800"><XCircle className="size-3" />Review</Badge>}{item.section ? <Badge variant="outline">{item.section}</Badge> : null}{item.difficulty ? <Badge variant="outline">{item.difficulty}</Badge> : null}{typeof item.maxMarks === "number" ? <Badge variant="outline">{item.rawMark ?? 0}/{item.maxMarks} marks</Badge> : null}</div>
                        <p className="mt-3 whitespace-pre-wrap font-semibold leading-6">{item.prompt || `Question ${index + 1}`}</p>
                        <div className="mt-3 grid gap-3 text-sm md:grid-cols-2"><div className="rounded-lg bg-slate-50 p-3"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Learner answer</p><p className="mt-1 whitespace-pre-wrap">{answerText(item)}</p></div><div className="rounded-lg bg-slate-50 p-3"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Correct answer</p><p className="mt-1 whitespace-pre-wrap">{item.correctAnswer || "Not stored"}</p></div></div>
                        {item.explanation ? <p className="mt-3 rounded-lg bg-blue-50 p-3 text-sm leading-6 text-blue-950"><strong>Explanation:</strong> {item.explanation}</p> : null}
                      </div>
                    })}</div> : <p className="rounded-xl border bg-slate-50 p-4 text-sm text-slate-600">This older saved result only contains summary data. Newer full-paper submissions store question-by-question answers.</p>}

                    {Object.keys(essayResponses).length ? <div className="space-y-3"><h3 className="font-serif text-xl font-bold">Essay / writing responses</h3>{Object.entries(essayResponses).map(([id, response]) => <div key={id} className="rounded-xl border bg-white p-4"><p className="font-semibold">{essayPrompts[id] || "Writing task"}</p><p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-700">{response || "No response submitted."}</p></div>)}</div> : null}
                  </CardContent> : null}
                </Card>
              })}
            </div> : <div className="space-y-4">
              {!detail.interviews.length ? <Card><CardHeader><CardTitle>No cloud-saved interviews yet</CardTitle><CardDescription>When this learner completes a saved interview, its transcript and feedback will appear here.</CardDescription></CardHeader></Card> : detail.interviews.map(interview => {
                const open = openInterviewId === interview.id
                const score = typeof interview.overallFeedback.score === "number" ? interview.overallFeedback.score : null
                return <Card key={interview.id} className={open ? "border-[#147d91]" : ""}>
                  <CardHeader className="cursor-pointer" onClick={() => setOpenInterviewId(open ? "" : interview.id)}><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex flex-wrap gap-2"><Badge variant="outline">{interview.course || "General"}</Badge><Badge variant="outline">{interview.turns.length} turns</Badge></div><CardTitle className="mt-2 font-serif text-2xl">{interview.summary || "AI interview practice"}</CardTitle><CardDescription>{formatDate(interview.createdAt)} · {formatDuration(interview.durationSeconds)}</CardDescription></div>{score !== null ? <div className="text-right"><p className="text-2xl font-bold">{score}</p><p className="text-xs text-slate-500">saved practice score</p></div> : null}</div></CardHeader>
                  {open ? <CardContent className="space-y-4 border-t pt-5">
                    {!interview.turns.length ? <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">A session summary exists, but no transcript turns were saved for this older interview.</p> : interview.turns.map(turn => <div key={turn.id} className={`rounded-xl border p-4 ${turn.role === "candidate" ? "bg-blue-50/60" : turn.role === "interviewer" ? "bg-white" : "bg-slate-50"}`}>
                      <div className="flex flex-wrap items-center justify-between gap-2"><Badge className={turn.role === "candidate" ? "bg-blue-100 text-blue-900" : turn.role === "interviewer" ? "bg-[#102a43] text-white" : "bg-slate-200 text-slate-800"}>{turn.role === "candidate" ? "Learner" : turn.role === "interviewer" ? "AI interviewer" : "System"}</Badge><span className="text-xs text-slate-500">Turn {turn.turnIndex + 1} · {formatDate(turn.createdAt)}</span></div><p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-800">{turn.content}</p>{turn.feedback ? <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-950"><strong>Feedback:</strong> {turn.feedback}</p> : null}
                    </div>)}
                    {Object.keys(interview.overallFeedback).length ? <div className="rounded-xl border bg-slate-50 p-4"><p className="font-semibold">Saved session feedback</p><pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-words text-xs leading-5 text-slate-600">{JSON.stringify(interview.overallFeedback, null, 2)}</pre></div> : null}
                  </CardContent> : null}
                </Card>
              })}
            </div>}
          </> : null}
        </section>
      </div>}
    </div>
  </main>
}

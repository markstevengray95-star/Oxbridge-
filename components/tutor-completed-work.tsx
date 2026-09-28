"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Clock3,
  FileCheck2,
  FileText,
  History,
  MessageSquareText,
  RefreshCw,
  ShieldCheck,
  XCircle,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/client"

type View = "papers" | "questions" | "interviews"

type Review = {
  questionId?: string
  id?: string
  section?: string
  prompt?: string
  answer?: string
  selectedAnswer?: string
  correctAnswer?: string
  explanation?: string
  correct?: boolean
  rawMark?: number
  maxMarks?: number
}

type SectionResult = {
  id?: string
  title?: string
  kind?: string
  rawMark?: number
  maxMarks?: number
  correct?: number
  total?: number
  accuracy?: number
  words?: number
}

type TestResult = {
  id: string
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

type InterviewTurn = {
  turn_index: number
  role: "candidate" | "interviewer" | "system"
  content: string
  feedback?: string | null
}

type InterviewSession = {
  id: string
  course: string
  duration_seconds: number
  summary?: string | null
  created_at: string
  interview_turns?: InterviewTurn[]
}

type QuestionEntry = Review & {
  testId: string
  testName: string
  testTitle: string
  completedAt: string
  index: number
}

function durationLabel(seconds?: number | null) {
  if (!seconds) return "Not recorded"
  const minutes = Math.floor(seconds / 60)
  const remainder = seconds % 60
  return minutes >= 60 ? `${Math.floor(minutes / 60)}h ${minutes % 60}m` : `${minutes}m ${remainder}s`
}

function paperReviews(result: TestResult) {
  const payload = result.payload && typeof result.payload === "object" ? result.payload : {}
  return Array.isArray(payload.questionReview) ? payload.questionReview as Review[] : []
}

function paperSections(result: TestResult) {
  const payload = result.payload && typeof result.payload === "object" ? result.payload : {}
  return Array.isArray(payload.sections) ? payload.sections as SectionResult[] : []
}

function learnerAnswer(review: Review) {
  return review.answer || review.selectedAnswer || "No answer recorded"
}

function markLabel(review: Review) {
  if (typeof review.rawMark === "number" && typeof review.maxMarks === "number") return `${review.rawMark}/${review.maxMarks}`
  if (review.correct === true) return "Correct"
  if (review.correct === false) return "Incorrect"
  return "Recorded"
}

export function TutorCompletedWork() {
  const [view, setView] = useState<View>("papers")
  const [tests, setTests] = useState<TestResult[]>([])
  const [interviews, setInterviews] = useState<InterviewSession[]>([])
  const [selectedTestId, setSelectedTestId] = useState<string | null>(null)
  const [selectedInterviewId, setSelectedInterviewId] = useState<string | null>(null)
  const [signedIn, setSignedIn] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    const { data: auth } = await supabase.auth.getUser()
    const user = auth.user

    if (!user) {
      setSignedIn(false)
      setLoading(false)
      return
    }

    setSignedIn(true)
    const [testResponse, interviewResponse] = await Promise.all([
      supabase
        .from("test_results")
        .select("id,test,form,title,completed_at,raw_score,max_raw_marks,total_questions,accuracy,duration_seconds,payload")
        .eq("user_id", user.id)
        .order("completed_at", { ascending: false })
        .limit(50),
      supabase
        .from("interview_sessions")
        .select("id,course,duration_seconds,summary,created_at,interview_turns(turn_index,role,content,feedback)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50),
    ])

    if (testResponse.error || interviewResponse.error) {
      setNotice("Some completed work could not be loaded from the cloud. Refresh when your connection is available.")
    } else {
      setNotice("")
    }

    const nextTests = (testResponse.data ?? []) as TestResult[]
    const nextInterviews = (interviewResponse.data ?? []).map(item => ({
      ...item,
      interview_turns: [...(item.interview_turns ?? [])].sort((a, b) => a.turn_index - b.turn_index),
    })) as InterviewSession[]

    setTests(nextTests)
    setInterviews(nextInterviews)
    setSelectedTestId(current => current && nextTests.some(item => item.id === current) ? current : nextTests[0]?.id ?? null)
    setSelectedInterviewId(current => current && nextInterviews.some(item => item.id === current) ? current : nextInterviews[0]?.id ?? null)
    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
    const refresh = () => { void load() }
    window.addEventListener("oxbridge-history-updated", refresh)
    window.addEventListener("oxbridge-cloud-state-updated", refresh)
    return () => {
      window.removeEventListener("oxbridge-history-updated", refresh)
      window.removeEventListener("oxbridge-cloud-state-updated", refresh)
    }
  }, [load])

  const questions = useMemo<QuestionEntry[]>(() => tests.flatMap(test =>
    paperReviews(test).map((review, index) => ({
      ...review,
      testId: test.id,
      testName: test.test,
      testTitle: test.title || `${test.test} practice paper`,
      completedAt: test.completed_at,
      index,
    })),
  ), [tests])

  const selectedTest = tests.find(item => item.id === selectedTestId) ?? tests[0]
  const selectedInterview = interviews.find(item => item.id === selectedInterviewId) ?? interviews[0]
  const selectedReviews = selectedTest ? paperReviews(selectedTest) : []
  const selectedSections = selectedTest ? paperSections(selectedTest) : []
  const correctAnswers = questions.filter(item => item.correct === true).length
  const questionAccuracy = questions.length ? Math.round((correctAnswers / questions.length) * 100) : 0

  const tabs = [
    { id: "papers" as const, label: "Exam papers", count: tests.length, icon: FileText },
    { id: "questions" as const, label: "Questions & answers", count: questions.length, icon: FileCheck2 },
    { id: "interviews" as const, label: "Interviews", count: interviews.length, icon: MessageSquareText },
  ]

  return (
    <section id="tutor-completed-work" className="scroll-mt-28 border-y border-[#dbe5e7] bg-[#f7fbfc]">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.16em] text-[#147d91]"><History className="size-4" />Your evidence</div>
            <h2 className="mt-2 font-serif text-3xl font-bold text-[#102a43] sm:text-4xl">Completed work</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">Open the exam papers, question responses and interview transcripts saved to your account. Use them to review what you did, where marks were lost and how your reasoning has changed.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => void load()} disabled={loading}><RefreshCw className={loading ? "animate-spin" : ""} />Refresh</Button>
            <Button asChild variant="outline"><Link href="/history">Open full history<ArrowRight /></Link></Button>
          </div>
        </div>

        <div className="mb-6 grid gap-3 md:grid-cols-3" aria-label="Completed work categories">
          {tabs.map(tab => {
            const Icon = tab.icon
            const active = view === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setView(tab.id)}
                className={`rounded-2xl border p-5 text-left transition ${active ? "border-[#147d91] bg-white shadow-sm ring-2 ring-[#147d91]/10" : "border-[#dbe5e7] bg-white/70 hover:border-[#9ac7cf]"}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <Icon className="size-5 text-[#147d91]" />
                  <Badge variant="outline">{tab.count}</Badge>
                </div>
                <p className="mt-3 font-semibold text-[#102a43]">{tab.label}</p>
                <p className="mt-1 text-xs text-slate-500">Click to review your saved {tab.id === "papers" ? "completed papers" : tab.id === "questions" ? "responses and marking" : "transcripts and feedback"}.</p>
              </button>
            )
          })}
        </div>

        {notice ? <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{notice}</div> : null}

        {signedIn === false ? (
          <Card>
            <CardHeader><CardTitle>Sign in to see your completed work</CardTitle><CardDescription>Only work saved to the current account is shown here.</CardDescription></CardHeader>
            <CardContent><Button asChild><Link href="/login">Sign in</Link></Button></CardContent>
          </Card>
        ) : loading ? (
          <Card><CardContent className="p-8 text-center text-sm text-slate-500">Loading your completed work…</CardContent></Card>
        ) : tests.length === 0 && interviews.length === 0 ? (
          <Card>
            <CardHeader><CardTitle>No completed work yet</CardTitle><CardDescription>Finish a full paper or interview and it will appear here automatically.</CardDescription></CardHeader>
            <CardContent className="flex flex-wrap gap-3"><Button asChild><Link href="/full-papers">Take a full paper</Link></Button><Button asChild variant="outline"><Link href="/interviews">Start an interview</Link></Button></CardContent>
          </Card>
        ) : null}

        {!loading && signedIn && view === "papers" && tests.length > 0 ? (
          <div className="grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
            <Card className="h-fit lg:sticky lg:top-28">
              <CardHeader><CardTitle className="text-lg">Completed exam papers</CardTitle><CardDescription>{tests.length} saved paper{tests.length === 1 ? "" : "s"}</CardDescription></CardHeader>
              <CardContent className="max-h-[34rem] space-y-2 overflow-y-auto">
                {tests.map(test => {
                  const active = selectedTest?.id === test.id
                  return <button key={test.id} type="button" onClick={() => setSelectedTestId(test.id)} className={`w-full rounded-xl border p-3 text-left transition ${active ? "border-[#147d91] bg-[#edf7f8]" : "hover:border-slate-400"}`}>
                    <div className="flex items-start justify-between gap-2"><div><p className="font-semibold text-[#102a43]">{test.title || `${test.test} practice paper`}</p><p className="mt-1 text-xs text-slate-500">{test.test}{test.form ? ` · Form ${test.form}` : ""}</p></div><Badge variant="outline">{test.accuracy}%</Badge></div>
                    <p className="mt-2 text-xs text-slate-400">{new Date(test.completed_at).toLocaleString()}</p>
                  </button>
                })}
              </CardContent>
            </Card>

            {selectedTest ? <div className="space-y-4">
              <Card>
                <CardHeader><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.14em] text-[#147d91]">Saved exam paper</p><CardTitle className="mt-2 font-serif text-2xl">{selectedTest.title || `${selectedTest.test} practice paper`}</CardTitle><CardDescription>{new Date(selectedTest.completed_at).toLocaleString()}</CardDescription></div><Badge>{selectedTest.raw_score}/{selectedTest.max_raw_marks ?? selectedTest.total_questions}</Badge></div></CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-3"><div className="rounded-xl bg-slate-50 p-4"><BarChart3 className="size-4 text-[#147d91]" /><p className="mt-2 text-2xl font-bold">{selectedTest.accuracy}%</p><p className="text-xs text-slate-500">accuracy</p></div><div className="rounded-xl bg-slate-50 p-4"><FileCheck2 className="size-4 text-[#147d91]" /><p className="mt-2 text-2xl font-bold">{selectedReviews.length || selectedTest.total_questions}</p><p className="text-xs text-slate-500">questions recorded</p></div><div className="rounded-xl bg-slate-50 p-4"><Clock3 className="size-4 text-[#147d91]" /><p className="mt-2 font-bold">{durationLabel(selectedTest.duration_seconds)}</p><p className="text-xs text-slate-500">time used</p></div></CardContent>
              </Card>

              {selectedSections.length ? <Card><CardHeader><CardTitle className="text-lg">Section breakdown</CardTitle></CardHeader><CardContent className="grid gap-3 sm:grid-cols-2">{selectedSections.map((section, index) => <div key={section.id || index} className="rounded-xl border p-4"><p className="font-semibold">{section.title || `Section ${index + 1}`}</p><p className="mt-1 text-sm text-slate-500">{section.kind === "essay" ? `${section.words ?? 0} words` : `${section.rawMark ?? section.correct ?? 0}/${section.maxMarks ?? section.total ?? 0} marks`}</p></div>)}</CardContent></Card> : null}

              <Card>
                <CardHeader><CardTitle className="text-lg">Questions from this paper</CardTitle><CardDescription>See exactly what you answered and how it was marked.</CardDescription></CardHeader>
                <CardContent className="space-y-3">{selectedReviews.length ? selectedReviews.map((review, index) => <div key={review.questionId || review.id || index} className="rounded-xl border p-4"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xs font-bold uppercase tracking-[.12em] text-slate-500">{review.section || `Question ${index + 1}`}</p><Badge variant={review.correct === false ? "destructive" : "outline"}>{markLabel(review)}</Badge></div>{review.prompt ? <p className="mt-2 font-medium leading-6">{review.prompt}</p> : null}<div className="mt-3 grid gap-3 md:grid-cols-2"><div className="rounded-lg bg-slate-50 p-3"><p className="text-[11px] font-bold uppercase text-slate-500">Your answer</p><p className="mt-1 whitespace-pre-wrap text-sm">{learnerAnswer(review)}</p></div>{review.correctAnswer ? <div className="rounded-lg bg-emerald-50 p-3"><p className="text-[11px] font-bold uppercase text-emerald-700">Correct answer</p><p className="mt-1 whitespace-pre-wrap text-sm text-emerald-950">{review.correctAnswer}</p></div> : null}</div>{review.explanation ? <p className="mt-3 text-sm leading-6 text-slate-600"><strong>Explanation:</strong> {review.explanation}</p> : null}</div>) : <p className="text-sm text-slate-500">This older paper does not contain question-level review data.</p>}</CardContent>
              </Card>
            </div> : null}
          </div>
        ) : null}

        {!loading && signedIn && view === "questions" ? (
          <div className="space-y-4">
            <Card>
              <CardContent className="grid gap-3 p-5 sm:grid-cols-3"><div><p className="text-xs font-bold uppercase tracking-[.12em] text-slate-500">Recorded questions</p><p className="mt-1 text-3xl font-bold">{questions.length}</p></div><div><p className="text-xs font-bold uppercase tracking-[.12em] text-slate-500">Correct</p><p className="mt-1 text-3xl font-bold">{correctAnswers}</p></div><div><p className="text-xs font-bold uppercase tracking-[.12em] text-slate-500">Question accuracy</p><p className="mt-1 text-3xl font-bold">{questionAccuracy}%</p></div></CardContent>
            </Card>
            {questions.length ? <div className="space-y-3">{questions.map(question => <Card key={`${question.testId}-${question.questionId || question.id || question.index}`}><CardContent className="p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.12em] text-[#147d91]">{question.testTitle}</p><p className="mt-1 text-xs text-slate-400">{new Date(question.completedAt).toLocaleString()} · {question.section || `Question ${question.index + 1}`}</p></div><Badge variant={question.correct === false ? "destructive" : "outline"}>{question.correct === true ? <CheckCircle2 className="mr-1 size-3.5" /> : question.correct === false ? <XCircle className="mr-1 size-3.5" /> : null}{markLabel(question)}</Badge></div>{question.prompt ? <p className="mt-3 font-medium leading-6">{question.prompt}</p> : null}<div className="mt-3 grid gap-3 md:grid-cols-2"><div className="rounded-xl bg-slate-50 p-3"><p className="text-[11px] font-bold uppercase text-slate-500">Your answer</p><p className="mt-1 whitespace-pre-wrap text-sm">{learnerAnswer(question)}</p></div>{question.correctAnswer ? <div className="rounded-xl bg-emerald-50 p-3"><p className="text-[11px] font-bold uppercase text-emerald-700">Correct answer</p><p className="mt-1 whitespace-pre-wrap text-sm text-emerald-950">{question.correctAnswer}</p></div> : null}</div>{question.explanation ? <p className="mt-3 text-sm leading-6 text-slate-600"><strong>Why:</strong> {question.explanation}</p> : null}</CardContent></Card>)}</div> : <Card><CardContent className="p-8 text-center text-sm text-slate-500">No question-level answers have been recorded yet.</CardContent></Card>}
          </div>
        ) : null}

        {!loading && signedIn && view === "interviews" && interviews.length > 0 ? (
          <div className="grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
            <Card className="h-fit lg:sticky lg:top-28">
              <CardHeader><CardTitle className="text-lg">Completed interviews</CardTitle><CardDescription>{interviews.length} saved session{interviews.length === 1 ? "" : "s"}</CardDescription></CardHeader>
              <CardContent className="max-h-[34rem] space-y-2 overflow-y-auto">{interviews.map(interview => { const active = selectedInterview?.id === interview.id; return <button key={interview.id} type="button" onClick={() => setSelectedInterviewId(interview.id)} className={`w-full rounded-xl border p-3 text-left transition ${active ? "border-[#147d91] bg-[#edf7f8]" : "hover:border-slate-400"}`}><p className="font-semibold text-[#102a43]">{interview.summary || `${interview.course} interview`}</p><p className="mt-1 text-xs text-slate-500">{interview.course} · {durationLabel(interview.duration_seconds)}</p><p className="mt-2 text-xs text-slate-400">{new Date(interview.created_at).toLocaleString()}</p></button> })}</CardContent>
            </Card>
            {selectedInterview ? <Card><CardHeader><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.14em] text-[#147d91]">Interview transcript</p><CardTitle className="mt-2 font-serif text-2xl">{selectedInterview.summary || `${selectedInterview.course} interview`}</CardTitle><CardDescription>{new Date(selectedInterview.created_at).toLocaleString()} · {durationLabel(selectedInterview.duration_seconds)}</CardDescription></div><Badge variant="outline">{selectedInterview.interview_turns?.length ?? 0} turns</Badge></div></CardHeader><CardContent className="space-y-3">{selectedInterview.interview_turns?.length ? selectedInterview.interview_turns.map(turn => <div key={`${selectedInterview.id}-${turn.turn_index}`} className={`rounded-2xl p-4 ${turn.role === "candidate" ? "ml-auto max-w-[94%] bg-[#102a43] text-white" : "border bg-white"}`}><p className={`text-[11px] font-bold uppercase tracking-[.12em] ${turn.role === "candidate" ? "text-cyan-200" : "text-[#147d91]"}`}>{turn.role === "candidate" ? "Your answer" : turn.role}</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6">{turn.content}</p>{turn.feedback ? <div className={`mt-3 rounded-xl p-3 text-sm ${turn.role === "candidate" ? "bg-white/10" : "bg-[#edf7f8] text-slate-700"}`}><strong>Feedback:</strong> {turn.feedback}</div> : null}</div>) : <p className="text-sm text-slate-500">No transcript turns were saved for this older interview.</p>}</CardContent></Card> : null}
          </div>
        ) : null}

        {!loading && signedIn && view === "interviews" && interviews.length === 0 ? <Card><CardContent className="p-8 text-center text-sm text-slate-500">No completed interviews have been saved yet.</CardContent></Card> : null}

        {!loading && signedIn ? <div className="mt-6 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950"><ShieldCheck className="mt-0.5 size-5 shrink-0" /><p><strong>Your account only:</strong> this panel requests records using the current signed-in user ID and is additionally protected by the database row-level security already used by ScholarBridge history.</p></div> : null}
      </div>
    </section>
  )
}

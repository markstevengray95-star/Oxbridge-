import { NextResponse } from "next/server"
import { getAppAdminAccess } from "@/lib/auth/admin"
import { createAdminClient, hasSupabaseAdminConfig } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type PracticeAccountRow = {
  user_id: string
  username: string
  display_name: string | null
  active: boolean
  unlimited_usage: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}

type TestResultRow = {
  id: string
  user_id: string
  source_ref: string
  test: string
  form: number | null
  title: string | null
  completed_at: string
  raw_score: number
  max_raw_marks: number | null
  total_questions: number
  accuracy: number
  duration_seconds: number | null
  payload: unknown
}

type InterviewSessionRow = {
  id: string
  user_id: string
  course: string
  duration_seconds: number
  summary: string | null
  overall_feedback: unknown
  created_at: string
  updated_at: string
}

type InterviewTurnRow = {
  id: string
  session_id: string
  user_id: string
  turn_index: number
  role: "candidate" | "interviewer" | "system"
  content: string
  feedback: string | null
  created_at: string
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

function array(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function numberValue(value: unknown, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function latestIso(values: Array<string | null | undefined>) {
  const valid = values.filter((value): value is string => Boolean(value))
  if (!valid.length) return null
  return valid.sort((a, b) => Date.parse(b) - Date.parse(a))[0] ?? null
}

function answerCount(payload: unknown) {
  const data = record(payload)
  const reviews = array(data.questionReview)
  if (reviews.length) return reviews.length
  return numberValue(data.answered, 0)
}

function essayCount(payload: unknown) {
  const responses = record(record(payload).essayResponses)
  return Object.values(responses).filter(value => typeof value === "string" && value.trim()).length
}

async function authenticateAdmin() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const claims = data?.claims
  const userId = typeof claims?.sub === "string" ? claims.sub : null
  const email = typeof claims?.email === "string" ? claims.email : null
  if (!userId) return { error: NextResponse.json({ error: "Administrator sign-in required." }, { status: 401 }) }
  const access = await getAppAdminAccess(userId, email)
  if (!access.isAdmin) return { error: NextResponse.json({ error: "Administrator access required." }, { status: 403 }) }
  return { userId, email }
}

export async function GET(request: Request) {
  const auth = await authenticateAdmin()
  if ("error" in auth) return auth.error
  if (!hasSupabaseAdminConfig()) {
    return NextResponse.json({ error: "Server database access is not configured." }, { status: 503 })
  }

  const admin = createAdminClient()
  const { data: accountData, error: accountError } = await admin
    .from("practice_access_accounts")
    .select("user_id,username,display_name,active,unlimited_usage,created_by,created_at,updated_at")
    .eq("created_by", auth.userId)
    .order("created_at", { ascending: false })

  if (accountError) {
    return NextResponse.json({ error: `Could not load managed practice accounts: ${accountError.message}` }, { status: 500 })
  }

  const accounts = (accountData ?? []) as PracticeAccountRow[]
  const url = new URL(request.url)
  const targetUserId = url.searchParams.get("userId")?.trim() || ""

  if (targetUserId) {
    const account = accounts.find(item => item.user_id === targetUserId)
    if (!account) return NextResponse.json({ error: "Managed practice account not found." }, { status: 404 })

    const [authResult, testsResult, sessionsResult] = await Promise.all([
      admin.auth.admin.getUserById(account.user_id),
      admin
        .from("test_results")
        .select("id,user_id,source_ref,test,form,title,completed_at,raw_score,max_raw_marks,total_questions,accuracy,duration_seconds,payload")
        .eq("user_id", account.user_id)
        .order("completed_at", { ascending: false })
        .limit(100),
      admin
        .from("interview_sessions")
        .select("id,user_id,course,duration_seconds,summary,overall_feedback,created_at,updated_at")
        .eq("user_id", account.user_id)
        .order("created_at", { ascending: false })
        .limit(100),
    ])

    if (testsResult.error) return NextResponse.json({ error: `Could not load test history: ${testsResult.error.message}` }, { status: 500 })
    if (sessionsResult.error) return NextResponse.json({ error: `Could not load interview history: ${sessionsResult.error.message}` }, { status: 500 })

    const tests = (testsResult.data ?? []) as TestResultRow[]
    const sessions = (sessionsResult.data ?? []) as InterviewSessionRow[]
    const sessionIds = sessions.map(item => item.id)
    let turns: InterviewTurnRow[] = []
    if (sessionIds.length) {
      const turnsResult = await admin
        .from("interview_turns")
        .select("id,session_id,user_id,turn_index,role,content,feedback,created_at")
        .eq("user_id", account.user_id)
        .in("session_id", sessionIds)
        .order("turn_index", { ascending: true })
      if (turnsResult.error) return NextResponse.json({ error: `Could not load interview transcripts: ${turnsResult.error.message}` }, { status: 500 })
      turns = (turnsResult.data ?? []) as InterviewTurnRow[]
    }

    const turnsBySession = new Map<string, InterviewTurnRow[]>()
    for (const turn of turns) {
      const current = turnsBySession.get(turn.session_id) ?? []
      current.push(turn)
      turnsBySession.set(turn.session_id, current)
    }

    const answerTotal = tests.reduce((sum, item) => sum + answerCount(item.payload), 0)
    const essayTotal = tests.reduce((sum, item) => sum + essayCount(item.payload), 0)
    const candidateTurns = turns.filter(item => item.role === "candidate").length
    const interviewSeconds = sessions.reduce((sum, item) => sum + Math.max(0, numberValue(item.duration_seconds)), 0)
    const averageAccuracy = tests.length
      ? Math.round(tests.reduce((sum, item) => sum + Math.max(0, Math.min(100, numberValue(item.accuracy))), 0) / tests.length)
      : null

    const detail = {
      account: {
        userId: account.user_id,
        username: account.username,
        displayName: account.display_name || account.username,
        active: account.active,
        unlimitedUsage: account.unlimited_usage,
        createdAt: account.created_at,
        updatedAt: account.updated_at,
        lastSignInAt: authResult.data.user?.last_sign_in_at ?? null,
      },
      summary: {
        testsCompleted: tests.length,
        averageAccuracy,
        answersRecorded: answerTotal,
        essaysRecorded: essayTotal,
        interviewSessions: sessions.length,
        transcriptTurns: turns.length,
        candidateResponses: candidateTurns,
        interviewSeconds,
        latestActivityAt: latestIso([
          tests[0]?.completed_at,
          sessions[0]?.created_at,
          authResult.data.user?.last_sign_in_at,
        ]),
      },
      tests: tests.map(item => ({
        id: item.id,
        sourceRef: item.source_ref,
        test: item.test,
        form: item.form,
        title: item.title,
        completedAt: item.completed_at,
        rawScore: item.raw_score,
        maxRawMarks: item.max_raw_marks,
        totalQuestions: item.total_questions,
        accuracy: item.accuracy,
        durationSeconds: item.duration_seconds,
        payload: record(item.payload),
      })),
      interviews: sessions.map(item => ({
        id: item.id,
        course: item.course,
        durationSeconds: item.duration_seconds,
        summary: item.summary,
        overallFeedback: record(item.overall_feedback),
        createdAt: item.created_at,
        updatedAt: item.updated_at,
        turns: (turnsBySession.get(item.id) ?? []).map(turn => ({
          id: turn.id,
          turnIndex: turn.turn_index,
          role: turn.role,
          content: turn.content,
          feedback: turn.feedback,
          createdAt: turn.created_at,
        })),
      })),
      scope: "managed-practice-only",
      notice: "This dashboard contains activity completed inside ScholarBridge by a managed practice login. It does not monitor the learner's device, browser activity outside ScholarBridge, private messages or unrelated accounts.",
    }

    return NextResponse.json(detail, { headers: { "Cache-Control": "no-store" } })
  }

  const userIds = accounts.map(item => item.user_id)
  if (!userIds.length) {
    return NextResponse.json({ accounts: [], scope: "managed-practice-only" }, { headers: { "Cache-Control": "no-store" } })
  }

  const [testsResult, sessionsResult, turnsResult, authResults] = await Promise.all([
    admin.from("test_results").select("user_id,accuracy,total_questions,duration_seconds,completed_at,payload").in("user_id", userIds),
    admin.from("interview_sessions").select("id,user_id,duration_seconds,created_at").in("user_id", userIds),
    admin.from("interview_turns").select("user_id,role,created_at").in("user_id", userIds),
    Promise.all(accounts.map(account => admin.auth.admin.getUserById(account.user_id))),
  ])

  if (testsResult.error) return NextResponse.json({ error: `Could not load test summaries: ${testsResult.error.message}` }, { status: 500 })
  if (sessionsResult.error) return NextResponse.json({ error: `Could not load interview summaries: ${sessionsResult.error.message}` }, { status: 500 })
  if (turnsResult.error) return NextResponse.json({ error: `Could not load transcript summaries: ${turnsResult.error.message}` }, { status: 500 })

  const testRows = (testsResult.data ?? []) as Array<Pick<TestResultRow, "user_id" | "accuracy" | "total_questions" | "duration_seconds" | "completed_at" | "payload">>
  const sessionRows = (sessionsResult.data ?? []) as Array<Pick<InterviewSessionRow, "id" | "user_id" | "duration_seconds" | "created_at">>
  const turnRows = (turnsResult.data ?? []) as Array<Pick<InterviewTurnRow, "user_id" | "role" | "created_at">>

  const summaries = accounts.map((account, index) => {
    const tests = testRows.filter(item => item.user_id === account.user_id)
    const sessions = sessionRows.filter(item => item.user_id === account.user_id)
    const accountTurns = turnRows.filter(item => item.user_id === account.user_id)
    const authUser = authResults[index]?.data.user
    const averageAccuracy = tests.length ? Math.round(tests.reduce((sum, item) => sum + numberValue(item.accuracy), 0) / tests.length) : null
    return {
      userId: account.user_id,
      username: account.username,
      displayName: account.display_name || account.username,
      active: account.active,
      unlimitedUsage: account.unlimited_usage,
      createdAt: account.created_at,
      lastSignInAt: authUser?.last_sign_in_at ?? null,
      testsCompleted: tests.length,
      averageAccuracy,
      answersRecorded: tests.reduce((sum, item) => sum + answerCount(item.payload), 0),
      interviewSessions: sessions.length,
      transcriptTurns: accountTurns.length,
      latestActivityAt: latestIso([
        ...tests.map(item => item.completed_at),
        ...sessions.map(item => item.created_at),
        authUser?.last_sign_in_at,
      ]),
    }
  })

  return NextResponse.json({ accounts: summaries, scope: "managed-practice-only" }, { headers: { "Cache-Control": "no-store" } })
}

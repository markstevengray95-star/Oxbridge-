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


type StateRow = { user_id: string; state_key: string; state_value: unknown; updated_at: string }
type UsageRow = { user_id: string; app: string; page_path: string | null; active_seconds: number | null; started_at: string; last_seen_at: string | null; device_class: string | null }
type NavigationRow = { user_id: string; page_path: string; occurred_at: string }
const PROGRESS_STATE_KEY = "oxbridge-tutor-progress-v2"
const LAST_PAPER_STATE_KEY = "oxbridge-last-full-test-result-v1"

function findState(rows: StateRow[], key: string) {
  return rows.find(item => item.state_key === key)
}

function practiceAttempts(rows: StateRow[]) {
  const progress = record(findState(rows, PROGRESS_STATE_KEY)?.state_value)
  return array(progress.practiceAttempts).map((item) => {
    const attempt = record(item)
    return {
      test: typeof attempt.test === "string" ? attempt.test : "Practice",
      section: typeof attempt.section === "string" ? attempt.section : "Questions",
      difficulty: typeof attempt.difficulty === "string" ? attempt.difficulty : null,
      correct: typeof attempt.correct === "boolean" ? attempt.correct : null,
      date: typeof attempt.date === "string" ? attempt.date : null,
    }
  }).filter(item => item.date && !Number.isNaN(Date.parse(item.date)))
}

function recoveredPaper(rows: StateRow[], tests: TestResultRow[], userId: string): TestResultRow | null {
  const state = findState(rows, LAST_PAPER_STATE_KEY)
  if (!state) return null
  const value = record(state.state_value)
  const completedAt = typeof value.date === "string" && !Number.isNaN(Date.parse(value.date)) ? value.date : state.updated_at
  const test = typeof value.test === "string" ? value.test : "Practice test"
  const alreadySaved = tests.some(item => item.test === test && Math.abs(Date.parse(item.completed_at) - Date.parse(completedAt)) < 180000)
  if (alreadySaved) return null
  if (!Array.isArray(value.questionReview) && !Array.isArray(value.sections)) return null
  return {
    id: "recovered-" + userId,
    user_id: userId,
    source_ref: "saved-state-" + completedAt,
    test,
    form: typeof value.form === "number" ? value.form : null,
    title: typeof value.title === "string" ? value.title : test + " saved paper",
    completed_at: completedAt,
    raw_score: numberValue(value.rawScore),
    max_raw_marks: value.maxRawMarks === null || value.maxRawMarks === undefined ? null : numberValue(value.maxRawMarks),
    total_questions: numberValue(value.totalQuestions),
    accuracy: numberValue(value.accuracy),
    duration_seconds: value.durationSeconds === null || value.durationSeconds === undefined ? null : numberValue(value.durationSeconds),
    payload: { ...value, recoveredFromState: true },
  }
}

function pagePath(path: string | null) {
  if (!path || !path.startsWith("/") || path.startsWith("//")) return null
  return path.split("?")[0]?.slice(0, 160) || null
}

function usageStats(rows: UsageRow[]) {
  const seconds = rows.reduce((total, item) => total + Math.max(0, numberValue(item.active_seconds)), 0)
  const visited = Array.from(new Set(rows.map(item => pagePath(item.page_path)).filter((path): path is string => Boolean(path))))
  return { recordedActiveSeconds: seconds, usageSessions: rows.length, visitedPages: visited }
}

function activityItems(usage: UsageRow[], navigation: NavigationRow[], attempts: ReturnType<typeof practiceAttempts>, tests: TestResultRow[], interviews: InterviewSessionRow[]) {
  const events = [
    ...navigation.map((item, index) => ({ id: "nav-" + index, kind: "page", title: "Opened " + item.page_path, at: item.occurred_at, path: item.page_path })),
    ...usage.filter(item => pagePath(item.page_path)).map((item, index) => ({ id: "session-" + index, kind: "session", title: "Session on " + pagePath(item.page_path), at: item.last_seen_at || item.started_at, path: pagePath(item.page_path) })),
    ...attempts.map((item, index) => ({ id: "question-" + index, kind: "question", title: item.test + " · " + item.section + (item.correct === null ? "" : item.correct ? " · correct" : " · review"), at: item.date!, path: null })),
    ...tests.map((item) => ({ id: "test-" + item.id, kind: "test", title: item.test + " paper completed", at: item.completed_at, path: null })),
    ...interviews.map((item) => ({ id: "interview-" + item.id, kind: "interview", title: item.course + " interview", at: item.created_at, path: null })),
  ]
  return events.filter(item => !Number.isNaN(Date.parse(item.at))).sort((a,b) => Date.parse(b.at) - Date.parse(a.at)).slice(0, 100)
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
    .eq("account_type","student")
    // Platform administrators can see all managed practice logins, including
    // logins issued under a previous admin session. Auth and student evidence
    // remain scoped exclusively to verified platform administrators.
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

    const [authResult, testsResult, sessionsResult, stateResult, usageResult, navigationResult] = await Promise.all([
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
      admin.from("user_state").select("user_id,state_key,state_value,updated_at").eq("user_id", account.user_id).in("state_key", [PROGRESS_STATE_KEY, LAST_PAPER_STATE_KEY]),
      admin.from("orbits_usage_sessions").select("user_id,app,page_path,active_seconds,started_at,last_seen_at,device_class").eq("user_id", account.user_id).eq("app", "fellow").order("last_seen_at", { ascending: false }).limit(500),
      admin.from("fellow_practice_activity_events").select("user_id,page_path,occurred_at").eq("user_id", account.user_id).order("occurred_at", { ascending: false }).limit(500),
    ])

    if (stateResult.error) return NextResponse.json({ error: `Could not load saved progress: ${stateResult.error.message}` }, { status: 500 })
    if (usageResult.error) return NextResponse.json({ error: `Could not load usage sessions: ${usageResult.error.message}` }, { status: 500 })
    if (navigationResult.error) return NextResponse.json({ error: `Could not load page history: ${navigationResult.error.message}` }, { status: 500 })
    if (testsResult.error) return NextResponse.json({ error: `Could not load test history: ${testsResult.error.message}` }, { status: 500 })
    if (sessionsResult.error) return NextResponse.json({ error: `Could not load interview history: ${sessionsResult.error.message}` }, { status: 500 })

    const savedTests = (testsResult.data ?? []) as TestResultRow[]
    const states = (stateResult.data ?? []) as StateRow[]
    const recovered = recoveredPaper(states, savedTests, account.user_id)
    const tests = recovered ? [recovered, ...savedTests].sort((a,b) => Date.parse(b.completed_at) - Date.parse(a.completed_at)) : savedTests
    const usage = (usageResult.data ?? []) as UsageRow[]
    const navigation = (navigationResult.data ?? []) as NavigationRow[]
    const attempts = practiceAttempts(states)
    const usageSummary = usageStats(usage)
    const lastSavedAt = latestIso(states.map(item => item.updated_at))
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
        practiceQuestionsAttempted: attempts.length,
        recoveredTests: recovered ? 1 : 0,
        recordedActiveSeconds: usageSummary.recordedActiveSeconds,
        usageSessions: usageSummary.usageSessions,
        visitedPages: usageSummary.visitedPages.length,
        lastSavedAt,
        candidateResponses: candidateTurns,
        interviewSeconds,
        latestActivityAt: latestIso([
          tests[0]?.completed_at,
          sessions[0]?.created_at,
          authResult.data.user?.last_sign_in_at,
          lastSavedAt,
          ...usage.map(item => item.last_seen_at),
          ...navigation.map(item => item.occurred_at),
          ...attempts.map(item => item.date),
        ]),
      },
      activity: activityItems(usage, navigation, attempts, tests, sessions),
      navigation: navigation.slice(0, 100).map(item => ({ path: pagePath(item.page_path), at: item.occurred_at })),
      usage: usage.slice(0, 100).map(item => ({ path: pagePath(item.page_path), startedAt: item.started_at, lastSeenAt: item.last_seen_at, activeSeconds: Math.max(0, numberValue(item.active_seconds)), deviceClass: item.device_class })),
      practiceAttempts: attempts.slice(0, 100),
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
      notice: "This dashboard contains activity completed inside Fellow by a managed practice login. It does not monitor the learner's device, browser activity outside Fellow, private messages or unrelated accounts.",
    }

    return NextResponse.json(detail, { headers: { "Cache-Control": "no-store" } })
  }

  const userIds = accounts.map(item => item.user_id)
  if (!userIds.length) {
    return NextResponse.json({ accounts: [], scope: "managed-practice-only" }, { headers: { "Cache-Control": "no-store" } })
  }

  const [testsResult, sessionsResult, turnsResult, authResults, stateResult, usageResult, navigationResult] = await Promise.all([
    admin.from("test_results").select("user_id,test,accuracy,total_questions,duration_seconds,completed_at,payload").in("user_id", userIds),
    admin.from("interview_sessions").select("id,user_id,duration_seconds,created_at").in("user_id", userIds),
    admin.from("interview_turns").select("user_id,role,created_at").in("user_id", userIds),
    Promise.all(accounts.map(account => admin.auth.admin.getUserById(account.user_id))),
    admin.from("user_state").select("user_id,state_key,state_value,updated_at").in("user_id", userIds).in("state_key", [PROGRESS_STATE_KEY, LAST_PAPER_STATE_KEY]).limit(1000),
    admin.from("orbits_usage_sessions").select("user_id,app,page_path,active_seconds,started_at,last_seen_at,device_class").in("user_id", userIds).eq("app", "fellow").limit(1000),
    admin.from("fellow_practice_activity_events").select("user_id,page_path,occurred_at").in("user_id", userIds).order("occurred_at", { ascending: false }).limit(1000),
  ])

  if (stateResult.error) return NextResponse.json({ error: `Could not load saved progress: ${stateResult.error.message}` }, { status: 500 })
  if (usageResult.error) return NextResponse.json({ error: `Could not load usage sessions: ${usageResult.error.message}` }, { status: 500 })
  if (navigationResult.error) return NextResponse.json({ error: `Could not load page activity: ${navigationResult.error.message}` }, { status: 500 })
  if (testsResult.error) return NextResponse.json({ error: `Could not load test summaries: ${testsResult.error.message}` }, { status: 500 })
  if (sessionsResult.error) return NextResponse.json({ error: `Could not load interview summaries: ${sessionsResult.error.message}` }, { status: 500 })
  if (turnsResult.error) return NextResponse.json({ error: `Could not load transcript summaries: ${turnsResult.error.message}` }, { status: 500 })

  const testRows = (testsResult.data ?? []) as Array<Pick<TestResultRow, "user_id" | "test" | "accuracy" | "total_questions" | "duration_seconds" | "completed_at" | "payload">>
  const sessionRows = (sessionsResult.data ?? []) as Array<Pick<InterviewSessionRow, "id" | "user_id" | "duration_seconds" | "created_at">>
  const turnRows = (turnsResult.data ?? []) as Array<Pick<InterviewTurnRow, "user_id" | "role" | "created_at">>

  const summaries = accounts.map((account, index) => {
    const savedTests = testRows.filter(item => item.user_id === account.user_id)
    const states = ((stateResult.data ?? []) as StateRow[]).filter(item => item.user_id === account.user_id)
    const recovered = recoveredPaper(states, savedTests.map((item, index) => ({ ...item, id: "summary-" + index, source_ref: "", test: item.test, form: null, title: null, raw_score: 0, max_raw_marks: null, total_questions: item.total_questions, accuracy: item.accuracy, completed_at: item.completed_at, duration_seconds: item.duration_seconds, payload: item.payload })), account.user_id)
    const tests = recovered ? [...savedTests, recovered] : savedTests
    const sessions = sessionRows.filter(item => item.user_id === account.user_id)
    const accountTurns = turnRows.filter(item => item.user_id === account.user_id)
    const usage = ((usageResult.data ?? []) as UsageRow[]).filter(item => item.user_id === account.user_id)
    const navigation = ((navigationResult.data ?? []) as NavigationRow[]).filter(item => item.user_id === account.user_id)
    const attempts = practiceAttempts(states)
    const usageSummary = usageStats(usage)
    const lastSavedAt = latestIso(states.map(item => item.updated_at))
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
      practiceQuestionsAttempted: attempts.length,
      recoveredTests: recovered ? 1 : 0,
      recordedActiveSeconds: usageSummary.recordedActiveSeconds,
      usageSessions: usageSummary.usageSessions,
      visitedPages: Array.from(new Set([...usageSummary.visitedPages, ...navigation.map(item => pagePath(item.page_path)).filter(Boolean)])).length,
      lastSavedAt,
      averageAccuracy,
      answersRecorded: tests.reduce((sum, item) => sum + answerCount(item.payload), 0),
      interviewSessions: sessions.length,
      transcriptTurns: accountTurns.length,
      latestActivityAt: latestIso([
        ...tests.map(item => item.completed_at),
        ...sessions.map(item => item.created_at),
        authUser?.last_sign_in_at,
        lastSavedAt,
        ...usage.map(item => item.last_seen_at),
        ...navigation.map(item => item.occurred_at),
        ...attempts.map(item => item.date),
      ]),
    }
  })

  return NextResponse.json({ accounts: summaries, scope: "managed-practice-only" }, { headers: { "Cache-Control": "no-store" } })
}

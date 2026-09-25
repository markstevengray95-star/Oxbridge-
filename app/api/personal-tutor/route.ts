import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { STUDENT_AI_SAFETY_POLICY } from "@/lib/ai/student-safety"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type TutorMode = "coach" | "challenge" | "explain" | "plan" | "review"
type ChatMessage = { role: "student" | "tutor"; text: string }
type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>
type TutorRequest = { question?: string; mode?: TutorMode; profile?: Record<string, unknown>; intelligence?: Record<string, unknown>; plan?: Record<string, unknown>; reflection?: string; conversation?: Array<{ role?: string; text?: string }> }
type CloudContext = { intelligence: unknown; plans: unknown[]; memories: unknown[]; mistakes: unknown[]; evidence: unknown[]; application: unknown[]; supercurricular: unknown[]; chat: ChatMessage[]; reflection: string }
type StateUpsert = { user_id: string; state_key: string; state_value: Record<string, unknown>; updated_at: string }

const CHAT_STATE_KEY = "oxbridge-personal-tutor-chat-v2"
const REFLECTION_STATE_KEY = "oxbridge-personal-tutor-reflection-v2"
const TUTOR_MODES: TutorMode[] = ["coach", "challenge", "explain", "plan", "review"]

function extractText(data: unknown) {
  if (!data || typeof data !== "object") return ""
  const candidates = (data as { candidates?: unknown }).candidates
  if (!Array.isArray(candidates)) return ""
  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== "object") continue
    const parts = ((candidate as { content?: { parts?: unknown[] } }).content?.parts ?? [])
    const text = parts.map(part => part && typeof part === "object" && typeof (part as { text?: unknown }).text === "string" ? String((part as { text?: string }).text) : "").join(" ").trim()
    if (text) return text
  }
  return ""
}
function cleanConversation(value: unknown): ChatMessage[] {
  if (!Array.isArray(value)) return []
  const messages: ChatMessage[] = []
  for (const item of value) {
    if (!item || typeof item !== "object") continue
    const raw = item as { role?: unknown; text?: unknown }
    if (raw.role !== "student" && raw.role !== "tutor") continue
    if (typeof raw.text !== "string" || !raw.text.trim()) continue
    messages.push({ role: raw.role, text: raw.text.trim().slice(0, 1800) })
  }
  return messages.slice(-24)
}
function fallback(body: TutorRequest) {
  const priority = String((body.intelligence?.priority as { label?: unknown } | undefined)?.label ?? "your highest-priority weakness")
  if (body.mode === "challenge") return `Start with ${priority}. Explain your first assumption aloud, then try to disprove it with a counterexample or limiting case before you continue.`
  if (body.mode === "plan") return `Prioritise ${priority}. Do one focused practice task, one short retest or transfer task, then finish with a reflection on exactly what changed in your reasoning.`
  if (body.mode === "review") return `Review ${priority} first. Identify the repeated error pattern, the evidence that shows it is recurring, and one specific behaviour you will use to catch it earlier next time.`
  if (body.mode === "explain") return `Work from the core principle behind ${priority}, connect it to one concrete example, then test your understanding by explaining the idea back without relying on memorised wording.`
  return `Focus first on ${priority}. Do one active practice task, then write down the exact point where your reasoning changed or became uncertain. Use that evidence to decide the next task rather than doing more random questions.`
}
function modeInstruction(mode: TutorMode) {
  if (mode === "challenge") return "Run this like a demanding Oxbridge tutorial: challenge assumptions, introduce a counterexample or new constraint, and make the student adapt their reasoning. Do not simply reveal the polished answer."
  if (mode === "explain") return "Teach the idea clearly in short chunks, use one concrete example, then ask the student to apply or explain it back. Keep the explanation concise enough that the student still has to think."
  if (mode === "plan") return "Act as a preparation planner. Give a prioritised sequence of at most three actions tied to evidence, available tasks and recurring weaknesses. Explain why each action is next."
  if (mode === "review") return "Act as a performance reviewer. Identify patterns across evidence, distinguish one-off errors from recurring academic behaviours, and prescribe one measurable next intervention."
  return "Coach Socratically. Ask focused questions, give hints when useful, and help the student expose assumptions and reasoning steps before offering conclusions."
}

async function loadCloudContext(supabase: SupabaseServerClient, userId: string): Promise<CloudContext> {
  const [intelligence, plans, memories, mistakes, evidence, application, supercurricular, stateRows] = await Promise.all([
    supabase.from("student_intelligence").select("snapshot").eq("user_id", userId).maybeSingle(),
    supabase.from("tutor_plans").select("plan,plan_date,status,updated_at").eq("user_id", userId).order("updated_at", { ascending: false }).limit(4),
    supabase.from("memory_items").select("category,subject,content,confidence,updated_at").eq("user_id", userId).eq("is_active", true).order("updated_at", { ascending: false }).limit(12),
    supabase.from("mistake_events").select("domain,code,label,severity,evidence,created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(10),
    supabase.from("progress_evidence").select("domain,skill,state_from,state_to,score,evidence,created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(10),
    supabase.from("application_evidence").select("evidence_type,title,detail,metadata,updated_at").eq("user_id", userId).order("updated_at", { ascending: false }).limit(8),
    supabase.from("supercurricular_items").select("item_type,title,reflection,tutor_questions,updated_at").eq("user_id", userId).order("updated_at", { ascending: false }).limit(8),
    supabase.from("user_state").select("state_key,state_value").eq("user_id", userId).in("state_key", [CHAT_STATE_KEY, REFLECTION_STATE_KEY]),
  ])
  const state = new Map((stateRows.data ?? []).map(row => [row.state_key, row.state_value]))
  const chatState = state.get(CHAT_STATE_KEY) as { messages?: unknown } | undefined
  const reflectionState = state.get(REFLECTION_STATE_KEY) as { reflection?: unknown } | undefined
  return { intelligence: intelligence.data?.snapshot ?? {}, plans: plans.data ?? [], memories: memories.data ?? [], mistakes: mistakes.data ?? [], evidence: evidence.data ?? [], application: application.data ?? [], supercurricular: supercurricular.data ?? [], chat: cleanConversation(chatState?.messages), reflection: typeof reflectionState?.reflection === "string" ? reflectionState.reflection.slice(0, 2500) : "" }
}

async function persistTutorState(supabase: SupabaseServerClient, userId: string, messages: ChatMessage[], reflection: string) {
  const now = new Date().toISOString()
  const rows: StateUpsert[] = [{ user_id: userId, state_key: CHAT_STATE_KEY, state_value: { messages: messages.slice(-24) }, updated_at: now }]
  if (reflection.trim()) rows.push({ user_id: userId, state_key: REFLECTION_STATE_KEY, state_value: { reflection: reflection.trim().slice(0, 2500) }, updated_at: now })
  await supabase.from("user_state").upsert(rows, { onConflict: "user_id,state_key" })
}
function withTurn(history: ChatMessage[], question: string, reply: string): ChatMessage[] { return [...history, { role: "student", text: question }, { role: "tutor", text: reply }].slice(-24) as ChatMessage[] }

export async function POST(request: Request) {
  let body: TutorRequest
  try { body = await request.json() as TutorRequest } catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }) }
  const question = (body.question ?? "").trim().slice(0, 2500)
  if (!question) return NextResponse.json({ error: "Question is required" }, { status: 400 })
  const mode: TutorMode = TUTOR_MODES.includes(body.mode as TutorMode) ? body.mode as TutorMode : "coach"
  const local = fallback({ ...body, mode })
  const supabase = await createClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  const userId = typeof claimsData?.claims?.sub === "string" ? claimsData.claims.sub : null
  if (!userId) return NextResponse.json({ reply: local, provider: "local", authRequired: true, mode })

  const cloud = await loadCloudContext(supabase, userId)
  const requestConversation = cleanConversation(body.conversation)
  const recentConversation = cloud.chat.length ? cloud.chat : requestConversation
  const reflection = (body.reflection ?? cloud.reflection ?? "").trim().slice(0, 2500)
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    await persistTutorState(supabase, userId, withTurn(recentConversation, question, local), reflection)
    return NextResponse.json({ reply: local, provider: "local", mode, cloudContext: true })
  }

  const system = `${STUDENT_AI_SAFETY_POLICY}\n\nYou are the student's persistent Oxbridge preparation tutor. You receive evidence from their authenticated cloud preparation history. Use it to decide what is most useful next.

Tutor mode for this turn:
${modeInstruction(mode)}

Rules:
- Prioritise active reasoning and practice over long passive explanations.
- Tie advice to supplied academic evidence; do not invent marks, experiences, books, projects, weaknesses or application facts.
- Never predict whether the student will receive an Oxford or Cambridge offer and never turn practice scores into admissions probabilities.
- Treat stored memories as uncertain learning evidence, not as a licence to infer sensitive traits or private circumstances.
- Do not derive personality, mental state, health, disability or other sensitive characteristics from errors, writing style, study habits or conversation.
- Distinguish weak evidence from strong repeated academic patterns.
- When planning, give at most three actions in priority order and explain why each matters.
- When coaching a subject question, make the student's reasoning visible before giving a polished solution.
- Notice recurring mistake patterns, spaced retests, neglected subject areas and previous academic reflections.
- Use concise professional British English suitable for a secondary-school applicant.
- If there is little evidence, explicitly identify the baseline activity that would give the tutor useful academic information.
- End most coaching/challenge responses with one focused next question or action.`

  const compactCloud = JSON.stringify({ cloudIntelligence: cloud.intelligence, recentPlans: cloud.plans, activeMemories: cloud.memories, recentMistakes: cloud.mistakes, progressEvidence: cloud.evidence, applicationEvidence: cloud.application, supercurricular: cloud.supercurricular, latestReflection: reflection, clientFallbackContext: { profile: body.profile ?? {}, intelligence: body.intelligence ?? {}, todayPlan: body.plan ?? {} } }).slice(0, 20000)
  const conversation = recentConversation.slice(-10).map(item => `${item.role === "tutor" ? "Tutor" : "Student"}: ${item.text}`).join("\n")
  const user = `Authenticated student evidence:\n${compactCloud}\n\nRecent tutor conversation:\n${conversation || "None"}\n\nStudent asks:\n${question}`
  const model = process.env.GEMINI_MODEL || "gemini-3.8-flash"

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, { method: "POST", headers: { "x-goog-api-key": apiKey, "Content-Type": "application/json" }, body: JSON.stringify({ systemInstruction: { parts: [{ text: system }] }, contents: [{ role: "user", parts: [{ text: user }] }], generationConfig: { temperature: mode === "challenge" ? 0.5 : 0.3, maxOutputTokens: 900 } }), signal: AbortSignal.timeout(20000) })
    if (!response.ok) { await persistTutorState(supabase, userId, withTurn(recentConversation, question, local), reflection); return NextResponse.json({ reply: local, provider: "local", degraded: true, mode, cloudContext: true }) }
    const data = await response.json() as unknown
    const reply = extractText(data) || local
    await persistTutorState(supabase, userId, withTurn(recentConversation, question, reply), reflection)
    return NextResponse.json({ reply, provider: reply === local ? "local" : "gemini", mode, cloudContext: true })
  } catch {
    await persistTutorState(supabase, userId, withTurn(recentConversation, question, local), reflection)
    return NextResponse.json({ reply: local, provider: "local", degraded: true, mode, cloudContext: true })
  }
}

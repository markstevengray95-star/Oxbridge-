import { NextResponse } from "next/server"

export const runtime = "nodejs"

type TutorRequest = {
  question?: string
  profile?: Record<string, unknown>
  intelligence?: Record<string, unknown>
  plan?: Record<string, unknown>
  conversation?: Array<{ role?: string; text?: string }>
}

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

function fallback(body: TutorRequest) {
  const priority = String((body.intelligence?.priority as { label?: unknown } | undefined)?.label ?? "your highest-priority weakness")
  return `Focus first on ${priority}. Do one active practice task, then write down the exact point where your reasoning changed or became uncertain. Use that evidence to decide the next task rather than doing more random questions.`
}

export async function POST(request: Request) {
  let body: TutorRequest
  try { body = await request.json() as TutorRequest } catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }) }
  const question = (body.question ?? "").trim().slice(0, 2500)
  if (!question) return NextResponse.json({ error: "Question is required" }, { status: 400 })

  const local = fallback(body)
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return NextResponse.json({ reply: local, provider: "local" })

  const system = `You are the student's persistent Oxbridge preparation tutor. You receive a compact evidence-based preparation profile created from their actual practice history. Use it to decide what is most useful next.

Rules:
- Prioritise active practice over long explanations.
- Tie advice to the evidence supplied; do not invent marks, experiences or application facts.
- Never predict whether the student will receive an Oxford or Cambridge offer and never present practice scores as admissions probabilities.
- When the user asks what to do next, give at most three actions in priority order and explain why each matters.
- When the user asks a subject question, coach their reasoning first rather than immediately giving a polished model answer.
- Notice recurring mistake patterns, spaced retests and neglected areas.
- Use concise professional British English suitable for a secondary-school applicant.
- If there is little evidence, say what baseline activity would give the tutor useful information.
- Do not claim that a stored memory is certain if it is only a pattern inferred from practice.`

  const context = JSON.stringify({ profile: body.profile ?? {}, intelligence: body.intelligence ?? {}, todayPlan: body.plan ?? {} }).slice(0, 12000)
  const conversation = (body.conversation ?? []).slice(-6).map(item => `${item.role === "tutor" ? "Tutor" : "Student"}: ${(item.text ?? "").slice(0, 1200)}`).join("\n")
  const user = `Student evidence:\n${context}\n\nRecent tutor conversation:\n${conversation || "None"}\n\nStudent asks:\n${question}`
  const model = process.env.GEMINI_MODEL || "gemini-3.8-flash"

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: "POST",
      headers: { "x-goog-api-key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ systemInstruction: { parts: [{ text: system }] }, contents: [{ role: "user", parts: [{ text: user }] }], generationConfig: { temperature: 0.35, maxOutputTokens: 700 } }),
      signal: AbortSignal.timeout(18000),
    })
    if (!response.ok) return NextResponse.json({ reply: local, provider: "local", degraded: true })
    const data = await response.json() as unknown
    const reply = extractText(data) || local
    return NextResponse.json({ reply, provider: reply === local ? "local" : "gemini" })
  } catch {
    return NextResponse.json({ reply: local, provider: "local", degraded: true })
  }
}

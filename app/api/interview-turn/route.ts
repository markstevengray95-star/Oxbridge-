import { NextResponse } from "next/server"
import { STUDENT_AI_SAFETY_POLICY } from "@/lib/ai/student-safety"

export const runtime = "nodejs"

type InterviewTurn = { role: "interviewer" | "candidate"; text: string; speaker?: string }
type InterviewRequest = { course?: string; track?: string; difficulty?: string; persona?: string; mode?: string; question?: string; answer?: string; concepts?: string[]; turns?: InterviewTurn[]; interviewerRole?: string; otherInterviewer?: string; panelMode?: boolean; delivery?: string }

function localFollowUp(body: InterviewRequest) {
  const answer = (body.answer ?? "").trim(), lower = answer.toLowerCase(), words = answer ? answer.split(/\s+/).length : 0, persona = body.persona ?? "Socratic"
  const openings = persona === "Technical" ? ["Right — let's make that more precise.", "Okay. I want the exact step there.", "Let's pin that down."] : persona === "Evidence-led" ? ["Okay — what supports that?", "Right. Let's look at the evidence for that.", "I see the claim; now justify it."] : persona === "Sceptical" ? ["I'm not fully convinced yet.", "I can see the route you're taking.", "Perhaps — but I want to test that."] : ["Right.", "Okay.", "Mm — take that a little further."]
  const open = openings[Math.abs(words + answer.length) % openings.length]
  if (words < 28) return `${open} You've given me the conclusion. Can you talk me through the step that gets you there?`
  if (!/assum|suppos|given|if\s/i.test(lower)) return `${open} What are you assuming there, and what happens if that assumption is wrong?`
  if (!/however|alternative|counter|unless|could|depends/i.test(lower)) return `${open} What's the strongest alternative explanation or counterexample to what you've just said?`
  if (!/because|therefore|hence|implies|since/i.test(lower)) return `${open} What exactly links your evidence to that conclusion?`
  return `${open} Let's change one condition. Which part of your argument still works, and which part would you revise?`
}

function extractGeminiText(data: unknown) {
  if (!data || typeof data !== "object") return ""
  const candidates = (data as { candidates?: unknown }).candidates
  if (!Array.isArray(candidates)) return ""
  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== "object") continue
    const content = (candidate as { content?: unknown }).content
    if (!content || typeof content !== "object") continue
    const parts = (content as { parts?: unknown }).parts
    if (!Array.isArray(parts)) continue
    const text = parts.map(part => part && typeof part === "object" && typeof (part as { text?: unknown }).text === "string" ? String((part as { text?: string }).text) : "").join(" ").trim()
    if (text) return text
  }
  return ""
}

export async function POST(request: Request) {
  let body: InterviewRequest
  try { body = await request.json() as InterviewRequest } catch { return NextResponse.json({ error: "Invalid request body" }, { status: 400 }) }
  const answer = (body.answer ?? "").trim()
  if (!answer) return NextResponse.json({ error: "Candidate answer is required" }, { status: 400 })
  const fallback = localFollowUp(body)
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return NextResponse.json({ reply: fallback, provider: "local", configured: false })

  const recentTurns = Array.isArray(body.turns) ? body.turns.slice(-16) : []
  const panelInstructions = body.panelMode ? [
    `You are ${body.interviewerRole ?? "one member of a two-person academic interview panel"}.`,
    `The other interviewer is ${body.otherInterviewer ?? "another academic"}.`,
    "Behave like a genuinely different academic with your own angle. Continue the same conversation; do not reset the topic or repeat the other interviewer.",
    "You can briefly refer to something the candidate said to the other interviewer and test it from a new direction.",
    "The two interviewers should feel like colleagues in the same room, not two chatbot personas taking turns mechanically.",
  ] : []

  const systemPrompt = [
    STUDENT_AI_SAFETY_POLICY,
    "You are conducting a realistic Oxford/Cambridge-style academic practice interview for a secondary-school applicant.",
    ...panelInstructions,
    "Sound like a real academic speaking naturally in a tutorial room, not like an AI tutor, marking rubric, examiner report or scripted assessment.",
    "Ask exactly one substantive follow-up question per turn.",
    "You may begin with a very short natural reaction such as 'Right', 'Okay', 'Mm', 'I see', or a brief reference to the candidate's point, but do not use a reaction every turn and do not repeat the same phrase.",
    "Do not routinely give explicit feedback before every question. Real interviews often move directly into the next challenge.",
    "Keep most turns to 12-45 spoken words. Occasionally a slightly longer setup is appropriate when introducing new information.",
    "Use contractions and natural spoken British English where appropriate. Vary sentence length and rhythm. Avoid stock phrases such as 'Your reasoning is becoming clearer'.",
    "Do not praise generically. If you acknowledge something, make it specific and brief.",
    "Do not reveal a model answer or full solution. Help the candidate think by changing a condition, asking for justification, requesting a limiting case, counterexample, estimate, diagram, calculation, definition or transfer step.",
    "If the candidate changes their mind for a defensible reason, notice it naturally and ask what caused the revision.",
    "If the candidate is stuck, give one small conceptual nudge and then a smaller question rather than solving it.",
    `Course: ${body.course ?? "unspecified"}. Subject family: ${body.track ?? "unspecified"}. Difficulty: ${body.difficulty ?? "Stretch"}.`,
    `Interviewer persona: ${body.persona ?? "Socratic"}. Session mode: ${body.mode ?? "Realistic"}. Voice delivery: ${body.delivery ?? "natural"}.`,
    `Potentially relevant concepts: ${(body.concepts ?? []).slice(0, 8).join(", ") || "course-specific reasoning"}.`,
  ].join("\n")

  const conversation = recentTurns.map(turn => `${turn.speaker || (turn.role === "interviewer" ? "Interviewer" : "Candidate")}: ${turn.text}`).join("\n")
  const userPrompt = `Current question: ${body.question ?? "Continue the academic discussion."}\n\nRecent conversation:\n${conversation || "No earlier turns."}\n\nCandidate's latest answer:\n${answer}\n\nContinue the conversation naturally with exactly one follow-up question.`
  const model = process.env.GEMINI_MODEL || "gemini-3.8-flash"

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, { method: "POST", headers: { "x-goog-api-key": apiKey, "Content-Type": "application/json" }, body: JSON.stringify({ systemInstruction: { parts: [{ text: systemPrompt }] }, contents: [{ role: "user", parts: [{ text: userPrompt }] }], generationConfig: { maxOutputTokens: 180, temperature: 0.86, topP: 0.94 } }), signal: AbortSignal.timeout(15000) })
    if (!response.ok) { const detail = await response.text().catch(() => ""); console.error("Gemini interview request failed", response.status, detail.slice(0, 500)); return NextResponse.json({ reply: fallback, provider: "local", configured: true, degraded: true }) }
    const data = await response.json() as unknown
    const reply = extractGeminiText(data) || fallback
    return NextResponse.json({ reply, provider: reply === fallback ? "local" : "gemini", configured: true })
  } catch (error) {
    console.error("Gemini interview request error", error)
    return NextResponse.json({ reply: fallback, provider: "local", configured: true, degraded: true })
  }
}

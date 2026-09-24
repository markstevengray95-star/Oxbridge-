import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getGeminiApiKeyCandidates } from "@/lib/gemini/api-key"

export const runtime = "nodejs"

type FeedbackRequest = {
  test?: string
  section?: string
  difficulty?: string
  prompt?: string
  options?: string[]
  selectedAnswer?: string
  correctAnswer?: string
  explanation?: string
  correct?: boolean
}

async function loadStudentContext() {
  try {
    const supabase = await createClient()
    const { data: claimsData } = await supabase.auth.getClaims()
    const userId = typeof claimsData?.claims?.sub === "string" ? claimsData.claims.sub : null
    if (!userId) return "No saved learner history is available."

    const [intelligence, memories] = await Promise.all([
      supabase.from("student_intelligence").select("snapshot").eq("user_id", userId).maybeSingle(),
      supabase.from("memory_items").select("category,content,confidence").eq("user_id", userId).eq("is_active", true).order("updated_at", { ascending: false }).limit(8),
    ])
    const snapshot = intelligence.data?.snapshot ?? {}
    const memoryLines = (memories.data ?? []).map(item => `${item.category}: ${item.content}`).join("\n")
    return `Student intelligence: ${JSON.stringify(snapshot).slice(0, 7000)}\nRecent learning memory:\n${memoryLines.slice(0, 2500)}`
  } catch {
    return "No saved learner history is available."
  }
}

function fallback(body: FeedbackRequest) {
  const correct = Boolean(body.correct)
  return {
    headline: correct ? "Correct — now make the reasoning reusable" : "Use this error as a diagnostic clue",
    personalisedFeedback: correct
      ? `You selected the correct answer in ${body.section || "this section"}. Do not stop at recognition: identify the decisive step in the explanation so you can reproduce it on a less familiar version.`
      : `Your choice was not the best answer. Compare it directly with the correct option and identify the first point where your reasoning diverged; that is more useful than memorising the final answer.`,
    whyThisChoice: correct ? "Your answer is consistent with the key reasoning described in the explanation." : "The selected option is attractive because it matches part of the problem, but it misses or misapplies the decisive condition captured by the correct answer.",
    patternConnection: "This attempt will become more useful when you connect it to a recurring pattern such as interpretation, assumptions, calculation setup, timing or distractor selection.",
    nextStep: correct ? "Explain the answer aloud without looking at the options, then change one condition and predict what would happen." : "Rework the problem from the stem only, state the rule or inference you need, and then eliminate each distractor for a specific reason.",
    miniChallenge: `Without using the answer choices, write one sentence explaining why “${body.correctAnswer || "the correct answer"}” follows from the information given.`,
  }
}

function extractText(data: unknown) {
  if (!data || typeof data !== "object") return ""
  const candidates = (data as { candidates?: unknown }).candidates
  if (!Array.isArray(candidates)) return ""
  for (const candidate of candidates) {
    const parts = candidate && typeof candidate === "object" ? (candidate as { content?: { parts?: unknown[] } }).content?.parts ?? [] : []
    const text = parts.map(part => part && typeof part === "object" && typeof (part as { text?: unknown }).text === "string" ? String((part as { text?: string }).text) : "").join("").trim()
    if (text) return text
  }
  return ""
}

export async function POST(request: Request) {
  let body: FeedbackRequest
  try { body = await request.json() as FeedbackRequest } catch { return NextResponse.json({ error: "Invalid request body" }, { status: 400 }) }
  if (!body.prompt || !body.correctAnswer) return NextResponse.json({ error: "Question and answer data are required." }, { status: 400 })

  const local = fallback(body)
  const key = getGeminiApiKeyCandidates()[0]?.value
  if (!key) return NextResponse.json({ feedback: local, provider: "local" })

  const studentContext = await loadStudentContext()
  const system = `You are a rigorous Oxbridge admissions-test tutor. Give feedback on ONE practice question. Personalise it using the student's saved learning history when relevant, but never invent a pattern that is not evidenced. Do not predict admissions outcomes or fabricate official scaled scores. Return ONLY valid JSON with exactly: {"headline":string,"personalisedFeedback":string,"whyThisChoice":string,"patternConnection":string,"nextStep":string,"miniChallenge":string}. Be specific to the actual question and selected answer. If the student is correct, explain what reasoning should be retained and how to transfer it. If incorrect, identify the likely reasoning fork or distractor trap, connect it to any evidenced recurring weakness, and give one concrete repair action. Keep each field concise but substantive.`
  const user = `Test: ${body.test || "Unknown"}\nSection: ${body.section || "Unknown"}\nDifficulty: ${body.difficulty || "Unknown"}\nQuestion: ${body.prompt}\nOptions: ${(body.options ?? []).join(" | ")}\nStudent answer: ${body.selectedAnswer || "Unanswered"}\nCorrect answer: ${body.correctAnswer}\nCorrect: ${Boolean(body.correct)}\nExisting explanation: ${body.explanation || "None"}\n\nSaved learner context:\n${studentContext}`
  const model = process.env.GEMINI_MODEL || "gemini-3.8-flash"

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: "POST",
      headers: { "x-goog-api-key": key, "Content-Type": "application/json" },
      body: JSON.stringify({ systemInstruction: { parts: [{ text: system }] }, contents: [{ role: "user", parts: [{ text: user }] }], generationConfig: { temperature: 0.25, maxOutputTokens: 1200, responseMimeType: "application/json" } }),
      signal: AbortSignal.timeout(18000),
    })
    if (!response.ok) return NextResponse.json({ feedback: local, provider: "local", degraded: true })
    const raw = extractText(await response.json()).replace(/^```json\s*/i, "").replace(/```$/i, "").trim()
    const parsed = JSON.parse(raw) as Record<string, unknown>
    const valid = ["headline","personalisedFeedback","whyThisChoice","patternConnection","nextStep","miniChallenge"].every(keyName => typeof parsed[keyName] === "string")
    return NextResponse.json({ feedback: valid ? parsed : local, provider: valid ? "gemini" : "local", degraded: !valid })
  } catch {
    return NextResponse.json({ feedback: local, provider: "local", degraded: true })
  }
}

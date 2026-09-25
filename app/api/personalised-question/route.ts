import { NextResponse } from "next/server"
import { getGeminiApiKeyCandidates } from "@/lib/gemini/api-key"
import { STUDENT_AI_SAFETY_POLICY } from "@/lib/ai/student-safety"

export const runtime = "nodejs"

type RequestBody = { mode?: "generate" | "evaluate"; course?: string; difficulty?: string; weaknesses?: string[]; question?: string; answer?: string; supportLevel?: string }

function parseJson(text: string) {
  const cleaned = text.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim()
  try { return JSON.parse(cleaned) as Record<string, unknown> } catch { return null }
}
function extractText(data: unknown) {
  if (!data || typeof data !== "object") return ""
  const candidates = (data as { candidates?: unknown }).candidates
  if (!Array.isArray(candidates)) return ""
  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== "object") continue
    const parts = (candidate as { content?: { parts?: unknown[] } }).content?.parts ?? []
    const text = parts.map(part => part && typeof part === "object" && typeof (part as { text?: unknown }).text === "string" ? String((part as { text?: string }).text) : "").join("").trim()
    if (text) return text
  }
  return ""
}
function fallback(body: RequestBody) {
  const target = body.weaknesses?.[0] || "making the reasoning chain explicit"
  const course = body.course || "your course"
  const difficulty = body.difficulty || "Stretch"
  if (body.mode === "evaluate") {
    const words = (body.answer || "").trim().split(/\s+/).filter(Boolean).length
    const score = Math.max(35, Math.min(82, 38 + Math.min(24, words / 3) + (/because|therefore|if|however|assumption/i.test(body.answer || "") ? 18 : 0)))
    return { score: Math.round(score), whatWorked: words > 35 ? "You developed an answer rather than stopping at a conclusion." : "You committed to an answer and created something that can be tested.", missed: `Make the reasoning around ${target} more explicit and test one alternative.`, transferScore: Math.max(30, Math.round(score - 5)), nextQuestion: "What would have to change for your conclusion to stop being true?", hintLevelSuggestion: score >= 70 ? "independent" : score >= 55 ? "light" : "substantial" }
  }
  return { question: `${difficulty} ${course} challenge: take a familiar principle from your subject and apply it to an unfamiliar case. State your first model, identify one assumption, and explain what evidence would make you revise it.`, successCriteria: ["Make the reasoning chain visible", `Deliberately practise ${target}`, "Test an assumption or limiting case", "Finish with a provisional conclusion"], transferTwist: "Now change one important condition and explain which parts of your original reasoning survive.", targetSkill: target }
}

export async function POST(request: Request) {
  let body: RequestBody
  try { body = await request.json() as RequestBody } catch { return NextResponse.json({ error: "Invalid request body" }, { status: 400 }) }
  const mode = body.mode === "evaluate" ? "evaluate" : "generate"
  const fallbackResult = fallback({ ...body, mode })
  const keys = getGeminiApiKeyCandidates()
  if (!keys.length) return NextResponse.json({ result: fallbackResult, provider: "local" })

  const taskInstruction = mode === "generate"
    ? `You are an Oxbridge preparation tutor. Generate ONE original, copyright-safe academic reasoning challenge for the named course and difficulty. It must specifically train the supplied weaknesses without saying it is an official university question. Return only JSON: {"question":string,"successCriteria":string[],"transferTwist":string,"targetSkill":string}. The transfer twist must test the same reasoning habit in a changed context.`
    : `You are an Oxbridge preparation tutor evaluating a student's response to an original practice question. Do not predict admissions outcomes or claim an official score. Return only JSON: {"score":number,"whatWorked":string,"missed":string,"transferScore":number,"nextQuestion":string,"hintLevelSuggestion":"independent"|"clarification"|"light"|"substantial"|"worked"}. Reward explicit reasoning, assumptions, testing alternatives, precision and adaptability. Score and transferScore are practice signals from 0-100.`
  const system = `${STUDENT_AI_SAFETY_POLICY}\n\n${taskInstruction}`
  const user = mode === "generate"
    ? `Course: ${body.course || "unspecified"}\nDifficulty: ${body.difficulty || "Stretch"}\nWeaknesses: ${(body.weaknesses || []).slice(0, 5).join("; ") || "no previous evidence"}`
    : `Course: ${body.course || "unspecified"}\nDifficulty: ${body.difficulty || "Stretch"}\nTarget weaknesses: ${(body.weaknesses || []).slice(0, 5).join("; ")}\nSupport used: ${body.supportLevel || "independent"}\nQuestion: ${(body.question || "").slice(0, 3500)}\nStudent answer: ${(body.answer || "").slice(0, 7000)}`
  const model = process.env.GEMINI_MODEL || "gemini-3.8-flash"

  for (const candidate of keys) {
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, { method: "POST", headers: { "x-goog-api-key": candidate.value, "Content-Type": "application/json" }, body: JSON.stringify({ systemInstruction: { parts: [{ text: system }] }, contents: [{ role: "user", parts: [{ text: user }] }], generationConfig: { temperature: mode === "generate" ? 0.7 : 0.2, maxOutputTokens: 1800, responseMimeType: "application/json" } }), signal: AbortSignal.timeout(20000) })
      if (!response.ok) continue
      const parsed = parseJson(extractText(await response.json() as unknown))
      if (parsed) return NextResponse.json({ result: parsed, provider: "gemini" })
    } catch { /* try next credential */ }
  }
  return NextResponse.json({ result: fallbackResult, provider: "local", degraded: true })
}

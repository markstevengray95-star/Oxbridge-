import { NextResponse } from "next/server"
import { analyseInterviewAnswer } from "@/lib/feedback-engine"
import { STUDENT_AI_SAFETY_POLICY } from "@/lib/ai/student-safety"

export const runtime = "nodejs"

type Exchange = { question?: string; answer?: string }
type RequestBody = { course?: string; sessionTitle?: string; exchanges?: Exchange[] }
type StructuredAnswer = { index: number; question: string; answer: string; score: number; strengths: string[]; improvements: string[]; dimensions: Array<{ label: string; score: number; evidence: string; action: string }>; nextMove: string; dominantTarget: string }
type StructuredSession = { overallSummary: string; recurringStrengths: string[]; recurringWeaknesses: string[]; priorityTarget: string; nextInterviewPlan: string[]; answers: StructuredAnswer[] }

function localAnalysis(exchanges: Exchange[]): StructuredSession {
  const answers = exchanges.map((exchange, index) => { const answer = (exchange.answer ?? "").trim(); const feedback = analyseInterviewAnswer(answer); return { index, question: (exchange.question ?? "Interview question").trim(), answer, ...feedback } })
  const targetCounts = new Map<string, number>(), strengthCounts = new Map<string, number>()
  for (const item of answers) { targetCounts.set(item.dominantTarget, (targetCounts.get(item.dominantTarget) ?? 0) + 1); item.strengths.forEach(strength => strengthCounts.set(strength, (strengthCounts.get(strength) ?? 0) + 1)) }
  const recurringWeaknesses = [...targetCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([label]) => label)
  const recurringStrengths = [...strengthCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([label]) => label)
  const average = answers.length ? Math.round(answers.reduce((sum, item) => sum + item.score, 0) / answers.length) : 0
  return { overallSummary: `Across ${answers.length} answer${answers.length === 1 ? "" : "s"}, the current practice profile averages ${average}/100. The review focuses on visible academic reasoning behaviour rather than admissions prediction.`, recurringStrengths: recurringStrengths.length ? recurringStrengths : ["You stayed engaged with the questions and produced analysable reasoning."], recurringWeaknesses: recurringWeaknesses.length ? recurringWeaknesses : ["Make more of the reasoning chain explicit."], priorityTarget: recurringWeaknesses[0] ?? "Reasoning chain", nextInterviewPlan: ["Answer the first question by stating the key observation and governing principle before concluding.", "Name one assumption explicitly and test what happens if it changes.", "Use one counterexample, limiting case or discriminating piece of evidence before finalising the answer."], answers }
}
function extractText(data: unknown) {
  if (!data || typeof data !== "object") return ""
  const candidates = (data as { candidates?: unknown }).candidates
  if (!Array.isArray(candidates)) return ""
  for (const candidate of candidates) { if (!candidate || typeof candidate !== "object") continue; const parts = ((candidate as { content?: { parts?: unknown[] } }).content?.parts ?? []); const text = parts.map(part => part && typeof part === "object" && typeof (part as { text?: unknown }).text === "string" ? String((part as { text?: string }).text) : "").join("").trim(); if (text) return text }
  return ""
}
function parseJson(raw: string) { const cleaned = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim(); try { return JSON.parse(cleaned) as StructuredSession } catch { return null } }

export async function POST(request: Request) {
  let body: RequestBody
  try { body = await request.json() as RequestBody } catch { return NextResponse.json({ error: "Invalid request body" }, { status: 400 }) }
  const exchanges = (Array.isArray(body.exchanges) ? body.exchanges : []).map(item => ({ question: (item.question ?? "").slice(0, 1800), answer: (item.answer ?? "").slice(0, 5000) })).filter(item => item.answer.trim()).slice(0, 16)
  if (!exchanges.length) return NextResponse.json({ error: "At least one interview answer is required" }, { status: 400 })
  const fallback = localAnalysis(exchanges)
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return NextResponse.json({ analysis: fallback, provider: "local", configured: false })

  const transcript = exchanges.map((item, index) => `Exchange ${index + 1}\nQuestion: ${item.question || "Interview question"}\nAnswer: ${item.answer}`).join("\n\n")
  const system = `${STUDENT_AI_SAFETY_POLICY}\n\nYou are an Oxford/Cambridge interview-practice coach analysing a secondary-school applicant's answers. Do not predict admissions outcomes and do not pretend to use an official university scoring rubric. Analyse only observable academic reasoning in the supplied answers. Never infer health, disability, personality, emotion, background or other sensitive traits from communication style. Be specific, evidence-based, demanding and constructive. Return ONLY valid JSON with this exact shape: {"overallSummary":string,"recurringStrengths":string[],"recurringWeaknesses":string[],"priorityTarget":string,"nextInterviewPlan":string[],"answers":[{"index":number,"question":string,"answer":string,"score":number,"strengths":string[],"improvements":string[],"dimensions":[{"label":string,"score":number,"evidence":string,"action":string}],"nextMove":string,"dominantTarget":string}]}. Each answer score is a practice signal 0-100. Use these academic dimensions where relevant: reasoning chain, subject/relevance, assumptions, evidence/testing alternatives, precision, adaptability and communication. Quote or closely reference specific reasoning moves from the candidate, but keep quotations short. Give 2-3 strengths and 2-3 improvements per answer. Analyse every supplied answer. Question and answer fields must be copied from the supplied exchanges.`
  const user = `Course: ${(body.course ?? "unspecified").slice(0, 120)}\nSession: ${(body.sessionTitle ?? "Interview practice").slice(0, 200)}\n\n${transcript}`
  const model = process.env.GEMINI_MODEL || "gemini-3.8-flash"

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, { method: "POST", headers: { "x-goog-api-key": apiKey, "Content-Type": "application/json" }, body: JSON.stringify({ systemInstruction: { parts: [{ text: system }] }, contents: [{ role: "user", parts: [{ text: user }] }], generationConfig: { temperature: 0.25, maxOutputTokens: 5000, responseMimeType: "application/json" } }), signal: AbortSignal.timeout(22000) })
    if (!response.ok) return NextResponse.json({ analysis: fallback, provider: "local", configured: true, degraded: true })
    const parsed = parseJson(extractText(await response.json() as unknown))
    if (!parsed || !Array.isArray(parsed.answers)) return NextResponse.json({ analysis: fallback, provider: "local", configured: true, degraded: true })
    return NextResponse.json({ analysis: parsed, provider: "gemini", configured: true })
  } catch { return NextResponse.json({ analysis: fallback, provider: "local", configured: true, degraded: true }) }
}

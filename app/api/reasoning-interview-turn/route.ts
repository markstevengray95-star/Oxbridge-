import { NextResponse } from "next/server"
import { STUDENT_AI_SAFETY_POLICY } from "@/lib/ai/student-safety"
import { evaluateInterviewAnswerLocally, type InterviewAnswerClassification, type InterviewAnswerIssue } from "@/lib/interview-answer-quality"
import { selectInterviewTreeNode, type InterviewTreeNodeId } from "@/lib/interview-question-tree"
import { getGeminiApiKeyCandidates } from "@/lib/gemini/api-key"
import { realisticInterviewQuestions } from "@/lib/realistic-interview-bank"
import { interviewQuestions, type TrackId } from "@/lib/oxbridge-data"

export const runtime = "nodejs"

type Turn = { role: "interviewer" | "candidate"; text: string }

type RequestBody = {
  question?: string
  questionId?: string
  answer?: string
  course?: string
  track?: TrackId | string
  difficulty?: string
  concepts?: string[]
  referenceAnswer?: string
  probes?: string[]
  turns?: Turn[]
  previousNodeIds?: InterviewTreeNodeId[]
}

type GeminiReply = {
  reply?: string
}

function clean(text: string | undefined, max = 4000) {
  return (text ?? "").replace(/\s+/g, " ").trim().slice(0, max)
}

function canonicalQuestion(questionId?: string, prompt?: string) {
  const bank = [...realisticInterviewQuestions, ...interviewQuestions]
  if (questionId) {
    const byId = bank.find(item => item.id === questionId)
    if (byId) return byId
  }
  const normal = clean(prompt).toLowerCase()
  return bank.find(item => clean(item.prompt).toLowerCase() === normal)
}

function previousAnswers(turns: Turn[]) {
  return turns.filter(turn => turn.role === "candidate").map(turn => clean(turn.text, 2500)).filter(Boolean).slice(-6)
}

function parseJson(text: string): GeminiReply | null {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "")
  const start = cleaned.indexOf("{")
  const end = cleaned.lastIndexOf("}")
  if (start < 0 || end <= start) return null
  try {
    const parsed = JSON.parse(cleaned.slice(start, end + 1)) as GeminiReply
    const reply = clean(parsed.reply, 900)
    return reply ? { reply } : null
  } catch {
    return null
  }
}

function extractGeminiText(data: unknown) {
  if (!data || typeof data !== "object") return ""
  const candidates = (data as { candidates?: unknown }).candidates
  if (!Array.isArray(candidates)) return ""
  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== "object") continue
    const content = (candidate as { content?: { parts?: unknown[] } }).content
    if (!Array.isArray(content?.parts)) continue
    const text = content.parts.map(part => part && typeof part === "object" && typeof (part as { text?: unknown }).text === "string" ? String((part as { text?: string }).text) : "").join(" ").trim()
    if (text) return text
  }
  return ""
}

async function cloudFollowUp(key: string, input: {
  course: string
  track: string
  difficulty: string
  originalQuestion: string
  currentQuestion: string
  candidateAnswer: string
  classification: InterviewAnswerClassification
  issue: InterviewAnswerIssue
  branchLabel: string
  branchIntent: string
  branchPrompt: string
  recentTurns: Turn[]
}) {
  const model = process.env.GEMINI_MODEL || "gemini-3.8-flash"
  const transcript = input.recentTurns.slice(-12).map(turn => `${turn.role === "candidate" ? "Candidate" : "Interviewer"}: ${clean(turn.text, 800)}`).join("\n")
  const instruction = [
    STUDENT_AI_SAFETY_POLICY,
    "You are conducting an academically demanding Oxford/Cambridge-style practice interview.",
    "This is practice, not an admissions prediction or official university scoring system.",
    "Stay on the SAME underlying problem unless the branch explicitly asks for transfer.",
    "Ask exactly ONE follow-up question. Do not answer the problem for the candidate.",
    "Do not praise automatically. Do not use generic coaching filler. Do not reveal a full solution.",
    "The selected branch is binding: preserve its intellectual purpose, but rewrite naturally so it fits the candidate's actual answer and subject.",
    `Course: ${input.course || "unspecified"}. Track: ${input.track || "unspecified"}. Starting difficulty: ${input.difficulty || "Stretch"}.`,
    `Original problem: ${input.originalQuestion}`,
    `Current interviewer question: ${input.currentQuestion}`,
    `Latest candidate answer: ${input.candidateAnswer}`,
    `Local diagnostic: ${input.classification}${input.issue !== "none" ? ` / ${input.issue}` : ""}.`,
    `Question-tree branch: ${input.branchLabel}. Intent: ${input.branchIntent}`,
    `Required branch prompt: ${input.branchPrompt}`,
    transcript ? `Recent transcript:\n${transcript}` : "",
    "Return JSON only: {\"reply\":\"one concise interviewer follow-up\"}.",
  ].filter(Boolean).join("\n\n")

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: "POST",
    headers: { "x-goog-api-key": key, "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: instruction }] }],
      generationConfig: { temperature: 0.45, maxOutputTokens: 350, responseMimeType: "application/json" },
    }),
    signal: AbortSignal.timeout(15000),
  })
  if (!response.ok) return ""
  const parsed = parseJson(extractGeminiText(await response.json() as unknown))
  return parsed?.reply ?? ""
}

export async function POST(request: Request) {
  let body: RequestBody
  try {
    body = await request.json() as RequestBody
  } catch {
    return NextResponse.json({ error: "Invalid interview request." }, { status: 400 })
  }

  const answer = clean(body.answer, 5000)
  if (!answer) return NextResponse.json({ error: "Candidate answer is required." }, { status: 400 })

  const canonical = canonicalQuestion(body.questionId, body.question)
  const question = clean(body.question || canonical?.prompt, 2500)
  if (!question) return NextResponse.json({ error: "Interview question is required." }, { status: 400 })

  const turns = Array.isArray(body.turns) ? body.turns.filter(turn => turn && (turn.role === "candidate" || turn.role === "interviewer") && clean(turn.text)).slice(-24) : []
  const historyAnswers = previousAnswers(turns)
  if (historyAnswers.length && historyAnswers[historyAnswers.length - 1].toLowerCase() === answer.toLowerCase()) historyAnswers.pop()
  const concepts = Array.isArray(body.concepts) && body.concepts.length ? body.concepts.filter(Boolean).slice(0, 16) : canonical?.concepts ?? []
  const referenceAnswer = clean(body.referenceAnswer || canonical?.strongAnswer, 3000) || undefined
  const probes = Array.isArray(body.probes) && body.probes.length ? body.probes.filter(Boolean).slice(0, 14) : canonical?.probes ?? []

  const local = evaluateInterviewAnswerLocally({ question, answer, concepts, referenceAnswer, previousAnswers: historyAnswers })
  const candidateTurnCount = Math.max(1, turns.filter(turn => turn.role === "candidate").length)
  const node = selectInterviewTreeNode({
    track: body.track,
    question,
    answer,
    classification: local.classification,
    issue: local.issue,
    directness: local.directness,
    repairDepth: local.repairDepth,
    candidateTurnCount,
    previousNodeIds: Array.isArray(body.previousNodeIds) ? body.previousNodeIds.slice(-30) : [],
    probes,
  })

  let reply = node.prompt
  let provider: "local" | "gemini" = "local"
  const keys = getGeminiApiKeyCandidates()
  for (const key of keys) {
    try {
      const cloud = await cloudFollowUp(key.value, {
        course: clean(body.course, 120),
        track: clean(body.track, 80),
        difficulty: clean(body.difficulty, 60),
        originalQuestion: canonical?.prompt || question,
        currentQuestion: question,
        candidateAnswer: answer,
        classification: local.classification,
        issue: local.issue,
        branchLabel: node.label,
        branchIntent: node.intent,
        branchPrompt: node.prompt,
        recentTurns: turns,
      })
      if (cloud) {
        reply = cloud
        provider = "gemini"
        break
      }
    } catch {
      // Use deterministic branch prompt if the configured model is temporarily unavailable.
    }
  }

  return NextResponse.json({
    reply,
    classification: local.classification,
    issue: local.issue,
    directness: local.directness,
    repairDepth: local.repairDepth,
    branch: node,
    provider,
    branchCount: 22,
  }, { headers: { "Cache-Control": "no-store" } })
}

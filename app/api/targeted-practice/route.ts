import { NextResponse } from "next/server"
import { STUDENT_AI_SAFETY_POLICY } from "@/lib/ai/student-safety"
import { getGeminiApiKeyCandidates } from "@/lib/gemini/api-key"
import { localPracticePrompt, type TargetedPracticeQuestion, type TargetedPracticeTarget } from "@/lib/feedback-practice"

export const runtime = "nodejs"

type RequestBody = {
  mode?: "generate" | "mark"
  target?: TargetedPracticeTarget
  round?: number
  question?: TargetedPracticeQuestion
  answer?: string
}

type GeneratedQuestion = {
  prompt?: string
  contextShift?: string
  successCriteria?: string[]
}

type MarkedAttempt = {
  classification?: "needs-repair" | "developing" | "secure"
  feedback?: string
  nextStep?: string
}

function clean(value: string | undefined, max = 3000) {
  return (value ?? "").replace(/\s+/g, " ").trim().slice(0, max)
}

function validTarget(value: TargetedPracticeTarget | undefined): value is TargetedPracticeTarget {
  return Boolean(value && clean(value.id, 160) && clean(value.skill, 160) && clean(value.practiceSeed, 1600))
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

function parseJson<T>(text: string): T | null {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "")
  const start = cleaned.indexOf("{")
  const end = cleaned.lastIndexOf("}")
  if (start < 0 || end <= start) return null
  try {
    return JSON.parse(cleaned.slice(start, end + 1)) as T
  } catch {
    return null
  }
}

async function generateJson<T>(key: string, prompt: string, maxOutputTokens = 900): Promise<T | null> {
  const model = process.env.GEMINI_MODEL || "gemini-3.8-flash"
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: "POST",
    headers: { "x-goog-api-key": key, "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { temperature: 0.35, maxOutputTokens, responseMimeType: "application/json" } }),
    signal: AbortSignal.timeout(15000),
  })
  if (!response.ok) return null
  return parseJson<T>(extractGeminiText(await response.json() as unknown))
}

function generationPrompt(target: TargetedPracticeTarget, round: number) {
  return [
    STUDENT_AI_SAFETY_POLICY,
    "Create ONE fresh Oxbridge-preparation practice question that targets the same underlying reasoning weakness but changes the surface context substantially.",
    "Do not reproduce the original question, numbers, names, wording, answer choices or distinctive scenario.",
    "The task should require reasoning, not recall, and it should be answerable without specialist knowledge beyond the named subject/test context.",
    "For interview-derived practice, write an open academic reasoning question. For exam-derived practice, still use a short free-response reasoning task so the learner must expose the method rather than guess an option.",
    `Round ${round}: ${round <= 1 ? "near transfer in a new context" : round === 2 ? "change an important condition and require adaptation" : "far transfer: make the surface topic noticeably different while preserving the skill"}.`,
    `Source: ${target.source}. Skill: ${target.skill}.`,
    target.course ? `Course: ${target.course}.` : "",
    target.track ? `Track: ${target.track}.` : "",
    target.test ? `Admissions test family: ${target.test}. Section: ${target.section || "general"}.` : "",
    `Weakness to practise: ${target.weakness}`,
    `Practice design instruction: ${target.practiceSeed}`,
    target.originalQuestion ? `Original question (DO NOT copy): ${target.originalQuestion}` : "",
    "Return JSON only: {\"prompt\":\"fresh question\",\"contextShift\":\"brief description of how the context changed\",\"successCriteria\":[\"criterion 1\",\"criterion 2\",\"criterion 3\"]}.",
  ].filter(Boolean).join("\n\n")
}

function localMark(question: TargetedPracticeQuestion, answer: string) {
  const words = answer.trim().split(/\s+/).filter(Boolean).length
  const reasoning = /\b(?:because|therefore|since|hence|if|then|implies?|which means|leads to|assuming|given)\b/i.test(answer)
  const check = /\b(?:check|test|evidence|counterexample|assumption|measure|compare|limit|edge|unit|alternative|condition)\b/i.test(answer) || /[=<>≤≥√π²³×÷+\-*/%\d]/.test(answer)
  const direct = words >= 8
  const secure = direct && reasoning && check && words >= 24
  const developing = direct && (reasoning || check)
  return {
    classification: secure ? "secure" as const : developing ? "developing" as const : "needs-repair" as const,
    feedback: secure
      ? `Your response shows the target ${question.skill.toLowerCase()} skill through an explicit reasoning chain and at least one deliberate check.`
      : developing
        ? `There is a usable line of reasoning, but the target ${question.skill.toLowerCase()} skill is only partly visible. Make the decisive step and one check or assumption explicit.`
        : `The answer is too brief or implicit to show the target ${question.skill.toLowerCase()} skill securely yet.`,
    nextStep: secure
      ? "Move to a transfer question with a changed condition or more distant context."
      : "Rewrite the answer as: direct claim → decisive reason → one assumption/check that could change the conclusion.",
  }
}

function markingPrompt(target: TargetedPracticeTarget, question: TargetedPracticeQuestion, answer: string) {
  return [
    STUDENT_AI_SAFETY_POLICY,
    "Assess a targeted PRACTICE response. Do not estimate admissions chances or imitate an official Oxford/Cambridge score.",
    `The single skill being practised is: ${target.skill}.`,
    `Practice weakness: ${target.weakness}`,
    `Question: ${question.prompt}`,
    `Success criteria: ${question.successCriteria.join(" | ")}`,
    `Learner answer: ${answer}`,
    "Judge whether the reasoning evidence for THIS skill is needs-repair, developing, or secure. Do not reward verbosity or polished style. If the final conclusion is uncertain, focus on the reasoning process actually shown.",
    "Give one specific feedback sentence and one concrete next step. Do not reveal a full worked solution unless necessary to identify the exact reasoning error.",
    "Return JSON only: {\"classification\":\"needs-repair|developing|secure\",\"feedback\":\"...\",\"nextStep\":\"...\"}.",
  ].join("\n\n")
}

export async function POST(request: Request) {
  let body: RequestBody
  try {
    body = await request.json() as RequestBody
  } catch {
    return NextResponse.json({ error: "Invalid targeted-practice request." }, { status: 400 })
  }

  if (!validTarget(body.target)) return NextResponse.json({ error: "A valid practice target is required." }, { status: 400 })
  const target = body.target
  const round = Math.max(1, Math.min(5, Math.round(Number(body.round ?? 1))))
  const keys = getGeminiApiKeyCandidates()

  if (body.mode === "mark") {
    const question = body.question
    const answer = clean(body.answer, 5000)
    if (!question?.prompt || !answer) return NextResponse.json({ error: "Question and answer are required for marking." }, { status: 400 })
    const fallback = localMark(question, answer)
    for (const key of keys) {
      try {
        const marked = await generateJson<MarkedAttempt>(key.value, markingPrompt(target, question, answer), 700)
        if (!marked?.classification || !["needs-repair", "developing", "secure"].includes(marked.classification)) continue
        const feedback = clean(marked.feedback, 800)
        const nextStep = clean(marked.nextStep, 800)
        if (!feedback || !nextStep) continue
        return NextResponse.json({ classification: marked.classification, feedback, nextStep, provider: "gemini" }, { headers: { "Cache-Control": "no-store" } })
      } catch {
        // Try another configured key, then fall back locally.
      }
    }
    return NextResponse.json({ ...fallback, provider: "local" }, { headers: { "Cache-Control": "no-store" } })
  }

  const fallback = localPracticePrompt(target, round)
  for (const key of keys) {
    try {
      const generated = await generateJson<GeneratedQuestion>(key.value, generationPrompt(target, round), 1100)
      const prompt = clean(generated?.prompt, 1800)
      if (!prompt || prompt.toLowerCase() === clean(target.originalQuestion, 1800).toLowerCase()) continue
      const successCriteria = Array.isArray(generated?.successCriteria) ? generated.successCriteria.map(item => clean(item, 220)).filter(Boolean).slice(0, 5) : []
      const question: TargetedPracticeQuestion = {
        id: `generated-${target.id}-${round}-${Date.now()}`,
        prompt,
        skill: target.skill,
        contextShift: clean(generated?.contextShift, 300) || (round <= 1 ? "new context" : round === 2 ? "changed condition" : "far-transfer context"),
        successCriteria: successCriteria.length ? successCriteria : fallback.successCriteria,
        source: "gemini",
      }
      return NextResponse.json({ question }, { headers: { "Cache-Control": "no-store" } })
    } catch {
      // Try another configured key, then use the local transfer template.
    }
  }

  return NextResponse.json({ question: fallback }, { headers: { "Cache-Control": "no-store" } })
}

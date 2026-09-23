import { NextResponse } from "next/server"

export const runtime = "nodejs"

type InterviewTurn = {
  role: "interviewer" | "candidate"
  text: string
  speaker?: string
}

type InterviewRequest = {
  course?: string
  track?: string
  difficulty?: string
  persona?: string
  mode?: string
  question?: string
  answer?: string
  concepts?: string[]
  turns?: InterviewTurn[]
  interviewerRole?: string
  otherInterviewer?: string
  panelMode?: boolean
}

function localFollowUp(body: InterviewRequest) {
  const answer = (body.answer ?? "").trim()
  const lower = answer.toLowerCase()
  const words = answer ? answer.split(/\s+/).length : 0
  const persona = body.persona ?? "Socratic"
  const panelLead = body.panelMode ? `${body.interviewerRole ?? "Panel interviewer"}: ` : ""
  const prefix = persona === "Technical" ? "Make that step precise. " : persona === "Evidence-led" ? "Focus on the evidence. " : persona === "Sceptical" ? "I am not yet persuaded. " : persona === "Terse" ? "Continue. " : ""

  if (words < 28) return `${panelLead}${prefix}Can you make the reasoning explicit rather than giving me only the conclusion?`
  if (!/assum|suppos|given|if\s/i.test(lower)) return `${panelLead}${prefix}Which assumption is doing the most work in your argument, and what would change if it failed?`
  if (!/however|alternative|counter|unless|could|depends/i.test(lower)) return `${panelLead}${prefix}What is the strongest counterexample or alternative explanation to your current view?`
  if (!/because|therefore|hence|implies|since/i.test(lower)) return `${panelLead}${prefix}What is the exact step connecting your evidence to that conclusion?`
  return `${panelLead}${prefix}I want to change one condition. Which part of your reasoning remains valid, and which part would you now revise?`
}

function extractResponseText(data: unknown) {
  if (!data || typeof data !== "object") return ""
  const output = (data as { output?: unknown }).output
  if (!Array.isArray(output)) return ""
  for (const item of output) {
    if (!item || typeof item !== "object") continue
    const content = (item as { content?: unknown }).content
    if (!Array.isArray(content)) continue
    for (const part of content) {
      if (!part || typeof part !== "object") continue
      const text = (part as { text?: unknown }).text
      if (typeof text === "string" && text.trim()) return text.trim()
    }
  }
  return ""
}

export async function POST(request: Request) {
  let body: InterviewRequest
  try {
    body = await request.json() as InterviewRequest
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  const answer = (body.answer ?? "").trim()
  if (!answer) return NextResponse.json({ error: "Candidate answer is required" }, { status: 400 })

  const fallback = localFollowUp(body)
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ reply: fallback, provider: "local", configured: false })
  }

  const recentTurns = Array.isArray(body.turns) ? body.turns.slice(-12) : []
  const panelInstructions = body.panelMode ? [
    `You are ${body.interviewerRole ?? "one member of a two-person academic interview panel"}.`,
    `The other interviewer is ${body.otherInterviewer ?? "another academic"}.`,
    "Act as a genuinely distinct second academic: build on the shared conversation but do not merely repeat the other interviewer's question.",
    "You may refer back to a claim the candidate made to the other interviewer and test whether it survives a different perspective.",
  ] : []
  const systemPrompt = [
    "You are conducting a formal Oxford/Cambridge-style academic practice interview for a secondary-school applicant.",
    ...panelInstructions,
    "Your job is to test reasoning, not to reward polished memorised answers.",
    "Ask exactly ONE concise follow-up question or challenge per turn.",
    "Do not reveal the full solution, do not give a model answer, and do not say whether the candidate is correct.",
    "Probe assumptions, evidence, definitions, limiting cases, counterexamples, transfer to a new condition, or the exact inferential step.",
    "Use professional British English. Keep the reply under 55 words.",
    `Course: ${body.course ?? "unspecified"}. Subject family: ${body.track ?? "unspecified"}. Difficulty: ${body.difficulty ?? "Stretch"}.`,
    `Interviewer persona: ${body.persona ?? "Socratic"}. Session mode: ${body.mode ?? "Realistic"}.`,
    `Concepts that may be relevant: ${(body.concepts ?? []).slice(0, 8).join(", ") || "course-specific reasoning"}.`,
    "If the candidate changes their mind for a good reason, explore the revised reasoning rather than treating revision as failure.",
  ].join("\n")

  const conversation = recentTurns.map(turn => `${turn.speaker || (turn.role === "interviewer" ? "Interviewer" : "Candidate")}: ${turn.text}`).join("\n")
  const userPrompt = `Current question: ${body.question ?? "Continue the academic discussion."}\n\nRecent conversation:\n${conversation || "No earlier turns."}\n\nCandidate's latest answer:\n${answer}\n\nRespond with the next interview question only.`

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-5.6-luna",
        input: [
          { role: "system", content: [{ type: "input_text", text: systemPrompt }] },
          { role: "user", content: [{ type: "input_text", text: userPrompt }] },
        ],
        max_output_tokens: 180,
        store: false,
      }),
      signal: AbortSignal.timeout(15000),
    })

    if (!response.ok) {
      const detail = await response.text().catch(() => "")
      console.error("AI interview request failed", response.status, detail.slice(0, 500))
      return NextResponse.json({ reply: fallback, provider: "local", configured: true, degraded: true })
    }

    const data = await response.json() as unknown
    const reply = extractResponseText(data) || fallback
    return NextResponse.json({ reply, provider: reply === fallback ? "local" : "openai", configured: true })
  } catch (error) {
    console.error("AI interview request error", error)
    return NextResponse.json({ reply: fallback, provider: "local", configured: true, degraded: true })
  }
}

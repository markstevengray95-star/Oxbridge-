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
  const prefix = persona === "Technical" ? "That needs a more precise step. " : persona === "Evidence-led" ? "You have a claim there, but the evidence needs tightening. " : persona === "Sceptical" ? "I can see the direction, but one part is still unconvincing. " : persona === "Terse" ? "There is something useful there. " : ""

  if (words < 28) return `${panelLead}${prefix}You have given me the conclusion, but not enough of the chain that gets you there. Can you make the reasoning explicit?`
  if (!/assum|suppos|given|if\s/i.test(lower)) return `${panelLead}${prefix}Your reasoning depends on something you have not stated yet. Which assumption is doing the most work, and what would change if it failed?`
  if (!/however|alternative|counter|unless|could|depends/i.test(lower)) return `${panelLead}${prefix}You have developed one line of argument clearly, but you have not tested it against an alternative. What is the strongest counterexample or competing explanation?`
  if (!/because|therefore|hence|implies|since/i.test(lower)) return `${panelLead}${prefix}You have useful ingredients, but the inferential link is still implicit. What is the exact step connecting your evidence to that conclusion?`
  return `${panelLead}${prefix}Your chain is becoming clearer. Let me change one condition: which part of your reasoning survives, and which part would you now revise?`
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
    const text = parts
      .map(part => part && typeof part === "object" && typeof (part as { text?: unknown }).text === "string" ? String((part as { text?: string }).text) : "")
      .join(" ")
      .trim()
    if (text) return text
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
  const apiKey = process.env.GEMINI_API_KEY
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
    "You are conducting a realistic Oxford/Cambridge-style academic practice interview for a secondary-school applicant.",
    ...panelInstructions,
    "Your job is to test and develop reasoning, not to reward polished memorised answers.",
    "Respond like a real academic in conversation, not like an AI assistant, examiner report, or tutoring worksheet.",
    "For every substantive candidate answer, produce exactly TWO natural spoken parts without labels: (1) one short, specific observation or piece of feedback tied directly to something the candidate actually said; (2) exactly ONE concise follow-up question or challenge that develops that reasoning.",
    "The feedback can notice a useful idea, missing justification, unstated assumption, ambiguity, revision, or weak inferential step. Avoid generic praise such as 'great answer', 'well done', or 'excellent'.",
    "Do not reveal the full solution, do not give a model answer, and do not simply announce whether the candidate is correct.",
    "Probe assumptions, evidence, definitions, limiting cases, counterexamples, calculations, diagrams, transfer to a changed condition, or the exact inferential step as appropriate to the subject.",
    "Use natural professional British English. Keep the whole reply concise enough to sound natural aloud, normally 25-65 words.",
    `Course: ${body.course ?? "unspecified"}. Subject family: ${body.track ?? "unspecified"}. Difficulty: ${body.difficulty ?? "Stretch"}.`,
    `Interviewer persona: ${body.persona ?? "Socratic"}. Session mode: ${body.mode ?? "Realistic"}.`,
    `Concepts that may be relevant: ${(body.concepts ?? []).slice(0, 8).join(", ") || "course-specific reasoning"}.`,
    "If the candidate changes their mind for a defensible reason, explicitly notice the revision and explore why it is justified.",
    "If the candidate is stuck, give a small conceptual nudge in the feedback sentence, then ask a smaller question rather than solving the problem.",
  ].join("\n")

  const conversation = recentTurns.map(turn => `${turn.speaker || (turn.role === "interviewer" ? "Interviewer" : "Candidate")}: ${turn.text}`).join("\n")
  const userPrompt = `Current question: ${body.question ?? "Continue the academic discussion."}\n\nRecent conversation:\n${conversation || "No earlier turns."}\n\nCandidate's latest answer:\n${answer}\n\nGive one specific conversational observation about that answer, then ask exactly one follow-up question based on it.`
  const model = process.env.GEMINI_MODEL || "gemini-3.8-flash"

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: "POST",
      headers: {
        "x-goog-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        generationConfig: {
          maxOutputTokens: 220,
          temperature: 0.72,
          topP: 0.92,
        },
      }),
      signal: AbortSignal.timeout(15000),
    })

    if (!response.ok) {
      const detail = await response.text().catch(() => "")
      console.error("Gemini interview request failed", response.status, detail.slice(0, 500))
      return NextResponse.json({ reply: fallback, provider: "local", configured: true, degraded: true })
    }

    const data = await response.json() as unknown
    const reply = extractGeminiText(data) || fallback
    return NextResponse.json({ reply, provider: reply === fallback ? "local" : "gemini", configured: true })
  } catch (error) {
    console.error("Gemini interview request error", error)
    return NextResponse.json({ reply: fallback, provider: "local", configured: true, degraded: true })
  }
}

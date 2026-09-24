import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getGeminiApiKeyCandidates } from "@/lib/gemini/api-key"

export const runtime = "nodejs"

type EssayRequest = { test?: "LNAT" | "TARA"; prompt?: string; essay?: string }
type SentenceStatus = "strong" | "mixed" | "improve"

function splitSentences(paragraph: string) {
  return paragraph.split(/(?<=[.!?])\s+(?=[A-Z0-9“"'])/).map(sentence => sentence.trim()).filter(Boolean)
}

function sentenceReview(sentence: string, paragraphIndex: number, sentenceIndex: number) {
  const lower = sentence.toLowerCase()
  const hasReason = /\b(because|therefore|since|hence|consequently|this means|so that)\b/.test(lower)
  const hasCounter = /\b(however|although|nevertheless|on the other hand|objection|critics?)\b/.test(lower)
  const hasQualification = /\b(depends|unless|provided|not necessarily|in some cases|to the extent|whereas)\b/.test(lower)
  const hasExample = /\b(for example|for instance|consider|suppose|case)\b/.test(lower)
  const vague = /\b(things?|stuff|a lot|very|obviously|clearly|everyone|always|never)\b/.test(lower)
  const short = sentence.split(/\s+/).length < 7
  const status: SentenceStatus = hasReason || hasCounter || hasQualification ? "strong" : vague || short ? "improve" : "mixed"
  const label = hasCounter ? "Counterargument" : hasQualification ? "Qualification" : hasReason ? "Reasoning link" : hasExample ? "Example" : paragraphIndex === 0 && sentenceIndex === 0 ? "Opening claim" : "Development"
  return {
    paragraphIndex, sentenceIndex, sentence, status, label,
    explanation: status === "strong" ? "This sentence performs a clear argumentative job rather than simply adding content." : status === "improve" ? "The sentence is currently too broad, compressed or weakly connected to the argument." : "The point is relevant, but its inferential role could be made more explicit.",
    rewrite: status === "strong" ? "Keep the core sentence, but make sure the next sentence shows what follows from it." : hasExample ? "State the principle the example is testing, then explain what the example proves or fails to prove." : "Rewrite this as a precise claim followed by why it supports, limits or challenges the thesis.",
  }
}

function fallbackAnalysis(essay: string) {
  const paragraphs = essay.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean)
  const sentenceHighlights = paragraphs.flatMap((paragraph, paragraphIndex) => splitSentences(paragraph).map((sentence, sentenceIndex) => sentenceReview(sentence, paragraphIndex, sentenceIndex)))
  return {
    overallSummary: "This response has been analysed for argument clarity, reasoning, counterargument, qualification, precision and structure. Use the annotations as a revision plan rather than treating the signal as an official test score.",
    argumentMap: { thesis: paragraphs[0]?.slice(0, 220) || "No clear opening thesis detected.", coreReasons: paragraphs.slice(1, 4).map(p => p.slice(0, 180)), counterargument: paragraphs.find(p => /however|although|counter|objection|critics/i.test(p))?.slice(0, 220) || "No clearly signposted counterargument detected.", conclusion: paragraphs.at(-1)?.slice(0, 220) || "No conclusion detected." },
    dimensions: [
      { label: "Thesis & focus", score: /should|argue|overall|on balance|my view/i.test(essay) ? 78 : 55, evidence: "The review checks whether the response commits to a defensible position.", improvement: "State a precise thesis early and keep every paragraph tied back to it." },
      { label: "Reasoning", score: /because|therefore|since|hence|means that/i.test(essay) ? 75 : 50, evidence: "Explicit reasoning links make the argument easier to follow.", improvement: "Make the inferential step between evidence and conclusion explicit." },
      { label: "Counterargument", score: /however|although|objection|critics|on the other hand/i.test(essay) ? 76 : 42, evidence: "A strong essay tests its own case rather than presenting only one side.", improvement: "Present the strongest objection fairly, then answer it directly." },
      { label: "Qualification", score: /depends|unless|provided|in some cases|not necessarily|to the extent/i.test(essay) ? 74 : 48, evidence: "Precise qualifications show where the argument does and does not apply.", improvement: "Name the conditions that would weaken or change your conclusion." },
      { label: "Structure", score: Math.min(88, 45 + paragraphs.length * 7), evidence: `${paragraphs.length} paragraph${paragraphs.length === 1 ? "" : "s"} detected.`, improvement: "Give each paragraph one argumentative job and make transitions explain why the next step follows." },
      { label: "Precision", score: sentenceHighlights.filter(item => item.status === "strong").length >= sentenceHighlights.length / 3 ? 74 : 54, evidence: "Sentence-level review checks whether claims are precise enough to test or challenge.", improvement: "Replace broad claims with a definition, mechanism, relationship, condition or explicit inference." },
    ],
    paragraphs: paragraphs.map((p, index) => ({ index, status: index === 0 && /should|argue|overall|my view/i.test(p) ? "strong" : /however|although|because|therefore|example|for instance/i.test(p) ? "mixed" : "improve", role: index === 0 ? "Opening / thesis" : index === paragraphs.length - 1 ? "Conclusion" : "Development", whatWorks: /because|therefore|however|example|for instance/i.test(p) ? "This paragraph contains a visible argumentative move rather than only assertion." : "The paragraph contributes material relevant to the prompt.", improve: /because|therefore|since|hence/i.test(p) ? "Tighten the link back to the overall thesis and test the claim against an alternative." : "Make the paragraph's inference explicit: what follows from this point, and why?", action: "Revise the topic sentence so the paragraph's argumentative job is clear before adding detail." })),
    sentenceHighlights,
    strongestSection: { paragraph: 0, reason: "The opening is the best place to make the controlling argument explicit." },
    priorityImprovements: ["Make the thesis precise enough to disagree with.", "Turn assertions into explicit reasoning chains.", "Use the strongest counterargument as a test of the thesis, not a token opposing point."],
    rewritePlan: ["Rewrite the thesis in one sentence.", "Give each body paragraph one claim and one inferential link.", "Add or strengthen the best counterargument.", "Qualify the conclusion by stating when it would not apply."],
    examTechnique: ["Plan the argumentative route before writing full prose.", "Do not spend too long polishing the introduction.", "Use examples to test principles rather than replace reasoning."],
  }
}

async function loadStudentContext() {
  try {
    const supabase = await createClient()
    const { data: claimsData } = await supabase.auth.getClaims()
    const userId = typeof claimsData?.claims?.sub === "string" ? claimsData.claims.sub : null
    if (!userId) return "No saved learner history available."
    const [intelligence, memories] = await Promise.all([
      supabase.from("student_intelligence").select("snapshot").eq("user_id", userId).maybeSingle(),
      supabase.from("memory_items").select("category,content,confidence").eq("user_id", userId).eq("is_active", true).order("updated_at", { ascending: false }).limit(10),
    ])
    return `Student intelligence snapshot: ${JSON.stringify(intelligence.data?.snapshot ?? {}).slice(0, 7000)}\nRecent tutor memory:\n${(memories.data ?? []).map(item => `${item.category}: ${item.content}`).join("\n").slice(0, 3000)}`
  } catch { return "No saved learner history available." }
}

function extractText(data: unknown) {
  if (!data || typeof data !== "object") return ""
  const candidates = (data as { candidates?: unknown }).candidates
  if (!Array.isArray(candidates)) return ""
  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== "object") continue
    const parts = ((candidate as { content?: { parts?: unknown[] } }).content?.parts ?? [])
    const text = parts.map(part => part && typeof part === "object" && typeof (part as { text?: unknown }).text === "string" ? String((part as { text?: string }).text) : "").join("").trim()
    if (text) return text
  }
  return ""
}

function parseJson(raw: string) {
  const cleaned = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim()
  try { return JSON.parse(cleaned) as unknown } catch { return null }
}

export async function POST(request: Request) {
  let body: EssayRequest
  try { body = await request.json() as EssayRequest } catch { return NextResponse.json({ error: "Invalid request body" }, { status: 400 }) }
  const essay = (body.essay ?? "").trim().slice(0, 16000)
  const prompt = (body.prompt ?? "").trim().slice(0, 2000)
  if (!essay) return NextResponse.json({ error: "Essay is required" }, { status: 400 })

  const fallback = fallbackAnalysis(essay)
  const apiKey = getGeminiApiKeyCandidates()[0]?.value
  if (!apiKey) return NextResponse.json({ analysis: fallback, provider: "local", configured: false })

  const studentContext = await loadStudentContext()
  const paragraphs = essay.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean)
  const numbered = paragraphs.map((p, i) => `[Paragraph ${i + 1}] ${p}`).join("\n\n")
  const system = `You are an academic admissions-test writing coach analysing practice ${body.test ?? "LNAT/TARA"} writing. Do not claim an official examiner score or admissions outcome. Be evidence-based, specific, demanding and constructive. PERSONALISATION IS REQUIRED: use the saved learner context only when it contains genuine evidence. In overallSummary, say what is distinctive about THIS essay relative to the student's recurring patterns. In priorityImprovements, connect at least one priority to a repeated weakness if evidenced, otherwise state that this is a new pattern. In rewritePlan, include one specific goal for the student's NEXT essay. Do not invent history. Return ONLY valid JSON with this exact top-level shape: {"overallSummary":string,"argumentMap":{"thesis":string,"coreReasons":string[],"counterargument":string,"conclusion":string},"dimensions":[{"label":string,"score":number,"evidence":string,"improvement":string}],"paragraphs":[{"index":number,"status":"strong"|"mixed"|"improve","role":string,"whatWorks":string,"improve":string,"action":string}],"sentenceHighlights":[{"paragraphIndex":number,"sentenceIndex":number,"sentence":string,"status":"strong"|"mixed"|"improve","label":string,"explanation":string,"rewrite":string}],"strongestSection":{"paragraph":number,"reason":string},"priorityImprovements":string[],"rewritePlan":string[],"examTechnique":string[]}. Scores are practice signals 0-100 and must reflect only visible features. Paragraph and sentence indexes are zero-based. Analyse every paragraph and every meaningful sentence. The sentence field must copy the original sentence exactly. Mark strong sentences only when they do genuinely useful argumentative work.`
  const user = `Prompt: ${prompt || "No prompt supplied"}\n\nEssay:\n${numbered}\n\nSaved learner context:\n${studentContext}`
  const model = process.env.GEMINI_MODEL || "gemini-3.8-flash"

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, { method: "POST", headers: { "x-goog-api-key": apiKey, "Content-Type": "application/json" }, body: JSON.stringify({ systemInstruction: { parts: [{ text: system }] }, contents: [{ role: "user", parts: [{ text: user }] }], generationConfig: { temperature: 0.2, maxOutputTokens: 6500, responseMimeType: "application/json" } }), signal: AbortSignal.timeout(26000) })
    if (!response.ok) return NextResponse.json({ analysis: fallback, provider: "local", configured: true, degraded: true })
    const parsed = parseJson(extractText(await response.json())) as { sentenceHighlights?: unknown[] } | null
    const valid = parsed && Array.isArray(parsed.sentenceHighlights)
    return NextResponse.json({ analysis: valid ? parsed : fallback, provider: valid ? "gemini" : "local", configured: true, degraded: !valid })
  } catch {
    return NextResponse.json({ analysis: fallback, provider: "local", configured: true, degraded: true })
  }
}

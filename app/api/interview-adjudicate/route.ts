import { NextResponse } from "next/server"
import { STUDENT_AI_SAFETY_POLICY } from "@/lib/ai/student-safety"
import { getGeminiApiKeyCandidates } from "@/lib/gemini/api-key"
import { buildInterviewEvidenceProfile, type EvidenceDimensionKey, type InterviewEvidenceProfile } from "@/lib/interview-evidence-rubric"
import { markTypedInterviewTranscript, type InterviewMarkingTurn } from "@/lib/interview-marking"

export const runtime = "nodejs"

type RequestBody = {
  turns?: InterviewMarkingTurn[]
  concepts?: string[]
  referenceAnswer?: string
  course?: string
  track?: string
}

type CloudDimension = {
  key?: EvidenceDimensionKey
  score?: number
  evidenceQuote?: string
  reason?: string
}

type CloudMarker = {
  dimensions?: CloudDimension[]
  strengths?: string[]
  priorities?: string[]
  confidence?: number
  summary?: string
}

type CloudAdjudication = {
  dimensions?: CloudDimension[]
  priorities?: string[]
  confidence?: number
  summary?: string
}

const dimensionKeys: EvidenceDimensionKey[] = [
  "problemDecomposition",
  "independentReasoning",
  "responseToChallenge",
  "useOfEvidence",
  "conceptualUnderstanding",
  "precision",
  "communicationOfReasoning",
  "recoveryAfterDifficulty",
  "transferToUnfamiliar",
]

function clean(text: string | undefined, max = 4000) {
  return (text ?? "").replace(/\s+/g, " ").trim().slice(0, max)
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

function transcriptText(turns: InterviewMarkingTurn[]) {
  return turns.map((turn, index) => `${index + 1}. ${turn.role === "candidate" ? "Candidate" : "Interviewer"}: ${clean(turn.text, 1800)}`).join("\n")
}

function dimensionGuide() {
  return [
    "problemDecomposition: breaks the task into useful cases, variables, assumptions or sub-problems",
    "independentReasoning: advances a defensible line of thought without waiting to be led",
    "responseToChallenge: engages with changed conditions, objections and follow-ups rather than repeating",
    "useOfEvidence: uses calculations, examples, data, sources, experiments, checks or counterexamples",
    "conceptualUnderstanding: applies relevant ideas accurately in context rather than reciting terms",
    "precision: states conditions, quantities, definitions, directions and claims precisely",
    "communicationOfReasoning: makes the inferential chain visible and interpretable",
    "recoveryAfterDifficulty: identifies and repairs weak reasoning after challenge",
    "transferToUnfamiliar: carries the underlying method into a new, generalised or boundary case",
  ].join("\n")
}

async function generateJson<T>(key: string, prompt: string, maxOutputTokens = 2200): Promise<T | null> {
  const model = process.env.GEMINI_MODEL || "gemini-3.8-flash"
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: "POST",
    headers: { "x-goog-api-key": key, "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.1, maxOutputTokens, responseMimeType: "application/json" },
    }),
    signal: AbortSignal.timeout(20000),
  })
  if (!response.ok) return null
  return parseJson<T>(extractGeminiText(await response.json() as unknown))
}

function markerPrompt(input: {
  role: "A" | "B"
  transcript: string
  course: string
  track: string
  concepts: string[]
  referenceAnswer?: string
}) {
  const stance = input.role === "A"
    ? "Evaluate the academic reasoning constructively but conservatively. Credit good thinking even when the final answer is imperfect, but require transcript evidence for every score."
    : "Act as a sceptical second marker. Look especially for over-crediting, generic fluent language, unsupported claims, failure to answer the exact question, and whether apparent recovery is genuine rather than repetition."
  return [
    STUDENT_AI_SAFETY_POLICY,
    "You are one of two independent markers for a practice Oxbridge-style interview. This is not an official university score or admissions prediction.",
    stance,
    "Score EACH dimension from 0 to 4 using only evidence visible in the transcript.",
    "Do not reward vocabulary, accent, confidence, verbosity, background or polish. Judge the reasoning that is actually shown.",
    "For every dimension, give one short verbatim evidence quote from the candidate if possible. Do not invent quotes.",
    "If the transcript does not contain enough evidence for a dimension, score conservatively and say so.",
    `Course: ${input.course || "unspecified"}. Track: ${input.track || "unspecified"}.`,
    input.concepts.length ? `Relevant concepts: ${input.concepts.join(", ")}.` : "",
    input.referenceAnswer ? `Reference reasoning for the opening problem only: ${input.referenceAnswer}` : "",
    "Rubric dimensions:\n" + dimensionGuide(),
    "Transcript:\n" + input.transcript,
    "Return JSON only in this shape: {\"dimensions\":[{\"key\":\"problemDecomposition\",\"score\":0,\"evidenceQuote\":\"...\",\"reason\":\"...\"}],\"strengths\":[\"...\"],\"priorities\":[\"...\"],\"confidence\":0,\"summary\":\"...\"}. Include all nine dimensions. confidence is 0-100.",
  ].filter(Boolean).join("\n\n")
}

function markerMap(marker: CloudMarker | null) {
  const map = new Map<EvidenceDimensionKey, CloudDimension>()
  for (const item of marker?.dimensions ?? []) {
    if (!item.key || !dimensionKeys.includes(item.key)) continue
    const score = Number(item.score)
    if (!Number.isFinite(score)) continue
    map.set(item.key, { ...item, score: Math.max(0, Math.min(4, Math.round(score))) })
  }
  return map
}

function markerAgreement(a: CloudMarker | null, b: CloudMarker | null) {
  const left = markerMap(a)
  const right = markerMap(b)
  const differences: number[] = []
  for (const key of dimensionKeys) {
    const av = left.get(key)?.score
    const bv = right.get(key)?.score
    if (typeof av === "number" && typeof bv === "number") differences.push(Math.abs(av - bv))
  }
  if (!differences.length) return 0
  const meanDifference = differences.reduce((sum, value) => sum + value, 0) / differences.length
  return Math.max(0, Math.min(100, Math.round(100 - meanDifference * 25)))
}

function quoteExists(transcript: string, quote: string | undefined) {
  const candidate = clean(quote, 220).toLowerCase()
  if (candidate.length < 5) return false
  return transcript.toLowerCase().includes(candidate)
}

function adjudicatorPrompt(input: {
  transcript: string
  localProfile: InterviewEvidenceProfile
  markerA: CloudMarker
  markerB: CloudMarker
}) {
  return [
    STUDENT_AI_SAFETY_POLICY,
    "You are the final adjudicator for a PRACTICE interview marking system. Two independent markers and one deterministic evidence rubric have already assessed the same transcript.",
    "Resolve disagreements using transcript evidence, not by averaging blindly.",
    "For each dimension, return a 0-4 integer score. A final score should normally remain within one point of the deterministic local score unless a short exact candidate quote clearly justifies the change.",
    "Do not invent evidence. Do not infer intelligence, personality, confidence, background or admissions chances.",
    "Rubric dimensions:\n" + dimensionGuide(),
    "Transcript:\n" + input.transcript,
    "Deterministic evidence profile:\n" + JSON.stringify(input.localProfile.dimensions.map(item => ({ key: item.key, score: item.score, evidence: item.evidence, nextAction: item.nextAction }))),
    "Independent marker A:\n" + JSON.stringify(input.markerA),
    "Independent marker B:\n" + JSON.stringify(input.markerB),
    "Return JSON only: {\"dimensions\":[{\"key\":\"problemDecomposition\",\"score\":0,\"evidenceQuote\":\"exact candidate quote if available\",\"reason\":\"why this resolves the disagreement\"}],\"priorities\":[\"two or three specific practice priorities\"],\"confidence\":0,\"summary\":\"brief calibration note\"}. Include all nine dimensions.",
  ].join("\n\n")
}

function applyAdjudication(localProfile: InterviewEvidenceProfile, adjudication: CloudAdjudication | null, transcript: string) {
  if (!adjudication) return localProfile
  const cloud = new Map<EvidenceDimensionKey, CloudDimension>()
  for (const item of adjudication.dimensions ?? []) {
    if (!item.key || !dimensionKeys.includes(item.key)) continue
    const score = Number(item.score)
    if (!Number.isFinite(score)) continue
    cloud.set(item.key, { ...item, score: Math.max(0, Math.min(4, Math.round(score))) })
  }

  const dimensions = localProfile.dimensions.map(local => {
    const judged = cloud.get(local.key)
    if (!judged || typeof judged.score !== "number") return local
    const min = Math.max(0, local.score - 1)
    const max = Math.min(4, local.score + 1)
    const score = Math.max(min, Math.min(max, judged.score))
    const evidenceQuote = quoteExists(transcript, judged.evidenceQuote) ? clean(judged.evidenceQuote, 220) : ""
    const evidence = evidenceQuote
      ? [{ turnIndex: -1, quote: evidenceQuote, reason: clean(judged.reason, 320) || "Final adjudicator selected this exact transcript evidence." }, ...local.evidence].slice(0, 2)
      : local.evidence
    const descriptor = score >= 4 ? "Consistent evidence across the transcript" : score === 3 ? "Clear evidence, with room for greater consistency" : score === 2 ? "Some evidence, but it is not yet dependable" : score === 1 ? "Limited evidence in this session" : "Not enough observable evidence in this session"
    return { ...local, score, descriptor, evidence }
  })

  return { ...localProfile, dimensions, total: dimensions.reduce((sum, item) => sum + item.score, 0) }
}

export async function POST(request: Request) {
  let body: RequestBody
  try {
    body = await request.json() as RequestBody
  } catch {
    return NextResponse.json({ error: "Invalid marking request." }, { status: 400 })
  }

  const turns = Array.isArray(body.turns)
    ? body.turns.filter(turn => turn && (turn.role === "candidate" || turn.role === "interviewer") && clean(turn.text)).slice(-50).map(turn => ({ role: turn.role, text: clean(turn.text, 4000), quality: turn.quality }))
    : []
  if (!turns.some(turn => turn.role === "candidate")) return NextResponse.json({ error: "A candidate response is required before marking." }, { status: 400 })

  const concepts = Array.isArray(body.concepts) ? body.concepts.filter(Boolean).slice(0, 20) : []
  const referenceAnswer = clean(body.referenceAnswer, 3500) || undefined
  const baseline = markTypedInterviewTranscript({ turns, concepts, referenceAnswer })
  const localProfile = buildInterviewEvidenceProfile({ turns, marking: baseline })
  const transcript = transcriptText(turns)
  const keys = getGeminiApiKeyCandidates()

  if (!keys.length) {
    const priorities = localProfile.dimensions.slice().sort((a, b) => a.score - b.score).slice(0, 3).map(item => item.nextAction)
    return NextResponse.json({
      baseline,
      evidenceProfile: localProfile,
      adjudication: { provider: "local", markerAgreement: null, confidence: localProfile.confidence, priorities, summary: "Cloud markers are not configured, so the deterministic evidence rubric was used." },
    }, { headers: { "Cache-Control": "no-store" } })
  }

  let markerA: CloudMarker | null = null
  let markerB: CloudMarker | null = null
  for (const key of keys) {
    try {
      markerA = await generateJson<CloudMarker>(key.value, markerPrompt({ role: "A", transcript, course: clean(body.course, 120), track: clean(body.track, 80), concepts, referenceAnswer }))
      markerB = await generateJson<CloudMarker>(key.value, markerPrompt({ role: "B", transcript, course: clean(body.course, 120), track: clean(body.track, 80), concepts, referenceAnswer }))
      if (markerA && markerB) break
    } catch {
      markerA = null
      markerB = null
    }
  }

  if (!markerA || !markerB) {
    const priorities = localProfile.dimensions.slice().sort((a, b) => a.score - b.score).slice(0, 3).map(item => item.nextAction)
    return NextResponse.json({
      baseline,
      evidenceProfile: localProfile,
      adjudication: { provider: "local-fallback", markerAgreement: null, confidence: localProfile.confidence, priorities, summary: "Independent cloud marking was temporarily unavailable, so the deterministic evidence rubric was retained." },
    }, { headers: { "Cache-Control": "no-store" } })
  }

  let adjudicated: CloudAdjudication | null = null
  for (const key of keys) {
    try {
      adjudicated = await generateJson<CloudAdjudication>(key.value, adjudicatorPrompt({ transcript, localProfile, markerA, markerB }), 2600)
      if (adjudicated) break
    } catch {
      adjudicated = null
    }
  }

  const finalProfile = applyAdjudication(localProfile, adjudicated, transcript)
  const agreement = markerAgreement(markerA, markerB)
  const priorities = (adjudicated?.priorities ?? []).map(item => clean(item, 300)).filter(Boolean).slice(0, 3)
  const fallbackPriorities = finalProfile.dimensions.slice().sort((a, b) => a.score - b.score).slice(0, 3).map(item => item.nextAction)
  const confidence = typeof adjudicated?.confidence === "number" ? Math.max(0, Math.min(100, Math.round(adjudicated.confidence))) : Math.round((Number(markerA.confidence ?? 60) + Number(markerB.confidence ?? 60)) / 2)

  return NextResponse.json({
    baseline,
    evidenceProfile: finalProfile,
    adjudication: {
      provider: adjudicated ? "two-marker-plus-adjudicator" : "two-marker-no-adjudicator",
      markerAgreement: agreement,
      confidence,
      priorities: priorities.length ? priorities : fallbackPriorities,
      summary: clean(adjudicated?.summary, 600) || "Two independent markers were compared against the deterministic transcript rubric. Scores are practice evidence only.",
      markerA: { confidence: markerA.confidence, summary: clean(markerA.summary, 400) },
      markerB: { confidence: markerB.confidence, summary: clean(markerB.summary, 400) },
    },
  }, { headers: { "Cache-Control": "no-store" } })
}

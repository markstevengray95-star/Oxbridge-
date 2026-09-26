import { lnatEssayPrompts2027, taraWritingPrompts2027 } from "@/lib/question-bank-2027"
import { analyseOfflineEssayTask } from "./offline-review-v3"
import { analyseOfflineTopicAlignment } from "./offline-review-v2"
import type { WritingReport } from "./review"

export type UniversityEssayClassification =
  | "Exceptional First"
  | "First"
  | "High II.1"
  | "Upper Second (II.1)"
  | "Lower Second (II.2)"
  | "Third"
  | "Fail"

export type StrictEssayGrade = UniversityEssayClassification
export type AdmissionsEssayStyle = "TARA" | "LNAT" | "general"

export type StrictEssayScore = {
  score: number
  rawScore: number
  grade: StrictEssayGrade
  classification: UniversityEssayClassification
  descriptor: string
  components: Array<{
    label: string
    weight: number
    level: number
    earned: number
    reason: string
  }>
  caps: Array<{ maximum: number; reason: string }>
  topicLevel: number
  topicLabel: string
  taskLabel: string
  taskSatisfied: boolean
  confidence: "moderate" | "limited"
  essayStyle: AdmissionsEssayStyle
  diagnostics: {
    wordCount: number
    paragraphCount: number
    reasonedBodyParagraphs: number
    reasoningLinks: number
    evaluationLinks: number
    hasDefensibleConclusion: boolean
    hasObjectionResponse: boolean
    repeatedPromptRisk: boolean
  }
  note: string
}

// Relevance and reasoning dominate. Polished prose cannot compensate for a weak answer.
const WEIGHTS = [30, 25, 10, 15, 10, 10] as const
const SCORE_PREFIX = "University-style practice mark:"
const REASONING_LINK = /\b(?:because|since|therefore|thereby|thus|hence|consequently|which means|as a result|so that|this implies|this suggests|the reason|depends on)\b/gi
const EVALUATION_LINK = /\b(?:however|although|while|whereas|yet|nevertheless|on the other hand|counterargument|objection|limitation|unless|even if|on balance|despite|but this|a stronger objection)\b/gi
const CONCLUSION_LANGUAGE = /\b(?:in conclusion|overall|on balance|therefore|ultimately|for these reasons|the better view|the stronger position|I conclude|it follows that)\b/i
const RESPONSE_LANGUAGE = /\b(?:however|but|yet|nevertheless|even so|this objection|this criticism|on balance|despite this|does not follow|is outweighed|still)\b/i
const ABSOLUTE_ASSERTION = /\b(?:always|never|obviously|clearly|everyone|nobody|all people|no one|certainly|undeniably|proves that)\b/i

export const UNIVERSITY_CLASSIFICATION_BANDS = [
  { minimum: 85, label: "Exceptional First", descriptor: "Outstanding and memorable; first-class qualities are present to a remarkable degree." },
  { minimum: 70, label: "First", descriptor: "Excellent command of relevant material with close engagement, strong analysis and clear independent judgement." },
  { minimum: 67, label: "High II.1", descriptor: "Very strong upper-second work with some first-class qualities, but not consistently enough for a First." },
  { minimum: 60, label: "Upper Second (II.1)", descriptor: "Good, broad engagement with relevant material; clearly argued, well illustrated and relevant." },
  { minimum: 50, label: "Lower Second (II.2)", descriptor: "Competent and broadly relevant, but with significant weaknesses in focus, organisation, depth or analysis." },
  { minimum: 40, label: "Third", descriptor: "Basic understanding is visible, but there are substantial gaps, limited analysis or inconsistent relevance." },
  { minimum: 0, label: "Fail", descriptor: "Insufficient understanding, analysis or relevance for a passing university-style standard." },
] as const satisfies ReadonlyArray<{ minimum: number; label: UniversityEssayClassification; descriptor: string }>

function normalise(text: string) {
  return text.toLowerCase().replace(/[“”‘’]/g, "").replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim()
}

function inferEssayStyle(prompt: string): AdmissionsEssayStyle {
  const key = normalise(prompt)
  if (taraWritingPrompts2027.some(item => normalise(item) === key)) return "TARA"
  if (lnatEssayPrompts2027.some(item => normalise(item) === key)) return "LNAT"
  return "general"
}

function classificationFor(score: number): { classification: UniversityEssayClassification; descriptor: string } {
  const band = UNIVERSITY_CLASSIFICATION_BANDS.find(item => score >= item.minimum) ?? UNIVERSITY_CLASSIFICATION_BANDS[UNIVERSITY_CLASSIFICATION_BANDS.length - 1]
  return { classification: band.label, descriptor: band.descriptor }
}

function levelReason(level: number) {
  if (level === 4) return "First-class qualities: sustained relevance, strong analysis, precise expression and convincing support."
  if (level === 3) return "Upper-second qualities: clear, relevant and well organised, with good analysis but less consistent independence or depth."
  if (level === 2) return "Lower-second qualities: broadly competent and relevant, but with important weaknesses in depth, organisation or analytical control."
  if (level === 1) return "Third-class qualities: some understanding is present, but analysis, clarity or relevance is limited and inconsistent."
  return "Fail-standard evidence on this criterion: the required quality is not demonstrated sufficiently in the submitted draft."
}

function countMatches(text: string, pattern: RegExp) {
  return [...text.matchAll(pattern)].length
}

function promptContentWords(prompt: string) {
  const stop = new Set(["the","a","an","and","or","of","to","in","on","for","with","is","are","be","should","can","could","does","do","than","that","this","it","ever","more","over"])
  return normalise(prompt).split(" ").filter(word => word.length >= 4 && !stop.has(word))
}

function paragraphPromptCoverage(paragraph: string, promptWords: string[]) {
  if (!promptWords.length) return 0
  const words = new Set(normalise(paragraph).split(" "))
  return promptWords.filter(word => words.has(word)).length / promptWords.length
}

function essayDiagnostics(prompt: string, essay: string) {
  const paragraphs = essay.split(/\r?\n\s*\r?\n/).map(p => p.trim()).filter(Boolean)
  const words = essay.trim().split(/\s+/).filter(Boolean)
  const body = paragraphs.length >= 3 ? paragraphs.slice(1, -1) : paragraphs.slice(1)
  const reasoningLinks = countMatches(essay, REASONING_LINK)
  const evaluationLinks = countMatches(essay, EVALUATION_LINK)
  const reasonedBodyParagraphs = body.filter(paragraph => countMatches(paragraph, REASONING_LINK) > 0 && paragraph.split(/\s+/).length >= 45).length
  const evaluationBodyParagraphs = body.filter(paragraph => countMatches(paragraph, EVALUATION_LINK) > 0).length
  const conclusion = paragraphs.at(-1) ?? ""
  const promptWords = promptContentWords(prompt)
  const conclusionCoverage = paragraphPromptCoverage(conclusion, promptWords)
  const hasDefensibleConclusion = conclusion.length >= 55 && (CONCLUSION_LANGUAGE.test(conclusion) || conclusionCoverage >= 0.35)
  const hasObjectionResponse = evaluationBodyParagraphs > 0 && body.some(paragraph => EVALUATION_LINK.test(paragraph) && RESPONSE_LANGUAGE.test(paragraph))

  const intro = paragraphs[0] ?? ""
  const promptKey = normalise(prompt)
  const introKey = normalise(intro)
  const repeatedPromptRisk = promptKey.length > 20 && introKey.includes(promptKey) && body.filter(p => paragraphPromptCoverage(p, promptWords) >= 0.25).length < Math.max(1, Math.ceil(body.length / 2))

  const sentences = essay.split(/(?<=[.!?])\s+/).map(item => item.trim()).filter(Boolean)
  const absoluteClaims = sentences.filter(sentence => ABSOLUTE_ASSERTION.test(sentence) && countMatches(sentence, REASONING_LINK) === 0).length

  return {
    wordCount: words.length,
    paragraphCount: paragraphs.length,
    bodyParagraphCount: body.length,
    reasonedBodyParagraphs,
    reasoningLinks,
    evaluationLinks,
    evaluationBodyParagraphs,
    hasDefensibleConclusion,
    hasObjectionResponse,
    repeatedPromptRisk,
    absoluteClaims,
  }
}

function addCap(caps: StrictEssayScore["caps"], maximum: number, reason: string) {
  if (!caps.some(cap => cap.maximum === maximum && cap.reason === reason)) caps.push({ maximum, reason })
}

export function scoreStrictEssay(report: WritingReport, prompt: string, essay: string): StrictEssayScore | null {
  if (!prompt.trim()) return null

  const components = report.criteria.map((criterion, index) => {
    const level = criterion.level ?? 0
    const weight = WEIGHTS[index] ?? 0
    return {
      label: criterion.label,
      weight,
      level,
      earned: Math.round((weight * level / 4) * 10) / 10,
      reason: levelReason(level),
    }
  })

  const rawScore = Math.round(components.reduce((sum, component) => sum + component.earned, 0))
  const topic = analyseOfflineTopicAlignment(prompt, essay)
  const task = analyseOfflineEssayTask(prompt, essay)
  const essayStyle = inferEssayStyle(prompt)
  const diagnostics = essayDiagnostics(prompt, essay)
  const caps: StrictEssayScore["caps"] = []

  if (topic.level === 0) addCap(caps, 39, "The response is substantially irrelevant to the question or fails to address its core concepts; fluent prose cannot rescue an answer to a different question.")
  else if (topic.level === 1) addCap(caps, 49, "The response shows only limited engagement with the exact question; this cannot reach a secure Second-class standard.")
  else if (topic.level === 2) addCap(caps, 59, "The response is broadly related to the topic but only partially answers the exact question; this is capped within Lower Second (II.2) territory.")

  if (task.promptEchoRisk || diagnostics.repeatedPromptRisk) addCap(caps, 39, "The opening echoes the question but the body does not sustain the same issue; repetition of the prompt is not evidence of relevance.")
  if (!task.taskSatisfied) addCap(caps, 59, `The essay does not fully complete the required ${task.label} task; a good answer to the wrong or incomplete task should not rise above Lower Second (II.2) territory.`)

  const bodyParagraphs = Math.max(1, diagnostics.bodyParagraphCount)
  if (task.potentialDriftParagraphs.length >= Math.max(2, Math.ceil(bodyParagraphs / 2))) {
    addCap(caps, 59, "A substantial proportion of the body drifts from the exact question, so the response cannot reach Upper Second or First-class standard.")
  }

  const reasoningLevel = report.criteria[1]?.level ?? 0
  const evidenceLevel = report.criteria[2]?.level ?? 0
  const evaluationLevel = report.criteria[3]?.level ?? 0
  const structureLevel = report.criteria[4]?.level ?? 0
  const precisionLevel = report.criteria[5]?.level ?? 0

  if (reasoningLevel <= 1) addCap(caps, 54, "Reasoning is too thin or asserted for a strong university-style classification.")
  if (evidenceLevel <= 1 && evaluationLevel <= 1) addCap(caps, 54, "Supporting material and evaluation are both too limited for a strong classification.")
  if (diagnostics.reasoningLinks < 2 || diagnostics.reasonedBodyParagraphs === 0) addCap(caps, 59, "The draft contains too little visible claim-to-reason development; relevant assertions are not developed into a sustained argument.")
  if (diagnostics.reasonedBodyParagraphs < 2 && diagnostics.wordCount >= 250) addCap(caps, 66, "Fewer than two body paragraphs develop a clear reasoning chain, so the response is not yet consistently analytical enough for a First.")
  if (diagnostics.evaluationLinks === 0 && /comparison|extent|policy|judgement|causal/i.test(task.label)) addCap(caps, 66, "The question requires judgement or weighing, but the response does not seriously qualify, test or challenge its own reasoning.")
  if (!diagnostics.hasObjectionResponse && diagnostics.wordCount >= 300 && /comparison|extent|policy|judgement/i.test(task.label)) addCap(caps, 69, "The response does not develop and answer a meaningful counter-position; this limits the independence and evaluative depth of the argument.")
  if (!diagnostics.hasDefensibleConclusion) addCap(caps, essayStyle === "LNAT" ? 59 : 66, essayStyle === "LNAT" ? "LNAT Section B expects an economical argument that comes to a conclusion; no sufficiently defensible conclusion is identifiable." : "The final paragraph does not clearly resolve the question from the reasoning developed in the essay.")

  if (diagnostics.wordCount < 150) addCap(caps, 49, "The response is too short to sustain the level of analysis expected from a 40-minute admissions-style writing task.")
  else if (diagnostics.wordCount < 250) addCap(caps, 59, "The response is too brief to demonstrate sustained analysis, evaluation and development across the whole question.")
  if (diagnostics.paragraphCount < 3) addCap(caps, 59, "The response lacks enough developed stages to demonstrate a sustained university-style argument.")

  if (essayStyle === "TARA" && diagnostics.wordCount > 750) {
    addCap(caps, 59, "The response exceeds the official TARA Writing Task limit of 750 words; practice marking treats observance of the task constraint as part of disciplined written reasoning.")
  }

  if (diagnostics.absoluteClaims >= 3) addCap(caps, 66, "Several absolute claims are asserted without an accompanying reason or qualification, reducing analytical precision.")

  // First-class gate: high prose/rubric scores are not enough unless the core academic requirements are all secure.
  if (rawScore >= 70 && (topic.level < 3 || !task.taskSatisfied || reasoningLevel < 3 || structureLevel < 3 || precisionLevel < 3)) {
    addCap(caps, 69, "A First requires secure question focus, task completion, reasoning, organisation and precision together; at least one of those foundations is below secure level.")
  }
  if (rawScore >= 70 && evaluationLevel < 2) addCap(caps, 69, "A First cannot be awarded where evaluation is only emerging or absent.")

  // Exceptional First is deliberately rare: it needs sustained top-level evidence, not merely a high weighted average.
  const levelFourCount = report.criteria.filter(criterion => (criterion.level ?? 0) === 4).length
  if (rawScore >= 85 && (topic.level < 4 || reasoningLevel < 3 || evaluationLevel < 3 || diagnostics.reasonedBodyParagraphs < 2 || levelFourCount < 3)) {
    addCap(caps, 84, "Exceptional First is reserved for sustained top-level relevance, reasoning and evaluation across the response; the draft does not meet that higher gate consistently enough.")
  }

  const maximum = caps.length ? Math.min(...caps.map(cap => cap.maximum)) : 100
  const score = Math.min(rawScore, maximum)
  const band = classificationFor(score)
  const confidence: StrictEssayScore["confidence"] = diagnostics.paragraphCount >= 3 && topic.concepts.length >= 2 && diagnostics.wordCount >= 250 ? "moderate" : "limited"

  return {
    score,
    rawScore,
    grade: band.classification,
    classification: band.classification,
    descriptor: band.descriptor,
    components,
    caps: caps.sort((a, b) => a.maximum - b.maximum),
    topicLevel: topic.level,
    topicLabel: topic.label,
    taskLabel: task.label,
    taskSatisfied: task.taskSatisfied,
    confidence,
    essayStyle,
    diagnostics: {
      wordCount: diagnostics.wordCount,
      paragraphCount: diagnostics.paragraphCount,
      reasonedBodyParagraphs: diagnostics.reasonedBodyParagraphs,
      reasoningLinks: diagnostics.reasoningLinks,
      evaluationLinks: diagnostics.evaluationLinks,
      hasDefensibleConclusion: diagnostics.hasDefensibleConclusion,
      hasObjectionResponse: diagnostics.hasObjectionResponse,
      repeatedPromptRisk: diagnostics.repeatedPromptRisk,
    },
    note: "This is a deliberately strict ScholarBridge practice classification, not an official Oxford/Cambridge admissions decision or an official LNAT/TARA score. It is designed to under-reward polished but shallow, generic or partially relevant writing rather than average those weaknesses away.",
  }
}

export function attachStrictEssayScoring(report: WritingReport, prompt: string, essay: string) {
  const mark = scoreStrictEssay(report, prompt, essay)
  if (!mark || report.summary.startsWith(SCORE_PREFIX)) return { report, strictScore: mark }

  const caps = mark.caps.length
    ? ` Classification ceiling${mark.caps.length === 1 ? "" : "s"}: ${mark.caps.map(cap => `${cap.maximum}/100 (${cap.reason})`).join("; ")}.`
    : " No classification ceiling was triggered."
  report.summary = `${SCORE_PREFIX} ${mark.score}/100 — ${mark.classification} (${mark.descriptor}). Raw weighted mark: ${mark.rawScore}/100.${caps} ${report.summary}`

  report.criteria = report.criteria.map((criterion, index) => {
    const component = mark.components[index]
    if (!component || criterion.judgement.startsWith("University-style weighted mark:")) return criterion
    return {
      ...criterion,
      judgement: `University-style weighted mark: ${component.earned}/${component.weight}. ${criterion.judgement}`,
    }
  })

  report.limitations = [
    mark.note,
    ...report.limitations.filter(item => !/strict ScholarBridge .*practice/i.test(item)),
  ].slice(0, 5)

  return { report, strictScore: mark }
}

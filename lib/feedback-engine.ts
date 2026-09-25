import type { TestQuestion } from "@/lib/oxbridge-data"
import { prepareQuestionSet, questionQualitySignals } from "@/lib/question-quality"

export type InterviewAnswerFeedback = {
  score: number
  dimensions: Array<{ label: string; score: number; evidence: string; action: string }>
  strengths: string[]
  improvements: string[]
  nextMove: string
  dominantTarget: string
}

function countHits(text: string, expressions: RegExp[]) {
  return expressions.reduce((sum, expression) => sum + (expression.test(text) ? 1 : 0), 0)
}

export function analyseInterviewAnswer(answer: string): InterviewAnswerFeedback {
  const clean = answer.trim()
  const lower = clean.toLowerCase()
  const words = clean ? clean.split(/\s+/).length : 0
  const reasoningHits = countHits(lower, [/\bbecause\b/, /\btherefore\b/, /\bsince\b/, /\bhence\b/, /\bimplies?\b/, /\bso\b/])
  const assumptionHits = countHits(lower, [/\bassum/, /\bsuppos/, /\bgiven\b/, /\bif\b/, /\bprovided\b/])
  const testingHits = countHits(lower, [/\bhowever\b/, /\bcounter/, /\balternative\b/, /\blimit/, /\bextreme\b/, /\bunless\b/, /\bdepends\b/, /\bwhat if\b/])
  const evidenceHits = countHits(lower, [/\bevidence\b/, /\bdata\b/, /\bexample\b/, /\bfor instance\b/, /\bmeasure/, /\bobserve/, /\btest\b/])
  const precisionHits = countHits(lower, [/\bspecifically\b/, /\bapproximately\b/, /\bproportional\b/, /\bincreases?\b/, /\bdecreases?\b/, /\bgreater\b/, /\bless\b/, /\bequal\b/])

  const chain = Math.min(100, 28 + reasoningHits * 16 + (words >= 45 ? 16 : words >= 25 ? 8 : 0))
  const assumptions = Math.min(100, 24 + assumptionHits * 22)
  const testing = Math.min(100, 20 + testingHits * 20 + evidenceHits * 8)
  const precision = Math.min(100, 28 + precisionHits * 10 + (words >= 25 && words <= 220 ? 18 : 5))
  const communication = Math.min(100, words >= 45 && words <= 220 ? 86 : words >= 25 ? 68 : words >= 12 ? 50 : 30)

  const dimensions = [
    { label: "Reasoning chain", score: chain, evidence: reasoningHits ? "You explicitly linked claims to reasons." : "The conclusion is more visible than the chain that supports it.", action: "Use: observation → principle → inference → provisional conclusion." },
    { label: "Assumptions", score: assumptions, evidence: assumptionHits ? "You made at least one condition or assumption visible." : "Key assumptions remain implicit.", action: "Name the assumption doing the most work, then say what changes if it fails." },
    { label: "Testing alternatives", score: testing, evidence: testingHits || evidenceHits ? "You tested the idea against evidence, alternatives or boundary cases." : "The first line of reasoning was not stress-tested enough.", action: "Try one counterexample, limiting case, alternative explanation or discriminating test." },
    { label: "Precision", score: precision, evidence: precisionHits ? "The response contains specific directional or quantitative language." : "Some claims remain broad rather than testable or precise.", action: "Replace broad claims with a relationship, mechanism, definition or measurable prediction." },
    { label: "Communication", score: communication, evidence: words >= 25 ? "There is enough explanation to follow the main line of thought." : "The answer is too compressed to expose the reasoning fully.", action: "Think aloud in short linked steps rather than giving only the endpoint." },
  ]

  const ordered = [...dimensions].sort((a, b) => a.score - b.score)
  const strengths = dimensions.filter(item => item.score >= 72).map(item => item.evidence).slice(0, 3)
  const improvements = ordered.slice(0, 2).map(item => `${item.label}: ${item.action}`)
  const score = Math.round(dimensions.reduce((sum, item) => sum + item.score, 0) / dimensions.length)
  return {
    score,
    dimensions,
    strengths: strengths.length ? strengths : ["You stayed with the question and produced enough material to analyse."],
    improvements,
    nextMove: ordered[0].action,
    dominantTarget: ordered[0].label,
  }
}

export type PaperSectionResult = {
  id: string
  title: string
  kind: "mcq" | "essay"
  correct: number
  total: number
  answered: number
  accuracy: number
  words?: number
}

export type InterventionTarget = {
  section: string
  accuracy: number
  priority: "high" | "medium" | "maintain"
  diagnosis: string
  teach: string[]
  drill: string[]
  successCriterion: string
}

const sectionStrategies: Array<[RegExp, string[], string[]]> = [
  [/mathemat|quantitative|problem solving/i, ["Translate the wording into variables before calculating.", "Write the relationship first, then substitute values.", "Estimate the likely size of the answer before choosing an option."], ["Complete two untimed questions explaining every step.", "Complete four timed questions and record why each distractor is wrong."]],
  [/reasoning|critical|decision|argument/i, ["Separate conclusion, evidence and assumption.", "Test whether the conclusion must follow or is merely plausible.", "Actively search for the strongest alternative explanation."], ["Label conclusion/evidence/assumption in three examples.", "Complete six fresh reasoning questions under time pressure."]],
  [/physics|chemistry|biology/i, ["Identify the governing principle before using an equation or fact.", "Track units, proportionality and limiting behaviour.", "For data questions, state what the evidence supports and what it cannot establish."], ["Explain two solutions aloud without looking at options.", "Complete six fresh subject questions, checking units or evidence each time."]],
  [/verbal|passage|lnat/i, ["Answer from the passage rather than outside knowledge.", "Distinguish what is stated, implied and not established.", "For argument questions, identify the author's qualified conclusion."], ["Summarise three paragraphs in one sentence each.", "Complete a fresh passage set and justify every answer from the text."]],
  [/situational/i, ["Identify the immediate risk, duty and people affected.", "Prefer proportionate, honest action over avoidance or public escalation.", "Separate what should happen first from what may happen later."], ["Rank four responses and explain the first-action principle.", "Complete a fresh SJT set and review any over- or under-escalation."]],
]

export function buildInterventionTargets(sections: PaperSectionResult[]): InterventionTarget[] {
  return sections
    .filter(section => section.kind === "mcq" && section.total > 0)
    .sort((a, b) => a.accuracy - b.accuracy)
    .slice(0, 3)
    .map(section => {
      const strategy = sectionStrategies.find(([pattern]) => pattern.test(section.title))
      const teach = strategy?.[1] ?? ["Redo one missed-style question slowly and narrate the reasoning.", "Identify the exact step where the method becomes uncertain.", "Write a short rule you can apply to the next question."]
      const drill = strategy?.[2] ?? ["Complete three untimed targeted questions.", "Then complete five fresh questions under realistic timing."]
      const priority = section.accuracy < 55 ? "high" : section.accuracy < 75 ? "medium" : "maintain"
      return {
        section: section.title,
        accuracy: section.accuracy,
        priority,
        diagnosis: section.accuracy < 55 ? "This section is currently limiting the overall paper most strongly." : section.accuracy < 75 ? "This section is developing but is not yet consistently secure under full-paper conditions." : "This is comparatively secure; use the retest to confirm it remains stable.",
        teach,
        drill,
        successCriterion: priority === "high" ? "Reach at least 70% on the fresh retest." : "Reach at least 80% on the fresh retest.",
      }
    })
}

function sectionMatches(questionSection: string, target: string) {
  const a = questionSection.toLowerCase().replace(/[^a-z0-9 ]/g, " ")
  const b = target.toLowerCase().replace(/[^a-z0-9 ]/g, " ")
  const tokens = b.split(/\s+/).filter(token => token.length >= 4 && !["paper", "section", "part", "module"].includes(token))
  return tokens.some(token => a.includes(token)) || a.includes(b) || b.includes(a)
}

function hashString(value: string) {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

export function selectRetestQuestions(pool: TestQuestion[], test: TestQuestion["test"], targets: InterventionTarget[], count = 12) {
  const targetSections = targets.map(target => target.section)
  const relevant = pool.filter(question => question.test === test && targetSections.some(target => sectionMatches(question.section, target)))
  const fallback = pool.filter(question => question.test === test)
  const source = relevant.length >= Math.min(6, count) ? relevant : fallback

  // Select by discrimination quality first, with a small deterministic tie-break so
  // consecutive retests do not always expose the exact same questions.
  const ranked = [...source]
    .map(question => ({
      question,
      score: questionQualitySignals(question).discriminationScore + (hashString(`${question.id}:${targets.map(target => target.section).join("|")}`) % 1000) / 5000,
    }))
    .sort((a, b) => b.score - a.score)
    .map(item => item.question)

  const seen = new Set<string>()
  const picked: TestQuestion[] = []
  for (const question of ranked) {
    if (picked.length >= count) break
    if (!seen.has(question.id)) {
      seen.add(question.id)
      picked.push(question)
    }
  }

  // Re-shuffle answer positions for this exact retest so a subset cannot inherit
  // a visible A/B/C/D sequence from its source bank.
  const seed = hashString(`${test}:${targetSections.join("|")}:${picked.map(question => question.id).join("|")}`)
  return prepareQuestionSet(picked, seed)
}

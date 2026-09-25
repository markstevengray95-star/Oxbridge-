import { buildOfflineWritingReport as buildBaseOfflineWritingReport, type OfflineReviewInput } from "./offline-review"
import type { WritingReport } from "./review"

export type { OfflineReviewInput } from "./offline-review"

type TopicAlignment = {
  level: 0 | 1 | 2 | 3 | 4
  label: "Off topic" | "Weak topic match" | "Partial topic match" | "On topic" | "Strong sustained match"
  concepts: string[]
  matched: string[]
  missing: string[]
  hingeConcepts: string[]
  missingHinges: string[]
  alignedParagraphs: number[]
  bestParagraph: number | null
  bestCoverage: number
  overallCoverage: number
  sustainedCoverage: number
  requiresJudgement: boolean
  hasJudgement: boolean
}

const STOP = new Set([
  "a","an","the","and","or","but","if","then","than","that","this","these","those","to","of","in","on","at","by","for","from","with","without","about","into","over","under","between","through","during","before","after","as","is","are","was","were","be","been","being","do","does","did","have","has","had","can","could","may","might","will","would","shall","should","must","ought","we","they","he","she","it","you","i","their","our","your","its","who","whom","whose","which","what","when","where","why","how",
])

const QUESTION_FRAME = new Set([
  "agree","disagree","discuss","consider","evaluate","assess","extent","view","statement","claim","question","argument","case","best","better","worse","good","bad","right","wrong","important","necessary","desirable","justified","today","modern","society","people","person","thing","things","issue","issues","remain","use","using","used","make","making","made","become","becomes","ever","always","never","really","more","most","less","least",
])

const HINGE_WORDS = new Set([
  "allow","allowed","permit","permitted","choose","choice","ban","banned","prohibit","prohibited","forbid","forbidden","restrict","restricted","censor","censored","regulate","regulated","abolish","abolished","require","required","compulsory","mandatory","responsible","responsibility","liable","liability","legal","legally","illegal","criminal","criminalise","criminalize","free","cost","pay","paid","charge","tax","taxed","taxation","privatise","privatize","nationalise","nationalize","compensate","punish","punishment",
])

const IRREGULAR: Record<string, string> = {
  children: "child",
  people: "person",
  men: "man",
  women: "woman",
  media: "media",
  taxes: "tax",
  taxation: "tax",
  universities: "university",
  policies: "policy",
  companies: "company",
  libraries: "library",
  responsibilities: "responsibility",
  freedoms: "freedom",
  rights: "right",
}

const SYNONYM_GROUPS = [
  ["ban","prohibit","forbid"],
  ["allow","permit"],
  ["compulsory","mandatory","required"],
  ["responsible","responsibility","liable","liability"],
  ["legal","legally","law"],
  ["regulate","regulation","regulated"],
  ["tax","taxation","taxed"],
  ["vote","voting","ballot"],
  ["child","children","minor"],
  ["parent","parents","guardian"],
  ["prison","imprisonment","incarceration"],
  ["privacy","private"],
  ["speech","expression"],
  ["job","jobs","employment","work"],
  ["healthcare","medicine","medical"],
  ["university","universities","college"],
] as const

function rawTokens(text: string) {
  return text.toLowerCase().replace(/[’]/g, "'").match(/[a-z][a-z'-]*/g) ?? []
}

function stem(token: string) {
  const clean = token.toLowerCase().replace(/^'+|'+$/g, "")
  if (IRREGULAR[clean]) return IRREGULAR[clean]
  if (clean.length <= 4) return clean
  if (clean.endsWith("ies") && clean.length > 5) return `${clean.slice(0, -3)}y`
  if (clean.endsWith("ing") && clean.length > 6) return clean.slice(0, -3)
  if (clean.endsWith("ed") && clean.length > 5) return clean.slice(0, -2)
  if (clean.endsWith("es") && clean.length > 5) return clean.slice(0, -2)
  if (clean.endsWith("s") && !clean.endsWith("ss") && clean.length > 4) return clean.slice(0, -1)
  return clean
}

function canonical(token: string) {
  const base = stem(token)
  for (const group of SYNONYM_GROUPS) {
    if (group.some(item => stem(item) === base)) return stem(group[0])
  }
  return base
}

function meaningfulTokens(text: string, forQuestion = false) {
  return rawTokens(text)
    .map(token => canonical(token))
    .filter(token => token.length >= 3 && !STOP.has(token) && (!forQuestion || !QUESTION_FRAME.has(token)))
}

function unique<T>(values: T[]) {
  return [...new Set(values)]
}

function conceptSet(text: string) {
  return new Set(meaningfulTokens(text, false))
}

function countConceptOccurrences(text: string, concept: string) {
  return meaningfulTokens(text, false).filter(token => token === concept).length
}

function hasExplicitJudgement(text: string) {
  return /\b(i (?:argue|believe|consider)|this essay (?:argues|contends)|on balance|overall|ultimately|therefore|should|should not|ought|must|must not|is better|is worse|is justified|is not justified|the stronger view|the better view)\b/i.test(text)
}

function needsJudgement(prompt: string) {
  return /\b(should|ought|must|agree|disagree|to what extent|better than|best|justified|right to|wrong to)\b/i.test(prompt)
}

function promptConcepts(prompt: string) {
  const tokens = rawTokens(prompt)
  const concepts = unique(meaningfulTokens(prompt, true))
  const hinges = unique(tokens.filter(token => HINGE_WORDS.has(token)).map(token => canonical(token)))

  const pairs: Array<[string, string]> = []
  const filtered = tokens
    .map(token => canonical(token))
    .filter(token => token.length >= 3 && !STOP.has(token) && !QUESTION_FRAME.has(token))
  for (let i = 0; i < filtered.length - 1; i += 1) {
    const a = filtered[i]
    const b = filtered[i + 1]
    if (a !== b) pairs.push([a, b])
  }
  return { concepts, hinges, pairs }
}

function paragraphCoverage(text: string, concepts: string[], pairs: Array<[string, string]>) {
  if (!concepts.length) return { coverage: 0, hits: [] as string[], pairHits: 0 }
  const set = conceptSet(text)
  const hits = concepts.filter(concept => set.has(concept))
  const pairHits = pairs.filter(([a, b]) => set.has(a) && set.has(b)).length
  return { coverage: hits.length / concepts.length, hits, pairHits }
}

export function analyseOfflineTopicAlignment(prompt: string, essay: string): TopicAlignment {
  const paragraphs = essay.split(/\r?\n\s*\r?\n/).map(p => p.trim()).filter(Boolean)
  const { concepts, hinges, pairs } = promptConcepts(prompt)
  const essaySet = conceptSet(essay)
  const matched = concepts.filter(concept => essaySet.has(concept))
  const missing = concepts.filter(concept => !essaySet.has(concept))
  const missingHinges = hinges.filter(concept => !essaySet.has(concept))
  const overallCoverage = concepts.length ? matched.length / concepts.length : 0

  const paragraphScores = paragraphs.map((text, index) => ({ index, ...paragraphCoverage(text, concepts, pairs) }))
  const minimumHits = concepts.length <= 2 ? 1 : 2
  const alignedParagraphs = paragraphScores
    .filter(item => item.hits.length >= minimumHits && (item.coverage >= .34 || item.pairHits > 0))
    .map(item => item.index)
  const best = paragraphScores.slice().sort((a, b) => (b.coverage + b.pairHits * .15) - (a.coverage + a.pairHits * .15))[0]
  const sustainedCoverage = paragraphs.length ? alignedParagraphs.length / paragraphs.length : 0
  const requiresJudgement = needsJudgement(prompt)
  const hasJudgement = hasExplicitJudgement(essay)
  const hingeCoverage = hinges.length ? (hinges.length - missingHinges.length) / hinges.length : 1
  const repeatedCore = concepts.filter(concept => countConceptOccurrences(essay, concept) >= 2).length
  const repeatedRatio = concepts.length ? repeatedCore / concepts.length : 0
  const pairCoverage = pairs.length ? Math.max(...paragraphScores.map(p => p.pairHits), 0) / Math.max(1, pairs.length) : 1

  let level: 0 | 1 | 2 | 3 | 4
  if (!prompt.trim() || !concepts.length) {
    level = 0
  } else if (overallCoverage < .25 || (concepts.length >= 3 && matched.length < 2) || (hinges.length > 0 && hingeCoverage === 0)) {
    level = 0
  } else if (overallCoverage < .48 || sustainedCoverage < .2 || (hinges.length > 0 && hingeCoverage < .75)) {
    level = 1
  } else if (overallCoverage < .7 || sustainedCoverage < .4 || (requiresJudgement && !hasJudgement)) {
    level = 2
  } else if (overallCoverage < .88 || sustainedCoverage < .55 || repeatedRatio < .35 || pairCoverage < .25 || (requiresJudgement && !hasJudgement)) {
    level = 3
  } else {
    level = 4
  }

  const labels: TopicAlignment["label"][] = ["Off topic", "Weak topic match", "Partial topic match", "On topic", "Strong sustained match"]
  return {
    level,
    label: labels[level],
    concepts,
    matched,
    missing,
    hingeConcepts: hinges,
    missingHinges,
    alignedParagraphs,
    bestParagraph: best?.index ?? null,
    bestCoverage: best?.coverage ?? 0,
    overallCoverage,
    sustainedCoverage,
    requiresJudgement,
    hasJudgement,
  }
}

function humanTerms(terms: string[]) {
  return terms.length ? terms.slice(0, 7).join(", ") : "none identified"
}

function improveEssayRelevance(report: WritingReport, input: OfflineReviewInput): WritingReport {
  const prompt = input.prompt?.trim() ?? ""
  if (!prompt) return report
  const alignment = analyseOfflineTopicAlignment(prompt, input.essay)
  const criterion = report.criteria[0]
  const paragraphs = input.essay.split(/\r?\n\s*\r?\n/).map(p => p.trim()).filter(Boolean)
  const bestParagraph = alignment.bestParagraph !== null ? paragraphs[alignment.bestParagraph] : null
  const bestSentence = bestParagraph?.split(/(?<=[.!?])\s+/).map(s => s.trim()).find(Boolean) ?? ""

  const matchedText = humanTerms(alignment.matched)
  const missingText = humanTerms(alignment.missing)
  const hingeText = alignment.missingHinges.length ? ` The question's decision/hinge concept is not adequately addressed: ${humanTerms(alignment.missingHinges)}.` : ""
  const judgementText = alignment.requiresJudgement && !alignment.hasJudgement ? " The question calls for a judgement, but the essay does not make a clear overall judgement." : ""
  const spread = `${alignment.alignedParagraphs.length}/${paragraphs.length || 1} paragraph${paragraphs.length === 1 ? "" : "s"} substantially connect to the question's core concepts.`

  criterion.level = alignment.level
  criterion.judgement = `${alignment.label}. Core topic coverage is ${Math.round(alignment.overallCoverage * 100)}%; matched concepts: ${matchedText}; missing concepts: ${missingText}. ${spread}${hingeText}${judgementText}`
  criterion.evidence = alignment.bestParagraph === null || !bestSentence
    ? { paragraph: null, quote: "" }
    : { paragraph: alignment.bestParagraph, quote: bestSentence.slice(0, 800) }
  criterion.action = alignment.level <= 1
    ? `Re-centre the essay on the exact question before improving style. In the introduction, explicitly address the central concepts (${humanTerms(alignment.concepts)})${alignment.hingeConcepts.length ? ` and the decision being asked about (${humanTerms(alignment.hingeConcepts)})` : ""}. Then make every body paragraph explain how its claim helps answer that question.`
    : alignment.level === 2
      ? `The essay is related to the topic but does not sustain the exact question strongly enough. Bring the missing concepts (${missingText}) into the reasoning and link each body paragraph back to the question's precise issue.`
      : `Keep the strong topic focus, but check that every paragraph advances the exact question rather than only discussing the wider subject.`

  if (report.priorities.length) {
    const existing = report.priorities.findIndex(priority => priority.title === criterion.label)
    if (alignment.level <= 2) {
      const priority = {
        title: criterion.label,
        evidence: criterion.evidence,
        why: criterion.judgement,
        action: criterion.action,
        successCheck: "A reader can identify the exact question from the essay alone, the central decision/relationship is addressed directly, and most body paragraphs visibly advance that answer.",
      }
      if (existing >= 0) report.priorities.splice(existing, 1)
      report.priorities.unshift(priority)
      report.priorities = report.priorities.slice(0, 3)
    }
  }

  report.summary = alignment.level <= 1
    ? `The main weakness is topic alignment: this draft is ${alignment.label.toLowerCase()} for the supplied question. Improve relevance before polishing the prose or adding more examples. ${report.summary}`
    : `Topic alignment is ${alignment.label.toLowerCase()} for the supplied question. ${report.summary}`

  report.limitations = [
    "Offline topic checking now uses exact token/stem matching, question-hinge detection and paragraph-level concept coverage rather than substring overlap. It can still miss unusual synonyms or highly implicit arguments, so borderline relevance judgements should be checked by a human or the AI reviewer when available.",
    ...report.limitations.filter(item => !/offline engine cannot verify semantic equivalence|keyword/i.test(item)),
  ].slice(0, 5)

  return report
}

export function buildOfflineWritingReport(input: OfflineReviewInput): WritingReport {
  const report = buildBaseOfflineWritingReport(input)
  return input.mode === "essay" ? improveEssayRelevance(report, input) : report
}

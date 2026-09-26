import type { TestQuestion } from "@/lib/oxbridge-data"

export type ReliabilityIssue = {
  severity: "blocking" | "warning"
  code: string
  message: string
}

export type QuestionReliabilityAudit = {
  score: number
  issues: ReliabilityIssue[]
  blocking: ReliabilityIssue[]
  warnings: ReliabilityIssue[]
}

const INVALID_GENERATED_VALUE = /\b(?:nan|infinity|undefined|null)\b/i
const META_OPTION = /\b(?:all of the above|none of the above|both a and b|all answers are correct)\b/i
const EXTREME_WORDS = /\b(?:always|never|everyone|entirely|completely|guarantees?|impossible|automatically|only|all|none)\b/i
const OBVIOUS_DISTRACTOR = /\b(?:longer title|different (?:font|presentation font)|worked hard|uses past tense|too (?:few|many) words|widely discussed|popular online|unrelated (?:outcome|description)|everyone already agrees|some people dislike|contains long sentences)\b/i
const DIRECT_NUMERIC_STEM = /\b(?:what is|calculate|find|how many|how much|what percentage|what is the probability|what is the mean)\b/i

function compact(text: string) {
  return text.replace(/\s+/g, " ").trim()
}

export function optionReliabilityKey(text: string) {
  return compact(text)
    .toLowerCase()
    .replace(/[−–—]/g, "-")
    .replace(/[“”‘’]/g, "")
    .replace(/\s*([=<>≤≥+*/()])\s*/g, "$1")
}

function parseSimpleNumber(text: string): number | null {
  const cleaned = compact(text)
    .toLowerCase()
    .replace(/,/g, "")
    .replace(/[£$€¥]/g, "")
    .replace(/\b(?:kg|g|mg|km|cm|mm|m|s|h|hz|pa|j|w|v|a|mol|dm|units?|people|items?|comparisons?|components?)\b/gi, "")
    .replace(/[²³⁻¹×]/g, "")
    .trim()

  const percent = cleaned.match(/^(-?\d+(?:\.\d+)?)\s*%$/)
  if (percent) return Number(percent[1]) / 100

  const fraction = cleaned.match(/^(-?\d+(?:\.\d+)?)\s*\/\s*(-?\d+(?:\.\d+)?)$/)
  if (fraction) {
    const denominator = Number(fraction[2])
    if (denominator === 0) return null
    return Number(fraction[1]) / denominator
  }

  const numeric = cleaned.match(/^(-?\d+(?:\.\d+)?)$/)
  return numeric ? Number(numeric[1]) : null
}

function sameNumericValue(a: string, b: string) {
  const av = parseSimpleNumber(a)
  const bv = parseSimpleNumber(b)
  if (av === null || bv === null || !Number.isFinite(av) || !Number.isFinite(bv)) return false
  return Math.abs(av - bv) <= Math.max(1e-9, Math.abs(av) * 1e-9, Math.abs(bv) * 1e-9)
}

function explanationNumericValues(text: string) {
  const values: number[] = []
  const fractionPattern = /(-?\d+(?:\.\d+)?)\s*\/\s*(-?\d+(?:\.\d+)?)/g
  for (const match of text.matchAll(fractionPattern)) {
    const denominator = Number(match[2])
    if (denominator !== 0) values.push(Number(match[1]) / denominator)
  }
  for (const match of text.matchAll(/-?\d+(?:\.\d+)?%?/g)) {
    const raw = match[0]
    const value = Number(raw.replace("%", ""))
    if (Number.isFinite(value)) values.push(raw.includes("%") ? value / 100 : value)
  }
  return values
}

function numericAnswerSupported(question: TestQuestion) {
  const answer = question.options[question.answer]
  const value = parseSimpleNumber(answer)
  if (value === null) return true

  const candidateNumbers = explanationNumericValues(question.explanation)
  if (!candidateNumbers.length) return false

  return candidateNumbers.some(candidate =>
    Math.abs(candidate - value) <= Math.max(0.0005, Math.abs(value) * 0.002),
  )
}

function splitNumericRendering(text: string) {
  const match = text.match(/^(.*?)(-?\d+(?:\.\d+)?)([^\d]*)$/)
  if (!match) return null
  return { prefix: match[1], raw: match[2], suffix: match[3] }
}

function repairNumericRendering(text: string, used: string[], attemptSeed: number) {
  const fraction = text.match(/^(.*?)(-?\d+)\s*\/\s*(-?\d+)([^\d]*)$/)
  if (fraction) {
    const numerator = Number(fraction[2])
    const denominator = Number(fraction[3])
    for (let step = 1; step <= 8; step++) {
      const candidate = `${fraction[1]}${numerator + step + (attemptSeed % 2)}/${denominator}${fraction[4]}`
      if (!used.some(existing => optionReliabilityKey(existing) === optionReliabilityKey(candidate) || sameNumericValue(existing, candidate))) return candidate
    }
  }

  const parts = splitNumericRendering(text)
  if (!parts) return null
  const value = Number(parts.raw)
  if (!Number.isFinite(value)) return null
  const decimals = parts.raw.includes(".") ? parts.raw.split(".")[1].length : 0
  const baseStep = decimals ? Math.max(10 ** -decimals, Math.abs(value) * 0.05) : Math.max(1, Math.round(Math.abs(value) * 0.08))
  const directions = [1, -1, 2, -2, 3, -3, 4, -4]
  for (let offset = 0; offset < directions.length; offset++) {
    const direction = directions[(offset + attemptSeed) % directions.length]
    const candidateValue = value + direction * baseStep
    const rendered = decimals ? candidateValue.toFixed(decimals) : String(Math.round(candidateValue))
    const candidate = `${parts.prefix}${rendered}${parts.suffix}`
    if (!used.some(existing => optionReliabilityKey(existing) === optionReliabilityKey(candidate) || sameNumericValue(existing, candidate))) return candidate
  }
  return null
}

export function repairQuestionReliability(question: TestQuestion): TestQuestion {
  if (!Array.isArray(question.options) || question.answer < 0 || question.answer >= question.options.length) return question
  const options = [...question.options]
  const correct = options[question.answer]
  const used = [correct]
  let changed = false

  for (let index = 0; index < options.length; index++) {
    if (index === question.answer) continue
    const option = options[index]
    const duplicate = used.some(existing => optionReliabilityKey(existing) === optionReliabilityKey(option) || sameNumericValue(existing, option))
    if (!duplicate) {
      used.push(option)
      continue
    }

    const repaired = repairNumericRendering(option, used, index + question.id.length)
    if (repaired) {
      options[index] = repaired
      used.push(repaired)
      changed = true
    } else {
      used.push(option)
    }
  }

  return changed ? { ...question, options } : question
}

function addIssue(issues: ReliabilityIssue[], severity: ReliabilityIssue["severity"], code: string, message: string) {
  issues.push({ severity, code, message })
}

export function auditQuestionReliability(question: TestQuestion): QuestionReliabilityAudit {
  const issues: ReliabilityIssue[] = []
  const prompt = compact(question.prompt ?? "")
  const explanation = compact(question.explanation ?? "")
  const options = Array.isArray(question.options) ? question.options.map(compact) : []
  const expectedOptionCount = question.test === "TARA" ? 5 : 4

  if (!prompt) addIssue(issues, "blocking", "blank-prompt", "Question prompt is blank.")
  if (!explanation) addIssue(issues, "blocking", "blank-explanation", "Question explanation is blank.")
  if (options.length !== expectedOptionCount) addIssue(issues, "blocking", "option-count", `Expected ${expectedOptionCount} options but found ${options.length}.`)
  if (!Number.isInteger(question.answer) || question.answer < 0 || question.answer >= options.length) addIssue(issues, "blocking", "answer-index", "Correct answer index is invalid.")

  const allText = [prompt, explanation, ...options].join(" ")
  if (INVALID_GENERATED_VALUE.test(allText)) addIssue(issues, "blocking", "invalid-generated-value", "Question contains NaN, Infinity, undefined or null.")

  const keys = options.map(optionReliabilityKey)
  if (new Set(keys).size !== keys.length) addIssue(issues, "blocking", "duplicate-option", "Two or more answer options are textually equivalent.")

  for (let i = 0; i < options.length; i++) {
    for (let j = i + 1; j < options.length; j++) {
      if (sameNumericValue(options[i], options[j])) {
        addIssue(issues, "blocking", "numeric-equivalent-options", `Options ${i + 1} and ${j + 1} represent the same numeric value.`)
      }
    }
  }

  if (options.some(option => !option)) addIssue(issues, "blocking", "blank-option", "At least one answer option is blank.")
  if (options.some(option => META_OPTION.test(option))) addIssue(issues, "warning", "meta-option", "Avoid all/none-of-the-above style answer cues.")

  if (question.answer >= 0 && question.answer < options.length) {
    const correct = options[question.answer]
    const correctLength = Math.max(1, correct.length)
    const distractors = options.filter((_, index) => index !== question.answer)
    const distractorLengths = distractors.map(option => Math.max(1, option.length))
    const longestDistractor = Math.max(1, ...distractorLengths)
    const shortestDistractor = Math.max(1, Math.min(...distractorLengths))

    if (correctLength >= 1.55 * longestDistractor && correctLength - longestDistractor >= 12) {
      addIssue(issues, "warning", "correct-length-clue", "Correct answer is conspicuously longer than every distractor.")
    }
    if (correctLength >= 44 && shortestDistractor / correctLength < 0.28) {
      addIssue(issues, "warning", "option-length-spread", "A very short distractor makes the correct answer easier to spot by length.")
    }

    const obviousDistractors = distractors.filter(option => OBVIOUS_DISTRACTOR.test(option)).length
    if (obviousDistractors >= 2) addIssue(issues, "warning", "implausible-distractors", "At least two distractors are implausibly weak or irrelevant.")

    const extremeDistractors = distractors.filter(option => EXTREME_WORDS.test(option)).length
    if (!EXTREME_WORDS.test(correct) && extremeDistractors >= 2) {
      addIssue(issues, "warning", "extreme-distractor-cue", "Multiple distractors use extreme wording while the keyed answer does not.")
    }

    if (!numericAnswerSupported(question)) {
      addIssue(issues, "blocking", "numeric-explanation-mismatch", "The explanation does not contain the keyed numeric result.")
    }
  }

  if (explanation.length < 28) addIssue(issues, "warning", "thin-explanation", "Explanation is too short to justify the answer robustly.")

  const allNumeric = options.length === expectedOptionCount && options.every(option => parseSimpleNumber(option) !== null)
  if (allNumeric && prompt.length < 125 && DIRECT_NUMERIC_STEM.test(prompt) && !/\b(?:therefore|after|then|remaining|combined|changes?|compare|simultaneously|constraint|condition)\b/i.test(prompt)) {
    addIssue(issues, "warning", "low-reasoning-depth", "Question is a short direct calculation with limited reasoning depth.")
  }

  let score = 100
  for (const issue of issues) {
    if (issue.severity === "blocking") score -= 45
    else if (issue.code === "implausible-distractors" || issue.code === "correct-length-clue") score -= 14
    else if (issue.code === "option-length-spread" || issue.code === "extreme-distractor-cue") score -= 10
    else if (issue.code === "low-reasoning-depth") score -= 7
    else score -= 6
  }
  score = Math.max(0, Math.min(100, score))

  const blocking = issues.filter(issue => issue.severity === "blocking")
  const warnings = issues.filter(issue => issue.severity === "warning")
  return { score, issues, blocking, warnings }
}

export function reliabilityScore(question: TestQuestion) {
  return auditQuestionReliability(question).score
}

export function isQuestionStructurallyReliable(question: TestQuestion) {
  return auditQuestionReliability(question).blocking.length === 0
}

export function reliabilitySummary(questions: TestQuestion[]) {
  const audits = questions.map(auditQuestionReliability)
  const scores = audits.map(audit => audit.score)
  const blockingQuestions = audits.filter(audit => audit.blocking.length > 0).length
  const warningQuestions = audits.filter(audit => audit.warnings.length > 0).length
  const averageScore = scores.length ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 0
  return {
    total: questions.length,
    averageScore: Math.round(averageScore * 10) / 10,
    minimumScore: scores.length ? Math.min(...scores) : 0,
    blockingQuestions,
    warningQuestions,
  }
}

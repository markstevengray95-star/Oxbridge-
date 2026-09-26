import type { TestQuestion } from "@/lib/oxbridge-data"

export const taraCriticalThinkingTypes = [
  "Identifying the Main Conclusion",
  "Drawing a Conclusion",
  "Identifying an Assumption",
  "Assessing the Impact of Additional Evidence",
  "Detecting Reasoning Errors",
  "Matching Arguments",
  "Applying Principles",
] as const

export const taraProblemSolvingTypes = [
  "Relevant Selection",
  "Finding Procedures",
  "Identifying Similarity",
] as const

export type TaraCriticalThinkingType = typeof taraCriticalThinkingTypes[number]
export type TaraProblemSolvingType = typeof taraProblemSolvingTypes[number]
export type TaraQuestionType = TaraCriticalThinkingType | TaraProblemSolvingType | "Other"

function normalise(text: string) {
  return text.toLowerCase().replace(/[−–—]/g, "-").replace(/\s+/g, " ").trim()
}

export function taraQuestionType(question: TestQuestion): TaraQuestionType {
  if (question.test !== "TARA") return "Other"
  const id = question.id
  const prompt = normalise(question.prompt)

  if (question.section === "Critical Thinking") {
    if (id.startsWith("tara-spec-ct-main-") || /main conclusion/.test(prompt)) return "Identifying the Main Conclusion"
    if (id.startsWith("tara-spec-ct-draw-") || /conclusion (?:can|could) be drawn|which conclusion follows/.test(prompt)) return "Drawing a Conclusion"
    if (id.startsWith("tara-spec-ct-match-") || /same (?:pattern|structure) of reasoning|matches? this reasoning/.test(prompt)) return "Matching Arguments"
    if (id.startsWith("tara-spec-ct-principle-") || /principle:|apply(?:ing|ies) the principle/.test(prompt)) return "Applying Principles"
    if (/assumption/.test(prompt) || /^upgrade-tara-ct-\d+-0$/.test(id) || id.includes("-assume-")) return "Identifying an Assumption"
    if (/strengthen|weaken|additional (?:fact|evidence)|impact of.*evidence/.test(prompt) || /^upgrade-tara-ct-\d+-1$/.test(id) || /-(?:strengthen|weaken)-/.test(id)) return "Assessing the Impact of Additional Evidence"
    if (/flaw|reasoning error|error in (?:the )?reasoning/.test(prompt) || id.includes("-flaw-")) return "Detecting Reasoning Errors"
  }

  if (question.section === "Problem Solving") {
    if (id.startsWith("tara-spec-ps-select-")) return "Relevant Selection"
    if (id.startsWith("tara-spec-ps-similar-")) return "Identifying Similarity"
    return "Finding Procedures"
  }

  return "Other"
}

function optionKey(text: string) {
  return normalise(text).replace(/[“”‘’]/g, "")
}

function numericRendering(text: string) {
  const match = text.trim().match(/^([^\d-]*)(-?\d+(?:\.\d+)?)(.*)$/)
  if (!match) return null
  return {
    prefix: match[1],
    value: Number(match[2]),
    decimals: match[2].includes(".") ? match[2].split(".")[1].length : 0,
    suffix: match[3],
  }
}

function fifthNumericDistractor(question: TestQuestion) {
  const correct = question.options[question.answer]
  const parsed = numericRendering(correct)
  if (!parsed || !Number.isFinite(parsed.value)) return null
  const used = new Set(question.options.map(optionKey))
  const base = parsed.value
  const magnitude = parsed.decimals ? Math.max(10 ** -parsed.decimals, Math.abs(base) * 0.08) : Math.max(1, Math.round(Math.abs(base) * 0.12))
  const offsets = [1, -1, 2, -2, 3, -3, 4, -4, 5]
  for (const multiplier of offsets) {
    const candidateValue = base + magnitude * multiplier
    const renderedValue = parsed.decimals ? candidateValue.toFixed(parsed.decimals) : String(Math.round(candidateValue))
    const candidate = `${parsed.prefix}${renderedValue}${parsed.suffix}`
    if (!used.has(optionKey(candidate))) return candidate
  }
  return null
}

function fifthCriticalThinkingDistractor(question: TestQuestion) {
  const type = taraQuestionType(question)
  if (type === "Identifying an Assumption") {
    return "That the outcome was measured consistently enough for the reported comparison to be meaningful, even if this is not the assumption linking the reasons to the conclusion."
  }
  if (type === "Assessing the Impact of Additional Evidence") {
    return "Evidence that the same outcome was recorded with a consistent measurement method, without addressing the competing explanation on which the conclusion depends."
  }
  if (type === "Detecting Reasoning Errors") {
    return "It may overstate the practical importance of the observed difference, even though this is not the central logical gap in the inference."
  }
  if (type === "Identifying the Main Conclusion") {
    return "A supporting consideration from the passage is itself the claim the author ultimately wants the reader to accept."
  }
  if (type === "Drawing a Conclusion") {
    return "A stronger claim than the evidence warrants could be true, but it cannot be inferred from the information supplied."
  }
  if (type === "Matching Arguments") {
    return "An argument using similar subject matter but reversing the logical direction of the original inference."
  }
  if (type === "Applying Principles") {
    return "An action that pursues a similar goal but fails one of the conditions stated in the principle."
  }
  return "A consideration that is relevant to the topic but does not answer the precise reasoning task posed."
}

export function ensureTaraFiveOptions(question: TestQuestion): TestQuestion {
  if (question.test !== "TARA") return question
  if (question.options.length === 5) return question
  if (question.options.length !== 4 || question.answer < 0 || question.answer >= 4) {
    throw new Error(`TARA question ${question.id} cannot be converted safely from ${question.options.length} options.`)
  }

  const extra = question.section === "Problem Solving"
    ? fifthNumericDistractor(question) ?? "The information given is insufficient to determine a unique result."
    : fifthCriticalThinkingDistractor(question)

  const existing = new Set(question.options.map(optionKey))
  if (existing.has(optionKey(extra))) throw new Error(`TARA fifth option duplicates an existing option for ${question.id}.`)
  return { ...question, options: [...question.options, extra] }
}

export type TaraFormatIssue = { severity: "blocking" | "warning"; code: string; message: string }

export function auditTaraFiveOptionQuestion(question: TestQuestion) {
  const issues: TaraFormatIssue[] = []
  const add = (severity: TaraFormatIssue["severity"], code: string, message: string) => issues.push({ severity, code, message })
  if (question.test !== "TARA") add("blocking", "wrong-test", "TARA format audit received a non-TARA question.")
  if (!question.prompt.trim()) add("blocking", "blank-prompt", "Question prompt is blank.")
  if (!question.explanation?.trim()) add("blocking", "blank-explanation", "Question explanation is blank.")
  if (question.options.length !== 5) add("blocking", "option-count", `Expected five TARA options but found ${question.options.length}.`)
  if (!Number.isInteger(question.answer) || question.answer < 0 || question.answer >= question.options.length) add("blocking", "answer-index", "Correct answer index is invalid.")
  if (question.options.some(option => !option.trim())) add("blocking", "blank-option", "At least one answer option is blank.")
  if (new Set(question.options.map(optionKey)).size !== question.options.length) add("blocking", "duplicate-option", "Two or more answer options are equivalent.")

  if (question.answer >= 0 && question.answer < question.options.length) {
    const correctLength = Math.max(1, question.options[question.answer].trim().length)
    const distractorLengths = question.options.filter((_, index) => index !== question.answer).map(option => Math.max(1, option.trim().length))
    const longestDistractor = Math.max(1, ...distractorLengths)
    if (correctLength >= longestDistractor * 1.6 && correctLength - longestDistractor >= 14) {
      add("warning", "correct-length-clue", "Correct answer is conspicuously longer than all four distractors.")
    }
  }

  if (question.explanation.trim().length < 28) add("warning", "thin-explanation", "Explanation is too short to justify the answer robustly.")
  if (taraQuestionType(question) === "Other") add("warning", "unclassified-tara-type", "Question is not mapped to an official TARA reasoning type.")

  let score = 100
  for (const issue of issues) score -= issue.severity === "blocking" ? 45 : issue.code === "correct-length-clue" ? 14 : 6
  score = Math.max(0, Math.min(100, score))
  return {
    score,
    issues,
    blocking: issues.filter(issue => issue.severity === "blocking"),
    warnings: issues.filter(issue => issue.severity === "warning"),
  }
}

export function taraTypeCounts(questions: TestQuestion[]) {
  const counts = new Map<string, number>()
  for (const question of questions) {
    const type = taraQuestionType(question)
    counts.set(type, (counts.get(type) ?? 0) + 1)
  }
  return counts
}

import type { TestQuestion } from "@/lib/oxbridge-data"

export type FullPaperQuestion = TestQuestion & {
  responseType?: "single" | "yes-no-statements"
  statements?: string[]
  maxMarks?: 1 | 2
}

const STATEMENT_COUNT = 5
const VALUE_MASK = (1 << STATEMENT_COUNT) - 1
const ANSWERED_SHIFT = STATEMENT_COUNT

export function isYesNoStatementQuestion(question: FullPaperQuestion): question is FullPaperQuestion & {
  responseType: "yes-no-statements"
  statements: [string, string, string, string, string]
  maxMarks: 2
} {
  return question.responseType === "yes-no-statements" && Array.isArray(question.statements) && question.statements.length === STATEMENT_COUNT
}

/**
 * Multiple-statement responses are packed into one integer so existing draft
 * persistence remains backwards-compatible:
 * - bits 0..4: Yes/No value (1 = Yes, 0 = No)
 * - bits 5..9: whether each statement has actually been answered
 */
export function statementResponse(response: number | undefined, index: number): boolean | undefined {
  if (response === undefined || index < 0 || index >= STATEMENT_COUNT) return undefined
  const answeredMask = response >> ANSWERED_SHIFT
  if ((answeredMask & (1 << index)) === 0) return undefined
  return (response & (1 << index)) !== 0
}

export function setStatementResponse(response: number | undefined, index: number, value: boolean): number {
  const current = response ?? 0
  const answeredMask = ((current >> ANSWERED_SHIFT) | (1 << index)) & VALUE_MASK
  const currentValues = current & VALUE_MASK
  const values = value ? (currentValues | (1 << index)) : (currentValues & ~(1 << index))
  return (answeredMask << ANSWERED_SHIFT) | values
}

export function questionMaxMarks(question: FullPaperQuestion) {
  return isYesNoStatementQuestion(question) ? 2 : 1
}

export function isQuestionAnswered(question: FullPaperQuestion, response: number | undefined) {
  if (!isYesNoStatementQuestion(question)) return response !== undefined
  if (response === undefined) return false
  return ((response >> ANSWERED_SHIFT) & VALUE_MASK) === VALUE_MASK
}

export function countCorrectStatements(question: FullPaperQuestion, response: number | undefined) {
  if (!isYesNoStatementQuestion(question) || response === undefined) return 0
  const answeredMask = (response >> ANSWERED_SHIFT) & VALUE_MASK
  const values = response & VALUE_MASK
  let correct = 0
  for (let index = 0; index < STATEMENT_COUNT; index++) {
    if ((answeredMask & (1 << index)) === 0) continue
    const expected = (question.answer & (1 << index)) !== 0
    const actual = (values & (1 << index)) !== 0
    if (expected === actual) correct += 1
  }
  return correct
}

export function questionRawMark(question: FullPaperQuestion, response: number | undefined) {
  if (!isYesNoStatementQuestion(question)) return response === question.answer ? 1 : 0
  if (!isQuestionAnswered(question, response)) return 0
  const correct = countCorrectStatements(question, response)
  // UCAT confirms 2 marks for a fully correct multiple-statement item and
  // 1 mark for a partially correct response. This practice implementation
  // uses the established five-statement rule: 5/5 = 2, 4/5 = 1, <=3 = 0.
  if (correct === 5) return 2
  if (correct === 4) return 1
  return 0
}

export function isQuestionFullyCorrect(question: FullPaperQuestion, response: number | undefined) {
  return questionRawMark(question, response) === questionMaxMarks(question)
}

export function statementAnswerLabel(question: FullPaperQuestion, index: number) {
  if (!isYesNoStatementQuestion(question)) return ""
  return (question.answer & (1 << index)) !== 0 ? "Yes" : "No"
}

export function validateFullPaperQuestion(question: FullPaperQuestion) {
  if (!isYesNoStatementQuestion(question)) return [] as string[]
  const issues: string[] = []
  if (question.test !== "UCAT" || question.section !== "Decision Making") issues.push("multiple-statement format is only configured for UCAT Decision Making")
  if (question.statements.length !== STATEMENT_COUNT) issues.push("must contain exactly five statements")
  if (new Set(question.statements.map(statement => statement.trim().toLowerCase())).size !== STATEMENT_COUNT) issues.push("contains duplicate statements")
  if (question.statements.some(statement => statement.trim().length < 12)) issues.push("contains an underspecified statement")
  if (!Number.isInteger(question.answer) || question.answer < 0 || question.answer > VALUE_MASK) issues.push("answer mask must encode five Yes/No keys")
  if (question.maxMarks !== 2) issues.push("multiple-statement questions must be worth two raw marks")
  return issues
}

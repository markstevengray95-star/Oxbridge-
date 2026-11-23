import test from "node:test"
import assert from "node:assert/strict"
import { assessReasoningFirst } from "../lib/interview-process-assessment.ts"

const one = (answer, overrides = {}) => ({
  question: "Explain your approach to the unfamiliar problem.",
  answer,
  classification: "partial",
  reasoning: 12,
  accuracy: 12,
  responsiveness: 10,
  evidence: 4,
  communication: 3,
  ...overrides,
})

test("thoughtful imperfect reasoning outranks an unsupported correct guess", () => {
  const guess = assessReasoningFirst([one("The answer is 12.", {
    classification: "responsive", reasoning: 4, accuracy: 20, responsiveness: 12, evidence: 2,
  })])
  const reasoned = assessReasoningFirst([one("I think my final value may be wrong, but I would separate the edge cases because the corners have a different number of painted faces; then test a smaller cube.", {
    classification: "incorrect", reasoning: 20, accuracy: 5, responsiveness: 12, evidence: 12,
  })])
  assert.ok(reasoned.total > guess.total, `Reasoned=${reasoned.total}, guess=${guess.total}`)
  assert.equal(guess.dimensions.find(d => d.key === "accuracy").max, 10)
  assert.equal(guess.dimensions.find(d => d.key === "reasoning").max, 30)
})

test("a justified independent revision receives more adaptability credit than one following a substantial hint", () => {
  const opening = one("I suppose it is a constant force, because it acts downward.", {
    classification: "incorrect", reasoning: 16, accuracy: 3, responsiveness: 10, evidence: 7,
  })
  const revision = one("Actually, I would revise the assumption because the enclosed mass changes. I would test the centre as a limiting case.", {
    classification: "responsive", reasoning: 24, accuracy: 18, responsiveness: 14, evidence: 14,
  })
  const independent = assessReasoningFirst([opening, { ...revision, supportLevel: 0 }])
  const coached = assessReasoningFirst([opening, { ...revision, supportLevel: 3 }])
  const adapt = result => result.dimensions.find(d => d.key === "adaptability").score
  assert.equal(adapt(independent), 25)
  assert.ok(adapt(coached) < adapt(independent))
  assert.ok(coached.total < independent.total)
  assert.equal(independent.supportedTurns, 0)
  assert.equal(coached.supportedTurns, 1)
  assert.ok(independent.observations.some(item => item.kind === "revision"))
})

test("saying actually without explaining a change receives no automatic adaptation credit", () => {
  const turns = [one("I think that is the answer."), one("Actually, a different answer.", {
    classification: "responsive", reasoning: 6, accuracy: 17, responsiveness: 12, evidence: 2,
  })]
  const result = assessReasoningFirst(turns)
  assert.equal(result.dimensions.find(d => d.key === "adaptability").score, 0)
})

test("one answer cannot provide evidence of adaptation or high-confidence whole-interview scoring", () => {
  const result = assessReasoningFirst([one("Because the mechanism changes, I would test an extreme case.", { classification: "responsive", reasoning: 25, accuracy: 20, responsiveness: 15, evidence: 15, communication: 5 })])
  assert.equal(result.dimensions.find(d => d.key === "adaptability").observed, false)
  assert.ok(result.total <= 78)
  assert.equal(result.confidence, "low")
  assert.ok(result.missingEvidence.some(item => item.includes("not observed")))
})

test("a wordy generic answer does not gain a reasoning bonus", () => {
  const factual = one("I would test the relationship because it appears inverse.", { reasoning: 20, evidence: 12 })
  const filler = one("I would test the relationship because it appears inverse. It is important to note there are many factors to consider in today's society.", { reasoning: 20, evidence: 12 })
  assert.ok(assessReasoningFirst([filler]).total < assessReasoningFirst([factual]).total)
})

test("evidence snippets are attributable and scores remain bounded", () => {
  const result = assessReasoningFirst(Array.from({ length: 7 }, (_, index) =>
    one(`Assuming the situation changes, I would test step ${index} because the relationship might fail.`, {
      classification: "responsive", reasoning: 24, accuracy: 19, responsiveness: 15, evidence: 14, communication: 5,
    })))
  assert.equal(result.confidence, "high")
  assert.ok(result.total >= 0 && result.total <= 100)
  assert.equal(result.dimensions.reduce((sum, item) => sum + item.max, 0), 100)
  assert.ok(result.observations.every(item => item.quote.includes("step") && item.turn >= 1))
})

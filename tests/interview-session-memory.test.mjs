import test from "node:test"
import assert from "node:assert/strict"
import {
  advanceInterviewSession,
  beginInterviewSession,
  interviewMemoryBrief,
  readInterviewSessionMemory,
  recordInterviewerMove,
} from "../lib/interview-session-memory.ts"

test("preserves the original problem and student revisions across many turns", () => {
  const opening = "What would happen to a ball in a tunnel through Earth?"
  let state = beginInterviewSession(opening)
  assert.equal(state.candidateTurns, 0)
  for (let i = 0; i < 30; i++) {
    const answer = i === 20
      ? "Actually, my earlier answer was wrong because the field changes inside the Earth."
      : i === 4
        ? "Assuming a uniformly dense Earth, I would start with the mass enclosed."
        : `I think step ${i} follows because of the gravitational model.`
    state = advanceInterviewSession(state, { openingProblem: opening, question: `Follow-up ${i}?`, answer })
    state = recordInterviewerMove(state, `New question ${i}?`, "challenge")
  }
  assert.equal(state.candidateTurns, 30)
  assert.equal(state.openingProblem, opening)
  assert.ok(state.evidence.some(item => item.kind === "revision"))
  assert.equal(state.evidence.length, 12)
  assert.equal(state.recentQuestions.length, 6)
  assert.match(interviewMemoryBrief(state), /earlier answer was wrong/)
})

test("tracks explicit assumptions and does not label a confident assertion as proven", () => {
  let state = beginInterviewSession("Consider a supply and demand model.")
  state = advanceInterviewSession(state, {
    openingProblem: state.openingProblem,
    question: state.openingProblem,
    answer: "Assuming fixed supply, the price would increase.",
  })
  assert.equal(state.evidence[0].kind, "assumption")
  assert.match(interviewMemoryBrief(state), /not verified facts/)
  assert.equal(state.scaffoldCount, 0)
  state = recordInterviewerMove(state, "How would elastic supply change that?", "challenge", 1)
  assert.equal(state.scaffoldCount, 1)
})

test("resets when the underlying academic problem changes", () => {
  let state = advanceInterviewSession(null, {
    openingProblem: "Problem A",
    question: "Problem A",
    answer: "Because the forces are equal.",
  })
  state = readInterviewSessionMemory(state, "Problem B")
  assert.equal(state.openingProblem, "Problem B")
  assert.equal(state.candidateTurns, 0)
  assert.deepEqual(state.evidence, [])
})

test("bounds untrusted client-provided memory", () => {
  const state = readInterviewSessionMemory({
    version: 1,
    openingProblem: "Physics",
    candidateTurns: 1000000,
    evidence: Array.from({ length: 100 }, () => ({ turn: 999999, kind: "claim", quote: "x".repeat(1000) })),
    recentQuestions: Array.from({ length: 100 }, () => "q".repeat(2000)),
    recentMoves: Array.from({ length: 100 }, () => "m".repeat(200)),
    scaffoldCount: 1000000,
  }, "Physics")
  assert.equal(state.candidateTurns, 1000)
  assert.equal(state.evidence.length, 12)
  assert.ok(state.evidence.every(item => item.quote.length <= 240))
  assert.equal(state.recentQuestions.length, 6)
  assert.equal(state.recentMoves.length, 8)
  assert.equal(state.scaffoldCount, 1000)
})

test("avoids duplicate recorded questions", () => {
  const state = beginInterviewSession("What causes the effect?")
  const next = recordInterviewerMove(state, "What causes the effect?", "clarify")
  assert.equal(next.recentQuestions.length, 1)
})

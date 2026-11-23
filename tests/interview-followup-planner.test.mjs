import test from "node:test"
import assert from "node:assert/strict"
import { planAcademicFollowUp, suitableAcademicFollowUp } from "../lib/interview-followup-planner.ts"

const base = {
  openingProblem:"A ball moves through an idealised Earth tunnel. Explain its motion.",
  currentQuestion:"What happens as the ball moves towards the centre?",
  track:"physical",
  candidateTurnCount:1,
  classification:"responsive",
  issue:"none",
  previousMoves:[],
  recentQuestions:[],
}
const follow = (answer,extra={}) => planAcademicFollowUp({...base,candidateAnswer:answer,...extra})

test("an unsupported correct guess receives a justification probe instead of approval",()=>{
  const result=follow("It reaches 12 metres.",{classification:"responsive"})
  assert.equal(result.strategy,"justify")
  assert.match(result.prompt,/specific step/i)
  assert.equal(result.preferredMove,"repair")
})

test("distinct reasoning approaches on the same opening question trigger different intellectual moves",()=>{
  const assumption=follow("Assuming constant density, the enclosed mass changes because the radius decreases.")
  const experiment=follow("I would measure acceleration as a function of position to test the predicted change.")
  const alternative=follow("However, another explanation might involve air resistance rather than only gravity because forces add.")
  assert.equal(assumption.strategy,"assumption")
  assert.equal(experiment.strategy,"prediction")
  assert.equal(alternative.strategy,"alternative")
  assert.equal(new Set([assumption.prompt,experiment.prompt,alternative.prompt]).size,3)
})

test("a genuine explicit revision prompts what changed rather than an automatic wrong-answer verdict",()=>{
  const result=follow("Actually, I would revise my earlier idea because the gravitational field is zero at the centre.",{candidateTurnCount:3})
  assert.equal(result.strategy,"revision")
  assert.match(result.prompt,/change your position/i)
})

test("uncertainty triggers one smaller academic question rather than giving the model answer",()=>{
  const result=follow("I don't know where to begin.",{classification:"vague",issue:"evasion"})
  assert.equal(result.strategy,"clarify")
  assert.ok(result.needsSupport)
  assert.doesNotMatch(result.prompt,/the answer is|gravity is/i)
})

test("an incorrect relationship is checked rather than automatically explained",()=>{
  const result=follow("Because the force increases towards the Earth's centre.",{classification:"incorrect",issue:"factual-error"})
  assert.equal(result.strategy,"verify")
  assert.match(result.prompt,/independently check/)
})

test("a capable candidate eventually receives transfer, but not at the first answer",()=>{
  const early=follow("The ball accelerates because of the net gravitational force.",{candidateTurnCount:1})
  const late=follow("The ball accelerates because of the net gravitational force.",{candidateTurnCount:6,previousMoves:["assumption","stress-test","alternative"]})
  assert.equal(early.strategy,"stress-test")
  assert.equal(late.strategy,"transfer")
})

test("the planner can generate a different followup rather than repeating the question",()=>{
  const first=follow("Assuming a uniform Earth density, the force changes because only enclosed mass counts.")
  const next=follow("Assuming a uniform Earth density, the force changes because only enclosed mass counts.",{recentQuestions:[first.prompt],candidateTurnCount:2})
  assert.notEqual(next.prompt,first.prompt)
})

test("subject families produce appropriate stress tests without requiring memorised advanced facts",()=>{
  const input={candidateTurnCount:4,previousMoves:["assumption","alternative","prediction"]}
  const math=follow("The formula works because the terms cancel when n is even.",{...input,track:"maths"})
  const history=follow("The author argues this because the passage gives one example.",{...input,track:"humanities"})
  assert.match(math.prompt,/example|invariant|counterexample/i)
  assert.match(history.prompt,/interpretation|source/i)
})

test("rejects answer revealing, multi-question, duplicated, or unrelated model fillers",()=>{
  assert.equal(suitableAcademicFollowUp("The correct answer is 12. Why?"),false)
  assert.equal(suitableAcademicFollowUp("Why? What about later?"),false)
  assert.equal(suitableAcademicFollowUp("Well done, what happens next?"),false)
  assert.equal(suitableAcademicFollowUp("What would you measure to test the claim?",["What would you measure to test the claim?"]),false)
  assert.equal(suitableAcademicFollowUp("Which assumption is most important, and how would you test it?"),true)
})

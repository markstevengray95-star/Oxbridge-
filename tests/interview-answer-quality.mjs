import fs from "node:fs"
import path from "node:path"
import ts from "typescript"
import { fileURLToPath } from "node:url"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")

function loadPureTs(relativePath) {
  const file = path.join(root, relativePath)
  const source = fs.readFileSync(file, "utf8")
  const { outputText, diagnostics = [] } = ts.transpileModule(source, {
    fileName: file,
    reportDiagnostics: true,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  })
  const errors = diagnostics.filter(diagnostic => diagnostic.category === ts.DiagnosticCategory.Error)
  if (errors.length) {
    for (const diagnostic of errors) console.error(ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"))
    process.exit(1)
  }
  const moduleShim = { exports: {} }
  new Function("exports", "module", "require", outputText)(moduleShim.exports, moduleShim, specifier => {
    throw new Error(`Unexpected runtime import in interview quality test: ${specifier}`)
  })
  return moduleShim.exports
}

const { evaluateInterviewAnswerLocally, localInterviewFollowUp } = loadPureTs("lib/interview-answer-quality.ts")

const cubeQuestion = "A large cube is painted on every outer face, then cut into 27 equal small cubes. How many small cubes have exactly two painted faces? Explain your method."
const cubeReference = "Each of the 12 edges has one non-corner cube when n=3, so the answer is 12. In general the count is 12(n-2)."
const cubeConcepts = ["edge", "corner", "twelve", "n-2", "count", "general"]

const cases = [
  {
    name: "vague non-answer",
    input: { question: cubeQuestion, answer: "It depends really.", concepts: cubeConcepts, referenceAnswer: cubeReference },
    expected: "vague",
  },
  {
    name: "confident but wrong number",
    input: { question: cubeQuestion, answer: "There are 8 cubes because the only relevant cubes are the eight corners.", concepts: cubeConcepts, referenceAnswer: cubeReference },
    expected: "incorrect",
  },
  {
    name: "relevant but under-explained answer",
    input: { question: cubeQuestion, answer: "There are 12 edge cubes.", concepts: cubeConcepts, referenceAnswer: cubeReference },
    expected: "partial",
  },
  {
    name: "responsive reasoned answer",
    input: { question: cubeQuestion, answer: "There are 12 because each of the 12 edges contributes one non-corner cube when n is 3.", concepts: cubeConcepts, referenceAnswer: cubeReference },
    expected: "responsive",
  },
  {
    name: "long but irrelevant answer",
    input: { question: cubeQuestion, answer: "Football teams often defend deeply near the end of a match and managers sometimes change formation to protect a narrow lead.", concepts: cubeConcepts, referenceAnswer: cubeReference },
    expected: "irrelevant",
  },
  {
    name: "wrong directional science claim",
    input: {
      question: "Milk is added to cup A immediately and cup B later. Which is cooler after ten minutes, and why?",
      answer: "Cup A is cooler because adding the milk early makes it lose heat faster.",
      concepts: ["temperature difference", "rate", "energy"],
      referenceAnswer: "Adding milk early lowers the temperature difference, so cup A generally loses less energy and is warmer at the end.",
    },
    expected: "incorrect",
  },
]

for (const test of cases) {
  const result = evaluateInterviewAnswerLocally(test.input)
  if (result.classification !== test.expected) {
    throw new Error(`${test.name}: expected ${test.expected}, found ${result.classification} (${result.reason})`)
  }
  if (!Number.isFinite(result.directness) || result.directness < 0 || result.directness > 100) {
    throw new Error(`${test.name}: directness should be a 0-100 score.`)
  }
  if (!Number.isInteger(result.repairDepth) || result.repairDepth < 0 || result.repairDepth > 3) {
    throw new Error(`${test.name}: repairDepth should be an integer from 0 to 3.`)
  }
}

for (const classification of ["incorrect", "vague", "irrelevant", "partial"]) {
  const test = cases.find(item => item.expected === classification)
  if (!test) continue
  const followUp = localInterviewFollowUp(test.input, "Socratic")
  if (followUp.classification !== classification || !followUp.reply.includes("?")) {
    throw new Error(`${classification}: local interviewer should preserve the classification and ask a repair question.`)
  }
}

const repeatedInput = {
  question: cubeQuestion,
  answer: "It depends because several factors matter here.",
  concepts: cubeConcepts,
  referenceAnswer: cubeReference,
  previousAnswers: ["It depends because several factors matter here."],
}
const repeated = evaluateInterviewAnswerLocally(repeatedInput)
if (repeated.classification !== "vague" || repeated.issue !== "repetition" || repeated.repairDepth < 1) {
  throw new Error(`Repeated weak answer should be flagged as repetition with repair depth; found ${JSON.stringify(repeated)}.`)
}
const repeatedFollowUp = localInterviewFollowUp(repeatedInput, "Socratic")
if (!/repeating|narrow|one concrete|single most important/i.test(repeatedFollowUp.reply)) {
  throw new Error("Repeated weak answer should trigger a narrower diagnostic rather than the same generic prompt.")
}

const contradictionInput = {
  question: "Milk is added to cup A immediately and cup B later. Which is warmer after ten minutes, and why?",
  answer: "Cup A will be cooler because it loses heat more quickly.",
  concepts: ["temperature", "energy", "rate"],
  previousAnswers: ["Cup A will be warmer because adding the milk early reduces the temperature difference."],
}
const contradiction = evaluateInterviewAnswerLocally(contradictionInput)
if (contradiction.classification !== "partial" || contradiction.issue !== "contradiction") {
  throw new Error(`Unacknowledged reversal should be tested as a contradiction, found ${JSON.stringify(contradiction)}.`)
}
const contradictionFollowUp = localInterviewFollowUp(contradictionInput, "Socratic")
if (!/different|changed|two claims|earlier/i.test(contradictionFollowUp.reply)) {
  throw new Error("Contradictory answer should prompt the candidate to explain the changed position.")
}

const revisionInput = {
  question: "Milk is added to cup A immediately and cup B later. Which is warmer after ten minutes, and why?",
  answer: "Actually, I would revise my earlier answer: cup A will be warmer because adding the milk early reduces the temperature difference and therefore the rate of heat loss.",
  concepts: ["temperature difference", "energy", "rate"],
  referenceAnswer: "Adding milk early lowers the temperature difference, so cup A generally loses less energy and is warmer at the end.",
  previousAnswers: ["Cup A will be cooler because adding the milk early makes it lose heat faster."],
}
const revision = evaluateInterviewAnswerLocally(revisionInput)
if (revision.classification !== "responsive" || revision.issue !== "none") {
  throw new Error(`Explicit justified revision should remain academically responsive, found ${JSON.stringify(revision)}.`)
}

const buzzwordInput = {
  question: "Why does increasing temperature usually increase the rate of a chemical reaction?",
  answer: "Activation energy, collision theory, kinetic energy, particle distributions, successful collisions and Maxwell-Boltzmann ideas are all relevant concepts that scientists use when discussing reactions in chemistry.",
  concepts: ["activation energy", "collision theory", "kinetic energy"],
}
const buzzword = evaluateInterviewAnswerLocally(buzzwordInput)
if (buzzword.classification !== "vague" || buzzword.issue !== "unsupported") {
  throw new Error(`Technical vocabulary without a direct reasoning chain should not count as responsive, found ${JSON.stringify(buzzword)}.`)
}

const wrongUnit = evaluateInterviewAnswerLocally({
  question: "Calculate the speed of the object from the data and give the value with a unit.",
  answer: "The result is 5 m because distance divided by time gives the speed.",
  concepts: ["speed", "distance", "time"],
  referenceAnswer: "Using speed = distance/time gives a result of 5 m/s.",
})
if (wrongUnit.classification !== "incorrect" || wrongUnit.issue !== "factual-error") {
  throw new Error(`Correct number with the wrong physical unit must be incorrect, found ${JSON.stringify(wrongUnit)}.`)
}

const roundedValue = evaluateInterviewAnswerLocally({
  question: "Calculate the speed of the object and explain your calculation.",
  answer: "The result is about 3.3 m/s because I divide the distance by the elapsed time.",
  concepts: ["speed", "distance", "time"],
  referenceAnswer: "The result is 3.33 m/s from distance divided by time.",
})
if (roundedValue.classification === "incorrect") {
  throw new Error(`Sensible rounding should not be marked incorrect, found ${JSON.stringify(roundedValue)}.`)
}

const intermediateNumbers = evaluateInterviewAnswerLocally({
  question: cubeQuestion,
  answer: "There are 27 small cubes in total, but exactly 12 have two painted faces because each edge contributes one non-corner cube.",
  concepts: cubeConcepts,
  referenceAnswer: cubeReference,
})
if (intermediateNumbers.classification === "incorrect") {
  throw new Error(`Intermediate numbers must not be confused with the candidate's final claim, found ${JSON.stringify(intermediateNumbers)}.`)
}

const wrongProportionality = evaluateInterviewAnswerLocally({
  question: "How does resistance depend on cross-sectional area for a wire of fixed material and length? Explain the relationship.",
  answer: "Resistance is directly proportional to cross-sectional area, so making the wire thicker increases the resistance.",
  concepts: ["resistance", "cross-sectional area", "resistivity"],
  referenceAnswer: "Resistance is inversely proportional to cross-sectional area, so increasing area decreases resistance when length and material are fixed.",
})
if (wrongProportionality.classification !== "incorrect") {
  throw new Error(`Reversing a proportional relationship should be caught as incorrect, found ${JSON.stringify(wrongProportionality)}.`)
}

const correctEquivalent = evaluateInterviewAnswerLocally({
  question: "Calculate the probability and justify your answer.",
  answer: "The result is 1/2 because there are two equally likely outcomes and one is favourable.",
  concepts: ["probability", "outcomes"],
  referenceAnswer: "The answer is 0.5 because one of the two equally likely outcomes is favourable.",
})
if (correctEquivalent.classification === "incorrect") {
  throw new Error(`Equivalent fractional and decimal answers should not be treated as a numerical conflict, found ${JSON.stringify(correctEquivalent)}.`)
}

const strong = evaluateInterviewAnswerLocally(cases.find(item => item.name === "responsive reasoned answer").input)
if (strong.directness < 60) throw new Error(`A direct reasoned answer should receive a useful directness score; found ${strong.directness}.`)

const apiSource = fs.readFileSync(path.join(root, "app/api/interview-turn/route.ts"), "utf8")
const roomSource = fs.readFileSync(path.join(root, "app/interview-room/page.tsx"), "utf8")
const liveSource = fs.readFileSync(path.join(root, "lib/gemini/live-session-secure.ts"), "utf8")

for (const marker of [
  "incorrect, vague, irrelevant, partial, responsive",
  "If the answer is incorrect: do not praise it and do not move to a new topic",
  "Earlier candidate answers available for consistency checking",
  "repairDepth",
  "technical vocabulary is not responsive",
  "claim-level checking process",
  "suspectClaim",
  "deterministic-override",
  "sensible rounding",
]) {
  if (!apiSource.includes(marker)) throw new Error(`Shared interview API is missing accuracy rule: ${marker}`)
}
if (!roomSource.includes('fetch("/api/interview-turn"') || !roomSource.includes("referenceAnswer") || !roomSource.includes("Checking response…")) {
  throw new Error("Focused interview room is not routed through semantic answer checking.")
}
for (const marker of [
  "RESPONSIVE, PARTIAL, VAGUE, IRRELEVANT, or INCORRECT",
  "If the answer is INCORRECT",
  "If the answer is IRRELEVANT",
  "Only if the answer is RESPONSIVE",
  "Track the candidate's important claims",
  "Detect repeated unresolved answers",
  "escalating repair ladder",
]) {
  if (!liveSource.includes(marker)) throw new Error(`Gemini Live instructions are missing conversation-aware answer-quality gate: ${marker}`)
}

console.log("PASS: interview modes catch wrong values, units, directions and proportional relationships; tolerate sensible rounding/equivalent forms; reject unsupported fluency; and preserve contradiction/repetition repair behaviour.")

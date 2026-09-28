import fs from "node:fs"
import path from "node:path"
import ts from "typescript"
import { fileURLToPath } from "node:url"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")

function transpile(relativePath) {
  const file = path.join(root, relativePath)
  const source = fs.readFileSync(file, "utf8")
  const { outputText, diagnostics = [] } = ts.transpileModule(source, {
    fileName: file,
    reportDiagnostics: true,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  })
  const errors = diagnostics.filter(item => item.category === ts.DiagnosticCategory.Error)
  if (errors.length) throw new Error(errors.map(item => ts.flattenDiagnosticMessageText(item.messageText, "\n")).join("\n"))
  const moduleShim = { exports: {} }
  new Function("exports", "module", "require", outputText)(moduleShim.exports, moduleShim, specifier => {
    throw new Error(`Unexpected runtime import ${specifier} while loading ${relativePath}`)
  })
  return moduleShim.exports
}

const engine = transpile("lib/interview-questioning-engine.ts")
const {
  chooseInterviewMove,
  buildLocalInterviewMove,
  hintLevelFor,
  adaptInterviewLevel,
  adaptiveChallengeDescriptor,
  interviewQuestioningFeatures,
} = engine

const responsive = classification => ({ classification, issue: "none" })

if (chooseInterviewMove({ ...responsive("responsive"), moveHistory: [] }) !== "assumption") {
  throw new Error("First strong-answer branch must hunt an assumption.")
}
if (chooseInterviewMove({ ...responsive("responsive"), moveHistory: ["assumption"] }) !== "prediction") {
  throw new Error("After assumption hunting, the next strong-answer branch must require a prediction.")
}
if (chooseInterviewMove({ ...responsive("responsive"), moveHistory: ["assumption", "prediction"] }) !== "reveal") {
  throw new Error("A committed prediction must be followed by a reveal/new-information move.")
}
if (chooseInterviewMove({ ...responsive("responsive"), moveHistory: ["assumption", "prediction", "reveal"] }) !== "counterexample") {
  throw new Error("After prediction and reveal, the next branch must stress-test with a counterexample.")
}
if (chooseInterviewMove({ classification: "partial", issue: "missing-reasoning", moveHistory: ["assumption", "prediction"] }) !== "repair") {
  throw new Error("A weak answer must interrupt the deepening sequence and return to repair mode.")
}

const coreMoves = ["assumption", "prediction", "reveal", "counterexample"]
if (chooseInterviewMove({ ...responsive("responsive"), moveHistory: coreMoves, adaptiveLevel: 0, track: "physical" }) !== "whiteboard") {
  throw new Error("At normal challenge, the advanced sequence should make working visible on the whiteboard first.")
}
if (chooseInterviewMove({ ...responsive("responsive"), moveHistory: coreMoves, adaptiveLevel: 2, track: "physical" }) !== "error-diagnosis") {
  throw new Error("At high hidden challenge, error diagnosis should be brought forward before extra scaffolding.")
}
if (chooseInterviewMove({ ...responsive("responsive"), moveHistory: [...coreMoves, "whiteboard"], adaptiveLevel: 0 }) !== "representation") {
  throw new Error("After whiteboard working, the candidate should be asked to switch representation.")
}
if (chooseInterviewMove({ ...responsive("responsive"), moveHistory: [...coreMoves, "whiteboard", "representation"], adaptiveLevel: 0 }) !== "error-diagnosis") {
  throw new Error("The advanced sequence must include an error-diagnosis problem.")
}

const probes = [
  "What assumption are you making about the force?",
  "Suppose I double the mass but keep the area unchanged. What would you expect?",
  "Now imagine the drag law changes at high speed. Which part of the graph changes?",
  "Can you construct an edge case where your rule fails?",
]

const reveal = buildLocalInterviewMove({
  classification: "responsive",
  issue: "none",
  moveHistory: ["assumption", "prediction"],
  probes,
  track: "physical",
})
if (reveal.kind !== "reveal" || reveal.reveal?.kind !== "new-information" || !reveal.reveal.content) {
  throw new Error(`Reveal branch did not produce a visible new-information card: ${JSON.stringify(reveal)}`)
}

const counterexample = buildLocalInterviewMove({
  classification: "responsive",
  issue: "none",
  moveHistory: ["assumption", "prediction", "reveal"],
  probes,
  track: "physical",
})
if (counterexample.kind !== "counterexample" || counterexample.reveal?.kind !== "counterexample" || !counterexample.reply.toLowerCase().includes("survive")) {
  throw new Error(`Counterexample branch is not explicit enough: ${JSON.stringify(counterexample)}`)
}

const whiteboard = buildLocalInterviewMove({
  classification: "responsive",
  issue: "none",
  moveHistory: coreMoves,
  track: "physical",
  adaptiveLevel: 0,
})
if (whiteboard.kind !== "whiteboard" || !whiteboard.whiteboardTask?.prompt || !/graph|physical|diagram|model/i.test(whiteboard.whiteboardTask.prompt)) {
  throw new Error(`Whiteboard branch is missing a subject-relevant working task: ${JSON.stringify(whiteboard)}`)
}

const representation = buildLocalInterviewMove({
  classification: "responsive",
  issue: "none",
  moveHistory: [...coreMoves, "whiteboard"],
  track: "maths",
  adaptiveLevel: 0,
})
if (representation.kind !== "representation" || !/different form|graph|diagram|symbol/i.test(representation.reply)) {
  throw new Error(`Representation switch is not explicit enough: ${JSON.stringify(representation)}`)
}

const errorDiagnosis = buildLocalInterviewMove({
  classification: "responsive",
  issue: "none",
  moveHistory: [...coreMoves, "whiteboard", "representation"],
  track: "life",
  adaptiveLevel: 0,
})
if (errorDiagnosis.kind !== "error-diagnosis" || errorDiagnosis.reveal?.kind !== "worked-error" || !/first|correlated|caus/i.test(`${errorDiagnosis.reveal?.content} ${errorDiagnosis.reply}`)) {
  throw new Error(`Error-diagnosis branch must expose one plausible worked error: ${JSON.stringify(errorDiagnosis)}`)
}

const repairOne = buildLocalInterviewMove({
  classification: "incorrect",
  issue: "factual-error",
  moveHistory: coreMoves,
  fallbackReply: "Check the sign of your final value. What does the equation predict?",
  track: "physical",
  repairDepth: 0,
})
if (repairOne.kind !== "repair" || repairOne.hintLevel !== 1 || repairOne.reveal) {
  throw new Error(`First repair should be hint stage 1 without revealing a new challenge: ${JSON.stringify(repairOne)}`)
}

const repairThree = buildLocalInterviewMove({
  classification: "partial",
  issue: "missing-reasoning",
  moveHistory: [...coreMoves, "repair", "repair"],
  track: "physical",
  repairDepth: 2,
})
if (repairThree.kind !== "repair" || repairThree.hintLevel < 3 || !/conservation|force|energy|proportionality|relationship/i.test(repairThree.reply)) {
  throw new Error(`Repeated difficulty should escalate the hint ladder without giving the solution: ${JSON.stringify(repairThree)}`)
}

if (hintLevelFor({ moveHistory: ["repair", "repair", "repair"], repairDepth: 0 }) !== 4) {
  throw new Error("Four consecutive repair attempts should reach the maximum hint stage.")
}

const raised = adaptInterviewLevel({ current: 0, classification: "responsive", directness: 88, repairDepth: 0 })
const lowered = adaptInterviewLevel({ current: 0, classification: "incorrect", directness: 60, repairDepth: 2 })
if (raised !== 1 || lowered !== -1) throw new Error(`Hidden difficulty adaptation is not responding to performance: raised=${raised}, lowered=${lowered}.`)
if (!/Remove routine scaffolding|combine ideas|choose a method/i.test(adaptiveChallengeDescriptor(2))) {
  throw new Error("High adaptive challenge should explicitly remove scaffolding in the internal descriptor.")
}

for (const expected of [
  "dynamic-branching",
  "new-information",
  "prediction-reveal-explain",
  "counterexample-challenge",
  "assumption-hunting",
  "progressive-hint-ladder",
  "whiteboard-working",
  "representation-switching",
  "error-seeded-diagnosis",
  "invisible-difficulty-adaptation",
]) {
  if (!interviewQuestioningFeatures.includes(expected)) throw new Error(`Missing questioning feature flag: ${expected}`)
}

const routeSource = fs.readFileSync(path.join(root, "app/api/interview-turn/route.ts"), "utf8")
for (const marker of [
  "moveHistory",
  "questionId",
  "adaptiveLevel",
  "progressive hint",
  "WHITEBOARD move",
  "REPRESENTATION move",
  "ERROR-DIAGNOSIS move",
  "hidden challenge",
  "attachQuestioningMove",
  "realisticInterviewQuestions",
]) {
  if (!routeSource.toLowerCase().includes(marker.toLowerCase())) throw new Error(`Interview API is missing advanced questioning marker: ${marker}`)
}

const componentSource = fs.readFileSync(path.join(root, "components/realistic-typed-interview.tsx"), "utf8")
for (const marker of [
  "InterviewWhiteboard",
  "adaptiveLevel",
  "whiteboardTask",
  "Progressive four-step hints",
  "Representation switching",
  "Error-diagnosis problems",
  "Invisible difficulty adaptation",
]) {
  if (!componentSource.includes(marker)) throw new Error(`Typed interview UI is missing advanced questioning marker: ${marker}`)
}

const whiteboardSource = fs.readFileSync(path.join(root, "components/interview-whiteboard.tsx"), "utf8")
for (const marker of ["Interview whiteboard", "onPointerDown", "Undo", "Clear", "The drawing itself is not scored"]) {
  if (!whiteboardSource.includes(marker)) throw new Error(`Interview whiteboard is missing interaction marker: ${marker}`)
}

console.log("PASS: interview questioning now includes progressive hints, whiteboard working, representation switching, error diagnosis and invisible difficulty adaptation on top of the existing adaptive branches.")

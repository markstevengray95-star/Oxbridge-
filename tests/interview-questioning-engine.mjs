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
const { chooseInterviewMove, buildLocalInterviewMove, interviewQuestioningFeatures } = engine

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

const repair = buildLocalInterviewMove({
  classification: "incorrect",
  issue: "factual-error",
  moveHistory: ["assumption", "prediction", "reveal"],
  fallbackReply: "Check the sign of your final value. What does the equation predict?",
})
if (repair.kind !== "repair" || repair.reveal) throw new Error("Repair branch must not reveal a new challenge before the current error is repaired.")

for (const expected of ["dynamic-branching", "new-information", "prediction-reveal-explain", "counterexample-challenge", "assumption-hunting"]) {
  if (!interviewQuestioningFeatures.includes(expected)) throw new Error(`Missing questioning feature flag: ${expected}`)
}

const routeSource = fs.readFileSync(path.join(root, "app/api/interview-turn/route.ts"), "utf8")
for (const marker of [
  "moveHistory",
  "questionId",
  "Prepared tutor probes",
  "required next academic move",
  "ASSUMPTION move",
  "PREDICTION move",
  "REVEAL move",
  "COUNTEREXAMPLE move",
  "revealContent",
  "attachQuestioningMove",
]) {
  if (!routeSource.includes(marker)) throw new Error(`Interview API is missing adaptive questioning marker: ${marker}`)
}

const componentSource = fs.readFileSync(path.join(root, "components/realistic-typed-interview.tsx"), "utf8")
for (const marker of [
  "setMoveHistory",
  "questionId: base.id",
  "probes: base.probes",
  "moveHistory,",
  "turn.reveal",
  "Prediction → reveal → explain",
  "Generated counterexamples",
  "Assumption hunting",
]) {
  if (!componentSource.includes(marker)) throw new Error(`Typed interview UI is missing adaptive questioning marker: ${marker}`)
}

console.log("PASS: adaptive interview branching enforces repair, assumption hunting, prediction, new-information reveal and counterexample challenge, with state persisted through the typed interview UI.")

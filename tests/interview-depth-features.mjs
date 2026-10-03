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

const features = transpile("lib/interview-depth-features.ts")
const {
  deepChainStage,
  deepChainInstruction,
  applicationLaunchQuestion,
  courseInterviewProfile,
  panelInterviewer,
  recoverySignal,
  interviewNextFiveFeatures,
} = features

const expectedStages = [[1, "establish"], [3, "probe"], [5, "destabilise"], [7, "transfer"], [9, "synthesise"]]
for (const [turns, expected] of expectedStages) {
  const actual = deepChainStage(turns)
  if (actual !== expected) throw new Error(`Deep-chain stage ${turns} should be ${expected}, got ${actual}`)
  if (!deepChainInstruction(turns)?.trim()) throw new Error(`Deep-chain stage ${expected} has no instruction`)
}

const launch = applicationLaunchQuestion({
  books: "I read an article arguing that scientific models are useful even when their assumptions are unrealistic, and I disagreed with part of its conclusion.",
}, "Physics")
if (!launch?.prompt.includes("scientific models") || !launch.followUpRule.toLowerCase().includes("rehearsed")) {
  throw new Error(`Application launch did not use saved academic context and push beyond rehearsed material: ${JSON.stringify(launch)}`)
}

const statementLaunch = applicationLaunchQuestion({
  personalStatement: "I became interested in scientific modelling because idealised models can produce accurate predictions despite assumptions that are visibly unrealistic. However, I think their value depends on knowing which approximation is doing the explanatory work.",
  books: "This fallback book should not be selected when a substantive personal statement is available.",
}, "Physics")
if (statementLaunch?.source !== "personal statement" || !statementLaunch.prompt.includes("scientific modelling")) {
  throw new Error(`Personal-statement launch should take priority and select an academic claim: ${JSON.stringify(statementLaunch)}`)
}

const physics = courseInterviewProfile("Physics", "physical")
const law = courseInterviewProfile("Law", "law")
if (physics.family === law.family) throw new Error("Course-specific engines must differ across subject families")
if (physics.interviewerA === physics.interviewerB || law.interviewerA === law.interviewerB) {
  throw new Error("Each course engine must give Interviewer A and B genuinely different academic roles")
}
if (!physics.priorities.some(item => /mechanism|estimation|units/i.test(item))) throw new Error("Physics engine lacks physical-science priorities")
if (!law.priorities.some(item => /rule|counterexample|fact/i.test(item))) throw new Error("Law engine lacks law-specific priorities")

const a = panelInterviewer(0, physics)
const b = panelInterviewer(1, physics)
if (a.label !== "Interviewer A" || b.label !== "Interviewer B" || a.role === b.role) {
  throw new Error(`Panel roles are not alternating distinctly: ${JSON.stringify({ a, b })}`)
}

const flat = recoverySignal(["responsive", "responsive"])
const recovered = recoverySignal(["incorrect", "responsive"])
const partialRecovery = recoverySignal(["vague", "partial", "responsive"])
const lightHintRecovery = recoverySignal([
  { classification: "incorrect" },
  { classification: "responsive", hintLevel: 1 },
])
const heavyHintRecovery = recoverySignal([
  { classification: "incorrect" },
  { classification: "responsive", hintLevel: 4 },
])
if (recovered.strongRecoveries !== 1 || recovered.score <= flat.score) {
  throw new Error(`Strong recovery should produce positive recovery evidence without erasing the earlier miss: ${JSON.stringify({ flat, recovered })}`)
}
if (partialRecovery.recoveries < 1) throw new Error("Partial-to-responsive recovery was not detected")
if (lightHintRecovery.independentRecoveries !== 1 || lightHintRecovery.score <= heavyHintRecovery.score) {
  throw new Error(`Recovery after light prompting should carry more independence evidence than recovery after a stage-4 hint: ${JSON.stringify({ lightHintRecovery, heavyHintRecovery })}`)
}
if (heavyHintRecovery.supportedRecoveries !== 1 || heavyHintRecovery.score <= flat.score) {
  throw new Error(`Recovery after substantial support should still count as positive recovery evidence: ${JSON.stringify({ flat, heavyHintRecovery })}`)
}

for (const expected of [
  "deep-follow-up-chains",
  "application-launch-questions",
  "two-interviewer-behaviour",
  "course-specific-engines",
  "intellectual-recovery-scoring",
]) {
  if (!interviewNextFiveFeatures.includes(expected)) throw new Error(`Missing next-five feature flag: ${expected}`)
}

const componentSource = fs.readFileSync(path.join(root, "components/advanced-interview-experience.tsx"), "utf8")
for (const marker of [
  "APPLICATION_KEY",
  "applicationLaunchQuestion",
  "deepChainInstruction",
  "deepChainStage",
  "panelInterviewer",
  "courseInterviewProfile",
  "recoverySignal",
  "panelMode",
  "interviewerRole",
  "otherInterviewer",
  "applicationLaunch",
  "Recovery",
]) {
  if (!componentSource.includes(marker)) throw new Error(`Advanced interview UI is missing integration marker: ${marker}`)
}

const statementSource = fs.readFileSync(path.join(root, "app/personal-statement-defence/page.tsx"), "utf8")
for (const marker of ["PERSONAL_STATEMENT_KEY", "APPLICATION_KEY", "personalStatement:text"]) {
  if (!statementSource.includes(marker)) throw new Error(`Personal statement defence is not feeding interview launch context: ${marker}`)
}

const aiPage = fs.readFileSync(path.join(root, "app/ai-interview/page.tsx"), "utf8")
const roomPage = fs.readFileSync(path.join(root, "app/interview-room/page.tsx"), "utf8")
const liveComponent = fs.readFileSync(path.join(root, "components/gemini-live-interview-experience.tsx"), "utf8")
if (!aiPage.includes("GeminiLiveInterviewExperience")) throw new Error("AI Interview is not using the Gemini Live primary interview experience")
if (!liveComponent.includes("AdvancedInterviewExperience") || !liveComponent.includes("switchToFallback")) {
  throw new Error("Gemini Live interview must retain the advanced interview experience as its compatible fallback")
}
if (!roomPage.includes("AdvancedInterviewExperience")) throw new Error("Interview Room is not using the advanced interview experience")

const routeSource = fs.readFileSync(path.join(root, "app/api/interview-turn/route.ts"), "utf8")
for (const marker of [
  "panelMode",
  "interviewerRole",
  "otherInterviewer",
  "Behave like a genuinely different academic",
  "courseInterviewProfile",
  "deepChainInstruction",
  "deepChainStage",
  "panelInterviewer",
  "courseProfile",
  "responseMetadata",
]) {
  if (!routeSource.includes(marker)) throw new Error(`Interview API is missing server-side depth marker: ${marker}`)
}

console.log("PASS: deep interview chains, personal-statement launches, two-academic panels, course-specific engines and hint-aware intellectual recovery diagnostics are preserved across the advanced interview route and Gemini Live primary mode with an advanced fallback, with server-side depth enforcement.")

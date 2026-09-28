import fs from "node:fs"
import path from "node:path"
import ts from "typescript"
import { fileURLToPath } from "node:url"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")

function transpile(relativePath, modules = {}) {
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
    if (specifier in modules) return modules[specifier]
    throw new Error(`Unexpected runtime import ${specifier} while loading ${relativePath}`)
  })
  return moduleShim.exports
}

const replay = transpile("lib/mistake-replay.ts")
const trajectory = transpile("lib/learning-trajectory.ts", { "@/lib/mistake-replay": replay })
const progression = transpile("lib/interview-progression.ts")

const now = new Date("2026-09-28T12:00:00.000Z")
const summary = trajectory.buildLearningTrajectory({
  now,
  examAttempts: [
    { id: "e1", questionId: "q1", test: "TMUA", section: "Mathematical reasoning", prompt: "Which equation must hold?", correct: false, confidence: 55, answerChanges: 0, flagged: false, timeSpentSeconds: 60, createdAt: "2026-09-01T12:00:00.000Z" },
    { id: "e2", questionId: "q2", test: "TMUA", section: "Mathematical reasoning", prompt: "Which equation must hold in this transformed case?", correct: true, confidence: 82, reasoningNote: "Define x, form the equation, then check the boundary case and interpret the result.", answerChanges: 0, flagged: false, timeSpentSeconds: 70, createdAt: "2026-09-26T12:00:00.000Z" },
  ],
  targetedAttempts: [
    { id: "t1", targetId: "target-1", questionId: "transfer-1", prompt: "Transfer the structure", answer: "reasoning", classification: "secure", feedback: "secure", nextStep: "far transfer", skill: "Mathematical structure", source: "exam", round: 3, contextShift: "far-transfer context", createdAt: "2026-09-27T12:00:00.000Z" },
  ],
  progress: {},
})

const maths = summary.skills.find(item => item.skill === "Mathematical structure")
if (!maths) throw new Error("Mathematical structure trajectory was not created")
if (maths.mastery < 65) throw new Error(`Recent secure evidence should lift mastery, got ${maths.mastery}`)
if (maths.sourceCount < 2) throw new Error("Cross-context evidence should include exam and targeted practice")
if (summary.evidenceCount !== 3) throw new Error(`Expected 3 evidence points, got ${summary.evidenceCount}`)

const challenge = progression.recommendInterviewDifficulty([81, 84, 86])
if (challenge.recommendedDifficulty !== "Challenge") throw new Error("Consistently strong interviews should recommend Challenge")
const foundation = progression.recommendInterviewDifficulty([52, 54])
if (foundation.recommendedDifficulty !== "Foundation") throw new Error("Repeated weak interviews should recommend Foundation")
const first = progression.recommendInterviewDifficulty([])
if (first.recommendedDifficulty !== "Stretch") throw new Error("First interview should default to Stretch")
const ordered = progression.prioritiseUnseenQuestions([{id:"a"},{id:"b"},{id:"c"}], ["a","b"], 0)
if (ordered[0]?.id !== "c") throw new Error("Unseen interview questions should be prioritised")

const verifyRoute = fs.readFileSync(path.join(root, "app/api/question-verify/route.ts"), "utf8")
for (const marker of ["formal", "adversarial", "consensus", "independentAnswers", "solver roles disagreed"]) {
  if (!verifyRoute.includes(marker)) throw new Error(`Question verification is missing ${marker}`)
}
const mutateRoute = fs.readFileSync(path.join(root, "app/api/question-mutate/route.ts"), "utf8")
for (const marker of ["independentSolve", "adversarial", "consensus", "dual independent solution consensus"]) {
  if (!mutateRoute.includes(marker)) throw new Error(`Question mutation is missing ${marker}`)
}
const dashboard = fs.readFileSync(path.join(root, "components/learning-trajectory-dashboard.tsx"), "utf8")
for (const marker of ["Spaced retest queue", "Recommended next session", "High-confidence", "/targeted-practice"]) {
  if (!dashboard.includes(marker)) throw new Error(`Learning trajectory dashboard is missing ${marker}`)
}
const targeted = fs.readFileSync(path.join(root, "app/targeted-practice/page.tsx"), "utf8")
for (const marker of ["skill: target.skill", "contextShift: question.contextShift", "/learning-trajectory"]) {
  if (!targeted.includes(marker)) throw new Error(`Targeted practice history is missing ${marker}`)
}

console.log("PASS: cross-session mastery, spaced retest scheduling, interview progression and dual-solver question verification are integrated.")

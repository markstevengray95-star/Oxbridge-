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

const tree = transpile("lib/interview-question-tree.ts")
if (tree.availableInterviewBranchCount() !== 22) throw new Error(`Expected 22 interview branch types, got ${tree.availableInterviewBranchCount()}`)
const strongBranch = tree.selectInterviewTreeNode({
  track: "physical",
  question: "Explain the model.",
  answer: "I think the speed rises because the resultant force is initially positive, but I would test the drag assumption.",
  classification: "responsive",
  issue: "none",
  candidateTurnCount: 2,
  previousNodeIds: ["assumption"],
  probes: ["Now double the mass. What changes?"],
})
if (strongBranch.phase === "repair") throw new Error("Responsive answer was incorrectly routed into repair")
const repairBranch = tree.selectInterviewTreeNode({
  track: "maths",
  question: "Justify the conclusion.",
  answer: "I am not sure.",
  classification: "vague",
  issue: "evasion",
  candidateTurnCount: 1,
  previousNodeIds: [],
  probes: [],
})
if (repairBranch.id !== "repair-commit") throw new Error(`Expected repair-commit, got ${repairBranch.id}`)

const rubric = transpile("lib/interview-evidence-rubric.ts")
const mockTurns = [
  { role: "interviewer", text: "What is your method?" },
  { role: "candidate", text: "First I would separate the cases because the condition changes at the boundary, then I would test an extreme case." },
  { role: "interviewer", text: "Suppose that assumption is false. What changes?" },
  { role: "candidate", text: "On reflection I would revise the second step. The first relationship still holds, but I would compare the limiting case before concluding." },
]
const mockAssessments = [
  { question: "What is your method?", answer: mockTurns[1].text, classification: "responsive", issue: "none", directness: 88, reasoning: 23, accuracy: 18, responsiveness: 14, evidence: 13, communication: 5, notes: [] },
  { question: "Suppose that assumption is false. What changes?", answer: mockTurns[3].text, classification: "responsive", issue: "none", directness: 91, reasoning: 24, accuracy: 18, responsiveness: 14, evidence: 13, communication: 5, notes: [] },
]
const profile = rubric.buildInterviewEvidenceProfile({ turns: mockTurns, marking: { total: 90, reasoning: 24, accuracy: 18, responsiveness: 14, adaptability: 18, evidence: 13, communication: 5, error: "No dominant issue", band: "Exceptional practice", strengths: [], next: [], typedAnswers: 2, rubricVersion: "2026.3", turnAssessments: mockAssessments } })
if (profile.dimensions.length !== 9) throw new Error(`Expected nine evidence dimensions, got ${profile.dimensions.length}`)
if (!profile.dimensions.every(item => Array.isArray(item.evidence))) throw new Error("Evidence rubric dimensions must expose transcript evidence arrays")

const practice = transpile("lib/feedback-practice.ts")
const target = practice.targetFromExamMistake({ id: "paper:q1", sourceId: "paper", test: "TMUA", section: "Logic and proof", skill: "Logic & deduction", prompt: "Old prompt", previousAnswer: "A", correctAnswer: "B", date: new Date().toISOString(), severity: "missed" })
const localQuestion = practice.localPracticePrompt(target, 3)
if (!localQuestion.prompt || localQuestion.contextShift !== "far-transfer context") throw new Error("Targeted practice did not create a far-transfer question")
if (localQuestion.prompt.includes("Old prompt")) throw new Error("Targeted practice copied the original prompt")

const turnRoute = fs.readFileSync(path.join(root, "app/api/reasoning-interview-turn/route.ts"), "utf8")
for (const marker of ["selectInterviewTreeNode", "branchCount: 22", "Stay on the SAME underlying problem", "Cache-Control"]) {
  if (!turnRoute.includes(marker)) throw new Error(`Reasoning interview route is missing ${marker}`)
}

const adjudication = fs.readFileSync(path.join(root, "app/api/interview-adjudicate/route.ts"), "utf8")
for (const marker of ["Independent marker A", "Independent marker B", "final adjudicator", "markerAgreement", "applyAdjudication", "buildInterviewEvidenceProfile"]) {
  if (!adjudication.toLowerCase().includes(marker.toLowerCase())) throw new Error(`Adjudication route is missing ${marker}`)
}

const studio = fs.readFileSync(path.join(root, "components/reasoning-interview-experience.tsx"), "utf8")
for (const marker of ["Nine-dimension reasoning evidence", "Practise this weakness", "/api/interview-adjudicate", "/api/reasoning-interview-turn", "Question-tree path"]) {
  if (!studio.includes(marker)) throw new Error(`Reasoning Interview Studio is missing ${marker}`)
}

const targeted = fs.readFileSync(path.join(root, "app/targeted-practice/page.tsx"), "utf8")
for (const marker of ["Feedback → practice loop", "/api/targeted-practice", "Test transfer again", "far-transfer"]) {
  if (!targeted.includes(marker)) throw new Error(`Targeted practice page is missing ${marker}`)
}

const replay = fs.readFileSync(path.join(root, "app/mistake-replay/page.tsx"), "utf8")
if (!replay.includes("targetFromExamMistake") || !replay.includes("Practise this weakness in a new context")) throw new Error("Exam mistake replay is not connected to targeted transfer practice")

const hub = fs.readFileSync(path.join(root, "app/interviews/page.tsx"), "utf8")
if (!hub.includes("/reasoning-interview") || !hub.includes("22-branch reasoning engine")) throw new Error("Interview Hub does not expose the new reasoning interview mode")

console.log("PASS: branching interviews, evidence rubric, dual-marker adjudication and feedback-to-practice loop are integrated.")

import fs from "node:fs"
import path from "node:path"
import ts from "typescript"
import { fileURLToPath } from "node:url"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const cache = new Map()

function load(relativePath) {
  const normalized = relativePath.endsWith(".ts") ? relativePath : `${relativePath}.ts`
  if (cache.has(normalized)) return cache.get(normalized).exports
  const file = path.join(root, normalized)
  const source = fs.readFileSync(file, "utf8")
  const { outputText, diagnostics = [] } = ts.transpileModule(source, {
    fileName: file,
    reportDiagnostics: true,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  })
  const errors = diagnostics.filter(item => item.category === ts.DiagnosticCategory.Error)
  if (errors.length) throw new Error(errors.map(item => ts.flattenDiagnosticMessageText(item.messageText, "\n")).join("\n"))
  const moduleShim = { exports: {} }
  cache.set(normalized, moduleShim)
  new Function("exports", "module", "require", outputText)(moduleShim.exports, moduleShim, specifier => {
    if (specifier.startsWith("@/")) return load(specifier.slice(2))
    throw new Error(`Unexpected runtime import ${specifier} while loading ${normalized}`)
  })
  return moduleShim.exports
}

const exam = load("lib/exam-intelligence")
const reasoning = exam.scoreReasoningProcess("Let x represent the unknown. Assume resistance is constant, use V = IR, then check the units and consider the limiting case. Therefore the result should increase.")
if (reasoning.total < 70) throw new Error(`Expected strong process evidence, got ${JSON.stringify(reasoning)}`)
const cause = exam.classifyExamError({ id:"a", questionId:"q", test:"TMUA", section:"Math", prompt:"p", correct:false, confidence:90, answerChanges:0, flagged:false, timeSpentSeconds:45, createdAt:"x" })
if (cause !== "confident misconception") throw new Error(`Expected confident misconception, got ${cause}`)
const calibration = exam.confidenceCalibration([
  { id:"1",questionId:"q1",test:"TMUA",section:"Math",prompt:"p",correct:false,confidence:90,answerChanges:0,flagged:false,timeSpentSeconds:30,createdAt:"x" },
  { id:"2",questionId:"q2",test:"TMUA",section:"Math",prompt:"p",correct:true,confidence:90,answerChanges:0,flagged:false,timeSpentSeconds:30,createdAt:"x" },
])
if (calibration.highConfidenceErrors !== 1) throw new Error("High-confidence error calibration failed")
const findings = exam.auditQuestionQuality({ id:"q", prompt:"Which option is correct?", options:["A","B","This is an extremely long and conspicuously detailed correct answer that reveals itself","D"], answer:2, explanation:"The marked answer follows from the stated conditions because the decisive relationship is satisfied." })
if (!findings.some(item => item.code === "longest-answer-bias")) throw new Error("Longest-answer bias auditor did not trigger")

const lnat = load("lib/lnat-passage-intelligence")
if (lnat.lnatReasoningSkill("Which assumption must the author rely on?") !== "assumption") throw new Error("LNAT assumption classification failed")
if (lnat.lnatReasoningSkill("Which option best states the author's main conclusion?") !== "main conclusion") throw new Error("LNAT conclusion classification failed")

const meta = load("lib/interview-meta-analysis")
const report = meta.buildInterviewMetaReport([
  { role:"interviewer", text:"Why?" },
  { role:"candidate", text:"I am not sure", quality:"vague" },
  { role:"interviewer", text:"Commit to a claim", branchId:"repair-commit" },
  { role:"candidate", text:"I think it increases because the mechanism produces a larger gradient.", quality:"responsive" },
  { role:"interviewer", text:"Transfer that", branchId:"transfer-context" },
  { role:"candidate", text:"In the new context the same proportional reasoning still applies, but the variable must be reinterpreted.", quality:"responsive" },
], "Let x be the variable. Assume the model is ideal. Check units and a limiting case, then interpret the result.")
if (report.recovery.supported < 1) throw new Error(`Expected supported recovery, got ${JSON.stringify(report.recovery)}`)
if (report.recovery.transferAfterCorrection < 1) throw new Error("Expected transfer after correction")
if (report.working.score < 50) throw new Error("Working analysis did not recognise explicit method evidence")

const intervention = load("lib/interview-intervention-policy")
const hint = intervention.selectInterviewerIntervention({ classification:"incorrect", issue:"factual-error", repairDepth:3, candidateTurnCount:4, node:{id:"repair-check",phase:"repair",label:"Check",intent:"Repair",prompt:"Check",branchReason:""}, previous:["challenge","challenge"] })
if (hint.kind !== "hint") throw new Error(`Expected a narrow hint after repeated failed repairs, got ${hint.kind}`)
const hold = intervention.selectInterviewerIntervention({ classification:"responsive", issue:"none", repairDepth:0, candidateTurnCount:1, node:{id:"assumption",phase:"diagnose",label:"Assumption",intent:"Deepen",prompt:"Ask",branchReason:""}, previous:[] })
if (hold.kind !== "silence") throw new Error(`Expected early hold-back intervention, got ${hold.kind}`)

const markers = [
  ["app/api/question-mutate/route.ts", ["independently", "auditQuestionQuality", "mutationInstruction", "verified"]],
  ["app/api/question-verify/route.ts", ["WITHOUT being told", "agreesWithStoredKey", "ambiguous"]],
  ["components/exam-intelligence-lab.tsx", ["Confidence before marking", "Error DNA", "Observed difficulty calibration", "/api/question-mutate"]],
  ["components/question-quality-lab.tsx", ["Independent key check", "Structural audit", "Generate + verify"]],
  ["components/lnat-passage-intelligence.tsx", ["Passage-level practice", "confidence", "lnatPassageDiagnostic"]],
  ["components/reasoning-interview-experience-v2.tsx", ["Recovery 2.0", "Working-method analysis", "Intervention path", "Transfer after correction"]],
  ["app/api/reasoning-interview-turn/route.ts", ["selectInterviewerIntervention", "previousInterventions", "supportLevel"]],
]
for (const [relative, required] of markers) {
  const source = fs.readFileSync(path.join(root, relative), "utf8")
  for (const marker of required) if (!source.includes(marker)) throw new Error(`${relative} missing ${marker}`)
}

console.log("PASS: adaptive mutation, process marking, confidence calibration, error DNA, dynamic interventions, recovery 2.0, working analysis, independent key checks, question auditing, difficulty calibration, post-exam diagnostics and LNAT passage intelligence are integrated.")

import fs from "node:fs"
import ts from "typescript"

function loadTypeScriptModule(path) {
  const source = fs.readFileSync(new URL(path, import.meta.url), "utf8")
  const { outputText, diagnostics = [] } = ts.transpileModule(source, {
    fileName: path,
    reportDiagnostics: true,
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  })
  const errors = diagnostics.filter(diagnostic => diagnostic.category === ts.DiagnosticCategory.Error)
  if (errors.length) {
    for (const diagnostic of errors) console.error(ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"))
    process.exit(1)
  }
  const moduleShim = { exports: {} }
  const execute = new Function("exports", "module", "require", outputText)
  execute(moduleShim.exports, moduleShim, specifier => {
    throw new Error(`Unexpected runtime import while auditing questions: ${specifier}`)
  })
  return moduleShim.exports
}

const bankModule = loadTypeScriptModule("../lib/full-paper-unique-bank.ts")
const reliabilityModule = loadTypeScriptModule("../lib/question-reliability.ts")
const rawBank = bankModule.uniqueFullPaperQuestionBank
const { auditQuestionReliability, repairQuestionReliability } = reliabilityModule

if (!Array.isArray(rawBank) || !rawBank.length) throw new Error("Question bank failed to load for reliability audit.")
if (typeof auditQuestionReliability !== "function" || typeof repairQuestionReliability !== "function") throw new Error("Reliability auditor failed to load.")

const bank = rawBank.map(repairQuestionReliability)
const repairCount = bank.filter((question, index) => JSON.stringify(question.options) !== JSON.stringify(rawBank[index].options)).length
const sectionStats = new Map()
const blocking = []
const warningCounts = new Map()

for (const question of bank) {
  const audit = auditQuestionReliability(question)
  const sectionKey = `${question.test}:${question.section}`
  const row = sectionStats.get(sectionKey) ?? { count: 0, totalScore: 0, minimum: 100, low: 0, answerPositions: [0, 0, 0, 0] }
  row.count += 1
  row.totalScore += audit.score
  row.minimum = Math.min(row.minimum, audit.score)
  if (audit.score < 60) row.low += 1
  if (Number.isInteger(question.answer) && question.answer >= 0 && question.answer < 4) row.answerPositions[question.answer] += 1
  sectionStats.set(sectionKey, row)

  for (const issue of audit.blocking) blocking.push(`${question.id} [${issue.code}] ${issue.message}`)
  for (const issue of audit.warnings) warningCounts.set(issue.code, (warningCounts.get(issue.code) ?? 0) + 1)
}

if (blocking.length) {
  console.error("Blocking question reliability failures after deterministic repair:")
  blocking.slice(0, 40).forEach(issue => console.error(`- ${issue}`))
  if (blocking.length > 40) console.error(`...and ${blocking.length - 40} more`)
  process.exit(1)
}

for (const [section, row] of sectionStats) {
  const average = row.totalScore / row.count
  const maxPositionShare = Math.max(...row.answerPositions) / row.count
  if (average < 72) throw new Error(`${section} reliability average is too low: ${average.toFixed(1)}/100.`)
  if (row.low / row.count > 0.15) throw new Error(`${section} has too many low-reliability questions: ${row.low}/${row.count}.`)
  if (maxPositionShare > 0.38) throw new Error(`${section} has an answer-position imbalance: ${row.answerPositions.join("/")}.`)
  console.log(`${section}: average ${average.toFixed(1)}, minimum ${row.minimum}, positions ${row.answerPositions.join("/")}.`)
}

const warningSummary = [...warningCounts.entries()].sort((a, b) => b[1] - a[1])
console.log(`Reliability audit passed across ${bank.length} questions with zero blocking failures after ${repairCount} deterministic option repair(s).`)
if (warningSummary.length) console.log(`Quality warnings for future improvement: ${warningSummary.map(([code, count]) => `${code}=${count}`).join(", ")}`)

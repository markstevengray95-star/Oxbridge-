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
const taraFormatModule = loadTypeScriptModule("../lib/tara-question-format.ts")
const rawBank = bankModule.uniqueFullPaperQuestionBank
const { auditQuestionReliability, repairQuestionReliability } = reliabilityModule
const { ensureTaraFiveOptions } = taraFormatModule

if (!Array.isArray(rawBank) || !rawBank.length) throw new Error("Question bank failed to load for reliability audit.")
if (typeof auditQuestionReliability !== "function" || typeof repairQuestionReliability !== "function") throw new Error("Reliability auditor failed to load.")
if (typeof ensureTaraFiveOptions !== "function") throw new Error("TARA five-option normaliser failed to load.")

// This test protects the complete source/reserve bank against broken questions.
// TARA source items are normalised to the same five-option form used in production
// before structural auditing. Warning-level discrimination and answer-pattern
// quality are enforced separately on the upgraded bank and assembled live papers.
const bank = rawBank.map(raw => {
  let question = repairQuestionReliability(raw)
  if (question.test === "TARA") question = ensureTaraFiveOptions(question)
  return question
})
const repairCount = bank.filter((question, index) => JSON.stringify(question.options) !== JSON.stringify(rawBank[index].options)).length
const sectionStats = new Map()
const blocking = []
const warningCounts = new Map()
const sectionWarningCounts = new Map()

for (const question of bank) {
  const audit = auditQuestionReliability(question)
  const sectionKey = `${question.test}:${question.section}`
  const row = sectionStats.get(sectionKey) ?? { count: 0, totalScore: 0, minimum: 100 }
  row.count += 1
  row.totalScore += audit.score
  row.minimum = Math.min(row.minimum, audit.score)
  sectionStats.set(sectionKey, row)

  const sectionWarnings = sectionWarningCounts.get(sectionKey) ?? new Map()
  for (const issue of audit.blocking) blocking.push(`${question.id} [${issue.code}] ${issue.message}`)
  for (const issue of audit.warnings) {
    warningCounts.set(issue.code, (warningCounts.get(issue.code) ?? 0) + 1)
    sectionWarnings.set(issue.code, (sectionWarnings.get(issue.code) ?? 0) + 1)
  }
  sectionWarningCounts.set(sectionKey, sectionWarnings)
}

if (blocking.length) {
  console.error("Blocking source-bank reliability failures after production-format normalisation:")
  blocking.slice(0, 40).forEach(issue => console.error(`- ${issue}`))
  if (blocking.length > 40) console.error(`...and ${blocking.length - 40} more`)
  process.exit(1)
}

function warningSummaryFor(section) {
  const counts = sectionWarningCounts.get(section) ?? new Map()
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([code, count]) => `${code}=${count}`).join(", ") || "none"
}

for (const [section, row] of sectionStats) {
  const average = row.totalScore / row.count
  console.log(`${section}: source-bank average ${average.toFixed(1)}, minimum ${row.minimum}; warning profile: ${warningSummaryFor(section)}.`)
}

const warningSummary = [...warningCounts.entries()].sort((a, b) => b[1] - a[1])
console.log(`Source-bank structural audit passed across ${bank.length} questions with zero blocking failures after ${repairCount} production-format repair(s).`)
if (warningSummary.length) console.log(`Reserve-bank quality warnings (live papers are gated separately): ${warningSummary.map(([code, count]) => `${code}=${count}`).join(", ")}`)

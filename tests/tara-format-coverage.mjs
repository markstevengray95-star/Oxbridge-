import fs from "node:fs"
import path from "node:path"
import ts from "typescript"
import { fileURLToPath } from "node:url"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const cache = new Map()

function resolveModule(specifier, fromFile) {
  if (specifier.startsWith("@/")) return path.join(root, specifier.slice(2)) + (path.extname(specifier) ? "" : ".ts")
  if (specifier.startsWith(".")) {
    const resolved = path.resolve(path.dirname(fromFile), specifier)
    return resolved + (path.extname(resolved) ? "" : ".ts")
  }
  throw new Error(`Unsupported runtime import in TARA format audit: ${specifier}`)
}

function loadTs(file) {
  if (cache.has(file)) return cache.get(file).exports
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
  cache.set(file, moduleShim)
  new Function("exports", "module", "require", outputText)(moduleShim.exports, moduleShim, specifier => loadTs(resolveModule(specifier, file)))
  return moduleShim.exports
}

function promptSignature(prompt) {
  return prompt
    .toLowerCase()
    .replace(/\d+(?:\.\d+)?/g, "#")
    .replace(/[^a-z#]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

const { buildFullPaper } = loadTs(path.join(root, "lib/full-paper-system.ts"))
const {
  taraCriticalThinkingTypes,
  taraProblemSolvingTypes,
  taraQuestionType,
  taraTypeCounts,
  auditTaraFiveOptionQuestion,
} = loadTs(path.join(root, "lib/tara-question-format.ts"))
const { taraSpecificationExpansionBank } = loadTs(path.join(root, "lib/tara-spec-expansion.ts"))

if (taraSpecificationExpansionBank.length < 18) {
  throw new Error(`TARA specification expansion bank is unexpectedly small: ${taraSpecificationExpansionBank.length}.`)
}

for (const type of [
  "Identifying the Main Conclusion",
  "Drawing a Conclusion",
  "Matching Arguments",
  "Applying Principles",
  "Relevant Selection",
  "Identifying Similarity",
]) {
  const count = taraSpecificationExpansionBank.filter(question => taraQuestionType(question) === type).length
  if (count < 3) throw new Error(`TARA specification bank needs at least three ${type} questions; found ${count}.`)
}

const formPromptSets = new Map()

for (const form of [1, 2]) {
  const paper = buildFullPaper("TARA", form)
  if (paper.totalMinutes !== 120) throw new Error(`TARA Form ${form} should total 120 minutes; found ${paper.totalMinutes}.`)

  const critical = paper.sections.find(section => section.id === "critical-thinking")
  const problem = paper.sections.find(section => section.id === "problem-solving")
  const writing = paper.sections.find(section => section.id === "writing-task")

  if (!critical || critical.kind !== "mcq" || critical.durationMinutes !== 40 || critical.questions.length !== 22) {
    throw new Error(`TARA Form ${form} Critical Thinking structure is malformed.`)
  }
  if (!problem || problem.kind !== "mcq" || problem.durationMinutes !== 40 || problem.questions.length !== 22) {
    throw new Error(`TARA Form ${form} Problem Solving structure is malformed.`)
  }
  if (!writing || writing.kind !== "essay" || writing.durationMinutes !== 40 || writing.wordLimit !== 750 || writing.essayChoices?.length !== 3) {
    throw new Error(`TARA Form ${form} Writing Task structure is malformed.`)
  }

  const allMcq = [...critical.questions, ...problem.questions]
  const answerPositions = [0, 0, 0, 0, 0]
  for (const question of allMcq) {
    const audit = auditTaraFiveOptionQuestion(question)
    if (audit.blocking.length) {
      throw new Error(`TARA Form ${form} question ${question.id} fails five-option format: ${audit.blocking.map(issue => issue.code).join(", ")}.`)
    }
    if (question.options.length !== 5) throw new Error(`TARA Form ${form} question ${question.id} does not have five options.`)
    answerPositions[question.answer] += 1
  }

  for (const [index, count] of answerPositions.entries()) {
    if (count < 6 || count > 12) {
      throw new Error(`TARA Form ${form} answer position ${String.fromCharCode(65 + index)} is imbalanced: ${count}/44.`)
    }
  }

  const criticalCounts = taraTypeCounts(critical.questions)
  const missingCritical = taraCriticalThinkingTypes.filter(type => (criticalCounts.get(type) ?? 0) === 0)
  if (missingCritical.length) {
    throw new Error(`TARA Form ${form} Critical Thinking misses official question types: ${missingCritical.join(", ")}.`)
  }

  const problemCounts = taraTypeCounts(problem.questions)
  const missingProblem = taraProblemSolvingTypes.filter(type => (problemCounts.get(type) ?? 0) === 0)
  if (missingProblem.length) {
    throw new Error(`TARA Form ${form} Problem Solving misses official question types: ${missingProblem.join(", ")}.`)
  }

  const signatures = new Set(allMcq.map(question => promptSignature(question.prompt)))
  if (signatures.size !== allMcq.length) throw new Error(`TARA Form ${form} contains repeated prompt structures.`)
  formPromptSets.set(form, signatures)

  console.log(`TARA Form ${form}: A-E=${answerPositions.join("/")}; CT=${taraCriticalThinkingTypes.map(type => `${type}=${criticalCounts.get(type) ?? 0}`).join("; ")}; PS=${taraProblemSolvingTypes.map(type => `${type}=${problemCounts.get(type) ?? 0}`).join("; ")}.`)
}

const overlap = [...formPromptSets.get(1)].filter(signature => formPromptSets.get(2).has(signature))
if (overlap.length) throw new Error(`TARA Forms 1 and 2 share ${overlap.length} MCQ prompt structures.`)

console.log("PASS: both TARA forms use five-option A-E questions, cover every official reasoning type, preserve the 22/22/40-minute structure, and remain disjoint.")

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
  throw new Error(`Unsupported runtime import in UCAT DM audit: ${specifier}`)
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

const { buildFullPaper } = loadTs(path.join(root, "lib/full-paper-system.ts"))
const { isYesNoStatementQuestion, questionMaxMarks } = loadTs(path.join(root, "lib/full-paper-question.ts"))
const { ucatDmFamily } = loadTs(path.join(root, "lib/ucat-dm-coverage.ts"))

const requiredMcqFamilies = ["Logical Puzzles", "Statistical Reasoning", "Assumption Recognition", "Venn Diagrams"]
const promptSets = []

for (const form of [1, 2]) {
  const paper = buildFullPaper("UCAT", form)
  const section = paper.sections.find(item => item.id === "dm")
  if (!section || section.kind !== "mcq") throw new Error(`UCAT Form ${form} has no Decision Making section.`)
  if (section.questions.length !== 35 || section.durationMinutes !== 37) {
    throw new Error(`UCAT Form ${form} Decision Making should be 35 questions in 37 minutes; found ${section.questions.length} in ${section.durationMinutes}.`)
  }

  const statement = section.questions.filter(isYesNoStatementQuestion)
  const single = section.questions.filter(question => !isYesNoStatementQuestion(question))
  if (statement.length !== 8 || single.length !== 27) {
    throw new Error(`UCAT Form ${form} should contain 8 multiple-statement and 27 single-answer DM questions; found ${statement.length} and ${single.length}.`)
  }

  const statementCounts = new Map()
  for (const question of statement) {
    const family = ucatDmFamily(question)
    statementCounts.set(family, (statementCounts.get(family) ?? 0) + 1)
  }

  const mcqCounts = new Map()
  for (const question of single) {
    const family = ucatDmFamily(question)
    mcqCounts.set(family, (mcqCounts.get(family) ?? 0) + 1)
  }

  const syllogisms = statementCounts.get("Syllogisms") ?? 0
  const information = statementCounts.get("Information Interpretation") ?? 0
  const statementOther = statement.length - syllogisms - information
  if (syllogisms < 4 || information < 4 || statementOther !== 0) {
    throw new Error(`UCAT Form ${form} statement mix should be 4+ syllogisms and 4+ information-interpretation items with no off-format statement families; found syllogisms=${syllogisms}, information=${information}, other=${statementOther}.`)
  }

  for (const family of requiredMcqFamilies) {
    const count = mcqCounts.get(family) ?? 0
    if (count < 4) throw new Error(`UCAT Form ${form} contains only ${count} ${family} single-answer items; expected at least 4.`)
  }
  const mcqOther = mcqCounts.get("Other") ?? 0
  if (mcqOther > 3) throw new Error(`UCAT Form ${form} contains ${mcqOther} unclassified single-answer DM items; expected at most 3.`)

  const maxMarks = section.questions.reduce((sum, question) => sum + questionMaxMarks(question), 0)
  if (maxMarks !== 43) throw new Error(`UCAT Form ${form} Decision Making should expose 43 raw marks (27×1 + 8×2); found ${maxMarks}.`)

  promptSets.push(new Set(section.questions.map(question => question.prompt.trim().toLowerCase())))
  console.log(`UCAT DM Form ${form}: statements Syllogisms=${syllogisms}, Information Interpretation=${information}; MCQ ${requiredMcqFamilies.map(family => `${family}=${mcqCounts.get(family) ?? 0}`).join("; ")}; Other=${mcqOther}.`)
}

const overlap = [...promptSets[0]].filter(prompt => promptSets[1].has(prompt))
if (overlap.length) throw new Error(`UCAT DM Forms 1 and 2 share ${overlap.length} prompt(s); expected zero overlap.`)

console.log("PASS: both UCAT Decision Making forms preserve 35 questions/37 minutes, 43 raw marks, mixed response scoring and all six reported reasoning families.")

import fs from "node:fs"
import ts from "typescript"

const source = fs.readFileSync(new URL("../lib/full-paper-unique-bank.ts", import.meta.url), "utf8")
const { outputText, diagnostics = [] } = ts.transpileModule(source, {
  fileName: "full-paper-unique-bank.ts",
  reportDiagnostics: true,
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
    esModuleInterop: true,
  },
})

const errors = diagnostics.filter(diagnostic => diagnostic.category === ts.DiagnosticCategory.Error)
if (errors.length) {
  for (const diagnostic of errors) {
    console.error(ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"))
  }
  process.exit(1)
}

const moduleShim = { exports: {} }
const execute = new Function("exports", "module", "require", outputText)
execute(moduleShim.exports, moduleShim, specifier => {
  throw new Error(`Unexpected runtime import while checking question bank: ${specifier}`)
})

const bank = moduleShim.exports.uniqueFullPaperQuestionBank
if (!Array.isArray(bank) || bank.length === 0) {
  throw new Error("Unique full-paper bank did not load correctly.")
}

const normalise = prompt => prompt
  .toLowerCase()
  .replace(/\d+(?:\.\d+)?/g, "#")
  .replace(/[^a-z#]+/g, " ")
  .replace(/\s+/g, " ")
  .trim()

const required = new Map([
  ["TMUA:Applications of Mathematical Knowledge", 20],
  ["TMUA:Mathematical Reasoning", 20],
  ["ESAT:Mathematics 1", 27],
  ["ESAT:Mathematics 2", 27],
  ["ESAT:Physics", 27],
  ["ESAT:Chemistry", 27],
  ["ESAT:Biology", 27],
  ["TARA:Critical Thinking", 22],
  ["TARA:Problem Solving", 22],
  ["LNAT:Argumentative passages", 42],
  ["UCAT:Verbal Reasoning", 44],
  ["UCAT:Decision Making", 35],
  ["UCAT:Quantitative Reasoning", 36],
  ["UCAT:Situational Judgement", 69],
])

const ids = new Set()
for (const question of bank) {
  if (ids.has(question.id)) throw new Error(`Duplicate question id: ${question.id}`)
  ids.add(question.id)
  if (!Array.isArray(question.options) || question.options.length !== 4) throw new Error(`Invalid options for ${question.id}`)
  if (question.answer < 0 || question.answer >= question.options.length) throw new Error(`Invalid answer index for ${question.id}`)
  if (new Set(question.options.map(option => option.trim().toLowerCase())).size !== question.options.length) throw new Error(`Duplicate answer option in ${question.id}`)
}

for (const [key, minimum] of required) {
  const [test, section] = key.split(":")
  const questions = bank.filter(question => question.test === test && question.section === section)
  const signatures = new Set(questions.map(question => normalise(question.prompt)))
  if (signatures.size < minimum) {
    throw new Error(`${key} needs ${minimum} non-repeating prompts but only has ${signatures.size}.`)
  }
  console.log(`${key}: ${signatures.size} unique prompt structures available (needs ${minimum}).`)
}

console.log(`Full-paper uniqueness check passed across ${bank.length} generated questions.`)

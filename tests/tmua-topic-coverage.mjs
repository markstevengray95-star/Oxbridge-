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
  throw new Error(`Unsupported runtime import in TMUA topic audit: ${specifier}`)
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
const { tmuaPaper1CoreTopics, tmuaPaper1Topic, tmuaTopicCounts } = loadTs(path.join(root, "lib/tmua-topic-coverage.ts"))
const { tmuaSpecificationExpansionBank } = loadTs(path.join(root, "lib/tmua-spec-expansion.ts"))

if (tmuaSpecificationExpansionBank.length < 32) throw new Error(`TMUA specification expansion bank is unexpectedly small: ${tmuaSpecificationExpansionBank.length}.`)

const bankCounts = tmuaTopicCounts(tmuaSpecificationExpansionBank)
for (const topic of tmuaPaper1CoreTopics) {
  if ((bankCounts.get(topic) ?? 0) < 4) throw new Error(`TMUA expansion bank needs at least four structurally distinct ${topic} questions.`)
}

for (const form of [1, 2]) {
  const paper = buildFullPaper("TMUA", form)
  const section = paper.sections.find(item => item.id === "paper-1")
  if (!section || section.questions.length !== 20) throw new Error(`TMUA Form ${form} Paper 1 is malformed.`)
  const counts = tmuaTopicCounts(section.questions)
  const missing = tmuaPaper1CoreTopics.filter(topic => (counts.get(topic) ?? 0) === 0)
  if (missing.length) throw new Error(`TMUA Form ${form} Paper 1 misses core specification breadth: ${missing.join(", ")}.`)

  const specTagged = section.questions.filter(question => tmuaPaper1Topic(question) !== "Other").length
  if (specTagged < 12) throw new Error(`TMUA Form ${form} Paper 1 has only ${specTagged}/20 explicitly core-topic questions; expected at least 12.`)

  console.log(`TMUA Form ${form}: ${tmuaPaper1CoreTopics.map(topic => `${topic}=${counts.get(topic) ?? 0}`).join("; ")}; Other=${counts.get("Other") ?? 0}.`)
}

console.log("PASS: both TMUA Paper 1 forms cover every major Part 1 specification domain with broad original practice material.")

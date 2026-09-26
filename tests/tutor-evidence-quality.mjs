import fs from "node:fs"
import path from "node:path"
import ts from "typescript"
import { fileURLToPath } from "node:url"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const file = path.join(root, "lib/tutor-evidence-quality.ts")
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
new Function("exports", "module", "require", outputText)(moduleShim.exports, moduleShim, specifier => {
  throw new Error(`Unexpected runtime import in Tutor evidence test: ${specifier}`)
})
const { buildTutorEvidenceQuality, refineStudentIntelligence } = moduleShim.exports

const now = Date.now()
const daysAgo = days => new Date(now - days * 86_400_000).toISOString()
const skill = (id, label, score, evidenceCount, domain = "Interview") => ({
  id, label, domain, score, evidenceCount,
  status: score >= 75 ? "Secure" : score >= 55 ? "Developing" : "Emerging",
  trend: "flat", note: `${label} evidence`, href: "/practice",
})

const base = {
  profile: { university: "Both", course: "Physics", year: "2027" },
  skills: [
    skill("single-low", "One-off low result", 20, 1),
    skill("repeated-low", "Repeated weakness", 45, 3),
    skill("strong", "Repeated strength", 88, 3),
  ],
  mistakes: [{ id: `retest-${Math.random()}`, label: "Retest not yet secure", domain: "Admissions test", count: 1, priority: "medium", evidence: "Latest targeted retest was 62%.", action: "Retest", href: "/paper-intervention" }],
  strongest: null,
  priority: null,
  recommendations: [],
  evidence: [],
  preparationScore: 0,
  interviewCount: 3,
  fullPaperCount: 2,
  essayCount: 2,
}

const progress = {
  logs: [{ date: daysAgo(1) }, { date: daysAgo(8) }, { date: daysAgo(12) }],
  fullPaperResults: [{ date: daysAgo(4) }, { date: daysAgo(10) }],
  essayAnalyses: [{ date: daysAgo(70) }, { date: daysAgo(80) }],
}

const quality = buildTutorEvidenceQuality(progress, base)
if (quality.freshness !== "stale") throw new Error(`Expected stale cross-domain evidence, found ${quality.freshness}.`)
if (quality.leastCurrentDomain !== "Writing") throw new Error(`Expected Writing to be least-current, found ${quality.leastCurrentDomain}.`)
if (quality.freshDomains !== 2) throw new Error(`Expected 2 current domains, found ${quality.freshDomains}.`)

const first = refineStudentIntelligence(base, progress)
const second = refineStudentIntelligence(base, progress)
if (first.priority?.id !== "repeated-low") throw new Error(`Repeated evidence should outrank an isolated low result; got ${first.priority?.id}.`)
if (first.strongest?.id !== "strong") throw new Error(`Expected strongest repeated evidence to be selected; got ${first.strongest?.id}.`)
if (first.mistakes[0]?.id !== second.mistakes[0]?.id) throw new Error("Retest mistake IDs must remain deterministic across recalculation.")
if (!first.recommendations.some(action => action.id === "refresh-writing-evidence")) throw new Error("Stale writing evidence should produce a writing refresh action.")

console.log("PASS: Tutor evidence confidence detects stale domains, favours repeated evidence, creates stable IDs and recommends the correct refresh task.")

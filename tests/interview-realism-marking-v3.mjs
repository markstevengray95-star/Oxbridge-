import fs from "node:fs"
import path from "node:path"
import ts from "typescript"
import { fileURLToPath } from "node:url"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")

function transpile(relativePath, imports = {}) {
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
    if (specifier in imports) return imports[specifier]
    throw new Error(`Unexpected runtime import ${specifier} while loading ${relativePath}`)
  })
  return moduleShim.exports
}

const quality = transpile("lib/interview-answer-quality.ts")
const baseMarking = transpile("lib/interview-marking.ts", { "@/lib/interview-answer-quality": quality })
const strictMarking = transpile("lib/interview-marking-v2.ts", { "./interview-marking": baseMarking })
const bank = transpile("lib/realistic-interview-bank.ts")
const { markTypedInterviewTranscript } = strictMarking
const { realisticInterviewQuestions } = bank

if (!Array.isArray(realisticInterviewQuestions) || realisticInterviewQuestions.length < 28) {
  throw new Error(`Expected at least 28 staged interview questions; found ${realisticInterviewQuestions?.length ?? 0}.`)
}
for (const track of ["maths", "physical", "life", "law", "humanities", "economics", "languages"]) {
  const questions = realisticInterviewQuestions.filter(item => item.track === track)
  if (questions.length < 4) throw new Error(`${track} has too few realistic interview questions.`)
  if (questions.some(item => !Array.isArray(item.probes) || item.probes.length < 4)) throw new Error(`${track} has a question without a staged follow-up sequence.`)
}

const physical = realisticInterviewQuestions.find(item => item.id === "rx-physical-2")
if (!physical) throw new Error("Missing physical-sciences marking fixture.")

const strong = markTypedInterviewTranscript({
  concepts: physical.concepts,
  referenceAnswer: physical.strongAnswer,
  turns: [
    { role: "interviewer", text: physical.prompt },
    { role: "candidate", text: "They can start at the same temperature. The metal feels colder because it transfers energy away from my hand faster than the wood, so the sensation mainly tells me about heat-transfer rate. I would measure both surface temperatures before touching them to test that." },
  ],
})

const keywordDump = markTypedInterviewTranscript({
  concepts: physical.concepts,
  referenceAnswer: physical.strongAnswer,
  turns: [
    { role: "interviewer", text: physical.prompt },
    { role: "candidate", text: "Temperature, thermal conductivity, heat transfer, energy, rate and experiment are all important scientific ideas. Scientists use these relevant concepts in many situations. Metals and wood have different properties and experiments are useful because data and measurements can be compared. Several concepts are relevant to the question and conduction, convection, radiation, particles, energy and temperature all matter when thinking about materials." },
  ],
})

if (strong.total < keywordDump.total + 15) {
  throw new Error(`Concise applied reasoning must clearly beat keyword stuffing. Strong=${strong.total}, keyword=${keywordDump.total}.`)
}
if (keywordDump.subject > 12 || keywordDump.reasoning > 11 || keywordDump.clarity > 14) {
  throw new Error(`Keyword stuffing caps are not being enforced: ${JSON.stringify(keywordDump)}.`)
}

const wrong = markTypedInterviewTranscript({
  concepts: physical.concepts,
  referenceAnswer: physical.strongAnswer,
  turns: [
    { role: "interviewer", text: physical.prompt },
    { role: "candidate", text: "The metal feels colder because energy leaves my hand more slowly through metal than through wood, so metal is acting as the better insulator." },
  ],
})
if (wrong.subject > 10 || wrong.total >= strong.total) {
  throw new Error(`A concrete reversed physical relationship should be capped: ${JSON.stringify(wrong)}.`)
}

const life = realisticInterviewQuestions.find(item => item.id === "rx-life-3")
if (!life) throw new Error("Missing life-sciences flexibility fixture.")
const firstOnly = markTypedInterviewTranscript({
  concepts: life.concepts,
  referenceAnswer: life.strongAnswer,
  turns: [
    { role: "interviewer", text: life.prompt },
    { role: "candidate", text: "The result is an association, not proof that short sleep caused the higher heart rate, because the groups could differ in other variables." },
  ],
})
const adapted = markTypedInterviewTranscript({
  concepts: life.concepts,
  referenceAnswer: life.strongAnswer,
  turns: [
    { role: "interviewer", text: life.prompt },
    { role: "candidate", text: "The result is an association, not proof that short sleep caused the higher heart rate, because the groups could differ in other variables." },
    { role: "interviewer", text: "Suppose caffeine use is higher in the short-sleep group. What does that do to your conclusion?" },
    { role: "candidate", text: "On reflection I would weaken the causal claim further. Caffeine is a plausible confounder because it may be linked to sleep duration and can independently raise heart rate. I would compare or adjust for caffeine, while recognising that other confounders could remain." },
  ],
})
if (adapted.flexibility <= firstOnly.flexibility) {
  throw new Error(`Responding intelligently to new information should improve flexibility. First=${firstOnly.flexibility}, adapted=${adapted.flexibility}.`)
}

const bankSource = fs.readFileSync(path.join(root, "lib/realistic-interview-bank.ts"), "utf8")
for (const generic of ["Focus on how you would", "Prove or disprove a claim about", "Evaluate a policy on"]) {
  if (bankSource.includes(generic)) throw new Error(`Generic prompt template survived: ${generic}`)
}

const component = fs.readFileSync(path.join(root, "components/realistic-typed-interview.tsx"), "utf8")
for (const marker of ["No length bonus.", "Typed-answer breakdown", "referenceAnswer: base.strongAnswer", "Scratchpad text is not marked", "does not award marks simply for writing more"]) {
  if (!component.includes(marker)) throw new Error(`Typed interview UI is missing: ${marker}`)
}

const tsconfig = fs.readFileSync(path.join(root, "tsconfig.json"), "utf8")
if (!tsconfig.includes("oxbridge-data-v2") || !tsconfig.includes("interview-marking-v2")) {
  throw new Error("Global realistic interview data or strict typed marking alias is missing.")
}

console.log(`PASS: ${realisticInterviewQuestions.length} staged interview problems are active; concise applied reasoning beats verbose keyword stuffing; wrong relationships are capped; and justified adaptation improves flexibility.`)

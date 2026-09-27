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
const marking = transpile("lib/interview-marking.ts", { "@/lib/interview-answer-quality": quality })
const bank = transpile("lib/realistic-interview-bank.ts")
const { markTypedInterviewTranscript } = marking
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
    { role: "candidate", text: "They can start at the same temperature. The metal feels colder because it transfers energy away from my hand faster than wood, so the sensation mainly reflects heat-transfer rate. I would measure both surface temperatures before touching them to test that." },
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

if (strong.total < keywordDump.total + 10) throw new Error(`Applied reasoning must beat keyword stuffing. Strong=${strong.total}, keyword=${keywordDump.total}.`)
if (keywordDump.reasoning > 15 || keywordDump.responsiveness > 10) throw new Error(`Keyword stuffing is receiving too much reasoning/direct-answer credit: ${JSON.stringify(keywordDump)}.`)

const concise = markTypedInterviewTranscript({
  concepts: physical.concepts,
  referenceAnswer: physical.strongAnswer,
  turns: [
    { role: "interviewer", text: physical.prompt },
    { role: "candidate", text: "Same starting temperature is possible: metal removes energy from the hand faster because its thermal conductivity is higher." },
  ],
})
const padded = markTypedInterviewTranscript({
  concepts: physical.concepts,
  referenceAnswer: physical.strongAnswer,
  turns: [
    { role: "interviewer", text: physical.prompt },
    { role: "candidate", text: "Same starting temperature is possible: metal removes energy from the hand faster because its thermal conductivity is higher. This is a complex question and there are many factors to consider in today's society. It is important to note that materials are important and there are many interesting scientific ideas that could potentially be discussed at greater length in a detailed answer." },
  ],
})
if (padded.communication > concise.communication + 1 || padded.total > concise.total + 3) {
  throw new Error(`Extra prose must not create a length bonus. Concise=${concise.total}, padded=${padded.total}.`)
}

const wrong = markTypedInterviewTranscript({
  concepts: physical.concepts,
  referenceAnswer: physical.strongAnswer,
  turns: [
    { role: "interviewer", text: physical.prompt },
    { role: "candidate", text: "The metal feels colder because energy leaves my hand more slowly through metal than through wood, so metal is the better insulator." },
  ],
})
if (wrong.accuracy >= strong.accuracy || wrong.total >= strong.total) throw new Error(`Concrete wrong relationships should lose accuracy credit: ${JSON.stringify(wrong)}.`)

const life = realisticInterviewQuestions.find(item => item.id === "rx-life-3")
if (!life) throw new Error("Missing life-sciences adaptation fixture.")
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
    { role: "candidate", text: "On reflection I would weaken the causal claim further. Caffeine is a plausible confounder because it may be linked to sleep duration and can independently raise heart rate. I would compare or adjust for caffeine, while recognising other confounders could remain." },
  ],
})
if (adapted.adaptability <= firstOnly.adaptability) throw new Error(`Responding to new information should improve adaptability. First=${firstOnly.adaptability}, adapted=${adapted.adaptability}.`)

if (strong.rubricVersion !== "2026.3") throw new Error(`Unexpected rubric version ${strong.rubricVersion}.`)
if (strong.communication > 5 || strong.reasoning > 25 || strong.accuracy > 20 || strong.responsiveness > 15 || strong.adaptability > 20 || strong.evidence > 15) {
  throw new Error(`Rubric dimensions exceed their intended maxima: ${JSON.stringify(strong)}.`)
}

const component = fs.readFileSync(path.join(root, "components/realistic-typed-interview.tsx"), "utf8")
for (const marker of ["realisticInterviewQuestions", "Reasoning matters more than polished prose", "Typed-answer marking, turn by turn", "referenceAnswer: base.strongAnswer", "scratchpad. It is not marked", "not rewarded for length"]) {
  if (!component.includes(marker)) throw new Error(`Typed interview UI is missing: ${marker}`)
}

const tsconfig = fs.readFileSync(path.join(root, "tsconfig.json"), "utf8")
if (!tsconfig.includes("oxbridge-data-v2") || !tsconfig.includes("interview-marking-v2")) throw new Error("Global realistic interview aliases are missing.")

console.log(`PASS: ${realisticInterviewQuestions.length} staged interview problems are active; the 2026.3 typed rubric rewards reasoning, accuracy, response and adaptation without a prose-length bonus.`)

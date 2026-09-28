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
  throw new Error(`Expected at least 28 realistic interview questions; found ${realisticInterviewQuestions?.length ?? 0}.`)
}

const tracks = ["maths", "physical", "life", "law", "humanities", "economics", "languages"]
for (const track of tracks) {
  const questions = realisticInterviewQuestions.filter(item => item.track === track)
  if (questions.length < 4) throw new Error(`${track} needs at least four realistic interview problems.`)
  for (const question of questions) {
    if (!question.prompt || question.prompt.length < 70) throw new Error(`${question.id} is too thin to feel like a developed interview problem.`)
    if (!Array.isArray(question.probes) || question.probes.length < 4) throw new Error(`${question.id} needs a staged follow-up sequence.`)
    if (!question.strongAnswer || question.strongAnswer.length < 100) throw new Error(`${question.id} lacks sufficiently detailed hidden reference reasoning.`)
  }
}

const bankSource = fs.readFileSync(path.join(root, "lib/realistic-interview-bank.ts"), "utf8")
for (const generic of ["Focus on how you would", "Prove or disprove a claim about", "Evaluate a policy on", "Design a fair experiment on"]) {
  if (bankSource.includes(generic)) throw new Error(`Generic template language survived in the realistic interview bank: ${generic}`)
}

const physical = realisticInterviewQuestions.find(item => item.id === "rx-physical-2")
if (!physical) throw new Error("Missing thermal-transfer interview question used by marking regression.")

const conciseStrong = markTypedInterviewTranscript({
  concepts: physical.concepts,
  referenceAnswer: physical.strongAnswer,
  turns: [
    { role: "interviewer", text: physical.prompt },
    { role: "candidate", text: "They can start at the same temperature. The metal feels colder because it conducts energy away from my hand faster, so the sensation mainly reflects heat-transfer rate rather than a lower initial temperature. I would check both surfaces with a thermometer before touching them." },
  ],
})

const longBuzzwordAnswer = markTypedInterviewTranscript({
  concepts: physical.concepts,
  referenceAnswer: physical.strongAnswer,
  turns: [
    { role: "interviewer", text: physical.prompt },
    { role: "candidate", text: "Temperature, thermal conductivity, energy, heat transfer, rate, experiment, particles, conduction, convection and radiation are all important scientific ideas. Temperature is a physical quantity and energy is transferred in many situations. Metals and wood have different properties and experiments are useful because data, measurements and variables can be compared. This is why science uses mechanisms and evidence and why materials can feel different in everyday life even when several concepts are relevant to the question." },
  ],
})

if (conciseStrong.total <= longBuzzwordAnswer.total + 12) {
  throw new Error(`A concise direct answer should clearly beat a long keyword-heavy answer. Strong=${conciseStrong.total}, buzzword=${longBuzzwordAnswer.total}.`)
}
if (longBuzzwordAnswer.subject > 15 || longBuzzwordAnswer.reasoning > 15) {
  throw new Error(`Keyword-heavy prose is receiving too much subject/reasoning credit: ${JSON.stringify(longBuzzwordAnswer)}.`)
}

const wrongDirection = markTypedInterviewTranscript({
  concepts: physical.concepts,
  referenceAnswer: physical.strongAnswer,
  turns: [
    { role: "interviewer", text: physical.prompt },
    { role: "candidate", text: "The metal must have started colder because feeling colder directly tells us its temperature is lower." },
  ],
})
if (wrongDirection.subject > 10 || wrongDirection.total >= conciseStrong.total) {
  throw new Error(`A concrete wrong claim should be capped rather than rewarded for confidence. ${JSON.stringify(wrongDirection)}`)
}

const life = realisticInterviewQuestions.find(item => item.id === "rx-life-3")
if (!life) throw new Error("Missing causal-inference question used by flexibility regression.")
const noRevision = markTypedInterviewTranscript({
  concepts: life.concepts,
  referenceAnswer: life.strongAnswer,
  turns: [
    { role: "interviewer", text: life.prompt },
    { role: "candidate", text: "The association might be causal, but this observational result alone cannot show that short sleep caused the higher heart rate because other variables could differ between the groups." },
  ],
})
const revised = markTypedInterviewTranscript({
  concepts: life.concepts,
  referenceAnswer: life.strongAnswer,
  turns: [
    { role: "interviewer", text: life.prompt },
    { role: "candidate", text: "The association might be causal, but this observational result alone cannot show that short sleep caused the higher heart rate because other variables could differ between the groups." },
    { role: "interviewer", text: "Suppose caffeine use is higher in the short-sleep group. What does that do to your conclusion?" },
    { role: "candidate", text: "On reflection I would weaken the causal claim further. Caffeine is a plausible confounder because it could be associated with sleep duration and independently raise heart rate. I would compare or adjust for caffeine, while recognising that adjustment would not remove every possible confounder." },
  ],
})
if (revised.flexibility <= noRevision.flexibility) {
  throw new Error(`A justified response to new information should improve flexibility. Single=${noRevision.flexibility}, revised=${revised.flexibility}.`)
}

const component = fs.readFileSync(path.join(root, "components/realistic-typed-interview.tsx"), "utf8")
for (const marker of [
  "markTypedInterviewTranscript",
  "Reasoning matters more than polished prose",
  "Typed-answer marking, turn by turn",
  "referenceAnswer: base.strongAnswer",
  "Private scratchpad. It is not marked.",
  "receive no bonus for being long",
]) {
  if (!component.includes(marker)) throw new Error(`Typed interview UI is missing regression marker: ${marker}`)
}

const tsconfig = fs.readFileSync(path.join(root, "tsconfig.json"), "utf8")
if (!tsconfig.includes('"@/lib/oxbridge-data"') || !tsconfig.includes("oxbridge-data-v2")) {
  throw new Error("The realistic interview bank is not routed globally through the app's Oxbridge data import.")
}

console.log(`PASS: ${realisticInterviewQuestions.length} staged tutor-style interview questions are globally routed, concise reasoning beats verbose keyword stuffing, factual errors are capped, and justified revision improves flexibility.`)

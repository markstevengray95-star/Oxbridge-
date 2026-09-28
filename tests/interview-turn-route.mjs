import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import ts from "typescript"
import { fileURLToPath } from "node:url"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
function load(relativePath, imports = {}) {
  const source = fs.readFileSync(path.join(root, relativePath), "utf8")
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  const module = { exports: {} }
  new Function("exports", "module", "require", code)(module.exports, module, name => {
    if (name in imports) return imports[name]
    throw new Error(`Unexpected import ${name}`)
  })
  return module.exports
}

const quality = load("lib/interview-answer-quality.ts")
const structure = load("lib/interview-structure.ts")
const bank = load("lib/realistic-interview-bank.ts")
const legacy = load("lib/oxbridge-data.ts")
const offline = load("lib/interview-offline-follow-up.ts", {
  "@/lib/interview-answer-quality": quality,
  "@/lib/interview-structure": structure,
})
const route = load("app/api/interview-turn/route.ts", {
  "next/server": { NextResponse: { json: body => body } },
  "@/lib/ai/student-safety": { STUDENT_AI_SAFETY_POLICY: "" },
  "@/lib/interview-answer-quality": quality,
  "@/lib/interview-structure": structure,
  "@/lib/realistic-interview-bank": bank,
  "@/lib/interview-offline-follow-up": offline,
  "@/lib/oxbridge-data": legacy,
})
const question = bank.realisticInterviewQuestions.find(item => item.id === "rx-med-1")
const savedKey = process.env.GEMINI_API_KEY
delete process.env.GEMINI_API_KEY
try {
  const answer = "The answer is 90% because the test catches 90% of people with the condition."
  const result = await route.POST(new Request("http://localhost/api/interview-turn", { method: "POST", body: JSON.stringify({
    questionId: question.id,
    question: question.prompt,
    answer,
    referenceAnswer: "The answer is 90%.",
    expectedAnswer: { value: 90, unit: "%" },
    stage: "approach",
    turns: [{ role: "interviewer", text: question.prompt }, { role: "candidate", text: answer }],
  }) }))
  assert.equal(result.classification, "incorrect", "Server answer key must take precedence over supplied answer data")
  assert.match(result.reply, /90%/)

  const correct = "The probability is about 8.3% because 9 of roughly 108 positive results are true positives."
  const next = await route.POST(new Request("http://localhost/api/interview-turn", { method: "POST", body: JSON.stringify({
    questionId: question.id,
    question: question.prompt,
    answer: correct,
    stage: "change",
    turns: [{ role: "interviewer", text: question.prompt }, { role: "candidate", text: correct }],
  }) }))
  assert.equal(next.classification, "responsive")
  assert.equal(next.reply, question.probes[2], "Responsive answers should advance to the current stage's subject probe")

  const intermediate = await route.POST(new Request("http://localhost/api/interview-turn", { method: "POST", body: JSON.stringify({
    questionId: question.id,
    question: question.probes[0],
    answer: "There are about 10 people with the condition, and about 9 of them test positive.",
    expectedAnswer: { value: 8.3, unit: "%" },
    stage: "test",
    turns: [{ role: "interviewer", text: question.probes[0] }, { role: "candidate", text: "There are about 10 people with the condition, and about 9 of them test positive." }],
  }) }))
  assert.notEqual(intermediate.classification, "incorrect", `The opening target must not condemn a correct intermediate count: ${JSON.stringify(intermediate)}`)
} finally {
  if (savedKey === undefined) delete process.env.GEMINI_API_KEY
  else process.env.GEMINI_API_KEY = savedKey
}
console.log("PASS: interview API uses canonical answers, challenges wrong conclusions and chooses stage-specific probes")

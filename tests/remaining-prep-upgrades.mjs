import fs from "node:fs"
import path from "node:path"
import ts from "typescript"
import { fileURLToPath } from "node:url"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")

function transpile(relativePath) {
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
    throw new Error(`Unexpected runtime import ${specifier} while loading ${relativePath}`)
  })
  return moduleShim.exports
}

const replay = transpile("lib/mistake-replay.ts")
const progress = {
  fullPaperResults: [{
    id: "paper-1",
    test: "TMUA",
    date: "2026-09-28T10:00:00.000Z",
    questionReview: [
      { questionId: "q1", section: "Logic and proof", prompt: "Which conclusion must follow from these statements?", answer: "A", correctAnswer: "B", rawMark: 0, maxMarks: 1, correct: false },
      { questionId: "q2", section: "Mathematical reasoning", prompt: "Solve the equation and identify the valid integer solution.", answer: "2", correctAnswer: "4", rawMark: 0, maxMarks: 1, correct: false },
      { questionId: "q3", section: "Mathematical reasoning", prompt: "Which square is always non-negative?", answer: "(x-2)^2", correctAnswer: "(x-2)^2", rawMark: 1, maxMarks: 1, correct: true },
    ],
  }],
}
const groups = replay.buildMistakeReplayGroups(progress)
if (groups.reduce((sum, group) => sum + group.count, 0) !== 2) throw new Error(`Expected two replay mistakes, got ${JSON.stringify(groups)}`)
if (!groups.some(group => group.skill === "Logic & deduction")) throw new Error("Logic mistake was not grouped by underlying skill")
if (!groups.some(group => group.skill === "Mathematical structure")) throw new Error("Maths mistake was not grouped by underlying skill")
if (!replay.practiceCueForSkill("Scientific modelling").toLowerCase().includes("model")) throw new Error("Scientific replay cue is missing modelling guidance")

const importSource = fs.readFileSync(path.join(root, "lib/written-work-import-client.ts"), "utf8")
for (const marker of ["word/document.xml", "DecompressionStream", "/api/extract-written-work", "application/pdf", ".docx"]) {
  if (!importSource.includes(marker)) throw new Error(`Written-work import is missing ${marker}`)
}

const extractionRoute = fs.readFileSync(path.join(root, "app/api/extract-written-work/route.ts"), "utf8")
for (const marker of ["inlineData", "application/pdf", "getGeminiApiKeyCandidates", "Do not summarise", "Cache-Control"]) {
  if (!extractionRoute.includes(marker)) throw new Error(`PDF extraction route is missing ${marker}`)
}

const vault = fs.readFileSync(path.join(root, "app/written-work-vault/page.tsx"), "utf8")
const defence = fs.readFileSync(path.join(root, "app/written-work-defence/page.tsx"), "utf8")
for (const [label, source] of [["vault", vault], ["defence", defence]]) {
  for (const marker of ["readWrittenWorkFile", ".pdf", ".docx"]) {
    if (!source.includes(marker)) throw new Error(`${label} is missing document import marker ${marker}`)
  }
}

const whiteboard = fs.readFileSync(path.join(root, "components/interview-whiteboard.tsx"), "utf8")
for (const marker of ["Straight line", "x–y axes", "Equation / reasoning notes", 'Background = "blank" | "grid" | "axes"', 'Tool = "draw" | "line" | "erase"']) {
  if (!whiteboard.includes(marker)) throw new Error(`Working canvas is missing ${marker}`)
}

const simulator = fs.readFileSync(path.join(root, "components/admissions-test-simulator.tsx"), "utf8")
for (const marker of ["Review before submit", "Question navigator", "Alt+N", "Alt+P", "Alt+F", "fullPaperResults", "/mistake-replay"]) {
  if (!simulator.includes(marker)) throw new Error(`Admissions simulator is missing ${marker}`)
}
const player = fs.readFileSync(path.join(root, "app/test-player/page.tsx"), "utf8")
if (!player.includes("AdmissionsTestSimulator")) throw new Error("Test player is not using the focused simulator")

const replayPage = fs.readFileSync(path.join(root, "app/mistake-replay/page.tsx"), "utf8")
const dnaPage = fs.readFileSync(path.join(root, "app/mistake-dna/page.tsx"), "utf8")
for (const marker of ["buildMistakeReplayGroups", "Lock attempt & reveal comparison", "Confidence before reveal"]) {
  if (!replayPage.includes(marker)) throw new Error(`Mistake replay page is missing ${marker}`)
}
if (!dnaPage.includes("/mistake-replay") || !dnaPage.includes("buildMistakeReplayGroups")) throw new Error("Mistake DNA is not connected to grouped replay")

console.log("PASS: PDF/DOCX written-work import, richer working canvas, focused test simulation and skill-grouped mistake replay are integrated.")

const fs = require("node:fs")
const path = require("node:path")

const root = path.resolve(__dirname, "..")
const read = relative => fs.readFileSync(path.join(root, relative), "utf8")

const calculator = read("components/ucat-basic-calculator.tsx")
const fullPapers = read("app/full-papers/page.tsx")
const testPlayer = read("app/test-player/page.tsx")

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

assert(/export function UcatBasicCalculator/.test(calculator), "UCAT calculator component is missing.")
assert(/autoDetect/.test(calculator), "UCAT calculator no longer supports section-aware availability.")
assert(/header\.sticky/.test(calculator), "UCAT calculator is not tied to the active timed-test header.")
assert(/Decision Making\|Quantitative Reasoning/.test(calculator), "UCAT calculator must be limited to Decision Making and Quantitative Reasoning.")
assert(/\bUCAT\b/.test(calculator), "UCAT calculator availability check no longer verifies the active test is UCAT.")
assert(/applyOperation/.test(calculator) && /left \+ right/.test(calculator) && /left - right/.test(calculator) && /left \* right/.test(calculator) && /left \/ right/.test(calculator), "UCAT calculator must preserve basic four-function arithmetic.")
assert(!/Math\.(?:sin|cos|tan|log|sqrt|pow)/.test(calculator), "UCAT calculator should remain a basic, non-scientific calculator.")
assert(/MutationObserver/.test(calculator), "UCAT calculator must react when the timed mock moves between sections.")

for (const [route, source] of [["full-papers", fullPapers], ["test-player", testPlayer]]) {
  assert(/UcatBasicCalculator/.test(source), `${route} does not import the UCAT calculator.`)
  assert(/<UcatBasicCalculator autoDetect\s*\/>/.test(source), `${route} does not mount the section-aware UCAT calculator.`)
  assert(/<FullPaperCentre\s*\/>/.test(source), `${route} no longer mounts the shared Full Paper Centre.`)
}

console.log("PASS: UCAT basic calculator is available on both mock routes and restricted to active Decision Making / Quantitative Reasoning sections.")

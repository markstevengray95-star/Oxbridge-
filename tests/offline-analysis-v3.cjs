const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')

const cache = new Map()
function load(file) {
  const absolute = path.resolve(file)
  if (cache.has(absolute)) return cache.get(absolute)
  const exports = {}
  cache.set(absolute, exports)
  const code = ts.transpileModule(fs.readFileSync(absolute, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText
  vm.runInNewContext(code, {
    exports,
    process: { env: {} },
    require: name => {
      if (name.startsWith('./') || name.startsWith('../')) {
        const target = path.resolve(path.dirname(absolute), name)
        return load(target.endsWith('.ts') ? target : `${target}.ts`)
      }
      if (name.startsWith('@/')) return load(path.resolve(`${name.slice(2)}.ts`))
      return require(name)
    },
  }, { filename: absolute })
  return exports
}

const { analyseOfflineEssayTask, buildOfflineWritingReport } = load('lib/writing/offline-review-v3.ts')

const policyPrompt = 'Should social media companies be legally responsible for harmful content posted by users?'
const policyEssay = [
  'Social media companies should be legally responsible for harmful content when they have been warned about repeated abuse, although liability should not be unlimited.',
  'Platforms control recommendation systems and moderation tools. Because those systems can amplify harmful material, legal responsibility can create an incentive to respond to credible reports.',
  'However, automatic liability for every user post would be too broad because companies cannot review every message before publication.',
  'On balance, companies should carry limited legal responsibility where they knowingly fail to act after clear notice.'
].join('\n\n')
const policy = analyseOfflineEssayTask(policyPrompt, policyEssay)
assert.equal(policy.type, 'policy', `expected policy task, got ${policy.type}`)
assert.equal(policy.taskSatisfied, true, policy.reason)

const echoEssay = [
  'Public libraries should remain free to use because access to knowledge matters.',
  'Road congestion creates delays for commuters and increases journey times. Better bus routes can reduce traffic.',
  'Cycling infrastructure can also reduce congestion in cities by replacing some car journeys.',
  'Therefore transport policy should prioritise buses and cycling.'
].join('\n\n')
const echo = analyseOfflineEssayTask('Should public libraries remain free to use?', echoEssay)
assert.equal(echo.promptEchoRisk, true, 'intro-only prompt coverage should trigger echo risk')
assert.equal(echo.taskSatisfied, false)

const comparePrompt = 'Which is more important for democracy: free speech or compulsory voting?'
const oneSidedCompare = [
  'Free speech is important for democracy because citizens need to criticise leaders.',
  'Journalists can expose wrongdoing and citizens can debate public policy.',
  'For these reasons free speech protects democratic accountability.'
].join('\n\n')
const compare = analyseOfflineEssayTask(comparePrompt, oneSidedCompare)
assert.equal(compare.type, 'compare')
assert.equal(compare.taskSatisfied, false, 'one-sided discussion should not complete a comparison task')

const strongCompare = [
  'Both free speech and compulsory voting can support democracy, but free speech is more important because it protects the quality of political choice rather than only participation.',
  'Compulsory voting may increase turnout, whereas free speech allows citizens to challenge misleading claims and compare alternatives before voting.',
  'By contrast, high turnout without open criticism can still leave voters poorly informed. Free speech therefore has a stronger relationship with accountable government.',
  'On balance, compulsory voting may broaden participation, but free speech is more important because democratic participation has less value when criticism is restricted.'
].join('\n\n')
const compareGood = analyseOfflineEssayTask(comparePrompt, strongCompare)
assert.equal(compareGood.taskSatisfied, true, compareGood.reason)

const extentPrompt = 'To what extent was economic weakness the main cause of the fall of the Roman Republic?'
const extentEssay = [
  'Economic weakness contributed to instability in the Roman Republic.',
  'Land inequality affected many citizens and veterans faced economic difficulties.',
  'Political violence also occurred during the late Republic.',
  'Economic problems were important in the fall of the Republic.'
].join('\n\n')
const extent = analyseOfflineEssayTask(extentPrompt, extentEssay)
assert.equal(extent.type, 'extent')
assert.equal(extent.taskSatisfied, false, 'extent essay should weigh degree and alternatives')

const causalPrompt = 'Why did the Roman Republic collapse?'
const listEssay = [
  'The late Roman Republic experienced civil wars, political violence and economic inequality.',
  'Marius, Sulla, Pompey and Caesar were important figures in this period.',
  'The Senate also faced repeated political conflicts.',
  'These were major features of the late Republic.'
].join('\n\n')
const causal = analyseOfflineEssayTask(causalPrompt, listEssay)
assert.equal(causal.type, 'causal')
assert.equal(causal.taskSatisfied, false, 'listing relevant facts should not count as causal explanation')

const driftPrompt = 'Should governments ban private cars from city centres?'
const driftEssay = [
  'Governments should restrict private cars in city centres because congestion and pollution impose costs on other residents.',
  'Public transport can move many passengers using less road space, so restrictions can work when alternatives are reliable.',
  'School uniforms can create a shared identity and may reduce visible differences between pupils.',
  'On balance, city-centre car restrictions are justified when public transport and disability exemptions are provided.'
].join('\n\n')
const drift = analyseOfflineEssayTask(driftPrompt, driftEssay)
assert.ok(drift.potentialDriftParagraphs.includes(2), `expected paragraph 3 drift, got ${drift.potentialDriftParagraphs}`)

const report = buildOfflineWritingReport({ essay: driftEssay, mode: 'essay', prompt: driftPrompt })
assert.ok(report.annotations.some(a => a.kind === 'relevance' && a.evidence.paragraph === 2), 'drift paragraph should get a relevance annotation')
assert.match(report.paragraphs[2].limitation, /Relevance warning/i)

const echoReport = buildOfflineWritingReport({ essay: echoEssay, mode: 'essay', prompt: 'Should public libraries remain free to use?' })
assert.ok((echoReport.criteria[0].level ?? 4) <= 1, `prompt-echo essay should be capped at weak relevance, got ${echoReport.criteria[0].level}`)
assert.equal(echoReport.priorities[0].title, 'Complete the exact task')

const tsconfig = JSON.parse(fs.readFileSync('tsconfig.json', 'utf8'))
assert.equal(tsconfig.compilerOptions.paths['@/lib/writing/offline-review'][0], './lib/writing/offline-review-v3')

console.log('PASS: v3 task classification, prompt-echo protection, comparison/extent/causal completion, drift detection, relevance annotations, and production alias wiring')

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

const { scoreStrictEssay, attachStrictEssayScoring } = load('lib/writing/strict-score.ts')

function reportWithLevels(levels) {
  const labels = ['Answering the question','Reasoning and assumptions','Evidence and examples','Counterargument and evaluation','Structure and progression','Precision and clarity']
  return {
    summary: 'Draft summary.',
    criteria: labels.map((label, index) => ({ label, level: levels[index], judgement: 'Judgement.', evidence: { paragraph: 0, quote: 'Evidence sentence.' }, action: 'Improve.' })),
    paragraphs: [{ index: 0, purpose: 'Argument', strength: 'Strength', limitation: 'Limitation', action: 'Action' }],
    annotations: [{ evidence: { paragraph: 0, quote: 'Evidence sentence.' }, kind: 'reasoning', explanation: 'Explanation', revision: 'Revision' }],
    priorities: [{ title: 'Priority', evidence: { paragraph: 0, quote: 'Evidence sentence.' }, why: 'Why', action: 'Action', successCheck: 'Check' }],
    questions: [{ evidence: { paragraph: 0, quote: 'Evidence sentence.' }, question: 'Question?', purpose: 'Purpose' }],
    limitations: ['Limitation'],
  }
}

const policyPrompt = 'Should social media companies be legally responsible for harmful content posted by users?'
const strongEssay = [
  'Social media companies should be legally responsible for harmful content when they knowingly fail to act, although liability should be limited.',
  'Platforms control recommendation systems and moderation tools. Because those systems can amplify harmful material, limited legal responsibility gives companies an incentive to respond to credible reports.',
  'However, automatic liability for every user post would be too broad because companies cannot review every message before publication.',
  'On balance, companies should carry limited legal responsibility where they have clear notice and a reasonable opportunity to act.'
].join('\n\n')
const excellent = scoreStrictEssay(reportWithLevels([4,4,4,4,4,4]), policyPrompt, strongEssay)
assert.equal(excellent.rawScore, 100)
assert.equal(excellent.score, 100)
assert.equal(excellent.grade, 'A*')
assert.equal(excellent.caps.length, 0)
assert.equal(excellent.components.reduce((sum, part) => sum + part.weight, 0), 100)

const offTopicEssay = [
  'School uniforms may create a shared identity and reduce visible differences between pupils.',
  'Uniform policies can also make mornings simpler for some families.',
  'However, uniforms do not automatically improve teaching quality.',
  'Overall, schools should review uniform costs and comfort.'
].join('\n\n')
const offTopic = scoreStrictEssay(reportWithLevels([4,4,4,4,4,4]), policyPrompt, offTopicEssay)
assert.ok(offTopic.score <= 29, `polished off-topic essay must be capped at 29, got ${offTopic.score}`)
assert.equal(offTopic.grade, 'U')
assert.ok(offTopic.caps.some(cap => cap.maximum === 29))

const comparePrompt = 'Which is more important for democracy: free speech or compulsory voting?'
const oneSidedEssay = [
  'Free speech is essential for democracy because citizens need to criticise leaders.',
  'Journalists use free speech to expose wrongdoing and citizens use it to debate policy.',
  'This makes free speech important for accountable government.'
].join('\n\n')
const incompleteTask = scoreStrictEssay(reportWithLevels([4,4,4,4,4,4]), comparePrompt, oneSidedEssay)
assert.ok(incompleteTask.score <= 64, `task-incomplete essay must be capped, got ${incompleteTask.score}`)
assert.ok(incompleteTask.caps.some(cap => /does not fully complete/i.test(cap.reason)))

const weakReasoning = scoreStrictEssay(reportWithLevels([4,1,4,4,4,4]), policyPrompt, strongEssay)
assert.ok(weakReasoning.score <= 54, `weak reasoning must cap the overall result, got ${weakReasoning.score}`)
assert.ok(weakReasoning.caps.some(cap => /Reasoning is too weak/i.test(cap.reason)))

const attachedReport = reportWithLevels([4,4,4,4,4,4])
const attached = attachStrictEssayScoring(attachedReport, policyPrompt, strongEssay)
assert.match(attached.report.summary, /^Strict practice mark: 100\/100 — Grade A\*/)
assert.ok(attached.report.criteria.every(c => /^Strict weighted mark:/.test(c.judgement)))
assert.match(attached.report.limitations[0], /not an official Oxford, Cambridge/i)

const routeSource = fs.readFileSync('app/api/essay-analysis/route.ts', 'utf8')
assert.match(routeSource, /attachStrictEssayScoring/)
assert.match(routeSource, /rubricVersion: 4/)

console.log('PASS: strict 100-point weighting, A-U grading, off-topic/task/reasoning caps, report breakdown, and API wiring')

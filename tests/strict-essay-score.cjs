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

const { scoreStrictEssay, attachStrictEssayScoring, UNIVERSITY_CLASSIFICATION_BANDS } = load('lib/writing/strict-score.ts')

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
  'Social media companies should bear limited legal responsibility for harmful content posted by users when the platform has clear notice of a serious risk and a reasonable opportunity to respond. This position does not treat a company as the author of every post. Instead, responsibility should track the degree of control the platform exercises over recommendation, moderation and continued distribution, because those choices can increase or reduce foreseeable harm.',
  'The strongest reason for limited legal responsibility is that platforms do more than passively store material. Recommendation systems select and amplify some posts, and moderation systems already distinguish between categories of content. Because the company controls these systems, a rule that attaches responsibility after credible notice can change incentives at the point where the company is actually able to act. This does not prove that every failure to remove content is wrongful; it supports a narrower duty to take proportionate steps when the risk is sufficiently clear.',
  'However, automatic liability for every harmful user post would be too broad. A platform cannot assess every message before publication, and a rule that punished any harmful outcome could encourage excessive removal of lawful speech. This objection matters because legal responsibility can itself create social costs. Yet it does not justify complete immunity: the better response is to make liability depend on notice, seriousness, control and reasonable response time, so the law targets avoidable failures rather than mere association with a user’s conduct.',
  'A further difficulty is deciding what counts as harmful content. If the concept is defined only by offence or disagreement, the rule would be unstable and vulnerable to abuse. Therefore the threshold should focus on clearly specified categories of serious harm and should allow independent review of disputed moderation decisions. This qualification strengthens rather than weakens the case for responsibility because it separates the principle of accountability from an unlimited power to censor.',
  'On balance, social media companies should be legally responsible in a limited class of cases: where harmful user content creates a serious and sufficiently defined risk, the platform has meaningful control over its distribution, receives credible notice, and then fails to take a reasonable step. That conclusion recognises both sides of the problem. It preserves space for user responsibility and lawful expression while still treating a platform’s own choices about amplification and inaction as legally significant when those choices make preventable harm more likely.'
].join('\n\n')

const actualBands = UNIVERSITY_CLASSIFICATION_BANDS.map(b => [b.minimum, b.label])
const expectedBands = [[85,'Exceptional First'],[70,'First'],[67,'High II.1'],[60,'Upper Second (II.1)'],[50,'Lower Second (II.2)'],[40,'Third'],[0,'Fail']]
assert.equal(JSON.stringify(actualBands), JSON.stringify(expectedBands))

const excellent = scoreStrictEssay(reportWithLevels([4,4,4,4,4,4]), policyPrompt, strongEssay)
assert.equal(excellent.rawScore, 100)
assert.equal(excellent.score, 100)
assert.equal(excellent.classification, 'Exceptional First')
assert.equal(excellent.grade, 'Exceptional First')
assert.equal(excellent.caps.length, 0)
assert.equal(excellent.components.reduce((sum, part) => sum + part.weight, 0), 100)
assert.ok(excellent.diagnostics.reasonedBodyParagraphs >= 2)
assert.equal(excellent.diagnostics.hasDefensibleConclusion, true)
assert.equal(excellent.diagnostics.hasObjectionResponse, true)

const first = scoreStrictEssay(reportWithLevels([3,3,3,3,3,3]), policyPrompt, strongEssay)
assert.equal(first.score, 75)
assert.equal(first.classification, 'First')

const highTwoOne = scoreStrictEssay(reportWithLevels([3,3,3,2,2,3]), policyPrompt, strongEssay)
assert.ok(highTwoOne.score >= 67 && highTwoOne.score <= 69)
assert.equal(highTwoOne.classification, 'High II.1')

const offTopicEssay = [
  'School uniforms may create a shared identity and reduce visible differences between pupils. This matters because clothing can affect how students perceive status within a school community.',
  'Uniform policies can also make mornings simpler for some families because a standard set of clothes reduces daily choice. However, cost and comfort can create difficulties for others.',
  'A further issue is whether uniforms improve learning. The evidence described here would need to distinguish uniform effects from changes in teaching, attendance or behaviour policies.',
  'Overall, schools should review uniform costs and comfort and should not assume that a clothing policy automatically improves educational outcomes.'
].join('\n\n')
const offTopic = scoreStrictEssay(reportWithLevels([4,4,4,4,4,4]), policyPrompt, offTopicEssay)
assert.ok(offTopic.score <= 39, `polished off-topic essay must remain fail-standard, got ${offTopic.score}`)
assert.equal(offTopic.classification, 'Fail')
assert.ok(offTopic.caps.some(cap => cap.maximum === 39))

const comparePrompt = 'Which is more important for democracy: free speech or compulsory voting?'
const oneSidedEssay = [
  'Free speech is essential for democracy because citizens need to criticise leaders and expose failures without fear of punishment.',
  'Journalists use free speech to investigate wrongdoing. Because public criticism can reveal information voters would otherwise lack, speech contributes to accountability and informed political choice.',
  'However, speech can also be misleading or offensive. That problem requires careful rules about threats and direct harms rather than treating political disagreement as a reason for broad censorship.',
  'Overall, free speech is therefore essential to democratic government because it allows citizens to test claims and challenge power.'
].join('\n\n')
const incompleteTask = scoreStrictEssay(reportWithLevels([4,4,4,4,4,4]), comparePrompt, oneSidedEssay)
assert.ok(incompleteTask.score <= 59, `task-incomplete essay must stay within II.2 or below, got ${incompleteTask.score}`)
assert.ok(incompleteTask.caps.some(cap => /does not fully complete/i.test(cap.reason)))

const weakReasoning = scoreStrictEssay(reportWithLevels([4,1,4,4,4,4]), policyPrompt, strongEssay)
assert.ok(weakReasoning.score <= 54, `weak reasoning must prevent II.1/First classification, got ${weakReasoning.score}`)
assert.ok(weakReasoning.caps.some(cap => /Reasoning is too thin/i.test(cap.reason)))

const polishedButShallow = [
  'Social media companies have become central to modern life, and harmful content is a serious issue. The question of legal responsibility is therefore very important.',
  'There are arguments on both sides. Companies have influence, users also have responsibility, and governments must consider freedom of expression. Social media can be beneficial but can also create problems.',
  'Overall, a balanced approach is best. Social media companies should be responsible in some situations, but not in every situation.'
].join('\n\n')
const shallow = scoreStrictEssay(reportWithLevels([4,4,4,4,4,4]), policyPrompt, polishedButShallow)
assert.ok(shallow.score <= 59, `generic shallow prose must not reach II.1/First, got ${shallow.score}`)
assert.ok(shallow.caps.some(cap => /too brief|too little visible claim-to-reason/i.test(cap.reason)))

const lnatPrompt = 'Should freedom of expression protect speech that most people find offensive?'
const noConclusion = [
  'Freedom of expression can protect unpopular speech because majorities may otherwise suppress views they dislike. This matters because democratic debate depends on people being able to challenge prevailing opinion rather than merely repeat it.',
  'However, offence is not the same as harmlessness. Some expression can contribute to intimidation or targeted abuse, and legal systems may have reasons to regulate conduct that directly threatens others. The difficulty is drawing that line without turning mere disagreement into a legal wrong.',
  'A broad offence-based restriction would be difficult to administer because different groups find different ideas offensive. Therefore a rule based only on majority reaction could make protection weakest exactly when dissent is least popular.'
].join('\n\n')
const noConclusionMark = scoreStrictEssay(reportWithLevels([4,4,4,4,4,4]), lnatPrompt, noConclusion)
assert.equal(noConclusionMark.essayStyle, 'LNAT')
assert.ok(noConclusionMark.score <= 59, `LNAT response without a conclusion must be capped in II.2 territory, got ${noConclusionMark.score}`)
assert.ok(noConclusionMark.caps.some(cap => /LNAT Section B expects/i.test(cap.reason)))

const taraPrompt = 'Does technological progress necessarily improve society?'
const taraParagraph = 'Technological progress can improve society when it expands useful capabilities, because better tools may reduce costs and increase access. However, the same change can distribute benefits unevenly or create new risks, so progress in technical capacity does not by itself prove social improvement. A sound judgement must therefore compare benefits, harms, distribution and available alternatives rather than assuming that novelty is automatically valuable.'
const overLimitTara = Array.from({length: 13}, (_, index) => `${taraParagraph} Example ${index + 1} develops the same distinction in a different context and therefore keeps the central question explicit.`).join('\n\n') + '\n\nOn balance, technological progress does not necessarily improve society; it improves society when its benefits, distribution and risks justify the change compared with realistic alternatives.'
const taraMark = scoreStrictEssay(reportWithLevels([4,4,4,4,4,4]), taraPrompt, overLimitTara)
assert.equal(taraMark.essayStyle, 'TARA')
assert.ok(taraMark.diagnostics.wordCount > 750)
assert.ok(taraMark.score <= 59, `TARA response over 750 words must be capped, got ${taraMark.score}`)
assert.ok(taraMark.caps.some(cap => /750 words/i.test(cap.reason)))

const attachedReport = reportWithLevels([4,4,4,4,4,4])
const attached = attachStrictEssayScoring(attachedReport, policyPrompt, strongEssay)
assert.match(attached.report.summary, /^University-style practice mark: 100\/100 — Exceptional First/)
assert.ok(attached.report.criteria.every(c => /^University-style weighted mark:/.test(c.judgement)))
assert.match(attached.report.limitations[0], /deliberately strict ScholarBridge/i)

const routeSource = fs.readFileSync('app/api/essay-analysis/route.ts', 'utf8')
assert.match(routeSource, /attachStrictEssayScoring/)
assert.match(routeSource, /rubricVersion: 5/)

const panelSource = fs.readFileSync('components/writing/review-panel.tsx', 'utf8')
assert.match(panelSource, /Practice classification:/)
assert.match(panelSource, /rubricVersion: 5/)
assert.match(panelSource, /classification = result\.strictScore\?\.classification/)

const scorePanelSource = fs.readFileSync('components/writing/strict-score-panel.tsx', 'utf8')
assert.match(scorePanelSource, /reasoned body paragraphs/)
assert.match(scorePanelSource, /Counter-position:/)

console.log('PASS: strict admissions essay marking penalises irrelevance, incomplete tasks, shallow reasoning, missing LNAT conclusions and TARA word-limit breaches while preserving university classification bands')

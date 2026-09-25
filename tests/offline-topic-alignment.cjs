const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')
const path = require('node:path')

function load(file){
  const exports={}
  vm.runInNewContext(
    ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,
    {exports,require:name=>name.startsWith('./')?load(path.resolve(path.dirname(file),name)+'.ts'):name.startsWith('@/')?load(path.resolve(name.slice(2)+'.ts')):require(name)}
  )
  return exports
}

const {analyseOfflineTopicAlignment,buildOfflineWritingReport}=load('lib/writing/offline-review-v2.ts')

const libraryPrompt='Should public libraries remain free to use?'
const libraryOnTopic=[
  'Public libraries should remain free because charging for access would make books and study space less available to people on low incomes.',
  'A fee could raise revenue, but it would alter the purpose of a public library by making access depend partly on ability to pay.',
  'Therefore libraries should remain free at the point of use, while local government should fund them through taxation rather than entrance charges.'
].join('\n\n')
const libraryOffTopic=[
  'Public transport is essential in cities because people need affordable ways to travel to work.',
  'Freedom matters in a democracy and public services should be designed fairly.',
  'Museums and archives also preserve culture for future generations.'
].join('\n\n')
const libraryMentionOnly=[
  'Libraries are valuable places in many towns.',
  'However, the main problem facing modern cities is traffic congestion and the price of public transport.',
  'Governments should therefore invest in buses and rail networks.'
].join('\n\n')

const onTopic=analyseOfflineTopicAlignment(libraryPrompt,libraryOnTopic)
const offTopic=analyseOfflineTopicAlignment(libraryPrompt,libraryOffTopic)
const mentionOnly=analyseOfflineTopicAlignment(libraryPrompt,libraryMentionOnly)
assert.ok(onTopic.level>=3,`expected on-topic >=3, got ${onTopic.level}`)
assert.ok(offTopic.level<=1,`expected off-topic <=1, got ${offTopic.level}`)
assert.ok(mentionOnly.level<=1,`expected one-off topic mention <=1, got ${mentionOnly.level}`)

const legalPrompt='Should social media companies be legally responsible for harmful content posted by users?'
const adjacent='Social media companies design addictive platforms that can harm users. Algorithms reward attention and can worsen anxiety. Companies should improve product design and give users more control over feeds.'
const exact='Social media companies should carry limited legal responsibility for harmful user content when they have been notified and fail to act. Legal liability should depend on knowledge and reasonable moderation duties rather than making platforms responsible for every post. This approach addresses harmful content while preserving a defence where companies acted reasonably.'
const adjacentResult=analyseOfflineTopicAlignment(legalPrompt,adjacent)
const exactResult=analyseOfflineTopicAlignment(legalPrompt,exact)
assert.ok(adjacentResult.level<=2,`expected adjacent topic <=2, got ${adjacentResult.level}`)
assert.ok(exactResult.level>=3,`expected exact legal-responsibility essay >=3, got ${exactResult.level}`)
assert.ok(adjacentResult.missingHinges.length>0,'adjacent essay should miss a decision hinge')

const substringPrompt='Should voting be compulsory?'
const substringEssay='A devoted student may value civic history, but this paragraph is about education and classroom attendance rather than elections or ballots.'
const substringResult=analyseOfflineTopicAlignment(substringPrompt,substringEssay)
assert.ok(substringResult.level<=1,`substring coincidence should not count as topic match, got ${substringResult.level}`)

const report=buildOfflineWritingReport({essay:libraryOffTopic,mode:'essay',prompt:libraryPrompt})
assert.equal(report.criteria[0].label,'Answering the question')
assert.ok(report.criteria[0].level<=1)
assert.match(report.criteria[0].judgement,/Off topic|Weak topic match/i)
assert.ok(report.priorities.some(p=>p.title==='Answering the question'))
if(report.criteria[0].evidence.paragraph!==null){
  const paragraphs=libraryOffTopic.split(/\n\n/)
  assert.ok(paragraphs[report.criteria[0].evidence.paragraph].includes(report.criteria[0].evidence.quote))
}

console.log('PASS: offline topic alignment distinguishes exact question, adjacent subject, one-off mention, and substring coincidence')

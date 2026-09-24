const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')
const path = require('node:path')
let fetchResult, hasKey = true, sent, failure = false
const mocks = {'next/server':{NextResponse:{json:(body,options)=>({body,status:options?.status ?? 200})}},'@/lib/gemini/api-key':{getGeminiApiKeyCandidates:()=>hasKey?[{value:'not-a-real-key'}]:[]}}
function load(file){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,process:{env:{}},AbortSignal,fetch:async(url,options)=>{sent=JSON.parse(options.body);if(failure)throw new Error('timeout');return {ok:true,json:async()=>fetchResult}},require:name=>mocks[name]??(name.startsWith('@/')?load(path.resolve(name.slice(2)+'.ts')):require(name))});return exports}
const {RUBRICS,validateReport,inputSchema,mechanics} = load('lib/writing/review.ts')
const source = 'Libraries improve access to learning because books can be borrowed.\n\nHowever, opening hours may limit that access.'
const evidence = {paragraph:0,quote:'Libraries improve access to learning'}
const report = {summary:'The argument supports libraries while recognising a practical limit.',criteria:RUBRICS.essay.map(label=>({label,level:2,judgement:'A claim is linked to a reason but not fully tested.',evidence,action:'Explain who gains access.'})),paragraphs:[0,1].map(index=>({index,purpose:'Develop argument',strength:'Identifies an issue',limitation:'Needs explanation',action:'Explain the mechanism'})),annotations:[{evidence,kind:'reasoning',explanation:'Identifies the claimed benefit.',revision:'Specify the access barrier.'}],priorities:[{title:'Explain access',evidence,why:'The mechanism is incomplete',action:'State who benefits',successCheck:'The reader can identify who and why'}],questions:[{evidence,question:'Whose access improves?',purpose:'Test scope'}],limitations:['Factual claims have not been independently verified.']}
assert.equal(validateReport(report,source,'essay').criteria.length,6)
const altered = (f)=>{const r=JSON.parse(JSON.stringify(report));f(r);return r}
assert.throws(()=>validateReport(altered(r=>r.annotations[0].evidence.quote='Invented quotation'),source,'essay'))
assert.throws(()=>validateReport(altered(r=>r.criteria[0].level=99),source,'essay'))
assert.throws(()=>validateReport(altered(r=>r.paragraphs[1].index=0),source,'essay'))
assert.throws(()=>validateReport(altered(r=>r.criteria[0].evidence={paragraph:null,quote:''}),source,'essay'))
assert.throws(()=>validateReport(report,source,'statement'))
assert.equal(inputSchema.safeParse({essay:123}).success,false)
assert.equal(inputSchema.safeParse({essay:'a'.repeat(20001)}).success,false)
assert.equal(mechanics('because therefore however '.repeat(20)).score,undefined)
async function main(){const {POST}=load('app/api/essay-analysis/route.ts');const req=(body)=>({json:async()=>body});assert.equal((await POST(req({essay:123}))).status,400);hasKey=false;let r=await POST(req({essay:source}));assert.equal(r.body.report,null);assert.equal(r.body.provider,'local');hasKey=true;fetchResult={candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify(report)}]}}]};r=await POST(req({essay:source,mode:'essay'}));assert.equal(r.body.report.criteria[0].level,null);assert.ok(sent.generationConfig.responseJsonSchema);assert.equal(r.body.provider,'gemini');fetchResult.candidates[0].finishReason='MAX_TOKENS';assert.equal((await POST(req({essay:source}))).body.report,null);fetchResult.candidates[0].finishReason='STOP';fetchResult.candidates[0].content.parts[0].text=JSON.stringify(altered(r=>r.annotations[0].evidence.quote='Not in draft'));assert.equal((await POST(req({essay:source}))).body.report,null);failure=true;assert.equal((await POST(req({essay:source}))).body.report,null);console.log('PASS: exact quotations, rubric shape, paragraph coverage, invalid input, missing context, missing API key, structured output, truncation and timeout')}
main().catch(e=>{console.error(e);process.exitCode=1})

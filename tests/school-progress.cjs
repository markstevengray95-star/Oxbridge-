const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')
const exportsObject = {}
vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/school/progress.ts','utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports:exportsObject})
const {studentSummary, taskState, csvCell, progressCsv} = exportsObject
const now = Date.parse('2026-09-24T12:00:00Z')
const student = {userId:'student',displayName:'=SUM(A1)',preparationScore:0,interviewCount:0,fullPaperCount:0,essayCount:0}
const detail = {cohort:{name:'Test'},students:[student],assignments:[{id:'a',title:'Interview',due_at:'2026-09-23T12:00:00Z'},{id:'b',title:'Essay',due_at:'2026-09-27T12:00:00Z'}],progress:[{assignment_id:'a',user_id:'teacher',status:'completed'},{assignment_id:'removed',user_id:'student',status:'completed'}]}
let s = studentSummary(detail,student,now)
assert.equal(s.completed,0);assert.equal(s.overdue,1);assert.equal(s.dueSoon,1);assert.equal(s.percent,0)
detail.progress.push({assignment_id:'a',user_id:'student',status:'completed',note:'My reflection'})
s = studentSummary(detail,student,now);assert.equal(s.completed,1);assert.equal(s.overdue,0);assert.equal(s.percent,50)
assert.equal(studentSummary({...detail,assignments:[]},student,now).percent,null)
assert.equal(taskState({due_at:'invalid'},undefined,now),'Not started')
assert.equal(taskState({due_at:new Date(now).toISOString()},undefined,now),'Not started')
assert.equal(taskState({due_at:null},{status:'in_progress'},now),'In progress')
assert.equal(csvCell('=1+1'),'"\'=1+1"');assert.equal(csvCell('A "quote"'),'"A ""quote"""')
assert.match(progressCsv(detail,now),/My reflection/);assert.match(progressCsv(detail,now),/'=SUM/)
console.log('PASS: student-only counts, removed assignments, overdue boundaries, completion, empty cohorts, reflections and CSV formula escaping')

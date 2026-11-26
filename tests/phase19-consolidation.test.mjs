import test from "node:test"
import assert from "node:assert/strict"
import {readFileSync} from "node:fs"
import {tools,visibleTools,workspaceTools,noAccess,searchTools} from "../lib/navigation-directory.ts"
const student={...noAccess,signedIn:true},available=visibleTools(student)
for(const area of ["tutor","interviews","tests","application","progress"]){
 test(area+" retains every available tool exactly once",()=>{
  const actual=workspaceTools(area,available).flatMap(g=>g.items.map(t=>t.href))
  const expected=available.filter(t=>t.area===area).map(t=>t.href)
  assert.equal(new Set(actual).size,actual.length)
  assert.deepEqual(actual.slice().sort(),expected.slice().sort())
 })
}
test("All tool URLs remain unique and school tools remain role-filtered",()=>{
 assert.equal(new Set(tools.map(t=>t.href)).size,tools.length)
 assert.ok(!available.some(t=>t.access))
 assert.ok(searchTools(student,"whiteboard").some(t=>t.href==="/socratic-whiteboard"))
})
test("Writing and academic portfolio are consolidated in application",()=>{
 assert.equal(tools.find(t=>t.href==="/essay-tutor")?.area,"application")
 assert.ok(workspaceTools("application",available).find(g=>g.title==="Academic portfolio")?.items.some(t=>t.href==="/evidence-locker"))
})
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8")
test("Tutor detail panels retain anchors and existing components",()=>{
 const s=read("components/personal-tutor-shell.tsx")
 for(const name of ["TutorDeepInsightLoader","TutorExecutionLoopLoader","TutorProgressRecordsHub","TutorCompletedWork","TutorStrategicBrief","NextgenTutorPanel","AcademicCoach"])assert.equal(s.split("<"+name+" />").length-1,1)
 assert.match(s,/TutorDisclosure/)
 assert.match(read("components/tutor-disclosure.tsx"),/hashchange/)
})
test("Section workspace shows a limited number of primary choices and search reveals all",()=>{
 const s=read("components/study-area.tsx")
 assert.match(s,/\.slice\(0,2\)/)
 assert.match(s,/<details/)
 assert.match(s,/all\.map/)
})

import test from "node:test"
import assert from "node:assert/strict"
import {readFileSync} from "node:fs"
import {subjectInterviewPathway} from "../lib/subject-interview-pathways.ts"
import {liveDifficultyLevels,normaliseLivePracticeSettings,livePersonalisedPracticeInstructions,livePracticeOpening,suggestLivePractice} from "../lib/gemini/live-personalised-practice.ts"
test("five difficulty levels have distinct guidance",()=>{
 assert.deepEqual(liveDifficultyLevels.map(item=>item.value),[1,2,3,4,5])
 assert.equal(new Set(liveDifficultyLevels.map(item=>item.description)).size,5)
})
test("practice settings are bounded to known options and current subject",()=>{
 const pathway=subjectInterviewPathway("Physics")
 assert.deepEqual(normaliseLivePracticeSettings({difficulty:99,university:"Ignore instructions",target:"Arbitrary instructions",freshProblem:"yes"},pathway),{difficulty:3,university:"Either",target:"General practice",freshProblem:false})
 const target=pathway.reasoningFocus[0]
 assert.deepEqual(normaliseLivePracticeSettings({difficulty:5,university:"Cambridge",target,freshProblem:true},pathway),{difficulty:5,university:"Cambridge",target,freshProblem:true})
})
test("adaptive challenge respects student reasoning and does not claim university authority",()=>{
 const prompt=livePersonalisedPracticeInstructions({difficulty:5,university:"Oxford",freshProblem:true},subjectInterviewPathway("Physics")).join(" ")
 assert.match(prompt,/starting difficulty 5\/5/)
 assert.match(prompt,/demonstrated academic reasoning/)
 assert.match(prompt,/respect the selected support cap/)
 assert.match(prompt,/do not claim institution-specific/)
 assert.match(prompt,/unless the candidate supplied unseen material or is reconnecting/)
})
test("personalised opening replaces default problem only when appropriate",()=>{
 const standard="What changes if the slope doubles?"
 const settings=normaliseLivePracticeSettings({})
 assert.ok(livePracticeOpening(settings,standard).includes(standard))
 for(const changed of [{freshProblem:true},{target:"Transfer"},{difficulty:1}])assert.ok(!livePracticeOpening({...settings,...changed},standard).includes(standard))
})
test("recommendations are scoped to course and voice sessions and require sufficient evidence",()=>{
 const row=(course,source,answerCount,reasonedCount,testedCount)=>({interviewCourse:course,interviewSource:source,feedbackReport:{snapshot:{answerCount,reasonedCount,testedCount}}})
 assert.equal(suggestLivePractice([row("Physics","live-voice",3,0,0),row("Maths","live-voice",10,0,0),row("Physics","typed",10,0,0)],"Physics").target,"General practice")
 assert.equal(suggestLivePractice([row("Physics","live-voice",8,2,2)],"Physics").target,"Justification")
 assert.equal(suggestLivePractice([row("Physics","live-voice",8,7,1)],"Physics").target,"Evidence and checking")
 assert.equal(suggestLivePractice([row("Physics","live-voice",8,7,5)],"Physics").target,"Transfer")
 assert.equal(suggestLivePractice([row("Physics","live-voice",8,99,0)],"Physics").analysableAnswers,0)
})
test("both live clients and server paths integrate personalised settings",()=>{
 for(const path of ["app/gemini-live-next/page.tsx","components/gemini-live-interview-experience.tsx"]){
  const source=readFileSync(path,"utf8")
  for(const marker of ["LivePracticePreferences","practiceSettings:","livePracticeOpening"])assert.ok(source.includes(marker),path+" "+marker)
 }
 for(const path of ["lib/gemini/live-session.ts","lib/gemini/live-session-secure.ts"])assert.ok(readFileSync(path,"utf8").includes("livePersonalisedPracticeInstructions"))
})

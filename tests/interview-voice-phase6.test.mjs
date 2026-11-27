import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { liveInterviewAtmosphereInstructions, panelTurn, panelSpeechSettings, isAcademicStageResponse } from "../lib/gemini/live-interview-atmosphere.ts"
import { mockDurations, mockInterviewFormat, mockInterviewStage } from "../lib/full-mock-interview.ts"

test("new lengths coexist with legacy formats and 45 minutes includes a second problem",()=>{
 for(const minutes of [5,10,15,20,25,30,40,45,60]) {
  assert.ok(mockDurations.includes(minutes))
  assert.equal(mockInterviewFormat(minutes).minutes,minutes)
 }
 assert.ok(mockInterviewFormat(45).stages.some(stage=>stage.id==="second-problem"))
})
test("timer display cannot advance the committed stage",()=>{
 const current=mockInterviewStage({minutes:20,elapsedSeconds:1200,candidateAnswers:8,previousStageIndex:1,holdStage:true})
 assert.equal(current.index,1)
 assert.equal(current.remainingSeconds,0)
 assert.equal(mockInterviewStage({minutes:20,elapsedSeconds:1200,candidateAnswers:8,previousStageIndex:1}).index,2)
})
test("brief fillers and requests to think do not advance the academic schedule",()=>{
 for(const text of ["Um.","Yes.","Could you repeat the question?","Let me think.","I'm not sure."]) assert.equal(isAcademicStageResponse(text),false,text)
 for(const text of ["The force decreases because the distance increases.","I'm not sure, but the model assumes uniform density.","No, because the assumptions differ."]) assert.equal(isAcademicStageResponse(text),true,text)
})
test("panel roles are parsed and a single available voice gets differentiated delivery",()=>{
 assert.deepEqual(panelTurn("B: What would change?"),{role:"B",text:"What would change?"})
 assert.deepEqual(panelTurn("A : Continue."),{role:"A",text:"Continue."})
 assert.deepEqual(panelTurn("What would change?"),{text:"What would change?"})
 assert.equal(panelSpeechSettings(["first","second"],"B").voice,"second")
 assert.equal(panelSpeechSettings(["first"],"B").voice,"first")
 assert.notEqual(panelSpeechSettings(["first"],"A").rate,panelSpeechSettings(["first"],"B").rate)
 assert.equal(panelSpeechSettings([],"B").voice,undefined)
})
test("formal opening, handover, close and reconnect preserve the appropriate role and timing",()=>{
 const fresh=liveInterviewAtmosphereInstructions(true,false,45).join(" ")
 assert.match(fresh,/45 minutes/)
 assert.match(fresh,/meaningful academic boundary/)
 assert.match(fresh,/ask no new question/)
 assert.match(fresh,/not a real Oxford or Cambridge interview/)
 assert.match(liveInterviewAtmosphereInstructions(false,true).join(" "),/without a second introduction/)
})
test("both live screens commit stages only after substantive responses and send the selected duration",()=>{
 for(const path of ["app/gemini-live-next/page.tsx","components/gemini-live-interview-experience.tsx"]){
  const source=readFileSync(path,"utf8")
  for(const marker of ["isAcademicStageResponse","holdStage:true","mockMinutes:","mockCompletionReport"]) assert.ok(source.includes(marker),path+" "+marker)
 }
 const full=readFileSync("app/gemini-live-next/page.tsx","utf8")
 assert.match(full,/waitForClosingAudio/)
 assert.match(full,/panelSpeechSettings/)
 assert.match(full,/Continue the committed academic stage/)
})

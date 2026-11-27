import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import {
 mockDurations, mockInterviewFormat, mockInterviewStage,
 mockStageInstruction, mockCompletionReport,
} from "../lib/full-mock-interview.ts"

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..")
const read=p=>fs.readFileSync(path.join(root,p),"utf8")

test("nine bounded session lengths are supported",()=>{
 assert.deepEqual(mockDurations,[5,10,15,20,25,30,40,45,60])
 for(const bad of [-1,0,1,6,18,31,61,100,NaN,Infinity])
  assert.equal(mockInterviewFormat(bad),null)
 for(const duration of mockDurations){
  const format=mockInterviewFormat(duration)
  assert.equal(format.minutes,duration)
  assert.ok(format.stages.length>=3)
  assert.equal(format.stages[0].startFraction,0)
  assert.equal(format.stages[0].id,"opening")
  assert.equal(format.stages[format.stages.length-1].id,"synthesis")
 }
})

test("all mock schedules have increasing boundaries and meaningful academic roles",()=>{
 for(const duration of mockDurations){
  const format=mockInterviewFormat(duration)
  const fractions=format.stages.map(s=>s.startFraction)
  const minAnswers=format.stages.map(s=>s.minAnswers)
  assert.equal(new Set(format.stages.map(s=>s.id)).size,format.stages.length)
  for(let i=1;i<fractions.length;i++){
   assert.ok(fractions[i]>fractions[i-1],duration+" boundaries")
   assert.ok(minAnswers[i]>minAnswers[i-1],duration+" answer requirements")
  }
  for(const s of format.stages){
   assert.ok(s.label.length>=8)
   assert.ok(s.instruction.length>=65,s.label)
   assert.ok(["A","B"].includes(s.interviewer))
  }
 }
})

test("timed plan never advances before a substantive candidate answer",()=>{
 const first=mockInterviewStage({minutes:25,elapsedSeconds:24*60,candidateAnswers:0,previousStageIndex:0})
 assert.equal(first.index,0)
 assert.equal(first.stage.id,"opening")
 const afterOne=mockInterviewStage({minutes:25,elapsedSeconds:24*60,candidateAnswers:1,previousStageIndex:0})
 assert.equal(afterOne.index,1)
 const noNewAnswer=mockInterviewStage({minutes:25,elapsedSeconds:24*60,candidateAnswers:1,previousStageIndex:1})
 assert.equal(noNewAnswer.index,1)
})

test("a delayed candidate cannot skip from opener to final stage in one answer",()=>{
 const session=mockInterviewStage({minutes:60,elapsedSeconds:65*60,candidateAnswers:10,previousStageIndex:0})
 assert.equal(session.index,1)
 assert.equal(session.stage.id,"build")
 const next=mockInterviewStage({minutes:60,elapsedSeconds:65*60,candidateAnswers:10,previousStageIndex:1})
 assert.equal(next.index,2)
 const handover=mockInterviewStage({minutes:60,elapsedSeconds:65*60,candidateAnswers:10,previousStageIndex:2})
 assert.equal(handover.stage.id,"handover")
})

test("40 and 60 minute interviews introduce separate academic problem stages",()=>{
 for(const duration of [40,45,60]){
  const format=mockInterviewFormat(duration)
  assert.ok(format.stages.some(s=>s.id==="second-problem" && s.interviewer==="B"))
  const secondIndex=format.stages.findIndex(s=>s.id==="second-problem")
  const second=mockInterviewStage({minutes:duration,elapsedSeconds:Math.ceil(duration*60*.8),candidateAnswers:10,previousStageIndex:secondIndex-1})
  assert.equal(second.stage.id,"second-problem")
 }
 for(const duration of [5,10,15,20,25,30])
  assert.ok(!mockInterviewFormat(duration).stages.some(s=>s.id==="second-problem"))
})

test("timer retains actual elapsed time and handles overrun without negative countdown",()=>{
 const atTarget=mockInterviewStage({minutes:5,elapsedSeconds:300,candidateAnswers:0})
 assert.equal(atTarget.remainingSeconds,0)
 assert.equal(atTarget.scheduledTimeReached,true)
 const late=mockInterviewStage({minutes:5,elapsedSeconds:600,candidateAnswers:0})
 assert.equal(late.remainingSeconds,0)
 assert.equal(late.elapsedSeconds,600)
 assert.equal(late.progressPercent,100)
 const negative=mockInterviewStage({minutes:5,elapsedSeconds:-100,candidateAnswers:0})
 assert.equal(negative.elapsedSeconds,0)
 assert.equal(negative.remainingSeconds,300)
})

test("an early exit is recorded as partial, never as a completed mock",()=>{
 const report=mockCompletionReport({minutes:25,elapsedSeconds:240,candidateAnswers:3,visitedStages:["opening","build"],endedBy:"student"})
 assert.equal(report.completed,false)
 assert.match(report.status,/Partial/)
 assert.equal(report.targetMinutes,25)
 assert.equal(report.actualMinutes,4)
 assert.equal(report.notOfficial,true)
})

test("time alone is not enough without synthesis and the second problem",()=>{
 const missing=mockCompletionReport({minutes:60,elapsedSeconds:3600,candidateAnswers:12,visitedStages:["opening","build","challenge","handover","transfer","synthesis"]})
 assert.equal(missing.completed,false)
 assert.match(missing.status,/missed/)
 const all=mockInterviewFormat(60).stages.map(s=>s.id)
 const completed=mockCompletionReport({minutes:60,elapsedSeconds:3700,candidateAnswers:12,visitedStages:all,endedBy:"time"})
 assert.equal(completed.completed,true)
 assert.equal(completed.stageCoverage,"7/7")
 assert.equal(completed.endedBy,"time")
})

test("academic stage instructions remain reasoning-led and don't claim university authority",()=>{
 for(const duration of mockDurations){
  const instruction=mockStageInstruction({minutes:duration,elapsedSeconds:0,candidateAnswers:0})
  assert.match(instruction,/candidate.*reasoning|academic.*reasoning/i)
  assert.match(instruction,/one academic question per turn/i)
  assert.match(instruction,/not.*official Oxford or Cambridge/i)
 }
 assert.equal(mockStageInstruction({minutes:11,elapsedSeconds:0,candidateAnswers:0}),"")
})

test("mock stages are bounded when supplied with invalid previous indices",()=>{
 const a=mockInterviewStage({minutes:15,elapsedSeconds:500,candidateAnswers:4,previousStageIndex:-99})
 const b=mockInterviewStage({minutes:15,elapsedSeconds:500,candidateAnswers:4,previousStageIndex:999})
 assert.ok(a.index>=0&&a.index<=4)
 assert.ok(b.index>=0&&b.index<=4)
 assert.equal(mockCompletionReport({minutes:21,elapsedSeconds:600,candidateAnswers:2}),null)
})

test("formal and reasoning interviews include timed mock selection and second problem transitions",()=>{
 const formal=read("components/advanced-interview-experience.tsx")
 const studio=read("components/reasoning-interview-experience-v2.tsx")
 for(const source of [formal,studio]){
  assert.match(source,/mockDurations/)
  assert.match(source,/mockInterviewStage/)
  assert.match(source,/mockStageIndex/)
  assert.match(source,/mockVisited/)
  assert.match(source,/second-problem/)
  assert.match(source,/secondaryProblem/)
  assert.match(source,/mockCompletionReport/)
  assert.match(source,/mockDuration/)
 }
})

test("both typed routes validate the mock format and provide staged interviewer instructions",()=>{
 const formal=read("app/api/interview-turn/route.ts")
 const reasoning=read("app/api/reasoning-interview-turn/route.ts")
 for(const source of [formal,reasoning]){
  assert.match(source,/mockInterviewStage/)
  assert.match(source,/mockStageInstruction/)
  assert.match(source,/mockTargetMinutes/)
  assert.match(source,/candidateTurnCount|candidateAnswers/)
 }
})

test("voice tokens, planned reconnect and second problem are hooked to the mock programme",()=>{
 const live=read("app/gemini-live-next/page.tsx")
 const token=read("lib/gemini/live-session-secure.ts")
 for(const marker of ["mockMinutes","mockDurations","mockInterviewStage","plannedVoiceReconnect","startSecondProblem","mockCompletionReport","lastMockAnswerCountRef"])
  assert.ok(live.includes(marker),"missing voice feature "+marker)
 assert.match(token,/mockInterviewFormat/)
 assert.match(token,/mockAgenda/)
 assert.match(token,/mockStageInstruction/)
 assert.match(live,/24\*60/)
 assert.match(live,/Resume interview/)
})

test("mock landing and Interview Hub use one launcher with all three existing engines",()=>{
 const landing=read("app/full-mock-interview/page.tsx"),hub=read("app/interviews/page.tsx"),launcher=read("components/interview-launcher.tsx"),config=read("lib/interview-launch.ts")
 assert.match(hub,/<InterviewLauncher\/>/)
 assert.match(landing,/initialMode="mock"/)
 for(const href of ["/interview-room","/reasoning-interview","/gemini-live-next"])assert.ok(config.includes(href))
 assert.match(launcher,/launchDurations/)
 for(const source of ["components/advanced-interview-experience.tsx","components/reasoning-interview-experience-v2.tsx","app/gemini-live-next/page.tsx"])assert.match(read(source),/readInterviewLaunch\(window.location.search,tracks\)/)
})

/**
 * Phase 7: a transparent practice-interview schedule. This is FELLOW's
 * simulation, not an official Oxford or Cambridge admissions timetable.
 *
 * Academic stage changes happen only after a candidate answer: the timer does
 * not interrupt a student who is in the middle of a line of reasoning.
 */
export type MockDuration = 5 | 15 | 25 | 40 | 60
export type MockStageId = "opening" | "build" | "challenge" | "handover" | "second-problem" | "transfer" | "synthesis"
export type MockStage = {
  id: MockStageId
  label: string
  startFraction: number
  minAnswers: number
  interviewer: "A" | "B"
  instruction: string
}
export type MockFormat = {
  minutes: MockDuration
  label: string
  description: string
  stages: MockStage[]
}
const stage = (id:MockStageId,label:string,startFraction:number,minAnswers:number,interviewer:"A"|"B",instruction:string):MockStage =>
  ({id,label,startFraction,minAnswers,interviewer,instruction})

const formats:Record<MockDuration,MockFormat> = {
  5:{minutes:5,label:"5-minute academic warm-up",description:"A concise reasoning-first exchange, one challenge and a reflective finish.",stages:[
    stage("opening","Opening problem",0,0,"A","Ask one focused, accessible academic opening question. Do not reveal its solution."),
    stage("challenge","Test the reasoning",.35,1,"A","Challenge one concrete assumption, unit, inference or counterexample grounded in the candidate's answer."),
    stage("synthesis","Final synthesis",.78,2,"A","Ask the candidate to summarise what they established and which limitation remains. Do not introduce an unrelated topic."),
  ]},
  15:{minutes:15,label:"15-minute subject interview",description:"One linked academic problem with progressive challenge, transfer and synthesis.",stages:[
    stage("opening","Opening problem",0,0,"A","Introduce a substantial course-relevant problem and let the candidate establish a first approach."),
    stage("build","Develop the model",.18,1,"A","Follow the candidate's actual idea; ask for one justification or calculation step rather than changing topic."),
    stage("challenge","Challenge an assumption",.46,2,"A","Change one condition or offer a counterexample, giving the candidate room to repair the argument."),
    stage("transfer","Transfer the principle",.72,3,"A","Transfer the same underlying principle to a related but unfamiliar context."),
    stage("synthesis","Final synthesis",.9,4,"A","Invite a concise conclusion identifying evidence, limits and one corrected assumption."),
  ]},
  25:{minutes:25,label:"25-minute full academic mock",description:"Sustained reasoning, new evidence, cross-examination and a final synthesis.",stages:[
    stage("opening","Opening problem",0,0,"A","Open with a subject-relevant problem that can be solved from accessible foundations."),
    stage("build","Deep linked follow-ups",.12,1,"A","Probe definitions, reasoning and checks within the same problem; do not award marks for an unsupported guess."),
    stage("challenge","New evidence or counterexample",.42,3,"B","As a second academic perspective, change one assumption or provide a relevant data challenge without solving it."),
    stage("transfer","Academic transfer",.72,5,"B","Ask the candidate to apply their method in an unfamiliar but clearly related situation."),
    stage("synthesis","End-of-interview synthesis",.91,6,"B","Give the candidate one opportunity to state the argument's strength, revision and remaining uncertainty."),
  ]},
  40:{minutes:40,label:"40-minute extended mock",description:"A first problem, a new academic challenge, deeper transfer and formal close.",stages:[
    stage("opening","Orientation and opening",0,0,"A","Begin with one challenging but accessible problem; allow thinking time."),
    stage("build","Develop first problem",.12,1,"A","Continue probing the current reasoning chain, including diagnostic repairs."),
    stage("challenge","Changed evidence",.38,3,"A","Introduce new information or a difficult limiting case to stress-test the original model."),
    stage("second-problem","Second academic problem",.58,4,"B","The second academic now introduces a genuinely different course-relevant problem. Do not repeat the original opener."),
    stage("transfer","Compare the approaches",.79,6,"B","Test how the candidate applies or adapts a method from the two problems."),
    stage("synthesis","Formal close",.93,7,"B","Invite a final concise synthesis. Do not deliver an admissions prediction."),
  ]},
  60:{minutes:60,label:"60-minute two-part academic mock",description:"Two subject-relevant interview problems, fresh evidence, different academic perspectives and structured debrief.",stages:[
    stage("opening","Opening and framing",0,0,"A","Set up the opening course-relevant problem and ask the student to explain their initial plan."),
    stage("build","Interview A: reasoning chain",.1,1,"A","Develop a sustained first problem with justification, verification and repair."),
    stage("challenge","Interview A: new evidence",.29,3,"A","Introduce changed evidence or a limiting case and test the candidate's revision."),
    stage("handover","Academic handover",.47,4,"B","Transition naturally to the second academic; do not judge the first answer before exploring it."),
    stage("second-problem","Interview B: new problem",.52,5,"B","Begin a distinct subject-relevant academic problem, not a paraphrase of interview A."),
    stage("transfer","Interview B: stretch and transfer",.76,7,"B","Challenge an assumption in the second problem and compare the candidate's reasoning habits across problems."),
    stage("synthesis","Closing synthesis",.93,9,"B","Offer a final reasoned conclusion and one reflective academic comparison, without marks or predictions."),
  ]},
}

export const mockDurations:MockDuration[]=[5,15,25,40,60]
export function mockInterviewFormat(minutes:number):MockFormat|null {
  return mockDurations.includes(minutes as MockDuration) ? formats[minutes as MockDuration] : null
}

export type MockStageInput={
  minutes:number
  elapsedSeconds:number
  candidateAnswers:number
  previousStageIndex?:number
}
export function mockInterviewStage(input:MockStageInput){
  const format=mockInterviewFormat(input.minutes)
  if(!format)return null
  const elapsed=Number.isFinite(input.elapsedSeconds)?Math.max(0,Math.floor(input.elapsedSeconds)):0
  const answers=Number.isFinite(input.candidateAnswers)?Math.max(0,Math.floor(input.candidateAnswers)):0
  const previous=Number.isInteger(input.previousStageIndex)
    ? Math.min(format.stages.length-1,Math.max(0,input.previousStageIndex as number)):0
  let index=0
  for(let i=1;i<format.stages.length;i++){
    const st=format.stages[i]
    if(elapsed<st.startFraction*format.minutes*60||answers<st.minAnswers)break
    // One deliberate stage transition per candidate answer; never jump over
    // a handover after a long pause or a resumed session.
    if(i>previous+1)break
    index=i
  }
  index=Math.max(previous,index)
  const secondsTarget=format.minutes*60
  return {
    format,
    stage:format.stages[index],
    index,
    elapsedSeconds:elapsed,
    remainingSeconds:Math.max(0,secondsTarget-elapsed),
    scheduledTimeReached:elapsed>=secondsTarget,
    progressPercent:Math.min(100,Math.floor(elapsed/secondsTarget*100)),
  }
}
export function mockStageInstruction(input:MockStageInput){
  const current=mockInterviewStage(input)
  if(!current)return ""
  return [
    "FELLOW timed mock-interview programme: "+current.format.label+".",
    "Current stage "+(current.index+1)+" of "+current.format.stages.length+": "+current.stage.label+".",
    current.stage.instruction,
    "Only one academic question per turn, anchored in the candidate's actual reasoning.",
    "The schedule sets an approximate pace, not a demand to interrupt a student mid-answer.",
    "Do not announce an official Oxford or Cambridge scoring standard, predict admission, or give a model answer.",
    "If the target time is reached, invite a natural closing statement after the student's answer, then end the mock without starting another problem.",
  ].join(" ")
}

export type MockReportInput={
  minutes:number
  elapsedSeconds:number
  candidateAnswers:number
  visitedStages?:MockStageId[]
  endedBy?:"student"|"time"|"connection"
}
export function mockCompletionReport(input:MockReportInput){
  const format=mockInterviewFormat(input.minutes)
  if(!format)return null
  const elapsed=Number.isFinite(input.elapsedSeconds)?Math.max(0,Math.floor(input.elapsedSeconds)):0
  const visited=(input.visitedStages||[]).filter((id):id is MockStageId=>format.stages.some(stage=>stage.id===id))
  const stages=[...new Set(visited)]
  const durationMet=elapsed>=format.minutes*60
  const synthesisSeen=stages.includes("synthesis")
  const secondProblemRequired=format.stages.some(st=>st.id==="second-problem")
  const secondProblemSeen=stages.includes("second-problem")
  const complete=durationMet&&synthesisSeen&&(!secondProblemRequired||secondProblemSeen)
  return {
    targetMinutes:format.minutes,
    elapsedSeconds:elapsed,
    actualMinutes:Number((elapsed/60).toFixed(1)),
    candidateAnswers:Math.max(0,Math.floor(input.candidateAnswers||0)),
    visitedStages:stages,
    stageCoverage:stages.length+"/"+format.stages.length,
    completed:complete,
    status:complete?"Completed timed mock":durationMet?"Timed mock reached target but missed a planned stage":"Partial mock — stopped early",
    endedBy:input.endedBy||"student",
    notOfficial:true,
  }
}

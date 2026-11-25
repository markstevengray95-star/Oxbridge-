/**
 * Data minimisation for school/teacher read-only views.
 * Never forward whole test payloads, unfiltered AI state, or external URLs.
 */
function object(value: unknown):Record<string,unknown>{
  return value&&typeof value==="object"&&!Array.isArray(value)?value as Record<string,unknown>:{}
}
function text(value:unknown,limit:number){
  return typeof value==="string"?value.replace(/\s+/g," ").trim().slice(0,limit):null
}
function numeric(value:unknown,min=0,max=100){
  if(value===null||value===undefined||value==="")return null
  const n=Number(value)
  return Number.isFinite(n)?Math.max(min,Math.min(max,n)):null
}
export function schoolSafePagePath(value:unknown):string|null{
  if(typeof value!=="string")return null
  const pathname=value.split(/[?#]/)[0]
  if(!/^\/(?:[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)*)?\/?$/.test(pathname)||pathname.length>160)return null
  const section=pathname.split("/").filter(Boolean)[0]
  // A category rather than a route carrying candidate IDs or test answers.
  return section?"/"+section.toLowerCase():"/"
}
export function schoolTestReview(payload:unknown){
  const data=object(payload)
  const reviews=Array.isArray(data.questionReview)?data.questionReview.slice(0,80):[]
  return reviews.flatMap((value,index)=>{
    const item=object(value)
    const prompt=text(item.prompt,1200)||null
    const answer=text(item.answer??item.selectedAnswer,1200)
    const correctAnswer=text(item.correctAnswer,1200)
    const explanation=text(item.explanation,1200)
    if(!prompt&&!answer&&!correctAnswer)return []
    return [{
      number:index+1,questionId:text(item.questionId??item.id,100),
      section:text(item.section,100),difficulty:text(item.difficulty,40),
      prompt,answer,correctAnswer,explanation,
      correct:typeof item.correct==="boolean"?item.correct:null,
      rawMark:numeric(item.rawMark,0,10000),maxMarks:numeric(item.maxMarks,0,10000),
    }]
  })
}
export function schoolFeedbackExcerpt(value:unknown){
  const data=object(value)
  const report=object(data.feedbackReport)
  const priorities=Array.isArray(report.priorities)?report.priorities.slice(0,3):[]
  const summary=object(data.mockSession)
  return {
    score:numeric(data.score,0,100),
    source:text(data.source,60),
    practiceStatus:text(summary.status,150),
    practiceTargetMinutes:numeric(summary.targetMinutes,0,120),
    priorities:priorities.map(item=>({
      target:text(object(item).target,180),
      task:text(object(item).task,400),
    })).filter(x=>x.target),
  }
}
export function recordedSeconds(value:unknown){
  return Math.floor(numeric(value,0,86400)??0)
}
export function latestRecordedAt(values:unknown[]):string|null{
  const dates=values.filter((x):x is string=>typeof x==="string"&&Number.isFinite(Date.parse(x)))
  return dates.sort((a,b)=>Date.parse(b)-Date.parse(a))[0]??null
}

/** Phase 14. Descriptive longitudinal evidence, not an admissions score. */
type Row=Record<string,unknown>
const obj=(v:unknown):Row=>v&&typeof v==="object"&&!Array.isArray(v)?v as Row:{}
const arr=(v:unknown):unknown[]=>Array.isArray(v)?v:[]
const str=(v:unknown,max=240)=>typeof v==="string"?v.trim().slice(0,max):""
const num=(v:unknown)=>typeof v==="number"&&Number.isFinite(v)?v:null
const int=(v:unknown,min:number,max:number)=>typeof v==="number"&&Number.isInteger(v)&&v>=min&&v<=max?v:null
const DAY=86400000
const pct=(n:number,d:number)=>d>0?Math.round(100*n/d):null
const tests=new Set(["TMUA","ESAT","TARA","LNAT","UCAT"])
const modes=new Set(["formal","reasoning","voice","saved"])
export type AssessmentCoachRecord={id:string;skill:string;title:string;course?:string;review?:boolean;date:string;diagnosticCorrect:boolean;transferCorrect:boolean}
export type AssessmentExample={date:string;source:string;question:string;response:string;expected:string;raw:number;max:number}
export type AssessmentPattern={test:string;section:string;paperCount:number;distinctMissed:number;attemptedCount:number;missedCount:number;omittedCount:number;examples:AssessmentExample[];action:string}
export type InterviewTrend={course:string;mode:string;sessionCount:number;points:{date:string;answers:number;reasoning:number;testing:number;revision:number}[];comparison:{earlierAnswers:number;recentAnswers:number;reasoningDelta:number;testingDelta:number}|null;examples:{date:string;question:string;quote:string;observation:string}[]}
export type PaperTrend={test:string;section:string;points:{date:string;form:string;raw:number;max:number;accuracy:number}[]}
export function buildAssessmentReport(progressValue:unknown,profileValue:unknown,coachRecords:AssessmentCoachRecord[],now=new Date()){
 const progress=obj(progressValue),course=str(obj(profileValue).course,120),asOf=now.toISOString()
 const date=(v:unknown)=>{const t=Date.parse(str(v));return Number.isFinite(t)&&t<=now.getTime()&&t>=now.getTime()-90*DAY?new Date(t).toISOString():null}
 const unique=new Set<string>()
 const interviews=new Map<string,InterviewTrend>()
 for(const item of arr(progress.logs).slice(0,100)){
  const report=obj(obj(item).feedbackReport),s=obj(report.snapshot),id=str(s.id),d=date(s.createdAt)
  const name=str(s.course,120),mode=str(s.source),answers=int(s.answerCount,3,300)
  const reason=int(s.reasonedCount,0,answers??0),testing=int(s.testedCount,0,answers??0),revision=int(s.revisionCount,0,answers??0)
  if(!course||name.toLowerCase()!==course.toLowerCase()||!id||unique.has("i:"+id)||!d||!modes.has(mode)||answers===null||reason===null||testing===null||revision===null)continue
  unique.add("i:"+id)
  const g=interviews.get(mode)??{course:name,mode,sessionCount:0,points:[],comparison:null,examples:[]}
  g.points.push({date:d,answers,reasoning:reason,testing,revision});g.sessionCount++
  for(const item of arr(report.improvements).slice(0,2)){
   const e=obj(item),quote=str(e.quote,220),question=str(e.question,240),observation=str(e.observation,400)
   if(quote&&question&&observation)g.examples.push({date:d,question,quote,observation})
  }
  interviews.set(mode,g)
 }
 for(const g of interviews.values()){
  g.points.sort((a,b)=>a.date.localeCompare(b.date))
  g.examples.sort((a,b)=>b.date.localeCompare(a.date));g.examples=g.examples.slice(0,3)
  // Two disjoint groups of two sessions; weight by observed answers, not session percentages.
  if(g.points.length>=4){
   const recent=g.points.slice(-2),earlier=g.points.slice(-4,-2)
   const sum=(rows:typeof recent,key:"answers"|"reasoning"|"testing")=>rows.reduce((n,r)=>n+r[key],0)
   const ea=sum(earlier,"answers"),ra=sum(recent,"answers")
   g.comparison={earlierAnswers:ea,recentAnswers:ra,reasoningDelta:Math.round(100*(sum(recent,"reasoning")/ra-sum(earlier,"reasoning")/ea)),testingDelta:Math.round(100*(sum(recent,"testing")/ra-sum(earlier,"testing")/ea))}
  }
 }
 type Group={test:string;section:string;papers:Set<string>;missIds:Set<string>;attemptedCount:number;missedCount:number;omittedCount:number;examples:AssessmentExample[]}
 const patterns=new Map<string,Group>(),paperTrends=new Map<string,PaperTrend>()
 let paperCount=0
 for(const item of arr(progress.fullPaperResults).slice(0,40)){
  const p=obj(item),id=str(p.id),test=str(p.test),d=date(p.date)
  if(!id||unique.has("p:"+id)||!d||!tests.has(test))continue
  unique.add("p:"+id);paperCount++
  const sectionSeen=new Set<string>()
  for(const item of arr(p.sections).slice(0,20)){
   const s=obj(item),section=str(s.title),max=num(s.maxMarks),raw=num(s.rawMark)
   if(s.kind!=="mcq"||!section||sectionSeen.has(section)||max===null||max<=0||max>300||raw===null||raw<0||raw>max)continue
   sectionSeen.add(section)
   const key=test+"|"+section
   const g=paperTrends.get(key)??{test,section,points:[]}
   g.points.push({date:d,form:str(typeof p.form==="number"?String(p.form):p.form,20)||"Unknown",raw,max,accuracy:pct(raw,max)!});paperTrends.set(key,g)
  }
  const seen=new Set<string>()
  for(const item of arr(p.questionReview).slice(0,300)){
   const q=obj(item),qid=str(q.questionId),section=str(q.section),prompt=str(q.prompt,350),response=str(q.answer,250),expected=str(q.correctAnswer,250),raw=num(q.rawMark),max=num(q.maxMarks)
   if(!qid||seen.has(qid)||!section||!prompt||!response||raw===null||max===null||max<=0||max>10||raw<0||raw>max)continue
   seen.add(qid)
   const key=test+"|"+section
   const g=patterns.get(key)??{test,section,papers:new Set<string>(),missIds:new Set<string>(),attemptedCount:0,missedCount:0,omittedCount:0,examples:[]}
   // An omission is not evidence of a conceptual misconception.
   const omitted=/^unanswered$/i.test(response)||(/^\d+:\s*—(?:\s*·\s*\d+:\s*—)*$/.test(response))
   if(omitted){g.omittedCount++;patterns.set(key,g);continue}
   g.attemptedCount++
   if(raw<max){
    g.papers.add(id);g.missIds.add(qid);g.missedCount++
    g.examples.push({date:d,source:test+" · "+section,question:prompt,response,expected,raw,max})
   }
   patterns.set(key,g)
  }
 }
 const recurring:AssessmentPattern[]=[...patterns.values()].filter(g=>g.papers.size>=2&&g.missIds.size>=2).sort((a,b)=>b.papers.size-a.papers.size||b.missedCount-a.missedCount).slice(0,8).map(g=>({test:g.test,section:g.section,paperCount:g.papers.size,distinctMissed:g.missIds.size,attemptedCount:g.attemptedCount,missedCount:g.missedCount,omittedCount:g.omittedCount,examples:g.examples.sort((a,b)=>b.date.localeCompare(a.date)).slice(0,3),action:"Review the exact missed items and explain the first incorrect or unsupported step. Then attempt a fresh question in the same section without using the solution."}))
 const coachSeen=new Set<string>()
 const coach=coachRecords.filter(r=>{if(!r.id||coachSeen.has(r.id)||!date(r.date)||typeof r.diagnosticCorrect!=="boolean"||typeof r.transferCorrect!=="boolean")return false;coachSeen.add(r.id);return true}).sort((a,b)=>b.date.localeCompare(a.date))
 const coachSkills=[...new Set(coach.map(r=>r.skill))].map(skill=>{
  const group=coach.filter(r=>r.skill===skill),initial=group.filter(r=>!r.review),reviews=group.filter(r=>r.review)
  return {skill,completed:initial.length,diagnosticCorrect:initial.filter(r=>r.diagnosticCorrect).length,transferCorrect:initial.filter(r=>r.transferCorrect).length,delayedCompleted:reviews.length,delayedCorrect:reviews.filter(r=>r.transferCorrect).length,records:group.slice(0,8)}
 })
 const retests=arr(progress.interventionResults).slice(0,50).map(obj).filter(r=>{const id=str(r.id),accuracy=num(r.retestAccuracy);if(!id||unique.has("r:"+id)||!date(r.date)||!tests.has(str(r.test))||accuracy===null||accuracy<0||accuracy>100)return false;unique.add("r:"+id);return true}).map(r=>({date:date(r.date)!,test:str(r.test),accuracy:num(r.retestAccuracy)!,questions:int(r.questionCount,1,300),answered:int(r.answered,0,300),targets:arr(r.targets).map(t=>str(t)).filter(Boolean).slice(0,5)})).sort((a,b)=>b.date.localeCompare(a.date)).slice(0,8)
 const next=recurring.length?{title:"Investigate a recurring test difficulty",detail:recurring[0].test+" · "+recurring[0].section+". "+recurring[0].action,href:"/paper-intervention",success:"Explain the method, then answer a fresh item without the worked solution."}:coach.some(r=>!r.transferCorrect)?{title:"Revisit a missed fresh coaching check",detail:"Use another example of "+coach.find(r=>!r.transferCorrect)!.skill+".",href:"/tutor#academic-coach",success:"Justify a fresh answer, then complete the delayed review when due."}:{title:"Collect more comparable evidence",detail:"Complete another subject interview or admissions paper before making conclusions about progress.",href:"/tutor#academic-coach",success:"Record a new independent practice attempt."}
 return {asOf,course:course||null,windowDays:90,interviewCount:[...interviews.values()].reduce((n,g)=>n+g.sessionCount,0),paperCount,coachCount:coach.length,interviews:[...interviews.values()],paperTrends:[...paperTrends.values()].map(g=>({...g,points:g.points.sort((a,b)=>a.date.localeCompare(b.date)).slice(-8)})).sort((a,b)=>a.test.localeCompare(b.test)||a.section.localeCompare(b.section)),recurring,coachSkills,retests,next}
}
export type AssessmentReport=ReturnType<typeof buildAssessmentReport>

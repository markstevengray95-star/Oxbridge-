/** A bounded, evidence-only view of the user's saved preparation records. */
type Row=Record<string,unknown>
const obj=(v:unknown):Row=>v&&typeof v==="object"&&!Array.isArray(v)?v as Row:{}
const arr=(v:unknown):unknown[]=>Array.isArray(v)?v:[]
const str=(v:unknown,max=500)=>typeof v==="string"?v.trim().slice(0,max):""
const answer=(v:unknown)=>Array.isArray(v)?v.map(x=>typeof x==="string"?x:String(x??"")).join("; ").slice(0,900):v&&typeof v==="object"?Object.entries(v as Row).slice(0,20).map(([key,value])=>key+": "+String(value??"")).join("; ").slice(0,900):str(v,900)
const finite=(v:unknown)=>typeof v==="number"&&Number.isFinite(v)&&v>=0?v:null
const date=(v:unknown)=>{const raw=str(v,50),n=Date.parse(raw);return raw&&Number.isFinite(n)&&n<=Date.now()+86400000?new Date(n).toISOString():null}
const score=(raw:unknown,max:unknown)=>{const a=finite(raw),b=finite(max);return a!==null&&b!==null&&b>0&&a<=b?{raw:a,max:b}:null}
const list=(v:unknown,n=6)=>arr(v).map(x=>typeof x==="string"?str(x,500):str(obj(x).action??obj(x).title??obj(x).comment??obj(x).feedback,500)).filter(Boolean).slice(0,n)
export type ProgressKind="interview"|"test"|"writing"
export type ProgressTurn={speaker:string;text:string;feedback:string}
export type ProgressQuestion={question:string;answer:string;expected:string;explanation:string;marks:{raw:number;max:number}|null}
export type ProgressRecord={
 id:string;kind:ProgressKind;source:"cloud"|"synced";title:string;date:string|null;summary:string;
 href:string;score:{raw:number;max:number}|null;transcript:ProgressTurn[];questions:ProgressQuestion[];
 feedback:string[];original:string|null;originalTruncated:boolean;truncated:boolean
}
export function buildProgressRecords(interviewsValue:unknown,testsValue:unknown,progressValue:unknown){
 const progress=obj(progressValue),records:ProgressRecord[]=[]
 const interviewRefs=new Set<string>(),paperRefs=new Set<string>(),ids=new Set<string>()
 const add=(row:ProgressRecord)=>{if(!ids.has(row.id)){ids.add(row.id);records.push(row)}}
 for(const item of arr(interviewsValue).slice(0,50)){
  const x=obj(item),id=str(x.id,100);if(!id)continue
  interviewRefs.add(id);const ref=str(x.source_ref,100);if(ref)interviewRefs.add(ref)
  const turns=arr(x.interview_turns).map(obj).sort((a,b)=>(finite(a.turn_index)??0)-(finite(b.turn_index)??0)).slice(0,80).map(t=>({speaker:t.role==="candidate"?"You":t.role==="interviewer"?"Interviewer":"System",text:str(t.content,1800),feedback:str(t.feedback,650)})).filter(t=>t.text)
  const fb=obj(x.overall_feedback)
  add({id:"interview:"+id,kind:"interview",source:"cloud",title:str(x.summary,170)||((str(x.course,80)||"Academic")+" interview"),date:date(x.created_at),summary:str(x.summary,650),href:"/history",score:null,transcript:turns,questions:[],feedback:list(fb.strengths).concat(list(fb.next)).slice(0,8),original:null,originalTruncated:false,truncated:arr(x.interview_turns).length>80})
 }
 for(const item of arr(testsValue).slice(0,50)){
  const x=obj(item),id=str(x.id,100);if(!id)continue
  paperRefs.add(id);const ref=str(x.source_ref,100);if(ref)paperRefs.add(ref)
  const payload=obj(x.payload)
  const rawReviews=arr(payload.questionReview)
  const questions=rawReviews.slice(0,120).map(item=>{const q=obj(item);return {question:str(q.prompt,1000),answer:answer(q.answer??q.selectedAnswer)||"Not recorded",expected:str(q.correctAnswer,900),explanation:str(q.explanation,1500),marks:score(q.rawMark,q.maxMarks)}}).filter(q=>q.question)
  const name=str(x.test,30)
  add({id:"test:"+id,kind:"test",source:"cloud",title:str(x.title,160)||((name||"Admissions test")+" practice"),date:date(x.completed_at),summary:name+(x.form!==null&&x.form!==undefined?" · Form "+str(String(x.form),20):""),href:"/history",score:score(x.raw_score,x.max_raw_marks),transcript:[],questions,feedback:[],original:null,originalTruncated:false,truncated:rawReviews.length>120})
 }
 for(const item of arr(progress.logs).slice(0,50)){
  const x=obj(item),id=str(x.id,100);if(!id||interviewRefs.has(id))continue
  const title=str(x.title,150);if(!/interview|gemini live/i.test(title))continue
  const events=arr(x.events);if(!events.length)continue
  const turns=events.slice(0,80).map(t=>({speaker:"Transcript line",text:str(t,1800),feedback:""})).filter(t=>t.text)
  add({id:"synced-interview:"+id,kind:"interview",source:"synced",title:title||"Previous interview",date:date(x.date),summary:"Synced device record. Exact speaker details and cloud verification may be unavailable.",href:"/interview-insights",score:null,transcript:turns,questions:[],feedback:[],original:null,originalTruncated:false,truncated:events.length>80})
 }
 for(const item of arr(progress.fullPaperResults).slice(0,40)){
  const x=obj(item),id=str(x.id,100);if(!id||paperRefs.has(id))continue
  const rawReviews=arr(x.questionReview)
  const questions=rawReviews.slice(0,120).map(item=>{const q=obj(item);return {question:str(q.prompt,1000),answer:answer(q.answer??q.selectedAnswer)||"Not recorded",expected:str(q.correctAnswer,900),explanation:str(q.explanation,1500),marks:score(q.rawMark,q.maxMarks)}}).filter(q=>q.question)
  add({id:"synced-test:"+id,kind:"test",source:"synced",title:str(x.title,160)||str(x.test,40)||"Previous test",date:date(x.date),summary:"Synced device result",href:"/test-results",score:score(x.rawScore,x.maxRawMarks),transcript:[],questions,feedback:[],original:null,originalTruncated:false,truncated:rawReviews.length>120})
 }
 for(const item of arr(progress.essayAnalyses).slice(0,30)){
  const x=obj(item),id=str(x.id,100);if(!id)continue
  const report=obj(x.report),analysis=obj(x.analysis)
  const raw=str(x.essay,10000)
  const priorities=list(report.priorities,5).concat(list(analysis.priorityImprovements,3)).slice(0,6)
  add({id:"writing:"+id,kind:"writing",source:"synced",title:str(x.prompt,160)||str(x.test,80)||"Written-work review",date:date(x.date),summary:str(report.summary,850)||"Saved written-work analysis",href:"/written-work-vault",score:null,transcript:[],questions:[],feedback:priorities,original:raw||null,originalTruncated:typeof x.essay==="string"&&x.essay.trim().length>10000,truncated:false})
 }
 return records.sort((a,b)=>(b.date?Date.parse(b.date):-Infinity)-(a.date?Date.parse(a.date):-Infinity)||a.id.localeCompare(b.id)).slice(0,150)
}
export function progressTotals(records:ProgressRecord[],availability:{interviews:boolean;tests:boolean;writing:boolean}){
 const count=(kind:ProgressKind,ready:boolean)=>ready?records.filter(r=>r.kind===kind).length:null
 return {interviews:count("interview",availability.interviews),tests:count("test",availability.tests),writing:count("writing",availability.writing)}
}

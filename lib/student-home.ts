/** Home is a read-only overview of existing preparation evidence. */
export type HomeProfile={course:string|null;university:string|null;year:string|null}
export type HomeActivity={title:string;detail:string;href:string;button:string;minutes:number|null;kind:"assignment"|"review"|"setup"|"coaching"|"interview"|"progress"}
export type HomeSummary={profile:HomeProfile;week:{interviews:number|null;tests:number|null;coaching:number};coach:{title:string;reason:string;due:boolean}|null;latest:string|null;asOf:string}
type Row=Record<string,unknown>
const obj=(v:unknown):Row=>v&&typeof v==="object"&&!Array.isArray(v)?v as Row:{}
const arr=(v:unknown):unknown[]=>Array.isArray(v)?v:[]
const str=(v:unknown,max=160)=>typeof v==="string"?v.trim().slice(0,max):""
const date=(v:unknown)=>typeof v==="string"?Date.parse(v):NaN
const DAY=86400000
export function homeProfile(state:unknown,profile:unknown):HomeProfile{
 const s=obj(state),p=obj(profile)
 const university=str(s.university)||str(p.target_university)
 const rawYear=s.year??p.application_year
 const year=typeof rawYear==="number"||typeof rawYear==="string"?String(rawYear):""
 return {course:str(s.course)||str(p.target_course)||null,university:["Oxford","Cambridge","Both"].includes(university)?university:null,year:/^20\d{2}$/.test(year)?year:null}
}
export function pendingAssignments(value:unknown,now=Date.now()){
 const pending:{id:string;title:string;dueAt:string|null;overdue:boolean;urgent:boolean}[]=[]
 const seen=new Set<string>()
 for(const item of arr(obj(value).joined)){
  const group=obj(item)
  const done=new Set(arr(group.progress).map(obj).filter(p=>p.status==="completed").map(p=>str(p.assignment_id)))
  for(const item of arr(group.assignments)){
   const a=obj(item),id=str(a.id),title=str(a.title),d=date(a.due_at)
   if(!id||!title||seen.has(id)||done.has(id))continue
   seen.add(id)
   pending.push({id,title,dueAt:Number.isFinite(d)?new Date(d).toISOString():null,overdue:Number.isFinite(d)&&d<now,urgent:Number.isFinite(d)&&d<=now+2*DAY})
  }
 }
 return pending.sort((a,b)=>(a.dueAt?Date.parse(a.dueAt):Infinity)-(b.dueAt?Date.parse(b.dueAt):Infinity)||a.id.localeCompare(b.id))
}
export function nextHomeActivity(summary:HomeSummary,school:unknown,now=Date.now()):HomeActivity{
 const task=pendingAssignments(school,now)[0]
 if(task?.urgent)return {kind:"assignment",title:task.title,detail:task.overdue?"This school assignment is overdue. Open your classroom to review the task and any required reflection.":"A school assignment is due within the next two days. Open your classroom to review the instructions.",href:"/school-classroom",button:"Open assignment",minutes:null}
 if(summary.coach?.due)return {kind:"review",title:"Revisit "+summary.coach.title,detail:"A spaced coaching review is due. Try a fresh example before reading your previous answer.",href:"/tutor#academic-coach",button:"Start review",minutes:15}
 if(!summary.profile.course||!summary.profile.university||!summary.profile.year)return {kind:"setup",title:"Set your preparation goals",detail:"Choose your intended course, university and entry year in your preparation profile so activities can be relevant to your application.",href:"/application-profile",button:"Set up my profile",minutes:null}
 if(summary.coach)return {kind:"coaching",title:summary.coach.title,detail:summary.coach.reason,href:"/tutor#academic-coach",button:"Start coaching",minutes:15}
 if(summary.week.interviews===0)return {kind:"interview",title:"Practise an academic interview",detail:"Explain an unfamiliar "+summary.profile.course+" problem aloud or in writing. Treat this as a new practice opportunity, not a judgement of ability.",href:"/study/interviews",button:"Choose interview",minutes:null}
 return {kind:"progress",title:"Review your recent preparation",detail:"Look at your saved evidence and choose a fresh activity that builds on what you have already practised.",href:"/study/progress",button:"Review progress",minutes:null}
}
export function weeklyCount(dates:unknown[],now:number){
 return dates.filter(v=>{const t=date(v);return Number.isFinite(t)&&t<=now&&t>=now-7*DAY}).length
}

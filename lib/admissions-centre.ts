/** Phase 21: entry points for existing question engines, never a second marking system. */
export const admissionsTests=["TMUA","ESAT","TARA","LNAT","UCAT"] as const
export type AdmissionsTest=typeof admissionsTests[number]
export const practiceModes=["mock","topic","adaptive","review"] as const
export type PracticeMode=typeof practiceModes[number]
export type PracticeOption={id:PracticeMode;title:string;description:string;duration:string}
export const practiceOptions:PracticeOption[]=[
 {id:"mock",title:"Full timed mock",description:"Sit the complete authored practice paper with sectional timers, flags and marking.",duration:"Full paper"},
 {id:"topic",title:"Topic-by-topic questions",description:"Work through short original questions and read explanations after answering.",duration:"Short practice"},
 {id:"adaptive",title:"Adaptive practice paper",description:"Generate fresh practice emphasising less secure topics where evidence exists.",duration:"20 questions by default"},
 {id:"review",title:"Review missed questions",description:"Revisit your latest saved full paper and attempt new questions on weaker topics.",duration:"Targeted retest"},
]
export function validAdmissionsTest(value:unknown):AdmissionsTest|null{
 return typeof value==="string"&&admissionsTests.some(t=>t===value)?value as AdmissionsTest:null
}
export function selectedTest(search:string):AdmissionsTest|null{
 return validAdmissionsTest(new URLSearchParams(search).get("test"))
}
export function centreDestination(mode:PracticeMode,test:AdmissionsTest){
 if(mode==="review")return "/paper-intervention?"+new URLSearchParams({test}).toString()
 const route:Record<Exclude<PracticeMode,"review">,string>={mock:"/full-papers",topic:"/admissions-challenges",adaptive:"/adaptive-paper"}
 return route[mode]+"?"+new URLSearchParams({test}).toString()
}
export function nextUnansweredIndex(answered:boolean[],index:number):number|null{
 if(!answered.length||index<0||index>=answered.length)return null
 for(let offset=1;offset<=answered.length;offset++){
  const next=(index+offset)%answered.length
  if(!answered[next])return next
 }
 return null
}
export type RecentPaper={id:string;test:AdmissionsTest;title:string;date:string;score:number|null;maxMarks:number|null}
export function safeRecentPapers(value:unknown):RecentPaper[]{
 if(!Array.isArray(value))return []
 const seen=new Set<string>()
 return value.flatMap(item=>{
  if(!item||typeof item!=="object")return []
  const r=item as Record<string,unknown>,id=typeof r.id==="string"?r.id:"",test=validAdmissionsTest(r.test)
  if(!id||!test||seen.has(id))return []
  seen.add(id)
  const title=typeof r.title==="string"&&r.title.trim()?r.title.trim().slice(0,120):test+" practice paper"
  const date=typeof r.completed_at==="string"&&Number.isFinite(Date.parse(r.completed_at))?r.completed_at:""
  const maxMarks=typeof r.max_raw_marks==="number"&&Number.isFinite(r.max_raw_marks)&&r.max_raw_marks>0?r.max_raw_marks:null
  const raw=typeof r.raw_score==="number"&&Number.isFinite(r.raw_score)&&r.raw_score>=0?r.raw_score:null
  return [{id,test,title,date,score:raw!==null&&maxMarks!==null&&raw<=maxMarks?raw:null,maxMarks}]
 }).slice(0,5)
}

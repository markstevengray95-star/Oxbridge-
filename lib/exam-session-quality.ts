/** Phase 12: exam clock and mark-aware reporting. No scaled-score predictions. */
export function remainingExamSeconds(deadlineMs:number,nowMs:number){
 if(!Number.isFinite(deadlineMs)||!Number.isFinite(nowMs))return 0
 return Math.max(0,Math.ceil((deadlineMs-nowMs)/1000))
}
export function resumeExamDeadline(saved:{deadlineMs?:number;timeLeft:number;savedAt:number},nowMs:number){
 if(typeof saved.deadlineMs==="number"&&Number.isFinite(saved.deadlineMs))return Math.min(saved.deadlineMs,nowMs+Math.max(0,saved.timeLeft)*1000)
 if(!Number.isFinite(saved.timeLeft)||!Number.isFinite(saved.savedAt))return nowMs
 return Math.min(saved.savedAt,nowMs)+Math.max(0,saved.timeLeft)*1000
}
type MarkRow={rawMark:number;maxMarks:number;answered:boolean;attempted?:boolean;difficulty?:string;seconds?:number}
export function paperMarkBreakdown(rows:MarkRow[]){
 const valid=rows.filter(r=>Number.isFinite(r.rawMark)&&Number.isFinite(r.maxMarks)&&r.maxMarks>0&&r.rawMark>=0&&r.rawMark<=r.maxMarks)
 const totals=valid.reduce((a,r)=>({raw:a.raw+r.rawMark,max:a.max+r.maxMarks,fullyCorrect:a.fullyCorrect+Number(r.rawMark===r.maxMarks),partial:a.partial+Number(r.rawMark>0&&r.rawMark<r.maxMarks),unanswered:a.unanswered+Number(!r.answered&&!r.attempted),incomplete:a.incomplete+Number(!r.answered&&Boolean(r.attempted)),zero:a.zero+Number(r.answered&&r.rawMark===0)}),{raw:0,max:0,fullyCorrect:0,partial:0,unanswered:0,incomplete:0,zero:0})
 const complete=valid.filter(r=>r.answered)
 const attemptedMarks=complete.reduce((s,r)=>s+r.maxMarks,0)
 const attemptedRaw=complete.reduce((s,r)=>s+r.rawMark,0)
 const byDifficulty=Array.from(new Set(valid.map(r=>r.difficulty||"Unlabelled"))).map(label=>{
  const group=valid.filter(r=>(r.difficulty||"Unlabelled")===label)
  const max=group.reduce((s,r)=>s+r.maxMarks,0),raw=group.reduce((s,r)=>s+r.rawMark,0)
  return {label,count:group.length,raw,max,accuracy:Math.round(100*raw/max)}
 })
 return {...totals,count:valid.length,answered:complete.length,accuracy:totals.max?Math.round(100*totals.raw/totals.max):null,answeredAccuracy:attemptedMarks?Math.round(100*attemptedRaw/attemptedMarks):null,byDifficulty}
}
export function retestPromptSignature(prompt:string){
 return prompt.normalize("NFKC").toLowerCase().replace(/\d+(?:[.,]\d+)*/g,"#").replace(/[^\p{L}#]+/gu," ").trim().replace(/\s+/g," ")
}
export function retestSectionKey(section:string){
 return section.toLowerCase().replace(/^\s*(?:paper\s+\d+|section\s+[a-z])\s*[·:–—-]\s*/,"").replace(/[^a-z0-9 ]/g," ").replace(/\s+/g," ").trim()
}
export type FreshQuestion={id:string;test:string;section:string;prompt:string}
export type SeenQuestion={questionId?:string;prompt?:string}
export function chooseFreshRetest<T extends FreshQuestion>(pool:T[],test:string,targetSections:string[],seen:SeenQuestion[],count=12){
 const ids=new Set(seen.map(q=>q.questionId).filter(Boolean))
 const signatures=new Set(seen.map(q=>typeof q.prompt==="string"?retestPromptSignature(q.prompt):"").filter(Boolean))
 const keys=[...new Set(targetSections.map(retestSectionKey).filter(Boolean))]
 const groups=keys.map(key=>pool.filter(q=>q.test===test&&retestSectionKey(q.section)===key))
 const selected:T[]=[]
 const limit=Math.max(0,Math.min(30,Math.floor(count)))
 // Round-robin over targeted sections; never silently use another section or reuse a stem.
 const cursors=groups.map(()=>0)
 while(selected.length<limit){
  let advanced=false
  for(let i=0;i<groups.length&&selected.length<limit;i++){
   while(cursors[i]<groups[i].length){
    const q=groups[i][cursors[i]++],signature=retestPromptSignature(q.prompt)
    if(!signature||ids.has(q.id)||signatures.has(signature))continue
    ids.add(q.id);signatures.add(signature);selected.push(q);advanced=true;break
   }
  }
  if(!advanced)break
 }
 return selected
}

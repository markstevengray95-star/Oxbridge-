/** Phase 11: bounded formative practice, not an admissions prediction. */
export type CoachSkill = "inference" | "evidence" | "quantitative" | "revision"
export type CoachQuestion = { prompt: string; options: [string,string,string]; correct: number; explanation: string }
export type CoachPack = { id: string; skill: CoachSkill; title: string; lesson: string; diagnostic: CoachQuestion; transfer: CoachQuestion }
export type CoachAttempt = { packId: string; diagnosticCorrect: boolean; transferCorrect: boolean; completedAt: string }
export const COACH_STATE_PREFIX = "fellow-academic-coach-v1:"
export const skillLabels: Record<CoachSkill,string> = {inference:"Justifying conclusions",evidence:"Testing explanations",quantitative:"Quantitative interpretation",revision:"Adapting to new evidence"}
const q = (prompt:string, options:[string,string,string], correct:number, explanation:string):CoachQuestion => ({prompt,options,correct,explanation})
export const coachPacks: CoachPack[] = [
 {id:"inference-1",skill:"inference",title:"Make a defensible inference",lesson:"A conclusion must follow from stated premises. Test whether there is a possible case in which the premises hold but the conclusion fails.",
 diagnostic:q("All samples that contain copper conduct electricity. Sample X conducts electricity. What follows?",["X must contain copper.","X may contain copper, but other conductors are possible.","X cannot contain copper."],1,"Conductivity is a consequence of containing copper, not sufficient proof of copper."),
 transfer:q("Every member of a club has a library card. Priya has a library card. What can you infer?",["She might be a club member, but the card alone does not establish membership.","She belongs to the club.","She is not a club member."],0,"The implication runs from membership to a card, not the reverse.")},
 {id:"inference-2",skill:"inference",title:"Separate necessary and sufficient conditions",lesson:"A necessary condition must hold for a claim to be true. A sufficient condition guarantees it. They are not interchangeable.",
 diagnostic:q("A scholarship requires a submitted essay, but the essay alone does not guarantee an award. What is the essay?",["Sufficient but not necessary.","Both necessary and sufficient.","Necessary but not sufficient."],2,"An award requires the essay, but other conditions must also be satisfied."),
 transfer:q("A rectangle has four right angles. Is having four right angles sufficient for a quadrilateral to be a square?",["No: equal side lengths are also required.","Yes: every rectangle is a square.","No: a square does not have right angles."],0,"A non-square rectangle is a counterexample.")},
 {id:"evidence-1",skill:"evidence",title:"Distinguish rival explanations",lesson:"A useful test gives different predictions under competing explanations. Change one relevant variable while controlling the others.",
 diagnostic:q("Two groups of plants grow at different rates. One received more light and more fertiliser. Which follow-up best isolates light?",["Compare plants with different light but identical fertiliser, water and plant type.","Give one group extra light and extra fertiliser again.","Measure the tallest plant only."],0,"Holding other factors constant isolates the effect of light."),
 transfer:q("Two historians argue that a price rise was caused by either a transport disruption or a general shortage. Which evidence best distinguishes these?",["A newspaper saying prices rose.","A list of prices without dates or locations.","Comparable price records from affected and unaffected transport routes during the same period."],2,"The rival explanations predict different geographical patterns, assuming other differences are considered.")},
 {id:"evidence-2",skill:"evidence",title:"Check causal claims",lesson:"A correlation may arise through causation, reverse causation, or a shared cause. Ask how the observation could arise without the proposed causal link.",
 diagnostic:q("Students who use a revision app have higher marks. Which claim is best supported by this observation alone?",["The app definitely raises marks.","The association is consistent with an effect, but prior attainment or motivation might explain it.","Higher marks always cause app use."],1,"The observation does not establish the direction or cause of the association."),
 transfer:q("Towns with more libraries have higher average incomes. What would most improve a study of a possible library effect?",["Assume libraries create income.","Discard all towns with low income.","Compare changes in comparable towns, accounting for prior income and other plausible confounders."],2,"A better comparison reduces alternative explanations, though it does not automatically prove causation.")},
 {id:"quantitative-1",skill:"quantitative",title:"Interpret rates, not just totals",lesson:"Compare rates using the relevant denominator. Check the units and calculate the proportion before interpreting raw totals.",
 diagnostic:q("Clinic A reports 12 successes from 20 cases; B reports 21 from 50. Which has the higher observed success proportion?",["B, because 21 is greater than 12.","They are equal.","A: 60% versus 42%."],2,"12/20 = 0.60, while 21/50 = 0.42. This is descriptive, not proof of better care."),
 transfer:q("A machine produces 6 defects in 120 items and another 9 in 300. Which has the lower defect rate?",["The second: 3% versus 5%.","The first: 6 is fewer than 9.","They have the same defect rate."],0,"Divide defects by output: 6/120 = 5%, 9/300 = 3%.")},
 {id:"quantitative-2",skill:"quantitative",title:"Reason with proportional change",lesson:"Identify the initial value and express changes as factors. Successive percentages normally multiply rather than add.",
 diagnostic:q("A price rises by 20% and then falls by 20%. What is the final price relative to the start?",["Unchanged.","4% lower.","4% higher."],1,"1.20 × 0.80 = 0.96, so the final price is 96% of the original."),
 transfer:q("A sample loses 25% of its mass, then gains 20% of its remaining mass. What fraction of the original mass remains?",["95%.","100%.","90%."],2,"0.75 × 1.20 = 0.90.")},
 {id:"revision-1",skill:"revision",title:"Revise a model without discarding everything",lesson:"When evidence conflicts with a prediction, identify the assumption that failed. Retain the parts that still explain observations and make a new testable prediction.",
 diagnostic:q("A model predicts that travel time is proportional to distance at fixed speed. A trip takes longer after a road closure. What is the best revision?",["Discard the relationship between speed, distance and time.","Conclude the distance equation is false.","Check whether speed or actual route distance changed; the original prediction assumed a fixed speed and the stated distance."],2,"The new conditions may violate the assumptions rather than the underlying relationship."),
 transfer:q("An interpretation of a poem assumes the speaker is sincere. A later line appears ironic. What is the strongest response?",["Re-examine sincerity using the new line, and check which earlier textual observations still hold.","Ignore the later line.","Reject all observations about the poem."],0,"Revise the interpretation in light of new evidence without discarding supported details.")},
 {id:"revision-2",skill:"revision",title:"Check the limits of a prediction",lesson:"Do not extend a model beyond its tested conditions without checking the assumptions. A result outside the original range can reveal a boundary.",
 diagnostic:q("A spring extends proportionally to load for small loads. At a large load the extension is no longer proportional. What is the best interpretation?",["The small-load relationship may still be valid within its range.","All previous measurements must be wrong.","The relationship must remain proportional at every load."],0,"The observation limits the range over which the model is supported."),
 transfer:q("A policy increased attendance in small schools. A large school shows no improvement. What should you conclude?",["The policy never works.","The effect may depend on school context; investigate which conditions differ.","The large school's evidence must be ignored."],1,"The effect may have a boundary condition; the earlier result need not be invalid.")}
]
const obj=(v:unknown):Record<string,unknown>=>v&&typeof v==="object"&&!Array.isArray(v)?v as Record<string,unknown>:{}
const arr=(v:unknown):unknown[]=>Array.isArray(v)?v:[]
const text=(v:unknown)=>typeof v==="string"?v:""
const n=(v:unknown)=>typeof v==="number"&&Number.isFinite(v)?v:null
export function readCoachAttempt(value:unknown, packId:string):CoachAttempt|null {
 const a=obj(value)
 if(a.packId!==packId||!coachPacks.some(p=>p.id===packId)||typeof a.diagnosticCorrect!=="boolean"||typeof a.transferCorrect!=="boolean"||!Number.isFinite(Date.parse(text(a.completedAt))))return null
 return {packId,diagnosticCorrect:a.diagnosticCorrect,transferCorrect:a.transferCorrect,completedAt:text(a.completedAt)}
}
export function gradeCoachAttempt(packId:unknown,diagnostic:unknown,transfer:unknown,now=new Date()):CoachAttempt|null{
 const pack=coachPacks.find(p=>p.id===packId)
 if(!pack||typeof diagnostic!=="number"||!Number.isInteger(diagnostic)||diagnostic<0||diagnostic>2||typeof transfer!=="number"||!Number.isInteger(transfer)||transfer<0||transfer>2)return null
 return {packId:pack.id,diagnosticCorrect:diagnostic===pack.diagnostic.correct,transferCorrect:transfer===pack.transfer.correct,completedAt:now.toISOString()}
}
export function chooseCoachPack(progressValue:unknown,profileValue:unknown,attempts:CoachAttempt[],now=new Date()){
 const progress=obj(progressValue), profile=obj(profileValue), course=text(profile.course).trim()
 const done=new Set(attempts.map(a=>a.packId))
 const available=coachPacks.filter(p=>!done.has(p.id))
 const evidence: {skill:CoachSkill;why:string;weight:number}[]=[]
 const recent=(v:unknown)=>{const t=Date.parse(text(v));return Number.isFinite(t)&&t<=now.getTime()&&now.getTime()-t<=30*86400000}
 // Only count bounded, dated Phase 8 observations in the selected course.
 const seen=new Set<string>()
 for(const item of arr(progress.logs).slice(0,80)){
  const snap=obj(obj(obj(item).feedbackReport).snapshot), id=text(snap.id), total=n(snap.answerCount)
  if(!id||seen.has(id)||!course||text(snap.course).trim().toLowerCase()!==course.toLowerCase()||!recent(snap.createdAt)||total===null||total<3||total>300)continue
  seen.add(id)
  for(const [key,skill] of [["reasonedCount","inference"],["testedCount","evidence"],["revisionCount","revision"]] as const){
   const count=n(snap[key]);if(count!==null&&count>=0&&count<=total&&count/total<0.34)evidence.push({skill,why:"Recent same-course interview transcripts contained few explicit "+(skill==="inference"?"reasoning links":skill==="evidence"?"checks":"revisions")+". This is a practice prompt, not a finding of academic weakness.",weight:1})
  }
 }
 for(const item of arr(progress.fullPaperResults).slice(0,12)){
  const paper=obj(item);if(!recent(paper.date??paper.createdAt))continue
  for(const item of arr(paper.sections).slice(0,12)){
   const section=obj(item),accuracy=n(section.accuracy), attempted=n(section.answered??section.attempted)
   if(section.kind==="essay"||accuracy===null||accuracy<0||accuracy>=60||attempted===null||attempted<5)continue
   const title=text(section.title)
   if(/quantitative|mathematics|maths|numerical/i.test(title))evidence.push({skill:"quantitative",why:"A recent quantitative paper section had below 60% overall accuracy and at least five answered questions. This exercise checks a general quantitative reasoning skill, not the exact missed topic.",weight:2})
  }
 }
 for(const a of attempts){
  const pack=coachPacks.find(p=>p.id===a.packId)
  if(pack&&!a.transferCorrect&&recent(a.completedAt))evidence.push({skill:pack.skill,why:"Your previous fresh-question check for this skill was incorrect. Try a different example before treating it as secure.",weight:4})
 }
 const ranked=available.map((pack,index)=>({pack,index,weight:evidence.filter(e=>e.skill===pack.skill).reduce((s,e)=>s+e.weight,0)})).sort((a,b)=>b.weight-a.weight||a.index-b.index)
 const pack=ranked[0]?.pack??null
 const reason=pack?evidence.filter(e=>e.skill===pack.skill).sort((a,b)=>b.weight-a.weight)[0]?.why??"No sufficiently specific recent evidence supports this choice. Use this short exercise as a baseline.": "You have completed every current exercise. Use the existing interview or paper intervention tools for further practice."
 return {packId:pack?.id??null,reason,course:course||null}
}

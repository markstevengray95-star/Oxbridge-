import type { InsightTurn, EvidenceLinkedFeedback } from "@/lib/interview-feedback-intelligence"
import { observedLiveSupport } from "./live-adaptive-support.ts"
export const liveReviewDimensions = [
 {key:"knowledge",label:"Subject knowledge",description:"A transcript alone cannot independently verify factual or mathematical accuracy."},
 {key:"logic",label:"Logical reasoning",description:"Explicit links between claims and reasons."},
 {key:"problemSolving",label:"Problem-solving",description:"Stated checks, methods, constraints or tests."},
 {key:"curiosity",label:"Academic enquiry",description:"Explicit academic questions or alternative possibilities."},
 {key:"adaptability",label:"Adaptability",description:"Explicit reconsideration of earlier reasoning."},
 {key:"communication",label:"Communication",description:"Explicit definitions, assumptions or reasoning links; not accent or fluency."},
 {key:"independence",label:"Independence",description:"Recorded interviewer support is contextual evidence, not proof of independent reasoning."},
] as const
type Dimension = typeof liveReviewDimensions[number]["key"]
type Annotation = {turn:number;excerpt:string;question:string;signals:Dimension[];priorHint:number|null}
type Target = {title:string;task:string;criterion:string;turn:number|null}
export type AdvancedVoiceReview = {version:"voice-review-1";course:string;responseCount:number;dimensions:{key:Dimension;label:string;description:string;status:"Observed signal"|"Not established"|"Review required";count:number|null}[];annotations:Annotation[];targets:Target[];limitations:string[]}
const logic=/\b(?:because|therefore|since|hence|it follows|this implies|which means|as a result)\b/i
const method=/\b(?:test|check|measure|calculate|compare|experiment|counterexample|limiting case|estimate|assum(?:e|ing|ption)|provided that)\b/i
const enquiry=/\b(?:what if|alternative|another explanation|could also|would .{1,80} change)\b/i
const revise=/\b(?:i now think|i was wrong|on reflection|let me correct|i would revise|i initially thought|i take that back)\b/i
const define=/\b(?:defined as|by .{1,50} i mean|assuming|provided that|in other words)\b/i
export function buildAdvancedVoiceReview(course:string,turns:readonly InsightTurn[],report:EvidenceLinkedFeedback):AdvancedVoiceReview{
 const annotations:Annotation[]=[]
 let question="",hint:number|null=null
 const counts:Record<Dimension,number>={knowledge:0,logic:0,problemSolving:0,curiosity:0,adaptability:0,communication:0,independence:0}
 turns.slice(0,300).forEach((turn,index)=>{
  const text=typeof turn.text==="string"?turn.text.trim():""
  if(!text)return
  if(turn.role==="interviewer"){question=text.slice(0,240);const level=observedLiveSupport(text);if(level!==null)hint=Math.max(hint??0,level);return}
  if(turn.role!=="candidate")return
  const signals:Dimension[]=[]
  if(logic.test(text))signals.push("logic")
  if(method.test(text))signals.push("problemSolving")
  if(enquiry.test(text))signals.push("curiosity")
  if(revise.test(text))signals.push("adaptability")
  if(logic.test(text)||define.test(text))signals.push("communication")
  if(hint!==null)signals.push("independence")
  signals.forEach(key=>counts[key]++)
  annotations.push({turn:index+1,excerpt:text.slice(0,300),question,signals,priorHint:hint})
  hint=null
 })
 const dimensions=liveReviewDimensions.map(item=>({...item,status:item.key==="knowledge"?"Review required" as const:item.key==="independence"?"Not established" as const:counts[item.key]>0?"Observed signal" as const:"Not established" as const,count:item.key==="knowledge"?null:counts[item.key]}))
 const targets:Target[]=report.priorities.slice(0,3).map(item=>({title:item.target,task:item.task,criterion:item.successCriterion,turn:item.evidenceTurn===null?null:item.evidenceTurn+1}))
 const extra:Target[]=[
 {title:"Check subject accuracy",task:"Choose a substantive claim from the transcript and verify it using a trusted subject resource or teacher. Explain why the evidence supports or challenges it.",criterion:"You can identify the precise claim, verify it and correct it if necessary.",turn:annotations.find(item=>item.signals.includes("logic"))?.turn??annotations[0]?.turn??null},
 {title:"Try a contrasting approach",task:"Return to a question and attempt a second method or defensible interpretation. Compare both approaches without copying a model answer.",criterion:"You identify a genuine difference and explain which approach is better justified in context.",turn:annotations.at(-1)?.turn??null},
 {title:"Practise without extra scaffolding",task:"Try a fresh question using the No-hint setting. State one justified conclusion and a check before requesting support.",criterion:"Your transcript records your reasoning before any explicitly signalled hint; this is practice evidence, not proof of independence.",turn:annotations.find(item=>item.priorHint!==null)?.turn??null},
 ]
 if(annotations.length)for(const item of extra){if(targets.length>=3)break;if(!targets.some(t=>t.title===item.title))targets.push(item)}
 return {version:"voice-review-1",course,responseCount:annotations.length,dimensions,annotations,targets,limitations:["Transcript cues are observable signals, not validated scores or subject marking.","Unrecorded assistance may be missed; absence of a hint does not establish independence.","No audio is recorded by this review. Transcription errors and missing academic opportunities can affect the observations."]}
}

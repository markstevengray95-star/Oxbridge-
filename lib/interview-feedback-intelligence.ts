/**
 * FELLOW Phase 8: auditable, transcript-linked formative interview feedback.
 *
 * Deterministic observations are NOT a knowledge-based fact-checker. In
 * particular, a fluent answer, keyword use, model commentary or self-rated
 * confidence never establishes factual accuracy or admissions likelihood.
 */
export type InsightQuality = "responsive" | "partial" | "vague" | "irrelevant" | "incorrect"
export type InsightTurn = {
  role: "interviewer" | "candidate" | "system"
  text: string
  quality?: InsightQuality | string
  issue?: string
  feedback?: string
  supportLevel?: number
}
export type InsightEvidence = {
  turnIndex: number
  quote: string
  observation: string
  kind: "strength" | "improvement" | "revision" | "recovery"
  certainty: "observed" | "classified"
}
export type InsightPriority = {
  target: string
  why: string
  task: string
  successCriterion: string
  evidenceTurn: number | null
}
export type InsightSnapshot = {
  id: string
  course: string
  source: "formal" | "reasoning" | "voice" | "saved"
  createdAt: string
  answerCount: number
  ratedAnswerCount: number
  reasonedCount: number
  testedCount: number
  revisionCount: number
  responsiveCount: number
  incompleteCount: number
}
export type InsightComparison = {
  status: "comparable" | "insufficient"
  explanation: string
  earlier: InsightSnapshot | null
  latest: InsightSnapshot
  reasoningChange: number | null
  testingChange: number | null
}
export type EvidenceLinkedFeedback = {
  version: "phase8.1"
  sessionId: string
  course: string
  source: InsightSnapshot["source"]
  createdAt: string
  confidence: "limited" | "developing" | "moderate"
  answerCount: number
  ratedAnswerCount: number
  note: string
  strengths: InsightEvidence[]
  improvements: InsightEvidence[]
  revisions: InsightEvidence[]
  recoveries: InsightEvidence[]
  priorities: InsightPriority[]
  snapshot: InsightSnapshot
  comparison: InsightComparison
}

const EXPLICIT_REASON = /\b(?:because|therefore|since|hence|which means|so that|as a result|i conclude|it follows|the reason is|this implies)\b/i
const TEST_OR_EVIDENCE = /\b(?:test|check|measure|compare|controlled?|observation|counterexample|limiting case|experiment|evidence|data|calculate|calculation|source|quotation|would predict|falsif|validate)\b/i
const EXPLICIT_REVISION = /\b(?:i (?:was wrong|would revise|would change|now think)|on reflection|let me correct|i initially thought|i previously assumed|i take that back|my earlier (?:answer|claim)|with (?:this|the) new (?:evidence|information)|actually[, :] (?:i|the|that|we))\b/i
const CONSTRAINT = /\b(?:assuming|provided that|if|unless|holding .* constant|subject to|only when|under the condition|depends on|for this case)\b/i
const QUALITY_VALUES = new Set<InsightQuality>(["responsive","partial","vague","irrelevant","incorrect"])

function clean(text:unknown,max=220){
  return (typeof text==="string"?text:"").replace(/\s+/g," ").trim().slice(0,max)
}
function validQuality(value:unknown):InsightQuality|null{
  return typeof value==="string"&&QUALITY_VALUES.has(value as InsightQuality)?value as InsightQuality:null
}
function evidenceTurn(input:InsightTurn[],index:number,kind:InsightEvidence["kind"],observation:string,certainty:InsightEvidence["certainty"]):InsightEvidence {
  return {turnIndex:index,quote:clean(input[index]?.text,200),kind,observation,certainty}
}
function safeDate(value:string|undefined){
  const date=Date.parse(value||"")
  return Number.isFinite(date)?new Date(date).toISOString():new Date(0).toISOString()
}
function ratio(count:number,total:number){
  return total>0?Math.round(count*100/total):null
}
function compare(latest:InsightSnapshot,previous:InsightSnapshot[]):InsightComparison{
  const earlier=previous
    .filter(item=>item&&item.course.trim().toLowerCase()===latest.course.trim().toLowerCase()
      &&item.source===latest.source &&item.id!==latest.id&&item.answerCount>=3
      &&Number.isFinite(Date.parse(item.createdAt))&&Date.parse(item.createdAt)<Date.parse(latest.createdAt))
    .sort((a,b)=>Date.parse(b.createdAt)-Date.parse(a.createdAt))[0]||null
  if(!earlier || latest.answerCount<3){
    return {status:"insufficient",explanation:"At least two dated sessions in the same course and interview mode, each with three analysable answers, are needed before showing a practice-habit change.",earlier,latest,reasoningChange:null,testingChange:null}
  }
  return {
    status:"comparable",
    explanation:"These are changes in explicitly observable reasoning and testing language within two sessions, not changes in academic correctness or predicted admissions performance.",
    earlier,latest,
    reasoningChange:(ratio(latest.reasonedCount,latest.answerCount)??0)-(ratio(earlier.reasonedCount,earlier.answerCount)??0),
    testingChange:(ratio(latest.testedCount,latest.answerCount)??0)-(ratio(earlier.testedCount,earlier.answerCount)??0),
  }
}
export function buildEvidenceLinkedFeedback(input:{
  sessionId:string
  course:string
  source:InsightSnapshot["source"]
  turns:InsightTurn[]
  createdAt?:string
  previous?:InsightSnapshot[]
}):EvidenceLinkedFeedback{
  const turns=Array.isArray(input.turns)?input.turns.slice(0,300).map(turn=>({
    role:turn.role,text:clean(turn.text,3200),quality:validQuality(turn.quality)||undefined,
    issue:clean(turn.issue,120),feedback:clean(turn.feedback,220),
    supportLevel:Number.isFinite(turn.supportLevel)?Math.max(0,Number(turn.supportLevel)):undefined,
  })):[] as InsightTurn[]
  const answers=turns.map((turn,index)=>({turn,index})).filter(x=>x.turn.role==="candidate"&&x.turn.text.trim())
  const strengths:InsightEvidence[]=[]
  const improvements:InsightEvidence[]=[]
  const revisions:InsightEvidence[]=[]
  const recoveries:InsightEvidence[]=[]
  let previousWeak:{index:number;quality:InsightQuality}|null=null
  let reasonedCount=0,testedCount=0,revisionCount=0,responsiveCount=0,incompleteCount=0,ratedAnswerCount=0

  for(const {turn,index} of answers){
    const reason=EXPLICIT_REASON.test(turn.text)
    const tested=TEST_OR_EVIDENCE.test(turn.text)
    const revised=EXPLICIT_REVISION.test(turn.text)
    const quality=validQuality(turn.quality)
    if(reason)reasonedCount++
    if(tested)testedCount++
    if(revised)revisionCount++
    if(quality)ratedAnswerCount++
    if(quality==="responsive")responsiveCount++
    if(quality&&quality!=="responsive")incompleteCount++
    if(reason&&strengths.filter(item=>item.observation.startsWith("You made")).length<2)
      strengths.push(evidenceTurn(turns,index,"strength","You made a reasoning link explicit in this answer. Its academic correctness still needs checking against the question.", "observed"))
    if(tested&&strengths.filter(item=>item.observation.startsWith("You mentioned")).length<1)
      strengths.push(evidenceTurn(turns,index,"strength","You mentioned a potential check, evidence source or comparison. Review whether it actually distinguishes the possible explanations.", "observed"))
    if(revised){
      revisions.push(evidenceTurn(turns,index,"revision","You explicitly reconsidered an earlier idea. The transcript shows the revision, but not necessarily that the new claim is correct.", "observed"))
    }
    if(quality==="responsive"&&previousWeak){
      const intervening=turns.slice(previousWeak.index+1,index).some(t=>t.role==="interviewer"&&t.text.trim())
      if(intervening){
        recoveries.push(evidenceTurn(turns,index,"recovery","After an interviewer follow-up, this response was classified as responsive, following an earlier weaker classification. Check whether the response actually repairs the same issue.", "classified"))
      }
      previousWeak=null
    }else if(quality&&quality!=="responsive"){
      previousWeak={index,quality}
      const finding= quality==="incorrect"
        ?"The interviewer classified this answer as needing an accuracy check. Re-examine the exact factual, quantitative or logical claim; the transcript label alone does not prove it is wrong."
        :quality==="irrelevant"?"The interviewer classified this response as off task. Identify the exact question and state your answer to it first."
        :quality==="vague"?"The interviewer found this insufficiently specific. Make one checkable claim and explain its reasoning."
        :"The interviewer classified this as partial. Identify the missing condition, justification or calculation step."
      improvements.push(evidenceTurn(turns,index,"improvement",finding,"classified"))
    }else if(!quality&&!reason&&!tested&&turn.text.split(/\s+/).length>7&&improvements.length<2){
      improvements.push(evidenceTurn(turns,index,"improvement","This answer does not explicitly show a reasoning link or a check. Try adding a justification; no correctness judgement is possible from those words alone.","observed"))
    }
  }

  const distinct= <T extends InsightEvidence>(items:T[],limit:number)=>items.filter((item,i)=>items.findIndex(other=>other.turnIndex===item.turnIndex)===i).slice(0,limit)
  const priorities:InsightPriority[]=[]
  const firstWeak=improvements[0]
  if(firstWeak)priorities.push({
    target:"Repair an identifiable reasoning gap",
    why:firstWeak.observation,
    task:"Replay the question before this answer. Give a direct conclusion, one decisive supporting step and a check or possible counterexample.",
    successCriterion:"The revised answer identifies exactly what was missing or unsupported, then tests the new claim without relying on a model answer.",
    evidenceTurn:firstWeak.turnIndex,
  })
  if(answers.length&&!reasonedCount)priorities.push({
    target:"Explain one inference",
    why:"No answer in this session explicitly linked a claim to a reason using the sampled phrasing. Other forms of valid reasoning may still be present.",
    task:"For a new question, state a claim followed by the mechanism, principle, text or calculation that supports it.",
    successCriterion:"The interviewer can trace how the stated evidence supports the conclusion.",
    evidenceTurn:answers[0]?.index??null,
  })
  if(answers.length&&!testedCount)priorities.push({
    target:"Test an explanation",
    why:"No explicit test, calculation, source comparison or counterexample was found in the answer transcript.",
    task:"Take one of your earlier claims and identify a measurement, counterexample or comparison that could change your mind.",
    successCriterion:"You specify what result would support the idea and what result would challenge it.",
    evidenceTurn:answers.at(-1)?.index??null,
  })
  if(answers.length&&!revisionCount&&answers.length>=3)priorities.push({
    target:"Respond to new evidence",
    why:"The transcript did not capture an explicit self-correction. That does not mean no adaptation occurred.",
    task:"Revisit one interviewer challenge and explain what survives from the original approach and what would change.",
    successCriterion:"You distinguish a retained principle from at least one revised assumption or inference.",
    evidenceTurn:answers.at(-1)?.index??null,
  })
  if(!priorities.length&&answers.length)priorities.push({
    target:"Transfer your method",
    why:"Your transcript contains observable reasoning habits; accuracy and transfer still need testing in a fresh problem.",
    task:"Try a new question in the same subject with an unfamiliar context and apply the method without copying your previous answer.",
    successCriterion:"You identify the shared principle, explain the changed assumptions and check whether the conclusion still follows.",
    evidenceTurn:answers.at(-1)?.index??null,
  })

  const id=clean(input.sessionId,150)||"unsaved"
  const course=clean(input.course,100)||"Unspecified course"
  const createdAt=safeDate(input.createdAt)
  const snapshot:InsightSnapshot={
    id,course,source:input.source,createdAt,
    answerCount:answers.length,ratedAnswerCount,
    reasonedCount,testedCount,revisionCount,responsiveCount,incompleteCount,
  }
  const comparison=compare(snapshot,Array.isArray(input.previous)?input.previous.slice(0,100):[])
  const confidence=answers.length>=6&&ratedAnswerCount>=4?"moderate"
    :answers.length>=3?"developing":"limited"
  return {
    version:"phase8.1",sessionId:id,course,source:input.source,createdAt,confidence,answerCount:answers.length,ratedAnswerCount,
    note:ratedAnswerCount===0
      ?"No verified answer classifications were available. Observations show only explicitly stated reasoning, checking and revision language; do not interpret them as factual correctness."
      :"Classifications are formative software judgements, not validated Oxford/Cambridge marking. Evidence excerpts are from the displayed transcript. Correctness and the substance of each claim require review.",
    strengths:distinct(strengths,3),improvements:distinct(improvements,3),
    revisions:distinct(revisions,4),recoveries:distinct(recoveries,4),
    priorities:priorities.slice(0,3),snapshot,comparison,
  }
}
export function extractInsightSnapshots(logs:unknown):InsightSnapshot[]{
  if(!Array.isArray(logs))return []
  const snapshots:InsightSnapshot[]=[]
  for(const log of logs.slice(0,75)){
    if(!log||typeof log!=="object")continue
    const candidate=(log as {feedbackReport?:{snapshot?:InsightSnapshot}}).feedbackReport?.snapshot
    if(!candidate||typeof candidate.course!=="string"||typeof candidate.id!=="string"
      ||!Number.isFinite(candidate.answerCount)||!Number.isFinite(candidate.reasonedCount)
      ||!Number.isFinite(candidate.testedCount)||!["formal","reasoning","voice","saved"].includes(candidate.source))continue
    snapshots.push(candidate)
  }
  return snapshots
}
export function transcriptFromEvents(events:unknown):InsightTurn[]{
  if(!Array.isArray(events))return []
  return events.slice(0,300).flatMap((event):InsightTurn[]=>{
    if(typeof event!=="string")return []
    const cleaned=event.replace(/\s+/g," ").trim()
    const matched=/^(?:Interviewer(?: [AB])?|Candidate):\s*(.+)$/i.exec(cleaned)
    if(!matched)return []
    return [{role:/^candidate:/i.test(cleaned)?"candidate":"interviewer",text:matched[1].split(" | Feedback: ")[0].slice(0,3200)}]
  })
}

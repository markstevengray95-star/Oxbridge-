import type { SubjectPathway } from "@/lib/subject-interview-pathways"

export const liveDifficultyLevels = [
  {value:1,label:"Foundation",description:"Accessible single-step reasoning and clear definitions."},
  {value:2,label:"Developing",description:"Link two steps and justify a straightforward relationship."},
  {value:3,label:"Standard",description:"Unfamiliar problems, assumptions and independent justification."},
  {value:4,label:"Stretch",description:"Multiple constraints, competing arguments and changed conditions."},
  {value:5,label:"Advanced",description:"Deep transfer, rigorous counterexamples and unfamiliar evidence."},
] as const
export type LiveDifficulty = typeof liveDifficultyLevels[number]["value"]
export const liveUniversityOptions = ["Either","Oxford","Cambridge"] as const
export type LiveUniversity = typeof liveUniversityOptions[number]
export const liveReasoningTargets = ["General practice","Justification","Evidence and checking","Assumptions","Alternative explanations","Revision","Transfer"] as const
export type LiveReasoningTarget = typeof liveReasoningTargets[number]
export type LivePracticeSettings = { difficulty:LiveDifficulty; university:LiveUniversity; target:string; freshProblem:boolean }
export const defaultLivePracticeSettings:LivePracticeSettings = {difficulty:3,university:"Either",target:"General practice",freshProblem:false}

export function normaliseLivePracticeSettings(raw:unknown, pathway?:SubjectPathway):LivePracticeSettings {
  const input = raw && typeof raw==="object" ? raw as Record<string,unknown> : {}
  const difficulty = liveDifficultyLevels.find(item=>item.value===input.difficulty)?.value??3
  const university = liveUniversityOptions.find(item=>item===input.university)??"Either"
  const targets = [...liveReasoningTargets,...(pathway?.reasoningFocus??[])]
  const target = targets.find(item=>item===input.target)??"General practice"
  return {difficulty,university,target,freshProblem:input.freshProblem===true}
}
export function livePersonalisedPracticeInstructions(raw:unknown,pathway:SubjectPathway){
  const settings=normaliseLivePracticeSettings(raw,pathway)
  const level=liveDifficultyLevels.find(item=>item.value===settings.difficulty)!
  return [
    "PERSONALISED PRACTICE: starting difficulty "+level.value+"/5 ("+level.label+"). "+level.description,
    "University preference: "+settings.university+". This is an independent academic practice simulation; do not claim institution-specific interviewing standards, affiliation or admission predictions.",
    "Academic focus: "+settings.target+". Prioritise this skill or topic naturally within the selected subject without exposing an answer or a supposed weakness.",
    "Adjust difficulty inside the discussion only on demonstrated academic reasoning: after a coherent justified response, raise complexity one step; after repeated unresolved attempts, narrow the question one step. Keep challenge within levels 1–5 and respect the selected support cap. Do not judge ability by speaking speed, confidence, accent or silence.",
    settings.freshProblem ? "Generate a fresh course-relevant opening problem rather than using the standard example, unless the candidate supplied unseen material or is reconnecting. Use school-level foundations, a clear premise, and no obscure prerequisite." : "Use the selected academic opening task, adapted to the starting difficulty. Do not repeat it unnecessarily after reconnecting.",
  ]
}
export function livePracticeOpening(settings:LivePracticeSettings,standardPrompt:string) {
  if(settings.freshProblem || settings.target!=="General practice" || settings.difficulty!==3)
    return "Introduce one fresh accessible-to-challenging academic problem at the selected starting difficulty and academic focus. Do not give a solution; ask one question only."
  return "Ask this opening academic problem without answering it: "+standardPrompt
}
export type LivePracticeSuggestion = {sessions:number; analysableAnswers:number; target:LiveReasoningTarget; explanation:string; freshProblem:boolean}
export function suggestLivePractice(logs:unknown,course:string):LivePracticeSuggestion{
  const rows=Array.isArray(logs)?logs.filter(log=>log&&typeof log==="object"&&log.interviewCourse===course&&log.interviewSource==="live-voice").slice(0,10):[]
  let answers=0,reasoned=0,tested=0
  for(const row of rows){
    const s=row.feedbackReport?.snapshot
    if(!s||!Number.isInteger(s.answerCount)||s.answerCount<1||s.answerCount>300||![s.reasonedCount,s.testedCount].every((n:number)=>Number.isInteger(n)&&n>=0&&n<=s.answerCount))continue
    answers+=s.answerCount;reasoned+=s.reasonedCount;tested+=s.testedCount
  }
  const freshProblem=rows.length>0
  if(answers<4)return {sessions:rows.length,analysableAnswers:answers,target:"General practice",explanation:"Not enough transcript evidence to recommend a specific skill yet.",freshProblem}
  if(reasoned/answers<.5)return {sessions:rows.length,analysableAnswers:answers,target:"Justification",explanation:"Recent transcripts contain relatively few explicit reasoning links. Practise making your justification visible; this is not a correctness judgement.",freshProblem}
  if(tested/answers<.35)return {sessions:rows.length,analysableAnswers:answers,target:"Evidence and checking",explanation:"Recent transcripts contain relatively few explicit checks or evidence statements. Try a fresh problem focused on checking a claim.",freshProblem}
  return {sessions:rows.length,analysableAnswers:answers,target:"Transfer",explanation:"Recent transcripts contain explicit reasoning and checking language. Try applying a method in a fresh context; academic accuracy has not been verified.",freshProblem}
}

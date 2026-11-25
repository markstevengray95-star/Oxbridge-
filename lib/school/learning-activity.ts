/** Only predeclared learning sections may be used for school activity. */
export const trackedLearningSections=new Set([
  "interviews","interview-room","reasoning-interview","gemini-live-next",
  "gemini-live-interview","full-mock-interview","test-player","tests",
  "exam-practice","admissions-tests","essay-analysis","personal-statement",
  "pre-interview-material","daily-challenge","targeted-practice","practice",
  "interview-replay","reasoning-replay","interview-feedback","interview-insights",
  "tutor","student-home","learning-trajectory","question-bank","full-paper",
  "mock-day","flashcards","written-work","application-defence",
  "personal-statement-defence","mock-day-report","tutorial-lab",
])
export type LearningEventKind="visit"|"heartbeat"
export function learningSectionPath(input:unknown):string|null{
  if(typeof input!=="string"||input.length>200||!input.startsWith("/")||input.startsWith("//"))return null
  // Reject query strings, fragments, traversal and percent-encoded identifiers
  // instead of storing exact browser paths with possible student data.
  if(/[?#%\\]/.test(input)||input.includes(".."))return null
  const match=/^\/([a-z0-9-]+)(?:\/[a-zA-Z0-9_-]+)*\/?$/.exec(input)
  const section=match?.[1]
  return section&&trackedLearningSections.has(section)?"/"+section:null
}
export function safeLearningSeconds(kind:LearningEventKind,value:unknown):number{
  if(kind!=="heartbeat")return 0
  if(typeof value!=="number"||!Number.isFinite(value))return 0
  return Math.max(0,Math.min(30,Math.floor(value)))
}
export function shouldRecordLearningEvent(
  previous:{page_path:string;event_kind:string;occurred_at:string}|null,
  current:{page_path:string;event_kind:LearningEventKind},
  nowMs:number,
):boolean{
  if(!previous||previous.page_path!==current.page_path||previous.event_kind!==current.event_kind)return true
  const delta=nowMs-Date.parse(previous.occurred_at)
  return !Number.isFinite(delta)||delta>=22000
}

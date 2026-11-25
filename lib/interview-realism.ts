/** Phase 13: interviewer presentation choices, never grading criteria. */
export const interviewerStyles=[
 {id:"balanced",label:"Balanced academic",description:"Clarifies and probes without unnecessary hints.",instruction:"Use a measured, concise academic tone. Preserve the chosen intervention."},
 {id:"supportive",label:"Supportive tutor",description:"Uses calm wording and gives room to recover.",instruction:"Phrase the existing branch calmly and constructively. Do not add hints or praise beyond the selected support level."},
 {id:"challenging",label:"Challenging examiner",description:"Requests precise justification and tests assumptions.",instruction:"Use precise, direct wording and ask for a defensible reasoning step. Never intimidate or add an unsupported difficulty change."},
 {id:"quiet",label:"Quiet examiner",description:"Leaves room for independent thinking and brief questions.",instruction:"Keep the prompt short and neutral. Allow the candidate to think; do not fill silence with hints."},
] as const
export type InterviewerStyle=typeof interviewerStyles[number]["id"]
export function interviewerStyle(value:unknown){return interviewerStyles.find(s=>s.id===value)??interviewerStyles[0]}
export function nextPanelSpeaker(panel:boolean,candidateTurns:number,secondProblem=false):"Interviewer"|"Interviewer A"|"Interviewer B"{
 if(!panel)return "Interviewer"
 const n=Number.isFinite(candidateTurns)?Math.max(0,Math.floor(candidateTurns)):0
 return secondProblem||Math.floor(n/3)%2===1?"Interviewer B":"Interviewer A"
}
export function styleLocalPrompt(prompt:string,style:InterviewerStyle,supportLevel:number){
 // Keep academic question and support level intact. Presentation only.
 if(style==="supportive"&&supportLevel>0)return "Take it one step at a time. "+prompt
 if(style==="challenging"&&supportLevel===0)return "Be precise. "+prompt
 return prompt
}
export const MAX_WHITEBOARD_BASE64=180000
export type WhiteboardSnapshot={data:string;notes:string}
export function validWhiteboardPayload(value:unknown):WhiteboardSnapshot|null{
 if(!value||typeof value!=="object"||Array.isArray(value))return null
 const v=value as Record<string,unknown>
 if(v.consent!==true||typeof v.data!=="string"||v.data.length<32||v.data.length>MAX_WHITEBOARD_BASE64||v.data.length%4!==0||!/^iVBORw0KGgo[A-Za-z0-9+/]*={0,2}$/.test(v.data))return null
 const notes=typeof v.notes==="string"?v.notes.trim().slice(0,800):""
 return {data:v.data,notes}
}

export const interviewModes=["voice","written","panel","mock"] as const
export type LaunchMode=typeof interviewModes[number]
export const mockEngines=["written","formal","voice"] as const
export type LaunchEngine=typeof mockEngines[number]
export const launchDurations=[5,15,25,40,60] as const
export const launchDifficulties=["Foundation","Stretch","Challenge"] as const
export const launchStyles=["balanced","supportive","challenging","quiet"] as const
export type LaunchOptions={mode:LaunchMode;engine:LaunchEngine;course:string;duration:number;difficulty:typeof launchDifficulties[number];style:typeof launchStyles[number]}
export function interviewLaunchUrl(options:LaunchOptions){
 const engine=options.mode==="mock"?options.engine:options.mode==="voice"?"voice":"written"
 const path=engine==="voice"?"/gemini-live-next":engine==="formal"?"/interview-room":"/reasoning-interview"
 const params=new URLSearchParams()
 if(options.course.trim())params.set("course",options.course.trim().slice(0,120))
 if(options.mode==="mock"&&launchDurations.some(n=>n===options.duration))params.set("mock",String(options.duration))
 if(engine==="written"){params.set("difficulty",options.difficulty);params.set("style",options.style);if(options.mode==="panel")params.set("panel","1")}
 return path+"?"+params.toString()
}
export function readInterviewLaunch(search:string,tracks:readonly {id:string;courses:readonly string[]}[]){
 const params=new URLSearchParams(search),course=params.get("course")
 const track=tracks.find(t=>t.courses.includes(course??""))
 const difficulty=launchDifficulties.find(x=>x===params.get("difficulty"))
 const style=launchStyles.find(x=>x===params.get("style"))
 const mock=launchDurations.find(x=>String(x)===params.get("mock"))
 return {course:track?course:null,track:track?.id??null,difficulty,style,mock,panel:params.get("panel")==="1"}
}

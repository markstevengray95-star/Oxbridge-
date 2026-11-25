// Planning activities, not official admissions requirements or mandatory deadlines.
export const pathwaySubjects=[
 {id:"maths",label:"Mathematics and computing",matches:/math|comput|informatics/i,explore:"Investigate a proof or algorithm from an unfamiliar topic; produce a counterexample to one tempting generalisation.",source:"A university outreach problem sheet or introductory lecture",criterion:"Explain why each step follows and identify an assumption."},
 {id:"science",label:"Physical sciences and engineering",matches:/physic|engineer|chemistr|material|earth science/i,explore:"Choose a physical or chemical model, derive a prediction and compare it with public data or a safe classroom example.",source:"A university outreach lecture or open science article",criterion:"Explain the model's range, assumptions and one way to test it."},
 {id:"life",label:"Life sciences and medicine",matches:/medic|biolog|natural science|psycholog|veterinar/i,explore:"Compare two explanations for a biological or behavioural observation using a published study.",source:"An open review article or university public lecture",criterion:"Identify controls, a competing explanation and a limitation."},
 {id:"law",label:"Law",matches:/law|jurisprudence/i,explore:"Read a public judgment or legal commentary and reconstruct the competing interpretations of the issue.",source:"A publicly accessible court judgment or university law lecture",criterion:"Distinguish the rule, evidence and a counterargument."},
 {id:"economics",label:"Economics, PPE and management",matches:/econom|ppe|politics.*econom|management|land economy/i,explore:"Compare two explanations of an economic or policy outcome using public data.",source:"An ONS dataset or introductory university lecture",criterion:"Separate assumptions, empirical findings and value judgements."},
 {id:"humanities",label:"Humanities and languages",matches:/history|philosoph|geograph|english|literat|language|classic|linguist|politic|theolog/i,explore:"Compare two interpretations of a short primary source, text or argument.",source:"A public-domain text, archive or university lecture",criterion:"Defend a reading with precise evidence and consider a rival interpretation."},
] as const
export type PathwayStage="exploring"|"pretest"|"interview"|"postinterview"
export type PathwayTask={id:string;title:string;minutes:number;href:string;detail:string;criterion:string}
export const officialSources={
 Oxford:"https://www.ox.ac.uk/admissions/undergraduate/courses/admissions-requirements/summary-table-of-admissions-requirements",
 Cambridge:"https://www.undergraduate.study.cam.ac.uk/apply/how/admission-tests"
} as const
export const requirementReview={entryYear:2027,checkedAt:"2026-11-25",reviewAfterDays:90}
export function requirementFreshness(year:number,now=Date.now()){
 const age=(now-Date.parse(requirementReview.checkedAt+"T00:00:00Z"))/86400000
 return year!==requirementReview.entryYear?"unverified-year":age<0||age>requirementReview.reviewAfterDays?"review-due":"reference-only"
}
export function preparationPlan(course:string,stage:PathwayStage,minutes:number,testConfirmed:boolean){
 const subject=pathwaySubjects.find(s=>s.matches.test(course))
 const budget=Math.max(30,Math.min(240,Number.isFinite(minutes)?Math.floor(minutes):60))
 const check:PathwayTask={id:"requirements",title:"Verify course requirements",minutes:10,href:"/requirements",detail:"Check the exact university, course, entry year and College. Record official test, written work and deadlines.",criterion:"Identify the official course page and applicable requirements."}
 const interview:PathwayTask={id:"interview",title:"Practise academic reasoning",minutes:25,href:"/interview-room",detail:"Explain an unfamiliar problem aloud, respond to a challenge and revise the answer.",criterion:"Give a justified conclusion and explain a possible counterexample or limitation."}
 const exploration:PathwayTask={id:"exploration",title:"Supercurricular exploration",minutes:25,href:"/supercurricular-coach",detail:subject?subject.explore+" Suggested source: "+subject.source+".":"Choose a credible academic source about your intended subject and investigate one claim.",criterion:subject?.criterion??"Explain the central claim, supporting evidence and one question you still have."}
 const coaching:PathwayTask={id:"coach",title:"Diagnose and practise a weakness",minutes:15,href:"/tutor#academic-coach",detail:"Complete the diagnostic, explanation and fresh-question check.",criterion:"Explain a new example without copying the earlier solution."}
 const defence:PathwayTask={id:"defence",title:"Defend application evidence",minutes:20,href:"/application-defence",detail:"Choose one genuine reading or project claim and practise responding to a challenge.",criterion:"Explain what you learned and what would make you change your interpretation."}
 const review:PathwayTask={id:"review",title:"Review progress and next steps",minutes:15,href:"/assessment-report",detail:"Review saved evidence and choose one further learning action.",criterion:"Identify a specific task and a measurable success criterion."}
 const test:PathwayTask={id:"test",title:"Targeted admissions-test practice",minutes:25,href:"/admissions-challenges",detail:"Select the test you have verified for your course; work independently and review the explanations.",criterion:"Explain the first error or unsupported step and solve a fresh item."}
 const order=stage==="pretest"?[check,...(testConfirmed?[test]:[]),coaching,exploration,interview]:stage==="interview"?[interview,defence,coaching,exploration,review]:stage==="postinterview"?[review,exploration,coaching,check]:[check,exploration,coaching,interview,defence]
 let remaining=budget
 const tasks:PathwayTask[]=[]
 for(const t of order){if(remaining>=t.minutes){tasks.push(t);remaining-=t.minutes}}
 return {subject:subject?.label??"General academic exploration",budget,plannedMinutes:budget-remaining,tasks}
}

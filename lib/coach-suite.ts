import type { TrackId } from "@/lib/oxbridge-data"
import type { TestName } from "@/lib/question-bank"

export type InterviewPersonaKey = "Supportive" | "Socratic" | "Terse" | "Technical" | "Evidence-led" | "Sceptical" | "Minimal"
export type InterviewMode = "Tutor" | "Realistic" | "No-hint" | "Stress"

export const interviewerPersonas: Record<InterviewPersonaKey, { label:string; opening:string; followupPrefix:string; interruption:string; closing:string }> = {
  Supportive:{ label:"Supportive academic", opening:"Good morning. We will work through unfamiliar material together. Please make your reasoning visible, and do not worry if you need to revise an idea.", followupPrefix:"Good. Develop that further. ", interruption:"Thank you. I am going to pause you there so we can examine one step more closely. ", closing:"Thank you. We will stop there. The important thing was how you responded to the discussion rather than whether every step was immediate." },
  Socratic:{ label:"Socratic tutor", opening:"Good morning. I will mostly respond with questions. Please explain what you notice, what you are assuming and why each step follows.", followupPrefix:"Why? ", interruption:"Let me stop you at that claim. ", closing:"Thank you. We will end there." },
  Terse:{ label:"Terse interviewer", opening:"Good morning. We will begin immediately. Think aloud and keep your answers precise.", followupPrefix:"Go on. ", interruption:"Stop there. ", closing:"Thank you. That concludes the interview." },
  Technical:{ label:"Technical interviewer", opening:"Good morning. I will ask you to be precise with definitions, models, equations and evidence. Explain every important assumption.", followupPrefix:"Be precise. ", interruption:"I am going to interrupt because I want the exact step connecting those two statements. ", closing:"Thank you. We will finish there." },
  "Evidence-led":{ label:"Evidence-focused interviewer", opening:"Good morning. I will challenge you to distinguish observation, interpretation and evidence. Tell me what would change your mind.", followupPrefix:"What evidence supports that? ", interruption:"Let me pause you. Which part of that is evidence, and which part is inference? ", closing:"Thank you. That is the end of the interview." },
  Sceptical:{ label:"Sceptical interviewer", opening:"Good morning. I may challenge your claims quite firmly. Treat disagreement as part of the academic discussion and defend or revise your reasoning as appropriate.", followupPrefix:"I am not yet persuaded. ", interruption:"I need to stop you there because that conclusion does not yet follow. ", closing:"Thank you. We will stop at that point." },
  Minimal:{ label:"Minimal-prompt interviewer", opening:"Good morning. I will give relatively little encouragement or feedback. Continue explaining your reasoning even when I do not react.", followupPrefix:"And? ", interruption:"Pause. ", closing:"Thank you." },
}

export const warmUps: Record<TrackId,string[]> = {
  maths:["State a conjecture from a small case, then say what would count as a proof.","Give a counterexample to a plausible universal claim.","Explain one result in two different ways."],
  physical:["Estimate an everyday quantity and justify each approximation.","Sketch a graph before choosing an equation.","Name one assumption in a familiar physical model and remove it."],
  life:["Give two mechanisms that could explain the same biological observation.","Move from molecular to organism scale without breaking the causal chain.","Design one control that would distinguish two explanations."],
  law:["Write a simple rule, then invent a hard case for it.","Distinguish a legal conclusion from the principle used to justify it.","Give the strongest argument against your first view."],
  humanities:["Distinguish description from explanation in one historical claim.","Name evidence that would weaken your favoured interpretation.","Define one contested concept and test an awkward case."],
  economics:["Identify the main incentive in a policy and one second-order effect.","State a model assumption and explain when it could fail.","Interpret an average while naming what it might hide."],
  languages:["Offer two interpretations of one short phrase.","Explain what a translation gains and loses.","Identify a formal choice and explain why it matters."],
}

export const mutationPrompts: Record<TrackId,string[]> = {
  maths:["Now change one condition. Does your argument still work?","Can you generalise the result?","What is the smallest counterexample to your claim?"],
  physical:["Double one parameter and predict the new behaviour before calculating.","Remove the idealising assumption. What changes first?","What would the graph look like in the limiting case?"],
  life:["Change the environment or scale. Does the mechanism still explain the observation?","Introduce a competing mechanism. What new evidence would distinguish them?","What result would falsify your explanation?"],
  law:["Change one fact. Does your rule produce the same outcome?","Now consider the strongest hard case against your rule.","Can you narrow the rule without making it arbitrary?"],
  humanities:["Now introduce a conflicting source. How should your interpretation change?","Change the audience or context. What becomes less certain?","What alternative causal account now becomes plausible?"],
  economics:["Change one elasticity or incentive. What moves first?","Add a distributional effect. Does your recommendation change?","Relax ceteris paribus. Which conclusion is least stable?"],
  languages:["Change the speaker or context. Which reading becomes stronger?","Offer an alternative translation and defend it.","Now focus on one word that complicates your interpretation."],
}

export const weakAnswerClinic = [
  { label:"Conclusion only", example:"I think that is the answer because it seems most likely.", diagnosis:"The conclusion is visible but the chain of reasoning is hidden.", fix:"State what you notice, the principle you are using, one test or example, and then a provisional conclusion." },
  { label:"Over-rehearsed", example:"I have always been passionate about this subject and therefore…", diagnosis:"Polished wording is replacing analysis.", fix:"Drop the prepared phrase and respond directly to the new evidence or question." },
  { label:"Unsupported assertion", example:"That source is unreliable.", diagnosis:"A judgement is made without criteria or evidence.", fix:"Name the feature of the source that creates the limitation and explain its effect on what can be inferred." },
  { label:"Rigid reasoning", example:"That was my original answer, so I would keep it.", diagnosis:"The response resists new information instead of updating.", fix:"Say explicitly what the new information changes, then revise only the part of your argument that depends on it." },
]

export const coachMilestones = [
  { id:"first-interview", label:"First formal interview", condition:"Complete one interview session" },
  { id:"five-interviews", label:"Five academic conversations", condition:"Complete five interview sessions" },
  { id:"first-paper", label:"First full admissions paper", condition:"Complete a full paper" },
  { id:"hundred-questions", label:"100 questions attempted", condition:"Reach 100 admissions-test attempts" },
  { id:"revision-after-challenge", label:"Changed mind after challenge", condition:"Record a revised position in an interview transcript" },
  { id:"spaced-review", label:"Closed a spaced-review loop", condition:"Correct a previously missed question" },
  { id:"supercurricular", label:"Defended a supercurricular claim", condition:"Record and question an academic activity" },
]

export const officialResourceLibrary = [
  { university:"Oxford", area:"Interviews", title:"Oxford undergraduate interview guidance", url:"https://www.ox.ac.uk/admissions/undergraduate/applying/guide-for-applicants/interviews", checked:"23 September 2026" },
  { university:"Oxford", area:"Sample questions", title:"Oxford sample interview questions", url:"https://www.ox.ac.uk/admissions/undergraduate/applying/guide-for-applicants/interviews/sample_questions", checked:"23 September 2026" },
  { university:"Oxford", area:"Tests", title:"Oxford admissions tests", url:"https://www.ox.ac.uk/admissions/undergraduate/applying/guide-for-applicants/admissions-tests", checked:"23 September 2026" },
  { university:"Oxford", area:"Written work", title:"Oxford written work guidance", url:"https://www.ox.ac.uk/admissions/undergraduate/applying/guide-for-applicants/written-work", checked:"23 September 2026" },
  { university:"Cambridge", area:"Interviews", title:"Cambridge interview guidance", url:"https://www.undergraduate.study.cam.ac.uk/apply/after/cambridge-interviews", checked:"23 September 2026" },
  { university:"Cambridge", area:"Tests", title:"Cambridge admissions tests", url:"https://www.undergraduate.study.cam.ac.uk/apply/how/admission-tests", checked:"23 September 2026" },
  { university:"Cambridge", area:"College assessments", title:"Cambridge College assessments", url:"https://www.undergraduate.study.cam.ac.uk/apply/after/college-assessments", checked:"23 September 2026" },
  { university:"Cambridge", area:"Written work", title:"Cambridge written work and portfolios", url:"https://www.undergraduate.study.cam.ac.uk/apply/after/written-work-portfolio", checked:"23 September 2026" },
]

export const testStrategies: Record<TestName,{ focus:string[]; miniMinutes:number[] }> = {
  TMUA:{ focus:["algebra","functions","proof and logic","geometry","probability","calculus reasoning"], miniMinutes:[10,20,30] },
  ESAT:{ focus:["mathematics","physics","chemistry","biology","graph and data reasoning"], miniMinutes:[10,20,30] },
  TARA:{ focus:["critical thinking","problem solving","assumptions","inference","writing"], miniMinutes:[10,20,30] },
  LNAT:{ focus:["passage inference","author attitude","argument structure","assumptions","essay planning"], miniMinutes:[10,20,30] },
  UCAT:{ focus:["verbal reasoning","decision making","quantitative reasoning","situational judgement"], miniMinutes:[10,20,30] },
}

export const interviewRoutingNotes = {
  Oxford:"Be ready for more than one academic conversation and for your interview context to change. Practise transferring your reasoning to a second interviewer rather than trying to reproduce a rehearsed answer.",
  Cambridge:"Interview and assessment arrangements can vary by course and College. Treat the official course and College guidance as the source of truth and rehearse both discussion and any published assessment format.",
}

export function confidenceCalibration(confidence:number, score:number) {
  if (confidence >= 4 && score < 60) return "High confidence + weak performance: slow down and test your assumptions before committing."
  if (confidence <= 2 && score >= 75) return "Low confidence + strong reasoning: trust the process more and keep explaining your method."
  if (confidence >= 4 && score >= 75) return "Confidence and performance were well aligned."
  return "Calibration is developing. Keep rating confidence before seeing feedback."
}

export function buildCoachPlan(input:{ sessions:number; attempts:number; accuracy:number; overdue:number; topMistake?:string; activities:number; mentorTasks:number }) {
  const items:string[] = []
  if (input.sessions < 2) items.push("Run a formal interview with the Realistic setting and no model answer until the end.")
  if (input.overdue > 0) items.push(`Clear ${input.overdue} spaced-review question${input.overdue === 1 ? "" : "s"} before adding new content.`)
  if (input.attempts < 30) items.push("Complete a 20-minute mini-paper to establish a better timing baseline.")
  else if (input.accuracy < 70) items.push("Use Teach Me This on the weakest test area, then attempt a targeted mini-paper.")
  else items.push("Sit one full timed paper or one hard section under strict conditions.")
  if (input.topMistake) items.push(`Interview focus: ${input.topMistake}. Deliberately practise the opposite behaviour.`)
  if (input.activities < 2) items.push("Add one genuine supercurricular activity and defend what you learned from it.")
  if (input.mentorTasks > 0) items.push("Complete the oldest mentor assignment before adding another optional task.")
  return items.slice(0,4)
}

export function milestoneStatus(progress:{ sessions:number; testAttempted:number; activities:number; completed:string[]; wrongQuestionIds:string[]; logs:Array<{ events:string[] }> }) {
  const revised = progress.logs.some(log => log.events.some(e => /revise|changed my mind|updated/i.test(e)))
  return [
    progress.sessions >= 1,
    progress.sessions >= 5,
    progress.completed.some(x => /paper|mock/i.test(x)),
    progress.testAttempted >= 100,
    revised,
    progress.wrongQuestionIds.length === 0 && progress.testAttempted > 0,
    progress.activities >= 1,
  ]
}

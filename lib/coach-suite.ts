import type { TrackId } from "@/lib/oxbridge-data"
import type { TestName } from "@/lib/question-bank"

export type InterviewPersonaKey = "Supportive" | "Socratic" | "Terse" | "Technical" | "Evidence-led" | "Sceptical" | "Minimal"
export type InterviewMode = "Tutor" | "Realistic" | "No-hint" | "Stress"

export const interviewerPersonas: Record<InterviewPersonaKey, { label:string; opening:string; followupPrefix:string; interruption:string; closing:string }> = {
  Supportive:{
    label:"Supportive academic",
    opening:"Good morning. We will work through one or two unfamiliar problems. Please make your reasoning explicit, including any uncertainty. I may redirect you or change the information as we go.",
    followupPrefix:"All right. Take that one step further. ",
    interruption:"Thank you. I am going to pause you there because I want to examine one part of the reasoning more closely. ",
    closing:"Thank you. We will stop there. Please leave the problem where it is; the purpose of the discussion was to see how you developed the reasoning in response to questions."
  },
  Socratic:{
    label:"Socratic tutor",
    opening:"Good morning. I will respond mainly with questions rather than telling you whether an answer is right. Explain what you notice, what you are assuming and why each step follows.",
    followupPrefix:"Why does that follow? ",
    interruption:"Let me stop you at that claim. ",
    closing:"Thank you. We will end the discussion there."
  },
  Terse:{
    label:"Terse interviewer",
    opening:"Good morning. We will begin immediately. Think aloud, answer the question asked and keep the argument precise.",
    followupPrefix:"Continue. ",
    interruption:"Stop there. ",
    closing:"Thank you. That concludes the interview."
  },
  Technical:{
    label:"Technical interviewer",
    opening:"Good morning. I will ask you to be precise with definitions, models, equations and evidence. State approximations explicitly and check whether your result is consistent with limiting cases or units where relevant.",
    followupPrefix:"Make that precise. ",
    interruption:"I am going to interrupt because I want the exact step that connects those two statements. ",
    closing:"Thank you. We will finish at that point."
  },
  "Evidence-led":{
    label:"Evidence-focused interviewer",
    opening:"Good morning. Distinguish carefully between observation, inference and conclusion. I may introduce evidence that conflicts with your first explanation, and I will ask what would change your mind.",
    followupPrefix:"What evidence supports that step? ",
    interruption:"Let me pause you. Which part of what you just said is evidence, and which part is interpretation? ",
    closing:"Thank you. That is the end of the interview."
  },
  Sceptical:{
    label:"Sceptical interviewer",
    opening:"Good morning. I may challenge your claims firmly and may argue against your first position. Treat disagreement as part of the academic discussion: defend a claim when the reasoning supports it and revise it when the evidence does not.",
    followupPrefix:"I am not yet persuaded. ",
    interruption:"I need to stop you there because the conclusion does not yet follow from what you have established. ",
    closing:"Thank you. We will stop at that point."
  },
  Minimal:{
    label:"Minimal-prompt interviewer",
    opening:"Good morning. I will give relatively little encouragement or confirmation. Continue explaining your reasoning even if I do not react to each step.",
    followupPrefix:"And then? ",
    interruption:"Pause. ",
    closing:"Thank you."
  },
}

export const warmUps: Record<TrackId,string[]> = {
  maths:[
    "State a conjecture from a small case, then explain what would count as a proof.",
    "Give a counterexample to a plausible universal claim.",
    "Explain one result in two genuinely different ways.",
    "Take a familiar equation and predict the effect of changing one parameter before calculating.",
    "Say which assumption in a proof is doing the most work and what happens if it is removed."
  ],
  physical:[
    "Estimate an everyday quantity and justify every approximation.",
    "Sketch a graph before choosing an equation and justify the intercepts and shape.",
    "Name one assumption in a familiar physical model and remove it.",
    "Give two different physical explanations for the same observed trend and suggest a test that separates them.",
    "Check a formula using dimensions, then explain what the limiting cases should look like."
  ],
  life:[
    "Give two mechanisms that could explain the same biological observation.",
    "Move from molecular to organism scale without breaking the causal chain.",
    "Design one control that would distinguish two explanations.",
    "Name a result that would falsify your preferred mechanism.",
    "Explain how the same observation could have a different explanation at population level."
  ],
  law:[
    "Write a simple rule, then invent a hard case for it.",
    "Distinguish a legal conclusion from the principle used to justify it.",
    "Give the strongest argument against your first view.",
    "Change one fact in a hypothetical and say whether it should alter the outcome.",
    "Refine a broad rule so it handles an edge case without becoming arbitrary."
  ],
  humanities:[
    "Distinguish description from explanation in one historical claim.",
    "Name evidence that would weaken your favoured interpretation.",
    "Define one contested concept and test it against an awkward case.",
    "Give two plausible causal explanations for the same event and identify evidence that separates them.",
    "Take one source and identify both what it can support and what it cannot establish."
  ],
  economics:[
    "Identify the main incentive in a policy and one second-order effect.",
    "State a model assumption and explain when it could fail.",
    "Interpret an average while naming what it might hide.",
    "Predict the direction of change before drawing or calculating anything.",
    "Give one efficiency argument and one distributional argument about the same policy."
  ],
  languages:[
    "Offer two interpretations of one short phrase.",
    "Explain what a translation gains and loses.",
    "Identify a formal choice and explain why it matters.",
    "Change the assumed speaker or audience and explain how the reading shifts.",
    "Choose one word whose ambiguity materially changes the interpretation."
  ],
}

export const mutationPrompts: Record<TrackId,string[]> = {
  maths:[
    "Now change one condition. Does your argument still work?",
    "Can you generalise the result?",
    "What is the smallest counterexample to your claim?",
    "Suppose the domain changes. Which step fails first?",
    "Can you prove the same result without using your original method?"
  ],
  physical:[
    "Double one parameter and predict the new behaviour before calculating.",
    "Remove the idealising assumption. What changes first?",
    "What would the graph look like in the limiting case?",
    "Now imagine the measurement has a systematic error. Which conclusion is least secure?",
    "Keep the same model but change the scale by several orders of magnitude. Which approximation breaks?"
  ],
  life:[
    "Change the environment or scale. Does the mechanism still explain the observation?",
    "Introduce a competing mechanism. What new evidence would distinguish them?",
    "What result would falsify your explanation?",
    "Suppose the correlation remains but the proposed intermediate step disappears. What follows?",
    "Now consider the same process in a different tissue, species or ecological context. What would you expect to remain invariant?"
  ],
  law:[
    "Change one fact. Does your rule produce the same outcome?",
    "Now consider the strongest hard case against your rule.",
    "Can you narrow the rule without making it arbitrary?",
    "Reverse the interests of the parties. Does your principle still look fair?",
    "Suppose the wording points one way but the purpose of the rule points another. How should that tension be resolved?"
  ],
  humanities:[
    "Now introduce a conflicting source. How should your interpretation change?",
    "Change the audience or context. What becomes less certain?",
    "What alternative causal account now becomes plausible?",
    "Suppose the source was produced twenty years later. Which inference becomes weaker?",
    "Now remove the piece of evidence you relied on most. What remains of the argument?"
  ],
  economics:[
    "Change one elasticity or incentive. What moves first?",
    "Add a distributional effect. Does your recommendation change?",
    "Relax ceteris paribus. Which conclusion is least stable?",
    "Suppose agents anticipate the policy before it starts. How does that alter the prediction?",
    "Now introduce a market failure or information problem. Which part of the simple model changes?"
  ],
  languages:[
    "Change the speaker or context. Which reading becomes stronger?",
    "Offer an alternative translation and defend it.",
    "Now focus on one word that complicates your interpretation.",
    "Suppose the punctuation changes. Which relationship between ideas changes with it?",
    "Read the passage against your first interpretation. Which details resist it most strongly?"
  ],
}

export const weakAnswerClinic = [
  { label:"Conclusion only", example:"I think that is the answer because it seems most likely.", diagnosis:"The conclusion is visible but the chain of reasoning is hidden.", fix:"State what you notice, the principle you are using, one test or example, and then a provisional conclusion." },
  { label:"Over-rehearsed", example:"I have always been passionate about this subject and therefore…", diagnosis:"Polished wording is replacing analysis of the question in front of you.", fix:"Drop the prepared phrase and respond directly to the new evidence or problem." },
  { label:"Unsupported assertion", example:"That source is unreliable.", diagnosis:"A judgement is made without criteria or evidence.", fix:"Name the feature that creates the limitation and explain exactly how it affects what can be inferred." },
  { label:"Rigid reasoning", example:"That was my original answer, so I would keep it.", diagnosis:"The response resists new information instead of updating.", fix:"Say explicitly what the new information changes, then revise only the part of the argument that depends on it." },
  { label:"Definition drift", example:"By fairness I basically mean whatever gives the best outcome.", diagnosis:"A key term changes meaning during the answer, so the argument becomes difficult to test.", fix:"Define the term once, test the definition against an edge case, and flag explicitly if you decide to revise it." },
  { label:"Example without principle", example:"This reminds me of one case I read about…", diagnosis:"A relevant example is offered, but the general principle connecting it to the question is missing.", fix:"State the principle first, use the example as a test of that principle, then return to the original question." },
  { label:"Hidden assumption", example:"Obviously that variable stays constant.", diagnosis:"The argument depends on a condition that has not been justified.", fix:"Name the assumption, explain why it is reasonable here, and say what would change if it failed." },
  { label:"Evidence dump", example:"There are lots of studies and examples showing this.", diagnosis:"Information is listed without explaining which evidence actually bears on the disputed step.", fix:"Choose the most diagnostic evidence and explain the inference it supports—and the inference it does not support." },
]

export const coachMilestones = [
  { id:"first-interview", label:"First formal interview", condition:"Complete one interview session" },
  { id:"five-interviews", label:"Five academic conversations", condition:"Complete five interview sessions" },
  { id:"ten-interviews", label:"Ten sustained interviews", condition:"Complete ten interview sessions" },
  { id:"first-paper", label:"First full admissions paper", condition:"Complete a full paper or mock" },
  { id:"hundred-questions", label:"100 questions attempted", condition:"Reach 100 admissions-test attempts" },
  { id:"two-hundred-questions", label:"200 questions attempted", condition:"Reach 200 admissions-test attempts" },
  { id:"revision-after-challenge", label:"Changed mind after challenge", condition:"Record a revised position in an interview transcript" },
  { id:"spaced-review", label:"Closed a spaced-review loop", condition:"Clear all currently overdue mistakes at least once" },
  { id:"supercurricular", label:"Defended a supercurricular claim", condition:"Record and question an academic activity" },
  { id:"supercurricular-depth", label:"Built supercurricular depth", condition:"Record at least three substantive academic activities" },
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
  { university:"UAT-UK", area:"TMUA / ESAT / TARA", title:"Official UAT-UK preparation hub", url:"https://esat-tmua.ac.uk/prepare/", checked:"23 September 2026" },
  { university:"UAT-UK", area:"TMUA archive", title:"Official historic TMUA papers and worked answers", url:"https://esat-tmua.ac.uk/tmua-preparation-materials/", checked:"23 September 2026" },
  { university:"LNAT", area:"Practice", title:"Official LNAT tutorial and practice tests", url:"https://lnat.ac.uk/how-to-prepare/practice-test/", checked:"23 September 2026" },
  { university:"UCAT", area:"Practice", title:"Official UCAT practice tests and question banks", url:"https://www.ucat.ac.uk/prepare/practice-tests/", checked:"23 September 2026" },
]

export const testStrategies: Record<TestName,{ focus:string[]; miniMinutes:number[] }> = {
  TMUA:{ focus:["algebra and functions","proof and logic","coordinate geometry","trigonometry","probability","calculus reasoning","checking counterexamples"], miniMinutes:[10,20,30] },
  ESAT:{ focus:["Mathematics 1","Mathematics 2","physics","chemistry","biology","graph interpretation","data and modelling"], miniMinutes:[10,20,30] },
  TARA:{ focus:["critical thinking","problem solving","assumptions","inference","quantitative reasoning","argument writing"], miniMinutes:[10,20,30] },
  LNAT:{ focus:["passage inference","author attitude","argument structure","assumptions","qualifiers","counterarguments","essay planning"], miniMinutes:[10,20,30] },
  UCAT:{ focus:["verbal reasoning","decision making","quantitative reasoning","situational judgement","navigation and flagging","time protection"], miniMinutes:[10,20,30] },
}

export const interviewRoutingNotes = {
  Oxford:"Expect the academic discussion to move rather than follow a rehearsed script. Practise transferring your reasoning to a second interviewer, unfamiliar material or a changed condition, and keep your method visible even when the interviewer gives little feedback.",
  Cambridge:"Interview and assessment arrangements can vary by course and College. Treat the official course and College guidance as the source of truth; rehearse both sustained academic discussion and any published assessment format relevant to your application.",
}

export function confidenceCalibration(confidence:number, score:number) {
  if (confidence >= 5 && score < 55) return "Very high confidence + weak performance: introduce a deliberate verification step before committing to a conclusion."
  if (confidence >= 4 && score < 65) return "High confidence + weaker performance: slow down, state the key assumption and test one alternative before committing."
  if (confidence <= 1 && score >= 80) return "Very low confidence + strong reasoning: your method is substantially better than your self-assessment. Keep thinking aloud and trust the process."
  if (confidence <= 2 && score >= 75) return "Low confidence + strong reasoning: trust the process more and keep explaining the method even when uncertain."
  if (confidence >= 4 && score >= 75) return "Confidence and performance were well aligned. Keep checking assumptions rather than equating confidence with certainty."
  if (confidence === 3 && score >= 65) return "Your confidence was appropriately cautious. Continue separating uncertainty about the final answer from confidence in the reasoning process."
  return "Calibration is still developing. Keep rating confidence before seeing feedback so you can distinguish uncertainty from weak reasoning."
}

export function buildCoachPlan(input:{ sessions:number; attempts:number; accuracy:number; overdue:number; topMistake?:string; activities:number; mentorTasks:number }) {
  const items:string[] = []

  if (input.overdue > 0) items.push(`Clear ${input.overdue} spaced-review question${input.overdue === 1 ? "" : "s"} first. Explain the corrected method before checking the answer.`)

  if (input.sessions === 0) items.push("Complete one formal Realistic interview to establish a baseline for reasoning, flexibility, subject use and clarity.")
  else if (input.sessions < 3) items.push("Run another formal interview with a different interviewer persona so your performance does not depend on one interaction style.")
  else if (input.sessions < 6) items.push("Complete a full Mock Day: pre-reading, Interview 1, break, Interview 2 and combined reflection.")
  else items.push("Use No-hint or Minimal-prompt interview mode and deliberately practise revising one claim after a challenge.")

  if (input.attempts < 30) items.push("Complete a 20-minute mini-paper to establish a timing and accuracy baseline before doing more untimed questions.")
  else if (input.accuracy < 60) items.push("Pause full papers. Use Teach Me This on the weakest area, then complete a 10-minute targeted mini-paper and explain every error.")
  else if (input.accuracy < 75) items.push("Complete a 20-minute mini-paper from the weakest section and aim to improve accuracy before speed.")
  else if (input.accuracy < 85) items.push("Sit one strict timed section and review skipped, changed and slow questions separately from wrong answers.")
  else items.push("Sit one full timed paper under strict section rules, then review only the questions where the reasoning was uncertain or inefficient.")

  if (input.topMistake && input.topMistake !== "No dominant error") items.push(`Deliberate-practice focus: ${input.topMistake}. Before each answer, perform one explicit check designed to prevent that error.`)

  if (input.activities < 1) items.push("Add one genuine supercurricular activity and record what changed in your understanding, not just what you read or attended.")
  else if (input.activities < 3) items.push("Return to one supercurricular activity and defend a claim, a disagreement and one question you would now investigate further.")

  if (input.mentorTasks > 0) items.push("Complete the oldest mentor assignment before adding another optional practice task.")

  return items.slice(0,4)
}

export function milestoneStatus(progress:{ sessions:number; testAttempted:number; activities:number; completed:string[]; wrongQuestionIds:string[]; logs:Array<{ events:string[] }> }) {
  const revised = progress.logs.some(log => log.events.some(e => /revise|changed my mind|updated/i.test(e)))
  return [
    progress.sessions >= 1,
    progress.sessions >= 5,
    progress.sessions >= 10,
    progress.completed.some(x => /paper|mock/i.test(x)),
    progress.testAttempted >= 100,
    progress.testAttempted >= 200,
    revised,
    progress.wrongQuestionIds.length === 0 && progress.testAttempted > 0,
    progress.activities >= 1,
    progress.activities >= 3,
  ]
}

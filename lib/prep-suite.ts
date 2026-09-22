import type { TrackId } from "@/lib/oxbridge-data"
import type { TestName } from "@/lib/question-bank"

export type CourseInterviewProfile = {
  course: string
  emphasis: string[]
  openingStyle: string
  challengeMoves: string[]
  unseenTypes: string[]
  whiteboard: "Often useful" | "Sometimes useful"
}

const profiles: Record<string, CourseInterviewProfile> = {
  physics: { course:"Physics", emphasis:["modelling","estimation","graphs","experimental reasoning"], openingStyle:"Start with a familiar physical situation, then remove an assumption or introduce a surprising observation.", challengeMoves:["Ask for a limiting case.","Change one physical parameter.","Request a sketch graph.","Ask for a dimensional check."], unseenTypes:["graph","experimental data","diagram","estimation problem"], whiteboard:"Often useful" },
  engineering: { course:"Engineering", emphasis:["modelling","forces","energy","design trade-offs"], openingStyle:"Start with a practical system and ask the applicant to simplify it into a useful model.", challengeMoves:["Introduce a design constraint.","Ask what can be neglected.","Request an order-of-magnitude estimate.","Ask how the design could fail."], unseenTypes:["system diagram","data table","design sketch"], whiteboard:"Often useful" },
  chemistry: { course:"Chemistry", emphasis:["structure","mechanism","energetics","equilibrium","evidence"], openingStyle:"Start from an observation or molecular structure and ask what could cause it.", challengeMoves:["Change a condition.","Ask for competing explanations.","Request an experimental test.","Ask what evidence would falsify the mechanism."], unseenTypes:["molecular sketch","data table","reaction observation"], whiteboard:"Often useful" },
  mathematics: { course:"Mathematics", emphasis:["proof","generality","counterexamples","structure"], openingStyle:"Start with a small case, then ask for a general statement and justification.", challengeMoves:["Ask for a proof.","Request a counterexample.","Change the domain.","Ask for a second method."], unseenTypes:["pattern","proof claim","geometric diagram"], whiteboard:"Often useful" },
  "computer science": { course:"Computer Science", emphasis:["algorithms","logic","invariants","complexity"], openingStyle:"Start with a puzzle or process and ask the applicant to design, explain and improve an algorithm.", challengeMoves:["Ask for an invariant.","Change the input size.","Ask for a failure case.","Compare two algorithms."], unseenTypes:["algorithm trace","logic puzzle","graph/network"], whiteboard:"Often useful" },
  medicine: { course:"Medicine", emphasis:["mechanisms","evidence","data interpretation","ethical reasoning"], openingStyle:"Begin with biological or clinical evidence and ask what can and cannot be concluded.", challengeMoves:["Introduce conflicting evidence.","Ask for a mechanism.","Add an ethical trade-off.","Ask what further evidence is needed."], unseenTypes:["biological data","study summary","graph"], whiteboard:"Sometimes useful" },
  biology: { course:"Biology", emphasis:["mechanisms","evolution","data interpretation","experimental design"], openingStyle:"Begin with an organism, observation or dataset and ask the applicant to generate explanations.", challengeMoves:["Ask for a mechanism.","Move between scales.","Request a control experiment.","Introduce an exception."], unseenTypes:["dataset","phylogeny","experimental result"], whiteboard:"Sometimes useful" },
  "natural sciences": { course:"Natural Sciences", emphasis:["cross-disciplinary transfer","mechanisms","quantitative reasoning","experimental design"], openingStyle:"Begin with an unfamiliar scientific observation and connect ideas across subjects.", challengeMoves:["Change scientific scale.","Ask for a quantitative model.","Request an experiment.","Ask for an alternative mechanism."], unseenTypes:["graph","dataset","diagram"], whiteboard:"Often useful" },
  law: { course:"Law", emphasis:["rules","counterexamples","textual interpretation","fairness"], openingStyle:"Give a short rule or case, test it with edge cases, then ask the applicant to refine the rule.", challengeMoves:["Introduce a hard case.","Reverse one fact.","Ask for the strongest opposing argument.","Request a narrower rule."], unseenTypes:["mini-case","rule text","fact pattern"], whiteboard:"Sometimes useful" },
  jurisprudence: { course:"Jurisprudence", emphasis:["rules","counterexamples","interpretation","rights"], openingStyle:"Give a compact legal rule and probe its boundaries through counterexamples.", challengeMoves:["Change a material fact.","Ask for the purpose of the rule.","Introduce a competing right.","Ask for a principled distinction."], unseenTypes:["mini-case","rule text","argument extract"], whiteboard:"Sometimes useful" },
  economics: { course:"Economics", emphasis:["incentives","models","trade-offs","data","mathematics"], openingStyle:"Start with a policy or dataset, build a simple model, then question its assumptions.", challengeMoves:["Change an elasticity.","Introduce a distributional effect.","Ask for a diagram or equation.","Challenge ceteris paribus."], unseenTypes:["graph","data table","policy scenario"], whiteboard:"Often useful" },
  ppe: { course:"PPE", emphasis:["conceptual distinctions","argument","evidence","models"], openingStyle:"Begin with a contestable claim and require definitions before evaluation.", challengeMoves:["Switch disciplinary lens.","Ask for a counterexample.","Introduce contrary evidence.","Ask what would change the conclusion."], unseenTypes:["argument extract","policy data","conceptual puzzle"], whiteboard:"Sometimes useful" },
  history: { course:"History", emphasis:["source evaluation","causation","context","comparison"], openingStyle:"Begin with an unfamiliar source and ask what can responsibly be inferred.", challengeMoves:["Add a conflicting source.","Change the audience.","Ask about omission.","Request an alternative causal account."], unseenTypes:["source extract","chronology","conflicting accounts"], whiteboard:"Sometimes useful" },
  english: { course:"English", emphasis:["close reading","form","language","alternative readings"], openingStyle:"Begin with a short unseen passage and ask the applicant to notice before interpreting.", challengeMoves:["Focus on one word.","Ask for an alternative reading.","Change the assumed speaker.","Ask how form affects meaning."], unseenTypes:["poem","prose extract","dramatic speech"], whiteboard:"Sometimes useful" },
  "modern languages": { course:"Modern Languages", emphasis:["close reading","language awareness","translation choices","interpretation"], openingStyle:"Begin with an unseen passage or translation choice and require precise linguistic observations.", challengeMoves:["Offer an alternative translation.","Ask about tone.","Change contextual assumptions.","Request textual evidence."], unseenTypes:["short prose","poem","translation pair"], whiteboard:"Sometimes useful" },
}

const fallbackByTrack: Record<TrackId, CourseInterviewProfile> = {
  maths: profiles.mathematics, physical: profiles.physics, life: profiles.biology, law: profiles.law,
  humanities: profiles.history, economics: profiles.economics, languages: profiles.english,
}

export function interviewProfileFor(course: string, track: TrackId) {
  const normalized = course.toLowerCase()
  const exact = profiles[normalized]
  if (exact) return exact
  return Object.entries(profiles).find(([key]) => normalized.includes(key) || key.includes(normalized))?.[1] ?? fallbackByTrack[track]
}

export const interviewDayStages = [
  { id:"briefing", label:"Briefing", minutes:3, description:"Check format, materials and technology. Decide how you will think aloud when stuck." },
  { id:"pre-read", label:"Pre-reading", minutes:10, description:"Annotate unfamiliar material and prepare observations, questions and uncertainties." },
  { id:"interview-1", label:"Interview 1", minutes:20, description:"Academic conversation with adaptive follow-ups and no model answer during the interview." },
  { id:"break", label:"Short break", minutes:5, description:"Reset without searching for answers." },
  { id:"interview-2", label:"Interview 2", minutes:20, description:"A different interviewer probes transfer, flexibility and response to new information." },
  { id:"reflection", label:"Combined review", minutes:8, description:"Review reasoning, hints, flexibility and subject-specific thinking across both interviews." },
] as const

export const officialPreparationSources = {
  oxfordInterviews:"https://www.ox.ac.uk/admissions/undergraduate/applying/guide-for-applicants/interviews",
  oxfordTechnology:"https://www.ox.ac.uk/admissions/undergraduate/applying/guide-for-applicants/interviews/technology",
  oxfordWrittenWork:"https://www.ox.ac.uk/admissions/undergraduate/applying/guide-for-applicants/written-work",
  oxfordTests:"https://www.ox.ac.uk/admissions/undergraduate/applying/guide-for-applicants/admissions-tests",
  cambridgeInterviews:"https://www.undergraduate.study.cam.ac.uk/apply/after/cambridge-interviews",
  cambridgeTests:"https://www.undergraduate.study.cam.ac.uk/apply/how/admission-tests",
  cambridgeCollegeAssessments:"https://www.undergraduate.study.cam.ac.uk/apply/after/college-assessments",
  cambridgeWrittenWork:"https://www.undergraduate.study.cam.ac.uk/apply/after/written-work-portfolio",
}

export const dailyChallenges: Record<TrackId, string[]> = {
  maths:["Find two methods for a result and explain which generalises better.","Remove one assumption from a familiar theorem and test what survives.","Design a counterexample to a plausible but false claim."],
  physical:["Estimate a real-world quantity from reasonable approximations.","Sketch a graph for an unfamiliar system before writing equations.","Remove one standard simplifying assumption and predict the consequences."],
  life:["Design an experiment distinguishing two mechanisms behind a correlation.","Explain one process at molecular, cellular and organism scales.","Invent one observation that would make you abandon a favoured explanation."],
  law:["Write a rule, create a hard counterexample, then refine the rule.","Argue both sides of a rights conflict and identify the key principle.","Compare literal, purposive and consequence-based readings of an ambiguous rule."],
  humanities:["List evidence that would strengthen, weaken and leave unchanged a historical claim.","Define a contested concept and test it against an awkward case.","Construct two genuinely different causal explanations for one event."],
  economics:["Choose a policy and predict two second-order effects.","Build a simple model and identify the assumption most likely to fail.","Explain three important differences an average statistic could hide."],
  languages:["Build two interpretations from the same textual details.","Translate one sentence in two ways and explain what each gains and loses.","Explain why a repeated image or structural choice matters."],
}

type Lesson = { title:string; explanation:string; workedExample:string; guidedPrompt:string; independentPrompt:string; retrieval:string[] }
const lessons: Record<TestName, Lesson> = {
  TMUA:{ title:"TMUA reasoning reset", explanation:"Separate mathematical content from logical structure. State what must be true, test a small case, then generalise. Use options strategically without replacing proof.", workedExample:"A single counterexample disproves a universal claim. A converse is not automatically equivalent to the original statement; a contrapositive is.", guidedPrompt:"Write the claim in if/then form. What is its converse and contrapositive?", independentPrompt:"Create a statement whose converse is false but contrapositive is true.", retrieval:["What does a counterexample establish?","How is a converse different from a contrapositive?","When can testing values support but not prove a claim?"] },
  ESAT:{ title:"ESAT modelling reset", explanation:"Translate words, diagrams and data into a compact model. Track units, signs and proportional relationships before substituting numbers.", workedExample:"For mv²/r, units are kg × m² s⁻² ÷ m = kg m s⁻², revealing a force dimension.", guidedPrompt:"List known quantities, units and the relationship you expect before choosing an equation.", independentPrompt:"Choose a formula and explain what doubling each variable does.", retrieval:["Why check units first?","What can a graph gradient represent?","What makes a simplifying assumption acceptable?"] },
  TARA:{ title:"TARA argument reset", explanation:"Separate conclusion, reasons, assumptions and evidence. Ask what must be true for the argument to work.", workedExample:"If bus use rises after fares fall, traffic does not necessarily fall because new bus journeys may replace walking. The substitution pattern is a hidden assumption.", guidedPrompt:"Identify the conclusion, evidence and missing assumption.", independentPrompt:"Write a two-sentence argument with one hidden assumption and challenge it.", retrieval:["What is an assumption?","How is evidence different from a conclusion?","What makes a counterexample relevant?"] },
  LNAT:{ title:"LNAT reading reset", explanation:"Answer from the passage, not outside knowledge. Distinguish what the author states, implies, concedes and rejects. Essays need a defined issue, defensible claim, reasons, counterargument and conclusion.", workedExample:"Calling a policy understandable but self-defeating concedes its appeal while rejecting its effectiveness.", guidedPrompt:"Give each paragraph a five-word job. Which paragraph qualifies the argument?", independentPrompt:"Write a 120-word argument containing a serious counterargument.", retrieval:["Inference versus speculation?","Why do qualifiers matter?","What should a strong counterargument do?"] },
  UCAT:{ title:"UCAT efficiency reset", explanation:"Use only the information rules of the subtest, avoid unnecessary calculation and move on when an item consumes disproportionate time.", workedExample:"For a rate question, establish the unit rate first. In verbal reasoning, locate relevant text before judging a statement.", guidedPrompt:"What is the minimum information needed here? Which details can be ignored?", independentPrompt:"Take a multi-step calculation and find one safe shortcut.", retrieval:["When should you skip and return?","What makes a shortcut safe?","Why avoid outside knowledge in passage questions?"] },
}
export const teachingLessonFor = (test: TestName) => lessons[test]

export const mistakeRemedies: Record<string,string> = {
  "Misread question":"Restate the task before solving and mark qualifiers such as must, could, except and most strongly.",
  "Knowledge gap":"Use Teach Me This, then complete one guided example and two fresh questions from the same section.",
  "Logical error":"Write premises → inference → conclusion and test the weakest inference with a counterexample.",
  "Calculation error":"Estimate first, carry units and perform a reverse or magnitude check.",
  "Poor assumption":"State the assumption and ask what changes if it is false.",
  "Time-pressure error":"Use a decision point: if no productive route appears, flag and move on.",
  "Under-developed reasoning":"Use claim → reason → example/test → provisional conclusion.",
  "Knowledge connection":"Name the relevant concept before applying it.",
  "Logical chain":"Explain why each step follows rather than jumping to the conclusion.",
  "Unexamined assumption":"Identify the strongest assumption and test an alternative or edge case.",
}

export const mentorAssignmentTemplates = [
  "Complete one full paper under timed conditions and review every missed item.",
  "Complete a two-interview Mock Day and write a short reflection on how your thinking changed.",
  "Defend three claims from your personal statement without using prepared scripts.",
  "Analyse one unseen source or dataset and identify what evidence would change your conclusion.",
  "Complete the spaced-review queue before starting new questions.",
]

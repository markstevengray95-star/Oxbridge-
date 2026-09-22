import type { TrackId, University } from "@/lib/oxbridge-data"

export type Pressure = "Guided" | "Normal" | "Challenging" | "Full Mock"
export type Interviewer = "Supportive tutor" | "Socratic tutor" | "Technical tutor" | "Critical tutor"

export const pathwayDetails: Record<TrackId, {
  oxfordTests: string[]
  cambridgeTests: string[]
  writtenWork: string
  interview: string
  topics: string[]
  skills: string[]
}> = {
  maths: {
    oxfordTests: ["TMUA for Mathematics and Computer Science routes"],
    cambridgeTests: ["TMUA for Computer Science", "TMUA and possible STEP conditions for Mathematics"],
    writtenWork: "Usually no submitted written work; confirm the exact course page.",
    interview: "Live problem solving, proof, pattern finding and explaining each choice.",
    topics: ["algebra", "proof", "geometry", "probability", "algorithms", "graphs"],
    skills: ["generalise", "prove", "test an edge case", "explain an algorithm", "find a counterexample"],
  },
  physical: {
    oxfordTests: ["ESAT for Physics and Engineering", "Check the course page for Chemistry and Materials"],
    cambridgeTests: ["ESAT for Engineering, Natural Sciences and Chemical Engineering"],
    writtenWork: "Usually no submitted written work for core STEM routes.",
    interview: "Modelling unfamiliar situations, estimation, graphs, experiments and changing assumptions.",
    topics: ["mechanics", "electricity", "waves", "thermal physics", "materials", "experimental design"],
    skills: ["estimate", "model", "check units", "interpret a strange graph", "design a test"],
  },
  life: {
    oxfordTests: ["UCAT for Medicine", "ESAT for Biomedical Sciences", "TARA for selected routes"],
    cambridgeTests: ["UCAT for Medicine", "ESAT for Natural Sciences and Chemical Engineering"],
    writtenWork: "Course dependent; scientific written work is not normally the central interview evidence.",
    interview: "Mechanisms, data, experimental design, ethics and applying familiar biology to a new context.",
    topics: ["cells", "genetics", "physiology", "ecology", "biochemistry", "medical evidence"],
    skills: ["explain a mechanism", "interpret data", "control variables", "evaluate evidence", "form a hypothesis"],
  },
  law: {
    oxfordTests: ["LNAT"],
    cambridgeTests: ["LNAT for Law"],
    writtenWork: "Check College requirements; submitted school work may be discussed where requested.",
    interview: "Build and revise rules, analyse short cases, expose assumptions and use counterexamples.",
    topics: ["rules", "rights", "responsibility", "evidence", "fairness", "legal interpretation"],
    skills: ["define a rule", "apply a principle", "use a counterexample", "qualify a claim", "weigh competing rights"],
  },
  humanities: {
    oxfordTests: ["TARA for selected courses"],
    cambridgeTests: ["Course or College assessment where specified"],
    writtenWork: "Written work is common for several humanities courses and may anchor discussion.",
    interview: "Unseen sources, concepts, competing interpretations and close use of evidence.",
    topics: ["historical sources", "political ideas", "ethics", "human geography", "causation", "interpretation"],
    skills: ["evaluate provenance", "compare interpretations", "define a concept", "use evidence", "challenge causation"],
  },
  economics: {
    oxfordTests: ["TARA for PPE and Economics & Management"],
    cambridgeTests: ["TMUA for Economics"],
    writtenWork: "Usually no submitted written work; check the exact course and College.",
    interview: "Data, incentives, models, trade-offs, mathematics and challenges to assumptions.",
    topics: ["markets", "externalities", "game theory", "inequality", "public policy", "data"],
    skills: ["identify incentives", "draw a model", "interpret data", "test an assumption", "evaluate a policy"],
  },
  languages: {
    oxfordTests: ["Course-specific assessment where listed"],
    cambridgeTests: ["Course or College assessment where specified"],
    writtenWork: "Submitted essays are common for English and some language or classics routes.",
    interview: "Close reading of unseen material, language choices, alternative readings and defence with evidence.",
    topics: ["unseen poetry", "prose voice", "translation", "rhetoric", "form", "linguistic change"],
    skills: ["close read", "analyse language", "defend an interpretation", "compare readings", "notice structure"],
  },
}

export function pathwayFor(university: University, track: TrackId) {
  const details = pathwayDetails[track]
  const tests = university === "Oxford" ? details.oxfordTests : university === "Cambridge" ? details.cambridgeTests : [...details.oxfordTests, ...details.cambridgeTests]
  return { ...details, tests: [...new Set(tests)] }
}

export const deadlines2027 = [
  { date: "2026-09-28", label: "UAT-UK October test booking closes", note: "For TMUA, ESAT and TARA: booking closes at 18:00 UK time. Access-arrangement and bursary deadlines are earlier." },
  { date: "2026-10-12", label: "UAT-UK October test window begins", note: "Oxford and Cambridge applicants using TMUA, ESAT or TARA normally sit in the 12–16 October 2026 window." },
  { date: "2026-10-15", label: "UCAS application deadline", note: "Submit by 18:00 UK time; school deadlines are often earlier." },
  { date: "2026-11-10", label: "Written work window", note: "Exact requirements and dates vary by university, course and College." },
  { date: "2026-12-01", label: "Interview preparation window", note: "Oxford interviews are online in the current cycle; Cambridge arrangements vary." },
  { date: "2026-12-21", label: "Main interview period ends", note: "Check the invitation for exact dates, technology and materials." },
]

export const unseenMaterials: Record<TrackId, { label: string; material: string; questions: string[] }> = {
  maths: { label: "Pattern", material: "1, 2, 6, 15, 31, 56, …", questions: ["Describe more than one plausible pattern.", "What evidence would distinguish the rules?", "Can a finite sequence determine one unique continuation?"] },
  physical: { label: "Experimental graph", material: "A cooling curve falls quickly, becomes nearly flat, then falls quickly again after 12 minutes.", questions: ["What mechanisms could produce the flat region?", "Sketch a control experiment.", "Which measurement would rule out your preferred explanation?"] },
  life: { label: "Dataset", material: "Enzyme activity: 10°C → 4 units; 20°C → 9; 30°C → 17; 40°C → 19; 50°C → 3.", questions: ["Describe rather than explain the trend first.", "Offer a molecular explanation.", "What uncertainty information is missing?"] },
  law: { label: "Mini-case", material: "A town bans amplified sound in public spaces. A protester uses a battery-powered speaker during an emergency warning.", questions: ["Construct the strongest literal reading.", "Construct the strongest purposive reading.", "Draft a better rule."] },
  humanities: { label: "Unseen source", material: "A reformer writes privately that change is urgent, but publicly argues that gradual reform is safer.", questions: ["What can the contrast reveal?", "Which audience matters?", "What evidence would test strategic rather than sincere explanations?"] },
  economics: { label: "Data shock", material: "A city raises parking prices by 30%. Car journeys fall 8%, bus crowding rises 19%, and retail footfall is unchanged.", questions: ["Which conclusions are supported?", "What elasticities matter?", "What distributional effect might the averages hide?"] },
  languages: { label: "Unseen prose", material: "The narrator calls the room ‘unchanged’, then notices a new lock, missing photograph and freshly painted wall.", questions: ["How does detail challenge the claim?", "What kind of unreliability is possible?", "Which word choices would you examine next?"] },
}

const frames: Record<TrackId, string[]> = {
  maths: ["Prove or disprove a claim about", "Find a general rule involving", "Design an efficient method for", "Explain the limiting case of", "Construct a counterexample involving"],
  physical: ["Estimate a quantity involving", "Model an unfamiliar system using", "Interpret a surprising graph about", "Design a fair experiment on", "Predict what changes when we vary"],
  life: ["Explain a mechanism involving", "Interpret a new dataset about", "Design a controlled study of", "Evaluate a causal claim about", "Predict an adaptation related to"],
  law: ["Create and test a rule about", "Resolve a conflict involving", "Interpret ambiguous wording about", "Use a counterexample to challenge", "Balance rights in a case about"],
  humanities: ["Compare two explanations of", "Evaluate an unseen source about", "Define and challenge the concept of", "Build a causal argument about", "Defend a revisionist interpretation of"],
  economics: ["Model the incentives surrounding", "Evaluate a policy on", "Interpret unusual data about", "Challenge an assumption concerning", "Explain an unintended effect of"],
  languages: ["Close-read an unseen passage about", "Defend two interpretations of", "Analyse a structural choice in", "Explore an unreliable voice describing", "Compare the effect of two translations of"],
}

export function generatedInterviewQuestion(track: TrackId, difficulty: string, skill: string, seed: number) {
  const details = pathwayDetails[track]
  const frame = frames[track][seed % frames[track].length]
  const topic = details.topics[Math.floor(seed / frames[track].length) % details.topics.length]
  const complication = [
    "Begin with the simplest case, then remove one assumption.",
    "State what evidence would make you change your view.",
    "After reaching an answer, test the opposite conclusion.",
    "Introduce one numerical estimate or concrete example.",
  ][seed % 4]
  return {
    title: `${difficulty} · ${topic}`,
    prompt: `${frame} ${topic}. Focus on how you would ${skill}. ${complication}`,
    probes: ["Which assumption is doing the most work?", "What simpler case could you test first?", "Would your conclusion survive the opposite example?"],
  }
}

export const readingExtracts: Record<TrackId, { title: string; text: string; questions: string[] }> = {
  maths: { title: "What makes a proof explanatory?", text: "A proof can establish that a statement is true without making the reason feel inevitable. An explanatory proof often exposes a structure that survives beyond the original problem.", questions: ["Is explanation part of proof or an additional virtue?", "What would count as evidence that one proof explains more?"] },
  physical: { title: "Models and reality", text: "A useful model deliberately ignores detail. Its value depends less on being literally complete than on making reliable predictions within a stated range.", questions: ["When does simplification become distortion?", "How would you identify the model's valid range?"] },
  life: { title: "Evidence in complex systems", text: "In living systems, the same observation may arise from several mechanisms. Strong inference combines intervention, comparison and a mechanism that generates testable predictions.", questions: ["Why is correlation especially difficult here?", "What makes a mechanism testable?"] },
  law: { title: "Rules and exceptions", text: "A perfectly precise rule may still produce injustice in an unforeseen case. Yet unlimited discretion can make outcomes unpredictable and unequal.", questions: ["Which danger is greater?", "Can a system preserve certainty and flexibility?"] },
  humanities: { title: "Silence as evidence", text: "Absence from a source is not automatically evidence of absence. But patterns of omission, viewed against what an author could and would normally record, may still be historically meaningful.", questions: ["When can silence support an inference?", "How would you avoid circular reasoning?"] },
  economics: { title: "The benchmark model", text: "An unrealistic assumption may be useful when it isolates a mechanism. The relevant test is whether relaxing it changes the prediction that matters for the decision.", questions: ["Can prediction excuse a false assumption?", "How would you compare two models fairly?"] },
  languages: { title: "Reading against certainty", text: "An interpretation grows stronger when it explains not only the most obvious detail but also the awkward feature that initially seems to resist it.", questions: ["Does every text permit several equally good readings?", "What could falsify an interpretation?"] },
}

export const weeklyTemplate = [
  "Complete one adaptive interview",
  "Answer 15 admissions-test questions",
  "Discuss one unseen source or dataset",
  "Defend one application claim",
  "Reflect on one supercurricular activity",
]

export const teacherStudents = [
  { name: "Applicant A", course: "Physics", test: "ESAT", testProgress: 64, interviews: 3, focus: "Explain assumptions" },
  { name: "Applicant B", course: "Law", test: "LNAT", testProgress: 72, interviews: 5, focus: "Use counterexamples" },
  { name: "Applicant C", course: "Economics", test: "TMUA", testProgress: 48, interviews: 2, focus: "Time management" },
]

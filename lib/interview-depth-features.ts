export type ApplicationInterviewContext = {
  university?: string
  course?: string
  epq?: string
  books?: string
  projects?: string
  writtenWork?: string
  interests?: string
  competitions?: string
  workExperience?: string
}

export type CourseInterviewProfile = {
  family: string
  interviewerA: string
  interviewerB: string
  priorities: string[]
  preferredMoves: string[]
}

export type DeepChainStage = "establish" | "probe" | "destabilise" | "transfer" | "synthesise"

function clean(value: unknown) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : ""
}

export function deepChainStage(candidateTurns: number): DeepChainStage {
  if (candidateTurns <= 1) return "establish"
  if (candidateTurns <= 3) return "probe"
  if (candidateTurns <= 5) return "destabilise"
  if (candidateTurns <= 7) return "transfer"
  return "synthesise"
}

export function deepChainInstruction(candidateTurns: number) {
  const stage = deepChainStage(candidateTurns)
  if (stage === "establish") return "Stay with one substantial problem. Establish the candidate's model, definitions and first line of reasoning before changing topic."
  if (stage === "probe") return "Keep the same core problem. Probe two or three linked consequences of the candidate's reasoning rather than starting a fresh unrelated question."
  if (stage === "destabilise") return "Keep the same underlying problem but change one assumption, introduce conflicting evidence or expose a limiting case. Test whether the candidate can repair the model."
  if (stage === "transfer") return "Transfer the principle from the original problem into a genuinely different context, while making the connection to the earlier chain explicit."
  return "Ask the candidate to synthesise the whole chain: state the principle, its limits, what changed their view, and what evidence would still make them revise it."
}

export function applicationLaunchQuestion(context: ApplicationInterviewContext | undefined, course: string) {
  if (!context) return null
  const candidates: Array<[string, string]> = [
    ["written work", clean(context.writtenWork)],
    ["EPQ or independent research", clean(context.epq)],
    ["book/article/lecture", clean(context.books)],
    ["project", clean(context.projects)],
    ["academic interest", clean(context.interests)],
    ["competition or challenge", clean(context.competitions)],
    ["relevant experience", clean(context.workExperience)],
  ]
  const first = candidates.find(([, value]) => value.length >= 8)
  if (!first) return null
  const [source, value] = first
  const excerpt = value.slice(0, 520)
  return {
    source,
    excerpt,
    prompt: `You mention this ${source} in your application context: “${excerpt}”. Start by identifying the most important academic claim or idea in it. What do you now think is the strongest reason to defend that claim, and what would make you change your mind?`,
    followUpRule: `Do not stay at the level of rehearsed application description. After one answer, move beyond what the candidate prepared: test an assumption, ask for evidence, introduce a counterexample, or transfer the idea into a new ${course || "course"} context.`,
  }
}

export function courseInterviewProfile(course: string, track?: string): CourseInterviewProfile {
  const key = `${course} ${track || ""}`.toLowerCase()
  if (/math|computer|computing/.test(key)) return {
    family: "Mathematics & Computer Science",
    interviewerA: "constructive problem-builder",
    interviewerB: "proof-and-counterexample sceptic",
    priorities: ["definitions", "proof structure", "small and extreme cases", "generalisation", "algorithmic efficiency"],
    preferredMoves: ["derive", "prove or disprove", "find a counterexample", "compare methods", "generalise"],
  }
  if (/physics|engineering|chemistry|materials|physical/.test(key)) return {
    family: "Physical Sciences & Engineering",
    interviewerA: "model-building experimentalist",
    interviewerB: "quantitative assumptions examiner",
    priorities: ["mechanism", "estimation", "units and dimensions", "limiting cases", "experimental discrimination"],
    preferredMoves: ["estimate", "draw a model", "change a condition", "test a limit", "design a measurement"],
  }
  if (/medicine|biology|biochem|biomedical|life/.test(key)) return {
    family: "Life Sciences & Medicine",
    interviewerA: "mechanism-focused scientist",
    interviewerB: "evidence-and-experimental-design sceptic",
    priorities: ["mechanism", "causation versus correlation", "controls", "confounders", "uncertainty"],
    preferredMoves: ["trace a pathway", "design a control", "interpret data", "compare explanations", "predict an intervention"],
  }
  if (/law/.test(key)) return {
    family: "Law",
    interviewerA: "principle-and-rule analyst",
    interviewerB: "hard-case and fairness challenger",
    priorities: ["precise definitions", "rule application", "counterexamples", "competing principles", "fact sensitivity"],
    preferredMoves: ["apply the rule", "change one fact", "distinguish cases", "defend a principle", "handle an exception"],
  }
  if (/econom|ppe|politic|geograph|social|psycholog/.test(key)) return {
    family: "Economics, PPE & Social Sciences",
    interviewerA: "causal-mechanism analyst",
    interviewerB: "evidence-and-counterfactual challenger",
    priorities: ["causality", "incentives", "trade-offs", "counterfactuals", "evidence quality"],
    preferredMoves: ["identify a mechanism", "hold variables constant", "construct a counterfactual", "interpret data", "test a policy claim"],
  }
  return {
    family: "Humanities & Languages",
    interviewerA: "evidence-led interpretation developer",
    interviewerB: "alternative-reading and assumption challenger",
    priorities: ["close evidence", "definitions", "alternative interpretations", "context", "argument structure"],
    preferredMoves: ["analyse evidence", "qualify a claim", "defend an interpretation", "compare readings", "state what would change the argument"],
  }
}

export function panelInterviewer(candidateTurns: number, profile: CourseInterviewProfile) {
  const useA = candidateTurns % 2 === 0
  return {
    label: useA ? "Interviewer A" : "Interviewer B",
    role: useA ? profile.interviewerA : profile.interviewerB,
    colleague: useA ? profile.interviewerB : profile.interviewerA,
  }
}

export function recoverySignal(classifications: string[]) {
  let recoveries = 0
  let strongRecoveries = 0
  for (let i = 1; i < classifications.length; i += 1) {
    const before = classifications[i - 1]
    const after = classifications[i]
    if (["incorrect", "vague", "partial"].includes(before) && ["partial", "responsive"].includes(after)) recoveries += 1
    if (["incorrect", "vague"].includes(before) && after === "responsive") strongRecoveries += 1
  }
  const score = Math.min(20, 8 + recoveries * 3 + strongRecoveries * 3)
  return {
    recoveries,
    strongRecoveries,
    score,
    label: strongRecoveries >= 2 ? "Strong intellectual recovery" : recoveries >= 1 ? "Constructive recovery" : "Limited recovery evidence",
  }
}

export const interviewNextFiveFeatures = [
  "deep-follow-up-chains",
  "application-launch-questions",
  "two-interviewer-behaviour",
  "course-specific-engines",
  "intellectual-recovery-scoring",
] as const

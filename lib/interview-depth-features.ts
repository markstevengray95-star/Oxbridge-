export type ApplicationInterviewContext = {
  university?: string
  course?: string
  personalStatement?: string
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

export type RecoveryObservation = {
  classification?: string
  hintLevel?: 1 | 2 | 3 | 4 | number
}

export type DeepChainStage = "establish" | "probe" | "destabilise" | "transfer" | "synthesise"

function clean(value: unknown) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : ""
}

function academicClaimScore(sentence: string) {
  const lower = sentence.toLowerCase()
  let score = Math.min(5, Math.floor(sentence.length / 80))
  if (/because|therefore|however|although|whereas|suggest|argu|evidence|conclusion|assumption|limitation|model|theory|hypothesis|caus|mechanism|interpret/.test(lower)) score += 5
  if (/read|book|paper|article|lecture|project|research|experiment|essay|competition|study|investigat/.test(lower)) score += 3
  if (/i (think|found|argue|believe|concluded|questioned|disagreed|learnt|learned|noticed)/.test(lower)) score += 2
  return score
}

function selectAcademicExcerpt(value: string) {
  const cleaned = clean(value)
  if (!cleaned) return ""
  const sentences = cleaned
    .split(/(?<=[.!?])\s+/)
    .map(item => item.trim())
    .filter(item => item.length >= 35)
  const ranked = [...sentences].sort((a, b) => academicClaimScore(b) - academicClaimScore(a))
  const best = ranked[0] || cleaned
  const index = sentences.indexOf(best)
  const combined = index > 0 && sentences[index - 1]
    ? `${sentences[index - 1]} ${best}`
    : index >= 0 && sentences[index + 1]
      ? `${best} ${sentences[index + 1]}`
      : best
  return combined.slice(0, 520)
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
    ["personal statement", clean(context.personalStatement)],
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
  const excerpt = selectAcademicExcerpt(value)
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

function normaliseRecoveryObservations(input: Array<string | RecoveryObservation>) {
  return input.map(item => typeof item === "string"
    ? { classification: item, hintLevel: undefined }
    : { classification: item.classification || "", hintLevel: item.hintLevel })
}

export function recoverySignal(input: string[] | RecoveryObservation[]) {
  const observations = normaliseRecoveryObservations(input)
  let recoveries = 0
  let strongRecoveries = 0
  let independentRecoveries = 0
  let supportedRecoveries = 0
  let hintAdjustment = 0
  let highestHintLevel = 0

  for (const observation of observations) {
    const hint = Number(observation.hintLevel || 0)
    if (hint > highestHintLevel) highestHintLevel = hint
  }

  for (let i = 1; i < observations.length; i += 1) {
    const before = observations[i - 1].classification || ""
    const after = observations[i].classification || ""
    const hintLevel = Number(observations[i].hintLevel || 0)
    const recovered = ["incorrect", "vague", "partial"].includes(before) && ["partial", "responsive"].includes(after)
    const strong = ["incorrect", "vague"].includes(before) && after === "responsive"

    if (recovered) {
      recoveries += 1
      if (hintLevel > 0) supportedRecoveries += 1
      if (hintLevel === 0 || hintLevel === 1) independentRecoveries += 1
      if (hintLevel === 1) hintAdjustment += 2
      if (hintLevel === 2) hintAdjustment += 1
      if (hintLevel >= 4) hintAdjustment -= 1
    }
    if (strong) strongRecoveries += 1
  }

  const score = Math.max(0, Math.min(20, 8 + recoveries * 3 + strongRecoveries * 3 + hintAdjustment))
  const label = strongRecoveries >= 2
    ? "Strong intellectual recovery"
    : recoveries >= 1 && independentRecoveries >= 1
      ? "Constructive independent recovery"
      : recoveries >= 1
        ? "Constructive supported recovery"
        : "Limited recovery evidence"

  return {
    recoveries,
    strongRecoveries,
    independentRecoveries,
    supportedRecoveries,
    highestHintLevel,
    hintAdjustment,
    score,
    label,
  }
}

export const interviewNextFiveFeatures = [
  "deep-follow-up-chains",
  "application-launch-questions",
  "two-interviewer-behaviour",
  "course-specific-engines",
  "intellectual-recovery-scoring",
] as const

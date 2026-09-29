import {
  analysePersonalStatement,
  UCAS_SECTIONS,
  type StatementAnalysis,
  type StatementClaim,
  type TargetUniversity,
  type UcasAnswers,
  type UcasSectionKey,
} from "@/lib/application/personal-statement-analysis"

export type SupercurricularDepthItem = {
  id: string
  section: UcasSectionKey
  text: string
  activityType: "reading" | "research" | "project" | "lecture" | "competition" | "work experience" | "other"
  depthScore: number
  depthLabel: "listed" | "described" | "analysed" | "developed"
  signals: string[]
  nextMove: string
}

export type SoWhatItem = {
  id: string
  section: UcasSectionKey
  text: string
  status: "resolved" | "needs reflection" | "needs development"
  missing: string[]
  prompts: string[]
}

export type AcademicJourneyNode = {
  id: string
  section: UcasSectionKey
  stage: "topic" | "source" | "argument" | "investigation" | "project" | "question"
  label: string
  text: string
}

export type InterviewVulnerability = {
  id: string
  claimId: string
  section: UcasSectionKey
  claim: string
  risk: "high" | "medium" | "low"
  reason: string
  questions: string[]
}

export type PersonalStatementAnalysisV3 = StatementAnalysis & {
  course: string
  university: TargetUniversity
  supercurricular: SupercurricularDepthItem[]
  soWhat: SoWhatItem[]
  academicJourney: AcademicJourneyNode[]
  interviewVulnerabilities: InterviewVulnerability[]
}

type IndexedSentence = { id: string; section: UcasSectionKey; text: string }

const sentenceSplit = /(?<=[.!?])\s+|\n+/g
const activityPattern = /\b(read|reading|book|article|paper|lecture|podcast|course|project|competition|olympiad|research|experiment|investigat|essay|epq|work experience|placement|volunteer|shadow|built|coded|modelled|modeled|simulation)\b/i
const readingPattern = /\b(read|reading|book|article|paper)\b/i
const researchPattern = /\b(research|investigat|experiment|analysis|analysed|analyzed|data)\b/i
const projectPattern = /\b(project|built|coded|modelled|modeled|simulation|epq)\b/i
const lecturePattern = /\b(lecture|podcast|course|seminar|talk)\b/i
const competitionPattern = /\b(competition|olympiad|challenge)\b/i
const workPattern = /\b(work experience|placement|shadow|volunteer|clinical)\b/i
const thinkingPattern = /\b(think|argu|because|therefore|however|although|whereas|suggest|impli|assum|question|compare|contrast|evaluate|critic|limit|evidence|interpret|perspective|counter|convinc|reason|conclude|infer|challenge|surpris|disagree)\b/i
const developmentPattern = /\b(led me|prompted me|then|next|subsequently|further|followed this|developed|changed my|reconsider|investigat|explore further|made me question|raised the question|in turn|building on|as a result|followed unfamiliar)\b/i
const specificityPattern = /\b(because|however|whereas|result|finding|model|theory|argument|method|data|equation|assumption|limitation|calculation|evidence|paper|book|simulation|mechanism)\b/i
const argumentPattern = /\b(argument|argued|however|whereas|although|counter|disagree|unconvinc|perspective|limitation|assumption)\b/i
const questionPattern = /\b(question|unresolved|wonder|made me question|led me to ask|raised the question|why|how .* decide)\b/i
const investigationPattern = /\b(research|investigat|experiment|analysis|analysed|analyzed|data|compare|tested)\b/i
const absolutePattern = /\b(always|never|proves?|definitely|obviously|clearly|only explanation|certainly|must mean)\b/i
const vulnerabilityRiskOrder: Record<InterviewVulnerability["risk"], number> = { high: 0, medium: 1, low: 2 }

function splitSentences(text: string) {
  return text.split(sentenceSplit).map(item => item.trim()).filter(item => item.length >= 18)
}

function indexedSentences(answers: UcasAnswers): IndexedSentence[] {
  return UCAS_SECTIONS.flatMap(section => splitSentences(answers[section.key]).map((text, index) => ({ id: `${section.key}-${index}`, section: section.key, text })))
}

function activityType(text: string): SupercurricularDepthItem["activityType"] {
  if (workPattern.test(text)) return "work experience"
  if (competitionPattern.test(text)) return "competition"
  if (projectPattern.test(text)) return "project"
  if (lecturePattern.test(text)) return "lecture"
  if (researchPattern.test(text)) return "research"
  if (readingPattern.test(text)) return "reading"
  return "other"
}

function depthLabel(score: number): SupercurricularDepthItem["depthLabel"] {
  if (score >= 4) return "developed"
  if (score === 3) return "analysed"
  if (score === 2) return "described"
  return "listed"
}

function buildSupercurricular(items: IndexedSentence[]) {
  return items.filter(item => activityPattern.test(item.text)).slice(0, 18).map(item => {
    const hasThinking = thinkingPattern.test(item.text)
    const hasDevelopment = developmentPattern.test(item.text)
    const hasSpecificity = specificityPattern.test(item.text)
    const score = Math.min(4, 1 + Number(hasSpecificity) + Number(hasThinking) + Number(hasDevelopment))
    const signals = [
      hasSpecificity ? "specific detail" : "activity named",
      hasThinking ? "own analysis" : "analysis missing",
      hasDevelopment ? "next step shown" : "next step missing",
    ]
    const nextMove = !hasThinking
      ? "Move beyond describing the activity: state what surprised you, what you disagreed with, or which assumption you changed."
      : !hasDevelopment
        ? "Show what this thinking led you to read, test, compare or investigate next."
        : "Push one level deeper by naming the unresolved question, limitation or competing explanation you would now explore."
    return { id: item.id, section: item.section, text: item.text, activityType: activityType(item.text), depthScore: score, depthLabel: depthLabel(score), signals, nextMove }
  })
}

function buildSoWhat(supercurricular: SupercurricularDepthItem[]): SoWhatItem[] {
  return supercurricular.map(item => {
    const hasThinking = thinkingPattern.test(item.text)
    const hasDevelopment = developmentPattern.test(item.text)
    const missing: string[] = []
    if (!hasThinking) missing.push("your judgement")
    if (!hasDevelopment) missing.push("what happened next")
    const status: SoWhatItem["status"] = hasThinking && hasDevelopment ? "resolved" : hasThinking ? "needs development" : "needs reflection"
    const prompts = hasThinking && hasDevelopment
      ? [
          "What did you still find unconvincing or incomplete?",
          "What unresolved question would you pursue in a tutorial or interview?",
        ]
      : [
          !hasThinking ? "What surprised you, changed your mind, or made you disagree?" : "What new question followed from your conclusion?",
          !hasThinking ? "Which assumption did this experience make you reconsider?" : "What did you read, test or compare next?",
          "What is the strongest limitation or alternative interpretation?",
        ]
    return { id: `so-what-${item.id}`, section: item.section, text: item.text, status, missing, prompts }
  })
}

function journeyStage(text: string): AcademicJourneyNode["stage"] | null {
  if (questionPattern.test(text)) return "question"
  if (projectPattern.test(text)) return "project"
  if (argumentPattern.test(text)) return "argument"
  if (readingPattern.test(text) || lecturePattern.test(text)) return "source"
  if (investigationPattern.test(text)) return "investigation"
  if (thinkingPattern.test(text) || activityPattern.test(text)) return "topic"
  return null
}

function journeyLabel(stage: AcademicJourneyNode["stage"]) {
  return ({ topic: "Academic interest", source: "Source explored", argument: "Idea challenged", investigation: "Investigation", project: "Project / application", question: "Unresolved question" } as const)[stage]
}

function buildAcademicJourney(items: IndexedSentence[], claims: StatementClaim[]): AcademicJourneyNode[] {
  const nodes = items.flatMap(item => {
    const stage = journeyStage(item.text)
    return stage ? [{ id: `journey-${item.id}`, section: item.section, stage, label: journeyLabel(stage), text: item.text }] : []
  }).slice(0, 14)
  if (nodes.length) return nodes
  return claims.slice(0, 6).map((claim, index) => ({ id: `journey-claim-${index}`, section: claim.section, stage: "topic" as const, label: "Academic interest", text: claim.text }))
}

function quoteLead(text: string) {
  const clean = text.replace(/\s+/g, " ").trim()
  return clean.length > 150 ? `${clean.slice(0, 147)}…` : clean
}

function vulnerabilityQuestions(claim: StatementClaim) {
  const lead = quoteLead(claim.text)
  return [
    `You write, “${lead}” What exactly do you mean, and which part of that claim is doing the most work?`,
    claim.stages.evidence ? "Which piece of evidence is strongest here, and what evidence would make you revise the claim?" : "What concrete evidence supports this claim rather than just your assertion?",
    claim.stages.thinking ? "What is the strongest counterargument, alternative interpretation or limitation?" : "What did this evidence actually make you conclude, question or change your mind about?",
    claim.stages.development ? "Where would you take this idea next if an interviewer gave you five minutes to extend it?" : "What did this claim lead you to investigate, compare or read next?",
  ]
}

function buildInterviewVulnerabilities(claims: StatementClaim[]): InterviewVulnerability[] {
  return claims.map(claim => {
    const absolute = absolutePattern.test(claim.text)
    let risk: InterviewVulnerability["risk"] = claim.stageCount <= 2 ? "high" : claim.stageCount === 3 ? "medium" : "low"
    if (absolute) risk = "high"
    const missing = Object.entries(claim.stages).filter(([, present]) => !present).map(([stage]) => stage)
    const reason = absolute
      ? "The wording is unusually absolute, so an interviewer could test exceptions or counterexamples."
      : missing.length
        ? `The claim is missing ${missing.join(" and ")}, leaving an obvious route for challenge.`
        : "The chain is well developed, so the likely challenge is to test its assumptions, limits and transfer to a new context."
    return { id: `vulnerability-${claim.id}`, claimId: claim.id, section: claim.section, claim: claim.text, risk, reason, questions: vulnerabilityQuestions(claim) }
  }).sort((a, b) => vulnerabilityRiskOrder[a.risk] - vulnerabilityRiskOrder[b.risk]).slice(0, 18)
}

export function analysePersonalStatementV3(input: { answers: UcasAnswers; course: string; university: TargetUniversity }): PersonalStatementAnalysisV3 {
  const base = analysePersonalStatement(input)
  const items = indexedSentences(input.answers)
  const supercurricular = buildSupercurricular(items)
  const soWhat = buildSoWhat(supercurricular)
  const academicJourney = buildAcademicJourney(items, base.claims)
  const interviewVulnerabilities = buildInterviewVulnerabilities(base.claims)

  const actions = [...base.actions]
  const shallow = supercurricular.filter(item => item.depthScore <= 2).length
  const unresolvedSoWhat = soWhat.filter(item => item.status !== "resolved").length
  const highRisk = interviewVulnerabilities.filter(item => item.risk === "high").length
  if (shallow) actions.push(`Deepen ${shallow} supercurricular example${shallow === 1 ? "" : "s"}: analysis and intellectual development matter more than the number of activities listed.`)
  if (unresolvedSoWhat) actions.push(`Resolve the “so what?” in ${unresolvedSoWhat} example${unresolvedSoWhat === 1 ? "" : "s"} by showing what changed in your thinking or what you investigated next.`)
  if (highRisk) actions.push(`Rehearse ${highRisk} high-vulnerability claim${highRisk === 1 ? "" : "s"} before interview so you can define, evidence, qualify and extend them under challenge.`)

  return {
    ...base,
    course: input.course,
    university: input.university,
    supercurricular,
    soWhat,
    academicJourney,
    interviewVulnerabilities,
    actions: actions.slice(0, 9),
  }
}

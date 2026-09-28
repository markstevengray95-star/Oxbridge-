import type { InterviewAnswerClassification } from "@/lib/interview-answer-quality"
import type { InterviewTreeNodeId } from "@/lib/interview-question-tree"

export type InterviewMetaTurn = {
  role: "interviewer" | "candidate"
  text: string
  quality?: InterviewAnswerClassification
  branchId?: InterviewTreeNodeId
}

export type RecoveryEvent = {
  index: number
  kind: "independent" | "supported" | "transfer-after-correction"
  from: InterviewAnswerClassification
  to: InterviewAnswerClassification
  supportDepth: number
  evidence: string
}

export type InterventionEffect = {
  branch: InterviewTreeNodeId
  before?: InterviewAnswerClassification
  after?: InterviewAnswerClassification
  improved: boolean
  retained: boolean
}

export type WorkingAnalysis = {
  score: number
  variables: boolean
  assumptions: boolean
  representation: boolean
  unitsOrDimensions: boolean
  limitingCase: boolean
  validation: boolean
  interpretation: boolean
  evidence: string[]
  nextActions: string[]
}

function rank(value?: InterviewAnswerClassification) {
  if (value === "responsive") return 4
  if (value === "partial") return 3
  if (value === "vague") return 2
  if (value === "incorrect") return 1
  if (value === "irrelevant") return 0
  return -1
}

function candidateTurns(turns: InterviewMetaTurn[]) {
  return turns.map((turn, index) => ({ turn, index })).filter(item => item.turn.role === "candidate")
}

export function analyseRecoveryV2(turns: InterviewMetaTurn[]) {
  const candidates = candidateTurns(turns)
  const recoveries: RecoveryEvent[] = []
  let repairInterventionsSinceWeak = 0
  let lastWeak: { quality: InterviewAnswerClassification; index: number } | null = null

  for (let i = 0; i < turns.length; i += 1) {
    const turn = turns[i]
    if (turn.role === "interviewer") {
      if (lastWeak && turn.branchId?.startsWith("repair-")) repairInterventionsSinceWeak += 1
      continue
    }
    const quality = turn.quality
    if (!quality) continue
    if (rank(quality) <= 2 || quality === "partial") {
      if (!lastWeak || rank(quality) <= rank(lastWeak.quality)) {
        lastWeak = { quality, index: i }
        repairInterventionsSinceWeak = 0
      }
      continue
    }
    if (lastWeak && rank(quality) > rank(lastWeak.quality)) {
      const supportDepth = repairInterventionsSinceWeak
      const kind: RecoveryEvent["kind"] = supportDepth === 0 ? "independent" : "supported"
      recoveries.push({ index: i, kind, from: lastWeak.quality, to: quality, supportDepth, evidence: turn.text.slice(0, 220) })
      lastWeak = null
      repairInterventionsSinceWeak = 0
    }
  }

  const recoveredIndexes = new Set(recoveries.map(item => item.index))
  for (const recovery of [...recoveries]) {
    const nextCandidate = candidates.find(item => item.index > recovery.index)
    if (!nextCandidate?.turn.quality || rank(nextCandidate.turn.quality) < 4) continue
    const interveningTransfer = turns.slice(recovery.index + 1, nextCandidate.index).some(turn => turn.role === "interviewer" && ["generalise", "transfer-context", "reverse-problem", "synthesis"].includes(turn.branchId || ""))
    if (interveningTransfer && !recoveredIndexes.has(nextCandidate.index)) {
      recoveries.push({ index: nextCandidate.index, kind: "transfer-after-correction", from: recovery.to, to: nextCandidate.turn.quality, supportDepth: 0, evidence: nextCandidate.turn.text.slice(0, 220) })
      recoveredIndexes.add(nextCandidate.index)
    }
  }

  const independent = recoveries.filter(item => item.kind === "independent").length
  const supported = recoveries.filter(item => item.kind === "supported").length
  const transferAfterCorrection = recoveries.filter(item => item.kind === "transfer-after-correction").length
  const score = Math.min(20, independent * 6 + supported * 4 + transferAfterCorrection * 7)
  return {
    score,
    independent,
    supported,
    transferAfterCorrection,
    events: recoveries.sort((a, b) => a.index - b.index),
    label: transferAfterCorrection ? "Correction transferred" : independent ? "Independent recovery" : supported ? "Supported recovery" : "No clear recovery evidence yet",
  }
}

export function analyseInterventionEffectiveness(turns: InterviewMetaTurn[]): InterventionEffect[] {
  const effects: InterventionEffect[] = []
  for (let index = 0; index < turns.length; index += 1) {
    const turn = turns[index]
    if (turn.role !== "interviewer" || !turn.branchId) continue
    const before = [...turns.slice(0, index)].reverse().find(item => item.role === "candidate" && item.quality)?.quality
    const afterIndex = turns.findIndex((item, itemIndex) => itemIndex > index && item.role === "candidate" && item.quality)
    const after = afterIndex >= 0 ? turns[afterIndex].quality : undefined
    const nextAfter = afterIndex >= 0 ? turns.slice(afterIndex + 1).find(item => item.role === "candidate" && item.quality)?.quality : undefined
    effects.push({
      branch: turn.branchId,
      before,
      after,
      improved: rank(after) > rank(before),
      retained: after ? rank(nextAfter) >= rank(after) || rank(after) >= 4 : false,
    })
  }
  return effects
}

export function analyseInterviewWorking(text: string): WorkingAnalysis {
  const value = text.trim()
  const variables = /\b(?:let|define|denote|where|x|y|v|u|a|t|m|f|r|p|q)\s*(?:=|is|represent)/i.test(value) || /\bvariable/i.test(value)
  const assumptions = /\b(?:assum|suppose|given|provided|holding|constant|ignore|neglect|ideal)/i.test(value)
  const representation = /\b(?:diagram|graph|sketch|equation|table|free-body|ray diagram|causal chain|argument map)/i.test(value) || /[=<>≤≥√π²³×÷+−*/]/.test(value)
  const unitsOrDimensions = /\b(?:units?|dimension|m\/s|kg|newton|joule|watt|volt|amp|ohm|pascal|hz|mol)\b/i.test(value)
  const limitingCase = /\b(?:limit|boundary|extreme|edge case|as .* tends to|very large|very small|zero|infinite)/i.test(value)
  const validation = /\b(?:check|verify|substitute back|estimate|reasonable|sanity|counterexample|test|compare with)/i.test(value)
  const interpretation = /\b(?:therefore|hence|this means|physically|in context|so the result|this implies|interpret)/i.test(value)
  const flags = [variables, assumptions, representation, unitsOrDimensions, limitingCase, validation, interpretation]
  const score = Math.round(flags.filter(Boolean).length / flags.length * 100)
  const evidence: string[] = []
  const nextActions: string[] = []
  if (variables) evidence.push("Variables or quantities were defined explicitly.")
  else nextActions.push("Define the quantities or objects before manipulating them.")
  if (assumptions) evidence.push("Assumptions or modelling conditions were surfaced.")
  else nextActions.push("State at least one assumption that the method depends on.")
  if (representation) evidence.push("A representation such as an equation, graph, diagram or structured map was used.")
  else nextActions.push("Choose a representation that makes the structure visible.")
  if (unitsOrDimensions) evidence.push("Units or dimensional consistency were considered.")
  else nextActions.push("For quantitative science, use units or dimensional checks when they can falsify a step.")
  if (limitingCase) evidence.push("A boundary or limiting case was considered.")
  else nextActions.push("Test an edge or limiting case before trusting the general conclusion.")
  if (validation) evidence.push("The result was checked independently.")
  else nextActions.push("Add a validation step: substitute back, estimate, compare, or seek a counterexample.")
  if (interpretation) evidence.push("The working was interpreted rather than left as bare manipulation.")
  else nextActions.push("Explain what the result means in the original problem.")
  return { score, variables, assumptions, representation, unitsOrDimensions, limitingCase, validation, interpretation, evidence, nextActions: nextActions.slice(0, 4) }
}

export function buildInterviewMetaReport(turns: InterviewMetaTurn[], workingText = "") {
  const recovery = analyseRecoveryV2(turns)
  const interventions = analyseInterventionEffectiveness(turns)
  const working = analyseInterviewWorking(`${workingText}\n${turns.filter(item => item.role === "candidate").map(item => item.text).join("\n")}`)
  const usefulInterventions = interventions.filter(item => item.improved).length
  const retainedInterventions = interventions.filter(item => item.retained).length
  return {
    recovery,
    working,
    interventions,
    interventionSummary: {
      total: interventions.length,
      useful: usefulInterventions,
      retained: retainedInterventions,
      effectiveness: interventions.length ? Math.round(usefulInterventions / interventions.length * 100) : 0,
    },
  }
}

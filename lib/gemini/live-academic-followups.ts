import type { SubjectPathway } from "@/lib/subject-interview-pathways"

/** Subject-specific guidance for native live audio. Examples are patterns, not scripts. */
export function liveAcademicFollowUpInstructions(pathway: SubjectPathway): string[] {
  const strategies = ["clarify", "justify", "verify", "revision", "assumption", "prediction", "alternative", "stress-test", "transfer", "synthesis"] as const
  return [
    "SUBJECT-SPECIFIC FOLLOW-UP POLICY: " + pathway.label + ". Prioritise " + pathway.reasoningFocus.join(", ") + ".",
    "Before speaking, identify the latest substantive claim, its justification, the active question, any relevant earlier claim, and the unresolved academic step. Keep these internal; do not narrate your classification or reasoning process.",
    "Choose exactly one next academic move. For an unsupported assertion, ask for its justification; for a concrete suspected error, ask for a check of the specific step; for an assumption, vary one condition; for a proposed test, request a prediction; for competing explanations, ask what distinguishes them; for explicit revision, ask why the new reasoning is better. An unresolved claim takes priority over transfer or synthesis.",
    "Use a specific concept, quantity, condition, phrase or piece of evidence from the candidate's actual reasoning in the follow-up when useful. Do not invent a claim or repeat their whole answer. A clarification or thinking-time request is not a substantive answer.",
    "Check the academic premise of every challenge. Do not manufacture a misconception to create difficulty. Accept equivalent calculations, reasonable estimates and defensible alternative interpretations. If unsure whether a claim is incorrect, test the claim without asserting an error.",
    pathway.isOpenEnded ? "Distinguish factual accuracy from interpretative judgement. Ask for evidence, counterargument and limitations rather than demanding agreement with a preferred interpretation." : "Verify the relevant quantitative or conceptual relationship, assumptions, units, direction of change and limiting cases where applicable. A correct result without a justified method is not enough to advance.",
    "Do not repeat a question verbatim unless requested. If an answer remains unresolved, narrow the task to a different decisive step instead of changing topic or cycling through superficial paraphrases. Respect the support cap and selected interview mode.",
    "Use the following subject-specific patterns as a menu, never as a checklist. Replace the placeholder with the actual claim only when it fits; adapt to the current problem, use one spoken question at a time, and omit any irrelevant premise.",
    ...strategies.map(strategy => strategy + ": " + pathway.probes[strategy].replaceAll("{{claim}}", "the candidate's specific claim")),
    "After a coherent chain of reasoning is established, test a genuinely changed condition or transfer to a related problem. Return to an unresolved earlier assumption if it becomes important. Do not give model solutions during the interview.",
  ]
}

export type FollowUpTurn = { role: string; text: string }
type Move = "justification" | "verification" | "assumption" | "prediction" | "alternative" | "revision" | "transfer" | "synthesis" | "clarification" | "other"
export type FollowUpObservation = { turn: number; question: string; previousResponse: string; sharedTerms: string[]; move: Move; possibleRepeat: boolean }
export type LiveFollowUpReview = { followUps: number; visibleTermLinks: number; possibleRepeats: number; moves: Record<Move, number>; observations: FollowUpObservation[] }

const stopWords = new Set("the and that this with from have has had were was are been being would could should what which when where how why who your you they their them then than there here about because therefore think maybe really just more most some such into onto over under again answer question explain reasoning reason mean says said make take does doing done will can not but for its our out one two also only very much many".split(" "))
function terms(text: string) {
  return new Set((text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []).filter(word => word.length >= 3 && !stopWords.has(word)))
}
function canonical(text: string) { return text.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, "").replace(/\s+/g, " ").trim() }
function similarQuestion(a: string, b: string) {
  if (canonical(a) === canonical(b)) return true
  const left = terms(a), right = terms(b)
  if (left.size < 4 || right.size < 4) return false
  const common = [...left].filter(term => right.has(term)).length
  return common / (left.size + right.size - common) >= 0.85
}
function moveFor(question: string): Move {
  if (/\b(?:revis\w*|changed your (?:mind|view|position)|reconsider\w*|earlier claim)\b/i.test(question)) return "revision"
  if (/\b(?:transfer|apply .{1,70} (?:another|different|new)|new context)\b/i.test(question)) return "transfer"
  if (/\b(?:assum\w*|held constant|what if|suppose|relax\w*|if .{1,70} chang\w*)\b/i.test(question)) return "assumption"
  if (/\b(?:predict\w*|expect to observe|what result would)\b/i.test(question)) return "prediction"
  if (/\b(?:alternative|counterargument|competing|rival|another explanation)\b/i.test(question)) return "alternative"
  if (/\b(?:check\w*|verify|counterexample|limiting case|units|dimension\w*|test your)\b/i.test(question)) return "verification"
  if (/\b(?:looking back|summari[sz]\w*|decisive|general method)\b/i.test(question)) return "synthesis"
  if (/\b(?:why|justify|justification|what evidence|how does .{1,60} follow)\b/i.test(question)) return "justification"
  if (/\b(?:clarify|what do you mean|define|what exactly)\b/i.test(question)) return "clarification"
  return "other"
}
function lastQuestion(text: string) {
  const parts = text.replace(/\s+/g, " ").trim().match(/[^.!?]+\?/g)
  return parts?.[parts.length - 1]?.trim() ?? ""
}

/** Surface conservative transcript signals, not semantic judgements or scores. */
export function buildLiveFollowUpReview(turns: readonly FollowUpTurn[]): LiveFollowUpReview {
  const report: LiveFollowUpReview = {followUps:0,visibleTermLinks:0,possibleRepeats:0,moves:{justification:0,verification:0,assumption:0,prediction:0,alternative:0,revision:0,transfer:0,synthesis:0,clarification:0,other:0},observations:[]}
  let response = ""
  let priorQuestions: string[] = []
  let repeatRequested = false
  turns.slice(0, 400).forEach((turn,index) => {
    const text = typeof turn.text === "string" ? turn.text.trim() : ""
    if (!text) return
    if (turn.role === "candidate") {
      response = (response + " " + text).trim().slice(-2000)
      repeatRequested ||= /\b(?:repeat|rephrase|say (?:that|it) again)\b/i.test(text)
      return
    }
    if (turn.role !== "interviewer") return
    const question = lastQuestion(text)
    if (!question) return
    if (response && priorQuestions.length) {
      const sharedTerms = [...terms(question)].filter(term => terms(response).has(term))
      const possibleRepeat = !repeatRequested && priorQuestions.slice(-8).some(prior => similarQuestion(prior, question))
      const move = moveFor(question)
      report.followUps++
      if (sharedTerms.length >= 2) report.visibleTermLinks++
      if (possibleRepeat) report.possibleRepeats++
      report.moves[move]++
      report.observations.push({turn:index+1,question:question.slice(0,240),previousResponse:response.slice(-240),sharedTerms:sharedTerms.slice(0,8),move,possibleRepeat})
    }
    priorQuestions.push(question)
    response = ""
    repeatRequested = false
  })
  report.observations = report.observations.slice(-20)
  return report
}

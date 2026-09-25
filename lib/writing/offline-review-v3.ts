import {
  analyseOfflineTopicAlignment,
  buildOfflineWritingReport as buildV2OfflineWritingReport,
  type OfflineReviewInput,
} from "./offline-review-v2"
import type { WritingReport } from "./review"

export type { OfflineReviewInput } from "./offline-review-v2"

export type EssayTaskType = "policy" | "compare" | "extent" | "causal" | "explain" | "definition" | "general"

export type EssayTaskAnalysis = {
  type: EssayTaskType
  label: string
  taskSatisfied: boolean
  signals: number
  bodyTopicCoverage: number
  introTopicCoverage: number
  conclusionTopicCoverage: number
  promptEchoRisk: boolean
  potentialDriftParagraphs: number[]
  reason: string
}

function paragraphs(text: string) {
  return text.split(/\r?\n\s*\r?\n/).map(value => value.trim()).filter(Boolean)
}

function detectTaskType(prompt: string): EssayTaskType {
  if (/\b(to what extent|how far|how significant|how important)\b/i.test(prompt)) return "extent"
  if (/\b(compare|contrast|compared with|versus|vs\.?|better than|more important than|less important than|similarities|differences)\b/i.test(prompt)) return "compare"
  if (/\b(why|cause|causes|caused|what caused|lead to|led to|result(?:ed)? in|responsible for)\b/i.test(prompt)) return "causal"
  if (/\b(explain|how does|how do|how did|what explains)\b/i.test(prompt)) return "explain"
  if (/\b(define|what is|what does .+ mean|meaning of)\b/i.test(prompt)) return "definition"
  if (/\b(should|ought|must|allow|permit|ban|prohibit|forbid|compulsory|mandatory|legal|legally|illegal|liable|responsible|regulate|abolish|tax|free to use)\b/i.test(prompt)) return "policy"
  return "general"
}

function countMatches(text: string, pattern: RegExp) {
  const flags = pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`
  return [...text.matchAll(new RegExp(pattern.source, flags))].length
}

function taskSignals(type: EssayTaskType, essay: string) {
  switch (type) {
    case "compare":
      return countMatches(essay, /\b(whereas|while|by contrast|in contrast|compared with|compared to|both|similarly|similar|difference|different|more than|less than|rather than|relative to)\b/gi)
    case "extent":
      return countMatches(essay, /\b(to (?:a|some|large|great|limited) extent|partly|partially|largely|mostly|primarily|significant|significantly|limited|depends|however|although|nevertheless|on balance|more important|less important)\b/gi)
    case "causal":
    case "explain":
      return countMatches(essay, /\b(because|therefore|thus|hence|due to|owing to|as a result|results? in|resulted in|leads? to|led to|causes?|caused|mechanism|consequence|which meant|which means|so that)\b/gi)
    case "definition":
      return countMatches(essay, /\b(means|defined as|definition|refers to|can be understood as|by .+ i mean|in this context)\b/gi)
    case "policy":
      return countMatches(essay, /\b(i (?:argue|believe|consider)|on balance|overall|ultimately|therefore|should|should not|ought|must|must not|justified|not justified|better policy|worse policy)\b/gi)
    default:
      return countMatches(essay, /\b(because|therefore|however|although|for example|on balance|overall|ultimately)\b/gi)
  }
}

function minimumSignals(type: EssayTaskType) {
  if (type === "compare") return 2
  if (type === "extent") return 2
  if (type === "causal" || type === "explain") return 2
  if (type === "definition") return 1
  if (type === "policy") return 1
  return 0
}

function taskLabel(type: EssayTaskType) {
  switch (type) {
    case "compare": return "comparison"
    case "extent": return "degree/extent evaluation"
    case "causal": return "causal explanation"
    case "explain": return "explanation"
    case "definition": return "definition/conceptual clarification"
    case "policy": return "policy/judgement"
    default: return "general argument"
  }
}

function judgementPolarity(text: string) {
  const negative = countMatches(text, /\b(should not|must not|ought not|not justified|unjustified|disagree|oppose|reject|against)\b/gi)
  const positive = countMatches(text, /\b(should|must|ought|is justified|agree|support|in favour|in favor)\b/gi)
  if (negative && !positive) return -1
  if (positive && !negative) return 1
  return 0
}

export function analyseOfflineEssayTask(prompt: string, essay: string): EssayTaskAnalysis {
  const type = detectTaskType(prompt)
  const parts = paragraphs(essay)
  const intro = parts[0] ?? ""
  const conclusion = parts.length > 1 ? parts[parts.length - 1] : intro
  const bodyParts = parts.length > 2 ? parts.slice(1, -1) : parts.slice(1)
  const body = bodyParts.join("\n\n")

  const wholeAlignment = analyseOfflineTopicAlignment(prompt, essay)
  const introAlignment = intro ? analyseOfflineTopicAlignment(prompt, intro) : null
  const bodyAlignment = body ? analyseOfflineTopicAlignment(prompt, body) : null
  const conclusionAlignment = conclusion ? analyseOfflineTopicAlignment(prompt, conclusion) : null

  const introTopicCoverage = introAlignment?.overallCoverage ?? 0
  const bodyTopicCoverage = bodyAlignment?.overallCoverage ?? (parts.length <= 1 ? wholeAlignment.overallCoverage : 0)
  const conclusionTopicCoverage = conclusionAlignment?.overallCoverage ?? 0
  const promptEchoRisk = parts.length >= 2 && introTopicCoverage >= .72 && bodyTopicCoverage < .45

  const potentialDriftParagraphs = parts
    .map((part, index) => ({ index, result: analyseOfflineTopicAlignment(prompt, part) }))
    .filter(({ index, result }) => index > 0 && index < parts.length - 1 && result.overallCoverage < .34 && result.matched.length < Math.min(2, Math.max(1, wholeAlignment.concepts.length)))
    .map(({ index }) => index)

  const signals = taskSignals(type, essay)
  const enoughSignals = signals >= minimumSignals(type)
  const enoughBodyFocus = parts.length <= 2 ? wholeAlignment.overallCoverage >= .45 : bodyTopicCoverage >= .45
  const missingHinge = wholeAlignment.missingHinges.length > 0
  const policyComplete = type !== "policy" || (wholeAlignment.hasJudgement && !missingHinge)
  const compareComplete = type !== "compare" || enoughSignals
  const extentComplete = type !== "extent" || enoughSignals
  const explanationComplete = !(type === "causal" || type === "explain") || enoughSignals
  const definitionComplete = type !== "definition" || enoughSignals

  const introPolarity = judgementPolarity(intro)
  const conclusionPolarity = judgementPolarity(conclusion)
  const contradictsOwnThesis = introPolarity !== 0 && conclusionPolarity !== 0 && introPolarity !== conclusionPolarity

  const taskSatisfied = enoughBodyFocus && !promptEchoRisk && policyComplete && compareComplete && extentComplete && explanationComplete && definitionComplete && !contradictsOwnThesis

  const reasons: string[] = []
  if (promptEchoRisk) reasons.push("the introduction closely echoes the prompt but the body does not sustain the same topic coverage")
  if (!enoughBodyFocus) reasons.push("the body does not maintain enough of the question's core concepts")
  if (type === "policy" && !wholeAlignment.hasJudgement) reasons.push("the task asks for a judgement but no clear overall judgement is visible")
  if (type === "policy" && missingHinge) reasons.push(`the decision hinge is incomplete (${wholeAlignment.missingHinges.join(", ")})`)
  if (type === "compare" && !enoughSignals) reasons.push("the essay discusses material but does not visibly compare the alternatives")
  if (type === "extent" && !enoughSignals) reasons.push("the essay does not sufficiently weigh degree, limits or competing importance")
  if ((type === "causal" || type === "explain") && !enoughSignals) reasons.push("the essay names material without enough explicit cause/mechanism links")
  if (type === "definition" && !enoughSignals) reasons.push("the key concept is used without being clearly defined or clarified")
  if (contradictsOwnThesis) reasons.push("the conclusion appears to reverse the explicit judgement in the introduction without explaining the change")
  if (!reasons.length) reasons.push(`the essay shows the expected ${taskLabel(type)} moves and sustains the question through the body`)

  return {
    type,
    label: taskLabel(type),
    taskSatisfied,
    signals,
    bodyTopicCoverage,
    introTopicCoverage,
    conclusionTopicCoverage,
    promptEchoRisk,
    potentialDriftParagraphs,
    reason: reasons.join("; "),
  }
}

function quoteFromParagraph(text: string) {
  const sentence = text.split(/(?<=[.!?])\s+/).map(value => value.trim()).find(Boolean) ?? text.trim()
  return sentence.slice(0, 800)
}

function applyTaskAwareReview(report: WritingReport, input: OfflineReviewInput): WritingReport {
  const prompt = input.prompt?.trim() ?? ""
  if (!prompt || input.mode !== "essay") return report

  const task = analyseOfflineEssayTask(prompt, input.essay)
  const alignment = analyseOfflineTopicAlignment(prompt, input.essay)
  const criterion = report.criteria[0]
  const parts = paragraphs(input.essay)

  let cap: number | null = null
  if (task.promptEchoRisk) cap = 1
  else if (!task.taskSatisfied) cap = 2
  if (task.potentialDriftParagraphs.length >= Math.max(2, Math.ceil(Math.max(1, parts.length - 2) / 2))) cap = Math.min(cap ?? 4, 2)
  if (cap !== null && criterion.level !== null) criterion.level = Math.min(criterion.level, cap)

  const driftText = task.potentialDriftParagraphs.length
    ? ` Potential topic drift is visible in paragraph${task.potentialDriftParagraphs.length === 1 ? "" : "s"} ${task.potentialDriftParagraphs.map(index => index + 1).join(", ")}.`
    : ""
  const echoText = task.promptEchoRisk
    ? " The opening has high prompt-word coverage, but that coverage collapses in the body; repeating or paraphrasing the question in the introduction is not being counted as sustained relevance."
    : ""
  const taskText = task.taskSatisfied
    ? ` The draft performs the expected ${task.label} task with ${task.signals} visible task-specific signal${task.signals === 1 ? "" : "s"}.`
    : ` The draft does not yet fully perform the expected ${task.label} task: ${task.reason}.`

  criterion.judgement = `${criterion.judgement}${taskText}${echoText}${driftText}`
  if (!task.taskSatisfied || task.promptEchoRisk) {
    criterion.action = `First fix task completion, not wording. This is a ${task.label} question. ${criterion.action}`
  }

  if (task.potentialDriftParagraphs.length) {
    for (const index of task.potentialDriftParagraphs.slice(0, 3)) {
      const paragraph = parts[index]
      const row = report.paragraphs.find(item => item.index === index)
      if (row && paragraph) {
        row.limitation = `${row.limitation} Relevance warning: this paragraph has weak explicit connection to the supplied question and may be drifting into the wider topic.`
        row.action = `${row.action} Add a sentence that states exactly how this paragraph changes, supports or qualifies the answer to the supplied question; if it cannot, cut or replace it.`
      }
    }
  }

  const relevanceAnnotations = task.potentialDriftParagraphs.slice(0, 2).flatMap(index => {
    const paragraph = parts[index]
    if (!paragraph) return []
    return [{
      evidence: { paragraph: index, quote: quoteFromParagraph(paragraph) },
      kind: "relevance" as const,
      explanation: "This paragraph has weak direct coverage of the question's distinctive concepts. That does not prove it is irrelevant, but the link is too implicit for a deterministic offline checker to verify.",
      revision: "Make the relevance explicit in the paragraph's claim or final sentence. If the point would work just as well for a different essay question on the same broad subject, it is probably too generic.",
    }]
  })
  if (relevanceAnnotations.length) {
    const existing = new Set(report.annotations.map(annotation => `${annotation.evidence.paragraph}:${annotation.evidence.quote}`))
    report.annotations = [...relevanceAnnotations.filter(annotation => !existing.has(`${annotation.evidence.paragraph}:${annotation.evidence.quote}`)), ...report.annotations].slice(0, 18)
  }

  if (!task.taskSatisfied || task.promptEchoRisk) {
    const evidenceParagraph = alignment.bestParagraph ?? 0
    const evidenceText = parts[evidenceParagraph] ?? parts[0] ?? ""
    const priority = {
      title: "Complete the exact task",
      evidence: evidenceText ? { paragraph: evidenceParagraph, quote: quoteFromParagraph(evidenceText) } : { paragraph: null, quote: "" },
      why: `The prompt is a ${task.label} task, but ${task.reason}.`,
      action: `Revise the controlling thesis and body so they perform the ${task.label} task explicitly, rather than merely discussing the broad subject matter.`,
      successCheck: `A reader can state not only the essay's topic but the exact intellectual job it performs: ${task.label}. The body—not just the introduction—contains the reasoning needed for that task.`,
    }
    report.priorities = [priority, ...report.priorities.filter(item => item.title !== priority.title)].slice(0, 4)

    const questionEvidence = priority.evidence
    if (questionEvidence.paragraph !== null) {
      report.questions = [{
        evidence: questionEvidence,
        question: `What does this passage do that is specific to a ${task.label} question, rather than to any essay on the same broad topic?`,
        purpose: "Test whether the draft is completing the exact task rather than relying on topical vocabulary.",
      }, ...report.questions].slice(0, 5)
    }
  }

  const bodyPercent = Math.round(task.bodyTopicCoverage * 100)
  report.summary = `${report.summary} Task check: ${task.taskSatisfied ? "the expected" : "the expected task is not yet fully achieved for this"} ${task.label} question; body topic coverage is ${bodyPercent}%.`
  report.limitations = [
    "The offline engine now separates topic match from task completion, checks whether prompt coverage survives beyond the introduction, and flags potential paragraph drift. It remains a deterministic language-pattern checker and can under-credit sophisticated implicit links or unusual terminology.",
    ...report.limitations.filter(item => !/prompt coverage survives|task completion/i.test(item)),
  ].slice(0, 5)

  return report
}

export function buildOfflineWritingReport(input: OfflineReviewInput): WritingReport {
  return applyTaskAwareReview(buildV2OfflineWritingReport(input), input)
}

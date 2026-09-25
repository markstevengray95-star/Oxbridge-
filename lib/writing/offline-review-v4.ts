import {
  analyseOfflineEssayTask,
  buildOfflineWritingReport as buildV3OfflineWritingReport,
  type OfflineReviewInput,
} from "./offline-review-v3"
import { attachStrictEssayScoring } from "./strict-score"
import type { WritingReport } from "./review"

export { analyseOfflineEssayTask, type EssayTaskAnalysis, type EssayTaskType } from "./offline-review-v3"
export type { OfflineReviewInput } from "./offline-review-v3"

function splitParagraphs(text: string) {
  return text.split(/\r?\n\s*\r?\n/).map(value => value.trim()).filter(Boolean)
}

function firstQuote(text: string) {
  const sentence = text.split(/(?<=[.!?])\s+/).map(value => value.trim()).find(Boolean) ?? text.trim()
  return sentence.slice(0, 800)
}

function prioritizeRelevanceAnnotations(report: WritingReport, input: OfflineReviewInput): WritingReport {
  if (input.mode !== "essay" || !input.prompt?.trim()) return report

  const task = analyseOfflineEssayTask(input.prompt, input.essay)
  if (!task.potentialDriftParagraphs.length) return report

  const paragraphs = splitParagraphs(input.essay)
  const relevance = task.potentialDriftParagraphs.slice(0, 2).flatMap(index => {
    const paragraph = paragraphs[index]
    if (!paragraph) return []
    return [{
      evidence: { paragraph: index, quote: firstQuote(paragraph) },
      kind: "relevance" as const,
      explanation: "This paragraph has weak direct coverage of the question's distinctive concepts. That does not prove it is irrelevant, but the link is too implicit for a deterministic offline checker to verify.",
      revision: "Make the relevance explicit in the paragraph's claim or final sentence. If the point would work just as well for a different essay question on the same broad subject, it is probably too generic.",
    }]
  })

  const priorityKeys = new Set(relevance.map(annotation => `${annotation.evidence.paragraph}:${annotation.evidence.quote}`))
  report.annotations = [
    ...relevance,
    ...report.annotations.filter(annotation => !priorityKeys.has(`${annotation.evidence.paragraph}:${annotation.evidence.quote}`)),
  ].slice(0, 18)

  return report
}

export function buildOfflineWritingReport(input: OfflineReviewInput): WritingReport {
  const report = prioritizeRelevanceAnnotations(buildV3OfflineWritingReport(input), input)
  if (input.mode === "essay" && input.prompt?.trim()) return attachStrictEssayScoring(report, input.prompt, input.essay).report
  return report
}

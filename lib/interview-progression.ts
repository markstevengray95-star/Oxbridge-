export type InterviewDifficulty = "Foundation" | "Stretch" | "Challenge"

export type InterviewProgression = {
  recommendedDifficulty: InterviewDifficulty
  reason: string
  recentAverage: number | null
  consistency: number | null
  shouldIncrease: boolean
  shouldReduce: boolean
}

function mean(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0
}

function spread(values: number[]) {
  if (values.length < 2) return 0
  const average = mean(values)
  return Math.sqrt(mean(values.map(value => (value - average) ** 2)))
}

export function recommendInterviewDifficulty(scores: number[]): InterviewProgression {
  const recent = scores.filter(Number.isFinite).slice(-5)
  if (!recent.length) return { recommendedDifficulty: "Stretch", reason: "No prior interview evidence yet; start at Stretch to expose both strengths and weaknesses.", recentAverage: null, consistency: null, shouldIncrease: false, shouldReduce: false }
  const recentAverage = Math.round(mean(recent))
  const consistency = Math.round(spread(recent))
  const strongRecent = recent.length >= 3 && recent.slice(-3).every(score => score >= 78)
  const weakRecent = recent.length >= 2 && recent.slice(-2).every(score => score < 58)
  if (strongRecent && recentAverage >= 80 && consistency <= 14) return { recommendedDifficulty: "Challenge", reason: "Recent interviews are consistently strong enough to justify less familiar and more demanding starting problems.", recentAverage, consistency, shouldIncrease: true, shouldReduce: false }
  if (weakRecent || recentAverage < 55) return { recommendedDifficulty: "Foundation", reason: "Recent evidence suggests the session should begin with a cleaner problem so the app can separate conceptual gaps from overload.", recentAverage, consistency, shouldIncrease: false, shouldReduce: true }
  return { recommendedDifficulty: "Stretch", reason: recentAverage >= 72 ? "Performance is strong but not yet consistently secure across recent sessions; Stretch keeps the interview demanding without skipping diagnostic evidence." : "Stretch provides enough challenge to diagnose reasoning while preserving room for independent recovery.", recentAverage, consistency, shouldIncrease: false, shouldReduce: false }
}

export function prioritiseUnseenQuestions<T extends { id: string }>(questions: T[], usedQuestionIds: string[], seed = 0) {
  if (!questions.length) return []
  const used = new Set(usedQuestionIds)
  const unseen = questions.filter(question => !used.has(question.id))
  const source = unseen.length ? unseen : questions
  const offset = ((seed % source.length) + source.length) % source.length
  return [...source.slice(offset), ...source.slice(0, offset)]
}

export function interviewNoveltySummary(totalQuestions: number, usedQuestionIds: string[]) {
  const uniqueUsed = new Set(usedQuestionIds).size
  const unseen = Math.max(0, totalQuestions - uniqueUsed)
  return {
    uniqueUsed,
    unseen,
    recycled: totalQuestions > 0 && unseen === 0,
    label: unseen > 5 ? "High novelty remaining" : unseen > 0 ? "Some unseen openings remain" : "Opening bank will now recycle with adaptive branching",
  }
}

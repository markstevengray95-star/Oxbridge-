import type { InterviewQuestion } from "@/lib/oxbridge-data"

export function selectInterviewQuestion(questions: InterviewQuestion[], course: string, recentIds: string[], offset = 0) {
  const matching = questions.filter(question => !question.courses || question.courses.includes(course))
  const pool = matching.length ? matching : questions
  if (!pool.length) return undefined

  // An unseen question wins. Once the pool is exhausted, revisit the least recent one.
  const age = (id: string) => {
    const index = recentIds.indexOf(id)
    return index === -1 ? Number.POSITIVE_INFINITY : index
  }
  const oldestAge = Math.max(...pool.map(question => age(question.id)))
  const oldest = pool.filter(question => age(question.id) === oldestAge)
  const tailored = oldest.filter(question => question.courses?.includes(course))
  const choices = tailored.length ? tailored : oldest
  return choices[((offset % choices.length) + choices.length) % choices.length]
}

export function recordInterviewQuestion(recentIds: string[], id: string) {
  return [id, ...recentIds.filter(previous => previous !== id)].slice(0, 100)
}

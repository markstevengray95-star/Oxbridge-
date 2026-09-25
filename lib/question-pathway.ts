import type { TestQuestion, TrackId } from "@/lib/oxbridge-data"

function normaliseCourse(course?:string) {
  return (course??"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim()
}

/**
 * Course-aware ESAT practice emphasis for 2027 preparation.
 * Mathematics 1 remains the common core. Physics/Engineering use Mathematics 2 + Physics;
 * courses with free module choice keep a broader relevant pool rather than pretending there is one mandatory combination.
 */
export function preferredEsatSections(course?:string, track?:TrackId): string[] {
  const value=normaliseCourse(course)
  if (/engineering/.test(value)) return ["Mathematics 1","Mathematics 2","Physics"]
  if (/physics/.test(value)) return ["Mathematics 1","Mathematics 2","Physics"]
  if (/materials/.test(value)) return ["Mathematics 1","Mathematics 2","Physics"]
  if (/chemistry/.test(value) && !/chemical engineering/.test(value)) return ["Mathematics 1","Chemistry","Mathematics 2"]
  if (/veterinary|medicine|biomedical|biology/.test(value)) return ["Mathematics 1","Biology","Chemistry"]
  if (/natural sciences/.test(value)) return ["Mathematics 1","Biology","Chemistry","Physics","Mathematics 2"]
  if (track==="life") return ["Mathematics 1","Biology","Chemistry"]
  if (track==="physical" || track==="maths" || track==="economics") return ["Mathematics 1","Mathematics 2","Physics"]
  return ["Mathematics 1","Mathematics 2","Physics"]
}

export function questionsForSelectedPathway(
  bank:TestQuestion[],
  test:TestQuestion["test"],
  course?:string,
  track?:TrackId,
) {
  const forTest=bank.filter(question=>question.test===test)
  if (test!=="ESAT") return forTest
  const preferred=new Set(preferredEsatSections(course,track))
  const linked=forTest.filter(question=>preferred.has(question.section))
  return linked.length>=20?linked:forTest
}

export function pathwayQuestionNote(test:TestQuestion["test"], course?:string, track?:TrackId) {
  if (test!=="ESAT") return null
  const sections=preferredEsatSections(course,track)
  return `${course||"Your pathway"}: practice prioritises ${sections.join(" · ")}.`
}

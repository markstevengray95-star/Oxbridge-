export type UniversityChoice = "Oxford" | "Cambridge" | "Both" | "Undecided"

export type RequirementStatus = "required" | "possible" | "not-required" | "check-course"

export type CourseRequirement = {
  university: "Oxford" | "Cambridge"
  course: string
  test: string
  testStatus: RequirementStatus
  testDetail: string
  writtenWork: RequirementStatus
  writtenWorkDetail: string
  collegeAssessment: RequirementStatus
  collegeAssessmentDetail: string
  interview: string
  officialUrl: string
  checked: string
}

export type ApplicationTask = {
  id: string
  label: string
  date?: string
  category: "Application" | "Test" | "Written work" | "Interview" | "Decision" | "Preparation"
  required: boolean
  detail: string
  officialUrl?: string
}

const OXFORD_TESTS: Record<string, string> = {
  "Biomedical Sciences": "ESAT",
  "Computer Science": "TMUA",
  "Computer Science and Philosophy": "TMUA",
  "Economics and Management": "TARA",
  "Engineering Science": "ESAT",
  "History and Economics": "TARA",
  "History and Politics": "TARA",
  "Human Sciences": "TARA",
  Mathematics: "TMUA",
  "Mathematics and Statistics": "TMUA",
  "Mathematics and Computer Science": "TMUA",
  "Mathematics and Philosophy": "TMUA",
  Physics: "ESAT",
  "Physics and Philosophy": "ESAT",
  "Philosophy, Politics and Economics": "TARA",
  PPE: "TARA",
  "Experimental Psychology": "TARA",
  "Psychology, Philosophy and Linguistics": "TARA",
  Law: "LNAT",
  Jurisprudence: "LNAT",
  Medicine: "UCAT",
}

const CAMBRIDGE_TESTS: Record<string, string> = {
  "Chemical Engineering and Biotechnology": "ESAT",
  Engineering: "ESAT",
  "Natural Sciences": "ESAT",
  "Veterinary Medicine": "ESAT",
  "Computer Science": "TMUA",
  Economics: "TMUA",
  Mathematics: "TMUA",
  Law: "LNAT",
  Medicine: "UCAT",
}

const CAMBRIDGE_COLLEGE_ASSESSMENT = new Set([
  "Anglo-Saxon, Norse, and Celtic",
  "Architecture",
  "Asian and Middle Eastern Studies",
  "Classics",
  "Design",
  "English",
  "Geography",
  "History",
  "History and Modern Languages",
  "History and Politics",
  "Human, Social, and Political Sciences",
  "HSPS",
  "Linguistics",
  "Linguistics and Modern Languages",
  "Modern and Medieval Languages",
  "Music",
  "Philosophy",
  "Psychological and Behavioural Sciences",
])

const OXFORD_WRITTEN_WORK_LIKELY = new Set([
  "Classics",
  "English",
  "History",
  "History and Economics",
  "History and Politics",
  "Modern Languages",
  "Theology",
])

function normaliseCourse(course: string) {
  const trimmed = course.trim()
  if (/^physics$/i.test(trimmed)) return "Physics"
  if (/^engineering$/i.test(trimmed)) return "Engineering"
  if (/^engineering science$/i.test(trimmed)) return "Engineering Science"
  if (/^natural sciences?$/i.test(trimmed)) return "Natural Sciences"
  if (/^(maths|mathematics)$/i.test(trimmed)) return "Mathematics"
  if (/^computer science$/i.test(trimmed)) return "Computer Science"
  if (/^economics$/i.test(trimmed)) return "Economics"
  if (/^economics and management$/i.test(trimmed)) return "Economics and Management"
  if (/^ppe$/i.test(trimmed)) return "PPE"
  if (/^philosophy, politics and economics$/i.test(trimmed)) return "Philosophy, Politics and Economics"
  if (/^(law|jurisprudence)$/i.test(trimmed)) return trimmed.toLowerCase().includes("juris") ? "Jurisprudence" : "Law"
  if (/^medicine$/i.test(trimmed)) return "Medicine"
  return trimmed
}

export function requirementFor(university: "Oxford" | "Cambridge", courseInput: string): CourseRequirement {
  const course = normaliseCourse(courseInput)
  const testMap = university === "Oxford" ? OXFORD_TESTS : CAMBRIDGE_TESTS
  const test = testMap[course] ?? "No advance-registration test identified"
  const testRequired = Boolean(testMap[course])
  const collegeAssessment = university === "Cambridge" && CAMBRIDGE_COLLEGE_ASSESSMENT.has(course)
  const writtenLikely = university === "Oxford" && OXFORD_WRITTEN_WORK_LIKELY.has(course)

  return {
    university,
    course,
    test,
    testStatus: testRequired ? "required" : "check-course",
    testDetail: testRequired
      ? `${test} is listed for this course for 2027 entry. Confirm modules, registration and access-arrangement details on the official course/test page.`
      : university === "Cambridge"
        ? "No advance-registration test is mapped here. A College assessment may still apply, so check the official course and College assessment pages."
        : "No admissions test is mapped here from the current Oxford test list. Confirm against the official course page before acting.",
    writtenWork: writtenLikely ? "possible" : "check-course",
    writtenWorkDetail: writtenLikely
      ? "This subject family commonly uses submitted written work at Oxford. Check the exact course requirements and submission specification."
      : "Written-work requirements vary by course. Confirm on the official course page; do not assume it is unnecessary from this summary alone.",
    collegeAssessment: collegeAssessment ? "possible" : university === "Cambridge" ? "check-course" : "not-required",
    collegeAssessmentDetail: university === "Cambridge"
      ? collegeAssessment
        ? "This course is currently listed among subjects that can involve a College-arranged assessment after shortlisting. The interviewing College provides the details."
        : "Check the Cambridge admissions-assessment table and your College guidance because College-specific requirements can differ."
      : "Oxford does not use the Cambridge College-assessment system.",
    interview: university === "Oxford"
      ? "Shortlisted candidates take part in online academic interviews in December."
      : "Shortlisted candidates are interviewed by their Cambridge College; format and any linked assessment information is supplied by the College.",
    officialUrl: university === "Oxford"
      ? "https://www.ox.ac.uk/admissions/undergraduate/applying/guide-for-applicants/admissions-tests"
      : "https://www.undergraduate.study.cam.ac.uk/apply/how/admission-tests",
    checked: "23 September 2026",
  }
}

export const coreTimeline2027: ApplicationTask[] = [
  {
    id: "ucas-oxbridge",
    label: "Submit Oxbridge UCAS application",
    date: "2026-10-15T18:00:00+01:00",
    category: "Application",
    required: true,
    detail: "Oxford and Cambridge applicants use the early UCAS deadline. Check your school/internal deadline as it may be earlier.",
    officialUrl: "https://www.ox.ac.uk/admissions/undergraduate/applying/admissions-timeline",
  },
  {
    id: "uat-booking",
    label: "UAT-UK test booking deadline where relevant",
    date: "2026-09-28T18:00:00+01:00",
    category: "Test",
    required: false,
    detail: "For applicants who need ESAT, TMUA or TARA in the October 2026 sitting.",
    officialUrl: "https://www.ox.ac.uk/admissions/undergraduate/applying/guide-for-applicants/admissions-tests",
  },
  {
    id: "uat-window",
    label: "October UAT-UK test window",
    date: "2026-10-12T00:00:00+01:00",
    category: "Test",
    required: false,
    detail: "ESAT/TMUA/TARA candidates take the relevant October sitting from 12–16 October 2026.",
  },
  {
    id: "oxford-written-work",
    label: "Oxford written work deadline where required",
    date: "2026-11-10T23:59:00+00:00",
    category: "Written work",
    required: false,
    detail: "Where the course asks for written work, Oxford’s 2027-entry timeline states that it should reach the College by 10 November.",
    officialUrl: "https://www.ox.ac.uk/admissions/undergraduate/applying/admissions-timeline",
  },
  {
    id: "interview-prep",
    label: "Interview preparation and technology rehearsal",
    date: "2026-11-20T09:00:00+00:00",
    category: "Interview",
    required: false,
    detail: "Use the app’s formal interview, panel, live voice and technology rehearsal tools before interview invitations arrive.",
  },
  {
    id: "oxford-decision",
    label: "Oxford 2027-entry decisions",
    date: "2027-01-12T09:00:00+00:00",
    category: "Decision",
    required: false,
    detail: "Oxford states that shortlisted 2027-entry applicants receive outcomes on 12 January 2027.",
    officialUrl: "https://www.ox.ac.uk/admissions/undergraduate/applying/admissions-timeline",
  },
]

export function tasksFor(university: UniversityChoice, course: string): ApplicationTask[] {
  const universities = university === "Both" || university === "Undecided" ? ["Oxford", "Cambridge"] as const : [university] as const
  const reqs = universities.map(u => requirementFor(u, course))
  const tasks = [...coreTimeline2027]
  for (const req of reqs) {
    if (req.testStatus === "required") tasks.push({
      id: `${req.university.toLowerCase()}-${req.test.toLowerCase()}-${course}`.replace(/\s+/g, "-"),
      label: `${req.university}: prepare for ${req.test}`,
      category: "Test",
      required: true,
      detail: req.testDetail,
      officialUrl: req.officialUrl,
    })
    if (req.writtenWork === "possible") tasks.push({
      id: `${req.university.toLowerCase()}-written-${course}`.replace(/\s+/g, "-"),
      label: `${req.university}: verify and prepare written work`,
      category: "Written work",
      required: false,
      detail: req.writtenWorkDetail,
      officialUrl: req.officialUrl,
    })
    if (req.collegeAssessment === "possible") tasks.push({
      id: `cambridge-college-assessment-${course}`.replace(/\s+/g, "-"),
      label: "Cambridge: check College-arranged assessment",
      category: "Test",
      required: false,
      detail: req.collegeAssessmentDetail,
      officialUrl: "https://www.undergraduate.study.cam.ac.uk/apply/after/college-assessments",
    })
  }
  return Array.from(new Map(tasks.map(task => [task.id, task])).values())
}

export function nextApplicationAction(tasks: ApplicationTask[], completed: string[], now = Date.now()) {
  const outstanding = tasks.filter(task => !completed.includes(task.id))
  const dated = outstanding.filter(task => task.date && new Date(task.date).getTime() >= now).sort((a, b) => new Date(a.date!).getTime() - new Date(b.date!).getTime())
  return dated[0] ?? outstanding[0] ?? null
}

export function applicationAudit(tasks: ApplicationTask[], completed: string[]) {
  const required = tasks.filter(task => task.required)
  const complete = required.filter(task => completed.includes(task.id))
  return {
    required: required.length,
    complete: complete.length,
    missing: required.filter(task => !completed.includes(task.id)),
    percent: required.length ? Math.round(complete.length / required.length * 100) : 100,
  }
}

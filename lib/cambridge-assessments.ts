export type CambridgeAssessment = {
  course: string
  colleges: string[] | "All Colleges"
  date?: string
  format: string
  note?: string
}

export const cambridgeAssessmentData: CambridgeAssessment[] = [
  { course:"Anglo-Saxon, Norse, and Celtic", colleges:["Clare"], format:"Details provided by the relevant College." },
  { course:"Architecture", colleges:"All Colleges", date:"2026-11-18", format:"Graphic and spatial ability assessment (30 minutes)." },
  { course:"Asian and Middle Eastern Studies", colleges:"All Colleges", format:"For combinations with a European language: Modern and Medieval Languages assessment with a foreign-language discursive response (40 minutes) and English discursive response (20 minutes).", note:"Exact language route matters; check the official course assessment section." },
  { course:"Classics", colleges:"All Colleges", format:"Classics assessment route depends on whether applying for the 3-year or 4-year course; the 3-year course includes a Latin (or Greek) skills assessment interview (20 minutes).", note:"Some 4-year-course College details differ; verify the relevant official subsection." },
  { course:"History and Politics", colleges:["Hughes Hall","St Edmund's"], format:"Details provided by the relevant College." },
  { course:"Human, Social and Political Sciences", colleges:["Hughes Hall","King's","Newnham"], format:"Details provided by the relevant College." },
  { course:"HSPS", colleges:["Hughes Hall","King's","Newnham"], format:"Details provided by the relevant College." },
  { course:"Linguistics", colleges:["Churchill","Clare","Downing","Emmanuel","Fitzwilliam","Girton","Gonville & Caius","Homerton","Hughes Hall","Jesus","King's","Magdalene","Murray Edwards","Newnham","Pembroke","Peterhouse","Queens'","Robinson","Selwyn","Sidney Sussex","St Edmund's","Trinity","Trinity Hall","Wolfson"], date:"2026-11-17", format:"Three data-based parts, about 20 minutes each; 60 minutes overall and 90 marks total.", note:"Applicants combining Linguistics with languages can face different combinations of Linguistics and MML assessments by College and prior language study. Check the official table." },
  { course:"Modern and Medieval Languages", colleges:"All Colleges", date:"2026-11-19", format:"Discursive response in Foreign Language (40 minutes) plus discursive response in English (20 minutes)." },
  { course:"Music", colleges:["Downing","Girton","Gonville & Caius","Jesus","Newnham","Queens'","Robinson","Selwyn","St Edmund's","St John's","Trinity","Trinity Hall"], format:"Colleges assess aptitude, knowledge base and potential through tasks at the time of interview." },
  { course:"Philosophy", colleges:["Jesus","Trinity"], format:"Details provided by the relevant College." },
  { course:"Psychological and Behavioural Sciences", colleges:["Selwyn","St Edmund's"], format:"Details provided by the relevant College." },
]

export const cambridgeAssessmentOfficialUrl = "https://www.undergraduate.study.cam.ac.uk/apply/after/college-assessments"
export const cambridgeAssessmentChecked = "23 September 2026"

export function assessmentFor(course: string) {
  const clean=course.trim().toLowerCase()
  return cambridgeAssessmentData.find(item=>item.course.toLowerCase()===clean || (clean==="pbs" && item.course==="Psychological and Behavioural Sciences"))
}

export function collegeApplies(item: CambridgeAssessment, college: string) {
  if (item.colleges === "All Colleges") return true
  return item.colleges.some(name=>name.toLowerCase()===college.trim().toLowerCase())
}

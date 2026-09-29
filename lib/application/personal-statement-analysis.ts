export type TargetUniversity = "Oxford" | "Cambridge" | "Both"
export type UcasSectionKey = "motivation" | "preparation" | "outside"

export type UcasAnswers = Record<UcasSectionKey, string>

export const UCAS_SECTIONS: { key: UcasSectionKey; label: string; question: string; purpose: string }[] = [
  {
    key: "motivation",
    label: "Question 1",
    question: "Why do you want to study this course or subject?",
    purpose: "Academic motivation, subject interests and the questions you genuinely want to explore.",
  },
  {
    key: "preparation",
    label: "Question 2",
    question: "How have your qualifications and studies helped you to prepare for this course or subject?",
    purpose: "Relevant learning, skills, methods and intellectual development from your studies.",
  },
  {
    key: "outside",
    label: "Question 3",
    question: "What else have you done to prepare outside education, and why are these experiences useful?",
    purpose: "Supercurricular exploration, projects, reading, work or experiences, with reflection on what changed in your thinking.",
  },
]

export const UCAS_TOTAL_CHARACTER_LIMIT = 4000
export const UCAS_MIN_SECTION_CHARACTERS = 350

export type EvidenceStage = "claim" | "evidence" | "thinking" | "development"

export type StatementClaim = {
  id: string
  section: UcasSectionKey
  text: string
  stages: Record<EvidenceStage, boolean>
  stageCount: number
  diagnosis: string
  nextPrompt: string
}

export type DepthDimension = {
  key: string
  label: string
  score: number
  max: 4
  evidence: string[]
  explanation: string
}

export type CourseCriterion = {
  label: string
  description: string
  sourceLabel: string
  sourceUrl: string
  keywords: string[]
}

export type CourseCriterionResult = CourseCriterion & {
  status: "demonstrated" | "partial" | "not evidenced"
  evidence: string[]
}

export type SectionDiagnostic = {
  key: UcasSectionKey
  characters: number
  words: number
  meetsMinimum: boolean
  evidenceSentences: number
  reflectiveSentences: number
  developmentSentences: number
  repeatedSentences: number
  guidance: string[]
}

export type StatementAnalysis = {
  totalCharacters: number
  totalWords: number
  withinCharacterLimit: boolean
  allSectionsMeetMinimum: boolean
  sections: SectionDiagnostic[]
  claims: StatementClaim[]
  dimensions: DepthDimension[]
  criteria: CourseCriterionResult[]
  repeatedIdeas: string[]
  actions: string[]
  evidenceStrength: "limited" | "developing" | "substantial" | "well evidenced"
}

const sentenceSplit = /(?<=[.!?])\s+|\n+/g
const evidencePattern = /\b(read|reading|book|article|paper|lecture|podcast|course|project|competition|olympiad|research|experiment|investigat|essay|epq|work experience|placement|volunteer|shadow|built|coded|modelled|analysed|analyzed|studied|learned|learnt|examined)\b/i
const thinkingPattern = /\b(think|argu|because|therefore|however|although|whereas|suggest|impli|assum|question|compare|contrast|evaluate|critic|limit|evidence|interpret|perspective|counter|convinc|reason|conclude|infer|challenge)\b/i
const developmentPattern = /\b(led me|prompted me|then|next|subsequently|further|followed this|developed|changed my|reconsider|investigat|explore further|made me question|raised the question|in turn|building on|as a result)\b/i
const motivationPattern = /\b(interested|fascinat|curious|motivat|want to study|drawn to|enjoy|question|problem|idea|understand)\b/i
const precisionPattern = /\b(for example|specifically|in particular|because|which|whereas|despite|result|finding|model|theory|argument|method|data|evidence)\b/i
const connectionPattern = /\b(connect|link|relationship|between|across|combined|interdisciplin|applied|built on|in turn|led me)\b/i
const genericPattern = /\b(always been passionate|from a young age|fascinating subject|dreamed of|ever since i was|passion for|perfect course for me|i have always wanted)\b/i

function sentences(text: string) {
  return text.split(sentenceSplit).map(item => item.trim()).filter(item => item.length >= 18)
}

function words(text: string) {
  return text.trim() ? text.trim().split(/\s+/).filter(Boolean).length : 0
}

function normaliseSentence(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim()
}

function sentenceTokens(text: string) {
  return new Set(normaliseSentence(text).split(" ").filter(token => token.length >= 5))
}

function similarity(a: string, b: string) {
  const left = sentenceTokens(a)
  const right = sentenceTokens(b)
  if (!left.size || !right.size) return 0
  let shared = 0
  for (const token of left) if (right.has(token)) shared++
  return shared / Math.max(left.size, right.size)
}

function cappedScore(count: number, thresholds: number[]) {
  let score = 0
  for (const threshold of thresholds) if (count >= threshold) score++
  return Math.min(4, score)
}

const OXFORD_GENERAL_SOURCE = "https://www.ox.ac.uk/admissions/undergraduate/applying/guide-for-applicants/ucas-application"
const CAMBRIDGE_GENERAL_SOURCE = "https://www.undergraduate.study.cam.ac.uk/apply/before/improve-application"

const oxfordCourseCriteria: Record<string, CourseCriterion[]> = {
  physics: [
    { label: "Motivation for physics", description: "Real interest and a strong desire to learn physics.", sourceLabel: "Oxford Physics admissions criteria", sourceUrl: "https://www.physics.ox.ac.uk/study/undergraduates/how-apply", keywords: ["physics", "physical", "curious", "interest", "question", "investigate"] },
    { label: "Mathematical expression", description: "Ability to express physical ideas using mathematics.", sourceLabel: "Oxford Physics admissions criteria", sourceUrl: "https://www.physics.ox.ac.uk/study/undergraduates/how-apply", keywords: ["mathemat", "equation", "model", "quantitative", "calculation", "derive"] },
    { label: "Logical problem solving", description: "Analyse and solve problems using logical and critical approaches.", sourceLabel: "Oxford Physics admissions criteria", sourceUrl: "https://www.physics.ox.ac.uk/study/undergraduates/how-apply", keywords: ["problem", "reason", "analyse", "analyze", "logic", "critical", "method"] },
    { label: "Physical intuition", description: "Connect parts of a physical system and predict what will happen.", sourceLabel: "Oxford Physics admissions criteria", sourceUrl: "https://www.physics.ox.ac.uk/study/undergraduates/how-apply", keywords: ["predict", "system", "relationship", "model", "mechanism", "intuition", "interaction"] },
    { label: "Precise communication", description: "Give precise explanations orally and numerically.", sourceLabel: "Oxford Physics admissions criteria", sourceUrl: "https://www.physics.ox.ac.uk/study/undergraduates/how-apply", keywords: ["explain", "evidence", "result", "therefore", "because", "quantitative"] },
  ],
  law: [
    { label: "Sustained academic motivation", description: "Motivation and capacity for sustained and intense work.", sourceLabel: "Oxford Law selection criteria", sourceUrl: "https://www.law.ox.ac.uk/admissions/undergraduate/undergraduate-selection-criteria", keywords: ["law", "argument", "question", "research", "read", "motivat"] },
    { label: "Logical and critical reasoning", description: "Analyse and solve problems using logical and critical approaches.", sourceLabel: "Oxford Law selection criteria", sourceUrl: "https://www.law.ox.ac.uk/admissions/undergraduate/undergraduate-selection-criteria", keywords: ["logic", "critical", "reason", "argument", "analyse", "analyze"] },
    { label: "Fine distinctions and relevance", description: "Draw fine distinctions and separate relevant from irrelevant material.", sourceLabel: "Oxford Law selection criteria", sourceUrl: "https://www.law.ox.ac.uk/admissions/undergraduate/undergraduate-selection-criteria", keywords: ["distinction", "relevant", "difference", "contrast", "interpret", "qualif"] },
    { label: "Sustained argument", description: "Develop accurate, critical, sustained and cogent argument.", sourceLabel: "Oxford Law selection criteria", sourceUrl: "https://www.law.ox.ac.uk/admissions/undergraduate/undergraduate-selection-criteria", keywords: ["argue", "argument", "evidence", "counter", "conclusion", "because"] },
    { label: "Clear communication", description: "Express ideas clearly and give considered responses.", sourceLabel: "Oxford Law selection criteria", sourceUrl: "https://www.law.ox.ac.uk/admissions/undergraduate/undergraduate-selection-criteria", keywords: ["explain", "response", "consider", "clarity", "communicat", "conclude"] },
  ],
  medicine: [
    { label: "Scientific problem solving", description: "Critical thinking and an analytical approach to scientific problems.", sourceLabel: "Oxford Medicine selection criteria", sourceUrl: "https://www.medsci.ox.ac.uk/study/medicine/pre-clinical/requirements/criteria", keywords: ["science", "problem", "critical", "analyse", "analyze", "evidence", "data"] },
    { label: "Intellectual curiosity", description: "Depth, curiosity and a tendency to seek reasons for observations.", sourceLabel: "Oxford Medicine selection criteria", sourceUrl: "https://www.medsci.ox.ac.uk/study/medicine/pre-clinical/requirements/criteria", keywords: ["curious", "why", "question", "investigat", "understand", "mechanism"] },
    { label: "Informed motivation", description: "A reasonably well-informed and strong desire to practise medicine.", sourceLabel: "Oxford Medicine selection criteria", sourceUrl: "https://www.medsci.ox.ac.uk/study/medicine/pre-clinical/requirements/criteria", keywords: ["medicine", "patient", "clinical", "doctor", "healthcare", "placement", "shadow"] },
    { label: "Communication", description: "Make knowledge and ideas clear for different audiences.", sourceLabel: "Oxford Medicine selection criteria", sourceUrl: "https://www.medsci.ox.ac.uk/study/medicine/pre-clinical/requirements/criteria", keywords: ["communicat", "explain", "patient", "team", "listen", "audience"] },
    { label: "Ethical awareness and empathy", description: "Show awareness of other perspectives, ethics, empathy and integrity.", sourceLabel: "Oxford Medicine selection criteria", sourceUrl: "https://www.medsci.ox.ac.uk/study/medicine/pre-clinical/requirements/criteria", keywords: ["ethic", "empathy", "perspective", "integrity", "patient", "responsibility"] },
  ],
}

function genericOxfordCriteria(course: string): CourseCriterion[] {
  return [
    { label: `${course || "Course"} academic motivation`, description: "Evidence of genuine academic commitment to the chosen subject, not enthusiasm alone.", sourceLabel: "Oxford UCAS guidance", sourceUrl: OXFORD_GENERAL_SOURCE, keywords: [course.toLowerCase(), "interest", "question", "curious", "motivat"] },
    { label: "Independent subject engagement", description: "Engagement beyond school or college, with evaluation of what was learned.", sourceLabel: "Oxford UCAS guidance", sourceUrl: OXFORD_GENERAL_SOURCE, keywords: ["read", "research", "project", "lecture", "article", "book", "investigat"] },
    { label: "Evaluation and reflection", description: "Explain how experiences changed or developed understanding instead of listing achievements.", sourceLabel: "Oxford UCAS guidance", sourceUrl: OXFORD_GENERAL_SOURCE, keywords: ["because", "however", "changed", "question", "evaluate", "critical", "led me"] },
  ]
}

function cambridgeCriteria(course: string): CourseCriterion[] {
  return [
    { label: `${course || "Course"} fit and enthusiasm`, description: "Confidence that the subject is the right area of study, supported by academic evidence.", sourceLabel: "Cambridge application guidance", sourceUrl: CAMBRIDGE_GENERAL_SOURCE, keywords: [course.toLowerCase(), "interest", "question", "curious", "explore"] },
    { label: "Independent thought", description: "Own thoughts and opinions rather than description alone.", sourceLabel: "Cambridge application guidance", sourceUrl: CAMBRIDGE_GENERAL_SOURCE, keywords: ["think", "argue", "interpret", "conclude", "suggest", "question"] },
    { label: "Critical and analytical thinking", description: "Critical thinking, analytical skills and engagement with arguments.", sourceLabel: "Cambridge application guidance", sourceUrl: CAMBRIDGE_GENERAL_SOURCE, keywords: ["critical", "analyse", "analyze", "reason", "evidence", "argument"] },
    { label: "Alternative viewpoints", description: "Ability to consider different points of view and arguments.", sourceLabel: "Cambridge application guidance", sourceUrl: CAMBRIDGE_GENERAL_SOURCE, keywords: ["however", "whereas", "alternative", "counter", "perspective", "although"] },
    { label: "Curiosity and intellectual development", description: "Curiosity, openness to new ideas and evidence that one interest led to another.", sourceLabel: "Cambridge application guidance", sourceUrl: CAMBRIDGE_GENERAL_SOURCE, keywords: ["curious", "led me", "prompted", "next", "further", "question", "developed"] },
  ]
}

function courseKey(course: string) {
  const value = course.toLowerCase()
  if (/physics/.test(value)) return "physics"
  if (/medicine|medical/.test(value)) return "medicine"
  if (/law|jurisprudence/.test(value)) return "law"
  return ""
}

export function getCourseCriteria(course: string, university: TargetUniversity): CourseCriterion[] {
  const key = courseKey(course)
  const oxford = key && oxfordCourseCriteria[key] ? oxfordCourseCriteria[key] : genericOxfordCriteria(course)
  if (university === "Oxford") return oxford
  const cambridge = cambridgeCriteria(course)
  if (university === "Cambridge") return cambridge
  const seen = new Set<string>()
  return [...oxford, ...cambridge].filter(item => {
    if (seen.has(item.label)) return false
    seen.add(item.label)
    return true
  }).slice(0, 8)
}

function buildRepeatedIdeas(all: { section: UcasSectionKey; text: string }[]) {
  const duplicates: string[] = []
  for (let i = 0; i < all.length; i++) {
    for (let j = i + 1; j < all.length; j++) {
      if (all[i].section === all[j].section) continue
      if (similarity(all[i].text, all[j].text) >= 0.62) {
        const item = all[j].text.length < all[i].text.length ? all[j].text : all[i].text
        if (!duplicates.some(existing => similarity(existing, item) > 0.8)) duplicates.push(item)
      }
    }
  }
  return duplicates.slice(0, 8)
}

function claimDiagnosis(stages: Record<EvidenceStage, boolean>) {
  if (stages.claim && stages.evidence && stages.thinking && stages.development) return ["Complete evidence chain", "Be ready to defend the judgement and the next question it created."]
  if (!stages.evidence) return ["Claim without concrete evidence", "Add the specific book, problem, project, result or experience that supports this claim."]
  if (!stages.thinking) return ["Evidence is described but not analysed", "Explain what you concluded, questioned, disagreed with or learned from this evidence."]
  if (!stages.development) return ["Reflection stops too early", "Show what this led you to investigate, compare, change or question next."]
  return ["Partially developed evidence chain", "Make the link between the evidence and your academic development explicit."]
}

function extractClaims(answers: UcasAnswers): StatementClaim[] {
  const result: StatementClaim[] = []
  for (const section of UCAS_SECTIONS) {
    sentences(answers[section.key]).forEach((text, index) => {
      const isEvidence = evidencePattern.test(text)
      const isThinking = thinkingPattern.test(text)
      const isDevelopment = developmentPattern.test(text)
      const isClaim = isEvidence || isThinking || motivationPattern.test(text) || precisionPattern.test(text)
      if (!isClaim) return
      const stages = { claim: true, evidence: isEvidence, thinking: isThinking, development: isDevelopment }
      const [diagnosis, nextPrompt] = claimDiagnosis(stages)
      result.push({ id: `${section.key}-${index}`, section: section.key, text, stages, stageCount: Object.values(stages).filter(Boolean).length, diagnosis, nextPrompt })
    })
  }
  return result.slice(0, 36)
}

function dimension(label: string, key: string, score: number, evidence: string[], explanation: string): DepthDimension {
  return { label, key, score: Math.max(0, Math.min(4, score)), max: 4, evidence: evidence.slice(0, 3), explanation }
}

function buildDimensions(allSentences: string[], claims: StatementClaim[], course: string) {
  const evidence = allSentences.filter(s => evidencePattern.test(s))
  const thinking = allSentences.filter(s => thinkingPattern.test(s))
  const development = allSentences.filter(s => developmentPattern.test(s))
  const motivation = allSentences.filter(s => motivationPattern.test(s))
  const connections = allSentences.filter(s => connectionPattern.test(s))
  const precision = allSentences.filter(s => precisionPattern.test(s) && !genericPattern.test(s))
  const completeChains = claims.filter(c => c.stageCount === 4)
  const courseTerms = course.toLowerCase().split(/\s+/).filter(token => token.length >= 4)
  const courseEvidence = allSentences.filter(s => courseTerms.some(token => s.toLowerCase().includes(token)))

  return [
    dimension("Academic motivation", "motivation", cappedScore(motivation.length, [1, 2, 4, 6]), motivation, "Does the draft move beyond enthusiasm and identify real academic questions or interests?"),
    dimension("Independent exploration", "exploration", cappedScore(evidence.length, [1, 2, 4, 6]), evidence, "Is there concrete evidence of reading, research, projects, lectures, problems or other subject exploration?"),
    dimension("Critical thinking", "critical-thinking", cappedScore(thinking.length, [1, 3, 5, 8]), thinking, "Does the applicant analyse, evaluate, compare, qualify or challenge ideas rather than just describe them?"),
    dimension("Intellectual development", "development", cappedScore(development.length, [1, 2, 3, 5]), development, "Does the draft show one idea leading to another, or explain how understanding changed?"),
    dimension("Connections between ideas", "connections", cappedScore(connections.length, [1, 2, 3, 5]), connections, "Are academic interests connected into a coherent pattern rather than presented as a list?"),
    dimension("Evidence depth", "evidence-depth", cappedScore(completeChains.length, [1, 2, 3, 5]), completeChains.map(c => c.text), "How often does a claim include evidence, thinking and a clear next stage of development?"),
    dimension("Precision and specificity", "precision", cappedScore(precision.length, [2, 4, 7, 10]), precision, "Are claims specific enough to test and defend, rather than generic application language?"),
    dimension("Course relevance", "course-fit", cappedScore(courseEvidence.length, [1, 2, 4, 6]), courseEvidence, "Does the statement make the academic link to the chosen course visible?"),
  ]
}

function evaluateCriteria(criteria: CourseCriterion[], allSentences: string[]): CourseCriterionResult[] {
  return criteria.map(criterion => {
    const matches = allSentences.filter(sentence => criterion.keywords.some(keyword => keyword && sentence.toLowerCase().includes(keyword.toLowerCase())))
    const analyticalMatches = matches.filter(sentence => thinkingPattern.test(sentence) || developmentPattern.test(sentence))
    const status: CourseCriterionResult["status"] = analyticalMatches.length ? "demonstrated" : matches.length ? "partial" : "not evidenced"
    return { ...criterion, status, evidence: (analyticalMatches.length ? analyticalMatches : matches).slice(0, 3) }
  })
}

function sectionGuidance(key: UcasSectionKey, text: string, repeated: number) {
  const lines = sentences(text)
  const guidance: string[] = []
  if (text.trim().length < UCAS_MIN_SECTION_CHARACTERS) guidance.push(`Add at least ${UCAS_MIN_SECTION_CHARACTERS - text.trim().length} more characters to reach the UCAS section minimum.`)
  if (repeated) guidance.push(`Remove or rework ${repeated} idea${repeated === 1 ? "" : "s"} repeated elsewhere in the statement.`)
  if (!lines.some(line => evidencePattern.test(line))) guidance.push("Add a concrete example rather than relying on motivation or skills language alone.")
  if (!lines.some(line => thinkingPattern.test(line))) guidance.push("Add your own analysis: what did you conclude, question, compare or disagree with?")
  if (key === "outside" && !lines.some(line => developmentPattern.test(line))) guidance.push("Explain what an activity led you to explore next, not just that you completed it.")
  if (lines.some(line => genericPattern.test(line))) guidance.push("Replace generic motivation language with a precise academic question, problem or piece of evidence.")
  return guidance.slice(0, 4)
}

export function analysePersonalStatement(input: { answers: UcasAnswers; course: string; university: TargetUniversity }): StatementAnalysis {
  const { answers, course, university } = input
  const indexed = UCAS_SECTIONS.flatMap(section => sentences(answers[section.key]).map(text => ({ section: section.key, text })))
  const allSentences = indexed.map(item => item.text)
  const repeatedIdeas = buildRepeatedIdeas(indexed)
  const claims = extractClaims(answers)
  const dimensions = buildDimensions(allSentences, claims, course)
  const criteria = evaluateCriteria(getCourseCriteria(course, university), allSentences)
  const totalCharacters = UCAS_SECTIONS.reduce((sum, section) => sum + answers[section.key].length, 0)
  const sectionDiagnostics = UCAS_SECTIONS.map(section => {
    const text = answers[section.key]
    const lines = sentences(text)
    const repeatedSentences = lines.filter(line => repeatedIdeas.some(repeated => similarity(line, repeated) >= 0.62)).length
    return {
      key: section.key,
      characters: text.length,
      words: words(text),
      meetsMinimum: text.trim().length >= UCAS_MIN_SECTION_CHARACTERS,
      evidenceSentences: lines.filter(line => evidencePattern.test(line)).length,
      reflectiveSentences: lines.filter(line => thinkingPattern.test(line)).length,
      developmentSentences: lines.filter(line => developmentPattern.test(line)).length,
      repeatedSentences,
      guidance: sectionGuidance(section.key, text, repeatedSentences),
    }
  })
  const averageDepth = dimensions.reduce((sum, item) => sum + item.score, 0) / Math.max(1, dimensions.length)
  const evidenceStrength: StatementAnalysis["evidenceStrength"] = averageDepth >= 3.25 ? "well evidenced" : averageDepth >= 2.25 ? "substantial" : averageDepth >= 1.25 ? "developing" : "limited"

  const actions: string[] = []
  const weakestDimensions = [...dimensions].sort((a, b) => a.score - b.score).slice(0, 3)
  for (const item of weakestDimensions) actions.push(`Strengthen ${item.label.toLowerCase()}: ${item.explanation}`)
  const missingCriteria = criteria.filter(item => item.status === "not evidenced").slice(0, 2)
  for (const item of missingCriteria) actions.push(`Check course-fit evidence for “${item.label}”. Add it only if it is genuinely supported by your experience.`)
  if (repeatedIdeas.length) actions.push("Remove repeated material across the three UCAS answers so each section adds new evidence.")
  if (totalCharacters > UCAS_TOTAL_CHARACTER_LIMIT) actions.push(`Cut ${totalCharacters - UCAS_TOTAL_CHARACTER_LIMIT} characters to meet the 4,000-character UCAS total limit.`)

  return {
    totalCharacters,
    totalWords: UCAS_SECTIONS.reduce((sum, section) => sum + words(answers[section.key]), 0),
    withinCharacterLimit: totalCharacters <= UCAS_TOTAL_CHARACTER_LIMIT,
    allSectionsMeetMinimum: sectionDiagnostics.every(section => section.meetsMinimum),
    sections: sectionDiagnostics,
    claims,
    dimensions,
    criteria,
    repeatedIdeas,
    actions: actions.slice(0, 6),
    evidenceStrength,
  }
}

export function combineUcasAnswers(answers: UcasAnswers) {
  return UCAS_SECTIONS.map(section => answers[section.key].trim()).filter(Boolean).join("\n\n")
}

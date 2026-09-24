export const INTERVIEW_ACADEMY_KEY = "oxbridge-interview-academy-v3"
export const INTERVIEW_SESSION_CONFIG_KEY = "oxbridge-interview-session-config-v3"
export const RETRY_MOMENTS_KEY = "oxbridge-retry-moments-v1"
export const HUMAN_INTERVIEW_KEY = "oxbridge-human-interviews-v1"
export const INTERVIEW_PROFILE_KEY = "oxbridge-long-term-interview-profile-v1"
export const APPLICATION_CONTEXT_KEY = "oxbridge-application-context-v2"
export const EVIDENCE_PORTFOLIO_KEY = "oxbridge-evidence-portfolio-v2"

export type AcademyFeature = {
  id: string
  order: number
  title: string
  description: string
  href: string
  phase: "interview" | "analysis" | "application" | "school" | "planning"
}

export const ACADEMY_FEATURES: AcademyFeature[] = [
  { id:"live",order:1,title:"True Live Interview",description:"Hands-free continuous interview with natural turn-taking and configurable duration.",href:"/gemini-live-interview",phase:"interview" },
  { id:"whiteboard",order:2,title:"Interactive Whiteboard Interview",description:"Draw, calculate and explain while your reasoning process is captured.",href:"/socratic-whiteboard",phase:"interview" },
  { id:"unseen",order:3,title:"Unseen Material Mode",description:"Prepare from unfamiliar data, sources or scenarios before a live interview.",href:"/unseen-lab",phase:"interview" },
  { id:"difficulty",order:4,title:"Adaptive Difficulty Engine",description:"Challenge rises with independent reasoning and softens when a smaller step is needed.",href:"/tutor-autopilot",phase:"analysis" },
  { id:"pressure",order:5,title:"Interruption & Pressure Training",description:"Practise gentle through high-pressure academic challenge without hostility.",href:"/interview-pressure",phase:"interview" },
  { id:"think-aloud",order:6,title:"Thinking-Aloud Analysis",description:"Track assumptions, checks, counterexamples, revisions and transfer while solving.",href:"/socratic-whiteboard",phase:"analysis" },
  { id:"replay",order:7,title:"Interview Replay",description:"Review a timestamped reasoning path from first claim through challenge and revision.",href:"/reasoning-replay",phase:"analysis" },
  { id:"retry",order:8,title:"Retry This Moment",description:"Restart from a weak response with a changed version of the same reasoning demand.",href:"/retry-moment",phase:"analysis" },
  { id:"profile",order:9,title:"Long-Term Interview Profile",description:"See reasoning, precision, adaptability, independence and calibration trends over time.",href:"/interview-profile",phase:"analysis" },
  { id:"retest",order:10,title:"Delayed Retest",description:"Revisit weak reasoning after a delay and in a different context to test retention.",href:"/reasoning-replay",phase:"analysis" },
  { id:"institution",order:11,title:"Oxford / Cambridge Modes",description:"Configure interview structure by university and course without pretending one style fits every subject.",href:"/interview-academy",phase:"interview" },
  { id:"context",order:12,title:"Application Context",description:"Connect course, university, college, tests, written work and submitted application evidence.",href:"/application-profile",phase:"application" },
  { id:"defence",order:13,title:"Application Claim Defence",description:"Turn application claims, books and activities into ideas the student can genuinely defend.",href:"/personal-statement-defence",phase:"application" },
  { id:"graph",order:14,title:"Supercurricular Knowledge Graph",description:"Connect sources, ideas, objections, course topics and possible interview questions.",href:"/knowledge-graph",phase:"application" },
  { id:"reading",order:15,title:"Personal Reading Tutor",description:"Use weekly reading, synthesis and oral defence to deepen academic discussion.",href:"/reading-curriculum",phase:"application" },
  { id:"mock-day",order:16,title:"Full Mock Admissions Day",description:"Combine timed tests, unseen preparation, interviews and reflection in one sequence.",href:"/mock-day",phase:"planning" },
  { id:"teacher",order:17,title:"Teacher Live Interview Console",description:"School staff can assign practice and review high-level preparation evidence.",href:"/teacher-live-console",phase:"school" },
  { id:"human",order:18,title:"Human Interviewer Mode",description:"A real teacher conducts the interview while the app timestamps and structures evidence for review.",href:"/human-interviewer",phase:"school" },
  { id:"portfolio",order:19,title:"Evidence Portfolio",description:"Collect before/after examples, strong reasoning moments and retention evidence.",href:"/evidence-locker",phase:"analysis" },
  { id:"prep",order:20,title:"Do My Prep",description:"Give the Tutor your available time and receive a prioritised preparation session.",href:"/tutor-autopilot",phase:"planning" },
]

export type InterviewSessionConfig = {
  durationMinutes: 20 | 30 | 40
  handsFree: boolean
  university: "Oxford" | "Cambridge" | "Both"
  course: string
  institutionMode: "course-led" | "tutorial" | "problem-solving" | "source-led"
  pressure: "gentle" | "realistic" | "challenging" | "high"
  useUnseen: boolean
  useWhiteboard: boolean
  videoCoaching: boolean
  updatedAt: string
}

export const defaultSessionConfig = (course = "Physics"): InterviewSessionConfig => ({
  durationMinutes: 20,
  handsFree: true,
  university: "Both",
  course,
  institutionMode: "course-led",
  pressure: "realistic",
  useUnseen: false,
  useWhiteboard: false,
  videoCoaching: false,
  updatedAt: new Date().toISOString(),
})

export type RetryMoment = {
  id: string
  replayId: string
  course: string
  sourceTurnId: string
  originalQuestion: string
  originalAnswer: string
  feedback: string
  target: string
  createdAt: string
  completedAt?: string
  improvedAnswer?: string
}

export type InterviewProfile = {
  sessions: number
  minutes: number
  reasoning: number
  precision: number
  adaptability: number
  independence: number
  evidenceUse: number
  communication: number
  recovery: number
  calibration: number
  retention: number
  repeatedPriorities: string[]
  strongestEvidence: string[]
  updatedAt: string
}

const clamp = (value:number) => Math.max(0, Math.min(100, Math.round(value)))
const words = (value:string) => value.toLowerCase().match(/[a-z0-9'-]+/g) ?? []

export function reasoningSignals(text:string) {
  const lower = text.toLowerCase()
  const has = (pattern:RegExp) => pattern.test(lower)
  return {
    assumptions: has(/assum|suppos|taking .* as|if we assume/),
    alternatives: has(/alternative|another explanation|on the other hand|could instead/),
    counterexamples: has(/counterexample|case where|would fail|exception/),
    checking: has(/check|units|dimension|sanity|limit|consistent|verify/),
    revision: has(/i'd revise|i would revise|change my mind|actually|instead|on reflection/),
    uncertainty: has(/uncertain|not sure|provisional|depends|might|perhaps/),
    evidence: has(/evidence|data|observation|result|source|measurement/),
    causal: has(/because|therefore|hence|implies|leads to|causes/),
  }
}

export function adaptiveInterviewLevel(recentScores:number[], supportEvents:number[] = []) {
  const scores = recentScores.filter(Number.isFinite).slice(-6)
  if (!scores.length) return { level:"baseline", multiplier:1, reason:"Build a baseline before increasing pressure." }
  const average = scores.reduce((a,b)=>a+b,0)/scores.length
  const support = supportEvents.length ? supportEvents.slice(-6).reduce((a,b)=>a+b,0)/Math.min(6,supportEvents.length) : 0
  if (average >= 82 && support <= 1) return { level:"stretch", multiplier:1.25, reason:"Strong recent performance with little support: introduce transfer and counterexamples." }
  if (average >= 68 && support <= 2) return { level:"challenge", multiplier:1.1, reason:"Reasoning is stable enough for changed conditions and tighter follow-ups." }
  if (average < 48 || support >= 4) return { level:"repair", multiplier:0.8, reason:"Use smaller conceptual steps without giving away the answer." }
  return { level:"realistic", multiplier:1, reason:"Keep normal interview pressure while gathering more evidence." }
}

export function buildRetryMoment(args:{replayId:string;course:string;turnId:string;question:string;answer:string;feedback?:string}):RetryMoment {
  const feedback = args.feedback || "Rebuild this response with a clearer chain of reasoning."
  const target = /assum/i.test(feedback) ? "state and test the assumption" : /evidence|data/i.test(feedback) ? "connect evidence to the conclusion" : /counter|alternative/i.test(feedback) ? "test an alternative" : /clar|define/i.test(feedback) ? "define the key claim precisely" : "make the inferential chain explicit"
  return { id:`retry-${Date.now()}-${Math.random().toString(36).slice(2,7)}`, replayId:args.replayId, course:args.course, sourceTurnId:args.turnId, originalQuestion:args.question, originalAnswer:args.answer, feedback, target, createdAt:new Date().toISOString() }
}

export function retryVariant(moment:RetryMoment) {
  const stems = [
    `Try the same reasoning demand again, but this time ${moment.target}.`,
    `Now suppose one important condition changes. Re-answer while you ${moment.target}.`,
    `Give a fresh response without copying your previous wording; ${moment.target}.`,
  ]
  const index = Math.abs(moment.id.split("").reduce((sum,ch)=>sum+ch.charCodeAt(0),0)) % stems.length
  return `${stems[index]}\n\nOriginal interviewer prompt: ${moment.originalQuestion}`
}

export function spacedRetestDate(attempt:number, severity:"light"|"medium"|"high" = "medium") {
  const ladders = { high:[1,3,7,14], medium:[3,7,14,30], light:[7,14,30,60] }
  const days = ladders[severity][Math.min(Math.max(0,attempt),3)]
  return new Date(Date.now()+days*86_400_000).toISOString()
}

export function deriveInterviewProfile(replays:Array<{durationSeconds?:number;strengths?:string[];improvements?:string[];calibration?:{averageConfidence?:number|null;highConfidenceWeakAnswers?:number;lowConfidenceStrongAnswers?:number};turns?:Array<{role?:string;text?:string;feedback?:string;branchType?:string}>}>, retests:Array<{completedAt?:string}> = []):InterviewProfile {
  const candidateTurns = replays.flatMap(r => (r.turns ?? []).filter(t => t.role === "candidate"))
  const signalTotals = candidateTurns.map(t => reasoningSignals(t.text ?? ""))
  const ratio = (key:keyof ReturnType<typeof reasoningSignals>) => signalTotals.length ? signalTotals.filter(s=>s[key]).length/signalTotals.length : 0
  const feedbackText = candidateTurns.map(t=>t.feedback??"").join(" ").toLowerCase()
  const branchTurns = replays.flatMap(r => r.turns ?? []).filter(t => t.role === "interviewer")
  const adaptabilityBase = branchTurns.length ? branchTurns.filter(t => ["challenge","transfer","repair"].includes(t.branchType ?? "")).length/branchTurns.length : 0
  const avgWords = candidateTurns.length ? candidateTurns.reduce((sum,t)=>sum+words(t.text??"").length,0)/candidateTurns.length : 0
  const avgConfidence = replays.map(r=>r.calibration?.averageConfidence).filter((v):v is number=>typeof v==="number")
  const calibrationPenalties = replays.reduce((sum,r)=>sum+Number(r.calibration?.highConfidenceWeakAnswers??0)+Number(r.calibration?.lowConfidenceStrongAnswers??0),0)
  const repeated = replays.flatMap(r=>r.improvements??[]).map(x=>x.trim()).filter(Boolean)
  const counts = new Map<string,number>(); repeated.forEach(x=>counts.set(x,(counts.get(x)??0)+1))
  const repeatedPriorities = [...counts.entries()].sort((a,b)=>b[1]-a[1]).slice(0,5).map(([x])=>x)
  const strengths = [...new Set(replays.flatMap(r=>r.strengths??[]).filter(Boolean))].slice(0,8)
  const sessions = replays.length
  const completedRetests = retests.filter(r=>Boolean(r.completedAt)).length
  return {
    sessions,
    minutes:Math.round(replays.reduce((sum,r)=>sum+Number(r.durationSeconds??0),0)/60),
    reasoning:clamp(30+ratio("causal")*35+ratio("assumptions")*20+ratio("checking")*15),
    precision:clamp(35+ratio("checking")*35+(/precise|definition|clear/.test(feedbackText)?20:0)),
    adaptability:clamp(30+adaptabilityBase*45+ratio("revision")*25),
    independence:clamp(40+ratio("checking")*20+ratio("alternatives")*20+ratio("counterexamples")*20),
    evidenceUse:clamp(30+ratio("evidence")*55+ratio("causal")*15),
    communication:clamp(avgWords>=45&&avgWords<=220?78:avgWords>=25?62:45),
    recovery:clamp(35+ratio("revision")*45+ratio("checking")*20),
    calibration:clamp(avgConfidence.length?75-Math.min(45,calibrationPenalties*7):50),
    retention:clamp(35+Math.min(65,completedRetests*12)),
    repeatedPriorities,
    strongestEvidence:strengths,
    updatedAt:new Date().toISOString(),
  }
}

export function prepBlock(minutes:number, weakest:string[] = []) {
  const target = weakest[0] || "reasoning under challenge"
  if (minutes <= 15) return [
    {label:"Retrieval",minutes:3,href:"/daily-challenge"},
    {label:`Repair: ${target}`,minutes:5,href:"/tutor-autopilot"},
    {label:"Micro interview",minutes:7,href:"/gemini-live-interview"},
  ]
  if (minutes <= 30) return [
    {label:"Retrieval",minutes:5,href:"/daily-challenge"},
    {label:`Targeted repair: ${target}`,minutes:8,href:"/tutor-autopilot"},
    {label:"Unseen material",minutes:7,href:"/unseen-lab"},
    {label:"Live interview",minutes:10,href:"/gemini-live-interview"},
  ]
  return [
    {label:"Retrieval",minutes:5,href:"/daily-challenge"},
    {label:`Weak-area repair: ${target}`,minutes:10,href:"/tutor-autopilot"},
    {label:"Live interview",minutes:Math.min(20,Math.max(12,minutes-25)),href:"/gemini-live-interview"},
    {label:"Unseen / transfer",minutes:5,href:"/unseen-lab"},
    {label:"Replay + reflection",minutes:5,href:"/reasoning-replay"},
  ]
}

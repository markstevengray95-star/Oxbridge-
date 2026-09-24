export type ReasoningSignal = "assumption" | "counterexample" | "self-correction" | "sanity-check" | "hypothesis" | "premature-conclusion" | "definition" | "transfer"

export type TwinSnapshot = {
  independence: number
  adaptability: number
  retention: number
  transfer: number
  calibration: number
  consistency: number
  readingDepth: number
  applicationDefence: number
  updatedAt: string
}

export type EvidenceItem = {
  id: string
  type: "statement" | "written-work" | "reading" | "research" | "certificate" | "competition" | "reflection"
  title: string
  detail: string
  tags: string[]
  createdAt: string
}

export type SourceNote = {
  id: string
  title: string
  sourceType: "book" | "article" | "lecture" | "paper" | "podcast" | "video"
  centralArgument: string
  strongestEvidence: string
  weakness: string
  questionRaised: string
  connection: string
  opinion: string
  createdAt: string
}

export const TWIN_KEY = "oxbridge-digital-twin-v2"
export const EVIDENCE_KEY = "oxbridge-evidence-locker-v2"
export const SOURCE_NOTEBOOK_KEY = "oxbridge-source-notebook-v2"
export const PERSONAL_STATEMENT_KEY = "oxbridge-personal-statement-v2"
export const WHITEBOARD_KEY = "oxbridge-whiteboard-sessions-v2"
export const OFFLINE_PACK_KEY = "oxbridge-offline-pack-v2"
export const TEACHER_QUEUE_KEY = "oxbridge-teacher-live-queue-v2"

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)))

export function defaultTwin(): TwinSnapshot {
  return { independence: 45, adaptability: 45, retention: 45, transfer: 40, calibration: 50, consistency: 45, readingDepth: 35, applicationDefence: 30, updatedAt: new Date().toISOString() }
}

export function deriveTwin(progress: Record<string, unknown> = {}): TwinSnapshot {
  const base = defaultTwin()
  const scores = Array.isArray(progress.interviewScores) ? progress.interviewScores.filter((x): x is number => typeof x === "number") : []
  const recent = scores.slice(-6)
  const avg = recent.length ? recent.reduce((a,b)=>a+b,0)/recent.length : 50
  const spread = recent.length > 1 ? Math.max(...recent)-Math.min(...recent) : 20
  const logs = Array.isArray(progress.logs) ? progress.logs : []
  const reading = Number(progress.readingReflections ?? 0)
  const transfer = Number(progress.transferScore ?? progress.transfer ?? 40)
  const hints = Number(progress.hintDependence ?? 50)
  return {
    independence: clamp(100-hints*.65 + avg*.25),
    adaptability: clamp(avg*.7 + Number(progress.adaptability ?? 15)),
    retention: clamp(Number(progress.retention ?? 45)),
    transfer: clamp(transfer),
    calibration: clamp(Number(progress.calibration ?? 50)),
    consistency: clamp(100-spread),
    readingDepth: clamp(reading ? 45 + Math.min(50, reading*6) : base.readingDepth),
    applicationDefence: clamp(logs.length ? 35 + Math.min(55, logs.length*2) : base.applicationDefence),
    updatedAt: new Date().toISOString(),
  }
}

export function detectReasoningSignals(text: string): ReasoningSignal[] {
  const t = text.toLowerCase()
  const signals: ReasoningSignal[] = []
  if (/assum(e|ing|ption)/.test(t)) signals.push("assumption")
  if (/counterexample|counter-example|except when|fails when/.test(t)) signals.push("counterexample")
  if (/actually|i would revise|i need to change|on reflection|correction/.test(t)) signals.push("self-correction")
  if (/check|units|limit|order of magnitude|reasonable|sanity/.test(t)) signals.push("sanity-check")
  if (/hypothesis|one possibility|could be|might be/.test(t)) signals.push("hypothesis")
  if (/obviously|clearly|must be/.test(t) && !/because|therefore|since/.test(t)) signals.push("premature-conclusion")
  if (/define|definition|by .* i mean/.test(t)) signals.push("definition")
  if (/another context|similarly|by analogy|transfer/.test(t)) signals.push("transfer")
  return signals
}

export function fifteenMinutePlan(twin: TwinSnapshot) {
  const weakest = Object.entries(twin).filter(([k])=>k!=="updatedAt").sort((a,b)=>Number(a[1])-Number(b[1]))[0]?.[0] ?? "independence"
  if (weakest === "readingDepth") return { title:"15-minute academic reading sprint", href:"/reading-room", steps:["6 min unfamiliar extract","4 min annotate argument/evidence","5 min defend one claim aloud"] }
  if (weakest === "applicationDefence") return { title:"15-minute application defence", href:"/personal-statement-defence", steps:["Choose one claim","Generate two challenges","Answer one without notes"] }
  if (weakest === "retention") return { title:"15-minute retention retest", href:"/tutor-autopilot", steps:["Recall without notes","Answer changed-context question","Record confidence"] }
  return { title:"15-minute reasoning workout", href:"/socratic-whiteboard", steps:["Solve one unfamiliar prompt","Think aloud","Check assumptions and limiting cases"] }
}

export function makeTransferPrompt(topic: string) {
  const contexts = ["a graph with one hidden variable", "an unfamiliar experimental setup", "a real-world estimation problem", "a short conflicting dataset", "a different representation of the same relationship"]
  const context = contexts[Math.abs(topic.split("").reduce((a,c)=>a+c.charCodeAt(0),0)) % contexts.length]
  return `Apply ${topic || "the idea"} to ${context}. Do not reuse the original worked method unless you can justify why it transfers.`
}

export type SessionLike = {
  id?: string
  title?: string
  score?: number
  date?: string
  events?: string[]
  dimensions?: { reasoning?: number; subject?: number; flexibility?: number; clarity?: number }
}

export type ArgumentMap = {
  claims: string[]
  evidence: string[]
  assumptions: string[]
  counterpoints: string[]
  conclusions: string[]
}

const sentenceSplit = (text: string) => text.split(/(?<=[.!?])\s+/).map(x => x.trim()).filter(Boolean)

export function candidateTextFromSession(session: SessionLike) {
  return (session.events ?? [])
    .filter(event => /^(You|Candidate):/i.test(event))
    .map(event => event.replace(/^(You|Candidate):\s*/i, ""))
    .join(" ")
}

export function buildArgumentMap(text: string): ArgumentMap {
  const sentences = sentenceSplit(text)
  const claims: string[] = [], evidence: string[] = [], assumptions: string[] = [], counterpoints: string[] = [], conclusions: string[] = []
  for (const sentence of sentences) {
    const lower = sentence.toLowerCase()
    if (/\b(because|evidence|data|shows?|suggests?|observed|study|example)\b/.test(lower)) evidence.push(sentence)
    if (/\b(assum|suppos|provided that|if we take|holding .* constant|given that)\b/.test(lower)) assumptions.push(sentence)
    if (/\b(however|although|on the other hand|counter|alternative|unless|but )\b/.test(lower)) counterpoints.push(sentence)
    if (/\b(therefore|hence|so i (?:think|would|conclude)|overall|in conclusion|this implies)\b/.test(lower)) conclusions.push(sentence)
    if (!/\b(because|therefore|hence|however|although|assum|suppos|evidence|example)\b/.test(lower)) claims.push(sentence)
  }
  if (!claims.length && sentences.length) claims.push(sentences[0])
  return { claims: claims.slice(0, 8), evidence: evidence.slice(0, 8), assumptions: assumptions.slice(0, 8), counterpoints: counterpoints.slice(0, 8), conclusions: conclusions.slice(0, 8) }
}

export type ReasoningFingerprint = {
  label: string
  score: number
  evidence: string
  action: string
}

export function fingerprintFromSessions(sessions: SessionLike[]): ReasoningFingerprint[] {
  const recent = sessions.slice(0, 12)
  const texts = recent.map(candidateTextFromSession)
  const joined = texts.join(" ").toLowerCase()
  const count = (re: RegExp) => (joined.match(re) ?? []).length
  const totalWords = Math.max(1, joined.split(/\s+/).filter(Boolean).length)
  const perThousand = (n: number) => Math.min(100, Math.round(n / totalWords * 1000 * 10))
  const avg = (key: "reasoning"|"subject"|"flexibility"|"clarity") => {
    const values = recent.map(s => s.dimensions?.[key]).filter((v): v is number => typeof v === "number")
    return values.length ? Math.round(values.reduce((a,b)=>a+b,0)/values.length * 4) : 0
  }
  const assumption = perThousand(count(/\b(assum|suppos|given|provided that)\w*/g))
  const counter = perThousand(count(/\b(however|although|alternative|counter|unless)\w*/g))
  const causal = perThousand(count(/\b(because|therefore|hence|implies|since)\b/g))
  const examples = perThousand(count(/\b(example|case|for instance|consider)\b/g))
  return [
    { label:"Visible reasoning", score:Math.max(causal,avg("reasoning")), evidence:"Use of explicit inferential links plus reasoning dimension across recent interviews.", action:"State why each step follows before moving to the next claim." },
    { label:"Assumption awareness", score:assumption, evidence:"Frequency of explicit assumptions and conditions in recent candidate turns.", action:"Name the assumption most likely to fail and test the argument without it." },
    { label:"Counterexample habit", score:Math.max(counter,avg("flexibility")), evidence:"Counterarguments, alternatives and flexibility scores across recent sessions.", action:"Before concluding, generate one serious alternative or edge case." },
    { label:"Example testing", score:examples, evidence:"Use of examples/cases as tests rather than decorative references.", action:"Use a simple case to test the rule, then return to the general claim." },
    { label:"Subject connection", score:avg("subject"), evidence:"Average recent subject-use dimension.", action:"Bring in the most diagnostic subject concept rather than listing everything you know." },
    { label:"Communication", score:avg("clarity"), evidence:"Average recent clarity/communication dimension.", action:"Use shorter claim → reason → test → conclusion units." },
  ]
}

export type MisconceptionNode = { name: string; count: number; related: string[]; intervention: string }

export function misconceptionNetwork(misconceptions: Record<string,number>, mistakes: Record<string,number>): MisconceptionNode[] {
  const combined = new Map<string,number>()
  for (const [k,v] of Object.entries(misconceptions ?? {})) combined.set(k,(combined.get(k)??0)+Number(v||0))
  for (const [k,v] of Object.entries(mistakes ?? {})) combined.set(k,(combined.get(k)??0)+Number(v||0))
  const entries = [...combined.entries()].filter(([,v])=>v>0).sort((a,b)=>b[1]-a[1]).slice(0,12)
  const family = (name:string) => /assum/i.test(name)?"assumption":/logic|reason/i.test(name)?"logic":/knowledge|subject/i.test(name)?"knowledge":/misread|question/i.test(name)?"reading":/calcul|number/i.test(name)?"calculation":/time/i.test(name)?"timing":"communication"
  const interventions: Record<string,string> = {
    assumption:"Complete a three-question assumption drill: state the hidden condition, remove it, then repair the argument.",
    logic:"Rebuild one answer as numbered inferential steps and justify every arrow between them.",
    knowledge:"Do a short concept retrieval lesson, then immediately apply the concept to an unfamiliar case.",
    reading:"Underline the task word, constraints and target quantity before choosing a method.",
    calculation:"Estimate first, calculate second, and finish with units/magnitude checking.",
    timing:"Use a forced decision point: continue, flag, or move on when the time budget is reached.",
    communication:"Re-answer using claim → reason → test → provisional conclusion in under 90 seconds.",
  }
  return entries.map(([name,count])=>{
    const f=family(name)
    return { name,count,related:entries.filter(([other])=>other!==name&&family(other)===f).map(([other])=>other).slice(0,3),intervention:interventions[f] }
  })
}

export function interventionPlan(node: MisconceptionNode) {
  return [
    `Diagnose: reproduce one recent ${node.name.toLowerCase()} error and explain exactly why it happened.`,
    `Rebuild: ${node.intervention}`,
    "Transfer: solve a fresh problem that looks different but depends on the same reasoning skill.",
    "Interview check: explain the method aloud while an interviewer changes one condition.",
    "Close the loop: return to the original error after a delay and record whether the mistake recurs.",
  ]
}

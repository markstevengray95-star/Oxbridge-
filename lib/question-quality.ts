import type { TestQuestion } from "@/lib/oxbridge-data"

export type QualityIssue = { severity:"error"|"warning"; id:string; test:string; message:string }
export type QuestionQualitySignals = {
  correctIsUniqueLongest: boolean
  correctLengthRatio: number
  extremeDistractorCount: number
  optionLengthSpread: number
  reasoningStem: boolean
  discriminationScore: number
}

const normalise = (text:string) => text.toLowerCase().replace(/\d+(?:\.\d+)?/g,"#").replace(/[^a-z#]+/g," ").replace(/\s+/g," ").trim()
const EXTREME_WORDS = /\b(always|never|every|everyone|entirely|completely|guarantees?|must|impossible|meaningless|automatically|only|all|none)\b/i
const REASONING_STEM = /\b(best|most|least|assumption|inference|conclusion|weakens?|strengthens?|supported|necessarily|defensible|evidence|explain|justify|follows|consistent|counterexample|limitation|reasoning)\b/i
const MULTI_STEP_LANGUAGE = /\b(suppose|given that|assuming|however|therefore|which statement|which conclusion|which criticism|which response|from the information|compared with|changes? from|after|before|if .* then)\b/i

function hashString(value:string) {
  let hash = 2166136261
  for (let i=0;i<value.length;i++) {
    hash ^= value.charCodeAt(i)
    hash = Math.imul(hash,16777619)
  }
  return hash >>> 0
}

function rng(seed:number) {
  let state = seed >>> 0
  return () => {
    state += 0x6D2B79F5
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function shuffle<T>(items:T[], seed:number) {
  const result = [...items]
  const random = rng(seed)
  for (let i=result.length-1;i>0;i--) {
    const j = Math.floor(random()*(i+1))
    ;[result[i],result[j]] = [result[j],result[i]]
  }
  return result
}

function optionLength(text:string) {
  return text.replace(/\s+/g," ").trim().length
}

function numericLikeOption(text:string) {
  return /^[\s£$€¥+−-]*\d[\d\s.,/%²³^×÷*()A-Za-zΩμ⁻]*$/.test(text.trim())
}

function optionKey(text:string) {
  return text.replace(/\s+/g," ").trim().toLowerCase()
}

function generatedNearMiss(correct:string, attempt:number) {
  const match = correct.trim().match(/^([£$€¥]?)(-?\d+(?:\.\d+)?)(.*)$/)
  if (match) {
    const [,prefix,raw,suffix] = match
    const value = Number(raw)
    if (Number.isFinite(value)) {
      const decimals = raw.includes(".") ? Math.min(3,raw.split(".")[1].length) : 0
      const offsets = value === 0 ? [1,-1,2,-2] : [0.1,-0.1,0.25,-0.25]
      const delta = offsets[attempt%offsets.length]
      const candidate = value === 0 ? delta : value*(1+delta)
      const rendered = decimals ? candidate.toFixed(decimals) : String(Math.round(candidate))
      if (Number(rendered)!==value) return `${prefix}${rendered}${suffix}`
    }
  }
  const textFallbacks = [
    "The evidence points in that direction, but it does not establish the decisive step needed for this conclusion.",
    "The conclusion is plausible under an extra assumption, but that assumption is not secured by the information given.",
    "This identifies a relevant consideration, but it is not the option most directly supported by the question.",
    "This would follow only if an additional condition held; that condition is not stated here.",
  ]
  return textFallbacks[attempt%textFallbacks.length]
}

/** Repair accidental duplicate options created by parameterised question templates. */
export function ensureUniqueOptions(q:TestQuestion):TestQuestion {
  if (!Array.isArray(q.options) || q.options.length<2 || q.answer<0 || q.answer>=q.options.length) return q
  const correct = q.options[q.answer]
  const rebuilt:string[] = []
  const used = new Set<string>()
  let repaired = false
  for (let index=0;index<q.options.length;index++) {
    let option = q.options[index]
    let key = optionKey(option)
    if (used.has(key)) {
      repaired = true
      let attempt = index + hashString(q.id)%7
      do {
        option = generatedNearMiss(correct,attempt++)
        key = optionKey(option)
      } while (used.has(key) && attempt<index+20)
    }
    used.add(key)
    rebuilt.push(option)
  }
  if (!repaired) return q
  // The correct option itself is never replaced: a duplicate encountered later is the
  // distractor that gets regenerated, so the original answer index remains valid.
  return { ...q, options:rebuilt }
}

export function questionQualitySignals(q:TestQuestion):QuestionQualitySignals {
  const lengths = q.options.map(optionLength)
  const correctLength = lengths[q.answer] ?? 0
  const distractorLengths = lengths.filter((_,index)=>index!==q.answer)
  const longestDistractor = Math.max(1,...distractorLengths)
  const shortest = Math.max(1,Math.min(...lengths))
  const longest = Math.max(...lengths,1)
  const correctIsUniqueLongest = correctLength > longestDistractor && correctLength-longestDistractor >= 8 && correctLength/longestDistractor >= 1.18
  const correctLengthRatio = correctLength / Math.max(1,distractorLengths.reduce((a,b)=>a+b,0)/Math.max(1,distractorLengths.length))
  const extremeDistractorCount = q.options.filter((option,index)=>index!==q.answer && EXTREME_WORDS.test(option)).length
  const reasoningStem = REASONING_STEM.test(q.prompt)
  const optionLengthSpread = longest/shortest
  const numericOptions = q.options.length>1 && q.options.every(numericLikeOption)
  const directOneStep = numericOptions && q.prompt.length<120 && /\b(what is|how many|calculate|find)\b/i.test(q.prompt) && !MULTI_STEP_LANGUAGE.test(q.prompt)
  const equationCount = (q.prompt.match(/[=<>≤≥]/g)??[]).length
  const duplicateCount = q.options.length-new Set(q.options.map(optionKey)).size

  let discriminationScore = q.difficulty === "Challenge" ? 1.35 : q.difficulty === "Stretch" ? 0.9 : 0.45
  if (reasoningStem) discriminationScore += 1.5
  if (MULTI_STEP_LANGUAGE.test(q.prompt)) discriminationScore += 0.55
  if (q.prompt.length >= 100) discriminationScore += 0.45
  if (q.prompt.length >= 180) discriminationScore += 0.45
  if (q.prompt.includes("\n")) discriminationScore += 0.35
  if (equationCount>=2) discriminationScore += 0.4
  if (directOneStep) discriminationScore -= 0.9
  if (correctIsUniqueLongest) discriminationScore -= 2.2
  if (correctLengthRatio > 1.55) discriminationScore -= 1.1
  if (optionLengthSpread > 3.2) discriminationScore -= 0.7
  if (extremeDistractorCount >= 2) discriminationScore -= 1.2
  if (q.options.some((option,index)=>index!==q.answer && option.length < 8)) discriminationScore -= 0.4
  if (duplicateCount) discriminationScore -= 4

  return { correctIsUniqueLongest, correctLengthRatio, extremeDistractorCount, optionLengthSpread, reasoningStem, discriminationScore }
}

function plausibleNearMisses(q:TestQuestion) {
  const prompt = q.prompt.toLowerCase()
  if (q.test === "TARA" && /weakens?|caus/.test(prompt)) return [
    "The observed change is real, but the evidence does not show how large the effect is in other settings.",
    "The proposed explanation is plausible, but the argument does not describe the mechanism in detail.",
    "The evidence comes from one setting, so the result may not generalise to every comparable case.",
  ]
  if (q.test === "LNAT" && /main (argument|conclusion)|best captures/.test(prompt)) return [
    "The policy has a genuine benefit, so the qualifications identified in the passage should usually be treated as secondary.",
    "The practical limitations are serious enough that the policy should normally be rejected unless they can all be removed.",
    "The central issue is the intention behind the policy rather than the practical consequences discussed in the passage.",
  ]
  if (q.test === "LNAT" && /assumption/.test(prompt)) return [
    "That the policy has at least some supporters, even if the reasons they give differ from the author's reasons.",
    "That the practical problem described could be measured accurately enough to compare different cases.",
    "That an alternative policy might achieve a similar aim by a different route, even if the passage does not discuss it.",
  ]
  if (q.test === "LNAT" && /strengthen/.test(prompt)) return [
    "Evidence that the policy is popular with the people who already support its stated aim.",
    "Evidence that the issue described also occurs in a different context for reasons the passage does not examine.",
    "Evidence that restates the author's conclusion without testing the mechanism on which the argument depends.",
  ]
  if (q.test === "UCAT" && q.section === "Situational Judgement") return [
    "Speak privately to the person involved first and wait to see whether they resolve it themselves before taking any further action.",
    "Raise the issue with the whole group immediately so that everyone is aware and responsibility is shared.",
    "Finish the immediate task first and report the issue afterwards so that the group's work is not disrupted.",
  ]
  return null
}

export function strengthenDistractors(q:TestQuestion):TestQuestion {
  const safe = ensureUniqueOptions(q)
  const signals = questionQualitySignals(safe)
  if (signals.extremeDistractorCount < 2 && !signals.correctIsUniqueLongest) return safe
  const replacements = plausibleNearMisses(safe)
  if (!replacements || safe.options.length !== 4) return safe
  const correct = safe.options[safe.answer]
  return ensureUniqueOptions({ ...safe, options:[correct,...replacements], answer:0 })
}

function answerPositionPlan(questions:TestQuestion[], seed:number) {
  const plans = new Map<number,number[]>()
  const byOptionCount = new Map<number,number>()
  for (const q of questions) byOptionCount.set(q.options.length,(byOptionCount.get(q.options.length)??0)+1)
  for (const [optionCount,count] of byOptionCount) {
    if (optionCount < 2) continue
    const random = rng(seed ^ optionCount*7919)
    const counts = Array(optionCount).fill(0) as number[]
    const positions:number[] = []
    for (let i=0;i<count;i++) {
      const recent = positions.slice(-2)
      const minCount = Math.min(...counts)
      const candidates = Array.from({length:optionCount},(_,index)=>index)
        .filter(index => !(recent.length===2 && recent[0]===index && recent[1]===index))
        .sort((a,b)=>(counts[a]-counts[b]) || (random()-.5))
      const nearMinimum = candidates.filter(index=>counts[index]<=minCount+1)
      const chosen = nearMinimum[Math.floor(random()*nearMinimum.length)] ?? candidates[0] ?? 0
      positions.push(chosen)
      counts[chosen] += 1
    }
    plans.set(optionCount,positions)
  }
  return plans
}

export function prepareQuestionSet(bank:TestQuestion[], seed=1):TestQuestion[] {
  const strengthened = bank.map(ensureUniqueOptions).map(strengthenDistractors).map(ensureUniqueOptions)
  const plans = answerPositionPlan(strengthened,seed)
  const offsets = new Map<number,number>()
  return strengthened.map((q,index)=>{
    if (!q.options.length || q.answer<0 || q.answer>=q.options.length) return q
    const correct = q.options[q.answer]
    const distractors = q.options.filter((_,optionIndex)=>optionIndex!==q.answer)
    const mixedDistractors = shuffle(distractors,hashString(`${q.id}:${seed}:${index}`))
    const offset = offsets.get(q.options.length)??0
    const target = plans.get(q.options.length)?.[offset] ?? (hashString(`${q.id}:position:${seed}`)%q.options.length)
    offsets.set(q.options.length,offset+1)
    const options = [...mixedDistractors]
    options.splice(target,0,correct)
    return { ...q, options, answer:target }
  })
}

function sectionCompatible(a:string,b:string,test:string) {
  if (a===b) return true
  if (test === "LNAT") return /passage|argument/i.test(a) && /passage|argument/i.test(b)
  return false
}

export function strengthenQuestionSelection(primary:TestQuestion[], fallbackPool:TestQuestion[], seed=1):TestQuestion[] {
  if (!primary.length) return []
  const used = new Set<string>()
  const random = rng(seed)
  const rankedFallback = fallbackPool
    .filter(candidate=>!primary.some(q=>q.id===candidate.id))
    .map(candidate=>({ candidate, score:questionQualitySignals(candidate).discriminationScore + random()*0.35 }))
    .sort((a,b)=>b.score-a.score)

  const selected = primary.map(original=>{
    const originalScore = questionQualitySignals(original).discriminationScore
    if (originalScore >= 2) { used.add(original.id); return original }
    const replacement = rankedFallback.find(({candidate,score}) =>
      !used.has(candidate.id) &&
      candidate.test===original.test &&
      sectionCompatible(candidate.section,original.section,original.test) &&
      score >= Math.max(2.15,originalScore+0.35)
    )?.candidate
    const chosen = replacement ?? original
    used.add(chosen.id)
    return chosen
  })

  return prepareQuestionSet(selected,seed)
}

export function auditAnswerPatterns(bank:TestQuestion[]) {
  const positionCounts:Record<string,number> = {}
  let uniquelyLongestCorrect = 0
  let extremeDistractorQuestions = 0
  let lowDiscrimination = 0
  let longestRun = 0
  let run = 0
  let previous = -1

  for (const q of bank) {
    positionCounts[String(q.answer)] = (positionCounts[String(q.answer)]??0)+1
    const signals = questionQualitySignals(q)
    if (signals.correctIsUniqueLongest) uniquelyLongestCorrect += 1
    if (signals.extremeDistractorCount>=2) extremeDistractorQuestions += 1
    if (signals.discriminationScore<1.6) lowDiscrimination += 1
    if (q.answer===previous) run += 1
    else { previous=q.answer; run=1 }
    longestRun = Math.max(longestRun,run)
  }

  return {
    total:bank.length,
    positionCounts,
    uniquelyLongestCorrect,
    uniquelyLongestCorrectRate:bank.length?Math.round(uniquelyLongestCorrect/bank.length*1000)/10:0,
    extremeDistractorQuestions,
    lowDiscrimination,
    longestSamePositionRun:longestRun,
  }
}

export function validateQuestionBank(bank: TestQuestion[]) {
  const issues: QualityIssue[] = []
  const ids = new Map<string,number>()
  const exactPrompts = new Map<string,string[]>()
  const stems = new Map<string,string[]>()

  for (const q of bank) {
    ids.set(q.id,(ids.get(q.id)??0)+1)
    const exact=q.prompt.trim().toLowerCase()
    exactPrompts.set(exact,[...(exactPrompts.get(exact)??[]),q.id])
    const stem=normalise(q.prompt)
    stems.set(stem,[...(stems.get(stem)??[]),q.id])
    if (!q.prompt.trim()) issues.push({severity:"error",id:q.id,test:q.test,message:"Question prompt is empty."})
    if (!Array.isArray(q.options) || q.options.length < 2) issues.push({severity:"error",id:q.id,test:q.test,message:"Question has fewer than two answer options."})
    if (q.answer < 0 || q.answer >= q.options.length) issues.push({severity:"error",id:q.id,test:q.test,message:"Answer index is outside the option list."})
    if (new Set(q.options.map(optionKey)).size !== q.options.length) issues.push({severity:"error",id:q.id,test:q.test,message:"Question contains duplicate answer options."})
    if (!q.explanation?.trim()) issues.push({severity:"warning",id:q.id,test:q.test,message:"Explanation is empty."})
    if (q.prompt.length < 20) issues.push({severity:"warning",id:q.id,test:q.test,message:"Prompt is unusually short; review for ambiguity."})
    if (q.options.some(opt=>opt.trim().length===0)) issues.push({severity:"error",id:q.id,test:q.test,message:"One or more options are blank."})
    const signals = questionQualitySignals(q)
    if (signals.correctIsUniqueLongest) issues.push({severity:"warning",id:q.id,test:q.test,message:"Correct answer is conspicuously longer than every distractor."})
    if (signals.extremeDistractorCount>=2) issues.push({severity:"warning",id:q.id,test:q.test,message:"Multiple distractors use absolute/extreme wording and may be too easy to eliminate."})
    if (signals.discriminationScore<1.15) issues.push({severity:"warning",id:q.id,test:q.test,message:"Low-discrimination item: consider a multi-step stem or more plausible near-miss distractors."})
  }

  for (const [id,count] of ids) if (count>1) issues.push({severity:"error",id,test:"Multiple",message:`Duplicate question id appears ${count} times.`})
  for (const [,list] of exactPrompts) if (list.length>1) list.slice(1).forEach(id=>issues.push({severity:"warning",id,test:bank.find(q=>q.id===id)?.test??"Unknown",message:`Exact prompt duplicate of ${list[0]}.`}))
  for (const [,list] of stems) if (list.length>4) list.slice(4).forEach(id=>issues.push({severity:"warning",id,test:bank.find(q=>q.id===id)?.test??"Unknown",message:`Highly repeated prompt template; same normalised stem appears ${list.length} times.`}))

  const byTest = Object.fromEntries(Array.from(new Set(bank.map(q=>q.test))).map(test=>{
    const qs=bank.filter(q=>q.test===test)
    return [test,{ total:qs.length, sections:Array.from(new Set(qs.map(q=>q.section))).length, foundation:qs.filter(q=>q.difficulty==="Foundation").length, stretch:qs.filter(q=>q.difficulty==="Stretch").length, challenge:qs.filter(q=>q.difficulty==="Challenge").length, issues:issues.filter(i=>i.test===test).length, answerPatterns:auditAnswerPatterns(qs) }]
  }))
  return { issues, byTest, total:bank.length, errorCount:issues.filter(i=>i.severity==="error").length, warningCount:issues.filter(i=>i.severity==="warning").length, answerPatterns:auditAnswerPatterns(bank) }
}

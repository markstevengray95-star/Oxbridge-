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
export type ChoiceDiagnostic = { label:string; feedback:string }

const normalise = (text:string) => text.toLowerCase().replace(/\d+(?:\.\d+)?/g,"#").replace(/[^a-z#]+/g," ").replace(/\s+/g," ").trim()
const EXTREME_WORDS = /\b(always|never|every|everyone|entirely|completely|guarantees?|must|impossible|meaningless|automatically|only|all|none)\b/i
const REASONING_STEM = /\b(best|most|least|assumption|inference|conclusion|weakens?|strengthens?|supported|necessarily|defensible|evidence|explain|justify|follows|consistent|counterexample|limitation|reasoning|result and reasoning)\b/i
const MULTI_STEP_LANGUAGE = /\b(suppose|given that|assuming|however|therefore|which statement|which conclusion|which criticism|which response|from the information|compared with|changes? from|after|before|if .* then|result and reasoning|both the result)\b/i
const ROUTE_MARKER = " — reasoning: "

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
  return text.split(ROUTE_MARKER)[0].replace(/\s+/g," ").trim().toLowerCase()
}

function firstNumber(text:string) {
  const match = text.replace(/,/g,"").match(/-?\d+(?:\.\d+)?/)
  return match ? Number(match[0]) : null
}

function close(a:number|null,b:number, tolerance=0.011) {
  return a !== null && Number.isFinite(a) && Math.abs(a-b) <= Math.max(tolerance,Math.abs(b)*0.0005)
}

function generatedNearMiss(correct:string, attempt:number) {
  const base = correct.split(ROUTE_MARKER)[0]
  const match = base.trim().match(/^([£$€¥]?)(-?\d+(?:\.\d+)?)(.*)$/)
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
  const rebuilt = [...q.options]
  const used = new Set<string>([optionKey(correct)])
  let repaired = false
  for (let index=0;index<q.options.length;index++) {
    if (index===q.answer) continue
    let option = q.options[index]
    let key = optionKey(option)
    if (used.has(key)) {
      repaired = true
      let attempt = index + hashString(q.id)%7
      do {
        option = generatedNearMiss(correct,attempt++)
        key = optionKey(option)
      } while (used.has(key) && attempt<index+24)
    }
    used.add(key)
    rebuilt[index] = option
  }
  return repaired ? { ...q, options:rebuilt } : q
}

function structuredReasoningRoute(q:TestQuestion, option:string, optionIndex:number) {
  const value = firstNumber(option)
  const correct = optionIndex===q.answer
  if (correct) {
    if (q.id.startsWith("legacy2-tmua-ak-quadratic-")) return "solve for both roots first, then compare the two root values"
    if (q.id.startsWith("legacy2-tmua-ak-sequence-")) return "find the common difference from the known term gap, recover the first term, then advance to the requested term"
    if (q.id.startsWith("legacy2-esat-m1-")) return "use Δy = mΔx, then apply that horizontal change to the known x-coordinate"
    if (q.id.startsWith("legacy2-esat-m2-")) return "expand the required expression and substitute both Vieta relationships"
    if (q.id.startsWith("legacy2-esat-physics-motion-")) return "calculate acceleration from change in velocity over time, then use F = ma"
    if (q.id.startsWith("legacy2-esat-physics-circuit-")) return "find the series current from total resistance, then use P = I²R for the named resistor"
    if (q.id.startsWith("legacy2-esat-chemistry-")) return "convert mass to moles, apply the stoichiometric ratio, then divide product moles by solution volume"
    if (q.id.startsWith("legacy2-tara-ps-")) return "apply the first percentage to the original amount, then apply the second fraction to the remainder"
    if (q.id.startsWith("legacy2-ucat-dm-")) return "update both the favourable and total counts after the first draw, then multiply the conditional probabilities"
    if (q.id.startsWith("legacy2-ucat-qr-")) return "apply the percentage increase first, then reserve the stated percentage of the new capacity"
    return null
  }

  if (q.id.startsWith("legacy2-tmua-ak-quadratic-")) {
    if (/β\s*−\s*α\s*=\s*2/.test(option)) return "uses the distance from the centre to one root rather than the full separation between both roots"
    if (/α\s*\+\s*β/.test(option)) return "switches from the requested root separation to a root-sum calculation"
    if (/αβ/.test(option)) return "switches from the requested root separation to a root-product calculation"
  }

  if (q.id.startsWith("legacy2-tmua-ak-sequence-")) {
    const match = q.prompt.match(/has (\d+)th term (-?\d+(?:\.\d+)?) and (\d+)th term (-?\d+(?:\.\d+)?).*its (\d+)th term/i)
    if (match) {
      const p=Number(match[1]), ap=Number(match[2]), qn=Number(match[3]), aq=Number(match[4]), targetN=Number(match[5])
      const d=(aq-ap)/(qn-p), first=ap-(p-1)*d, target=first+(targetN-1)*d
      if (close(value,target-d)) return "uses one too few common-difference intervals when moving to the requested term"
      if (close(value,target+d)) return "uses one too many common-difference intervals when moving to the requested term"
      return "treats the term number as the number of intervals from the first term rather than using n − 1"
    }
  }

  if (q.id.startsWith("legacy2-esat-m1-")) {
    const match = q.prompt.match(/gradient ([-\d.]+).*passes through \(([-\d.]+), ([-\d.]+)\).*y-coordinate ([-\d.]+)/i)
    if (match) {
      const m=Number(match[1]), x=Number(match[2]), y=Number(match[3]), newY=Number(match[4]), c=y-m*x
      if (close(value,x+1)) return "assumes the y-change corresponds to a single x-step without using the gradient"
      if (close(value,x+m)) return "adds the gradient directly to the x-coordinate instead of using it as Δy/Δx"
      if (close(value,newY-c)) return "uses y − c but misses the final division by the gradient"
    }
  }

  if (q.id.startsWith("legacy2-esat-m2-")) {
    const match = q.prompt.match(/x²\s*−\s*([\d.]+)x\s*\+\s*([\d.]+)/i)
    if (match) {
      const sum=Number(match[1]), product=Number(match[2])
      if (close(value,product+1)) return "keeps αβ and the constant term but omits the α + β contribution"
      if (close(value,product+sum-1)) return "expands the product but changes the final +1 into −1"
      if (close(value,sum+1)) return "uses the root sum but drops the αβ term"
    }
  }

  if (q.id.startsWith("legacy2-esat-physics-motion-")) {
    const match = q.prompt.match(/A ([\d.]+) kg trolley.*from ([\d.]+) m s⁻¹ to ([\d.]+) m s⁻¹ in ([\d.]+) s/i)
    if (match) {
      const m=Number(match[1]), u=Number(match[2]), v=Number(match[3]), t=Number(match[4])
      if (close(value,m*(v-u))) return "finds momentum change per kilogram but forgets to divide the velocity change by time before using F = ma"
      if (close(value,m*v/t)) return "uses final speed rather than change in velocity when calculating acceleration"
      if (close(value,m*(v+u)/(2*t))) return "uses average speed divided by time as though it were acceleration"
    }
  }

  if (q.id.startsWith("legacy2-esat-physics-circuit-")) {
    const match = q.prompt.match(/Two resistors, ([\d.]+) Ω and ([\d.]+) Ω.*across a ([\d.]+) V/i)
    if (match) {
      const r1=Number(match[1]), r2=Number(match[2]), voltage=Number(match[3]), current=voltage/(r1+r2)
      if (close(value,voltage*voltage/r2)) return "assumes the full supply voltage is across the target resistor even though the resistors are in series"
      if (close(value,current*voltage)) return "calculates total circuit power rather than power in the named resistor"
      if (close(value,current*current*r1)) return "uses the correct series current but calculates the power in the other resistor"
    }
  }

  if (q.id.startsWith("legacy2-esat-chemistry-")) {
    const match = q.prompt.match(/A ([\d.]+) g.*Mᵣ = ([\d.]+).*produces ([\d.]+) mol.*make ([\d.]+) dm³/i)
    if (match) {
      const mass=Number(match[1]), mr=Number(match[2]), coeff=Number(match[3]), volume=Number(match[4]), reactant=mass/mr, product=reactant*coeff
      if (close(value,reactant/volume)) return "converts mass to moles correctly but ignores the stoichiometric product ratio"
      if (close(value,product*volume)) return "finds product moles but multiplies by solution volume instead of dividing by it"
      if (close(value,mass/volume)) return "treats mass as amount of substance and skips both molar-mass and stoichiometric conversion"
    }
  }

  if (q.id.startsWith("legacy2-tara-ps-")) {
    const match = q.prompt.match(/£([\d.]+).*spends ([\d.]+)%.*then (half|one quarter)/i)
    if (match) {
      const total=Number(match[1]), pct=Number(match[2]), frac=match[3].toLowerCase()==="half"?0.5:0.25, first=total*pct/100, remaining=total-first, second=remaining*frac
      if (close(value,remaining)) return "stops after the first spending stage and never applies the second fraction"
      if (close(value,total-second)) return "calculates the second-stage spend from the remainder but subtracts it from the original total"
      return "applies both percentages to the original budget instead of changing the base after stage one"
    }
  }

  if (q.id.startsWith("legacy2-ucat-dm-")) {
    if (/×/.test(option) && /\/(\d+).*×.*\/\1/.test(option.replace(/\s/g,""))) return "treats the two draws as if the first counter were replaced, so the denominator does not change"
    if (/\+/.test(option)) return "adds the two stage probabilities instead of multiplying the conditional probabilities"
    return "combines favourable cases and total cases with an altered denominator that does not represent two draws without replacement"
  }

  if (q.id.startsWith("legacy2-ucat-qr-")) {
    const match = q.prompt.match(/handled ([\d.]+) cases.*rises by ([\d.]+)%.*then ([\d.]+)% of the new capacity/i)
    if (match) {
      const original=Number(match[1]), inc=Number(match[2]), used=Number(match[3]), after=original*(1+inc/100)
      if (close(value,after)) return "stops after increasing capacity and does not remove the reserved share"
      if (close(value,original*(1-used/100))) return "removes the reserved share from the old capacity and ignores the increase"
      return "subtracts the two percentage rates as though both percentages used the same starting amount"
    }
  }

  return null
}

/**
 * Converts calculation-only options into result + reasoning alternatives.
 * Students therefore choose a complete method, not merely the nearest-looking number.
 */
export function deepenQuestionStructure(q:TestQuestion):TestQuestion {
  if (!q.options.length || q.options.some(option=>option.includes(ROUTE_MARKER))) return q
  const routes=q.options.map((option,index)=>structuredReasoningRoute(q,option,index))
  if (!routes.some(Boolean)) return q
  const options=q.options.map((option,index)=>routes[index]?`${option}${ROUTE_MARKER}${routes[index]}`:option)
  const prompt=/result and reasoning/i.test(q.prompt)?q.prompt:`${q.prompt}\n\nSelect the option in which both the result and the reasoning route are correct.`
  return { ...q, prompt, options }
}

export function choiceDiagnostic(q:TestQuestion, selected:number):ChoiceDiagnostic {
  if (selected===q.answer) return { label:"Secure reasoning chain", feedback:q.explanation }
  const option=q.options[selected]??""
  const route=option.includes(ROUTE_MARKER)?option.split(ROUTE_MARKER)[1]?.trim():structuredReasoningRoute(q,option,selected)
  if (route) return { label:"Reasoning-route error", feedback:`Your selected option ${route}. Rebuild the chain from the information in the stem, then compare it with the complete method in the explanation: ${q.explanation}` }
  if (q.test==="TARA") return { label:"Inference mismatch", feedback:`This option addresses a nearby consideration, but not the exact inference the question asks you to test. ${q.explanation}` }
  if (q.test==="LNAT") return { label:"Passage inference error", feedback:`This reading is plausible, but it is not the interpretation most strongly supported by the passage as a whole. ${q.explanation}` }
  if (q.test==="UCAT" && q.section==="Situational Judgement") return { label:"Proportionality / responsibility", feedback:`This response is superficially reasonable but is weaker on timing, proportionality or responsibility. ${q.explanation}` }
  if (q.test==="UCAT" && q.section==="Verbal Reasoning") return { label:"Evidence overreach", feedback:`This choice goes beyond, understates or redirects what the passage actually establishes. ${q.explanation}` }
  if (q.test==="ESAT" && q.section==="Biology") return { label:"Evidence interpretation", feedback:`This option overstates or understates what can be concluded from the data provided. ${q.explanation}` }
  return { label:"Method selection", feedback:`The selected option does not complete the required reasoning chain. ${q.explanation}` }
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
  const bareOptions=q.options.map(option=>option.split(ROUTE_MARKER)[0])
  const numericOptions = bareOptions.length>1 && bareOptions.every(numericLikeOption)
  const directOneStep = numericOptions && q.prompt.length<120 && /\b(what is|how many|calculate|find)\b/i.test(q.prompt) && !MULTI_STEP_LANGUAGE.test(q.prompt)
  const equationCount = (q.prompt.match(/[=<>≤≥]/g)??[]).length
  const duplicateCount = q.options.length-new Set(q.options.map(optionKey)).size
  const routeCount=q.options.filter(option=>option.includes(ROUTE_MARKER)).length

  let discriminationScore = q.difficulty === "Challenge" ? 1.35 : q.difficulty === "Stretch" ? 0.9 : 0.45
  if (reasoningStem) discriminationScore += 1.5
  if (MULTI_STEP_LANGUAGE.test(q.prompt)) discriminationScore += 0.55
  if (q.prompt.length >= 100) discriminationScore += 0.45
  if (q.prompt.length >= 180) discriminationScore += 0.45
  if (q.prompt.includes("\n")) discriminationScore += 0.35
  if (equationCount>=2) discriminationScore += 0.4
  if (routeCount>=3) discriminationScore += 0.8
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
  const strengthened = bank.map(ensureUniqueOptions).map(strengthenDistractors).map(ensureUniqueOptions).map(deepenQuestionStructure)
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

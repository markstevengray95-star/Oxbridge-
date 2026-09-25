import type { TestQuestion } from "@/lib/oxbridge-data"
import { prepareQuestionSet } from "@/lib/question-quality"

type TestName = TestQuestion["test"]
const difficulties: TestQuestion["difficulty"][] = ["Foundation", "Stretch", "Challenge"]

function hashString(value: string) {
  let hash = 2166136261
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function shuffle<T>(items: T[], seed: number) {
  const result = [...items]
  let state = seed >>> 0
  const random = () => {
    state += 0x6D2B79F5
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

function q(
  id: string,
  test: TestName,
  section: string,
  difficulty: TestQuestion["difficulty"],
  prompt: string,
  correct: string,
  distractors: [string, string, string],
  explanation: string,
): TestQuestion {
  const correctKey = `correct:${id}`
  const tagged = [{ key: correctKey, text: correct }, ...distractors.map((text, index) => ({ key: `d${index}:${id}`, text }))]
  const optionsTagged = shuffle(tagged, hashString(id))
  return {
    id,
    test,
    section,
    difficulty,
    prompt,
    options: optionsTagged.map(item => item.text),
    answer: optionsTagged.findIndex(item => item.key === correctKey),
    explanation,
  }
}

const bank: TestQuestion[] = []

// TMUA — questions require at least two linked steps or discrimination between close logical claims.
for (let i = 1; i <= 80; i += 1) {
  const a = 2 + (i % 5)
  const h = (i % 7) - 3
  const k = 2 + (i % 8)
  const target = k + a * 4
  bank.push(q(
    `legacy2-tmua-ak-quadratic-${i}`,
    "TMUA",
    "Applications of Mathematical Knowledge",
    difficulties[i % 3],
    `For real x, f(x) = ${a}(x − (${h}))² + ${k}. The equation f(x) = ${target} has two roots α < β. Which statement is correct?`,
    `β − α = 4`,
    [`β − α = 2`, `α + β = ${2 * h + 4}`, `αβ = ${h * h - 2}`],
    `f(x) = ${target} gives ${a}(x − (${h}))² = ${target - k}, so (x − (${h}))² = 4 and x = ${h} ± 2. Therefore the roots are four units apart.`,
  ))
}

for (let i = 1; i <= 80; i += 1) {
  const first = 3 + (i % 7)
  const d = 2 + (i % 5)
  const p = 4 + (i % 4)
  const qn = p + 3
  const ap = first + (p - 1) * d
  const aq = first + (qn - 1) * d
  const targetN = qn + 4
  const target = first + (targetN - 1) * d
  bank.push(q(
    `legacy2-tmua-ak-sequence-${i}`,
    "TMUA",
    "Applications of Mathematical Knowledge",
    difficulties[(i + 1) % 3],
    `An arithmetic sequence has ${p}th term ${ap} and ${qn}th term ${aq}. What is its ${targetN}th term?`,
    String(target),
    [String(target - d), String(target + d), String(first + targetN * d)],
    `The term increases by ${aq - ap} over ${qn - p} steps, so the common difference is ${d}. Working backwards gives first term ${first}, then a${targetN} = ${first} + ${targetN - 1}×${d} = ${target}.`,
  ))
}

const tmuaReasoningCases = [
  {
    claim: "If n² is divisible by 6, then n is divisible by 6.",
    correct: "The claim is true: divisibility of n² by both 2 and 3 forces n to be divisible by both 2 and 3.",
    distractors: [
      "The claim is false because n = 6 is a counterexample.",
      "The claim is true only when n is positive, because squaring removes the sign.",
      "The claim cannot be decided without knowing whether n is prime.",
    ] as [string, string, string],
    explanation: "If 2 divides n² then 2 divides n, and if 3 divides n² then 3 divides n. Hence 6 divides n.",
  },
  {
    claim: "If x + 1/x > 2 for real x ≠ 0, then x > 0.",
    correct: "The claim is true: for x < 0 both x and 1/x are negative, so their sum cannot exceed 2.",
    distractors: [
      "The claim is false because x = 1 makes the sum equal to 2.",
      "The claim is false because sufficiently large negative x makes the sum positive.",
      "The claim is true only for x > 1, because 0 < x < 1 makes 1/x negative.",
    ] as [string, string, string],
    explanation: "A negative x gives a negative reciprocal, so x + 1/x is negative. Therefore any value above 2 requires x > 0.",
  },
  {
    claim: "If two integers have an even product, then at least one of them is even.",
    correct: "The claim is true: if both integers were odd, their product would be odd.",
    distractors: [
      "The claim is false because an even product requires both integers to be even.",
      "The claim is false whenever one integer is negative.",
      "The claim is true only when the two integers are different.",
    ] as [string, string, string],
    explanation: "The contrapositive is immediate: odd × odd is odd, so an even product cannot come from two odd factors.",
  },
  {
    claim: "For real a and b, a² = b² implies a = b.",
    correct: "The claim is false because a = −b is also possible; for example 3² = (−3)².",
    distractors: [
      "The claim is true because equal squares always have equal square roots with the same sign.",
      "The claim is false only when one of a or b is zero.",
      "The claim is true provided a and b are integers rather than arbitrary real numbers.",
    ] as [string, string, string],
    explanation: "From a² = b² we get (a − b)(a + b) = 0, hence a = b or a = −b.",
  },
]
for (let i = 1; i <= 100; i += 1) {
  const item = tmuaReasoningCases[i % tmuaReasoningCases.length]
  bank.push(q(
    `legacy2-tmua-mr-${i}`,
    "TMUA",
    "Mathematical Reasoning",
    difficulties[(i + 2) % 3],
    `Consider the claim: “${item.claim}” Which evaluation is most rigorous?`,
    item.correct,
    item.distractors,
    item.explanation,
  ))
}

// ESAT Mathematics 1 — linked algebra and proportional reasoning.
for (let i = 1; i <= 90; i += 1) {
  const m = 2 + (i % 6)
  const c = 1 + (i % 7)
  const x = 2 + (i % 6)
  const y = m * x + c
  const newY = y + 2 * m
  bank.push(q(
    `legacy2-esat-m1-${i}`,
    "ESAT",
    "Mathematics 1",
    difficulties[i % 3],
    `A straight line has gradient ${m} and passes through (${x}, ${y}). A second point on the line has y-coordinate ${newY}. What is its x-coordinate?`,
    String(x + 2),
    [String(x + 1), String(x + m), String(newY - c)],
    `An increase of ${newY - y} in y corresponds to an x-increase of (${newY - y})/${m} = 2. Hence the new x-coordinate is ${x + 2}.`,
  ))
}

// ESAT Mathematics 2 — use roots and transformed equations rather than direct factor spotting.
for (let i = 1; i <= 90; i += 1) {
  const r1 = 1 + (i % 5)
  const r2 = r1 + 2 + (i % 4)
  const sum = r1 + r2
  const product = r1 * r2
  const transformed = (r1 + 1) * (r2 + 1)
  bank.push(q(
    `legacy2-esat-m2-${i}`,
    "ESAT",
    "Mathematics 2",
    difficulties[(i + 1) % 3],
    `The positive roots of x² − ${sum}x + ${product} = 0 are α and β. What is (α + 1)(β + 1)?`,
    String(transformed),
    [String(product + 1), String(product + sum - 1), String(sum + 1)],
    `Using α + β = ${sum} and αβ = ${product}, (α + 1)(β + 1) = αβ + α + β + 1 = ${product} + ${sum} + 1 = ${transformed}.`,
  ))
}

// ESAT Physics — two-step relationships and plausible calculation slips.
for (let i = 1; i <= 90; i += 1) {
  const mass = 2 + (i % 6)
  const u = 1 + (i % 5)
  const v = u + 2 + (i % 4)
  const t = 2 + (i % 3)
  const a = (v - u) / t
  const force = mass * a
  bank.push(q(
    `legacy2-esat-physics-motion-${i}`,
    "ESAT",
    "Physics",
    difficulties[(i + 2) % 3],
    `A ${mass} kg trolley speeds up uniformly from ${u} m s⁻¹ to ${v} m s⁻¹ in ${t} s. Which value is the resultant force?`,
    `${force.toFixed(2)} N`,
    [`${(mass * (v - u)).toFixed(2)} N`, `${(mass * v / t).toFixed(2)} N`, `${(mass * (v + u) / (2 * t)).toFixed(2)} N`],
    `First a = (v − u)/t = (${v} − ${u})/${t} = ${a.toFixed(2)} m s⁻². Then F = ma = ${mass}×${a.toFixed(2)} = ${force.toFixed(2)} N.`,
  ))
}

for (let i = 1; i <= 70; i += 1) {
  const voltage = 8 + (i % 8)
  const r1 = 2 + (i % 5)
  const r2 = 3 + ((i + 2) % 6)
  const rt = r1 + r2
  const current = voltage / rt
  const power = current * current * r2
  bank.push(q(
    `legacy2-esat-physics-circuit-${i}`,
    "ESAT",
    "Physics",
    difficulties[(i + 1) % 3],
    `Two resistors, ${r1} Ω and ${r2} Ω, are connected in series across a ${voltage} V supply. What power is dissipated in the ${r2} Ω resistor?`,
    `${power.toFixed(2)} W`,
    [`${(voltage * voltage / r2).toFixed(2)} W`, `${(current * voltage).toFixed(2)} W`, `${(current * current * r1).toFixed(2)} W`],
    `The series current is I = ${voltage}/(${r1}+${r2}) = ${current.toFixed(3)} A. For the ${r2} Ω resistor, P = I²R = ${power.toFixed(2)} W.`,
  ))
}

// ESAT Chemistry — combine amount, ratio and concentration.
for (let i = 1; i <= 100; i += 1) {
  const mass = 6 + (i % 8) * 2
  const mr = 20 + (i % 6) * 10
  const coeff = 1 + (i % 3)
  const volume = 0.20 + (i % 4) * 0.10
  const reactant = mass / mr
  const product = reactant * coeff
  const concentration = product / volume
  bank.push(q(
    `legacy2-esat-chemistry-${i}`,
    "ESAT",
    "Chemistry",
    difficulties[(i + 1) % 3],
    `A ${mass} g sample of a reactant has Mᵣ = ${mr}. Each 1 mol of reactant produces ${coeff} mol of product. If all product is dissolved to make ${volume.toFixed(2)} dm³ of solution, what is the product concentration?`,
    `${concentration.toFixed(2)} mol dm⁻³`,
    [`${(reactant / volume).toFixed(2)} mol dm⁻³`, `${(product * volume).toFixed(2)} mol dm⁻³`, `${(mass / volume).toFixed(2)} mol dm⁻³`],
    `Reactant amount = ${mass}/${mr} = ${reactant.toFixed(3)} mol. Product amount = ${reactant.toFixed(3)}×${coeff} = ${product.toFixed(3)} mol, so concentration = ${product.toFixed(3)}/${volume.toFixed(2)} = ${concentration.toFixed(2)} mol dm⁻³.`,
  ))
}

// ESAT Biology — data interpretation where several statements sound reasonable.
for (let i = 1; i <= 100; i += 1) {
  const control = 40 + (i % 7) * 3
  const treatment = control - (4 + (i % 5))
  const n = 4 + (i % 6)
  bank.push(q(
    `legacy2-esat-biology-${i}`,
    "ESAT",
    "Biology",
    difficulties[i % 3],
    `In an experiment with ${n} organisms per group, the control mean is ${control} units and the treatment mean is ${treatment} units. No measure of variation is provided. Which conclusion is most defensible?`,
    `The observed treatment mean is lower, but the evidence is insufficient to judge whether the difference is reliable.`,
    [
      `The treatment probably lowers the response because the mean differs, although the size of the uncertainty is not known.`,
      `The treatment has no effect because variation has not been reported, so the two means should be treated as equivalent.`,
      `The treatment lowers the response by exactly ${control - treatment} units in the wider population because that is the observed difference.`,
    ],
    `The sample means differ, but without variation, uncertainty or replication information we cannot judge the strength or generality of the evidence.`,
  ))
}

// TARA Critical Thinking — close alternatives differ in how directly they attack the inference.
const causalCases = [
  ["a college introduced recorded lectures", "average marks rose", "the exam was redesigned at the same time"],
  ["a town reduced parking charges", "town-centre spending increased", "a large new employer opened nearby"],
  ["a school introduced morning exercise", "lateness fell", "bus timetables also changed"],
  ["a company allowed hybrid work", "staff turnover fell", "salaries were increased in the same quarter"],
  ["a museum removed entry charges", "visitor numbers rose", "a nationally advertised exhibition opened"],
] as const
for (let i = 1; i <= 120; i += 1) {
  const [change, outcome, rival] = causalCases[i % causalCases.length]
  bank.push(q(
    `legacy2-tara-ct-${i}`,
    "TARA",
    "Critical Thinking",
    difficulties[i % 3],
    `An argument states: “After ${change}, ${outcome}. Therefore the change caused the outcome.” Which new information most directly weakens that causal conclusion?`,
    `Comparable cases without the change showed a similar outcome after ${rival}.`,
    [
      `Some people affected by the change disliked it, even though the outcome still occurred.`,
      `The outcome was measured accurately, but the argument gives no estimate of how large the effect was.`,
      `The change could plausibly influence the outcome, although the mechanism is not described in detail.`,
    ],
    `A comparable group showing the same outcome without the proposed cause directly supports an alternative explanation; the other facts are limitations but do not undermine causation as strongly.`,
  ))
}

// TARA Problem Solving — at least two operations with near-miss arithmetic answers.
for (let i = 1; i <= 120; i += 1) {
  const total = 160 + (i % 8) * 20
  const pct = 20 + (i % 4) * 5
  const first = total * pct / 100
  const remaining = total - first
  const secondFraction = i % 2 === 0 ? 0.5 : 0.25
  const spentSecond = remaining * secondFraction
  const answer = remaining - spentSecond
  bank.push(q(
    `legacy2-tara-ps-${i}`,
    "TARA",
    "Problem Solving",
    difficulties[(i + 1) % 3],
    `A project has £${total}. It spends ${pct}% of the original budget on equipment, then ${secondFraction === 0.5 ? "half" : "one quarter"} of the remaining money on travel. How much remains?`,
    `£${answer.toFixed(2)}`,
    [`£${remaining.toFixed(2)}`, `£${(total - spentSecond).toFixed(2)}`, `£${(total - first - total * secondFraction).toFixed(2)}`],
    `Equipment costs £${first.toFixed(2)}, leaving £${remaining.toFixed(2)}. Travel then uses £${spentSecond.toFixed(2)} of that remainder, leaving £${answer.toFixed(2)}.`,
  ))
}

// LNAT — original argumentative passages with answers that differ by qualification, not caricature.
const lnatPassages = [
  "A city considering free bus travel should not ask only whether more people would use buses. Removing fares may widen access and reduce the friction of ticketing, but buses still require scarce vehicles, drivers and road space. If demand rises faster than capacity, the policy could improve access for some users while making journeys less reliable for others. The relevant question is therefore whether the wider benefits justify both the financial cost and the capacity response required.",
  "Universities often defend timed examinations because they test recall, organisation and reasoning under pressure. Those are genuine abilities, but they are not identical to the full range of abilities a course may value. Replacing every examination with coursework would create different weaknesses, including more opportunities for outside assistance. The stronger conclusion is not that one format is superior, but that assessment should be matched to the skill the institution claims to measure.",
  "Publishing public data is frequently described as transparency. Yet a spreadsheet can be technically available while remaining practically opaque if definitions are unclear, categories change over time or important context is missing. This does not make publication pointless; it means that openness should be judged partly by whether outsiders can use the information to hold decision-makers to account.",
  "Rules written in broad language are sometimes criticised as vague. Precision is valuable, but exhaustive rules can fail when circumstances change or when an unforeseen case arises. General language transfers some responsibility from the rule-writer to the interpreter. That creates risks of inconsistency, but it can also make a rule adaptable. The issue is therefore how interpretation is disciplined, not whether interpretation can be eliminated.",
  "Artificial intelligence can reduce the time needed to produce a polished explanation. In education, however, speed is not always the aim. The struggle to formulate an argument can expose gaps in understanding that disappear when a system supplies fluent prose too early. This does not imply that AI has no educational value; its value depends partly on whether it replaces the learner's reasoning or helps the learner inspect it.",
  "Cities often celebrate new parks as an uncomplicated environmental gain. Green space can improve shade, biodiversity and recreation, yet investment can also raise nearby housing costs. If lower-income residents are displaced, the people who bore earlier environmental disadvantages may receive fewer of the new benefits. Environmental improvement and distributive fairness can reinforce each other, but policy should not assume that they do so automatically.",
]
for (let i = 1; i <= 40; i += 1) {
  const passage = lnatPassages[i % lnatPassages.length]
  bank.push(q(
    `legacy2-lnat-main-${i}`,
    "LNAT",
    "Passage reasoning",
    difficulties[i % 3],
    `${passage}\n\nWhich statement best captures the author's main argument?`,
    `The issue should be judged through the qualifications and trade-offs identified in the passage rather than by a single headline benefit or objection.`,
    [
      `The main proposal has enough potential benefit that its practical limitations should normally be treated as secondary.`,
      `The limitations identified are serious enough that the proposal should usually be rejected unless they can all be removed.`,
      `The central question is whether the people proposing the policy have good intentions, because outcomes are too uncertain to compare.`,
    ],
    `The passage repeatedly resists an absolute conclusion and instead argues for evaluating the proposal in light of practical qualifications and competing effects.`,
  ))
  bank.push(q(
    `legacy2-lnat-assumption-${i}`,
    "LNAT",
    "Passage reasoning",
    difficulties[(i + 1) % 3],
    `${passage}\n\nWhich assumption is most consistent with the author's reasoning?`,
    `Practical consequences are relevant to judging a policy or practice even when its stated aim is attractive.`,
    [
      `A policy should be accepted whenever its intended aim is desirable, unless direct harm is already proven.`,
      `Any uncertainty about consequences makes a principled judgement impossible until complete evidence is available.`,
      `The fairest decision is normally the one that treats every competing consideration as equally important.`,
    ],
    `The author consistently evaluates attractive aims by examining how the proposal actually works and what competing consequences follow.`,
  ))
  bank.push(q(
    `legacy2-lnat-critique-${i}`,
    "LNAT",
    "Passage reasoning",
    difficulties[(i + 2) % 3],
    `${passage}\n\nWhich criticism, if true, would most require the author to revise the argument?`,
    `The practical trade-off treated as important in the passage rarely occurs under the conditions being discussed.`,
    [
      `Some readers disagree with the author's preferred emphasis even though they accept the factual description.`,
      `The proposal has supporters who describe its benefits in stronger language than the author does.`,
      `A different policy might pursue a similar aim through a mechanism that the passage does not discuss.`,
    ],
    `If the central trade-off or mechanism rarely occurs, a key reason for the author's qualified position is weakened directly.`,
  ))
}

// UCAT Verbal Reasoning — distinctions between true, plausible and over-generalised claims.
const vrPassages = [
  "A five-year survey of three wetlands recorded more breeding birds in Wetland A, little change in Wetland B and fewer in Wetland C. The researchers note that water levels affected how easily nests could be detected. They therefore treat the counts as evidence about observed nesting activity, not as exact measurements of total population size.",
  "A company trialled shorter meetings in two departments. Average meeting time fell and staff reported fewer interruptions, but the trial did not measure whether decisions were better or projects finished sooner. The report recommends a larger trial rather than concluding that shorter meetings improve productivity overall.",
  "A town planted trees along several streets and recorded lower afternoon surface temperatures there the following summer. Unplanted streets were not randomly selected, and some had different building density. The study suggests a cooling effect is plausible but cannot isolate its size precisely from the observational data alone.",
  "A library extended weekend opening hours. Visits increased, especially among students, while weekday visits changed little. A survey found that some new weekend visitors had previously been unable to attend during weekday hours, but the survey did not establish whether total reading or study time increased.",
]
for (let p = 0; p < 16; p += 1) {
  const passage = vrPassages[p % vrPassages.length]
  const items: Array<[string, string, [string, string, string], string]> = [
    [
      "Which conclusion is best supported?",
      "The observations support a limited conclusion, while at least one stronger interpretation remains unproven.",
      [
        "The intervention described is probably effective overall because the measured outcome moved in the expected direction.",
        "The findings should be treated as inconclusive because the study contains at least one limitation.",
        "The measured outcome can be generalised to the wider outcome of interest because the two are closely related.",
      ],
      "The passage supports something narrower than the strongest causal or general claim, but more than saying nothing can be learned.",
    ],
    [
      "Which statement goes beyond the information given?",
      "The observed change proves that the intervention caused an improvement in the broader outcome of interest.",
      [
        "The study recorded a change in the measured outcome.",
        "At least one limitation affects how confidently the result can be interpreted.",
        "The authors distinguish what was measured from a broader claim they did not establish.",
      ],
      "The passage explicitly stops short of proving the broader causal or outcome claim.",
    ],
    [
      "Which additional evidence would most strengthen the broader interpretation?",
      "A comparison showing the same measurement method but a clearly smaller change in an otherwise similar control group.",
      [
        "A larger number of people saying that they expected the intervention to work before the study began.",
        "A second description of the same observed change using a different graph but no new comparison group.",
        "Evidence that the measured variable is easy to record consistently, without evidence connecting it to the broader outcome.",
      ],
      "A comparable control helps separate the proposed effect from alternative explanations and therefore strengthens the broader interpretation most directly.",
    ],
    [
      "What is the main function of the limitation mentioned in the passage?",
      "To restrict how far the observed result can be generalised or interpreted causally.",
      [
        "To show that the recorded observations are too unreliable to be used for any conclusion.",
        "To replace the reported evidence with a hypothetical explanation that the authors prefer.",
        "To demonstrate that a different intervention would necessarily have produced a stronger result.",
      ],
      "The limitation narrows the justified inference; it does not erase the observation or establish an alternative result.",
    ],
  ]
  items.forEach((item, index) => bank.push(q(
    `legacy2-ucat-vr-${p + 1}-${index + 1}`,
    "UCAT",
    "Verbal Reasoning",
    difficulties[(p + index) % 3],
    `${passage}\n\n${item[0]}`,
    item[1],
    item[2],
    item[3],
  )))
}

// UCAT Decision Making — chained set logic and probability.
for (let i = 1; i <= 80; i += 1) {
  const red = 2 + (i % 4)
  const blue = 3 + (i % 5)
  const total = red + blue
  const numerator = red * (red - 1)
  const denominator = total * (total - 1)
  bank.push(q(
    `legacy2-ucat-dm-${i}`,
    "UCAT",
    "Decision Making",
    difficulties[i % 3],
    `A bag contains ${red} red and ${blue} blue counters. Two counters are drawn without replacement. Which expression gives the probability that both are red?`,
    `${red}/${total} × ${red - 1}/${total - 1}`,
    [`${red}/${total} × ${red}/${total}`, `${red}/${total} + ${red - 1}/${total - 1}`, `${numerator}/${denominator + total}`],
    `The first red has probability ${red}/${total}; after one red is removed, the second has probability ${red - 1}/${total - 1}. Multiply the probabilities.`,
  ))
}

// UCAT Quantitative Reasoning — proportional change followed by a second operation.
for (let i = 1; i <= 80; i += 1) {
  const original = 120 + (i % 8) * 20
  const increase = 10 + (i % 4) * 5
  const afterIncrease = original * (1 + increase / 100)
  const used = 20 + (i % 3) * 10
  const answer = afterIncrease * (1 - used / 100)
  bank.push(q(
    `legacy2-ucat-qr-${i}`,
    "UCAT",
    "Quantitative Reasoning",
    difficulties[(i + 1) % 3],
    `A service handled ${original} cases last month. This month capacity rises by ${increase}%, then ${used}% of the new capacity is reserved for another service. How many cases remain available?`,
    String(Math.round(answer * 100) / 100),
    [String(Math.round(afterIncrease * 100) / 100), String(Math.round(original * (1 - used / 100) * 100) / 100), String(Math.round(original * (1 + (increase - used) / 100) * 100) / 100)],
    `First increase ${original} by ${increase}% to ${afterIncrease.toFixed(2)}. Then keep ${100 - used}% of that new amount, giving ${answer.toFixed(2)}.`,
  ))
}

// UCAT SJT — all four responses are superficially plausible, but one best balances immediacy, proportionality and responsibility.
const sjtCases: Array<{ scenario: string; correct: string; distractors: [string, string, string]; why: string }> = [
  {
    scenario: "You notice a teammate has entered a small but important error in shared work shortly before submission.",
    correct: "Tell the teammate privately, check the evidence together and correct the work before submission if possible.",
    distractors: [
      "Correct the error yourself immediately without telling the teammate, then explain afterwards if there is time.",
      "Tell the whole group at once so everyone is aware of the risk and can decide what to do.",
      "Leave the work unchanged until the teammate notices, because they are responsible for their own section.",
    ],
    why: "The best first response is prompt and proportionate, preserves accuracy and gives the person responsible a fair chance to correct the problem without unnecessary escalation.",
  },
  {
    scenario: "You receive information that appears to have been sent to you by mistake and may be confidential.",
    correct: "Avoid sharing or using it, tell the sender promptly and follow the appropriate process for handling the information.",
    distractors: [
      "Delete it immediately without reading further and say nothing, because that minimises the number of people involved.",
      "Ask a trusted teammate whether they think it is confidential before deciding whether to tell the sender.",
      "Keep it available in case it becomes relevant later, but promise yourself not to discuss it with anyone.",
    ],
    why: "The strongest response protects confidentiality while also notifying the responsible person so the mistake can be managed properly.",
  },
  {
    scenario: "You realise you may have misunderstood an instruction and continuing could affect other people's work.",
    correct: "Pause the affected part of the task and clarify the instruction promptly with the appropriate person.",
    distractors: [
      "Continue with the most likely interpretation and mention the uncertainty when the task is reviewed later.",
      "Ask several peers what they think and follow the majority view so responsibility is shared.",
      "Complete the unaffected parts first and leave the uncertain section until the end, even if others are waiting for it.",
    ],
    why: "Clarifying early prevents avoidable knock-on errors and keeps responsibility with the appropriate source rather than shifting it to peers.",
  },
  {
    scenario: "A teammate is repeatedly late with work, but tells you they are dealing with a temporary personal difficulty.",
    correct: "Discuss what support or adjustment is realistic, agree a clear next step and involve the appropriate supervisor if deadlines remain at risk.",
    distractors: [
      "Take over the teammate's work for the rest of the project so the deadline is protected without further discussion.",
      "Tell the supervisor immediately that the teammate is unreliable, without discussing the situation with the teammate first.",
      "Accept future delays without setting expectations because personal difficulties should not be questioned by the team.",
    ],
    why: "The best response combines empathy with clear responsibilities and proportionate escalation if the shared work remains at risk.",
  },
]
for (let i = 1; i <= 90; i += 1) {
  const item = sjtCases[i % sjtCases.length]
  bank.push(q(
    `legacy2-ucat-sjt-${i}`,
    "UCAT",
    "Situational Judgement",
    difficulties[(i + 2) % 3],
    `${item.scenario} What is the most appropriate first response?`,
    item.correct,
    item.distractors,
    item.why,
  ))
}

// Final balancing pass prevents answer-letter cycles and strengthens any remaining obvious distractor patterns.
export const legacyHardenedQuestionBank: TestQuestion[] = prepareQuestionSet(bank, 20270925)

export const legacyHardenedQuestionBankStats = {
  total: legacyHardenedQuestionBank.length,
  byTest: Object.fromEntries((["TMUA", "ESAT", "TARA", "LNAT", "UCAT"] as TestName[]).map(test => [test, legacyHardenedQuestionBank.filter(item => item.test === test).length])) as Record<TestName, number>,
}

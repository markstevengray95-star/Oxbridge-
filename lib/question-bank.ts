import type { TestQuestion, TrackId } from "@/lib/oxbridge-data"

export type TestName = TestQuestion["test"]

export type TestBlueprint = {
  title: string
  durationMinutes: number
  sections: Array<{ name: string; questions: number; minutes?: number }>
  writing?: { minutes: number; promptChoices: number; wordLimit?: number }
  note: string
  officialPracticeUrl: string
}

const difficulties: TestQuestion["difficulty"][] = ["Foundation", "Stretch", "Challenge"]

function rotate<T>(items: T[], shift: number) {
  const n = ((shift % items.length) + items.length) % items.length
  return [...items.slice(n), ...items.slice(0, n)]
}

function mc(
  id: string,
  test: TestName,
  section: string,
  difficulty: TestQuestion["difficulty"],
  prompt: string,
  correct: string,
  distractors: [string, string, string],
  explanation: string,
  seed: number,
): TestQuestion {
  const original = [correct, ...distractors]
  const options = rotate(original, seed % 4)
  return { id, test, section, difficulty, prompt, options, answer: options.indexOf(correct), explanation }
}

const tmua: TestQuestion[] = []

for (let i = 1; i <= 40; i++) {
  const a = 1 + (i % 5), h = (i % 9) - 4, k = (i % 13) - 6
  tmua.push(mc(
    `tmua-ak-q-${i}`,
    "TMUA",
    "Applications of Mathematical Knowledge",
    difficulties[i % 3],
    `For all real x, f(x) = ${a}(x − (${h}))² + ${k}. What is the minimum value of f(x)?`,
    String(k),
    [String(h), String(a + k), String(k - a)],
    `Because ${a} > 0 and (x − (${h}))² ≥ 0, the smallest possible square term is 0. The minimum value is therefore ${k}.`,
    i,
  ))
}

for (let i = 1; i <= 40; i++) {
  const first = 2 + (i % 8), d = 1 + (i % 7), n = 5 + (i % 12), ans = first + (n - 1) * d
  tmua.push(mc(
    `tmua-ak-s-${i}`,
    "TMUA",
    "Applications of Mathematical Knowledge",
    difficulties[(i + 1) % 3],
    `An arithmetic sequence has first term ${first} and common difference ${d}. What is the ${n}th term?`,
    String(ans),
    [String(ans - d), String(ans + d), String(first + n * d)],
    `Use aₙ = a₁ + (n − 1)d. Here that is ${first} + ${n - 1}×${d} = ${ans}.`,
    i + 1,
  ))
}

const logicContexts = [
  ["an integer is divisible by 6", "it is even"],
  ["a quadrilateral is a square", "it has four equal sides"],
  ["a number is greater than 10", "its square is greater than 100"],
  ["a function is differentiable at a point", "it is continuous there"],
  ["two lines are parallel", "they have equal gradients"],
  ["an integer is a multiple of 12", "it is a multiple of 3"],
]
for (let i = 1; i <= 80; i++) {
  const [p, q] = logicContexts[i % logicContexts.length]
  tmua.push(mc(
    `tmua-mr-${i}`,
    "TMUA",
    "Mathematical Reasoning",
    difficulties[(i + 2) % 3],
    `Consider the statement: “If ${p}, then ${q}.” Which statement is its contrapositive?`,
    `If it is not true that ${q}, then it is not true that ${p}.`,
    [
      `If ${q}, then ${p}.`,
      `If it is not true that ${p}, then it is not true that ${q}.`,
      `If ${p}, then it is not true that ${q}.`,
    ],
    "The contrapositive of P → Q is ¬Q → ¬P. It is logically equivalent to the original implication.",
    i,
  ))
}

const esat: TestQuestion[] = []
for (let i = 1; i <= 80; i++) {
  const a = 2 + (i % 9), b = 3 + (i % 11), x = 1 + (i % 7), y = a * x + b
  esat.push(mc(
    `esat-m1-${i}`,
    "ESAT",
    "Mathematics 1",
    difficulties[i % 3],
    `The relation y = ${a}x + ${b} holds. If y = ${y}, what is x?`,
    String(x),
    [String(x + 1), String(Math.max(0, x - 1)), String(y - b)],
    `Rearrange to x = (y − ${b})/${a}. Substituting y = ${y} gives x = ${x}.`,
    i,
  ))
}

for (let i = 1; i <= 80; i++) {
  const r1 = 1 + (i % 6), r2 = r1 + 2 + (i % 4), sum = r1 + r2, product = r1 * r2
  esat.push(mc(
    `esat-m2-${i}`,
    "ESAT",
    "Mathematics 2",
    difficulties[(i + 1) % 3],
    `The quadratic x² − ${sum}x + ${product} = 0 has two positive roots. What is the larger root?`,
    String(r2),
    [String(r1), String(sum), String(product)],
    `The quadratic factorises as (x − ${r1})(x − ${r2}) = 0, so the larger root is ${r2}.`,
    i + 2,
  ))
}

for (let i = 1; i <= 24; i++) {
  const m = 2 + (i % 8), a = 1 + (i % 7), f = m * a
  esat.push(mc(
    `esat-p-force-${i}`,
    "ESAT",
    "Physics",
    difficulties[i % 3],
    `A ${m} kg object has a resultant acceleration of ${a} m s⁻². What is the resultant force?`,
    `${f} N`,
    [`${m + a} N`, `${Math.abs(m - a)} N`, `${m * a * 2} N`],
    `Using F = ma gives ${m} × ${a} = ${f} N.`,
    i,
  ))
}
for (let i = 1; i <= 24; i++) {
  const v = 4 + (i % 9), current = 1 + (i % 5), r = v / current
  const rText = Number.isInteger(r) ? String(r) : r.toFixed(1)
  esat.push(mc(
    `esat-p-elec-${i}`,
    "ESAT",
    "Physics",
    difficulties[(i + 1) % 3],
    `A component has a potential difference of ${v} V and a current of ${current} A. What is its resistance?`,
    `${rText} Ω`,
    [`${(v * current).toFixed(1)} Ω`, `${(current / v).toFixed(2)} Ω`, `${(v + current).toFixed(1)} Ω`],
    `R = V/I = ${v}/${current} = ${rText} Ω.`,
    i + 1,
  ))
}
for (let i = 1; i <= 24; i++) {
  const f = 2 + (i % 9), lambda = 0.5 + (i % 6) * 0.25, v = f * lambda
  esat.push(mc(
    `esat-p-wave-${i}`,
    "ESAT",
    "Physics",
    difficulties[(i + 2) % 3],
    `A wave has frequency ${f} Hz and wavelength ${lambda.toFixed(2)} m. What is its speed?`,
    `${v.toFixed(2)} m s⁻¹`,
    [`${(f / lambda).toFixed(2)} m s⁻¹`, `${(lambda / f).toFixed(2)} m s⁻¹`, `${(f + lambda).toFixed(2)} m s⁻¹`],
    `Wave speed v = fλ, so v = ${f} × ${lambda.toFixed(2)} = ${v.toFixed(2)} m s⁻¹.`,
    i + 2,
  ))
}
for (let i = 1; i <= 24; i++) {
  const m = 1 + (i % 5), speed = 2 + (i % 8), ke = 0.5 * m * speed * speed
  esat.push(mc(
    `esat-p-energy-${i}`,
    "ESAT",
    "Physics",
    difficulties[i % 3],
    `A ${m} kg object moves at ${speed} m s⁻¹. What is its kinetic energy?`,
    `${ke.toFixed(1)} J`,
    [`${(m * speed).toFixed(1)} J`, `${(m * speed * speed).toFixed(1)} J`, `${(0.5 * m * speed).toFixed(1)} J`],
    `Eₖ = ½mv² = 0.5 × ${m} × ${speed}² = ${ke.toFixed(1)} J.`,
    i + 3,
  ))
}

for (let i = 1; i <= 40; i++) {
  const mass = 10 + (i % 11) * 2, mr = 20 + (i % 7) * 10, n = mass / mr
  esat.push(mc(
    `esat-c-moles-${i}`,
    "ESAT",
    "Chemistry",
    difficulties[i % 3],
    `A sample has mass ${mass} g and relative formula mass ${mr}. How many moles does it contain?`,
    `${n.toFixed(2)} mol`,
    [`${(mass * mr).toFixed(2)} mol`, `${(mr / mass).toFixed(2)} mol`, `${(mass / (mr * 10)).toFixed(2)} mol`],
    `Amount of substance n = m/Mᵣ = ${mass}/${mr} = ${n.toFixed(2)} mol.`,
    i,
  ))
}
for (let i = 1; i <= 40; i++) {
  const mol = 0.10 + (i % 8) * 0.05, vol = 0.20 + (i % 5) * 0.10, c = mol / vol
  esat.push(mc(
    `esat-c-conc-${i}`,
    "ESAT",
    "Chemistry",
    difficulties[(i + 1) % 3],
    `A solution contains ${mol.toFixed(2)} mol of solute in ${vol.toFixed(2)} dm³. What is the concentration?`,
    `${c.toFixed(2)} mol dm⁻³`,
    [`${(mol * vol).toFixed(2)} mol dm⁻³`, `${(vol / mol).toFixed(2)} mol dm⁻³`, `${(mol / (vol * 10)).toFixed(2)} mol dm⁻³`],
    `Concentration c = n/V = ${mol.toFixed(2)}/${vol.toFixed(2)} = ${c.toFixed(2)} mol dm⁻³.`,
    i + 2,
  ))
}

for (let i = 1; i <= 40; i++) {
  const scale = 2 + (i % 4)
  esat.push(mc(
    `esat-b-scale-${i}`,
    "ESAT",
    "Biology",
    difficulties[i % 3],
    `A roughly cubic cell increases every linear dimension by a factor of ${scale}. By what factor does its surface-area-to-volume ratio change?`,
    `It becomes 1/${scale} of its original value`,
    [`It becomes ${scale} times larger`, `It becomes ${scale * scale} times larger`, "It is unchanged"],
    `Surface area scales with length² and volume with length³, so SA:V scales as 1/length. Increasing length by ${scale} makes SA:V 1/${scale} as large.`,
    i,
  ))
}
for (let i = 1; i <= 40; i++) {
  const carriers = i % 2 === 0
  esat.push(mc(
    `esat-b-genetics-${i}`,
    "ESAT",
    "Biology",
    difficulties[(i + 1) % 3],
    carriers
      ? "Two heterozygous parents, Aa × Aa, have a child. What is the probability that the child is aa?"
      : "A heterozygous parent Aa is crossed with aa. What is the probability that an offspring is Aa?",
    carriers ? "1/4" : "1/2",
    carriers ? ["1/2", "3/4", "1"] : ["1/4", "3/4", "1"],
    carriers
      ? "The Aa × Aa cross gives AA, Aa, Aa, aa in a 1:2:1 ratio, so P(aa) = 1/4."
      : "The Aa parent produces A and a gametes equally; the aa parent produces only a, so half the offspring are Aa.",
    i + 1,
  ))
}

const tara: TestQuestion[] = []
const causalContexts = [
  ["a school extended library opening hours", "student borrowing increased", "a new reading scheme began at the same time"],
  ["a city reduced bus fares", "bus use increased", "fuel prices also rose sharply"],
  ["a company introduced standing desks", "staff absence fell", "the company also changed its sick-pay policy"],
  ["a museum made entry free", "visitor numbers rose", "a major exhibition opened that month"],
  ["a college added recorded lectures", "exam scores improved", "the assessment format was also changed"],
]
for (let i = 1; i <= 80; i++) {
  const [change, result, confound] = causalContexts[i % causalContexts.length]
  tara.push(mc(
    `tara-ct-${i}`,
    "TARA",
    "Critical Thinking",
    difficulties[i % 3],
    `An argument says: “After ${change}, ${result}. Therefore the change caused the result.” Which information most weakens the argument?`,
    `That ${confound}.`,
    ["That the result can be measured.", "That some people supported the change.", "That the change was announced publicly."],
    "A plausible alternative cause weakens a causal inference from a simple before-and-after association.",
    i,
  ))
}
for (let i = 1; i <= 80; i++) {
  const a = 2 + (i % 7), b = 3 + (i % 8), total = a * b
  tara.push(mc(
    `tara-ps-${i}`,
    "TARA",
    "Problem Solving",
    difficulties[(i + 1) % 3],
    `A team packs ${a} boxes every ${b} minutes at a constant rate. How many boxes does it pack in ${total} minutes?`,
    String(a * (total / b)),
    [String(a * (total / b) - a), String(total / a), String(a + total / b)],
    `The number of ${b}-minute intervals is ${total}/${b} = ${total / b}. At ${a} boxes per interval, the total is ${a * (total / b)}.`,
    i + 3,
  ))
}

const lnat: TestQuestion[] = []
const policyTopics = [
  ["city-centre road pricing", "traffic fell", "remote working also increased"],
  ["later school start times", "lateness fell", "the school also changed its bus timetable"],
  ["a sugar tax", "soft-drink sales fell", "several brands reformulated their products"],
  ["free museum admission", "visitor numbers rose", "a blockbuster exhibition opened"],
  ["a ban on disposable cups", "waste fell", "a deposit-return scheme began simultaneously"],
  ["mandatory voting", "turnout increased", "registration rules were simplified"],
]
for (let i = 1; i <= 40; i++) {
  const [policy, outcome, rival] = policyTopics[i % policyTopics.length]
  const passage = `A commentator argues that ${policy} should be expanded because, after it was introduced, ${outcome}. The commentator treats this sequence as evidence that the policy caused the change. A critic replies that ${rival}, so the observed change may have more than one explanation. The commentator accepts that other factors exist but says the policy is still worth considering if its benefits exceed its costs.`
  lnat.push(mc(
    `lnat-main-${i}`,
    "LNAT",
    "Passage reasoning",
    difficulties[i % 3],
    `Passage: ${passage}\n\nWhich option best describes the commentator’s main conclusion?`,
    `The policy should be considered for expansion if its benefits exceed its costs.`,
    [
      `The policy certainly caused all of the observed change.`,
      `The rival explanation proves the policy had no effect.`,
      `Any policy associated with improvement should automatically be expanded.`,
    ],
    "The final qualified recommendation is the main conclusion; the causal claim is part of the support and is explicitly softened.",
    i,
  ))
  lnat.push(mc(
    `lnat-assumption-${i}`,
    "LNAT",
    "Passage reasoning",
    difficulties[(i + 1) % 3],
    `Passage: ${passage}\n\nWhich assumption is most important to the commentator’s recommendation?`,
    "That the policy’s benefits and costs can be compared in a meaningful way.",
    [
      "That no other factor influenced the outcome.",
      "That every resident values the outcome equally.",
      "That the critic agrees with the policy.",
    ],
    "The recommendation is conditional on benefits exceeding costs, so some meaningful comparison between them is required.",
    i + 1,
  ))
  lnat.push(mc(
    `lnat-weaken-${i}`,
    "LNAT",
    "Passage reasoning",
    difficulties[(i + 2) % 3],
    `Passage: ${passage}\n\nWhich new fact would most weaken the claim that the policy caused the observed change?`,
    `Comparable places without the policy experienced the same change after ${rival}.`,
    [
      "Some residents dislike the policy.",
      "The policy was discussed in local newspapers.",
      "The outcome was measured more than once.",
    ],
    "A matched comparison showing the same change without the policy gives a strong alternative causal explanation.",
    i + 2,
  ))
}

const ucat: TestQuestion[] = []
const vrTopics = [
  ["urban trees", "can reduce local surface temperatures", "the effect varies with species, canopy and water availability"],
  ["sleep", "supports memory consolidation", "the benefit depends on timing and sleep quality"],
  ["public libraries", "can widen access to information", "usage patterns differ between communities"],
  ["vaccination campaigns", "can increase population protection", "uptake depends on access and trust"],
  ["exercise", "is associated with cardiovascular benefits", "the size of benefit varies with intensity and baseline health"],
  ["recycling schemes", "can reduce landfill use", "outcomes depend on collection systems and contamination"],
]
for (let i = 1; i <= 22; i++) {
  const [topic, claim, qualification] = vrTopics[i % vrTopics.length]
  const passage = `Research on ${topic} suggests it ${claim}. However, ${qualification}. The evidence therefore supports a qualified rather than universal conclusion, and results from one setting should not automatically be assumed to apply everywhere.`
  const qs = [
    ["Which statement is best supported by the passage?", `The evidence about ${topic} is positive but context-dependent.`, ["The evidence proves the same effect occurs everywhere.", "The evidence shows there is no useful effect.", "The passage says context never matters."]],
    ["Which statement would the author most likely reject?", "Results from one setting can always be generalised without further evidence.", ["Context can affect the size of an effect.", "Evidence may support a qualified conclusion.", "Different settings can produce different outcomes."]],
    ["What is the main purpose of the qualification in the passage?", "To limit how broadly the main claim should be applied.", ["To show the main claim is meaningless.", "To prove the opposite claim.", "To replace evidence with opinion."]],
    ["Which inference is most justified?", "Further evidence may be needed before applying the finding in a new setting.", ["No further research is ever useful.", "The topic has no practical relevance.", "Only one study should determine policy."]],
  ] as const
  qs.forEach((q, j) => ucat.push(mc(
    `ucat-vr-${i}-${j + 1}`,
    "UCAT",
    "Verbal Reasoning",
    difficulties[(i + j) % 3],
    `Passage: ${passage}\n\n${q[0]}`,
    q[1],
    [...q[2]] as [string, string, string],
    "The passage repeatedly qualifies the main claim by context, so the safest conclusion is the one that preserves that qualification.",
    i + j,
  )))
}

for (let i = 1; i <= 90; i++) {
  const a = 3 + (i % 8), b = a + 2
  ucat.push(mc(
    `ucat-dm-${i}`,
    "UCAT",
    "Decision Making",
    difficulties[i % 3],
    `All items in group A are in group B. No items in group B are in group C. If an item is in group A, which conclusion must be true?`,
    "It is not in group C.",
    ["It is in group C.", "It may be in group C.", "It is not in group B."],
    "Membership of A guarantees membership of B, and B is disjoint from C, so an A item cannot be in C.",
    i + a + b,
  ))
}

for (let i = 1; i <= 90; i++) {
  const rate = 8 + (i % 9), hours = 2 + (i % 5), base = rate * hours, extra = 1 + (i % 4) * 0.5, ans = rate * extra
  ucat.push(mc(
    `ucat-qr-${i}`,
    "UCAT",
    "Quantitative Reasoning",
    difficulties[(i + 1) % 3],
    `A service processes ${base} cases in ${hours} hours at a constant rate. At the same rate, how many cases are processed in ${extra.toFixed(1)} hours?`,
    String(ans),
    [String(ans + rate), String(Math.max(0, ans - rate)), String(base + ans)],
    `The rate is ${base}/${hours} = ${rate} cases per hour. Multiplying by ${extra.toFixed(1)} hours gives ${ans}.`,
    i,
  ))
}

const sjtScenarios = [
  ["You notice a confidential document left visible in a shared area.", "Protect the information and alert the responsible supervisor.", "Photograph it to prove what happened.", "Discuss the details with friends.", "Ignore it because it is not your document."],
  ["A teammate makes a small error in a shared task and seems unaware of it.", "Raise it respectfully and help correct it before it causes a problem.", "Hide the error to avoid embarrassment.", "Publicly blame the teammate.", "Leave it for someone else to discover."],
  ["You are asked to do a task you have not been trained to do safely.", "Explain your limitation and ask for appropriate supervision or guidance.", "Attempt it alone so you look confident.", "Pretend you completed it.", "Ask another untrained student to do it."],
  ["A person asks you for information you are not authorised to share.", "Explain that you cannot share it and refer them to the appropriate person.", "Share a little because they seem trustworthy.", "Send them a screenshot.", "Post the information in a group chat."],
  ["You realise you may have misunderstood an instruction that affects other people.", "Clarify the instruction promptly before continuing.", "Guess and continue without checking.", "Wait until the end of the day.", "Ask someone else to take responsibility for your decision."],
]
for (let i = 1; i <= 90; i++) {
  const s = sjtScenarios[i % sjtScenarios.length]
  ucat.push(mc(
    `ucat-sjt-${i}`,
    "UCAT",
    "Situational Judgement",
    difficulties[(i + 2) % 3],
    `${s[0]} What is the most appropriate first response?`,
    s[1],
    [s[2], s[3], s[4]],
    "The best first action protects safety, confidentiality or team functioning while using the appropriate person or process rather than hiding, escalating or sharing the problem.",
    i + 2,
  ))
}

export const questionBank: TestQuestion[] = [...tmua, ...esat, ...tara, ...lnat, ...ucat]

export const taraEssayPrompts = [
  "Should governments ever restrict individual choices for a person’s own good?",
  "Is expertise more important than public opinion when making policy?",
  "Should universities value intellectual risk-taking even when it leads to mistakes?",
  "Can a fair rule produce unfair outcomes?",
  "Should public institutions prioritise equality of opportunity or equality of outcome?",
  "Is it better for a decision to be consistent or flexible?",
  "Should schools teach students how to disagree well?",
  "When, if ever, should efficiency outweigh fairness?",
  "Does technology make people better informed?",
  "Should scientific uncertainty delay public action?",
  "Can competition improve public services?",
  "Do individuals have a duty to consider the long-term effects of their choices?",
]

export const lnatEssayPrompts = [
  "Should freedom of speech protect statements that are offensive but lawful?",
  "Is punishment justified mainly by deterrence, desert, rehabilitation, or something else?",
  "Should voting be compulsory?",
  "Can privacy be a more important right than security?",
  "Should elected governments be able to overrule expert regulators?",
  "Is equality before the law enough to make a legal system fair?",
  "Should universities be permitted to restrict controversial speakers?",
  "When should civil disobedience be justified?",
  "Should social media companies be legally responsible for harmful content posted by users?",
  "Is it ever fair to treat people differently in order to achieve equality?",
  "Should judges interpret laws according to their wording or their purpose?",
  "Can a democracy legitimately limit anti-democratic political movements?",
]

export const testBlueprints: Record<TestName, TestBlueprint> = {
  TMUA: {
    title: "TMUA",
    durationMinutes: 150,
    sections: [
      { name: "Applications of Mathematical Knowledge", questions: 20, minutes: 75 },
      { name: "Mathematical Reasoning", questions: 20, minutes: 75 },
    ],
    note: "40 multiple-choice questions across two 75-minute papers. No calculator.",
    officialPracticeUrl: "https://esat-tmua.ac.uk/tmua-preparation-materials/",
  },
  ESAT: {
    title: "ESAT",
    durationMinutes: 120,
    sections: [
      { name: "Mathematics 1", questions: 27, minutes: 40 },
      { name: "Course module 1", questions: 27, minutes: 40 },
      { name: "Course module 2", questions: 27, minutes: 40 },
    ],
    note: "Most candidates sit Mathematics 1 plus two course-specific modules. Each module has 27 questions in 40 minutes.",
    officialPracticeUrl: "https://esat-tmua.ac.uk/prepare/",
  },
  TARA: {
    title: "TARA",
    durationMinutes: 120,
    sections: [
      { name: "Critical Thinking", questions: 22, minutes: 40 },
      { name: "Problem Solving", questions: 22, minutes: 40 },
    ],
    writing: { minutes: 40, promptChoices: 3, wordLimit: 750 },
    note: "Two 22-question multiple-choice modules, then one 40-minute writing task chosen from three prompts.",
    officialPracticeUrl: "https://esat-tmua.ac.uk/prepare/",
  },
  LNAT: {
    title: "LNAT",
    durationMinutes: 135,
    sections: [{ name: "Section A: passage-based multiple choice", questions: 42, minutes: 95 }],
    writing: { minutes: 40, promptChoices: 3 },
    note: "42 multiple-choice questions in 95 minutes, followed by one essay chosen from three prompts in 40 minutes.",
    officialPracticeUrl: "https://lnat.ac.uk/how-to-prepare/practice-test/",
  },
  UCAT: {
    title: "UCAT",
    durationMinutes: 111,
    sections: [
      { name: "Verbal Reasoning", questions: 44, minutes: 22 },
      { name: "Decision Making", questions: 35, minutes: 37 },
      { name: "Quantitative Reasoning", questions: 36, minutes: 26 },
      { name: "Situational Judgement", questions: 69, minutes: 26 },
    ],
    note: "Four separately timed subtests. This practice timer covers the 111 minutes of scored subtest time, excluding instruction screens.",
    officialPracticeUrl: "https://www.ucat.ac.uk/prepare/practice-tests/",
  },
}

function takeFromSection(test: TestName, section: string, count: number, seed: number) {
  const pool = questionBank.filter(q => q.test === test && q.section === section)
  if (!pool.length) return [] as TestQuestion[]
  const out: TestQuestion[] = []
  for (let i = 0; i < count; i++) out.push(pool[(seed * 7 + i * 11) % pool.length])
  return out
}

export function esatModulesForTrack(track: TrackId): [string, string] {
  if (track === "life") return ["Biology", "Chemistry"]
  if (track === "physical") return ["Physics", "Mathematics 2"]
  if (track === "maths" || track === "economics") return ["Mathematics 2", "Physics"]
  return ["Physics", "Mathematics 2"]
}

export function buildFullMock(test: TestName, track: TrackId, seed = 1): TestQuestion[] {
  if (test === "TMUA") return [
    ...takeFromSection("TMUA", "Applications of Mathematical Knowledge", 20, seed),
    ...takeFromSection("TMUA", "Mathematical Reasoning", 20, seed + 1),
  ]
  if (test === "ESAT") {
    const [module1, module2] = esatModulesForTrack(track)
    return [
      ...takeFromSection("ESAT", "Mathematics 1", 27, seed),
      ...takeFromSection("ESAT", module1, 27, seed + 1),
      ...takeFromSection("ESAT", module2, 27, seed + 2),
    ]
  }
  if (test === "TARA") return [
    ...takeFromSection("TARA", "Critical Thinking", 22, seed),
    ...takeFromSection("TARA", "Problem Solving", 22, seed + 1),
  ]
  if (test === "LNAT") {
    const pool = questionBank.filter(q => q.test === "LNAT")
    return Array.from({ length: 42 }, (_, i) => pool[(seed * 5 + i * 7) % pool.length])
  }
  return [
    ...takeFromSection("UCAT", "Verbal Reasoning", 44, seed),
    ...takeFromSection("UCAT", "Decision Making", 35, seed + 1),
    ...takeFromSection("UCAT", "Quantitative Reasoning", 36, seed + 2),
    ...takeFromSection("UCAT", "Situational Judgement", 69, seed + 3),
  ]
}

export function writingPromptsFor(test: TestName, seed = 1) {
  const pool = test === "TARA" ? taraEssayPrompts : test === "LNAT" ? lnatEssayPrompts : []
  if (!pool.length) return []
  return Array.from({ length: Math.min(3, pool.length) }, (_, i) => pool[(seed * 3 + i * 5) % pool.length])
}

export const questionBankStats = {
  total: questionBank.length,
  byTest: Object.fromEntries((["TMUA", "ESAT", "TARA", "LNAT", "UCAT"] as TestName[]).map(test => [test, questionBank.filter(q => q.test === test).length])) as Record<TestName, number>,
}

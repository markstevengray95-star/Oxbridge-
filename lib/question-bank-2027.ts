import type { TestQuestion } from "@/lib/oxbridge-data"

const difficulties: TestQuestion["difficulty"][] = ["Foundation", "Stretch", "Challenge"]

type TestName = TestQuestion["test"]

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
  const options = rotate([correct, ...distractors], seed % 4)
  return { id, test, section, difficulty, prompt, options, answer: options.indexOf(correct), explanation }
}

const out: TestQuestion[] = []

// Two additional TMUA-style forms: 20 Applications + 20 Reasoning questions per form.
for (let form = 1; form <= 2; form++) {
  for (let i = 1; i <= 20; i++) {
    const a = 2 + ((i + form) % 5)
    const b = 3 + ((i * 2 + form) % 9)
    const c = 1 + ((i + 2 * form) % 7)
    const x = 1 + ((i * 3 + form) % 6)
    const y = a * x + b - c
    out.push(mc(
      `2027-tmua-f${form}-ak-${i}`,
      "TMUA",
      "Applications of Mathematical Knowledge",
      difficulties[(i + form) % 3],
      `A quantity y is defined by y = ${a}x + ${b} − ${c}. If y = ${y}, what is x?`,
      String(x),
      [String(x + 1), String(Math.max(0, x - 1)), String(y - b + c)],
      `Rearrange to x = (y − ${b} + ${c})/${a}. Substitution gives x = ${x}.`,
      i + form,
    ))
  }

  const reasoningPatterns = [
    ["n is divisible by 12", "n is divisible by 3"],
    ["a function is differentiable at x = a", "it is continuous at x = a"],
    ["a quadrilateral is a square", "its diagonals are equal"],
    ["x > 5", "x² > 25"],
    ["two non-vertical lines are parallel", "their gradients are equal"],
  ] as const
  for (let i = 1; i <= 20; i++) {
    const [p, q] = reasoningPatterns[(i + form) % reasoningPatterns.length]
    out.push(mc(
      `2027-tmua-f${form}-mr-${i}`,
      "TMUA",
      "Mathematical Reasoning",
      difficulties[(i + form + 1) % 3],
      `Suppose the statement “If ${p}, then ${q}” is true. Which statement must also be true?`,
      `If it is not true that ${q}, then it is not true that ${p}.`,
      [`If ${q}, then ${p}.`, `If it is not true that ${p}, then it is not true that ${q}.`, `If ${p}, then it is not true that ${q}.`],
      "The contrapositive of P → Q is ¬Q → ¬P, and the two statements are logically equivalent.",
      i * 2 + form,
    ))
  }
}

// Two complete sets for each ESAT module: 27 questions per module per form.
const esatModules = ["Mathematics 1", "Mathematics 2", "Physics", "Chemistry", "Biology"] as const
for (let form = 1; form <= 2; form++) {
  for (const module of esatModules) {
    for (let i = 1; i <= 27; i++) {
      const d = difficulties[(i + form) % 3]
      if (module === "Mathematics 1") {
        const m = 2 + ((i + form) % 7)
        const x = 1 + ((i * 2 + form) % 8)
        const k = 2 + ((i + 3 * form) % 9)
        const y = m * x + k
        out.push(mc(`2027-esat-f${form}-m1-${i}`, "ESAT", module, d, `A straight line has equation y = ${m}x + ${k}. At the point where y = ${y}, what is x?`, String(x), [String(x + 1), String(Math.max(0, x - 1)), String(y - k)], `x = (y − ${k})/${m} = ${x}.`, i + form))
      } else if (module === "Mathematics 2") {
        const r1 = 1 + ((i + form) % 6)
        const r2 = r1 + 1 + ((i * 2 + form) % 5)
        const sum = r1 + r2
        const product = r1 * r2
        out.push(mc(`2027-esat-f${form}-m2-${i}`, "ESAT", module, d, `The equation x² − ${sum}x + ${product} = 0 has two positive roots. What is the larger root?`, String(r2), [String(r1), String(sum), String(product)], `The quadratic factorises to (x − ${r1})(x − ${r2}) = 0, so the larger root is ${r2}.`, i + 7 * form))
      } else if (module === "Physics") {
        const mass = 2 + ((i + form) % 7)
        const speed = 2 + ((i * 2 + form) % 9)
        const energy = 0.5 * mass * speed * speed
        out.push(mc(`2027-esat-f${form}-phy-${i}`, "ESAT", module, d, `A ${mass} kg object moves at ${speed} m s⁻¹. What is its kinetic energy?`, `${energy.toFixed(1)} J`, [`${(mass * speed).toFixed(1)} J`, `${(mass * speed * speed).toFixed(1)} J`, `${(0.5 * mass * speed).toFixed(1)} J`], `Use Eₖ = ½mv² = 0.5 × ${mass} × ${speed}² = ${energy.toFixed(1)} J.`, i + 11 * form))
      } else if (module === "Chemistry") {
        const moles = 0.10 + ((i + form) % 8) * 0.05
        const volume = 0.20 + ((i * 2 + form) % 6) * 0.10
        const concentration = moles / volume
        out.push(mc(`2027-esat-f${form}-chem-${i}`, "ESAT", module, d, `A solution contains ${moles.toFixed(2)} mol of solute in ${volume.toFixed(2)} dm³. What is its concentration?`, `${concentration.toFixed(2)} mol dm⁻³`, [`${(moles * volume).toFixed(2)} mol dm⁻³`, `${(volume / moles).toFixed(2)} mol dm⁻³`, `${(moles / (volume * 10)).toFixed(2)} mol dm⁻³`], `Concentration is n/V = ${moles.toFixed(2)}/${volume.toFixed(2)} = ${concentration.toFixed(2)} mol dm⁻³.`, i + 13 * form))
      } else {
        const scale = 2 + ((i + form) % 4)
        out.push(mc(`2027-esat-f${form}-bio-${i}`, "ESAT", module, d, `A roughly spherical cell increases its radius by a factor of ${scale}. By what factor does its surface-area-to-volume ratio change?`, `It becomes 1/${scale} of its original value`, [`It becomes ${scale} times larger`, `It becomes ${scale * scale} times larger`, "It is unchanged"], `Surface area scales as r² and volume as r³, so SA:V scales as 1/r. Increasing radius by ${scale} makes the ratio 1/${scale} as large.`, i + 17 * form))
      }
    }
  }
}

// Two TARA-style forms: 22 Critical Thinking + 22 Problem Solving questions per form.
const causalCases = [
  ["a college introduced optional recorded lectures", "average exam marks rose", "the exam was also redesigned"],
  ["a city reduced bus fares", "bus journeys increased", "petrol prices rose during the same month"],
  ["a school lengthened lunch break", "afternoon behaviour improved", "a new behaviour policy started simultaneously"],
  ["a company allowed hybrid working", "staff turnover fell", "the company also increased salaries"],
] as const
for (let form = 1; form <= 2; form++) {
  for (let i = 1; i <= 22; i++) {
    const [change, outcome, confound] = causalCases[(i + form) % causalCases.length]
    out.push(mc(`2027-tara-f${form}-ct-${i}`, "TARA", "Critical Thinking", difficulties[(i + form) % 3], `An argument states: “After ${change}, ${outcome}. Therefore the change caused the outcome.” Which fact most weakens that conclusion?`, `That ${confound}.`, ["That the outcome was measured carefully.", "That some people disliked the change.", "That the change was announced in advance."], "A plausible alternative cause weakens an inference from sequence or correlation to causation.", i + form))
  }
  for (let i = 1; i <= 22; i++) {
    const workers = 3 + ((i + form) % 6)
    const items = 12 + ((i * 2 + form) % 20)
    const hours = 2 + ((i + form) % 4)
    const total = workers * items * hours
    out.push(mc(`2027-tara-f${form}-ps-${i}`, "TARA", "Problem Solving", difficulties[(i + form + 1) % 3], `${workers} identical machines each produce ${items} components per hour. If all run for ${hours} hours, how many components are produced?`, String(total), [String(items * hours), String(workers * items), String(total - items)], `Multiply machines × rate × time: ${workers} × ${items} × ${hours} = ${total}.`, i + 5 * form))
  }
}

export const taraWritingPrompts2027 = [
  "Should institutions ever prioritise fairness over efficiency?",
  "Does technological progress necessarily improve society?",
  "Should experts have more influence than voters over highly technical policy decisions?",
  "Is it reasonable to judge people by outcomes they could not fully control?",
  "Should universities reward intellectual risk-taking even when it produces mistakes?",
  "Can censorship ever strengthen rather than weaken public debate?",
]

// Two LNAT-style sets. Each set contains 12 original argumentative passages and 42 MCQs.
const lnatPassages = [
  "Cities often treat congestion as a transport problem, yet road capacity can itself influence how people travel. Expanding roads may initially shorten journeys, but lower travel costs can encourage additional driving until congestion returns. This does not mean road building is never justified; it means forecasts should include behavioural responses rather than assume travel demand is fixed.",
  "Public libraries are sometimes defended mainly because they lend books. That description is now too narrow. Libraries provide quiet study space, digital access, local archives and assistance navigating information. Their value therefore cannot be assessed simply by counting physical loans, although usage data still matters when resources are scarce.",
  "A school that removes all deadlines may reduce anxiety for some pupils, but deadlines also coordinate shared activity and help learners practise planning. The sensible question is not whether deadlines are good or bad in themselves, but when they support learning and when rigid enforcement creates costs larger than the benefits.",
  "Scientific models are deliberately incomplete. A model that included every detail would often be too complicated to use. The relevant criticism is therefore not that a model is unrealistic, but that an omitted factor matters to the question being asked. Simplicity can be a strength when it exposes the mechanism of interest.",
  "Museums must decide how much context to provide around disputed objects. Too little context can conceal difficult histories; too much can overwhelm visitors or falsely imply that one interpretation is final. Curators should make evidential uncertainty visible while still offering enough structure for visitors to understand why disagreement exists.",
  "Remote work debates frequently compare average productivity, but averages can hide differences between tasks and workers. Independent analytical work may benefit from fewer interruptions, while training and collaborative problem-solving may suffer when informal contact falls. A single productivity figure can therefore answer a narrower question than managers imagine.",
  "Free public transport can improve access, but a zero ticket price does not make transport costless. Vehicles, drivers and maintenance still require resources. The strongest case for free fares therefore depends not on denying cost but on arguing that benefits such as access, reduced car use or simpler administration justify funding those costs collectively.",
  "Examinations reward performance under constrained conditions. That can measure useful skills such as recall, organisation and problem-solving under time pressure, but it is not identical to measuring everything a student knows. Assessment systems are strongest when they match the skill being tested rather than treating one format as universally superior.",
  "Historical monuments can have several meanings at once: commemoration, art, evidence of past values and symbols in current political disputes. Removing a monument changes public space, but leaving it untouched is also a choice about how that space communicates history. The debate is therefore not between action and neutrality.",
  "Artificial intelligence can make writing faster, but speed is not always the scarce resource in learning. Struggling to formulate an argument can itself reveal gaps in understanding. The educational value of AI depends partly on whether it replaces that struggle or helps a learner examine it more carefully.",
  "Economic growth can increase the resources available for public services, yet growth alone does not determine how those resources are distributed. Two economies with identical growth rates can produce different outcomes for living standards if gains accrue to different groups. Distribution and growth are related questions, not interchangeable ones.",
  "Rules are often written generally because lawmakers cannot list every future case. General wording creates flexibility but also leaves room for disagreement. Interpretation is unavoidable: even a literal reading requires decisions about which meanings of words fit the context. The challenge is to make those decisions principled rather than pretend they do not occur.",
]
for (let form = 1; form <= 2; form++) {
  let qNo = 0
  for (let p = 0; p < 12; p++) {
    const passage = lnatPassages[(p + form - 1) % lnatPassages.length]
    const questionCount = p < 6 ? 4 : 3
    for (let q = 1; q <= questionCount; q++) {
      qNo += 1
      const stems = [
        ["Which statement best captures the author's main conclusion?", "The issue should be assessed with attention to the qualifications and trade-offs identified in the passage."],
        ["Which assumption is most important to the reasoning?", "That the consequence or distinction highlighted by the author is relevant to evaluating the policy or claim."],
        ["Which response would most strengthen the author's argument?", "Evidence showing that the mechanism or distinction identified in the passage has a meaningful effect in practice."],
        ["Which criticism would the author be most likely to accept?", "A criticism showing that an omitted factor changes the balance of the argument in the particular case."],
      ] as const
      const [stem, correct] = stems[(q + p + form) % stems.length]
      out.push(mc(`2027-lnat-f${form}-p${p + 1}-q${q}`, "LNAT", "Argumentative passages", difficulties[(qNo + form) % 3], `${passage}\n\n${stem}`, correct, ["The passage proves that one policy is always correct regardless of context.", "The author's argument depends entirely on personal preference rather than reasons.", "The passage shows that empirical evidence is unnecessary once a principle has been stated."], "The passage repeatedly qualifies its claim and focuses on mechanisms, context and trade-offs rather than an absolute rule.", qNo + form))
    }
  }
}

export const lnatEssayPrompts2027 = [
  "Should freedom of expression protect speech that most people find offensive?",
  "Is equality of opportunity more important than equality of outcome?",
  "Should governments regulate social-media recommendation algorithms?",
  "Can punishment be justified if it does not reduce future harm?",
  "Should universities take applicants' educational circumstances into account?",
  "Is there a moral difference between causing harm and allowing harm to occur?",
]

// Two current-format UCAT practice forms: VR 44, DM 35, QR 36, SJT 69 each.
const vrPassages = [
  "A regional rail operator introduced contactless ticketing. Journey times did not change, but boarding became faster at busy stations because fewer passengers needed to buy tickets from drivers. The operator cautioned that the effect was smaller at stations where most passengers already held season tickets.",
  "Researchers studying urban trees found that mature trees provided more shade than newly planted trees, but younger trees were more resilient during one unusually dry summer. The authors warned against treating a single season as evidence that young trees are generally more drought-resistant.",
  "A university trialled shorter lectures combined with more frequent problem classes. Attendance at the problem classes increased, while lecture attendance was broadly unchanged. The study did not measure examination performance, so no conclusion about attainment was possible.",
  "A hospital replaced some paper forms with digital forms. Missing fields became less common because the software required completion before submission, but staff reported that unusual cases were sometimes harder to describe because the digital form offered fewer free-text areas.",
]
for (let form = 1; form <= 2; form++) {
  for (let i = 1; i <= 44; i++) {
    const passage = vrPassages[(Math.floor((i - 1) / 4) + form) % vrPassages.length]
    const statements = [
      "The passage supports a qualified conclusion rather than an absolute one.",
      "The passage proves that the intervention improved every relevant outcome.",
      "The author distinguishes what was measured from what was not measured.",
      "The evidence described is compatible with more than one interpretation.",
    ]
    const idx = (i + form) % statements.length
    const correct = idx === 1 ? "False" : idx === 2 ? "True" : "Can't tell"
    out.push(mc(`2027-ucat-f${form}-vr-${i}`, "UCAT", "Verbal Reasoning", difficulties[(i + form) % 3], `${passage}\n\nStatement: ${statements[idx]}`, correct, (["True", "False", "Can't tell", "Both true and false"].filter(x => x !== correct).slice(0, 3) as [string, string, string]), "Use only the information in the passage. Separate what is explicitly supported from what would require extra assumptions.", i + form))
  }

  for (let i = 1; i <= 35; i++) {
    const a = 2 + ((i + form) % 6)
    const b = 3 + ((i * 2 + form) % 7)
    const total = a * b
    out.push(mc(`2027-ucat-f${form}-dm-${i}`, "UCAT", "Decision Making", difficulties[(i + form + 1) % 3], `All ${a} members of each of ${b} teams attend a briefing. No person belongs to more than one team. How many people attend?`, String(total), [String(a + b), String(total - a), String(total + b)], `With no overlap, multiply team size by number of teams: ${a} × ${b} = ${total}.`, i + 3 * form))
  }

  for (let i = 1; i <= 36; i++) {
    const price = 8 + ((i + form) % 13)
    const qty = 2 + ((i * 2 + form) % 8)
    const discount = [5, 10, 20, 25][(i + form) % 4]
    const full = price * qty
    const final = full * (1 - discount / 100)
    out.push(mc(`2027-ucat-f${form}-qr-${i}`, "UCAT", "Quantitative Reasoning", difficulties[(i + form + 2) % 3], `An item costs £${price}. A customer buys ${qty} items and receives a ${discount}% discount on the total. What is the final cost?`, `£${final.toFixed(2)}`, [`£${full.toFixed(2)}`, `£${(full - discount).toFixed(2)}`, `£${(price * (1 - discount / 100)).toFixed(2)}`], `Full cost = £${full}. Applying ${discount}% discount gives £${final.toFixed(2)}.`, i + 5 * form))
  }

  const sjtCases = [
    "A student notices that a teammate has made an error in shared work shortly before submission.",
    "A student is accidentally sent information that was intended to remain confidential.",
    "A student realises they will be late for a group commitment because of a mistake in their own planning.",
    "A student hears a peer make a dismissive comment about another member of the group.",
  ]
  for (let i = 1; i <= 69; i++) {
    const scenario = sjtCases[(i + form) % sjtCases.length]
    out.push(mc(`2027-ucat-f${form}-sjt-${i}`, "UCAT", "Situational Judgement", difficulties[(i + form) % 3], `${scenario} What is the most appropriate first response?`, "Address the issue promptly and proportionately, protecting safety, confidentiality and team functioning while involving the appropriate person where needed.", ["Ignore it unless somebody else complains.", "Publicly blame the person involved so everyone knows what happened.", "Hide the issue to avoid creating extra work for the group."], "The strongest first response is honest, proportionate and focused on resolving the issue without unnecessary escalation or concealment.", i + 7 * form))
  }
}

export const questionBank2027 = out

export const questionBank2027Stats = {
  total: questionBank2027.length,
  byTest: Object.fromEntries((["TMUA", "ESAT", "TARA", "LNAT", "UCAT"] as TestName[]).map(test => [test, questionBank2027.filter(q => q.test === test).length])) as Record<TestName, number>,
}

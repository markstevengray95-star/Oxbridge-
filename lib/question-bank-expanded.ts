import type { TestQuestion } from "@/lib/oxbridge-data"

type TestName = TestQuestion["test"]
const diffs: TestQuestion["difficulty"][] = ["Foundation", "Stretch", "Challenge"]

function q(
  id: string,
  test: TestName,
  section: string,
  difficulty: TestQuestion["difficulty"],
  prompt: string,
  correct: string,
  distractors: [string, string, string],
  explanation: string,
  seed = 0,
): TestQuestion {
  const raw = [correct, ...distractors]
  const shift = seed % 4
  const options = [...raw.slice(shift), ...raw.slice(0, shift)]
  return { id, test, section, difficulty, prompt, options, answer: options.indexOf(correct), explanation }
}

const out: TestQuestion[] = []

// ---------------- TMUA: broader algebra, sequences, geometry and probability ----------------
for (let i = 1; i <= 80; i++) {
  const a = 2 + (i % 7), h = (i % 9) - 4, c = 1 + (i % 8), minimum = c
  out.push(q(
    `x-tmua-square-${i}`, "TMUA", "Applications of Mathematical Knowledge", diffs[i % 3],
    `For real x, g(x) = ${a}(x − (${h}))² + ${c}. Which statement is necessarily true?`,
    `g(x) ≥ ${minimum}`,
    [`g(x) ≤ ${minimum}`, `g(x) ≥ ${a + c}`, `g(x) has no minimum`],
    `The squared term is never negative and can equal 0, so the least possible value is ${minimum}.`, i
  ))
}
for (let i = 1; i <= 80; i++) {
  const x1 = -4 + (i % 9), y1 = 2 + (i % 7), dx = 2 + (i % 5), m = 1 + (i % 6), x2 = x1 + dx, y2 = y1 + m * dx
  out.push(q(
    `x-tmua-grad-${i}`, "TMUA", "Applications of Mathematical Knowledge", diffs[(i + 1) % 3],
    `The points A(${x1}, ${y1}) and B(${x2}, ${y2}) lie on a straight line. What is its gradient?`,
    String(m), [String(m + 1), String(m + 2), String((1 / m).toFixed(2))],
    `Gradient = (change in y)/(change in x) = ${y2 - y1}/${dx} = ${m}.`, i + 1
  ))
}
for (let i = 1; i <= 80; i++) {
  const first = 1 + (i % 9), ratio = 2 + (i % 3), n = 3 + (i % 5), term = first * ratio ** (n - 1)
  out.push(q(
    `x-tmua-geo-${i}`, "TMUA", "Mathematical Reasoning", diffs[(i + 2) % 3],
    `A geometric sequence has first term ${first} and common ratio ${ratio}. What is term ${n}?`,
    String(term), [String(first * ratio ** n), String(first + (n - 1) * ratio), String(term / ratio)],
    `For a geometric sequence aₙ = arⁿ⁻¹, giving ${first}×${ratio}^${n - 1} = ${term}.`, i + 2
  ))
}
for (let i = 1; i <= 80; i++) {
  const red = 2 + (i % 5), blue = 3 + (i % 6), total = red + blue
  out.push(q(
    `x-tmua-prob-${i}`, "TMUA", "Mathematical Reasoning", diffs[i % 3],
    `A bag contains ${red} red and ${blue} blue counters. One counter is drawn uniformly at random. What is the probability it is red?`,
    `${red}/${total}`, [`${red}/${total + 1}`, `${red + 1}/${total}`, `1/${total}`],
    `There are ${total} equally likely counters and ${red} favourable outcomes, so the probability is ${red}/${total}.`, i + 3
  ))
}

// ---------------- ESAT: more module breadth ----------------
for (let i = 1; i <= 80; i++) {
  const a = 2 + (i % 8), b = 1 + (i % 7), x = 1 + (i % 9), rhs = a * x - b
  out.push(q(
    `x-esat-m1-linear-${i}`, "ESAT", "Mathematics 1", diffs[i % 3],
    `Solve ${a}x − ${b} = ${rhs}.`, String(x),
    [String(x + 1), String(x + 2), String(x + 3)],
    `Add ${b}, then divide by ${a}: x = ${x}.`, i
  ))
}
for (let i = 1; i <= 80; i++) {
  const w = 2 + (i % 7), h = 3 + (i % 8), diag2 = w*w + h*h
  out.push(q(
    `x-esat-m2-geom-${i}`, "ESAT", "Mathematics 2", diffs[(i + 1) % 3],
    `A rectangle has side lengths ${w} and ${h}. What is the square of the length of its diagonal?`,
    String(diag2), [String(w + h), String(2 * (w + h)), String(w * h)],
    `By Pythagoras, d² = ${w}² + ${h}² = ${diag2}.`, i + 1
  ))
}
for (let i = 1; i <= 40; i++) {
  const u = 2 + (i % 7), a = 1 + (i % 5), t = 2 + (i % 6), v = u + a*t
  out.push(q(
    `x-esat-p-kin-${i}`, "ESAT", "Physics", diffs[i % 3],
    `An object starts at ${u} m s⁻¹ and accelerates uniformly at ${a} m s⁻² for ${t} s. What is its final speed?`,
    `${v} m s⁻¹`, [`${u + a} m s⁻¹`, `${u * t} m s⁻¹`, `${a * t} m s⁻¹`],
    `Use v = u + at: ${u} + ${a}×${t} = ${v} m s⁻¹.`, i
  ))
}
for (let i = 1; i <= 40; i++) {
  const v = 6 + (i % 9), r = 2 + (i % 6), current = v / r
  out.push(q(
    `x-esat-p-circuit-${i}`, "ESAT", "Physics", diffs[(i + 1) % 3],
    `A resistor of ${r} Ω has a potential difference of ${v} V across it. What current flows?`,
    `${current.toFixed(2)} A`, [`${(current + 1).toFixed(2)} A`, `${(current * 2).toFixed(2)} A`, `${(current + 3).toFixed(2)} A`],
    `I = V/R = ${v}/${r} = ${current.toFixed(2)} A.`, i + 1
  ))
}
for (let i = 1; i <= 40; i++) {
  const density = 500 + (i % 9)*100, volume = 0.002 + (i % 5)*0.001, mass = density*volume
  out.push(q(
    `x-esat-p-density-${i}`, "ESAT", "Physics", diffs[(i + 2) % 3],
    `A material has density ${density} kg m⁻³ and volume ${volume.toFixed(3)} m³. What is its mass?`,
    `${mass.toFixed(2)} kg`, [`${(density/volume).toFixed(2)} kg`, `${(volume/density).toExponential(2)} kg`, `${(density+volume).toFixed(2)} kg`],
    `m = ρV = ${density}×${volume.toFixed(3)} = ${mass.toFixed(2)} kg.`, i + 2
  ))
}
for (let i = 1; i <= 40; i++) {
  const m = 1 + (i % 6), g = 10, h = 2 + (i % 8), e = m*g*h
  out.push(q(
    `x-esat-p-gpe-${i}`, "ESAT", "Physics", diffs[i % 3],
    `Using g = 10 N kg⁻¹, how much gravitational potential energy is gained when a ${m} kg object is raised ${h} m?`,
    `${e} J`, [`${m*h} J`, `${g*h} J`, `${m*g} J`],
    `ΔE = mgh = ${m}×10×${h} = ${e} J.`, i + 3
  ))
}
for (let i = 1; i <= 80; i++) {
  const mass = 5 + (i % 10)*2, mr = 10 + (i % 8)*10, mol = mass/mr
  out.push(q(
    `x-esat-c-stoich-${i}`, "ESAT", "Chemistry", diffs[i % 3],
    `A pure substance has mass ${mass} g and relative formula mass ${mr}. What amount is present?`,
    `${mol.toFixed(3)} mol`, [`${(mass*mr).toFixed(1)} mol`, `${(mr/mass).toFixed(3)} mol`, `${(mass/(mr*1000)).toFixed(5)} mol`],
    `n = m/Mᵣ = ${mass}/${mr} = ${mol.toFixed(3)} mol.`, i
  ))
}
for (let i = 1; i <= 80; i++) {
  const statement = i % 2 === 0
    ? "A catalyst provides an alternative route with lower activation energy."
    : "Increasing temperature increases the fraction of particles with energy above activation energy."
  const correct = i % 2 === 0 ? "This can increase rate without changing the equilibrium constant." : "This generally increases reaction rate."
  out.push(q(
    `x-esat-c-rate-${i}`, "ESAT", "Chemistry", diffs[(i + 1) % 3],
    `${statement} Which conclusion is best supported?`, correct,
    i % 2 === 0
      ? ["It changes the enthalpy change.", "It guarantees complete conversion to products.", "It makes all collisions successful."]
      : ["It makes activation energy zero.", "It removes the need for collisions.", "It necessarily changes stoichiometric coefficients."],
    i % 2 === 0 ? "A catalyst changes the pathway and rate, not the equilibrium constant or reaction enthalpy." : "At higher temperature, a larger fraction of collisions have sufficient energy to react.", i + 1
  ))
}
for (let i = 1; i <= 80; i++) {
  const scenario = i % 2 === 0
    ? "A membrane allows water through but not the dissolved solute. Side A has a higher solute concentration than side B."
    : "A cell is moved into a solution with lower water potential than the cell contents."
  const correct = i % 2 === 0 ? "Net water movement is from B to A." : "Water tends to leave the cell."
  out.push(q(
    `x-esat-b-osmosis-${i}`, "ESAT", "Biology", diffs[i % 3],
    `${scenario} Which statement is correct?`, correct,
    i % 2 === 0
      ? ["Net solute movement is from A to B.", "Net water movement is from A to B.", "There is necessarily no net movement."]
      : ["Water tends to enter the cell.", "Solute must leave by osmosis.", "Water potential has no effect on water movement."],
    "Osmosis is net water movement down a water-potential gradient through a partially permeable membrane.", i
  ))
}
for (let i = 1; i <= 80; i++) {
  const aa = i % 2 === 0
  out.push(q(
    `x-esat-b-gen-${i}`, "ESAT", "Biology", diffs[(i + 2) % 3],
    aa ? "Two heterozygous parents Aa × Aa have a child. What is the probability of genotype aa?" : "A parent Aa is crossed with aa. What is the probability of genotype Aa?",
    aa ? "1/4" : "1/2",
    aa ? ["1/2", "3/4", "1"] : ["1/4", "3/4", "1"],
    aa ? "Aa × Aa gives AA, Aa, Aa, aa, so one of four outcomes is aa." : "Aa produces A or a gametes equally; aa produces only a, so half the offspring are Aa.", i + 2
  ))
}

// ---------------- TARA: argument evaluation and quantitative problem solving ----------------
const taraContexts = [
  ["a town pedestrianised its centre", "retail sales rose", "a major festival began"],
  ["a school introduced morning exercise", "attendance improved", "bus routes changed"],
  ["a hospital changed appointment reminders", "missed appointments fell", "fees for missed appointments also changed"],
  ["a company allowed hybrid work", "staff retention rose", "salaries increased"],
  ["a city expanded cycle lanes", "cycling increased", "fuel prices rose"],
  ["a university recorded lectures", "average marks rose", "the exam format changed"],
  ["a library removed late fees", "borrowing increased", "opening hours were extended"],
  ["a museum launched free entry", "visitor numbers rose", "a major exhibition opened"],
]
for (let i = 1; i <= 160; i++) {
  const [policy, result, rival] = taraContexts[i % taraContexts.length]
  out.push(q(
    `x-tara-ct-${i}`, "TARA", "Critical Thinking", diffs[i % 3],
    `An argument says that after ${policy}, ${result}; therefore the policy caused the change. Which fact most weakens that inference?`,
    `${rival} at about the same time.`,
    ["The policy was discussed publicly.", "Some people disliked the policy.", "The result can be measured."],
    "A simultaneous alternative cause directly weakens a simple post hoc causal inference.", i
  ))
}
for (let i = 1; i <= 160; i++) {
  const workers = 2 + (i % 6), items = 12 + (i % 9)*2, minutes = 3 + (i % 5), newMinutes = minutes*2
  const perTeam = items/minutes, answer = perTeam*newMinutes
  out.push(q(
    `x-tara-ps-${i}`, "TARA", "Problem Solving", diffs[(i + 1) % 3],
    `A team of ${workers} workers completes ${items} identical units in ${minutes} minutes at a constant team rate. How many units would the same team complete in ${newMinutes} minutes?`,
    String(answer), [String(answer + workers), String(answer - workers), String(items + minutes)],
    `Doubling the time at the same team rate doubles output: ${items} → ${answer} units.`, i + 1
  ))
}

// ---------------- LNAT: longer clustered passages ----------------
const lnatThemes = [
  ["public transport pricing", "lower fares may increase access", "capacity constraints can create crowding"],
  ["school uniform rules", "uniforms may reduce visible differences", "rules can impose costs and restrict expression"],
  ["facial recognition", "the technology may improve identification", "errors and privacy costs can be unevenly distributed"],
  ["jury trials", "lay participation can support legitimacy", "complex cases may be difficult for non-specialists"],
  ["planning restrictions", "controls can protect shared spaces", "they can also restrict housing supply"],
  ["online anonymity", "anonymity can protect vulnerable speakers", "it can also reduce accountability"],
  ["university admissions", "contextual data may identify overlooked potential", "criteria can become less transparent"],
  ["environmental regulation", "rules can internalise external costs", "compliance can be expensive"],
  ["public protest", "protest can communicate political urgency", "disruption can burden people uninvolved in the dispute"],
  ["sentencing", "consistency can support equality before the law", "individual circumstances may justify flexibility"],
]
for (let i = 1; i <= 80; i++) {
  const [topic, pro, con] = lnatThemes[i % lnatThemes.length]
  const passage = `A council is reviewing ${topic}. Supporters argue that ${pro}. Critics reply that ${con}. The report concludes that neither side is decisive by itself: the policy should be judged by whether its benefits are substantial, whether its burdens fall fairly, and whether less restrictive alternatives could achieve similar aims.`
  const cluster = [
    ["What is the report's main conclusion?", "The policy should be assessed by benefits, fairness of burdens and available alternatives.", ["The supporters have proved the policy must be adopted.", "The critics have proved the policy must be rejected.", "Any burden makes a policy illegitimate."]],
    ["Which idea is treated as relevant by both sides?", "The consequences of the policy matter to its justification.", ["Only historical tradition matters.", "Public opinion automatically settles the issue.", "The report rejects all comparisons between alternatives."]],
    ["Which new fact would most strengthen the report's cautious approach?", "A less restrictive alternative appears to produce similar benefits.", ["The policy has a memorable slogan.", "The issue receives media attention.", "One councillor strongly supports it."]],
    ["Which assumption underlies the final recommendation?", "Benefits and burdens can be compared at least roughly.", ["Every person must experience identical outcomes.", "The policy must have zero cost.", "No alternative policy can exist."]],
  ] as const
  cluster.forEach((item, j) => out.push(q(
    `x-lnat-${i}-${j+1}`, "LNAT", "Passage reasoning", diffs[(i+j)%3],
    `Passage: ${passage}\n\n${item[0]}`, item[1], [...item[2]] as [string,string,string],
    "The best answer stays within the passage's qualified reasoning and does not turn a conditional argument into an absolute one.", i+j
  )))
}

// ---------------- UCAT: passage/data-set clusters and SJT ----------------
const vrThemes = [
  ["urban green roofs", "can reduce summer roof temperatures", "effects depend on depth, plant cover and weather"],
  ["sleep regularity", "is associated with better daytime alertness", "association alone does not prove causation"],
  ["screening programmes", "can identify disease earlier", "false positives and overdiagnosis can create harms"],
  ["public libraries", "can improve access to information", "use varies greatly between communities"],
  ["vaccination reminders", "can increase appointment attendance", "effects depend on access and trust"],
  ["exercise programmes", "can improve some health outcomes", "adherence affects observed benefit"],
  ["recycling systems", "can divert waste from landfill", "contamination can reduce efficiency"],
  ["remote consultations", "can improve convenience", "some problems still require examination in person"],
  ["school breakfast clubs", "may improve punctuality", "effects may differ with baseline deprivation"],
  ["air-quality sensors", "can reveal local patterns", "low-cost devices often need calibration"],
]
for (let i = 1; i <= 40; i++) {
  const [topic, claim, qualification] = vrThemes[i % vrThemes.length]
  const passage = `Evidence on ${topic} suggests it ${claim}. However, ${qualification}. Researchers therefore warn against treating one study or one setting as universally representative. A sensible interpretation preserves the observed benefit while recognising uncertainty about its size and transferability.`
  const cluster = [
    ["Which statement is best supported?", `The evidence about ${topic} is promising but qualified.`, ["The effect is guaranteed in every setting.", "The evidence proves there is no benefit.", "The qualification makes the evidence useless."]],
    ["Which statement would the author most likely reject?", "One result can be generalised to every context without further evidence.", ["Context can affect observed effects.", "Uncertainty can coexist with useful evidence.", "Transferability may require additional evidence."]],
    ["What is the role of the qualification?", "It limits how broadly the main finding should be applied.", ["It proves the opposite finding.", "It removes the need for evidence.", "It shows measurement is impossible."]],
    ["What further evidence would be most useful?", "Replication in a different setting with comparable measurements.", ["A slogan supporting the intervention.", "A single anecdote from one user.", "A description of the researchers' job titles."]],
  ] as const
  cluster.forEach((item,j)=>out.push(q(
    `x-ucat-vr-${i}-${j+1}`, "UCAT", "Verbal Reasoning", diffs[(i+j)%3],
    `Passage: ${passage}\n\n${item[0]}`, item[1], [...item[2]] as [string,string,string],
    "The passage supports a qualified interpretation and explicitly warns against unrestricted generalisation.", i+j
  )))
}
for (let i = 1; i <= 160; i++) {
  out.push(q(
    `x-ucat-dm-${i}`, "UCAT", "Decision Making", diffs[i%3],
    "All P are Q. No Q are R. Which statement must be true for any object that is P?",
    "It is not R.", ["It is R.", "It may or may not be Q.", "It is not Q."],
    "If every P is Q and Q is disjoint from R, every P must be outside R.", i
  ))
}
for (let i = 1; i <= 160; i++) {
  const rate = 10 + (i % 11), hours = 2 + (i % 5), total = rate*hours, newHours = 1.5 + (i % 5)*0.5, ans = rate*newHours
  out.push(q(
    `x-ucat-qr-${i}`, "UCAT", "Quantitative Reasoning", diffs[(i+1)%3],
    `A clinic processes ${total} records in ${hours} hours at a constant average rate. How many records would it process in ${newHours.toFixed(1)} hours?`,
    String(ans), [String(ans+rate), String(Math.max(0,ans-rate)), String(total+ans)],
    `The rate is ${total}/${hours} = ${rate} records per hour, so ${rate}×${newHours.toFixed(1)} = ${ans}.`, i+1
  ))
}
const sjt = [
  ["You notice confidential information visible on an unattended screen.", "Shield or close it if permitted and alert the responsible staff member.", "Take a photo as evidence.", "Tell friends so they know to be careful.", "Ignore it because you did not cause it."],
  ["A teammate makes an error that could affect a shared task.", "Raise it respectfully and help correct it promptly.", "Hide it to protect them.", "Publicly blame them.", "Wait until the deadline has passed."],
  ["You are asked to perform a task you have not been trained to do safely.", "Explain your limitation and seek appropriate supervision.", "Do it alone to appear confident.", "Ask another untrained student to do it.", "Pretend it has been completed."],
  ["You realise an instruction may have been misunderstood.", "Clarify the instruction before continuing.", "Guess and continue.", "Stay silent and hope someone else notices.", "Change the record later if needed."],
  ["A person asks for information you are not authorised to disclose.", "Explain that you cannot share it and direct them to the appropriate person.", "Share only part of it.", "Send a screenshot privately.", "Discuss it in a group chat."],
  ["A peer seems distressed and their work is deteriorating.", "Check in appropriately and encourage them to use available support.", "Diagnose the cause yourself.", "Tell unrelated people about it.", "Take over all of their responsibilities without discussion."],
]
for (let i = 1; i <= 160; i++) {
  const s = sjt[i % sjt.length]
  out.push(q(
    `x-ucat-sjt-${i}`, "UCAT", "Situational Judgement", diffs[(i+2)%3],
    `${s[0]} What is the most appropriate first response?`, s[1], [s[2],s[3],s[4]],
    "The strongest first response protects safety, confidentiality or team functioning and uses an appropriate person or process.", i+2
  ))
}

export const expandedQuestionBank: TestQuestion[] = out.filter(item => new Set(item.options).size === 4 && item.answer >= 0 && item.answer < 4)
export const expandedQuestionCount = expandedQuestionBank.length

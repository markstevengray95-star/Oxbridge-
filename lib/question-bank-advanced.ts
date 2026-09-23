import type { TestQuestion } from "@/lib/oxbridge-data"

const difficulties: TestQuestion["difficulty"][] = ["Foundation", "Stretch", "Challenge"]

function rotate<T>(items:T[], shift:number) {
  const n = ((shift % items.length) + items.length) % items.length
  return [...items.slice(n), ...items.slice(0,n)]
}

function mc(id:string,test:TestQuestion["test"],section:string,difficulty:TestQuestion["difficulty"],prompt:string,correct:string,distractors:[string,string,string],explanation:string,seed:number):TestQuestion {
  const options = rotate([correct,...distractors], seed % 4)
  return { id,test,section,difficulty,prompt,options,answer:options.indexOf(correct),explanation }
}

const out: TestQuestion[] = []

// TMUA — multi-step algebra, coordinate reasoning, proof and counting.
for (let i=1;i<=60;i++) {
  const a=2+(i%5), b=1+(i%7), c=3+(i%8), x=1+(i%6), y=a*x+b
  out.push(mc(`adv-tmua-alg-${i}`,"TMUA","Applications of Mathematical Knowledge",difficulties[i%3],`The functions f(x) = ${a}x + ${b} and g(x) = x² − ${c} are defined for real x. If f(${x}) = k, which value equals g(k)?`,String(y*y-c),[String(y-c),String(a*y+b-c),String(y*y+c)],`First evaluate f(${x})=${a}×${x}+${b}=${y}. Then g(k)=k²−${c}=${y}²−${c}=${y*y-c}.`,i))
}
for (let i=1;i<=60;i++) {
  const p=2+(i%7), q=3+(i%5)
  out.push(mc(`adv-tmua-ineq-${i}`,"TMUA","Applications of Mathematical Knowledge",difficulties[(i+1)%3],`For real x, suppose |x − ${p}| < ${q}. Which interval contains every possible value of x?`,`${p-q} < x < ${p+q}`,[`${p} < x < ${p+q}`,`x < ${p-q} or x > ${p+q}`,`${p-q} ≤ x ≤ ${p+q}`],`|x−${p}|<${q} means −${q}<x−${p}<${q}. Adding ${p} throughout gives ${p-q}<x<${p+q}.`,i))
}
for (let i=1;i<=60;i++) {
  const m=1+(i%5), c=2+(i%7), x1=1+(i%4), x2=x1+2+(i%4), dy=m*(x2-x1)
  out.push(mc(`adv-tmua-coord-${i}`,"TMUA","Applications of Mathematical Knowledge",difficulties[(i+2)%3],`A straight line has equation y = ${m}x + ${c}. Points A and B on the line have x-coordinates ${x1} and ${x2}. What is the change in y from A to B?`,String(dy),[String(m*x2+c),String(x2-x1),String(dy+c)],`For a straight line, Δy = gradient × Δx = ${m}×(${x2}−${x1})=${dy}.`,i))
}
const proofClaims:[string,string,string][] = [
  ["If n is divisible by 8, then n² is divisible by 16.","Always true","Write n=8k, so n²=64k², which is divisible by 16."],
  ["If n² is divisible by 3, then n is divisible by 3.","Always true","If n were not divisible by 3, then n ≡ ±1 mod 3 and n² ≡ 1 mod 3, a contradiction."],
  ["If ab is even, then both a and b are even.","False","A counterexample is a=2, b=3: ab is even but b is odd."],
  ["The sum of two irrational numbers is irrational.","False","√2 + (−√2) = 0, which is rational."],
  ["Every prime number is odd.","False","2 is prime and even."],
  ["If x² > 9, then x > 3.","False","x=−4 gives x²=16>9 but x is not greater than 3."],
]
for (let i=1;i<=120;i++) {
  const [claim,ans,why]=proofClaims[i%proofClaims.length]
  out.push(mc(`adv-tmua-proof-${i}`,"TMUA","Mathematical Reasoning",difficulties[i%3],`Consider the claim: “${claim}” Which evaluation is correct?`,ans,ans==="Always true"?["False: one counterexample is enough","True only for positive integers","Cannot be decided"]:["Always true","True except for zero","Cannot be decided"],why,i))
}
for (let i=1;i<=80;i++) {
  const n=4+(i%8), pairs=n*(n-1)/2
  out.push(mc(`adv-tmua-count-${i}`,"TMUA","Mathematical Reasoning",difficulties[(i+1)%3],`There are ${n} students and every pair must be compared exactly once. How many distinct pairwise comparisons are required?`,String(pairs),[String(n*n),String(n*(n-1)),String(n+2)],`Choose 2 students from ${n}: n(n−1)/2 = ${pairs}.`,i))
}

// ESAT — multi-step mathematics, physics, biology and chemistry.
for (let i=1;i<=80;i++) {
  const a=2+(i%6), b=3+(i%9), x=2+(i%5), y=a*x+b, target=y+a
  out.push(mc(`adv-esat-m1-fn-${i}`,"ESAT","Mathematics 1",difficulties[i%3],`A linear function satisfies f(${x}) = ${y} and has gradient ${a}. What is f(${x+1})?`,String(target),[String(y+1),String(target+b),String(y-a)],`Increasing x by 1 increases f(x) by the gradient ${a}. Hence f(${x+1})=${target}.`,i))
}
for (let i=1;i<=80;i++) {
  const u=2+(i%5), v=3+(i%7), hyp=Math.sqrt(u*u+v*v)
  out.push(mc(`adv-esat-m2-geom-${i}`,"ESAT","Mathematics 2",difficulties[(i+1)%3],`A right-angled triangle has perpendicular sides ${u} cm and ${v} cm. Which value is closest to the hypotenuse?`,`${hyp.toFixed(2)} cm`,[`${(u+v).toFixed(2)} cm`,`${(u*v).toFixed(2)} cm`,`${Math.abs(u-v).toFixed(2)} cm`],`By Pythagoras, h=√(${u}²+${v}²)=${hyp.toFixed(2)} cm.`,i))
}
for (let i=1;i<=100;i++) {
  const mass=2+(i%7), v0=2+(i%5), v1=v0+1+(i%4), dt=1+(i%3), acc=(v1-v0)/dt, force=mass*acc
  out.push(mc(`adv-esat-phys-data-${i}`,"ESAT","Physics",difficulties[(i+2)%3],`A ${mass} kg trolley changes speed from ${v0} m s⁻¹ to ${v1} m s⁻¹ in ${dt} s. Assuming constant acceleration, what resultant force acts on it?`,`${force.toFixed(2)} N`,[`${(mass*(v1-v0)).toFixed(2)} N`,`${(mass*v1/dt).toFixed(2)} N`,`${(force+mass).toFixed(2)} N`],`a=Δv/Δt=(${v1}−${v0})/${dt}=${acc.toFixed(2)} m s⁻², then F=ma=${force.toFixed(2)} N.`,i))
}
for (let i=1;i<=100;i++) {
  const control=20+(i%5), treated=control-(2+(i%4)), diff=control-treated
  out.push(mc(`adv-esat-bio-exp-${i}`,"ESAT","Biology",difficulties[i%3],`In an experiment, the control group has a mean response of ${control} units and the treatment group ${treated} units. Which statement is most defensible without information about variation or sample size?`,`The treatment group's observed mean is ${diff} units lower, but the strength of evidence is uncertain.`,[`The treatment definitely causes a ${diff}-unit reduction.`,`The treatment has no effect.`,`The difference must be statistically significant.`],`The observed means differ by ${diff}, but causation and statistical strength require information about design, variation and sample size.`,i))
}
for (let i=1;i<=100;i++) {
  const mass=5+(i%10), mr=25+(i%6)*5, moles=mass/mr, coeff=1+(i%3), product=moles*coeff
  out.push(mc(`adv-esat-chem-stoich-${i}`,"ESAT","Chemistry",difficulties[(i+1)%3],`A reaction produces ${coeff} mol of product for every 1 mol of reactant. A ${mass} g sample of reactant has Mᵣ = ${mr}. What theoretical amount of product is formed?`,`${product.toFixed(3)} mol`,[`${moles.toFixed(3)} mol`,`${(mass*mr*coeff).toFixed(1)} mol`,`${(moles/coeff).toFixed(3)} mol`],`Reactant amount=${mass}/${mr}=${moles.toFixed(3)} mol. Multiplying by ${coeff} gives ${product.toFixed(3)} mol product.`,i))
}

// TARA — argument evaluation and multi-stage quantitative reasoning.
const taraArguments:[string,string,string][] = [
  ["A town introduced a cycle lane and retail sales rose the following year.","Therefore the cycle lane caused the rise in retail sales.","Other changes may have affected retail sales over the same period."],
  ["Students who attend optional workshops get higher grades.","Therefore attending the workshops improves grades.","Students choosing workshops may already differ in motivation or prior attainment."],
  ["A hospital introduced a reminder app and missed appointments fell.","Therefore the app alone caused the fall.","Other policy or scheduling changes may have occurred at the same time."],
  ["A company allowed remote work and resignations fell.","Therefore remote work caused retention to improve.","Labour-market conditions or pay changes may also explain the change."],
]
for (let i=1;i<=140;i++) {
  const [evidence,conclusion,weakness]=taraArguments[i%taraArguments.length]
  out.push(mc(`adv-tara-ct-${i}`,"TARA","Critical Thinking",difficulties[i%3],`Evidence: ${evidence}\nConclusion: ${conclusion}\nWhich criticism most directly weakens the inference?`,weakness,["The conclusion is too short.","The evidence uses past tense.","The conclusion contains a causal verb."],`The argument moves from correlation or a before/after comparison to causation without excluding plausible alternatives.`,i))
}
for (let i=1;i<=140;i++) {
  const total=120+(i%8)*20, pct=20+(i%5)*5, first=Math.round(total*pct/100), remain=total-first, half=Math.round(remain/2)
  out.push(mc(`adv-tara-ps-${i}`,"TARA","Problem Solving",difficulties[(i+1)%3],`A project has a budget of £${total}. ${pct}% is spent on equipment. Half of the remaining budget is then spent on travel. How much remains after both expenses?`,`£${remain-half}`,[`£${remain}`,`£${half}`,`£${first}`],`${pct}% of £${total} is £${first}, leaving £${remain}. Spending half of that leaves £${remain-half}.`,i))
}

// LNAT — original linked passage sets, four questions per passage.
const lnatThemes:[string,string,string,string,string][] = [
  ["public libraries","Extending library opening hours is often defended as an equality measure. Yet longer hours do not automatically improve access if transport is poor or if users lack awareness of available services. The strongest case for extension therefore depends not only on opening the doors for longer, but on identifying which barriers actually prevent use. A policy can be symbolically inclusive while remaining practically inaccessible.","Access depends on more than formal availability.","symbolically inclusive","transport and awareness may remain barriers"],
  ["school uniforms","Uniform rules are commonly justified on grounds of equality and discipline. They can reduce visible differences in clothing, but they may also impose costs on families and do little to address deeper inequalities. Whether uniforms promote equality therefore depends on which kind of equality matters: visual similarity, financial burden, or equal participation in school life.","Different concepts of equality can point in different directions.","commonly justified","cost and deeper inequality complicate the claim"],
  ["urban green space","Cities often celebrate new parks as an environmental success. Green space can improve shade, biodiversity and recreation, but its benefits are not distributed automatically. If new parks raise nearby housing costs, some residents may be displaced from the very neighbourhoods receiving investment. Environmental improvement and social justice can therefore support each other, but they can also come apart.","Environmental and social benefits may diverge.","not distributed automatically","housing costs may displace residents"],
  ["public data","Publishing government data is often described as transparency. Publication can indeed make scrutiny possible, but a dataset that is difficult to interpret or stripped of necessary context may create only the appearance of openness. Transparency is therefore better understood as usable accountability rather than the mere release of information.","Transparency requires usability, not just publication.","appearance of openness","context and interpretability matter"],
  ["expert advice","Governments often rely on experts because specialised questions require specialised knowledge. Yet expertise does not remove value judgments: evidence may show likely consequences without deciding which consequences matter most. Good decision-making therefore requires both technical competence and explicit political judgment, rather than pretending one can replace the other.","Evidence informs but does not eliminate value judgments.","does not remove value judgments","experts can estimate consequences but not determine values"],
]
for (let i=1;i<=60;i++) {
  const [topic,passage,main,phrase,limit]=lnatThemes[i%lnatThemes.length]
  const set=`Original passage on ${topic}: ${passage}`
  out.push(mc(`adv-lnat-${i}-1`,"LNAT","Section A: passage-based multiple choice",difficulties[i%3],`${set}\n\nWhich statement best captures the author's main argument?`,main,["The policy discussed should always be rejected.","The issue can be resolved by collecting more data alone.","The author argues that intentions matter more than outcomes."],`The passage distinguishes a simple headline claim from the conditions needed for it to hold.`,i))
  out.push(mc(`adv-lnat-${i}-2`,"LNAT","Section A: passage-based multiple choice",difficulties[(i+1)%3],`${set}\n\nThe phrase “${phrase}” is used mainly to:`,`qualify a simple claim by introducing a limitation`,["state a legal rule","provide statistical evidence","change the topic entirely"],`The phrase signals that the apparent benefit is incomplete or conditional.`,i+1))
  out.push(mc(`adv-lnat-${i}-3`,"LNAT","Section A: passage-based multiple choice",difficulties[(i+2)%3],`${set}\n\nWhich consideration would most strengthen the author's reasoning?`,limit,["A slogan supporting the policy","A claim that everyone already agrees","A description unrelated to the policy's effects"],`The author's reasoning turns on practical limitations, so evidence about the stated barrier directly strengthens it.`,i+2))
  out.push(mc(`adv-lnat-${i}-4`,"LNAT","Section A: passage-based multiple choice",difficulties[(i+1)%3],`${set}\n\nWhich assumption is most consistent with the passage?`,`A policy should be judged partly by how it works in practice, not only by its stated aim.`,["Every policy with a good intention succeeds.","Symbolic effects never matter.","Only financial costs are relevant to policy evaluation."],`The passage contrasts formal or symbolic claims with practical consequences, implying that implementation matters.`,i+3))
}

// UCAT — clustered verbal reasoning plus decision, quantitative and situational judgement items.
const vrPassages:[string,string][] = [
  ["A coastal survey recorded nesting seabirds on three islands over five years. Counts rose on Island A, were stable on Island B, and fell on Island C. The report cautioned that weather affected the number of nests visible during each survey, so year-to-year changes should not automatically be treated as population changes.","The report treats visibility conditions as a possible source of measurement error."],
  ["A city trialled later evening buses on two routes. Passenger numbers increased, particularly on Fridays and Saturdays. The evaluation noted that a nearby entertainment venue opened during the same period, making it difficult to isolate the effect of the timetable change.","The evaluation cannot attribute all of the increase to the later buses."],
  ["Researchers compared two study methods. Students chose which method to use rather than being randomly assigned. The group using retrieval practice scored higher on a later quiz, but the authors warned that self-selection might explain part of the difference.","The study shows an association but does not by itself prove causation."],
  ["A museum introduced free entry for local residents. Visits by local postcodes increased, while visits from outside the area stayed similar. The museum did not collect information about how often the same people returned.","The data cannot show whether the increase came from more unique local visitors or repeat visits."],
]
for (let i=1;i<=50;i++) {
  const [passage,inference]=vrPassages[i%vrPassages.length], stem=`Passage: ${passage}`
  out.push(mc(`adv-ucat-vr-${i}-1`,"UCAT","Verbal Reasoning",difficulties[i%3],`${stem}\n\nWhich statement is best supported by the passage?`,inference,["The reported change definitely reflects a causal effect.","The study collected every variable needed for interpretation.","No useful conclusion can be drawn from the data."],`The passage explicitly identifies a limitation while allowing a narrower conclusion.`,i))
  out.push(mc(`adv-ucat-vr-${i}-2`,"UCAT","Verbal Reasoning",difficulties[(i+1)%3],`${stem}\n\nWhich statement would go beyond the information given?`,`The observed pattern proves that the intervention caused the change.`,["A limitation is acknowledged.","The observations differed across groups or periods.","The report avoids a stronger causal claim."],`The passage reports an observed pattern but explicitly warns against a definitive causal interpretation.`,i+1))
  out.push(mc(`adv-ucat-vr-${i}-3`,"UCAT","Verbal Reasoning",difficulties[(i+2)%3],`${stem}\n\nThe author's attitude is best described as:`,`cautious but willing to draw limited conclusions`,["completely dismissive","certain that causation has been established","uninterested in methodological limitations"],`The wording acknowledges useful observations while highlighting limits on inference.`,i+2))
  out.push(mc(`adv-ucat-vr-${i}-4`,"UCAT","Verbal Reasoning",difficulties[i%3],`${stem}\n\nWhat additional information would most improve interpretation?`,`Information addressing the specific limitation identified in the passage`,["A longer title for the report","A different font for the data table","A statement that the researchers worked hard"],`The most useful addition is evidence that directly addresses the uncertainty already identified.`,i+3))
}
for (let i=1;i<=120;i++) {
  const total=30+(i%10)*5, red=8+(i%5), blue=7+(i%4), both=2+(i%3), either=red+blue-both
  out.push(mc(`adv-ucat-dm-${i}`,"UCAT","Decision Making",difficulties[(i+1)%3],`In a group of ${total} people, ${red} choose option R, ${blue} choose option B, and ${both} choose both. How many choose R or B (or both)?`,String(either),[String(red+blue),String(total-either),String(both)],`Use inclusion–exclusion: |R∪B|=${red}+${blue}−${both}=${either}.`,i))
}
for (let i=1;i<=120;i++) {
  const price=20+(i%8)*5, rise=5+(i%5)*5, newPrice=price*(1+rise/100), qty=2+(i%5), total=newPrice*qty
  out.push(mc(`adv-ucat-qr-${i}`,"UCAT","Quantitative Reasoning",difficulties[i%3],`An item costs £${price}. Its price rises by ${rise}%, then ${qty} items are bought. What is the total cost?`,`£${total.toFixed(2)}`,[`£${(price*qty).toFixed(2)}`,`£${(newPrice+qty).toFixed(2)}`,`£${(price*(rise/100)*qty).toFixed(2)}`],`New unit price=£${newPrice.toFixed(2)}. Multiplying by ${qty} gives £${total.toFixed(2)}.`,i))
}
const sjt:[string,string,string,string,string][] = [
  ["You notice a colleague has entered a non-urgent figure incorrectly in a shared record.","Tell them privately and help ensure the record is corrected promptly.","Ignore it because the error is not yours.","Post about the mistake in a group chat.","Change the record secretly without telling anyone."],
  ["A team member appears upset after receiving feedback and is about to meet a client.","Check whether they are okay and, if needed, help them access appropriate support before the meeting.","Tell the client the team member is unreliable.","Make jokes to distract them.","Do nothing even if their distress could affect the meeting."],
  ["You are unsure whether information can be shared with someone asking for it.","Check the relevant confidentiality rules or ask an appropriate supervisor before sharing.","Share it because the person sounds convincing.","Send only part of it without checking.","Ask another student to decide for you."],
]
for (let i=1;i<=120;i++) {
  const s=sjt[i%sjt.length]
  out.push(mc(`adv-ucat-sjt-${i}`,"UCAT","Situational Judgement",difficulties[(i+2)%3],`${s[0]} What is the most appropriate response?`,s[1],[s[2],s[3],s[4]],`The strongest response protects safety, confidentiality and team functioning while using appropriate communication or escalation.`,i))
}

export const advancedQuestionBank: TestQuestion[] = out.filter(q => q.options.length===4 && new Set(q.options).size===4 && q.answer>=0 && q.answer<4)

export const advancedQuestionBankStats = {
  total: advancedQuestionBank.length,
  byTest: Object.fromEntries((["TMUA","ESAT","TARA","LNAT","UCAT"] as TestQuestion["test"][]).map(test => [test,advancedQuestionBank.filter(q => q.test===test).length])) as Record<TestQuestion["test"],number>,
}

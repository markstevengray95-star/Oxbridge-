import type { TestQuestion } from "@/lib/oxbridge-data"
export type Phase12Question = TestQuestion & {topic:string}
// Independent original practice reserve. Do not reallocate existing full-paper forms.
export const phase12QuestionBank:Phase12Question[] = [
 {
  "id": "phase12-authored-01",
  "test": "TMUA",
  "section": "Applications of Mathematical Knowledge",
  "topic": "Algebra",
  "difficulty": "Stretch",
  "prompt": "A monic quadratic has two distinct real roots r and s. Their sum is 6 and the sum of their squares is 20. What is the smaller root?",
  "options": [
   "1",
   "2",
   "3",
   "4",
   "5"
  ],
  "answer": 1,
  "explanation": "Since r²+s²=(r+s)²−2rs, 20=36−2rs, so rs=8. The roots solve x²−6x+8=0=(x−2)(x−4). The smaller is 2."
 },
 {
  "id": "phase12-authored-02",
  "test": "TMUA",
  "section": "Applications of Mathematical Knowledge",
  "topic": "Sequences",
  "difficulty": "Stretch",
  "prompt": "The third term of a geometric sequence is 12 and the sixth is 96. Its common ratio is positive. What is the sum of its first four terms?",
  "options": [
   "24",
   "36",
   "42",
   "45",
   "48"
  ],
  "answer": 3,
  "explanation": "The ratio cubed is 96/12=8, so the ratio is 2. The first term is 3. The sum is 3+6+12+24=45."
 },
 {
  "id": "phase12-authored-03",
  "test": "TMUA",
  "section": "Mathematical Reasoning",
  "topic": "Proof",
  "difficulty": "Stretch",
  "prompt": "For integers n, consider the claim: if n² is divisible by 12 then n is divisible by 6. Which argument establishes the claim?",
  "options": [
   "Test n=6 and n=12.",
   "n² divisible by 12 means n² divisible by 4 and 3; hence n is even and divisible by 3.",
   "Since n² is divisible by 12, n is divisible by 12.",
   "Every multiple of 6 has a square divisible by 12.",
   "Since n² is even, n is a multiple of 6."
  ],
  "answer": 1,
  "explanation": "If a prime divides a square it divides the integer. Divisibility by 4 implies evenness; divisibility by 3 implies a factor of 3. Their coprimality gives divisibility by 6."
 },
 {
  "id": "phase12-authored-04",
  "test": "TMUA",
  "section": "Mathematical Reasoning",
  "topic": "Logic",
  "difficulty": "Stretch",
  "prompt": "Let P and Q be statements. Which condition is logically equivalent to 'P is sufficient for Q, but not necessary for Q' across a set of possible cases?",
  "options": [
   "Every case with Q has P, and one case has neither.",
   "No case has both P and Q.",
   "Every case with P has Q, and at least one case has Q without P.",
   "One case has P without Q and every Q has P.",
   "P and Q hold in exactly the same cases."
  ],
  "answer": 2,
  "explanation": "Sufficiency means P implies Q in every case. Non-necessity requires a counterexample to Q implies P: a case with Q and not P."
 },
 {
  "id": "phase12-authored-05",
  "test": "ESAT",
  "section": "Mathematics 1",
  "topic": "Ratio",
  "difficulty": "Stretch",
  "prompt": "A tank is initially 3/5 full. Removing 18 litres leaves it 3/8 full. How many litres does the tank hold?",
  "options": [
   "48",
   "60",
   "72",
   "80",
   "90"
  ],
  "answer": 3,
  "explanation": "The fraction removed is 3/5−3/8=9/40. If 9/40 of capacity is 18 L, capacity=18×40/9=80 L."
 },
 {
  "id": "phase12-authored-06",
  "test": "ESAT",
  "section": "Mathematics 1",
  "topic": "Geometry",
  "difficulty": "Stretch",
  "prompt": "A rectangular sheet has perimeter 34 cm. Removing a 3 cm-wide strip parallel to its shorter side leaves a square. What was the original area?",
  "options": [
   "60 cm²",
   "66 cm²",
   "70 cm²",
   "72 cm²",
   "76 cm²"
  ],
  "answer": 2,
  "explanation": "Let shorter side be x, longer side x+3. 2(2x+3)=34, x=7. Area 7×10=70 cm²."
 },
 {
  "id": "phase12-authored-07",
  "test": "ESAT",
  "section": "Mathematics 2",
  "topic": "Algebra",
  "difficulty": "Stretch",
  "prompt": "For positive x, x+1/x=5. What is x³+1/x³?",
  "options": [
   "95",
   "100",
   "105",
   "110",
   "125"
  ],
  "answer": 3,
  "explanation": "(x+1/x)³=x³+1/x³+3(x+1/x). Therefore the required value is 125−15=110."
 },
 {
  "id": "phase12-authored-08",
  "test": "ESAT",
  "section": "Mathematics 2",
  "topic": "Coordinate geometry",
  "difficulty": "Stretch",
  "prompt": "The line y=2x+k is tangent to the parabola y=x². What is k?",
  "options": [
   "−4",
   "−2",
   "−1",
   "1",
   "2"
  ],
  "answer": 2,
  "explanation": "Intersection gives x²−2x−k=0. A tangent has one repeated root: discriminant 4+4k=0, hence k=−1."
 },
 {
  "id": "phase12-authored-09",
  "test": "ESAT",
  "section": "Physics",
  "topic": "Mechanics",
  "difficulty": "Stretch",
  "prompt": "A 2 kg trolley travelling at 6 m/s couples to a stationary 4 kg trolley on a frictionless track. What fraction of the initial kinetic energy remains?",
  "options": [
   "1/6",
   "1/3",
   "1/2",
   "2/3",
   "3/4"
  ],
  "answer": 1,
  "explanation": "Momentum conservation: 12=6v, so v=2 m/s. Initial KE=36 J, final KE=12 J. Fraction=1/3; kinetic energy is not conserved in this collision."
 },
 {
  "id": "phase12-authored-10",
  "test": "ESAT",
  "section": "Physics",
  "topic": "Electricity",
  "difficulty": "Stretch",
  "prompt": "A 6 Ω resistor and a 3 Ω resistor are connected in parallel across an ideal 12 V supply. The 3 Ω resistor is then disconnected. How does the total power change?",
  "options": [
   "72 W to 24 W",
   "72 W to 48 W",
   "48 W to 24 W",
   "24 W to 72 W",
   "48 W to 72 W"
  ],
  "answer": 0,
  "explanation": "Parallel power is V²/6 + V²/3 =24+48=72 W. After disconnecting the 3 Ω branch, only 24 W remains."
 },
 {
  "id": "phase12-authored-11",
  "test": "ESAT",
  "section": "Chemistry",
  "topic": "Stoichiometry",
  "difficulty": "Stretch",
  "prompt": "In 2A + B → 3C, 0.18 mol A reacts with 0.12 mol B to completion. What amounts of C and unreacted B remain?",
  "options": [
   "0.27 mol C; 0.03 mol B",
   "0.36 mol C; 0.03 mol B",
   "0.27 mol C; 0 mol B",
   "0.18 mol C; 0.06 mol B",
   "0.36 mol C; 0 mol B"
  ],
  "answer": 0,
  "explanation": "A limits the reaction: 0.18/2=0.09 mol reaction extent. It produces 0.27 mol C and consumes 0.09 mol B, leaving 0.03 mol."
 },
 {
  "id": "phase12-authored-12",
  "test": "ESAT",
  "section": "Chemistry",
  "topic": "Equilibria",
  "difficulty": "Stretch",
  "prompt": "For an exothermic reversible reaction between gases X ⇌ 2Y, which pair of changes both favour a higher equilibrium fraction of Y?",
  "options": [
   "Increase pressure and decrease temperature",
   "Decrease pressure and increase temperature",
   "Increase pressure and increase temperature",
   "Decrease pressure and decrease temperature",
   "Add a catalyst and increase pressure"
  ],
  "answer": 3,
  "explanation": "Lower pressure favours the side with more gas molecules (Y). Lower temperature favours the exothermic direction. Catalysts affect rates rather than equilibrium composition."
 },
 {
  "id": "phase12-authored-13",
  "test": "ESAT",
  "section": "Biology",
  "topic": "Genetics",
  "difficulty": "Stretch",
  "prompt": "Two heterozygous individuals Aa have offspring. The recessive aa genotype is lethal before birth, while AA and Aa survive equally. Among live offspring, what fraction is heterozygous?",
  "options": [
   "1/4",
   "1/3",
   "1/2",
   "2/3",
   "3/4"
  ],
  "answer": 3,
  "explanation": "At conception the proportions are 1/4 AA, 1/2 Aa and 1/4 aa. Conditioning on survival gives (1/2)/(3/4)=2/3."
 },
 {
  "id": "phase12-authored-14",
  "test": "ESAT",
  "section": "Biology",
  "topic": "Experimental reasoning",
  "difficulty": "Stretch",
  "prompt": "A membrane separates solutions of equal water potential. One contains a solute that can cross the membrane; the other contains a solute that cannot. Which prediction is most justified initially?",
  "options": [
   "Water moves towards the permeable solute immediately.",
   "There is no initial net water movement, but solute movement can alter the gradient.",
   "Water moves towards the impermeable solute at a fixed rate.",
   "Equal water potentials prevent all molecular movement.",
   "Solute permeability cannot affect later water movement."
  ],
  "answer": 1,
  "explanation": "Equal water potentials imply no initial net water movement. A permeable solute may diffuse, changing water potentials and therefore subsequent water movement."
 },
 {
  "id": "phase12-authored-15",
  "test": "TARA",
  "section": "Critical Thinking",
  "topic": "Assumptions",
  "difficulty": "Stretch",
  "prompt": "A council argues that extending library hours will increase exam results because pupils who currently use libraries more often achieve higher marks. Which assumption is most important?",
  "options": [
   "Libraries currently open on weekdays.",
   "Examination marks are published annually.",
   "The association reflects, at least partly, a beneficial effect of library use rather than solely other differences.",
   "Pupils prefer books to online resources.",
   "Library opening hours are identical across towns."
  ],
  "answer": 2,
  "explanation": "The argument moves from correlation to an intervention. It needs a causal contribution from library use; selection or prior motivation could otherwise explain the observed difference."
 },
 {
  "id": "phase12-authored-16",
  "test": "TARA",
  "section": "Critical Thinking",
  "topic": "Weakening arguments",
  "difficulty": "Stretch",
  "prompt": "A company claims its new scheduling software caused a fall in missed appointments after installation. Which finding most weakens that explanation?",
  "options": [
   "Staff found the interface easy to learn.",
   "The number of appointments remained broadly stable.",
   "The software costs less than the previous system.",
   "A simultaneous reminder programme produced a similar fall in clinics that did not install the software.",
   "The company has used software for other tasks."
  ],
  "answer": 3,
  "explanation": "The independent comparison suggests reminders, not necessarily the software, account for the change. The other details do not directly challenge causal attribution."
 },
 {
  "id": "phase12-authored-17",
  "test": "TARA",
  "section": "Problem Solving",
  "topic": "Constraints",
  "difficulty": "Foundation",
  "prompt": "A hall seats 132 people. A group buys adult tickets at £7 and child tickets at £4, fills all seats and pays £732. How many child tickets were bought?",
  "options": [
   "52",
   "56",
   "60",
   "64",
   "68"
  ],
  "answer": 3,
  "explanation": "If all were adult tickets the cost would be £924. Each child saves £3, and the actual saving is £192. Therefore 64 child tickets."
 },
 {
  "id": "phase12-authored-18",
  "test": "TARA",
  "section": "Problem Solving",
  "topic": "Scheduling",
  "difficulty": "Stretch",
  "prompt": "A printer makes 12 posters in 8 minutes at constant rate. A second printer makes 9 in 6 minutes. Both run for 10 minutes, then only the first runs for another 4 minutes. How many posters are printed?",
  "options": [
   "30",
   "32",
   "34",
   "36",
   "38"
  ],
  "answer": 3,
  "explanation": "Both print 1.5 posters per minute, so together print 30 in ten minutes; the first prints six more in four minutes. Total 36."
 },
 {
  "id": "phase12-authored-19",
  "test": "LNAT",
  "section": "Argumentative passages",
  "topic": "Inference",
  "difficulty": "Stretch",
  "prompt": "A city proposes replacing cash fares on buses with a digital-only payment system. Advocates argue that boarding will be faster, reducing delays. Opponents note that passengers without reliable access to digital accounts may face exclusion. The author argues that the proposal should be judged not by average boarding time alone, but by whether reasonable alternatives exist for affected passengers. A pilot could test delay reductions and the accessibility of a prepaid card system before a permanent decision.\n\nWhich statement best captures the author's conclusion?",
  "options": [
   "Cash fares should be retained permanently.",
   "Faster boarding should be the overriding criterion.",
   "The proposal should be evaluated on both efficiency and access before a permanent decision.",
   "Digital accounts should be made compulsory."
  ],
  "answer": 2,
  "explanation": "The author explicitly rejects average boarding time as the sole criterion and proposes testing both delay and accessibility. The conclusion is conditional rather than absolute."
 },
 {
  "id": "phase12-authored-20",
  "test": "LNAT",
  "section": "Argumentative passages",
  "topic": "Strengthening",
  "difficulty": "Stretch",
  "prompt": "A city proposes replacing cash fares on buses with a digital-only payment system. Advocates argue that boarding will be faster, reducing delays. Opponents note that passengers without reliable access to digital accounts may face exclusion. The author argues that the proposal should be judged not by average boarding time alone, but by whether reasonable alternatives exist for affected passengers. A pilot could test delay reductions and the accessibility of a prepaid card system before a permanent decision.\n\nWhich finding most supports the author's proposed pilot?",
  "options": [
   "Some buses already have card readers.",
   "Prepaid cards are popular with frequent passengers.",
   "A nearby city saved time but found that a substantial minority could not obtain its payment cards.",
   "The city has used pilots for road repairs."
  ],
  "answer": 2,
  "explanation": "The comparison demonstrates a real possibility of efficiency gains alongside exclusion, precisely the two outcomes the proposed pilot should investigate."
 },
 {
  "id": "phase12-authored-21",
  "test": "LNAT",
  "section": "Argumentative passages",
  "topic": "Author's position",
  "difficulty": "Stretch",
  "prompt": "A museum holds objects acquired under different historical circumstances. A critic argues that returning some objects necessarily undermines the idea of a universal museum. The author replies that public access is not identical to permanent possession: loans, joint exhibitions and digital records can widen access without settling every ownership dispute in the same way. The author does not claim these arrangements remove every difficulty, but argues that individual cases deserve consideration rather than a single rule.\n\nWhat does the author primarily dispute?",
  "options": [
   "That museums can offer public access.",
   "That returning any object necessarily undermines universal access.",
   "That historical circumstances vary.",
   "That ownership disputes can be difficult."
  ],
  "answer": 1,
  "explanation": "The author separates public access from possession, challenging the asserted necessary link between returning an object and undermining access."
 },
 {
  "id": "phase12-authored-22",
  "test": "LNAT",
  "section": "Argumentative passages",
  "topic": "Limits",
  "difficulty": "Stretch",
  "prompt": "A museum holds objects acquired under different historical circumstances. A critic argues that returning some objects necessarily undermines the idea of a universal museum. The author replies that public access is not identical to permanent possession: loans, joint exhibitions and digital records can widen access without settling every ownership dispute in the same way. The author does not claim these arrangements remove every difficulty, but argues that individual cases deserve consideration rather than a single rule.\n\nWhich policy is most consistent with the passage?",
  "options": [
   "Assess each object individually, including ownership evidence and ways to preserve access.",
   "Return every object immediately regardless of its history.",
   "Retain all objects because loans are impractical.",
   "Replace physical exhibitions entirely with digital records."
  ],
  "answer": 0,
  "explanation": "Case-by-case assessment follows the qualified conclusion. The passage neither requires universal return nor permanent retention nor digital-only access."
 },
 {
  "id": "phase12-authored-23",
  "test": "UCAT",
  "section": "Verbal Reasoning",
  "topic": "Passage inference",
  "difficulty": "Foundation",
  "prompt": "A pilot scheme recorded journeys on three bus routes for six weeks. Routes A and B received new timetable displays. Route C kept its old displays. Passenger satisfaction rose on A, was unchanged on B, and fell on C. The researchers said the pilot could not separate the effect of displays from differences in route reliability.\n\nStatement: Passenger satisfaction rose on both routes receiving new displays.",
  "options": [
   "True",
   "False",
   "Can't tell"
  ],
  "answer": 1,
  "explanation": "The passage explicitly says satisfaction was unchanged on B. Therefore the statement is false."
 },
 {
  "id": "phase12-authored-24",
  "test": "UCAT",
  "section": "Verbal Reasoning",
  "topic": "Passage inference",
  "difficulty": "Foundation",
  "prompt": "A pilot scheme recorded journeys on three bus routes for six weeks. Routes A and B received new timetable displays. Route C kept its old displays. Passenger satisfaction rose on A, was unchanged on B, and fell on C. The researchers said the pilot could not separate the effect of displays from differences in route reliability.\n\nStatement: Route A had more passengers than Route B during the pilot.",
  "options": [
   "True",
   "False",
   "Can't tell"
  ],
  "answer": 2,
  "explanation": "The passage gives satisfaction changes, not the number of passengers on either route."
 },
 {
  "id": "phase12-authored-25",
  "test": "UCAT",
  "section": "Decision Making",
  "topic": "Conditional probability",
  "difficulty": "Stretch",
  "prompt": "A bag contains 3 green and 5 orange counters. Two are drawn without replacement. Given that the first counter was orange, what is the probability that the second is green?",
  "options": [
   "3/8",
   "3/7",
   "4/7",
   "5/8"
  ],
  "answer": 1,
  "explanation": "After drawing orange, seven counters remain, of which three are green. The conditional probability is 3/7."
 },
 {
  "id": "phase12-authored-26",
  "test": "UCAT",
  "section": "Decision Making",
  "topic": "Deduction",
  "difficulty": "Stretch",
  "prompt": "Four presentations P, Q, R and S are scheduled in slots 1–4. P is earlier than R; S is immediately after Q; R is not last. Which schedule satisfies every condition?",
  "options": [
   "P, R, Q, S",
   "Q, S, R, P",
   "P, Q, S, R",
   "R, P, Q, S"
  ],
  "answer": 0,
  "explanation": "P precedes R, R is in slot 2 rather than last, and S immediately follows Q. Each other schedule breaks one condition."
 },
 {
  "id": "phase12-authored-27",
  "test": "UCAT",
  "section": "Quantitative Reasoning",
  "topic": "Data interpretation",
  "difficulty": "Stretch",
  "prompt": "A clinic records visits: Monday 80, Tuesday 120, Wednesday 100. The respective cancellation rates are 10%, 15% and 8%. How many booked visits were not cancelled?",
  "options": [
   "258",
   "264",
   "266",
   "270"
  ],
  "answer": 2,
  "explanation": "Cancellations are 8+18+8=34. Total bookings=300. Non-cancelled visits=266."
 },
 {
  "id": "phase12-authored-28",
  "test": "UCAT",
  "section": "Quantitative Reasoning",
  "topic": "Multi-step percentages",
  "difficulty": "Stretch",
  "prompt": "A supplier offers 12% off an order worth £250 before adding 20% tax on the reduced price. Delivery costs £8 with no further tax. What is the final cost?",
  "options": [
   "£264",
   "£268",
   "£272",
   "£278"
  ],
  "answer": 2,
  "explanation": "Discounted cost=250×0.88=220. Taxed cost=220×1.2=264. Add delivery £8 to get £272."
 },
 {
  "id": "phase12-authored-29",
  "test": "UCAT",
  "section": "Situational Judgement",
  "topic": "Professionalism",
  "difficulty": "Stretch",
  "prompt": "A student on a fictional hospital placement notices another student has left a printed patient list on a public desk. How appropriate is it to secure the document and promptly inform the supervising staff member?",
  "options": [
   "Very appropriate",
   "Appropriate, but not ideal",
   "Inappropriate, but not awful",
   "Very inappropriate"
  ],
  "answer": 0,
  "explanation": "Protecting confidential information immediately and informing the supervisor is proportionate. Do not access unnecessary patient details or handle the incident beyond your role."
 },
 {
  "id": "phase12-authored-30",
  "test": "UCAT",
  "section": "Situational Judgement",
  "topic": "Teamwork",
  "difficulty": "Stretch",
  "prompt": "A student realises they entered the wrong date into a shared teaching-session spreadsheet. No patient data are involved. How appropriate is it to correct the date and tell anyone relying on the previous entry?",
  "options": [
   "Very appropriate",
   "Appropriate, but not ideal",
   "Inappropriate, but not awful",
   "Very inappropriate"
  ],
  "answer": 0,
  "explanation": "Prompt transparent correction prevents downstream errors. The response is proportionate to a minor administrative mistake."
 }
]

export function nextChallengeQuestion(pool:Phase12Question[],attempts:{id:string;correct:boolean}[]){
 const seen=new Set(attempts.map(a=>a.id))
 const misses=new Set(pool.filter(q=>attempts.some(a=>a.id===q.id&&!a.correct)).map(q=>q.topic))
 const recent=attempts.filter(a=>pool.some(q=>q.id===a.id)).slice(0,3)
 const preferred=recent.length>=2&&recent.every(a=>a.correct)?"Challenge":recent.length>=2&&recent.every(a=>!a.correct)?"Foundation":"Stretch"
 return pool.filter(q=>!seen.has(q.id)).map((q,i)=>({q,i,score:Number(misses.has(q.topic))*3+Number(q.difficulty===preferred)})).sort((a,b)=>b.score-a.score||a.i-b.i)[0]?.q??null
}

/** Phase 11: bounded formative practice, not an admissions prediction. */
export type CoachSkill = "inference" | "evidence" | "quantitative" | "revision"
export type CoachQuestion = { prompt: string; options: [string,string,string]; correct: number; explanation: string }
export type CoachPack = { id: string; skill: CoachSkill; title: string; lesson: string; diagnostic: CoachQuestion; transfer: CoachQuestion; course?: string; review?: boolean; written?: {prompt:string;criteria:string[]} }
export type CoachAttempt = { packId: string; diagnosticCorrect: boolean; transferCorrect: boolean; completedAt: string }
export const COACH_STATE_PREFIX = "fellow-academic-coach-v1:"
export const skillLabels: Record<CoachSkill,string> = {inference:"Justifying conclusions",evidence:"Testing explanations",quantitative:"Quantitative interpretation",revision:"Adapting to new evidence"}
const q = (prompt:string, options:[string,string,string], correct:number, explanation:string):CoachQuestion => ({prompt,options,correct,explanation})
export const coachPacks: CoachPack[] = [
 {id:"inference-1",skill:"inference",title:"Make a defensible inference",lesson:"A conclusion must follow from stated premises. Test whether there is a possible case in which the premises hold but the conclusion fails.",
 diagnostic:q("All samples that contain copper conduct electricity. Sample X conducts electricity. What follows?",["X must contain copper.","X may contain copper, but other conductors are possible.","X cannot contain copper."],1,"Conductivity is a consequence of containing copper, not sufficient proof of copper."),
 transfer:q("Every member of a club has a library card. Priya has a library card. What can you infer?",["She might be a club member, but the card alone does not establish membership.","She belongs to the club.","She is not a club member."],0,"The implication runs from membership to a card, not the reverse.")},
 {id:"inference-2",skill:"inference",title:"Separate necessary and sufficient conditions",lesson:"A necessary condition must hold for a claim to be true. A sufficient condition guarantees it. They are not interchangeable.",
 diagnostic:q("A scholarship requires a submitted essay, but the essay alone does not guarantee an award. What is the essay?",["Sufficient but not necessary.","Both necessary and sufficient.","Necessary but not sufficient."],2,"An award requires the essay, but other conditions must also be satisfied."),
 transfer:q("A rectangle has four right angles. Is having four right angles sufficient for a quadrilateral to be a square?",["No: equal side lengths are also required.","Yes: every rectangle is a square.","No: a square does not have right angles."],0,"A non-square rectangle is a counterexample.")},
 {id:"evidence-1",skill:"evidence",title:"Distinguish rival explanations",lesson:"A useful test gives different predictions under competing explanations. Change one relevant variable while controlling the others.",
 diagnostic:q("Two groups of plants grow at different rates. One received more light and more fertiliser. Which follow-up best isolates light?",["Compare plants with different light but identical fertiliser, water and plant type.","Give one group extra light and extra fertiliser again.","Measure the tallest plant only."],0,"Holding other factors constant isolates the effect of light."),
 transfer:q("Two historians argue that a price rise was caused by either a transport disruption or a general shortage. Which evidence best distinguishes these?",["A newspaper saying prices rose.","A list of prices without dates or locations.","Comparable price records from affected and unaffected transport routes during the same period."],2,"The rival explanations predict different geographical patterns, assuming other differences are considered.")},
 {id:"evidence-2",skill:"evidence",title:"Check causal claims",lesson:"A correlation may arise through causation, reverse causation, or a shared cause. Ask how the observation could arise without the proposed causal link.",
 diagnostic:q("Students who use a revision app have higher marks. Which claim is best supported by this observation alone?",["The app definitely raises marks.","The association is consistent with an effect, but prior attainment or motivation might explain it.","Higher marks always cause app use."],1,"The observation does not establish the direction or cause of the association."),
 transfer:q("Towns with more libraries have higher average incomes. What would most improve a study of a possible library effect?",["Assume libraries create income.","Discard all towns with low income.","Compare changes in comparable towns, accounting for prior income and other plausible confounders."],2,"A better comparison reduces alternative explanations, though it does not automatically prove causation.")},
 {id:"quantitative-1",skill:"quantitative",title:"Interpret rates, not just totals",lesson:"Compare rates using the relevant denominator. Check the units and calculate the proportion before interpreting raw totals.",
 diagnostic:q("Clinic A reports 12 successes from 20 cases; B reports 21 from 50. Which has the higher observed success proportion?",["B, because 21 is greater than 12.","They are equal.","A: 60% versus 42%."],2,"12/20 = 0.60, while 21/50 = 0.42. This is descriptive, not proof of better care."),
 transfer:q("A machine produces 6 defects in 120 items and another 9 in 300. Which has the lower defect rate?",["The second: 3% versus 5%.","The first: 6 is fewer than 9.","They have the same defect rate."],0,"Divide defects by output: 6/120 = 5%, 9/300 = 3%.")},
 {id:"quantitative-2",skill:"quantitative",title:"Reason with proportional change",lesson:"Identify the initial value and express changes as factors. Successive percentages normally multiply rather than add.",
 diagnostic:q("A price rises by 20% and then falls by 20%. What is the final price relative to the start?",["Unchanged.","4% lower.","4% higher."],1,"1.20 × 0.80 = 0.96, so the final price is 96% of the original."),
 transfer:q("A sample loses 25% of its mass, then gains 20% of its remaining mass. What fraction of the original mass remains?",["95%.","100%.","90%."],2,"0.75 × 1.20 = 0.90.")},
 {id:"revision-1",skill:"revision",title:"Revise a model without discarding everything",lesson:"When evidence conflicts with a prediction, identify the assumption that failed. Retain the parts that still explain observations and make a new testable prediction.",
 diagnostic:q("A model predicts that travel time is proportional to distance at fixed speed. A trip takes longer after a road closure. What is the best revision?",["Discard the relationship between speed, distance and time.","Conclude the distance equation is false.","Check whether speed or actual route distance changed; the original prediction assumed a fixed speed and the stated distance."],2,"The new conditions may violate the assumptions rather than the underlying relationship."),
 transfer:q("An interpretation of a poem assumes the speaker is sincere. A later line appears ironic. What is the strongest response?",["Re-examine sincerity using the new line, and check which earlier textual observations still hold.","Ignore the later line.","Reject all observations about the poem."],0,"Revise the interpretation in light of new evidence without discarding supported details.")},
 {id:"revision-2",skill:"revision",title:"Check the limits of a prediction",lesson:"Do not extend a model beyond its tested conditions without checking the assumptions. A result outside the original range can reveal a boundary.",
 diagnostic:q("A spring extends proportionally to load for small loads. At a large load the extension is no longer proportional. What is the best interpretation?",["The small-load relationship may still be valid within its range.","All previous measurements must be wrong.","The relationship must remain proportional at every load."],0,"The observation limits the range over which the model is supported."),
 transfer:q("A policy increased attendance in small schools. A large school shows no improvement. What should you conclude?",["The policy never works.","The effect may depend on school context; investigate which conditions differ.","The large school's evidence must be ignored."],1,"The effect may have a boundary condition; the earlier result need not be invalid.")}
]
// Authored subject and delayed-transfer exercises. IDs are stable account record keys.
coachPacks.push(...([
 {
  "id": "subject-physics",
  "course": "physics",
  "skill": "quantitative",
  "title": "Mechanics: compare models",
  "lesson": "Use conservation laws and state the conditions under which they apply.",
  "diagnostic": {
   "prompt": "A cart doubles its speed at constant mass. What happens to kinetic energy?",
   "options": [
    "Doubles",
    "Quadruples",
    "Remains unchanged"
   ],
   "correct": 1,
   "explanation": "Kinetic energy is proportional to speed squared."
  },
  "transfer": {
   "prompt": "A ball falls from rest through twice the height, ignoring drag. What happens to impact speed?",
   "options": [
    "Multiplies by two",
    "Stays the same",
    "Multiplies by √2"
   ],
   "correct": 2,
   "explanation": "mgh = ½mv², so speed scales with the square root of height."
  },
  "written": {
   "prompt": "Two balls with different masses fall through the same height. Explain when they reach the same speed and what would invalidate the model.",
   "criteria": [
    "Conservation of energy or constant gravitational acceleration",
    "Mass cancels in the ideal model",
    "Discuss drag or other non-ideal conditions"
   ]
  }
 },
 {
  "id": "subject-maths",
  "course": "mathematics",
  "skill": "inference",
  "title": "Mathematics: proof and counterexample",
  "lesson": "One counterexample disproves a universal statement; examples alone cannot prove it.",
  "diagnostic": {
   "prompt": "Which disproves the claim that every positive integer has an even square?",
   "options": [
    "3² = 9",
    "2² = 4",
    "4² = 16"
   ],
   "correct": 0,
   "explanation": "An odd square is a single counterexample."
  },
  "transfer": {
   "prompt": "Which is sufficient to prove the sum of two odd integers is even?",
   "options": [
    "Check 3+5 only",
    "Observe many examples",
    "Write them as 2a+1 and 2b+1 and simplify"
   ],
   "correct": 2,
   "explanation": "The general expression is 2(a+b+1)."
  },
  "written": {
   "prompt": "Prove that the square of any odd integer is odd, then explain why numerical examples do not constitute a proof.",
   "criteria": [
    "Represent odd integers as 2k+1",
    "Expand and express as twice an integer plus one",
    "Distinguish proof from examples"
   ]
  }
 },
 {
  "id": "subject-computing",
  "course": "computer science",
  "skill": "inference",
  "title": "Computing: algorithm assumptions",
  "lesson": "An algorithm's correctness depends on its preconditions and the invariant maintained.",
  "diagnostic": {
   "prompt": "Binary search assumes which property of an array?",
   "options": [
    "All values are distinct",
    "The array is sorted",
    "The array length is even"
   ],
   "correct": 1,
   "explanation": "Sorted order permits safely discarding half of the search space."
  },
  "transfer": {
   "prompt": "A function returns the maximum element after initialising max to zero. Which input exposes a bug?",
   "options": [
    "[0, 1]",
    "[7, 3]",
    "[-5, -2]"
   ],
   "correct": 2,
   "explanation": "Zero would be returned even though it is absent and larger than the actual maximum."
  },
  "written": {
   "prompt": "Explain an invariant for a one-pass maximum-finding algorithm and why initialising from the first element works for non-empty arrays.",
   "criteria": [
    "State invariant for processed prefix",
    "Initialisation from first element",
    "Maintenance and termination"
   ]
  }
 },
 {
  "id": "subject-engineering",
  "course": "engineering",
  "skill": "evidence",
  "title": "Engineering: test design choices",
  "lesson": "Compare designs under the same loading conditions and distinguish a measured outcome from a causal explanation.",
  "diagnostic": {
   "prompt": "Two beams have different materials and dimensions. What isolates the effect of material on bending?",
   "options": [
    "Test beams of equal geometry and load",
    "Use different loads too",
    "Choose the longer beam"
   ],
   "correct": 0,
   "explanation": "Matching geometry and load controls alternative explanations."
  },
  "transfer": {
   "prompt": "A prototype fails more often outdoors. Which test best isolates temperature?",
   "options": [
    "Compare unrelated outdoor prototypes",
    "Change temperature while controlling other environmental factors",
    "Record only the date of failure"
   ],
   "correct": 1,
   "explanation": "A controlled temperature comparison isolates a plausible cause."
  },
  "written": {
   "prompt": "Propose an experiment to investigate whether changing a beam's cross-section affects bending, with a prediction and limitations.",
   "criteria": [
    "Identify changed and controlled variables",
    "Specify measurable deflection and prediction",
    "Discuss repeat measurements and limitations"
   ]
  }
 },
 {
  "id": "subject-chemistry",
  "course": "chemistry",
  "skill": "evidence",
  "title": "Chemistry: kinetics and evidence",
  "lesson": "A proposed mechanism needs predictions that can be compared with measurements.",
  "diagnostic": {
   "prompt": "A reaction runs faster after temperature and concentration both rise. How isolate temperature?",
   "options": [
    "Raise both again",
    "Measure final colour only",
    "Vary temperature at fixed initial concentrations"
   ],
   "correct": 2,
   "explanation": "Changing only temperature permits a controlled comparison."
  },
  "transfer": {
   "prompt": "Doubling reactant A doubles initial rate while B stays fixed. What does this support under these conditions?",
   "options": [
    "First-order dependence on A",
    "A one-step mechanism is proved",
    "Zero-order dependence on A"
   ],
   "correct": 0,
   "explanation": "The measured dependence supports first order in A but not a unique mechanism."
  },
  "written": {
   "prompt": "Two mechanisms predict different dependence of initial rate on concentration. Explain an experiment to distinguish them and why matching one rate law does not prove a mechanism.",
   "criteria": [
    "Controlled initial-rate experiment",
    "Compare specific predicted dependencies",
    "A rate law may fit multiple mechanisms"
   ]
  }
 },
 {
  "id": "subject-biology",
  "course": "biology",
  "skill": "evidence",
  "title": "Biology: controls and competing causes",
  "lesson": "Use comparable groups and test alternative explanations before making causal claims.",
  "diagnostic": {
   "prompt": "Fertiliser-treated plants receive more water too. Which design improves the test?",
   "options": [
    "Measure only treated plants",
    "Hold water constant and randomise fertiliser treatment",
    "Add a different plant species"
   ],
   "correct": 1,
   "explanation": "Control water and allocate treatments to reduce bias."
  },
  "transfer": {
   "prompt": "An allele is common in a population. What can frequency alone establish?",
   "options": [
    "It must be advantageous",
    "It must be harmful",
    "Frequency alone cannot establish selective advantage"
   ],
   "correct": 2,
   "explanation": "Selection, drift, migration and history can affect frequency."
  },
  "written": {
   "prompt": "Design a study testing whether a trait increases survival in a defined environment, without assuming that correlation proves adaptation.",
   "criteria": [
    "Define measurable survival and trait",
    "Account for environmental or genetic confounding",
    "Distinguish association from causal selection"
   ]
  }
 },
 {
  "id": "subject-medicine",
  "course": "medicine",
  "skill": "quantitative",
  "title": "Medicine: interpret screening data",
  "lesson": "The proportion of positive tests that are true positives depends on prevalence as well as test performance.",
  "diagnostic": {
   "prompt": "In 1000 people, 10 have a condition; all 10 test positive and 90 unaffected people test positive. What fraction of positive tests are true positives?",
   "options": [
    "10%",
    "90%",
    "100%"
   ],
   "correct": 0,
   "explanation": "10 of 100 positive results are true positives."
  },
  "transfer": {
   "prompt": "With unchanged sensitivity and specificity, lower prevalence generally changes positive predictive value how?",
   "options": [
    "Raises it",
    "Lowers it",
    "Always leaves it unchanged"
   ],
   "correct": 1,
   "explanation": "Fewer true positives relative to false positives lowers positive predictive value."
  },
  "written": {
   "prompt": "Explain why a positive screening result is not automatically a diagnosis, using prevalence and false positives.",
   "criteria": [
    "Distinguish sensitivity and positive predictive value",
    "Use a denominator or example",
    "Explain confirmatory testing in general terms"
   ]
  }
 },
 {
  "id": "subject-psychology",
  "course": "psychology",
  "skill": "evidence",
  "title": "Psychology: experimental validity",
  "lesson": "Distinguish measured associations from causal effects, and consider operational definitions.",
  "diagnostic": {
   "prompt": "A study compares sleep and memory, with participants choosing their own sleep duration. What threatens causal inference?",
   "options": [
    "Random assignment",
    "Identical tasks",
    "Self-selection and confounding"
   ],
   "correct": 2,
   "explanation": "Participants may differ in other relevant ways."
  },
  "transfer": {
   "prompt": "Which best operationalises short-term recall in a study?",
   "options": [
    "Number of specified words recalled after a fixed delay",
    "Whether a participant seems intelligent",
    "Whether the researcher likes the answer"
   ],
   "correct": 0,
   "explanation": "A defined observable measure improves consistency."
  },
  "written": {
   "prompt": "Propose a fair study of the relationship between distraction and recall, addressing a confound and measurement validity.",
   "criteria": [
    "Specify distraction manipulation and recall measure",
    "Control or randomise relevant variables",
    "Discuss validity and limitations"
   ]
  }
 },
 {
  "id": "subject-law",
  "course": "law",
  "skill": "inference",
  "title": "Law: rules and exceptions",
  "lesson": "Distinguish the facts that trigger a rule from its consequences and consider how exceptions affect interpretation.",
  "diagnostic": {
   "prompt": "A fictional rule prohibits vehicles in a park except emergency vehicles. Which is clearly within the stated exception?",
   "options": [
    "A private taxi",
    "An ambulance responding to an emergency",
    "A commuter's car"
   ],
   "correct": 1,
   "explanation": "The explicit emergency exception applies to the ambulance."
  },
  "transfer": {
   "prompt": "A fictional rule allows late appeals only if a delay was unavoidable. Proof of unavoidable delay alone establishes what?",
   "options": [
    "An appeal must succeed on merits",
    "No appeal can be heard",
    "One necessary condition for permission, not the merits"
   ],
   "correct": 2,
   "explanation": "Eligibility and the merits are separate questions."
  },
  "written": {
   "prompt": "A fictional rule bans vehicles from a park to protect pedestrians. Discuss whether an electric wheelchair should fall within it, considering text, purpose and a counterargument.",
   "criteria": [
    "Distinguish wording and purpose",
    "Consider competing interpretation",
    "Reach a justified provisional conclusion"
   ]
  }
 },
 {
  "id": "subject-economics",
  "course": "economics",
  "skill": "quantitative",
  "title": "Economics: elasticity and causation",
  "lesson": "Use proportional changes with clear assumptions; distinguish an observed relationship from a causal effect.",
  "diagnostic": {
   "prompt": "Price rises 10% and quantity demanded falls 20%. Using these stated percentages, what is the absolute price elasticity?",
   "options": [
    "2",
    "0.5",
    "20"
   ],
   "correct": 0,
   "explanation": "Absolute elasticity is 20/10 = 2."
  },
  "transfer": {
   "prompt": "A price rise of 5% causes quantity demanded to fall 2%, other things equal. What is the absolute elasticity?",
   "options": [
    "2.5",
    "5",
    "0.4"
   ],
   "correct": 2,
   "explanation": "2/5 = 0.4."
  },
  "written": {
   "prompt": "Explain why higher observed prices and higher sales across two years need not contradict a downward-sloping demand curve.",
   "criteria": [
    "Distinguish movement along demand from shift",
    "Identify possible demand or supply changes",
    "State what evidence would isolate the relationship"
   ]
  }
 },
 {
  "id": "subject-ppe",
  "course": "ppe",
  "skill": "revision",
  "title": "PPE: revise a policy argument",
  "lesson": "Separate normative aims from empirical predictions and revise the latter when evidence changes.",
  "diagnostic": {
   "prompt": "A policy is justified solely by a prediction of lower costs. Reliable data show higher costs. What is justified?",
   "options": [
    "The prediction needs revisiting",
    "The policy must be morally wrong",
    "Ignore the costs"
   ],
   "correct": 0,
   "explanation": "The empirical premise is undermined; other values or evidence may matter."
  },
  "transfer": {
   "prompt": "Two policies have equal average benefits but different distributions. What does equal average benefit establish?",
   "options": [
    "They are equally fair",
    "Their average outcomes match, not necessarily their fairness",
    "They have identical effects on every person"
   ],
   "correct": 1,
   "explanation": "Distribution and ethical criteria are separate from averages."
  },
  "written": {
   "prompt": "Assess a fictional policy that raises total welfare but harms a disadvantaged group. Distinguish empirical and normative assumptions.",
   "criteria": [
    "Separate welfare measurement and ethical criterion",
    "Consider distribution or rights",
    "Give a conditional judgement and counterargument"
   ]
  }
 },
 {
  "id": "subject-history",
  "course": "history",
  "skill": "evidence",
  "title": "History: corroborate a source",
  "lesson": "Evaluate provenance, purpose and corroboration rather than treating a source as automatically reliable or unreliable.",
  "diagnostic": {
   "prompt": "A government pamphlet claims a reform was popular. What would best test the claim?",
   "options": [
    "Repeat the pamphlet's claim",
    "Read only its title",
    "Compare independent contemporary accounts and evidence of participation"
   ],
   "correct": 2,
   "explanation": "Independent sources can corroborate or challenge the claim."
  },
  "transfer": {
   "prompt": "Two eyewitnesses disagree about an event. What is the most useful first step?",
   "options": [
    "Compare vantage point, timing and purpose",
    "Choose the more dramatic account",
    "Assume both are entirely false"
   ],
   "correct": 0,
   "explanation": "Context helps explain disagreement."
  },
  "written": {
   "prompt": "A fictional official report describes a protest as small, while a participant's diary describes it as large. Explain how you would assess the disagreement.",
   "criteria": [
    "Analyse provenance and intended audience",
    "Identify independent corroboration",
    "Avoid equating bias with total unreliability"
   ]
  }
 },
 {
  "id": "subject-literature",
  "course": "english",
  "skill": "revision",
  "title": "Literature: support an interpretation",
  "lesson": "Interpretation should respond to the language of the text, including evidence against the initial reading.",
  "diagnostic": {
   "prompt": "A speaker calls an empty room a 'crowded silence'. Which claim is best supported by the phrase?",
   "options": [
    "The room literally contains a crowd",
    "The paradox may suggest a silence felt as emotionally full",
    "The author definitely experienced a specific event"
   ],
   "correct": 1,
   "explanation": "The phrase supports an interpretation; it does not establish biography."
  },
  "transfer": {
   "prompt": "A later line contradicts your initial view of a narrator. What is the strongest response?",
   "options": [
    "Ignore it",
    "Declare interpretation impossible",
    "Re-examine the view using both passages"
   ],
   "correct": 2,
   "explanation": "A defensible interpretation accounts for conflicting details."
  },
  "written": {
   "prompt": "Interpret the original fictional line 'The clock applauded every hour, but nobody came.' Offer two plausible readings and explain how wording supports each.",
   "criteria": [
    "Analyse personification or contrast",
    "Provide textual support for two readings",
    "Distinguish inference from certainty"
   ]
  }
 },
 {
  "id": "subject-philosophy",
  "course": "philosophy",
  "skill": "inference",
  "title": "Philosophy: validity and truth",
  "lesson": "Validity concerns whether a conclusion follows if premises are true, not whether the premises actually are true.",
  "diagnostic": {
   "prompt": "All birds are mammals. All mammals are animals. Therefore all birds are animals. How assess the argument?",
   "options": [
    "Valid form, but an unsound premise",
    "Invalid because one premise is false",
    "Sound because conclusion is true"
   ],
   "correct": 0,
   "explanation": "The conclusion follows from the premises; the first premise is false."
  },
  "transfer": {
   "prompt": "If P then Q. Q is true. Therefore P. What is the problem?",
   "options": [
    "It is modus ponens",
    "It proves P is false",
    "It affirms the consequent"
   ],
   "correct": 2,
   "explanation": "Q can hold even when P is false."
  },
  "written": {
   "prompt": "Construct a valid argument with a false premise and explain the distinction between validity and soundness.",
   "criteria": [
    "Give a valid argument form",
    "Identify a false premise",
    "Explain why validity is independent of actual premise truth"
   ]
  }
 },
 {
  "id": "subject-geography",
  "course": "geography",
  "skill": "evidence",
  "title": "Geography: scale and spatial patterns",
  "lesson": "Spatial associations may change with scale, aggregation and other variables.",
  "diagnostic": {
   "prompt": "A map shows areas with high rainfall also have high crop yield. What can be concluded?",
   "options": [
    "Rainfall is the only cause",
    "The spatial association needs further causal evidence",
    "All individual farms have high yields"
   ],
   "correct": 1,
   "explanation": "The map shows association, not a unique causal explanation."
  },
  "transfer": {
   "prompt": "A regional average hides neighbourhood variation. Which follow-up best reveals that variation?",
   "options": [
    "Aggregate to a national average",
    "Repeat the regional average",
    "Examine smaller-area data and compare distributions"
   ],
   "correct": 2,
   "explanation": "Finer-scale data can reveal variation obscured by aggregation."
  },
  "written": {
   "prompt": "Explain how a relationship between income and transport access might change when analysed at neighbourhood rather than city scale.",
   "criteria": [
    "Discuss aggregation and scale",
    "Identify potential confounding or within-area variation",
    "Propose relevant disaggregated data"
   ]
  }
 },
 {
  "id": "subject-languages",
  "course": "languages",
  "skill": "inference",
  "title": "Languages and linguistics: infer patterns",
  "lesson": "Compare examples systematically and avoid extrapolating beyond the evidence.",
  "diagnostic": {
   "prompt": "In an invented language, 'tal' means walk and 'taled' means walked; 'mor' means sing and 'mored' means sang. Which hypothesis fits?",
   "options": [
    "-ed may mark past tense",
    "-ed marks plural nouns",
    "All verbs must be irregular"
   ],
   "correct": 0,
   "explanation": "The two examples support, but do not prove, a past marker."
  },
  "transfer": {
   "prompt": "A new verb uses a different past ending. What is the best response?",
   "options": [
    "Reject all earlier examples",
    "Assume it is not a verb",
    "Investigate whether the language has different verb classes"
   ],
   "correct": 2,
   "explanation": "The new evidence may suggest an exception or subgroup."
  },
  "written": {
   "prompt": "Given invented forms 'pim' (see), 'pima' (sees), 'nok' (hear), 'noka' (hears), and 'rul' (run), propose a rule and explain how to test it.",
   "criteria": [
    "Identify the repeated suffix pattern",
    "Predict a form conditionally",
    "Seek additional examples and exceptions"
   ]
  }
 },
 {
  "id": "review-inference",
  "skill": "inference",
  "title": "Delayed check: conditional reasoning",
  "lesson": "Test whether the reverse implication is justified.",
  "review": true,
  "diagnostic": {
   "prompt": "All eligible applicants have submitted a form. Someone has submitted a form. Are they necessarily eligible?",
   "options": [
    "Yes",
    "No, not from that information",
    "They are necessarily ineligible"
   ],
   "correct": 1,
   "explanation": "Submitting is necessary here, not sufficient."
  },
  "transfer": {
   "prompt": "If a number is divisible by 6 it is divisible by 3. 15 is divisible by 3. Must it be divisible by 6?",
   "options": [
    "No; 15 is a counterexample",
    "Yes",
    "No number can be divisible by both"
   ],
   "correct": 0,
   "explanation": "The reverse implication does not hold."
  }
 },
 {
  "id": "review-evidence",
  "skill": "evidence",
  "title": "Delayed check: fair comparison",
  "lesson": "Seek a comparison that separates the causes.",
  "review": true,
  "diagnostic": {
   "prompt": "Two classes use different textbooks and have different teachers. How best isolate the textbook?",
   "options": [
    "Compare only highest scores",
    "Change teacher and textbook together",
    "Use comparable classes with the same teaching conditions and vary textbook"
   ],
   "correct": 2,
   "explanation": "Control relevant differences."
  },
  "transfer": {
   "prompt": "A sensor reading rises when humidity and temperature rise. Which check tests humidity alone?",
   "options": [
    "Vary humidity at fixed temperature",
    "Vary both together",
    "Take a single reading"
   ],
   "correct": 0,
   "explanation": "Hold temperature constant."
  }
 },
 {
  "id": "review-quantitative",
  "skill": "quantitative",
  "title": "Delayed check: proportional interpretation",
  "lesson": "Use comparable denominators and multiplicative change.",
  "review": true,
  "diagnostic": {
   "prompt": "18 of 60 and 14 of 35 are successes. Which fraction is higher?",
   "options": [
    "18/60",
    "14/35",
    "Equal"
   ],
   "correct": 1,
   "explanation": "30% versus 40%."
  },
  "transfer": {
   "prompt": "A quantity grows by 50% then falls by one third of its new value. What remains?",
   "options": [
    "Two thirds",
    "One half",
    "The original quantity"
   ],
   "correct": 2,
   "explanation": "1.5 × 2/3 = 1."
  }
 },
 {
  "id": "review-revision",
  "skill": "revision",
  "title": "Delayed check: change assumptions",
  "lesson": "New evidence may limit an explanation rather than invalidate every part.",
  "review": true,
  "diagnostic": {
   "prompt": "A model fits low speeds but not high speeds. What follows?",
   "options": [
    "Investigate its range and assumptions",
    "It is useless at all speeds",
    "Ignore high-speed results"
   ],
   "correct": 0,
   "explanation": "A model can have a limited domain."
  },
  "transfer": {
   "prompt": "A source changes your interpretation of an event. What should you retain?",
   "options": [
    "Every previous conclusion",
    "Claims still supported, revising those undermined",
    "Nothing from earlier evidence"
   ],
   "correct": 1,
   "explanation": "Evaluate claims individually."
  }
 }
] as CoachPack[]))
const obj=(v:unknown):Record<string,unknown>=>v&&typeof v==="object"&&!Array.isArray(v)?v as Record<string,unknown>:{}
const arr=(v:unknown):unknown[]=>Array.isArray(v)?v:[]
const text=(v:unknown)=>typeof v==="string"?v:""
const n=(v:unknown)=>typeof v==="number"&&Number.isFinite(v)?v:null
export function readCoachAttempt(value:unknown, packId:string):CoachAttempt|null {
 const a=obj(value)
 if(a.packId!==packId||!coachPacks.some(p=>p.id===packId)||typeof a.diagnosticCorrect!=="boolean"||typeof a.transferCorrect!=="boolean"||!Number.isFinite(Date.parse(text(a.completedAt))))return null
 return {packId,diagnosticCorrect:a.diagnosticCorrect,transferCorrect:a.transferCorrect,completedAt:text(a.completedAt)}
}
export function gradeCoachAttempt(packId:unknown,diagnostic:unknown,transfer:unknown,now=new Date()):CoachAttempt|null{
 const pack=coachPacks.find(p=>p.id===packId)
 if(!pack||typeof diagnostic!=="number"||!Number.isInteger(diagnostic)||diagnostic<0||diagnostic>2||typeof transfer!=="number"||!Number.isInteger(transfer)||transfer<0||transfer>2)return null
 return {packId:pack.id,diagnosticCorrect:diagnostic===pack.diagnostic.correct,transferCorrect:transfer===pack.transfer.correct,completedAt:now.toISOString()}
}
export function chooseCoachPack(progressValue:unknown,profileValue:unknown,attempts:CoachAttempt[],now=new Date()){
 const progress=obj(progressValue), profile=obj(profileValue), course=text(profile.course).trim()
 const done=new Set(attempts.map(a=>a.packId))
 const available=coachPacks.filter(p=>!done.has(p.id)&&!p.review&&(!p.course||matchesCoachCourse(p.course,course)))
 const scheduled=coachReviewSchedule(attempts,now)
 const due=scheduled.find(x=>x.due)
 if(due)return {packId:due.packId,reason:"A spaced review is due: try a new example without rereading your previous answer.",course:course||null,nextReviewAt:scheduled[0]?.dueAt??null}
 const evidence: {skill:CoachSkill;why:string;weight:number}[]=[]
 const recent=(v:unknown)=>{const t=Date.parse(text(v));return Number.isFinite(t)&&t<=now.getTime()&&now.getTime()-t<=30*86400000}
 // Only count bounded, dated Phase 8 observations in the selected course.
 const seen=new Set<string>()
 for(const item of arr(progress.logs).slice(0,80)){
  const snap=obj(obj(obj(item).feedbackReport).snapshot), id=text(snap.id), total=n(snap.answerCount)
  if(!id||seen.has(id)||!course||text(snap.course).trim().toLowerCase()!==course.toLowerCase()||!recent(snap.createdAt)||total===null||total<3||total>300)continue
  seen.add(id)
  for(const [key,skill] of [["reasonedCount","inference"],["testedCount","evidence"],["revisionCount","revision"]] as const){
   const count=n(snap[key]);if(count!==null&&count>=0&&count<=total&&count/total<0.34)evidence.push({skill,why:"Recent same-course interview transcripts contained few explicit "+(skill==="inference"?"reasoning links":skill==="evidence"?"checks":"revisions")+". This is a practice prompt, not a finding of academic weakness.",weight:1})
  }
 }
 for(const item of arr(progress.fullPaperResults).slice(0,12)){
  const paper=obj(item);if(!recent(paper.date??paper.createdAt))continue
  for(const item of arr(paper.sections).slice(0,12)){
   const section=obj(item),accuracy=n(section.accuracy), attempted=n(section.answered??section.attempted)
   if(section.kind==="essay"||accuracy===null||accuracy<0||accuracy>=60||attempted===null||attempted<5)continue
   const title=text(section.title)
   if(/quantitative|mathematics|maths|numerical/i.test(title))evidence.push({skill:"quantitative",why:"A recent quantitative paper section had below 60% overall accuracy and at least five answered questions. This exercise checks a general quantitative reasoning skill, not the exact missed topic.",weight:2})
  }
 }
 for(const a of attempts){
  const pack=coachPacks.find(p=>p.id===a.packId)
  if(pack&&!a.transferCorrect&&recent(a.completedAt))evidence.push({skill:pack.skill,why:"Your previous fresh-question check for this skill was incorrect. Try a different example before treating it as secure.",weight:4})
 }
 const ranked=available.map((pack,index)=>({pack,index,weight:evidence.filter(e=>e.skill===pack.skill).reduce((s,e)=>s+e.weight,0)+(pack.course?0.5:0)})).sort((a,b)=>b.weight-a.weight||a.index-b.index)
 const pack=ranked[0]?.pack??null
 const reason=pack?evidence.filter(e=>e.skill===pack.skill).sort((a,b)=>b.weight-a.weight)[0]?.why??"No sufficiently specific recent evidence supports this choice. Use this short exercise as a baseline.": "You have completed every current exercise. Use the existing interview or paper intervention tools for further practice."
 return {packId:pack?.id??null,reason,course:course||null,nextReviewAt:scheduled[0]?.dueAt??null}
}

export function matchesCoachCourse(tag:string,course:string){
 const clean=course.toLowerCase()
 const aliases:Record<string,RegExp>={physics:/physic/,mathematics:/math/, "computer science":/comput|informatics/, engineering:/engineer/, chemistry:/chemistr/, biology:/biolog|natural sciences/, medicine:/medic|biomed/,psychology:/psycholog/,law:/\blaw\b|jurisprudence/,economics:/econom/,ppe:/\bppe\b|politic/,history:/histor/,english:/english|literat|classics/,philosophy:/philosoph/,geography:/geograph/,languages:/language|linguist|french|german|spanish/}
 return (aliases[tag]??new RegExp("^"+tag+"$")).test(clean)
}
export function coachReviewSchedule(attempts:CoachAttempt[],now=new Date()){
 const completed=new Set(attempts.map(a=>a.packId))
 return (Object.keys(skillLabels) as CoachSkill[]).flatMap(skill=>{
  const pack=coachPacks.find(p=>p.review&&p.skill===skill)
  if(!pack||completed.has(pack.id))return []
  const initial=attempts.filter(a=>coachPacks.some(p=>p.id===a.packId&&p.skill===skill&&!p.review)&&Date.parse(a.completedAt)<=now.getTime()).sort((a,b)=>Date.parse(a.completedAt)-Date.parse(b.completedAt))[0]
  if(!initial)return []
  const dueAt=new Date(Date.parse(initial.completedAt)+(initial.transferCorrect?3:1)*86400000).toISOString()
  return [{packId:pack.id,skill,dueAt,due:Date.parse(dueAt)<=now.getTime()}]
 }).sort((a,b)=>a.dueAt.localeCompare(b.dueAt))
}
export function coachWrittenTask(packId:string){
 const p=coachPacks.find(x=>x.id===packId)
 if(!p)return null
 return p.written??{prompt:"Explain the reasoning principle from this exercise in your own words. Invent a different example, justify your conclusion, and state one limitation.",criteria:["State the underlying principle accurately","Give a new relevant example and justify the conclusion","Identify a limitation or counterexample"]}
}

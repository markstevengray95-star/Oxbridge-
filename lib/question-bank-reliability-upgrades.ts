import type { TestQuestion } from "@/lib/oxbridge-data"

function rotate<T>(items: T[], shift: number) {
  const n = ((shift % items.length) + items.length) % items.length
  return [...items.slice(n), ...items.slice(0, n)]
}

function mc(
  id: string,
  test: TestQuestion["test"],
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

// ---------------------------------------------------------------------------
// LNAT: exactly 12 original passages, with 4 questions on the first six and
// 3 on the final six (42 questions total). Distractors are deliberately close:
// overstatement, adjacent-but-not-central reasoning, and scope shifts.
// ---------------------------------------------------------------------------
const lnatPassages = [
  {
    topic: "public consultation",
    passage: "Public consultation is often treated as evidence that a decision is democratic. Yet collecting opinions and sharing power are different things. A consultation can reveal local knowledge and expose overlooked costs, but it can also become ceremonial if decision-makers never explain how responses affected the outcome. The strongest case for consultation is therefore not that every popular view should prevail, but that affected people should have a meaningful opportunity to improve the evidence and challenge the reasoning before a decision is fixed.",
    main: "Consultation is valuable when it can influence the evidence and reasoning behind a decision, not merely because opinions were collected.",
    detail: "Consultations can reveal local knowledge that officials might otherwise overlook.",
    assumption: "Decision quality can improve when affected people are able to test the evidence and reasoning before the outcome is settled.",
    strengthen: "Decisions made after officials publicly responded to consultation evidence contained fewer factual errors than otherwise similar decisions.",
    inference: "A consultation may be extensive yet still have little democratic value if responses cannot meaningfully affect the reasoning process.",
  },
  {
    topic: "algorithmic transparency",
    passage: "Calls for transparent algorithms sometimes assume that publishing source code will make automated decisions understandable. Source code can matter, but a system may remain opaque if the training data, objective function and institutional use are hidden. Conversely, a system can sometimes be meaningfully scrutinised without every line of code being public if independent testers can examine its inputs, outputs and error patterns. Transparency should therefore be judged by whether relevant decisions can be investigated and challenged, not by one disclosure rule alone.",
    main: "Algorithmic transparency should be assessed by whether decisions can be investigated and challenged rather than by source-code publication alone.",
    detail: "Training data and institutional use can affect whether an automated system is understandable.",
    assumption: "Meaningful scrutiny can sometimes be achieved through evidence about a system's behaviour even without complete source-code disclosure.",
    strengthen: "Independent audits using controlled inputs repeatedly identified systematic errors that were not apparent from reading the published source code alone.",
    inference: "Publishing code may contribute to transparency without being either necessary or sufficient for meaningful scrutiny.",
  },
  {
    topic: "university attendance",
    passage: "Recorded lectures have weakened the old assumption that being physically present is always the best proxy for engagement. A student may attend every lecture while processing little, or miss a session and study the material carefully later. This does not make attendance irrelevant: seminars, laboratories and collaborative tasks can depend on presence. Universities should therefore distinguish activities where attendance is part of the learning process from those where the important question is whether students actually engage with the material.",
    main: "Attendance requirements should depend on whether physical presence contributes to the learning process rather than treating attendance as a universal proxy for engagement.",
    detail: "Some collaborative activities depend more heavily on physical presence than recorded lectures do.",
    assumption: "Engagement with learning can sometimes be measured or supported without requiring physical presence at every activity.",
    strengthen: "Students given flexible access to recorded lectures performed similarly on understanding checks, while attendance remained essential for assessed laboratory skills.",
    inference: "The argument supports different attendance rules for different forms of teaching rather than eliminating attendance expectations altogether.",
  },
  {
    topic: "urban trees",
    passage: "Cities increasingly value trees for shade, air quality and biodiversity, but counting newly planted trees can reward the wrong outcome. A sapling that dies after two summers contributes little to long-term canopy cover, while protecting one mature tree may preserve benefits that take decades to replace. Planting targets can still be useful, especially where canopy is scarce, but they should be paired with measures of survival, maturity and distribution if they are to represent environmental improvement rather than activity alone.",
    main: "Tree-planting targets are most informative when they are combined with measures of survival, maturity and distribution rather than treated as sufficient evidence of improvement.",
    detail: "Protecting a mature tree can preserve benefits that a new sapling will take years to provide.",
    assumption: "The environmental benefits being sought depend substantially on trees surviving and developing over time.",
    strengthen: "Neighbourhoods with identical planting totals showed very different canopy gains five years later because survival rates differed sharply.",
    inference: "A city could meet an ambitious planting target while making little progress toward long-term canopy cover.",
  },
  {
    topic: "historical apologies",
    passage: "An official apology for a past injustice cannot undo the original harm, which leads some critics to dismiss apologies as symbolic. Yet symbols can alter present relationships: an apology can acknowledge facts previously denied, change institutional records and establish standards against which current conduct is judged. Its value therefore depends less on pretending the past can be repaired by words alone and more on whether the acknowledgement is accurate, accountable and connected to present action.",
    main: "Official apologies can have present value when accurate acknowledgement is linked to accountability and action, even though words cannot undo past harm.",
    detail: "An apology can change how an institution officially records and acknowledges past events.",
    assumption: "Public acknowledgement can influence present institutional relationships and standards even when it cannot reverse historical events.",
    strengthen: "Institutions that paired formal apologies with corrected records and policy changes showed greater trust gains than institutions issuing statements without follow-up.",
    inference: "The author would reject both the claim that apologies are automatically sufficient and the claim that they are necessarily meaningless.",
  },
  {
    topic: "remote examinations",
    passage: "Remote examinations are sometimes criticised because candidates do not sit in identical physical environments. But conventional exam halls are not perfectly identical either: noise, travel, illness and unfamiliar settings vary. The relevant question is not whether remote assessment eliminates every difference, but whether its differences can be controlled well enough to preserve a fair comparison of the skills being tested. Fairness requires attention to material inequalities, not an impossible demand for perfectly identical circumstances.",
    main: "Remote examinations should be judged by whether material differences can be controlled sufficiently for fair comparison, not by whether every candidate's circumstances are identical.",
    detail: "Traditional examination halls also contain differences that can affect candidates' experiences.",
    assumption: "Fair assessment can tolerate some differences in circumstances provided those differences do not materially distort the comparison being made.",
    strengthen: "A controlled study found that after adjustments for equipment and access needs, score differences between remote and test-centre groups were no larger than differences between test centres.",
    inference: "Showing that remote candidates experience some environmental variation would not by itself establish that remote assessment is unfair.",
  },
  {
    topic: "museum restitution",
    passage: "Debates about returning museum objects are sometimes framed as a contest between preservation and justice. That framing is too simple. Returning an object may strengthen access to cultural heritage in one place while reducing access in another; retaining it may support research while perpetuating an acquisition that lacked meaningful consent. No single consideration settles every case. A defensible decision requires attention to provenance, current custodial capacity, cultural significance and the terms under which the object was removed.",
    main: "Restitution decisions require case-specific evaluation of provenance, access, cultural significance and custody rather than a single rule based on preservation or justice alone.",
    detail: "Returning an object can redistribute access rather than simply increasing or reducing it overall.",
    assumption: "The morally relevant features of disputed objects differ enough between cases that a single factor cannot resolve all restitution claims.",
    strengthen: "Comparable objects were found to have sharply different acquisition histories, legal status and significance to source communities.",
    inference: "The author would expect two apparently similar objects to be treated differently if their provenance or cultural significance differed materially.",
  },
  {
    topic: "school rankings",
    passage: "School rankings promise clarity by reducing performance to an ordered list. Yet any ranking depends on choices about what to measure, how to adjust for intake and how to combine outcomes. A table can therefore be mathematically accurate while concealing contestable judgements about what counts as a good school. Publishing the underlying measures may be more informative than presenting a single position that appears more objective than the assumptions used to create it.",
    main: "Single school rankings can conceal contestable choices, so underlying measures may communicate performance more honestly than one ordered position.",
    detail: "A ranking can be calculated correctly while still depending on debatable choices about weighting and adjustment.",
    assumption: "Different reasonable choices about measures or weights can change how schools compare in a single ranking.",
    strengthen: "Recalculating the same schools with several defensible weighting systems produced substantial changes in their positions.",
    inference: "The author's objection is not primarily that rankings contain arithmetic errors, but that their apparent precision can hide evaluative choices.",
  },
  {
    topic: "carbon labels",
    passage: "Carbon labels on products can help consumers compare environmental impacts, but a single number can imply more certainty than the underlying estimate deserves. Emissions depend on assumptions about supply chains, energy sources and product lifetime. This does not make labels useless. It means that well-designed labels should communicate enough about uncertainty and method to support comparison without pretending that every estimate is exact.",
    main: "Carbon labels can aid comparison if they communicate relevant uncertainty and method rather than presenting estimates as perfectly exact.",
    detail: "Supply-chain and lifetime assumptions can change estimates of a product's emissions.",
    assumption: "Consumers can still make useful comparisons when estimates contain uncertainty, provided that uncertainty is represented appropriately.",
    strengthen: "Consumers made more consistent low-carbon choices when labels included comparable ranges and a common calculation method rather than a bare point estimate.",
    inference: "Uncertainty in carbon estimates is a reason to improve label design, not necessarily a reason to abandon carbon labelling.",
  },
  {
    topic: "public art",
    passage: "Arguments about public art often ask whether a work is good enough to justify public money. Artistic quality matters, but public funding also raises questions about location, access and who has opportunities to create. A technically accomplished work placed where few residents encounter it may serve a different public purpose from a modest work developed with a community. Evaluation should therefore make its aims explicit rather than assuming that one conception of artistic merit can answer every funding question.",
    main: "Public-art funding should be evaluated against explicit aims that may include artistic quality, access and participation rather than one measure of merit alone.",
    detail: "Location affects how many residents are likely to encounter a publicly funded work.",
    assumption: "Public funding can legitimately pursue goals beyond rewarding technical artistic accomplishment.",
    strengthen: "Residents reported substantially different public value from projects with similar expert quality ratings but very different levels of access and participation.",
    inference: "The author would regard a disagreement about public art as partly a disagreement about which aims public funding should serve.",
  },
  {
    topic: "open-plan offices",
    passage: "Open-plan offices were promoted as a way to increase collaboration, but proximity is not the same as useful interaction. Removing walls may make brief exchanges easier while also increasing distraction and reducing privacy for concentrated work. Whether an open plan succeeds therefore depends on the tasks people perform and on whether alternative quiet spaces exist. The design cannot be evaluated sensibly by counting conversations alone.",
    main: "Open-plan offices should be evaluated in relation to work tasks and access to quiet space, not simply by whether they increase visible interaction.",
    detail: "Removing walls can make brief exchanges easier while also increasing distraction.",
    assumption: "More frequent interaction does not necessarily improve overall work if it disrupts tasks requiring concentration or privacy.",
    strengthen: "Teams with access to both shared and quiet spaces completed collaborative work as quickly while making fewer errors on concentration-heavy tasks.",
    inference: "An increase in workplace conversation could coexist with a decline in performance on some kinds of work.",
  },
  {
    topic: "citizen science",
    passage: "Citizen-science projects are sometimes criticised because volunteers lack professional training. Training matters, but professional status is not the only determinant of data quality. Clear protocols, repeated measurements and validation can allow large volunteer networks to produce useful observations, while professional datasets can also contain systematic errors. The relevant comparison is therefore between methods of quality control, not simply between volunteers and experts.",
    main: "Citizen-science data should be judged by the quality-control methods used rather than dismissed or accepted solely because of who collected it.",
    detail: "Repeated measurements and validation can improve the reliability of observations made by volunteers.",
    assumption: "Appropriate procedures can reduce or detect enough observer error for volunteer-generated data to be useful.",
    strengthen: "Volunteer observations collected under a standard protocol closely matched independently verified professional measurements across several sites.",
    inference: "Professional collection is neither a guarantee of perfect data nor a necessary condition for useful scientific observations.",
  },
] as const

for (let i = 0; i < lnatPassages.length; i++) {
  const p = lnatPassages[i]
  const common = `${p.passage}`
  out.push(mc(
    `upgrade-lnat-${i}-0`, "LNAT", "Argumentative passages", i % 3 === 0 ? "Challenge" : "Stretch",
    `${common}\n\nWhich option best states the author's main conclusion?`,
    p.main,
    [
      p.detail,
      `The author argues that the policy discussed should generally be rejected because its limitations outweigh any possible benefit.`,
      `The author argues that the central issue can be resolved by measuring one outcome more accurately, without considering the wider distinctions in the passage.`,
    ],
    `The main conclusion is the claim that organises the passage as a whole; the other options are a supporting detail, an overstatement, and an unjustified narrowing of the argument.`, i,
  ))
  out.push(mc(
    `upgrade-lnat-${i}-1`, "LNAT", "Argumentative passages", "Challenge",
    `${common}\n\nWhich assumption is most important to the author's reasoning?`,
    p.assumption,
    [
      `That the supporting example in the passage is typical of every possible case to which the argument might apply.`,
      `That people who disagree with the author's conclusion are mainly mistaken about the factual detail mentioned in the passage.`,
      `That the issue can be evaluated without making any judgement about which outcomes or distinctions are important.`,
    ],
    `The argument needs the stated assumption to connect its evidence to its evaluative conclusion; the distractors either demand too much or cut against the passage's own reasoning.`, i + 19,
  ))
  out.push(mc(
    `upgrade-lnat-${i}-2`, "LNAT", "Argumentative passages", "Challenge",
    `${common}\n\nWhich new evidence would most strengthen the author's argument?`,
    p.strengthen,
    [
      `Evidence that many people already support the author's conclusion, without testing the mechanism or distinction on which the argument depends.`,
      `Evidence that a different policy in the same broad area produced a benefit for reasons not discussed in the passage.`,
      `Evidence that repeats the original observation in a larger sample but still leaves the key alternative explanation unresolved.`,
    ],
    `The strongest evidence tests the mechanism or distinction on which the passage relies and makes a competing explanation less persuasive.`, i + 37,
  ))
  if (i < 6) {
    out.push(mc(
      `upgrade-lnat-${i}-3`, "LNAT", "Argumentative passages", "Challenge",
      `${common}\n\nWhich statement is most strongly supported by the passage?`,
      p.inference,
      [
        `The author believes the policy discussed is beneficial in every case provided that it is implemented consistently.`,
        `The passage shows that the main practical difficulty could be removed completely if decision-makers gathered more information.`,
        `The author treats the supporting example as sufficient to prove the conclusion without any need for qualification or further evidence.`,
      ],
      `The supported inference follows from the passage's qualifications without making the stronger universal or causal claims made by the distractors.`, i + 61,
    ))
  }
}

// ---------------------------------------------------------------------------
// UCAT Verbal Reasoning: 11 original passages × 4 questions = 44. Each passage
// is self-contained and questions require evidence-based conclusions rather than
// background knowledge.
// ---------------------------------------------------------------------------
const vrPassages = [
  {
    passage: "A regional theatre introduced half-price tickets for people under 25. Attendance by that age group rose by 38% over six months, while overall attendance rose by 9%. The theatre also launched a social-media campaign aimed at younger audiences during the same period. A survey of new under-25 visitors found that 54% had seen the campaign before booking, but the survey did not ask whether the reduced price affected their decision.",
    supported: "Under-25 attendance increased by a larger percentage than overall attendance during the six-month period.",
    beyond: "The ticket discount was the main cause of the increase in under-25 attendance.",
    limitation: "The discount and targeted advertising changed at the same time, so their separate effects cannot be isolated from these data.",
    improve: "Compare booking behaviour in otherwise similar periods or groups exposed to different combinations of price and advertising.",
  },
  {
    passage: "Researchers monitored two wetlands for three years. The wetland where grazing was reduced showed an increase in nesting birds, whereas the comparison wetland remained broadly stable. However, water levels also rose in the first wetland after restoration work began. The researchers concluded that the observations were encouraging but could not identify how much of the change was due to grazing management rather than water conditions.",
    supported: "The wetland with reduced grazing also experienced another environmental change during the study.",
    beyond: "Reducing grazing alone caused the increase in nesting birds.",
    limitation: "Two potentially relevant changes occurred together in the wetland where bird numbers increased.",
    improve: "Use additional sites or periods that separate grazing changes from water-level changes.",
  },
  {
    passage: "A university library extended weekend opening from six hours to twelve. Entry counts on Saturdays and Sundays rose by 26%, but weekday visits were unchanged. Electricity and staffing costs also increased. The evaluation did not record how long visitors stayed or whether they used study spaces, collections or computer facilities.",
    supported: "Weekend entry counts rose after the library extended weekend opening hours.",
    beyond: "Students learned more because the library stayed open longer at weekends.",
    limitation: "Entry counts show use of the building but not what visitors did or what outcomes resulted.",
    improve: "Measure how visitors use the extra hours and whether the additional access changes relevant study outcomes.",
  },
  {
    passage: "A manufacturer replaced plastic packaging with a lighter paper-based design. Packaging mass per product fell by 22%, and transport fuel use per shipment fell slightly because more units fitted on each vehicle. The company had not yet completed a full life-cycle assessment of the paper source, manufacturing process or end-of-life disposal.",
    supported: "The new packaging reduced packaging mass per product and slightly reduced fuel use per shipment.",
    beyond: "The new packaging has a lower total environmental impact across its entire life cycle.",
    limitation: "The available data cover packaging mass and transport but not the full production and disposal impacts.",
    improve: "Complete a comparable life-cycle assessment covering material production, transport, use and disposal for both designs.",
  },
  {
    passage: "A city installed protected cycle lanes along three corridors. Bicycle counts rose on all three, with the largest increase on the route that previously had the lowest cycling level. Car traffic fell slightly on two corridors and was unchanged on the third. The study did not track individual travellers, so it could not determine whether new cycle trips replaced car journeys, public transport trips, walking or entirely new journeys.",
    supported: "Bicycle counts increased on each of the three corridors after protected lanes were installed.",
    beyond: "Most of the additional bicycle trips replaced journeys that would otherwise have been made by car.",
    limitation: "Changes in traffic counts do not identify which previous travel modes individual cyclists switched from.",
    improve: "Track travel behaviour of individuals before and after the lane changes, including their previous mode for comparable journeys.",
  },
  {
    passage: "A school introduced a later start time for one year group. Recorded lateness fell and pupils reported sleeping longer on school nights. Average test scores were almost unchanged. During the same term, the school changed its lateness-recording system, making comparisons with earlier records less straightforward.",
    supported: "Pupils reported more sleep after the later start was introduced.",
    beyond: "The later start produced a genuine reduction in lateness of the size shown by the records.",
    limitation: "The method used to record lateness changed during the comparison period.",
    improve: "Reconstruct lateness using a consistent measurement method across the periods being compared.",
  },
  {
    passage: "A museum added short audio descriptions to selected exhibits. Visitors who chose to use the audio spent longer in those galleries and gave higher satisfaction ratings than visitors who did not use it. Because visitors decided for themselves whether to use the audio, the groups may have differed in interest before entering the gallery.",
    supported: "Audio users spent longer in the selected galleries and reported higher satisfaction than non-users.",
    beyond: "Using the audio descriptions caused visitors to become more interested in the exhibits.",
    limitation: "Self-selection means pre-existing interest could contribute to the difference between users and non-users.",
    improve: "Randomly offer the audio to comparable visitors and compare outcomes between assigned groups.",
  },
  {
    passage: "A farm tested two irrigation schedules in neighbouring fields. The field receiving smaller, more frequent watering produced a higher yield that season. Soil tests before planting showed that the higher-yield field also had slightly greater organic matter. Rainfall was similar across the two fields.",
    supported: "The two fields differed in both irrigation schedule and measured soil organic matter.",
    beyond: "Smaller, more frequent watering necessarily produces higher yields on this farm.",
    limitation: "The fields were not identical at baseline, so the irrigation effect is confounded with a soil difference.",
    improve: "Randomise irrigation schedules across multiple comparable plots or alternate schedules across matched plots.",
  },
  {
    passage: "An online retailer shortened its checkout process from five pages to two. The proportion of started checkouts that ended in a purchase rose from 61% to 68%. At the same time, the retailer began offering free delivery above a lower spending threshold. The company did not run an A/B test separating the two changes.",
    supported: "Checkout completion increased during a period in which both checkout design and delivery policy changed.",
    beyond: "Reducing the number of checkout pages was responsible for the seven-point increase in completed purchases.",
    limitation: "Two changes that could affect purchasing behaviour were introduced together.",
    improve: "Run a controlled test that varies checkout design while holding delivery terms constant.",
  },
  {
    passage: "A local authority replaced some streetlights with LEDs. Electricity consumption attributed to those lights fell substantially. Maintenance call-outs also fell in the first year, although the older lights being replaced were near the end of their expected service life. The authority had not yet observed the LED system for long enough to compare full lifetime maintenance costs.",
    supported: "Electricity use fell after the selected streetlights were replaced with LEDs.",
    beyond: "The LED system will definitely have lower lifetime maintenance costs than the previous system.",
    limitation: "The maintenance comparison covers only the first year and compares new lights with older equipment near replacement age.",
    improve: "Compare maintenance costs over a longer period using equipment of comparable age or an appropriate lifecycle model.",
  },
  {
    passage: "A college offered optional weekly problem-solving workshops. Students who attended at least six sessions improved more between their first and final diagnostic tests than students who attended fewer sessions. Attendance was voluntary, and frequent attendees had slightly higher initial attendance in ordinary classes as well.",
    supported: "Frequent workshop attendees showed a larger diagnostic-test improvement than less frequent attendees.",
    beyond: "Attending six or more workshops caused the larger improvement in diagnostic-test scores.",
    limitation: "Students who attended more workshops may also have differed in motivation or general engagement.",
    improve: "Compare students assigned to different workshop access conditions or adjust using a design that better separates attendance from prior engagement.",
  },
] as const

for (let i = 0; i < vrPassages.length; i++) {
  const p = vrPassages[i]
  const base = p.passage
  out.push(mc(`upgrade-ucat-vr-${i}-0`, "UCAT", "Verbal Reasoning", "Stretch", `${base}\n\nWhich statement is best supported by the passage?`, p.supported,
    [p.beyond, `The passage shows that every relevant outcome improved during the period described.`, `The evidence is too limited for any factual statement about the observed results.`],
    `The keyed statement restates an observation in the passage without adding a causal or universal claim.`, i))
  out.push(mc(`upgrade-ucat-vr-${i}-1`, "UCAT", "Verbal Reasoning", "Challenge", `${base}\n\nWhich conclusion goes beyond what the passage establishes?`, p.beyond,
    [p.supported, p.limitation, `At least one measured outcome changed during the period described.`],
    `The keyed conclusion turns an observed association into a stronger causal or general claim that the passage does not establish.`, i + 17))
  out.push(mc(`upgrade-ucat-vr-${i}-2`, "UCAT", "Verbal Reasoning", "Challenge", `${base}\n\nWhich limitation is most important when interpreting the result?`, p.limitation,
    [`The passage does not state whether every participant approved of the study.`, `The result is described using percentages or comparisons rather than only raw totals.`, `The study concerns one practical setting rather than every possible setting.`],
    `The keyed limitation directly affects the inference being made from the evidence; the alternatives are either generic or irrelevant to the central comparison.`, i + 34))
  out.push(mc(`upgrade-ucat-vr-${i}-3`, "UCAT", "Verbal Reasoning", "Challenge", `${base}\n\nWhich additional information would most improve the strength of the inference?`, p.improve,
    [`A larger description of the organisation's aims without new comparative evidence.`, `More detail about an outcome that is not connected to the main limitation in the passage.`, `A statement from the investigators that they believe their interpretation is reasonable.`],
    `The strongest addition directly addresses the principal source of uncertainty identified in the passage.`, i + 51))
}

// ---------------------------------------------------------------------------
// TARA Critical Thinking: 11 distinct arguments × two reasoning tasks = 22.
// Each item requires an assumption/alternative-cause judgement or a discriminating
// strengthen/weaken decision rather than spotting obviously irrelevant wording.
// ---------------------------------------------------------------------------
const taraCases = [
  ["A university moved first-year tutorials from 9 a.m. to 11 a.m. Attendance rose, so later tutorials improve academic engagement.", "The change in tutorial time, rather than another simultaneous change, explains a substantial part of the attendance increase.", "Attendance rose most in modules whose tutorial times changed, while comparable modules with unchanged times showed little change.", "The university also made tutorial attendance count toward a participation grade at the same time."],
  ["A city pedestrianised a shopping street and vacancy rates later fell, so pedestrianisation revived the street.", "Other changes affecting the attractiveness of the street were not sufficient to explain most of the fall in vacancies.", "Comparable nearby streets did not show the same fall in vacancies, while footfall on the pedestrianised street rose substantially.", "Business-rate relief for new tenants began on the same date as pedestrianisation."],
  ["Employees using standing desks reported less afternoon tiredness, so standing desks reduce fatigue.", "The standing-desk users did not differ in another important way that independently reduced tiredness.", "In a randomised crossover trial, the same employees reported less afternoon tiredness during standing-desk periods than during seated-desk periods.", "Employees chose whether to request a standing desk, and requesters exercised more outside work."],
  ["A school introduced retrieval quizzes and examination results improved, so the quizzes improved learning.", "The observed result is not mainly due to another change in teaching or assessment during the same period.", "Classes randomly assigned to regular retrieval quizzes improved more than classes receiving the same teaching time without quizzes.", "The final examination contained more questions similar to those used in the quizzes than in previous years."],
  ["A council planted trees beside a road and summer surface temperatures fell, so the trees cooled the street.", "Weather differences between the comparison periods do not fully account for the fall in measured temperature.", "On the same hot days, shaded sections beside the new trees were cooler than otherwise similar unshaded sections.", "The summer after planting had substantially more cloudy days than the summer before planting."],
  ["A website added customer reviews and sales rose, so reviews increased consumer confidence.", "The sales increase is not adequately explained by a separate change in price, advertising or product range.", "An experiment showing identical products with and without reviews produced higher purchase rates when reviews were displayed.", "The website launched a major discount campaign at the same time as the review feature."],
  ["A hospital introduced appointment reminders and missed appointments fell, so reminders changed patient behaviour.", "The decline is not mainly the result of changes in booking practice or patient mix.", "Clinics randomly assigned to reminders experienced a larger reduction in missed appointments than clinics using the same booking system without reminders.", "The hospital simultaneously began booking fewer appointments far in advance."],
  ["A museum removed its admission charge and visitor numbers rose, so price had previously been a barrier.", "At least some people who visited after the change would not have visited under the previous price.", "Surveyed new visitors frequently identified the removal of the charge as decisive, while a matched paid attraction did not show the same increase.", "A nationally advertised exhibition opened in the museum during the first free-admission month."],
  ["A company shortened its working week and resignations fell, so shorter weeks improve retention.", "The decline in resignations is not mainly explained by labour-market or pay changes affecting the same employees.", "A staggered rollout showed resignations falling after each division moved to the shorter week while divisions waiting to change remained stable.", "The company gave a large retention bonus to all staff when the shorter week began."],
  ["A college created quiet study zones and library complaints fell, so zoning improved the study environment.", "The fall in complaints reflects a real change in the environment rather than only a change in how complaints were collected.", "Independent noise measurements fell in the new quiet zones while the complaint process remained unchanged.", "The college replaced its online complaint form with a longer form during the same period."],
  ["A town reduced parking spaces and bus use rose, so restricting parking shifted commuters onto buses.", "The increase in bus use is not predominantly explained by another change in the relative cost or convenience of travel.", "Commuter surveys showed a substantial group switching from car to bus specifically after losing regular parking access.", "Bus fares were cut sharply at the same time that parking spaces were removed."],
] as const

for (let i = 0; i < taraCases.length; i++) {
  const [argument, assumption, strengthener, weakener] = taraCases[i]
  out.push(mc(`upgrade-tara-ct-${i}-0`, "TARA", "Critical Thinking", "Challenge", `${argument}\n\nWhich assumption is required for the conclusion to be reasonably supported?`, assumption,
    [`That the intervention was popular with most of the people affected by it.`, `That the measured outcome would continue changing at the same rate indefinitely.`, `That no person or organisation had any reason to oppose the intervention.`],
    `The argument moves from an observed before-and-after association to a causal conclusion, so it needs the main alternative explanations not to account for the result.`, i))
  const useStrengthen = i % 2 === 0
  out.push(mc(`upgrade-tara-ct-${i}-1`, "TARA", "Critical Thinking", "Challenge", `${argument}\n\nWhich additional fact would most ${useStrengthen ? "strengthen" : "weaken"} the conclusion?`, useStrengthen ? strengthener : weakener,
    useStrengthen
      ? [weakener, `The intervention received favourable publicity when it was introduced.`, `The outcome also changed in a different setting for reasons unrelated to the intervention.`]
      : [strengthener, `Some people had predicted the outcome before the intervention began.`, `The intervention was discussed extensively by those affected.`],
    useStrengthen
      ? `The keyed evidence separates the proposed cause from a plausible alternative and therefore strengthens the causal inference most directly.`
      : `The keyed evidence supplies a credible competing explanation for the observed change and therefore weakens the causal inference most directly.`, i + 29))
}

// ---------------------------------------------------------------------------
// UCAT Quantitative Reasoning: 12 compact datasets × 3 questions = 36. The
// same data must be interpreted in several ways, closer to chart/table-based
// problem solving than isolated one-step arithmetic.
// ---------------------------------------------------------------------------
for (let d = 0; d < 12; d++) {
  const a = 48 + d * 3
  const b = 36 + d * 2
  const c = 24 + d
  const costA = 5 + (d % 4)
  const costB = 7 + (d % 3)
  const growth = [10, 12, 15, 20][d % 4]
  const table = `Dataset ${d + 1}\nCategory | Units | Cost per unit\nA | ${a} | £${costA}\nB | ${b} | £${costB}\nC | ${c} | £${costA + 2}`

  const totalAB = a * costA + b * costB
  out.push(mc(`upgrade-ucat-qr-${d}-0`, "UCAT", "Quantitative Reasoning", "Stretch", `${table}\n\nWhat is the combined cost of all units in categories A and B?`, `£${totalAB}`,
    [`£${a * costA + b}`, `£${a + b * costB}`, `£${(a + b) * costA}`],
    `Category A costs ${a}×£${costA}=£${a * costA}; category B costs ${b}×£${costB}=£${b * costB}; combined cost=£${totalAB}.`, d))

  const pct = (a - c) / c * 100
  out.push(mc(`upgrade-ucat-qr-${d}-1`, "UCAT", "Quantitative Reasoning", "Challenge", `${table}\n\nBy what percentage is the number of A units greater than the number of C units?`, `${pct.toFixed(1)}%`,
    [`${((a - c) / a * 100).toFixed(1)}%`, `${(a / c * 100).toFixed(1)}%`, `${(a - c).toFixed(1)}%`],
    `The increase is ${a - c} units relative to the original C value ${c}: (${a - c}/${c})×100=${pct.toFixed(1)}%.`, d + 17))

  const newB = b * (1 + growth / 100)
  const reducedA = a * 0.9
  const combined = newB + reducedA
  out.push(mc(`upgrade-ucat-qr-${d}-2`, "UCAT", "Quantitative Reasoning", "Challenge", `${table}\n\nIf B units increase by ${growth}% while A units fall by 10%, what is the new combined number of A and B units?`, combined.toFixed(1),
    [(a + newB).toFixed(1), (reducedA + b).toFixed(1), ((a + b) * (1 + growth / 100)).toFixed(1)],
    `New B=${b}×${(1 + growth / 100).toFixed(2)}=${newB.toFixed(1)} and new A=${a}×0.90=${reducedA.toFixed(1)}; combined=${combined.toFixed(1)}.`, d + 35))
}

// ---------------------------------------------------------------------------
// UCAT SJT: 14 original educational/clinical-training scenarios × 5 questions.
// No medical knowledge is required. Questions probe judgement, proportionate
// escalation, confidentiality, honesty, teamwork and appropriate supervision.
// ---------------------------------------------------------------------------
const sjtScenarios = [
  {
    scenario: "During a supervised clinical-skills teaching session, a student notices that a peer has copied a measurement incorrectly into a shared practice record. The error has not been used for any decision yet.",
    best: "Speak to the peer promptly and ensure the practice record is corrected openly through the agreed process.",
    delay: "Wait until the end of the day before mentioning it, provided the record is not used meanwhile.",
    reason: "Accurate records and honest correction matter even when an error has not yet caused harm.",
    next: "If the peer refuses to correct the record, seek guidance from the supervising tutor.",
    least: "Quietly change the entry without telling the peer or supervisor so that nobody is embarrassed.",
  },
  {
    scenario: "A student on an educational placement receives an email attachment containing identifiable information that was clearly intended for a different person.",
    best: "Do not forward or use the information; notify the sender or supervisor and follow the organisation's confidentiality process.",
    delay: "Keep the attachment unopened while deciding later whether anybody needs to know about the mistake.",
    reason: "Confidential information should be protected and accidental disclosure should be handled through the proper process.",
    next: "Follow the supervisor's instructions about secure deletion or any required incident reporting.",
    least: "Send the attachment to a friend for advice as long as the friend promises not to share it further.",
  },
  {
    scenario: "While preparing a group presentation on a health topic, one member repeatedly interrupts a quieter student and dismisses their evidence before they can explain it.",
    best: "Redirect the discussion so the quieter student can finish and encourage the group to evaluate everyone's evidence fairly.",
    delay: "Speak to the quieter student afterwards but leave the current discussion unchanged.",
    reason: "Effective teamwork requires respectful participation and attention to evidence rather than dominance by the loudest speaker.",
    next: "If the behaviour continues, agree clearer discussion rules or involve the supervising tutor if necessary.",
    least: "Tell the quieter student that they need to be more forceful if they want their ideas to be heard.",
  },
  {
    scenario: "A student realises that they misunderstood a deadline and will not finish an assigned placement task on time without rushing important checks.",
    best: "Tell the supervisor early, explain the mistake honestly and agree a safe priority or revised plan.",
    delay: "Work as quickly as possible first and mention the problem only if the deadline is actually missed.",
    reason: "Early, honest communication allows workload and quality risks to be managed before they become larger problems.",
    next: "Complete the agreed priorities carefully and reflect on how to avoid the same planning error.",
    least: "Record the unfinished checks as completed so the task appears to have met the deadline.",
  },
  {
    scenario: "During a training exercise, a peer asks another student to sign that they witnessed a step which they did not actually observe, saying that the step definitely happened.",
    best: "Decline to sign and explain that the record must accurately state what was actually observed.",
    delay: "Ask the peer to find somebody who was present before deciding whether the record can be completed.",
    reason: "A record should not claim direct observation when the person signing did not witness the event.",
    next: "If the peer continues to press for a false confirmation, raise the issue with the supervisor.",
    least: "Sign because the peer seems trustworthy and correcting the paperwork would take extra time.",
  },
  {
    scenario: "A student sees a peer skip an agreed safety check in a teaching laboratory because the group is running behind schedule.",
    best: "Raise the missing check immediately and ensure the safe procedure is followed before the task continues.",
    delay: "Make a note of the skipped check and discuss it after the practical has finished.",
    reason: "A time-saving shortcut should not take priority over a check intended to prevent avoidable harm.",
    next: "After the immediate issue is safe, discuss why the shortcut occurred and how the group can manage time without bypassing checks.",
    least: "Use the same shortcut so that the rest of the group is not delayed by following a slower process.",
  },
  {
    scenario: "A student on placement is unsure whether a person requesting information is authorised to receive it. The requester says the matter is urgent but provides no clear verification.",
    best: "Check the relevant rule or seek guidance from an authorised supervisor before sharing the information.",
    delay: "Explain that there may be a short delay while authorisation is checked.",
    reason: "Urgency does not remove the need to verify that confidential information may be shared appropriately.",
    next: "Once authorisation is confirmed, share only the information that is appropriate for the request.",
    least: "Share the information because refusing an urgent request might appear unhelpful.",
  },
  {
    scenario: "Before a teaching session, a normally reliable group member appears very distressed and says they are struggling to concentrate on the task.",
    best: "Check on them privately, consider whether the task can be safely covered and help them contact appropriate support or supervision.",
    delay: "Suggest that they sit quietly for a few minutes and then decide whether they feel able to continue.",
    reason: "The person's wellbeing and the safe completion of the task both need proportionate attention.",
    next: "Agree a practical plan with the supervisor if the person is not able to take part safely or effectively.",
    least: "Insist that they continue exactly as planned because changing roles could inconvenience the rest of the group.",
  },
  {
    scenario: "A group discovers that a factual statement in its presentation is wrong shortly before submission. Correcting it will require rechecking several slides.",
    best: "Correct the error and recheck the affected material, telling the group clearly what changed and why.",
    delay: "Correct the single visible statement first and review related slides if time remains.",
    reason: "Accuracy should be restored transparently, including checking material that may depend on the same mistaken fact.",
    next: "Use a reliable source to confirm the correction before final submission.",
    least: "Leave the error because changing material close to the deadline could draw attention to the group's mistake.",
  },
  {
    scenario: "A student overhears identifiable personal information being discussed in a corridor where other students and visitors can hear it.",
    best: "Prompt the people involved to move or stop the conversation and protect the person's privacy.",
    delay: "Wait briefly to see whether the speakers notice the setting themselves before intervening.",
    reason: "Private information should not be exposed unnecessarily to people who have no reason to hear it.",
    next: "If the disclosure was significant or continues, seek guidance about whether it needs to be reported.",
    least: "Listen carefully so that you can later explain exactly what was said if somebody asks about the conversation.",
  },
  {
    scenario: "Two students disagree about how to interpret evidence for a group assignment. The discussion becomes personal and one student starts criticising the other's ability rather than the evidence.",
    best: "Refocus the discussion on the evidence and task, and ask both students to explain their reasoning without personal criticism.",
    delay: "Pause the discussion for a short time if needed before returning to the evidence calmly.",
    reason: "Disagreement about evidence can be productive, but personal attacks interfere with fair reasoning and teamwork.",
    next: "If the conflict cannot be managed respectfully, involve the tutor responsible for the group task.",
    least: "Support whichever student has the stronger academic record so the group can reach a decision quickly.",
  },
  {
    scenario: "A friend asks a student to send them completed work from an assignment that must be done independently. The friend says they only want to see the structure.",
    best: "Do not send the completed work; offer legitimate help such as discussing the instructions or showing a separate example.",
    delay: "Ask the friend exactly what they are struggling with before deciding what permitted help would be useful.",
    reason: "Support should help the friend learn without giving them material that could undermine independent assessment.",
    next: "Direct the friend to the tutor or approved support if they need more help than can appropriately be provided by a peer.",
    least: "Send the work but ask the friend to change the wording so the submissions do not look similar.",
  },
  {
    scenario: "A student discovers that a decision made earlier in a project relied on a data value that has since been corrected. The correction may change part of the group's conclusion.",
    best: "Tell the group promptly, explain the corrected value and review the parts of the conclusion that may be affected.",
    delay: "Check the calculation independently first, then inform the group as soon as the correction is confirmed.",
    reason: "Later decisions should be based on the most accurate information available, even if revisiting earlier work is inconvenient.",
    next: "Document the correction so the final work clearly reflects which value was used and why.",
    least: "Keep the original conclusion because changing it now might make the group appear inconsistent.",
  },
  {
    scenario: "During a supervised placement, a student is asked to carry out a task they have not been trained to perform independently. The person asking assumes the student already knows how to do it.",
    best: "Explain the limit of your training and ask for appropriate instruction or supervision before carrying out the task.",
    delay: "Ask for a quick demonstration and clarification of what level of supervision is expected.",
    reason: "Being honest about competence protects quality and safety and allows the correct level of supervision to be arranged.",
    next: "Complete the task only within the level of competence and supervision that has been agreed.",
    least: "Attempt the task without saying anything so that you do not appear less capable than other students.",
  },
] as const

for (let s = 0; s < sjtScenarios.length; s++) {
  const x = sjtScenarios[s]
  out.push(mc(`upgrade-ucat-sjt-${s}-0`, "UCAT", "Situational Judgement", "Stretch", `${x.scenario}\n\nWhat is the most appropriate first response?`, x.best,
    [x.delay, `Escalate the matter immediately to the most senior person available before speaking to anybody directly involved.`, `Avoid becoming involved unless somebody specifically asks for help.`],
    `The best response addresses the issue promptly and proportionately while preserving honesty, respect and appropriate supervision.`, s))
  out.push(mc(`upgrade-ucat-sjt-${s}-1`, "UCAT", "Situational Judgement", "Challenge", `${x.scenario}\n\nWhich consideration is most important when deciding how to respond?`, x.reason,
    [`Avoiding any action that could make the group feel uncomfortable in the short term.`, `Ensuring that responsibility for the problem can be attributed to one individual as quickly as possible.`, `Completing the planned timetable without changing roles or asking for additional help.`],
    `The keyed consideration identifies the core professional or educational principle in the scenario rather than convenience, blame or appearance.`, s + 19))
  out.push(mc(`upgrade-ucat-sjt-${s}-2`, "UCAT", "Situational Judgement", "Stretch", `${x.scenario}\n\nHow appropriate would the following response be?\n“${x.delay}”`, "Appropriate but not the best response",
    ["Very appropriate — this should be preferred to the more direct response", "Inappropriate — it would usually make the situation materially worse", "Very inappropriate — it ignores the relevant concern completely"],
    `The response has some merit but is less direct or complete than the best action, so it is appropriate without being the strongest response.`, s + 37))
  out.push(mc(`upgrade-ucat-sjt-${s}-3`, "UCAT", "Situational Judgement", "Challenge", `${x.scenario}\n\nIf the issue is not resolved by the first response, what is the best next step?`, x.next,
    [`Drop the matter because a first attempt has already been made.`, `Discuss the situation widely with other students before involving anybody responsible for supervision.`, `Take unilateral action outside the agreed process so that the issue cannot continue.`],
    `The best next step uses proportionate escalation or follow-up through the appropriate route once a reasonable first response has not resolved the issue.`, s + 53))
  out.push(mc(`upgrade-ucat-sjt-${s}-4`, "UCAT", "Situational Judgement", "Challenge", `${x.scenario}\n\nWhich response would be least appropriate?`, x.least,
    [x.best, x.delay, x.next],
    `The keyed response sacrifices honesty, safety, fairness or confidentiality for convenience or appearance; the alternatives retain at least a defensible professional rationale.`, s + 71))
}

export const reliabilityUpgradeQuestionBank: TestQuestion[] = out

import type { TrackId } from "@/lib/oxbridge-data"

export type InterviewChallengeStage = {
  label: string
  prompt: string
  interviewerMove: string
  lookFor: string[]
}

export type InterviewChallenge = {
  id: string
  track: TrackId
  title: string
  difficulty: "Stretch" | "Challenge"
  minutes: number
  setup: string
  opening: string
  stages: InterviewChallengeStage[]
  debrief: string[]
}

/**
 * Original practice material designed to reproduce the reasoning pattern of a
 * demanding academic interview: unfamiliar starting point, think-aloud work,
 * changing information, challenge to assumptions, and a final generalisation.
 * These are not official Oxford or Cambridge interview questions.
 */
export const interviewChallenges: InterviewChallenge[] = [
  {
    id: "maths-product-constraint",
    track: "maths",
    title: "The product under a constraint",
    difficulty: "Stretch",
    minutes: 12,
    setup: "You are given a simple optimisation problem, then the interviewer changes the domain and asks you to defend why your method still works.",
    opening: "Three positive numbers add to 12. How would you decide which choice makes their product as large as possible? Do not start by guessing values; describe a method you could defend.",
    stages: [
      {
        label: "Build a conjecture",
        prompt: "Try a few deliberately chosen cases. What pattern do you notice, and which cases would be most informative rather than merely convenient?",
        interviewerMove: "You have numerical evidence, but I do not yet have a reason. Why should making two unequal numbers closer together help?",
        lookFor: ["Purposeful examples rather than random trial", "Recognition that balance appears to increase the product", "A distinction between evidence and proof"],
      },
      {
        label: "Justify the step",
        prompt: "Hold the third number fixed. If the other two have a fixed sum, compare their product before and after moving them closer together.",
        interviewerMove: "Can you make that argument without calculus, and can you identify exactly when equality occurs?",
        lookFor: ["Pairwise smoothing or an equivalent algebraic argument", "Clear equality condition", "No dependence on a memorised optimisation rule"],
      },
      {
        label: "Change the rules",
        prompt: "Now allow positive real numbers rather than positive integers. Does your conclusion change? What if zero is allowed?",
        interviewerMove: "Tell me which parts of your argument depended on the original domain and which did not.",
        lookFor: ["Checking boundary cases", "Separating integer search from a general proof", "A precise statement of the final result"],
      },
    ],
    debrief: ["Did you state a conjecture before trying to prove it?", "Did you explain why equalisation helps rather than just quote an answer?", "Did you revisit assumptions when the domain changed?"],
  },
  {
    id: "maths-function-machine",
    track: "maths",
    title: "The function machine",
    difficulty: "Challenge",
    minutes: 14,
    setup: "A functional rule is introduced with very little structure. The interviewer tests whether you can extract consequences carefully instead of jumping to a familiar formula.",
    opening: "A function f is defined on the rational numbers and satisfies f(x + y) = f(x) + f(y) for every rational x and y. You are also told f(1) = 1. What can you deduce about f?",
    stages: [
      {
        label: "Anchor the rule",
        prompt: "Start with values such as 0, 2, -1 and 1/2. Derive each one from the given rule rather than assuming the pattern.",
        interviewerMove: "You think you can see f(x) = x. Which steps let you move from integers to arbitrary rational numbers?",
        lookFor: ["Derivation of f(0)=0", "Treatment of negatives", "A valid rational-number argument"],
      },
      {
        label: "Generalise",
        prompt: "Give a proof for an arbitrary rational p/q, including any condition you need on q.",
        interviewerMove: "Where exactly have you used f(1)=1? What would change if f(1)=c instead?",
        lookFor: ["A general p/q derivation", "Recognition that the scale is fixed by f(1)", "Clear handling of q ≠ 0"],
      },
      {
        label: "Interviewer twist",
        prompt: "Suppose the domain is changed from the rationals to the reals, while the same additivity rule and f(1)=1 are kept. Is your proof enough to force f(x)=x for every real x?",
        interviewerMove: "Do not guess. Identify the exact step that no longer reaches every number and say what extra regularity condition would rescue the conclusion.",
        lookFor: ["Awareness that a rational argument does not automatically cover all reals", "Identification of a missing regularity assumption such as continuity or monotonicity", "Comfort saying what has and has not been proved"],
      },
    ],
    debrief: ["Did you derive small cases from first principles?", "Did you notice when a familiar result needed an extra assumption?", "Did you explicitly identify the point at which the original proof stopped working?"],
  },
  {
    id: "physical-two-planets",
    track: "physical",
    title: "Two planets, one density",
    difficulty: "Stretch",
    minutes: 12,
    setup: "The interviewer gives no formula sheet and expects you to build a scaling argument from basic relationships, units and assumptions.",
    opening: "Planet B has twice the radius of Planet A but the same average density. Without looking up planetary data, compare the gravitational field strength at their surfaces.",
    stages: [
      {
        label: "Build the model",
        prompt: "Write only the relationships you genuinely need. How does mass scale with radius when density is fixed?",
        interviewerMove: "I am more interested in the scaling than arithmetic. Can you show the dependence of surface g on radius in one line?",
        lookFor: ["M proportional to R cubed at fixed density", "Use of g = GM/R squared", "Cancellation leading to g proportional to R"],
      },
      {
        label: "Test the model",
        prompt: "If the radius doubles, what happens to surface g? Check the dimensions and explain physically why the larger distance does not win over the extra mass.",
        interviewerMove: "Which assumption would be least believable for a real planet, and how might violating it change the result?",
        lookFor: ["Correct factor comparison", "Dimensional or limiting check", "Awareness of density structure and rotation as modelling assumptions"],
      },
      {
        label: "Extend it",
        prompt: "Now compare escape speeds qualitatively. You may derive a scaling relation if you know one, but explain it rather than quoting it.",
        interviewerMove: "If you are unsure of the escape-speed formula, how could energy reasoning get you there?",
        lookFor: ["Use of energy conservation", "Recognition that escape speed scales with radius at fixed density", "A transparent route from assumptions to conclusion"],
      },
    ],
    debrief: ["Did you prioritise scaling over plugging in numbers?", "Did you check units or limiting behaviour?", "Did you state the physical assumptions behind the model?"],
  },
  {
    id: "physical-black-box",
    track: "physical",
    title: "The black-box sensor",
    difficulty: "Challenge",
    minutes: 14,
    setup: "You must infer a mechanism from imperfect measurements, then redesign the investigation when a hidden variable is revealed.",
    opening: "A sealed sensor gives an output of 1.0, 2.0, 4.1 and 8.0 units when the input is 1, 2, 4 and 8 units. What models would you consider, and what would you measure next?",
    stages: [
      {
        label: "Competing models",
        prompt: "Give at least two explanations consistent with the four readings. Do not assume the neatest pattern must be the mechanism.",
        interviewerMove: "If both a proportional model and a slightly curved model fit these data, which next input would best discriminate between them?",
        lookFor: ["Multiple hypotheses", "Attention to measurement uncertainty", "A discriminating measurement rather than simply more of the same"],
      },
      {
        label: "New information",
        prompt: "You are told the laboratory temperature rose during the experiment. How does that alter your confidence in the input-output relationship?",
        interviewerMove: "Design a control that separates an input effect from a temperature effect without opening the sensor.",
        lookFor: ["Recognition of confounding", "Control of temperature or randomised order", "Replicates and uncertainty"],
      },
      {
        label: "Defend a conclusion",
        prompt: "Suppose the repeated, temperature-controlled data are close to proportional but not exact. What would justify saying the device is linear over this range?",
        interviewerMove: "Give me a criterion that could prove your claim wrong.",
        lookFor: ["Residuals or an equivalent comparison to uncertainty", "A range-limited conclusion", "A falsifiable criterion"],
      },
    ],
    debrief: ["Did you keep more than one hypothesis alive?", "Did your next measurement distinguish models?", "Did you give a conclusion that matched the strength and range of the evidence?"],
  },
  {
    id: "life-enzyme-paradox",
    track: "life",
    title: "The enzyme result that looks backwards",
    difficulty: "Stretch",
    minutes: 12,
    setup: "A biological result appears to contradict a simple textbook expectation. The task is to generate mechanisms and design a test rather than force the data to fit the first explanation.",
    opening: "An enzyme reaction is faster at 35°C than at 25°C, but a sample pre-heated to 45°C and then cooled to 25°C remains slower than an untreated sample at 25°C. What could explain this?",
    stages: [
      {
        label: "Separate effects",
        prompt: "Distinguish the immediate effect of temperature on reaction rate from any lasting effect of the pre-heating treatment.",
        interviewerMove: "Name at least two mechanisms that would fit the lasting reduction. Which is more directly testable?",
        lookFor: ["Separation of kinetic and structural effects", "Possible denaturation or another lasting chemical change", "Mechanistic alternatives rather than a single story"],
      },
      {
        label: "Design the test",
        prompt: "Design the smallest useful set of controls to distinguish reversible temperature effects from irreversible loss of active enzyme.",
        interviewerMove: "What measurement would you make, and what result would count against your preferred explanation?",
        lookFor: ["Matched controls", "A measurable dependent variable", "A falsifying outcome"],
      },
      {
        label: "Challenge the assumption",
        prompt: "Now suppose the substrate, not the enzyme, is unstable at high temperature. How would your design need to change?",
        interviewerMove: "Which component should be heated separately, and why?",
        lookFor: ["Component-specific controls", "Isolation of causal variables", "Revision of the original hypothesis when new information arrives"],
      },
    ],
    debrief: ["Did you distinguish correlation from mechanism?", "Did you propose a test that could reject your favoured explanation?", "Did you adapt when the interviewer changed which component might be responsible?"],
  },
  {
    id: "life-trial-confound",
    track: "life",
    title: "The trial with a hidden imbalance",
    difficulty: "Challenge",
    minutes: 13,
    setup: "You are asked to interpret a treatment result, then given increasingly awkward information about study design and subgroup effects.",
    opening: "In a small trial, 70% of the treatment group recover within a week compared with 55% of the control group. What can you conclude from those percentages alone?",
    stages: [
      {
        label: "Resist overclaiming",
        prompt: "List the information you need before turning the observed difference into a causal claim.",
        interviewerMove: "Which matters more first: the size of the percentage difference or how participants entered the groups? Defend your choice.",
        lookFor: ["Randomisation and comparability", "Sample size and uncertainty", "Difference between observation and causation"],
      },
      {
        label: "Hidden imbalance",
        prompt: "You learn the treatment group was substantially younger on average. How should that change your interpretation?",
        interviewerMove: "Would adjusting statistically for age make the trial equivalent to a well-randomised trial? Why or why not?",
        lookFor: ["Age recognised as a potential confounder", "Limits of statistical adjustment", "Possibility of unmeasured confounding"],
      },
      {
        label: "Subgroup surprise",
        prompt: "Within each age band the treatment effect is small, but the overall difference remains large. Explain how that could happen.",
        interviewerMove: "What table or graph would you ask to see before making a recommendation?",
        lookFor: ["Awareness of aggregation effects such as Simpson's paradox", "Request for stratified counts rather than percentages alone", "Cautious interpretation"],
      },
    ],
    debrief: ["Did you ask how the groups were formed?", "Did you discuss uncertainty as well as the headline percentages?", "Did you recognise that aggregated data can mislead?"],
  },
  {
    id: "law-wheeled-devices",
    track: "law",
    title: "No wheeled devices in the garden",
    difficulty: "Challenge",
    minutes: 14,
    setup: "A rule looks simple until edge cases expose competing ideas of wording, purpose, fairness and institutional authority.",
    opening: "A public garden rule says: ‘No wheeled devices beyond this gate.’ A visitor using a wheelchair enters. Has the rule been broken? Argue both sides before giving a provisional interpretation.",
    stages: [
      {
        label: "Interpret the text",
        prompt: "Separate the ordinary meaning of the words from the likely purpose of the rule. What evidence would you want about purpose?",
        interviewerMove: "If purpose matters, how do you stop a decision-maker simply rewriting any inconvenient rule?",
        lookFor: ["Literal and purposive readings", "Evidence about context and purpose", "Constraint on interpretive discretion"],
      },
      {
        label: "Hard cases",
        prompt: "Now consider a child's pushchair, a delivery robot and a bicycle being carried rather than ridden. Apply one coherent principle to all three.",
        interviewerMove: "Your principle produces an awkward result in one case. Do you change the principle or accept the result?",
        lookFor: ["Consistency across hypotheticals", "Ability to distinguish relevant from irrelevant facts", "Willingness to expose costs of a rule"],
      },
      {
        label: "Institutional question",
        prompt: "Who should create exceptions: the person enforcing the rule, a court interpreting it, or the body that wrote it?",
        interviewerMove: "Give one reason for flexibility and one reason for legal certainty, then say how you would balance them.",
        lookFor: ["Institutional reasoning", "Trade-off between predictability and fairness", "Qualified conclusion rather than certainty unsupported by the facts"],
      },
    ],
    debrief: ["Did you argue the strongest version of both sides?", "Did one principle survive all the hypotheticals?", "Did you distinguish interpretation from changing the rule?"],
  },
  {
    id: "humanities-two-sources",
    track: "humanities",
    title: "Two witnesses to one protest",
    difficulty: "Stretch",
    minutes: 12,
    setup: "Conflicting sources are used to test whether you can treat disagreement as evidence rather than choosing a favourite account too quickly.",
    opening: "A minister's diary calls a protest ‘small and disorderly’. A local newspaper calls it ‘the largest peaceful gathering in a generation’. How would you use both sources to investigate what happened?",
    stages: [
      {
        label: "Interrogate provenance",
        prompt: "What questions would you ask about authorship, audience, timing and access to the event before comparing factual claims?",
        interviewerMove: "Is a biased source useless? Give me an example of something bias itself might reveal.",
        lookFor: ["Provenance and purpose", "Bias treated as evidence about viewpoint", "Separation of event claims from attitude evidence"],
      },
      {
        label: "New evidence",
        prompt: "A police log records 8,000 people and 14 arrests, but does not describe the mood of the crowd. What does this settle, and what remains open?",
        interviewerMove: "Why might apparently precise numbers still require interpretation?",
        lookFor: ["Use of corroboration", "Recognition that categories and counting methods matter", "No false assumption that one source resolves every question"],
      },
      {
        label: "Construct an account",
        prompt: "Give a two-sentence provisional account that is stronger than either original source alone and explicitly marks one remaining uncertainty.",
        interviewerMove: "What new source would most efficiently reduce that uncertainty?",
        lookFor: ["Synthesis rather than averaging", "Calibrated uncertainty", "Targeted request for further evidence"],
      },
    ],
    debrief: ["Did you use disagreement as information?", "Did you distinguish what each source can and cannot establish?", "Did your final account preserve uncertainty instead of hiding it?"],
  },
  {
    id: "economics-free-breakfast",
    track: "economics",
    title: "Free breakfast, better grades?",
    difficulty: "Challenge",
    minutes: 13,
    setup: "A policy appears successful, but the interviewer moves from causal inference to incentives, distribution and opportunity cost.",
    opening: "A college introduces free breakfast. Attendance rises and average grades improve. The principal says the breakfast programme caused both improvements. How would you evaluate that claim?",
    stages: [
      {
        label: "Causal story",
        prompt: "Construct the strongest plausible mechanism for the principal's claim, then give two rival explanations for the same data.",
        interviewerMove: "Which piece of evidence would most sharply distinguish your preferred mechanism from the alternatives?",
        lookFor: ["Plausible mechanism", "Confounders or contemporaneous changes", "A discriminating empirical test"],
      },
      {
        label: "Incentives and incidence",
        prompt: "Suppose most breakfasts are taken by students who previously bought breakfast elsewhere. Does that weaken the programme's case?",
        interviewerMove: "Separate the effect on total breakfast consumption from the transfer of who pays for it.",
        lookFor: ["Substitution effects", "Distributional incidence", "Recognition that a transfer can matter even without changing total consumption"],
      },
      {
        label: "Opportunity cost",
        prompt: "The programme costs £200 per student per year. What comparison is necessary before saying it is good value?",
        interviewerMove: "Do not just say ‘cost-benefit analysis’. Name the counterfactual that makes the comparison meaningful.",
        lookFor: ["Explicit alternative use of funds", "Marginal rather than headline reasoning", "A conclusion conditional on evidence and objectives"],
      },
    ],
    debrief: ["Did you distinguish causation, distribution and efficiency?", "Did you identify a meaningful counterfactual?", "Did you avoid treating one improved outcome as enough to settle the policy question?"],
  },
  {
    id: "languages-ambiguous-line",
    track: "languages",
    title: "One line, two readings",
    difficulty: "Challenge",
    minutes: 13,
    setup: "A short invented passage tests close reading. The interviewer repeatedly asks what textual evidence would favour one interpretation over another.",
    opening: "Read this invented line: ‘At last the door yielded, though the room beyond seemed to hold its breath.’ What can ‘yielded’ and ‘hold its breath’ make us infer, and what should we resist inferring too quickly?",
    stages: [
      {
        label: "Close reading",
        prompt: "Offer two different readings of the sentence and tie each to particular words, syntax or imagery.",
        interviewerMove: "Which part of your first reading comes from the text, and which part comes from a story you have supplied yourself?",
        lookFor: ["Textual evidence", "More than one defensible interpretation", "Awareness of inference beyond the text"],
      },
      {
        label: "Context arrives",
        prompt: "The next sentence is: ‘Mara laughed at herself and switched on the nursery light.’ How does that alter, but not necessarily erase, your earlier readings?",
        interviewerMove: "Why is revision stronger than pretending the first interpretation was foolish?",
        lookFor: ["Updating an interpretation with new evidence", "Distinguishing atmosphere from literal supernatural claims", "Comfort revising without overcorrecting"],
      },
      {
        label: "Translation twist",
        prompt: "Imagine the original language has one verb that can mean both ‘give way’ and ‘consent’. What would a translator gain and lose by choosing one meaning decisively?",
        interviewerMove: "Would you preserve ambiguity at the cost of natural English? State the trade-off rather than searching for a perfect answer.",
        lookFor: ["Semantic ambiguity", "Translation as interpretive choice", "Explicit discussion of trade-offs"],
      },
    ],
    debrief: ["Did every interpretation point back to language on the page?", "Did you revise when new context appeared?", "Did you discuss what a translation choice makes visible and what it hides?"],
  },
  {
    id: "humanities-map-categories",
    track: "humanities",
    title: "The map that creates its own pattern",
    difficulty: "Challenge",
    minutes: 13,
    setup: "You are shown a result produced by classification choices and asked whether the pattern belongs to the world, the measurement system, or both.",
    opening: "A map colours districts red when unemployment is above 8% and blue when it is below 8%. It shows a dramatic red-blue boundary between neighbouring districts. What should you ask before treating that boundary as a real social divide?",
    stages: [
      {
        label: "Question the categories",
        prompt: "How could the 8% threshold exaggerate a small underlying difference? Give a numerical example.",
        interviewerMove: "Would replacing the map with a continuous colour scale solve every problem?",
        lookFor: ["Threshold effects", "A concrete near-boundary example", "Recognition that visualisation choices still matter"],
      },
      {
        label: "Question the geography",
        prompt: "How might district boundaries themselves affect the pattern you see?",
        interviewerMove: "If changing the spatial units changes the conclusion, does that mean the original data were false?",
        lookFor: ["Awareness of aggregation and spatial-unit effects", "Distinction between raw observations and summaries", "No false binary between true and false data"],
      },
      {
        label: "Make it useful",
        prompt: "Design a better way to present the evidence to a policymaker who still needs to make a decision.",
        interviewerMove: "What would you show so uncertainty and local variation remain visible without making the display unusable?",
        lookFor: ["Continuous values or multiple views", "Uncertainty or sample information", "Communication that supports rather than replaces judgment"],
      },
    ],
    debrief: ["Did you inspect how categories created the visual pattern?", "Did you distinguish measurement choices from the underlying phenomenon?", "Did you propose a practical improvement rather than merely criticise the map?"],
  },
]

export const interviewChallengeTracks: TrackId[] = ["maths", "physical", "life", "law", "humanities", "economics", "languages"]

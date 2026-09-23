export type ReadingRoomItem = {
  id: string
  track: "physical" | "maths" | "life" | "law" | "humanities" | "economics" | "languages"
  title: string
  sourceType: string
  extract: string
  prompts: string[]
  challenge: string
  concepts: string[]
}

export const readingRoomItems: ReadingRoomItem[] = [
  {
    id: "physical-dark-measurement",
    track: "physical",
    title: "When measurement changes the model",
    sourceType: "Original scientific commentary",
    extract: "A measurement is often described as revealing a property that was already there. In practice, measurement can alter the system, select which quantity becomes operationally meaningful, and expose assumptions in the model used to interpret the reading. The important question is therefore not only ‘What did the instrument show?’ but also ‘What relationship between instrument, system and model makes that reading evidence for the quantity we claim to have measured?’",
    prompts: ["Separate observation from interpretation in the passage.", "Give a classical-physics example where the instrument affects the system.", "Which sentence makes the strongest philosophical claim, and how could you weaken it?"],
    challenge: "Suppose the instrument disturbance can be made arbitrarily small. Does the author’s argument collapse?",
    concepts: ["measurement", "model", "evidence", "disturbance"],
  },
  {
    id: "math-proof-explanation",
    track: "maths",
    title: "Proof as explanation",
    sourceType: "Original mathematical commentary",
    extract: "A proof can establish that a statement is true without making the truth feel inevitable. Two proofs of the same theorem may therefore differ in mathematical value even when both are valid: one may certify a result, while another reveals the structural reason it could hardly have been otherwise. This suggests that proof is not only a test of truth but also a technology for reorganising understanding.",
    prompts: ["What distinction is the author making between validity and explanation?", "Can you think of a theorem where one proof feels more explanatory than another?", "Is ‘inevitability’ a useful mathematical criterion or only a psychological one?"],
    challenge: "Could a computer-generated proof be maximally convincing but minimally explanatory?",
    concepts: ["proof", "explanation", "validity", "understanding"],
  },
  {
    id: "life-correlation",
    track: "life",
    title: "Mechanism and biological evidence",
    sourceType: "Original biological commentary",
    extract: "Biology often advances by moving between levels of explanation. A population-level association may suggest a cellular mechanism, while a molecular pathway may fail to predict an organism-level outcome because feedback, compensation and environment intervene. Evidence becomes strongest when explanations survive movement between scales rather than working at only one level.",
    prompts: ["What does ‘movement between scales’ mean here?", "Give an example where a molecular explanation could fail at organism level.", "What evidence would strengthen a proposed mechanism?"],
    challenge: "If a molecular intervention reliably changes the organism-level outcome, is the mechanism thereby established?",
    concepts: ["mechanism", "scale", "feedback", "causation"],
  },
  {
    id: "law-rules-reasons",
    track: "law",
    title: "Rules and reasons",
    sourceType: "Original legal commentary",
    extract: "A legal rule gains predictability by compressing many reasons into a general form. Yet hard cases arise precisely where the compressed rule no longer tracks the reason that justified it. A legal system must then choose between fidelity to the rule’s wording and fidelity to the principle that made the rule worth having.",
    prompts: ["What does the author mean by ‘compressing’ reasons?", "Why can hard cases create tension between wording and purpose?", "Which approach gives greater predictability?"],
    challenge: "If judges can always appeal to underlying principle, does the rule cease to constrain them?",
    concepts: ["rules", "principles", "interpretation", "predictability"],
  },
  {
    id: "humanities-silence",
    track: "humanities",
    title: "The evidence of silence",
    sourceType: "Original historical commentary",
    extract: "Silence in the archive is ambiguous. It may indicate that something did not occur, that it was considered too ordinary to record, that the relevant voices lacked access to record-making institutions, or simply that records were lost. The historian’s task is therefore not to treat absence as empty space, but to ask what kinds of traces the event should have produced if it had occurred.",
    prompts: ["List the alternative explanations for archival silence.", "When could silence become strong evidence?", "How does institutional power affect what survives?"],
    challenge: "Suppose an institution was famous for meticulous record-keeping. How much stronger does absence become as evidence?",
    concepts: ["archives", "absence", "power", "inference"],
  },
  {
    id: "economics-average",
    track: "economics",
    title: "Averages and hidden structure",
    sourceType: "Original economic commentary",
    extract: "An average is a compression of a distribution. That compression can be useful precisely because it discards detail, but it can also mislead when the discarded structure matters to the question being asked. A rise in average income may describe genuine improvement while simultaneously concealing stagnation for a majority if gains are concentrated strongly enough.",
    prompts: ["What information does a mean discard?", "How could the average rise if most people see no change?", "Which additional statistics would you request?"],
    challenge: "If both mean and median rise, what important distributional information could still be hidden?",
    concepts: ["mean", "median", "distribution", "inequality"],
  },
  {
    id: "languages-translation",
    track: "languages",
    title: "Translation as interpretation",
    sourceType: "Original literary commentary",
    extract: "Translation does not begin after interpretation; it is already an act of interpretation. Choosing whether to preserve rhythm, ambiguity, register or literal syntax forces the translator to decide which features of the original are carrying the greatest weight. A translation therefore offers not a neutral copy but an argued reading in another language.",
    prompts: ["Why does the author reject the idea of a neutral translation?", "Which features might be impossible to preserve simultaneously?", "Can two very different translations both be faithful?"],
    challenge: "Would machine translation weaken the claim that translation is necessarily interpretive?",
    concepts: ["translation", "interpretation", "register", "form"],
  },
]

export function readingFor(track: string) {
  return readingRoomItems.filter(item => item.track === track)
}

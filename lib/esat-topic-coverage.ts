import type { TestQuestion } from "@/lib/oxbridge-data"

export const esatCoverageTopics = {
  "Mathematics 1": [
    "Units",
    "Number",
    "Ratio and proportion",
    "Algebra",
    "Geometry",
    "Statistics",
    "Probability",
  ],
  "Mathematics 2": [
    "Algebra and functions",
    "Sequences and series",
    "Coordinate geometry",
    "Trigonometry",
    "Exponentials and logarithms",
    "Differentiation",
    "Integration",
    "Graphs of functions",
  ],
  Physics: [
    "Electricity",
    "Magnetism",
    "Mechanics",
    "Thermal physics",
    "Matter",
    "Waves",
    "Radioactivity",
  ],
  Chemistry: [
    "Atomic structure and periodicity",
    "Reactions and equilibrium",
    "Quantitative chemistry",
    "Bonding and structure",
    "Reactivity and acids",
    "Energetics and rates",
    "Electrochemistry and organic chemistry",
    "Analysis, air and water",
  ],
  Biology: [
    "Cells and membranes",
    "Cell division, inheritance and DNA",
    "Gene technologies and evolution",
    "Enzymes",
    "Animal physiology",
    "Disease and immunity",
    "Ecology",
    "Plant physiology",
  ],
} as const

export type EsatCoverageModule = keyof typeof esatCoverageTopics
export type EsatCoverageTopic = typeof esatCoverageTopics[EsatCoverageModule][number]

function starts(id: string, prefix: string) {
  return id.startsWith(prefix)
}

export function esatCoverageTopic(question: TestQuestion): EsatCoverageTopic | "Other" {
  if (question.test !== "ESAT") return "Other"
  const id = question.id

  if (question.section === "Mathematics 1") {
    if (starts(id, "esat-spec-m1-units-")) return "Units"
    if (starts(id, "esat-spec-m1-number-")) return "Number"
    if (starts(id, "esat-spec-m1-geometry-")) return "Geometry"
    if (starts(id, "esat-spec-m1-statistics-")) return "Statistics"
    if (starts(id, "esat-spec-m1-probability-")) return "Probability"
    if (starts(id, "uniq-esat-m1-square-")) return "Ratio and proportion"
    if (/^uniq-esat-m1-(linear|root|seq|line|ineq)-/.test(id)) return "Algebra"
  }

  if (question.section === "Mathematics 2") {
    if (starts(id, "esat-spec-m2-algebra-")) return "Algebra and functions"
    if (starts(id, "esat-spec-m2-sequences-")) return "Sequences and series"
    if (starts(id, "esat-spec-m2-integration-")) return "Integration"
    if (starts(id, "esat-spec-m2-graphs-")) return "Graphs of functions"
    if (/^uniq-esat-m2-(distance|circle)-/.test(id)) return "Coordinate geometry"
    if (starts(id, "uniq-esat-m2-trig-")) return "Trigonometry"
    if (starts(id, "uniq-esat-m2-log-")) return "Exponentials and logarithms"
    if (starts(id, "uniq-esat-m2-deriv-")) return "Differentiation"
  }

  if (question.section === "Physics") {
    if (starts(id, "uniq-esat-phy-ohm-")) return "Electricity"
    if (starts(id, "esat-spec-physics-magnetism-")) return "Magnetism"
    if (/^uniq-esat-phy-(force|energy|momentum|power)-/.test(id)) return "Mechanics"
    if (starts(id, "esat-spec-physics-thermal-")) return "Thermal physics"
    if (/^uniq-esat-phy-(density|pressure)-/.test(id)) return "Matter"
    if (starts(id, "uniq-esat-phy-wave-")) return "Waves"
    if (starts(id, "esat-spec-physics-radioactivity-")) return "Radioactivity"
  }

  if (question.section === "Chemistry") {
    if (starts(id, "uniq-esat-chem-atom-")) return "Atomic structure and periodicity"
    if (starts(id, "esat-spec-chem-reactions-")) return "Reactions and equilibrium"
    if (/^uniq-esat-chem-(moles|conc|dilute|stoich|yield)-/.test(id)) return "Quantitative chemistry"
    if (starts(id, "esat-spec-chem-bonding-")) return "Bonding and structure"
    if (starts(id, "esat-spec-chem-acids-")) return "Reactivity and acids"
    if (starts(id, "esat-spec-chem-energetics-")) return "Energetics and rates"
    if (starts(id, "esat-spec-chem-electroorganic-")) return "Electrochemistry and organic chemistry"
    if (starts(id, "esat-spec-chem-analysis-")) return "Analysis, air and water"
  }

  if (question.section === "Biology") {
    if (starts(id, "esat-spec-bio-cells-")) return "Cells and membranes"
    if (starts(id, "uniq-esat-bio-genetics-")) return "Cell division, inheritance and DNA"
    if (starts(id, "esat-spec-bio-evolution-")) return "Gene technologies and evolution"
    if (starts(id, "esat-spec-bio-enzymes-")) return "Enzymes"
    if (starts(id, "esat-spec-bio-physiology-")) return "Animal physiology"
    if (starts(id, "esat-spec-bio-immunity-")) return "Disease and immunity"
    if (starts(id, "uniq-esat-bio-sample-")) return "Ecology"
    if (starts(id, "esat-spec-bio-plants-")) return "Plant physiology"
  }

  return "Other"
}

export function esatCoverageCounts(questions: TestQuestion[]) {
  const counts = new Map<string, number>()
  for (const question of questions) {
    const topic = esatCoverageTopic(question)
    counts.set(topic, (counts.get(topic) ?? 0) + 1)
  }
  return counts
}

import type { TestQuestion } from "@/lib/oxbridge-data"

function rotate<T>(items: T[], shift: number) {
  const n = ((shift % items.length) + items.length) % items.length
  return [...items.slice(n), ...items.slice(0, n)]
}

function mc(
  id: string,
  prompt: string,
  correct: string,
  distractors: [string, string, string],
  explanation: string,
  seed: number,
): TestQuestion {
  const options = rotate([correct, ...distractors], seed % 4)
  return {
    id,
    test: "UCAT",
    section: "Quantitative Reasoning",
    difficulty: seed % 3 === 0 ? "Stretch" : "Challenge",
    prompt,
    options,
    answer: options.indexOf(correct),
    explanation,
  }
}

const contexts = [
  ["emergency department arrivals", "Morning", "Afternoon", "Evening"],
  ["vaccination clinic bookings", "Monday", "Wednesday", "Friday"],
  ["regional rail passengers", "North line", "Central line", "South line"],
  ["reservoir monitoring readings", "Reservoir A", "Reservoir B", "Reservoir C"],
  ["library visits", "Adults", "Students", "Children"],
  ["pharmacy stock orders", "Branch East", "Branch West", "Branch Central"],
  ["cycle-hire journeys", "Station Park", "Station Market", "Station Riverside"],
  ["outpatient attendance", "Clinic A", "Clinic B", "Clinic C"],
  ["electricity demand", "06:00", "12:00", "18:00"],
  ["school meal orders", "Main meals", "Vegetarian meals", "Cold meals"],
  ["charity event entries", "Run", "Cycle", "Walk"],
  ["airport shuttle passengers", "Terminal A", "Terminal B", "Terminal C"],
  ["research sample processing", "Lab North", "Lab South", "Lab Central"],
  ["museum admissions", "Morning", "Afternoon", "Evening"],
  ["sports-centre bookings", "Swimming", "Gym", "Courts"],
  ["food-bank parcels", "Area North", "Area East", "Area South"],
  ["community bus tickets", "Route 1", "Route 2", "Route 3"],
  ["campus energy use", "Science block", "Library", "Sports hall"],
] as const

const displayTypes = [
  "Bar chart", "Line graph", "Pie chart", "Bar chart",
  "Line graph", "Bar chart", "Pie chart", "Line graph",
  "Bar chart", "Line graph", "Pie chart", "Bar chart",
  "Line graph", "Bar chart", "Pie chart", "Line graph",
  "Table", "Table",
] as const

function stimulus(type: string, context: string, labels: readonly string[], values: readonly number[]) {
  if (type === "Line graph") {
    return `${type} — ${context}\n${labels.map((label, index) => `${label}: ● ${values[index]}`).join("  ─  ")}`
  }
  if (type === "Pie chart") {
    const total = values.reduce((sum, value) => sum + value, 0)
    return `${type} — ${context}\n${labels.map((label, index) => `${label}: ${values[index]} (${(values[index] / total * 100).toFixed(1)}%)`).join(" | ")}`
  }
  if (type === "Bar chart") {
    return `${type} — ${context}\n${labels.map((label, index) => `${label.padEnd(18, " ")} | ${"█".repeat(3 + index)} ${values[index]}`).join("\n")}`
  }
  return `${type} — ${context}\nCategory | Value\n${labels.map((label, index) => `${label} | ${values[index]}`).join("\n")}`
}

const out: TestQuestion[] = []

for (let i = 0; i < contexts.length; i++) {
  const [context, A, B, C] = contexts[i]
  const a = 52 + i * 4
  const b = 37 + i * 3
  const c = 24 + i * 2
  const growth = [8, 10, 12, 15][i % 4]
  const reduction = [5, 8, 10, 12][(i + 1) % 4]
  const data = stimulus(displayTypes[i], context, [A, B, C], [a, b, c])
  const total = a + b + c

  const combined = a + b
  out.push(mc(
    `ucat-qr-data-${i}-0`,
    `${data}\n\nWhat is the combined value for ${A} and ${B}?`,
    String(combined),
    [String(a + c), String(b + c), String(total)],
    `${A} and ${B} have values ${a} and ${b}. Their combined value is ${a} + ${b} = ${combined}.`,
    i,
  ))

  const pct = (a - c) / c * 100
  out.push(mc(
    `ucat-qr-data-${i}-1`,
    `${data}\n\nBy what percentage does ${A} exceed ${C}, using ${C} as the base value?`,
    `${pct.toFixed(1)}%`,
    [`${((a - c) / a * 100).toFixed(1)}%`, `${(a / c * 100).toFixed(1)}%`, `${(a - c).toFixed(1)}%`],
    `The difference is ${a - c}. Relative to ${C}, the percentage is (${a - c}/${c}) × 100 = ${pct.toFixed(1)}%.`,
    i + 29,
  ))

  const mean = total / 3
  out.push(mc(
    `ucat-qr-data-${i}-2`,
    `${data}\n\nWhat is the mean of the three displayed values?`,
    mean.toFixed(1),
    [((a + b) / 2).toFixed(1), ((b + c) / 2).toFixed(1), ((a + c) / 2).toFixed(1)],
    `The total is ${total}; dividing by 3 gives a mean of ${mean.toFixed(1)}.`,
    i + 58,
  ))

  const newB = b * (1 + growth / 100)
  const newC = c * (1 - reduction / 100)
  const newCombined = newB + newC
  out.push(mc(
    `ucat-qr-data-${i}-3`,
    `${data}\n\nIf ${B} rises by ${growth}% while ${C} falls by ${reduction}%, what is their new combined value?`,
    newCombined.toFixed(1),
    [(b + c).toFixed(1), (newB + c).toFixed(1), (b + newC).toFixed(1)],
    `New ${B} = ${b} × ${(1 + growth / 100).toFixed(2)} = ${newB.toFixed(1)}. New ${C} = ${c} × ${(1 - reduction / 100).toFixed(2)} = ${newC.toFixed(1)}. Combined = ${newCombined.toFixed(1)}.`,
    i + 87,
  ))
}

export const ucatQrOfficialDataBank: TestQuestion[] = out

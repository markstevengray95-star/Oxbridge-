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
  ["broadband data use", "Site Alpha", "Site Beta", "Site Gamma"],
  ["laboratory turnaround times", "Sample type A", "Sample type B", "Sample type C"],
  ["campus energy use", "Science block", "Library", "Sports hall"],
  ["dental clinic appointments", "Clinic North", "Clinic Central", "Clinic South"],
  ["course enrolments", "Course A", "Course B", "Course C"],
  ["parcel deliveries", "Depot East", "Depot Central", "Depot West"],
  ["cinema admissions", "Screen 1", "Screen 2", "Screen 3"],
] as const

const displayTypes = [
  "Bar chart", "Line graph", "Pie chart", "Bar chart",
  "Line graph", "Bar chart", "Pie chart", "Line graph",
  "Bar chart", "Line graph", "Pie chart", "Bar chart",
  "Line graph", "Bar chart", "Pie chart", "Line graph",
  "Bar chart", "Pie chart", "Line graph", "Bar chart",
  "Table", "Table", "Table", "Table",
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
  const a = 48 + i * 3
  const b = 35 + i * 2
  const c = 27 + i
  const growth = [8, 10, 12, 15][i % 4]
  const reduction = [5, 10, 12, 15][(i + 1) % 4]
  const data = stimulus(displayTypes[i], context, [A, B, C], [a, b, c])

  if (i % 4 === 0) {
    const combined = a + b
    out.push(mc(
      `ucat-qr-data-${i}-0`,
      `${data}\n\nWhat is the combined value for ${A} and ${B}?`,
      String(combined),
      [String(a + c), String(b + c), String(a + b + c)],
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
      i + 31,
    ))

    const newB = b * (1 + growth / 100)
    const newA = a * (1 - reduction / 100)
    const newCombined = newA + newB
    out.push(mc(
      `ucat-qr-data-${i}-2`,
      `${data}\n\nIf ${B} rises by ${growth}% while ${A} falls by ${reduction}%, what is their new combined value?`,
      newCombined.toFixed(1),
      [(a + newB).toFixed(1), (newA + b).toFixed(1), ((a + b) * (1 + growth / 100)).toFixed(1)],
      `New ${B} = ${b} × ${(1 + growth / 100).toFixed(2)} = ${newB.toFixed(1)}. New ${A} = ${a} × ${(1 - reduction / 100).toFixed(2)} = ${newA.toFixed(1)}. Combined = ${newCombined.toFixed(1)}.`,
      i + 62,
    ))
  } else if (i % 4 === 1) {
    const mean = (a + b + c) / 3
    out.push(mc(
      `ucat-qr-data-${i}-0`,
      `${data}\n\nWhat is the mean of the three displayed values?`,
      mean.toFixed(1),
      [((a + b) / 2).toFixed(1), ((b + c) / 2).toFixed(1), (a + b + c).toFixed(1)],
      `The total is ${a + b + c}; dividing by 3 gives a mean of ${mean.toFixed(1)}.`,
      i,
    ))

    const total = a + b + c
    const target = total + 24 + i
    const shortfall = target - total
    out.push(mc(
      `ucat-qr-data-${i}-1`,
      `${data}\n\nA target total of ${target} is set. How many additional units are needed to reach it?`,
      String(shortfall),
      [String(target - a), String(target - b), String(target - c)],
      `Current total = ${a} + ${b} + ${c} = ${total}. The shortfall is ${target} − ${total} = ${shortfall}.`,
      i + 31,
    ))

    const ratio = a / b
    out.push(mc(
      `ucat-qr-data-${i}-2`,
      `${data}\n\nApproximately how many ${A} units are there for every one ${B} unit?`,
      `${ratio.toFixed(2)} to 1`,
      [`${(b / a).toFixed(2)} to 1`, `${((a - b) / b).toFixed(2)} to 1`, `${(a / (b + c)).toFixed(2)} to 1`],
      `The ratio is ${a}:${b}. Dividing both sides by ${b} gives ${ratio.toFixed(2)}:1.`,
      i + 62,
    ))
  } else if (i % 4 === 2) {
    const total = a + b + c
    const proportion = a / total * 100
    out.push(mc(
      `ucat-qr-data-${i}-0`,
      `${data}\n\nWhat percentage of the total is represented by ${A}?`,
      `${proportion.toFixed(1)}%`,
      [`${(a / (a + b) * 100).toFixed(1)}%`, `${(a / b * 100).toFixed(1)}%`, `${((total - a) / total * 100).toFixed(1)}%`],
      `Total = ${total}. ${A} contributes ${a}/${total} × 100 = ${proportion.toFixed(1)}%.`,
      i,
    ))

    const newB = b * (1 + growth / 100)
    out.push(mc(
      `ucat-qr-data-${i}-1`,
      `${data}\n\nIf ${B} increases by ${growth}%, what is its new value?`,
      newB.toFixed(1),
      [(b * growth / 100).toFixed(1), (b + growth).toFixed(1), (b / (1 + growth / 100)).toFixed(1)],
      `Increase ${b} by ${growth}%: ${b} × ${(1 + growth / 100).toFixed(2)} = ${newB.toFixed(1)}.`,
      i + 31,
    ))

    const difference = Math.abs(b - c)
    out.push(mc(
      `ucat-qr-data-${i}-2`,
      `${data}\n\nWhat is the absolute difference between ${B} and ${C}?`,
      String(difference),
      [String(Math.abs(a - b)), String(Math.abs(a - c)), String(b + c)],
      `Absolute difference = |${b} − ${c}| = ${difference}.`,
      i + 62,
    ))
  } else {
    const stage1 = a * (1 + growth / 100)
    const stage2 = stage1 * (1 - reduction / 100)
    out.push(mc(
      `ucat-qr-data-${i}-0`,
      `${data}\n\nThe ${A} value rises by ${growth}% and then falls by ${reduction}%. What is the resulting value?`,
      stage2.toFixed(1),
      [(a * (1 + (growth - reduction) / 100)).toFixed(1), (a * (1 - reduction / 100)).toFixed(1), stage1.toFixed(1)],
      `After the rise: ${a} × ${(1 + growth / 100).toFixed(2)} = ${stage1.toFixed(1)}. Applying the fall gives ${stage1.toFixed(1)} × ${(1 - reduction / 100).toFixed(2)} = ${stage2.toFixed(1)}.`,
      i,
    ))

    const difference = a - c
    out.push(mc(
      `ucat-qr-data-${i}-1`,
      `${data}\n\nHow much greater is ${A} than ${C}?`,
      String(difference),
      [String(a - b), String(b - c), String(a + c)],
      `${A} − ${C} = ${a} − ${c} = ${difference}.`,
      i + 31,
    ))

    const needed = (b - c) / c * 100
    out.push(mc(
      `ucat-qr-data-${i}-2`,
      `${data}\n\nBy approximately what percentage would ${C} need to increase to equal the current ${B} value?`,
      `${needed.toFixed(1)}%`,
      [`${((b - c) / b * 100).toFixed(1)}%`, `${(b / c * 100).toFixed(1)}%`, `${(b - c).toFixed(1)}%`],
      `Increase needed = ${b - c}. Relative to the current ${C} value, (${b - c}/${c}) × 100 = ${needed.toFixed(1)}%.`,
      i + 62,
    ))
  }
}

export const ucatQrOfficialDataBank: TestQuestion[] = out

import type { TestQuestion } from "@/lib/oxbridge-data"

function rotate<T>(items: T[], shift: number) {
  const amount = ((shift % items.length) + items.length) % items.length
  return [...items.slice(amount), ...items.slice(0, amount)]
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
    difficulty: "Challenge",
    prompt,
    options,
    answer: options.indexOf(correct),
    explanation,
  }
}

const scenarios = [
  ["community theatre bookings", "Adult tickets", "Student tickets", "Programme sales"],
  ["sports-centre memberships", "Monthly passes", "Day passes", "Class bookings"],
  ["college café trading", "Meal deals", "Hot drinks", "Snack boxes"],
  ["museum visitor income", "Standard entry", "Concession entry", "Guidebook sales"],
  ["school trip costs", "Coach places", "Rail places", "Activity places"],
  ["charity event income", "Run entries", "Cycle entries", "Walk entries"],
  ["laboratory ordering", "Sensor packs", "Cable packs", "Glassware packs"],
  ["regional transport sales", "Peak tickets", "Off-peak tickets", "Day passes"],
  ["book-fair revenue", "Fiction bundles", "Science bundles", "History bundles"],
  ["festival bookings", "Day tickets", "Weekend tickets", "Workshop places"],
  ["printing-service orders", "Poster orders", "Booklet orders", "Card orders"],
  ["community energy plans", "Plan Alpha", "Plan Beta", "Plan Gamma"],
] as const

const rises = [8, 10, 12, 15]
const falls = [5, 8, 10, 12]
const discounts = [5, 10, 12, 15]
const out: TestQuestion[] = []

for (let d = 0; d < scenarios.length; d++) {
  const [context, A, B, C] = scenarios[d]
  const a = 64 + d * 4
  const b = 45 + d * 3
  const c = 30 + d * 2
  const priceA = 8 + (d % 4)
  const priceB = 6 + (d % 5)
  const priceC = 5 + ((d + 2) % 4)
  const rise = rises[d % rises.length]
  const fall = falls[(d + 1) % falls.length]
  const discount = discounts[(d + 2) % discounts.length]
  const table = `Data for ${context}\nType | Current number | Value per item\n${A} | ${a} | £${priceA}\n${B} | ${b} | £${priceB}\n${C} | ${c} | £${priceC}`

  const newA = a * (1 + rise / 100)
  const newBPrice = priceB * (1 - discount / 100)
  const combinedRevenue = newA * priceA + b * newBPrice
  const combinedWrong1 = a * priceA * (1 + rise / 100) + b * priceB
  const combinedWrong2 = newA * priceA + b * priceB * (1 + discount / 100)
  const combinedWrong3 = (a + b) * ((priceA + newBPrice) / 2)
  out.push(mc(
    `ucat-qr-challenge2-${d}-0`,
    `${table}\n\nGiven that the number of ${A.toLowerCase()} rises by ${rise}% while the value per ${B.toLowerCase().replace(/s$/, "")} is discounted by ${discount}%, with all other figures unchanged, what is the new combined value of ${A.toLowerCase()} and ${B.toLowerCase()}?`,
    `£${combinedRevenue.toFixed(2)}`,
    [`£${combinedWrong1.toFixed(2)}`, `£${combinedWrong2.toFixed(2)}`, `£${combinedWrong3.toFixed(2)}`],
    `After the change, ${A} number ${a}×${(1 + rise / 100).toFixed(2)}=${newA.toFixed(2)}, giving £${(newA * priceA).toFixed(2)}. ${B} value per item becomes £${priceB}×${(1 - discount / 100).toFixed(2)}=£${newBPrice.toFixed(2)}, giving £${(b * newBPrice).toFixed(2)}. Combined value=£${combinedRevenue.toFixed(2)}.`,
    d,
  ))

  const newC = c * (1 + rise / 100)
  const newCPrice = priceC * (1 - discount / 100)
  const cRevenue = newC * newCPrice
  const aRevenue = a * priceA
  const differencePct = (cRevenue - aRevenue) / aRevenue * 100
  const wrongPct1 = (cRevenue - aRevenue) / Math.max(1, cRevenue) * 100
  const wrongPct2 = (newC - a) / a * 100
  const wrongPct3 = (cRevenue / aRevenue) * 100
  out.push(mc(
    `ucat-qr-challenge2-${d}-1`,
    `${table}\n\nAfter ${C.toLowerCase()} increase by ${rise}% in number and their value per item is reduced by ${discount}%, compare their new total value with the current total value of ${A.toLowerCase()}. What is the percentage difference, measured relative to the current ${A.toLowerCase()} value?`,
    `${differencePct.toFixed(1)}%`,
    [`${wrongPct1.toFixed(1)}%`, `${wrongPct2.toFixed(1)}%`, `${wrongPct3.toFixed(1)}%`],
    `New ${C} number=${c}×${(1 + rise / 100).toFixed(2)}=${newC.toFixed(2)} and new unit value=£${priceC}×${(1 - discount / 100).toFixed(2)}=£${newCPrice.toFixed(2)}, so new ${C} total=£${cRevenue.toFixed(2)}. Current ${A} total=${a}×£${priceA}=£${aRevenue.toFixed(2)}. Percentage difference relative to ${A}=(${cRevenue.toFixed(2)}−${aRevenue.toFixed(2)})/${aRevenue.toFixed(2)}×100=${differencePct.toFixed(1)}%.`,
    d + 19,
  ))

  const reducedC = c * (1 - fall / 100)
  const totalItems = newA + b + reducedC
  const totalValue = newA * priceA + b * priceB + reducedC * priceC
  const weightedMean = totalValue / totalItems
  const wrongMean1 = (priceA + priceB + priceC) / 3
  const wrongMean2 = (a * priceA + b * priceB + c * priceC) / (a + b + c)
  const wrongMean3 = totalValue / (a + b + c)
  out.push(mc(
    `ucat-qr-challenge2-${d}-2`,
    `${table}\n\nSuppose the number of ${A.toLowerCase()} rises by ${rise}% and the number of ${C.toLowerCase()} falls by ${fall}%, while unit values and ${B.toLowerCase()} remain unchanged. What is the resulting weighted mean value per item across all three types?`,
    `£${weightedMean.toFixed(2)}`,
    [`£${wrongMean1.toFixed(2)}`, `£${wrongMean2.toFixed(2)}`, `£${wrongMean3.toFixed(2)}`],
    `Changed counts are ${A}: ${a}×${(1 + rise / 100).toFixed(2)}=${newA.toFixed(2)} and ${C}: ${c}×${(1 - fall / 100).toFixed(2)}=${reducedC.toFixed(2)}. Total value=£${totalValue.toFixed(2)} across ${totalItems.toFixed(2)} items, so the weighted mean is £${totalValue.toFixed(2)}/${totalItems.toFixed(2)}=£${weightedMean.toFixed(2)}.`,
    d + 37,
  ))
}

export const ucatQrChallengeReserveBank: TestQuestion[] = out

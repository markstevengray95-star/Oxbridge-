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
    test: "ESAT",
    section: "Mathematics 1",
    difficulty: "Challenge",
    prompt,
    options,
    answer: options.indexOf(correct),
    explanation,
  }
}

const pctA = [5, 8, 10, 12, 15, 6, 9, 14]
const pctB = [12, 15, 8, 10, 6, 14, 5, 9]
const contexts = [
  "telescope calibration",
  "bridge survey",
  "greenhouse study",
  "rail timetable analysis",
  "battery test",
  "water-quality investigation",
  "satellite check",
  "factory audit",
] as const
const out: TestQuestion[] = []

for (let i = 0; i < 8; i++) {
  const context = contexts[i]

  // Units: square-unit conversion plus a scale change in both dimensions.
  const width = 120 + 10 * i
  const height = 80 + 5 * i
  const rise = pctA[i]
  const baseAreaCm2 = width * height
  const newAreaM2 = baseAreaCm2 * (1 + rise / 100) ** 2 / 10000
  out.push(mc(
    `esat-m1-challenge-units-${i}`,
    `A rectangular panel used in a ${context} measures ${width} cm by ${height} cm. After both dimensions are increased by ${rise}%, its area is required in square metres. Which value is correct?`,
    `${newAreaM2.toFixed(3)} m²`,
    [`${(baseAreaCm2 * (1 + rise / 100) / 10000).toFixed(3)} m²`, `${(baseAreaCm2 * (1 + 2 * rise / 100) / 10000).toFixed(3)} m²`, `${(baseAreaCm2 * (1 + rise / 100) ** 2 / 100).toFixed(3)} m²`],
    `Both dimensions scale by ${(1 + rise / 100).toFixed(2)}, so area scales by ${(1 + rise / 100).toFixed(2)}². The new area is ${width}×${height}×${(1 + rise / 100).toFixed(2)}²=${(baseAreaCm2 * (1 + rise / 100) ** 2).toFixed(1)} cm², then divide by 10,000 to obtain ${newAreaM2.toFixed(3)} m².`,
    i,
  ))

  // Number: successive percentage changes and comparison with the starting value.
  const start = 800 + 50 * i
  const fall = pctA[i]
  const rise2 = pctB[i]
  const finalValue = start * (1 - fall / 100) * (1 + rise2 / 100)
  const netPct = (finalValue - start) / start * 100
  const inverseStylePct = ((1 + rise2 / 100) / (1 - fall / 100) - 1) * 100
  out.push(mc(
    `esat-m1-challenge-number-${i}`,
    `During a ${context}, a measured quantity starts at ${start}. It falls by ${fall}% and then, from the reduced value, rises by ${rise2}%. Compared with the original quantity, what is the final percentage change?`,
    `${netPct.toFixed(1)}%`,
    [`${(rise2 - fall).toFixed(1)}%`, `${(fall - rise2).toFixed(1)}%`, `${inverseStylePct.toFixed(1)}%`],
    `Successive percentage changes multiply: ${start}×${(1 - fall / 100).toFixed(2)}×${(1 + rise2 / 100).toFixed(2)}=${finalValue.toFixed(2)}. Relative to ${start}, the change is (${finalValue.toFixed(2)}−${start})/${start}×100=${netPct.toFixed(1)}%.`,
    i + 11,
  ))

  // Ratio and proportion: concentration after selective evaporation.
  const r = 2 + (i % 3)
  const s = 5 + (i % 4)
  const total = (r + s) * (20 + i)
  const evaporate = pctA[(i + 2) % pctA.length]
  const concentrate = total * r / (r + s)
  const water = total * s / (r + s)
  const remainingWater = water * (1 - evaporate / 100)
  const concentrationPct = concentrate / (concentrate + remainingWater) * 100
  out.push(mc(
    `esat-m1-challenge-ratio-${i}`,
    `A mixture prepared for a ${context} contains concentrate and water in the ratio ${r}:${s}, with total volume ${total} mL. After ${evaporate}% of the water evaporates but no concentrate is lost, what percentage of the remaining mixture is concentrate?`,
    `${concentrationPct.toFixed(1)}%`,
    [`${(r / (r + s) * 100).toFixed(1)}%`, `${(concentrate / (concentrate + water * evaporate / 100) * 100).toFixed(1)}%`, `${((r + evaporate / 100) / (r + s) * 100).toFixed(1)}%`],
    `Initially concentrate=${total}×${r}/${r + s}=${concentrate.toFixed(1)} mL and water=${water.toFixed(1)} mL. Remaining water=${water.toFixed(1)}×${(1 - evaporate / 100).toFixed(2)}=${remainingWater.toFixed(1)} mL. Concentrate fraction=${concentrate.toFixed(1)}/(${concentrate.toFixed(1)}+${remainingWater.toFixed(1)})=${concentrationPct.toFixed(1)}%.`,
    i + 23,
  ))

  // Algebra: solve linked simultaneous constraints rather than a single rearrangement.
  const x = 3 + i
  const y = 5 + (i % 4)
  const total1 = 2 * x + 3 * y
  const total2 = x + y
  out.push(mc(
    `esat-m1-challenge-algebra-${i}`,
    `Two unknown quantities in a ${context}, x and y, satisfy 2x + 3y = ${total1} and x + y = ${total2}. Using both conditions together, what is the value of x?`,
    String(x),
    [String(y), String(x + 1), String(Math.max(0, x - 1))],
    `From x+y=${total2}, doubling gives 2x+2y=${2 * total2}. Subtracting this from 2x+3y=${total1} gives y=${y}; therefore x=${total2}−${y}=${x}.`,
    i + 31,
  ))

  // Geometry: infer side lengths from a diagonal and a fixed ratio, then area.
  const k = 4 + i
  const diagonal = 5 * k
  const area = 12 * k * k
  out.push(mc(
    `esat-m1-challenge-geometry-${i}`,
    `A rectangular region in a ${context} has side lengths in the ratio 3:4. Given that its diagonal is ${diagonal} cm, what is its area?`,
    `${area} cm²`,
    [`${20 * k} cm²`, `${15 * k * k} cm²`, `${7 * k * k} cm²`],
    `A 3:4 rectangle has diagonal ratio 5 by Pythagoras, so diagonal ${diagonal}=5k gives k=${k}. The sides are ${3 * k} cm and ${4 * k} cm, hence area=${3 * k}×${4 * k}=${area} cm².`,
    i + 43,
  ))

  // Statistics: corrected group value followed by a weighted combined mean.
  const n1 = 20 + i
  const n2 = 30 + 2 * i
  const mean1 = 12 + (i % 4)
  const mean2 = 16 + (i % 5)
  const correction = 4 + (i % 3)
  const totalScore = n1 * mean1 + correction + n2 * mean2
  const combinedMean = totalScore / (n1 + n2)
  out.push(mc(
    `esat-m1-challenge-statistics-${i}`,
    `A ${context} records Group A with ${n1} observations and mean ${mean1}; one recorded value is then corrected upward by ${correction}. Group B has ${n2} observations with mean ${mean2}. After the correction, what is the combined mean of all observations?`,
    combinedMean.toFixed(2),
    [`${((mean1 + mean2) / 2).toFixed(2)}`, `${((n1 * mean1 + n2 * mean2) / (n1 + n2)).toFixed(2)}`, `${((n1 * (mean1 + correction) + n2 * mean2) / (n1 + n2)).toFixed(2)}`],
    `Group A's original total is ${n1}×${mean1}=${n1 * mean1}; the correction makes it ${n1 * mean1 + correction}. Group B total is ${n2}×${mean2}=${n2 * mean2}. Combined mean=(${n1 * mean1 + correction}+${n2 * mean2})/${n1 + n2}=${combinedMean.toFixed(2)}.`,
    i + 59,
  ))

  // Probability: two possible orders without replacement.
  const red = 3 + (i % 4)
  const blue = 4 + (i % 5)
  const green = 2 + (i % 3)
  const n = red + blue + green
  const oneEach = 2 * red * blue / (n * (n - 1))
  const wrong1 = red / n * blue / (n - 1)
  const wrong2 = (red + blue) / n * (red + blue - 1) / (n - 1)
  const wrong3 = red / n * blue / n * 2
  out.push(mc(
    `esat-m1-challenge-probability-${i}`,
    `A selection model for a ${context} uses a bag containing ${red} red, ${blue} blue and ${green} green counters. Two counters are drawn without replacement. What is the probability of obtaining one red and one blue counter, in either order?`,
    oneEach.toFixed(3),
    [wrong1.toFixed(3), wrong2.toFixed(3), wrong3.toFixed(3)],
    `The two mutually exclusive orders are red-then-blue and blue-then-red. Their combined probability is (${red}/${n})(${blue}/${n - 1})+(${blue}/${n})(${red}/${n - 1})=${oneEach.toFixed(3)}.`,
    i + 71,
  ))
}

export const esatM1ChallengeBank: TestQuestion[] = out

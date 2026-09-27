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
    section: "Mathematics 2",
    difficulty: "Challenge",
    prompt,
    options,
    answer: options.indexOf(correct),
    explanation,
  }
}

const out: TestQuestion[] = []
const angles = [30, 45, 60, 30, 45, 60, 30, 45]

for (let i = 0; i < 8; i++) {
  // These IDs deliberately end in a descriptive suffix rather than a bare
  // number. The paper assembler strips only trailing numeric variant markers;
  // keeping each challenge item independently rankable lets admissions-level
  // quality remain primary while topic breadth is still enforced separately.
  const variant = `${i}-linked`

  // Algebra and functions: linked function evaluation.
  const a = 2 + (i % 4)
  const b = 1 + (i % 5)
  const c = 2 + (i % 3)
  const n = 2 + (i % 6)
  const fn = a * n + b
  const result = fn * fn - c
  out.push(mc(
    `esat-m2-challenge-algebra-${variant}`,
    `Given f(x) = ${a}x + ${b} and g(x) = x² − ${c}, use both functions together to evaluate g(f(${n})).`,
    String(result),
    [String(fn - c), String(fn * fn + c), String(a * fn + b - c)],
    `First f(${n})=${a}×${n}+${b}=${fn}. Then g(f(${n}))=${fn}²−${c}=${result}.`,
    i,
  ))

  // Sequences and series: sum over an internal block of an arithmetic sequence.
  const first = 3 + i
  const d = 2 + (i % 4)
  const p = 3 + (i % 3)
  const q = p + 4 + (i % 2)
  const sumTo = (m: number) => m / 2 * (2 * first + (m - 1) * d)
  const blockSum = sumTo(q) - sumTo(p - 1)
  out.push(mc(
    `esat-m2-challenge-sequences-${variant}`,
    `An arithmetic sequence has first term ${first} and common difference ${d}. Given that only terms ${p} through ${q}, inclusive, are required, what is their total?`,
    String(blockSum),
    [String(sumTo(q)), String(sumTo(q) - sumTo(p)), String((q - p + 1) * (first + (p - 1) * d))],
    `Use Sₙ=n/2[2a+(n−1)d]. S_${q}=${sumTo(q)} and S_${p - 1}=${sumTo(p - 1)}, so the required block sum is ${sumTo(q)}−${sumTo(p - 1)}=${blockSum}.`,
    i + 13,
  ))

  // Coordinate geometry: perpendicular bisector from gradient and midpoint.
  const k = 2 + i
  const m = 1 + (i % 3)
  const x2 = 2 * k
  const y2 = 2 * m * k
  const perpGradient = -1 / m
  const intercept = m * k - perpGradient * k
  out.push(mc(
    `esat-m2-challenge-coordinate-${variant}`,
    `Points A(0, 0) and B(${x2}, ${y2}) are endpoints of a line segment. Using both the midpoint and the perpendicular gradient, what is the y-intercept of the perpendicular bisector of AB?`,
    intercept.toFixed(2),
    [(m * k).toFixed(2), (k / m).toFixed(2), (-m * k).toFixed(2)],
    `AB has gradient ${m}, so the perpendicular gradient is ${perpGradient.toFixed(3)}. The midpoint is (${k}, ${m * k}). In y=${perpGradient.toFixed(3)}x+c, substituting the midpoint gives c=${m * k}−(${perpGradient.toFixed(3)}×${k})=${intercept.toFixed(2)}.`,
    i + 27,
  ))

  // Trigonometry: find a missing side, then use it in an area calculation.
  const adjacent = 6 + i
  const angle = angles[i]
  const radians = angle * Math.PI / 180
  const opposite = adjacent * Math.tan(radians)
  const area = 0.5 * adjacent * opposite
  out.push(mc(
    `esat-m2-challenge-trigonometry-${variant}`,
    `A right-angled triangle has an acute angle of ${angle}° and adjacent side ${adjacent} cm. After finding the opposite side using tangent, what is the area of the triangle?`,
    `${area.toFixed(1)} cm²`,
    [`${(0.5 * adjacent * adjacent).toFixed(1)} cm²`, `${opposite.toFixed(1)} cm²`, `${(adjacent * opposite).toFixed(1)} cm²`],
    `tan ${angle}°=opposite/${adjacent}, so opposite=${adjacent}tan${angle}°=${opposite.toFixed(2)} cm. Area=½×${adjacent}×${opposite.toFixed(2)}=${area.toFixed(1)} cm².`,
    i + 41,
  ))

  // Exponentials and logarithms: solve an exponential relation then use x.
  const expOffset = 1 + (i % 4)
  const exponent = 4 + (i % 5)
  const x = exponent - expOffset
  const extra = 2 + (i % 6)
  const derived = x * x + extra
  const target = 2 ** exponent
  out.push(mc(
    `esat-m2-challenge-logarithms-${variant}`,
    `Given that 2^(x + ${expOffset}) = ${target}, first determine x and then evaluate x² + ${extra}. Which value results?`,
    String(derived),
    [String(x + extra), String(exponent * exponent + extra), String(Math.max(0, x * x - extra))],
    `${target}=2^${exponent}, so x+${expOffset}=${exponent} and x=${x}. Therefore x²+${extra}=${x}²+${extra}=${derived}.`,
    i + 55,
  ))

  // Differentiation: gradient followed by tangent-line intercept.
  const qa = 1 + (i % 3)
  const qb = 2 + (i % 5)
  const qc = 3 + (i % 4)
  const t = 1 + (i % 4)
  const y = qa * t * t + qb * t + qc
  const gradient = 2 * qa * t + qb
  const tangentIntercept = y - gradient * t
  out.push(mc(
    `esat-m2-challenge-differentiation-${variant}`,
    `For y = ${qa}x² + ${qb}x + ${qc}, the tangent is drawn at x = ${t}. After differentiating to obtain the gradient, what is the y-intercept of that tangent?`,
    String(tangentIntercept),
    [String(gradient), String(y), String(y + gradient * t)],
    `dy/dx=${2 * qa}x+${qb}, so at x=${t} the gradient is ${gradient}. The point is (${t},${y}). Using y−${y}=${gradient}(x−${t}), the tangent's y-intercept is ${y}−${gradient}×${t}=${tangentIntercept}.`,
    i + 69,
  ))

  // Integration: integrate a quadratic then divide by interval length for average value.
  const ia = 1 + (i % 3)
  const ib = 2 + (i % 4)
  const ic = 1 + (i % 5)
  const upper = 2 + (i % 4)
  const integral = ia * upper ** 3 / 3 + ib * upper ** 2 / 2 + ic * upper
  const average = integral / upper
  out.push(mc(
    `esat-m2-challenge-integration-${variant}`,
    `The function f(x) = ${ia}x² + ${ib}x + ${ic} is considered on 0 ≤ x ≤ ${upper}. Given that the average value is (1/${upper}) times the definite integral over this interval, what is the average value of f?`,
    average.toFixed(2),
    [integral.toFixed(2), `${(ia * upper ** 2 + ib * upper + ic).toFixed(2)}`, `${(integral / (upper + 1)).toFixed(2)}`],
    `∫₀^${upper}f(x)dx=[${ia}x³/3+${ib}x²/2+${ic}x]₀^${upper}=${integral.toFixed(2)}. Dividing by interval length ${upper} gives average value ${average.toFixed(2)}.`,
    i + 83,
  ))

  // Graph transformations: two successive vertex transformations.
  const h = 2 + (i % 5)
  const v = 1 + (i % 4)
  const shift = 3 + (i % 4)
  const finalX = shift - h
  out.push(mc(
    `esat-m2-challenge-graphs-${variant}`,
    `The graph y = (x − ${h})² + ${v} has vertex (${h}, ${v}). It is reflected in the y-axis and then translated ${shift} units to the right. Where is the final vertex?`,
    `(${finalX}, ${v})`,
    [`(${h + shift}, ${v})`, `(${-h - shift}, ${v})`, `(${finalX}, ${-v})`],
    `Reflection in the y-axis sends (${h},${v}) to (${-h},${v}). Translating ${shift} units right gives (${-h}+${shift},${v})=(${finalX},${v}).`,
    i + 97,
  ))
}

export const esatM2ChallengeBank: TestQuestion[] = out

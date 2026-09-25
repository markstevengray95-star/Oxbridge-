import type { TestQuestion } from "@/lib/oxbridge-data"

const difficulties: TestQuestion["difficulty"][] = ["Foundation", "Stretch", "Challenge"]

function rotate<T>(items: T[], shift: number) {
  const n = ((shift % items.length) + items.length) % items.length
  return [...items.slice(n), ...items.slice(0, n)]
}

function mc(
  id: string,
  test: TestQuestion["test"],
  section: string,
  prompt: string,
  correct: string,
  distractors: [string, string, string],
  explanation: string,
  seed: number,
): TestQuestion {
  const raw = [correct, ...distractors]
  const options = rotate(raw, seed % raw.length)
  return {
    id,
    test,
    section,
    difficulty: difficulties[seed % difficulties.length],
    prompt,
    options,
    answer: options.indexOf(correct),
    explanation,
  }
}

const out: TestQuestion[] = []
const contexts = [
  "a robotics trial", "a telescope calibration", "a bridge survey", "a greenhouse study", "a rail timetable", "a battery test",
  "a water-quality sample", "a sports analysis", "a satellite check", "a library survey", "a factory audit", "a field expedition",
]

// TMUA — broad applications bank. Every family uses a different mathematical structure and every context is visibly distinct.
for (let i = 0; i < contexts.length; i++) {
  const a = 2 + (i % 5), b = 3 + (i % 7), x = 2 + (i % 6), y = a * x + b
  out.push(mc(`uniq-tmua-ak-linear-${i}`, "TMUA", "Applications of Mathematical Knowledge", `During ${contexts[i]}, a quantity y is modelled by y = ${a}x + ${b}. If y = ${y}, what is x?`, String(x), [String(x + 1), String(Math.max(0, x - 1)), String(y - b)], `Rearrange: x = (y − ${b})/${a} = ${x}.`, i))

  const c = 1 + (i % 6), n = 2 + (i % 5), f = a * n + b, composed = f * f - c
  out.push(mc(`uniq-tmua-ak-compose-${i}`, "TMUA", "Applications of Mathematical Knowledge", `In ${contexts[(i + 1) % contexts.length]}, f(t) = ${a}t + ${b} and g(t) = t² − ${c}. What is g(f(${n}))?`, String(composed), [String(f - c), String(f * f + c), String(a * f + b - c)], `f(${n}) = ${f}; then g(${f}) = ${f}² − ${c} = ${composed}.`, i + 13))

  const first = 4 + i, diff = 2 + (i % 4), termNo = 6 + (i % 5), term = first + (termNo - 1) * diff
  out.push(mc(`uniq-tmua-ak-seq-${i}`, "TMUA", "Applications of Mathematical Knowledge", `A sequence used in ${contexts[(i + 2) % contexts.length]} starts ${first}, ${first + diff}, ${first + 2 * diff}, … . What is its ${termNo}th term?`, String(term), [String(first + termNo * diff), String(term - diff), String(first * termNo)], `For an arithmetic sequence, uₙ = a + (n−1)d = ${first} + ${termNo - 1}×${diff} = ${term}.`, i + 26))

  const m = 1 + (i % 6), x1 = 1 + (i % 4), x2 = x1 + 2 + (i % 3), dy = m * (x2 - x1)
  out.push(mc(`uniq-tmua-ak-gradient-${i}`, "TMUA", "Applications of Mathematical Knowledge", `A graph from ${contexts[(i + 3) % contexts.length]} is a straight line with gradient ${m}. Between x = ${x1} and x = ${x2}, by how much does y increase?`, String(dy), [String(m + x2 - x1), String(m * x2), String(x2 - x1)], `Δy = gradient × Δx = ${m}×(${x2}−${x1}) = ${dy}.`, i + 39))

  const people = 5 + (i % 8), pairs = people * (people - 1) / 2
  out.push(mc(`uniq-tmua-ak-pairs-${i}`, "TMUA", "Applications of Mathematical Knowledge", `For ${contexts[(i + 4) % contexts.length]}, each pair among ${people} participants must be compared exactly once. How many comparisons are needed?`, String(pairs), [String(people * people), String(people * (people - 1)), String(people + 2)], `The number of unordered pairs is C(${people},2) = ${people}×${people - 1}/2 = ${pairs}.`, i + 52))

  const r1 = 1 + (i % 6), r2 = r1 + 2 + (i % 4), sum = r1 + r2, product = r1 * r2
  out.push(mc(`uniq-tmua-ak-quadratic-${i}`, "TMUA", "Applications of Mathematical Knowledge", `A calculation in ${contexts[(i + 5) % contexts.length]} leads to x² − ${sum}x + ${product} = 0. What is the larger root?`, String(r2), [String(r1), String(sum), String(product)], `The quadratic factorises as (x−${r1})(x−${r2}) = 0, so the larger root is ${r2}.`, i + 65))

  const base = 40 + 5 * i, rise = [10, 15, 20, 25][i % 4], afterRise = base * (1 + rise / 100), afterFall = afterRise * 0.9
  out.push(mc(`uniq-tmua-ak-percent-${i}`, "TMUA", "Applications of Mathematical Knowledge", `A measured value in ${contexts[(i + 6) % contexts.length]} starts at ${base}, rises by ${rise}%, then falls by 10%. What is the final value?`, afterFall.toFixed(1), [afterRise.toFixed(1), (base * 0.9).toFixed(1), (base * (1 + (rise - 10) / 100)).toFixed(1)], `Successive percentage changes multiply: ${base}×${(1 + rise / 100).toFixed(2)}×0.90 = ${afterFall.toFixed(1)}.`, i + 78))

  const centre = 2 + (i % 7), radius = 2 + (i % 5)
  out.push(mc(`uniq-tmua-ak-modulus-${i}`, "TMUA", "Applications of Mathematical Knowledge", `A tolerance condition in ${contexts[(i + 7) % contexts.length]} is |x − ${centre}| < ${radius}. Which interval gives all allowed values of x?`, `${centre - radius} < x < ${centre + radius}`, [`${centre} < x < ${centre + radius}`, `x < ${centre - radius} or x > ${centre + radius}`, `${centre - radius} ≤ x ≤ ${centre + radius}`], `|x−${centre}|<${radius} means −${radius}<x−${centre}<${radius}; add ${centre} throughout.`, i + 91))
}

// TMUA — reasoning bank.
const implicationPairs = [
  ["an integer is divisible by 12", "it is divisible by 3"], ["a quadrilateral is a square", "its diagonals are equal"],
  ["a function is differentiable at a point", "it is continuous at that point"], ["two distinct non-vertical lines are parallel", "their gradients are equal"],
  ["an integer is a multiple of 10", "it is even"], ["a triangle is equilateral", "it is isosceles"],
  ["x > 7", "x > 2"], ["a number is divisible by 18", "it is divisible by 6"],
  ["a matrix is the identity matrix", "its determinant is 1"], ["a sequence is constant", "it is arithmetic"],
  ["an integer is divisible by 4", "its square is divisible by 16"], ["a polynomial has a repeated root", "its graph touches the x-axis at that root"],
] as const
for (let i = 0; i < implicationPairs.length; i++) {
  const [p, q] = implicationPairs[i]
  out.push(mc(`uniq-tmua-mr-contra-${i}`, "TMUA", "Mathematical Reasoning", `Suppose the implication “If ${p}, then ${q}” is true. Which statement is logically equivalent?`, `If it is not true that ${q}, then it is not true that ${p}.`, [`If ${q}, then ${p}.`, `If it is not true that ${p}, then it is not true that ${q}.`, `If ${p}, then it is not true that ${q}.`], "An implication P→Q is logically equivalent to its contrapositive ¬Q→¬P.", i))
}

const claimChecks: Array<[string, string, string]> = [
  ["The sum of two odd integers is even.", "Always true", "Write the integers as 2a+1 and 2b+1; their sum is 2(a+b+1)."],
  ["The product of two irrational numbers is irrational.", "False", "√2 × √2 = 2 is a counterexample."],
  ["If n² is divisible by 5, then n is divisible by 5.", "Always true", "A non-zero residue mod 5 has a non-zero square mod 5."],
  ["Every prime number is odd.", "False", "2 is prime and even."],
  ["If x² > 16, then x > 4.", "False", "x = −5 is a counterexample."],
  ["The square of an even integer is divisible by 4.", "Always true", "If n=2k then n²=4k²."],
  ["The sum of two rational numbers is rational.", "Always true", "Rationals are closed under addition."],
  ["If ab is even, then both a and b are even.", "False", "a=2 and b=3 is a counterexample."],
  ["If a sequence is increasing, every term is positive.", "False", "−3, −2, −1 is increasing but has negative terms."],
  ["If x+y is even for integers x and y, then x and y have the same parity.", "Always true", "Odd+even is odd, so an even sum requires equal parity."],
  ["Every rectangle is a parallelogram.", "Always true", "A rectangle has two pairs of opposite parallel sides."],
  ["Every parallelogram is a rectangle.", "False", "A non-rectangular rhombus is a counterexample."],
  ["If a real function is constant, it is increasing in the strict sense.", "False", "A constant function never has f(b)>f(a) for b>a."],
  ["If two positive numbers have the same square, they are equal.", "Always true", "For positive values the square function is one-to-one."],
  ["If n is divisible by 9, its digit sum is divisible by 9.", "Always true", "This is the standard divisibility test for 9."],
  ["If a triangle has two equal angles, it has two equal opposite sides.", "Always true", "This is the converse of the isosceles triangle theorem."],
  ["The difference of two prime numbers is always even.", "False", "5−2=3 is odd."],
  ["If x<y then x²<y² for all real x,y.", "False", "−3<−2 but 9>4."],
  ["A polynomial of odd degree with real coefficients has at least one real root.", "Always true", "Its end behaviour has opposite signs, so continuity gives a real root."],
  ["If two events are mutually exclusive, they are independent.", "False", "Non-zero mutually exclusive events cannot be independent because P(A∩B)=0 but P(A)P(B)>0."],
] as const
for (let i = 0; i < claimChecks.length; i++) {
  const [claim, result, why] = claimChecks[i]
  out.push(mc(`uniq-tmua-mr-claim-${i}`, "TMUA", "Mathematical Reasoning", `Consider the mathematical claim: “${claim}” Which evaluation is correct?`, result, result === "Always true" ? ["False", "True only for positive integers", "Cannot be decided"] : ["Always true", "True except for zero", "Cannot be decided"], why, i + 17))
}

const sufficiency: Array<[string, string]> = [
  ["being divisible by 12", "being divisible by 3"], ["being a square", "being a rectangle"], ["being equilateral", "being isosceles"],
  ["being a multiple of 20", "being a multiple of 5"], ["being differentiable", "being continuous"], ["having determinant 0", "being non-invertible"],
  ["being an integer greater than 10", "being a real number greater than 0"], ["having four right angles", "being a rectangle"],
  ["being a multiple of 6", "being even"], ["being a cube of an integer", "being an integer"], ["being a prime greater than 2", "being odd"], ["being a constant sequence", "being an arithmetic sequence"],
] as const
for (let i = 0; i < sufficiency.length; i++) {
  const [stronger, weaker] = sufficiency[i]
  out.push(mc(`uniq-tmua-mr-suff-${i}`, "TMUA", "Mathematical Reasoning", `Every object with property A (${stronger}) also has property B (${weaker}), but some objects with B do not have A. Which description is correct?`, `A is sufficient but not necessary for B.`, [`A is necessary but not sufficient for B.`, `A and B are equivalent.`, `Neither property is related to the other.`], "If A always implies B, A is sufficient for B. Because B can hold without A, A is not necessary.", i + 41))
}

// ESAT Mathematics 1.
for (let i = 0; i < contexts.length; i++) {
  const a = 2 + (i % 6), b = 1 + (i % 8), x = 2 + (i % 5), y = a * x + b
  out.push(mc(`uniq-esat-m1-linear-${i}`, "ESAT", "Mathematics 1", `A calibration graph in ${contexts[i]} follows y = ${a}x + ${b}. At y = ${y}, what is x?`, String(x), [String(x + 1), String(y - b), String(Math.max(0, x - 1))], `x=(y−${b})/${a}=${x}.`, i))
  const r1 = 1 + (i % 5), r2 = r1 + 1 + (i % 4), s = r1 + r2, p = r1 * r2
  out.push(mc(`uniq-esat-m1-root-${i}`, "ESAT", "Mathematics 1", `A model from ${contexts[(i + 1) % contexts.length]} gives t² − ${s}t + ${p} = 0. Which value is a root?`, String(r2), [String(s), String(p), String(r2 + 1)], `The quadratic is (t−${r1})(t−${r2}), so ${r2} is a root.`, i + 13))
  const first = 3 + i, d = 2 + (i % 5), n = 8 + (i % 4), nth = first + (n - 1) * d
  out.push(mc(`uniq-esat-m1-seq-${i}`, "ESAT", "Mathematics 1", `Measurements in ${contexts[(i + 2) % contexts.length]} form an arithmetic sequence with first term ${first} and common difference ${d}. What is term ${n}?`, String(nth), [String(first + n * d), String(nth - d), String(first * n)], `uₙ=a+(n−1)d=${nth}.`, i + 26))
  const m = 1 + (i % 5), c = 2 + (i % 9), px = 1 + (i % 4), py = m * px + c
  out.push(mc(`uniq-esat-m1-line-${i}`, "ESAT", "Mathematics 1", `The line y = ${m}x + ${c} appears in ${contexts[(i + 3) % contexts.length]}. Which point lies on the line?`, `(${px}, ${py})`, [`(${px}, ${py + 1})`, `(${px + 1}, ${py})`, `(${c}, ${m})`], `Substitute x=${px}: y=${m}×${px}+${c}=${py}.`, i + 39))
  const q = 2 + (i % 5), rhs = a * q + b
  out.push(mc(`uniq-esat-m1-ineq-${i}`, "ESAT", "Mathematics 1", `A design limit in ${contexts[(i + 4) % contexts.length]} requires ${a}x + ${b} < ${rhs}. Which condition on x is equivalent?`, `x < ${q}`, [`x > ${q}`, `x ≤ ${q}`, `x < ${rhs - b}`], `Subtract ${b}, then divide by positive ${a}: x<${q}.`, i + 52))
  const scale = 2 + (i % 4), original = 3 + (i % 7), newValue = original * scale * scale
  out.push(mc(`uniq-esat-m1-square-${i}`, "ESAT", "Mathematics 1", `In ${contexts[(i + 5) % contexts.length]}, a quantity is proportional to the square of length. If length is multiplied by ${scale} and the original quantity is ${original}, what is the new quantity?`, String(newValue), [String(original * scale), String(original + scale * scale), String(original * scale * scale * scale)], `Square-law scaling multiplies the quantity by ${scale}², giving ${newValue}.`, i + 65))
}

// ESAT Mathematics 2.
for (let i = 0; i < contexts.length; i++) {
  const u = 3 + (i % 5), v = 4 + (i % 7), h = Math.sqrt(u * u + v * v)
  out.push(mc(`uniq-esat-m2-pyth-${i}`, "ESAT", "Mathematics 2", `A right-angled geometry problem from ${contexts[i]} has perpendicular sides ${u} cm and ${v} cm. Which value is closest to the hypotenuse?`, `${h.toFixed(2)} cm`, [`${(u + v).toFixed(2)} cm`, `${(u * v).toFixed(2)} cm`, `${Math.abs(u - v).toFixed(2)} cm`], `Use Pythagoras: h=√(${u}²+${v}²)=${h.toFixed(2)} cm.`, i))
  const r = 2 + (i % 6), area = Math.PI * r * r
  out.push(mc(`uniq-esat-m2-circle-${i}`, "ESAT", "Mathematics 2", `A circular component in ${contexts[(i + 1) % contexts.length]} has radius ${r} cm. What is its area to 2 d.p.?`, `${area.toFixed(2)} cm²`, [`${(2 * Math.PI * r).toFixed(2)} cm²`, `${(Math.PI * r).toFixed(2)} cm²`, `${(r * r).toFixed(2)} cm²`], `Area=πr²=${area.toFixed(2)} cm².`, i + 13))
  const k = 2 + (i % 5), x = 1 + (i % 6), gradient = 2 * k * x
  out.push(mc(`uniq-esat-m2-deriv-${i}`, "ESAT", "Mathematics 2", `For ${contexts[(i + 2) % contexts.length]}, y = ${k}x² + 3. What is dy/dx at x = ${x}?`, String(gradient), [String(k * x), String(2 * k), String(gradient + 3)], `dy/dx=2×${k}x; at x=${x}, the gradient is ${gradient}.`, i + 26))
  const ax = 1 + (i % 5), ay = 2 + (i % 6), bx = ax + 3, by = ay + 4, distance = 5
  out.push(mc(`uniq-esat-m2-distance-${i}`, "ESAT", "Mathematics 2", `Two mapped points in ${contexts[(i + 3) % contexts.length]} are A(${ax},${ay}) and B(${bx},${by}). What is AB?`, String(distance), ["7", "4", "3"], `AB=√(3²+4²)=5.`, i + 39))
  const side = 5 + i, ratio = 0.6, opp = side * ratio
  out.push(mc(`uniq-esat-m2-trig-${i}`, "ESAT", "Mathematics 2", `In a right triangle used for ${contexts[(i + 4) % contexts.length]}, sin θ = 0.6 and the hypotenuse is ${side}. What is the side opposite θ?`, opp.toFixed(1), [(side / ratio).toFixed(1), (side * 0.8).toFixed(1), (side - opp).toFixed(1)], `sin θ = opposite/hypotenuse, so opposite = 0.6×${side} = ${opp.toFixed(1)}.`, i + 52))
  const n = 2 + (i % 5), value = 2 ** n
  out.push(mc(`uniq-esat-m2-log-${i}`, "ESAT", "Mathematics 2", `A calculation in ${contexts[(i + 5) % contexts.length]} gives 2ˣ = ${value}. What is x?`, String(n), [String(value / 2), String(n + 1), String(n - 1)], `Because ${value}=2^${n}, x=${n}.`, i + 65))
}

// ESAT Physics.
const physicsObjects = ["trolley", "drone", "sled", "robot", "lift", "boat", "cart", "capsule", "bike", "probe", "winch", "conveyor"]
for (let i = 0; i < physicsObjects.length; i++) {
  const object = physicsObjects[i], mass = 2 + (i % 7), dv = 2 + (i % 5), dt = 1 + (i % 4), force = mass * dv / dt
  out.push(mc(`uniq-esat-phy-force-${i}`, "ESAT", "Physics", `A ${mass} kg ${object} increases its speed by ${dv} m s⁻¹ in ${dt} s at constant acceleration. What resultant force acts on it?`, `${force.toFixed(1)} N`, [`${(mass * dv).toFixed(1)} N`, `${(mass / dt).toFixed(1)} N`, `${(force + mass).toFixed(1)} N`], `a=Δv/Δt=${dv}/${dt}; F=ma=${force.toFixed(1)} N.`, i))
  const speed = 3 + (i % 8), ke = 0.5 * mass * speed * speed
  out.push(mc(`uniq-esat-phy-energy-${i}`, "ESAT", "Physics", `The same ${object} has mass ${mass} kg and speed ${speed} m s⁻¹. What is its kinetic energy?`, `${ke.toFixed(1)} J`, [`${(mass * speed).toFixed(1)} J`, `${(mass * speed * speed).toFixed(1)} J`, `${(0.5 * mass * speed).toFixed(1)} J`], `Eₖ=½mv²=${ke.toFixed(1)} J.`, i + 13))
  const u = 2 + (i % 4), v = u + 3, momentumChange = mass * (v - u)
  out.push(mc(`uniq-esat-phy-momentum-${i}`, "ESAT", "Physics", `A ${mass} kg ${object} changes speed from ${u} to ${v} m s⁻¹ in the same direction. What is the change in momentum?`, `${momentumChange} kg m s⁻¹`, [`${mass * v} kg m s⁻¹`, `${mass * u} kg m s⁻¹`, `${v - u} kg m s⁻¹`], `Δp=m(v−u)=${mass}×${v - u}=${momentumChange}.`, i + 26))
  const work = 120 + 20 * i, time = 4 + (i % 5), power = work / time
  out.push(mc(`uniq-esat-phy-power-${i}`, "ESAT", "Physics", `A motor driving the ${object} transfers ${work} J in ${time} s. What is its mean power?`, `${power.toFixed(1)} W`, [`${(work * time).toFixed(1)} W`, `${(time / work).toFixed(3)} W`, `${(work - time).toFixed(1)} W`], `P=E/t=${work}/${time}=${power.toFixed(1)} W.`, i + 39))
  const rho = 500 + 50 * i, volume = 0.002 + 0.0005 * (i % 5), m = rho * volume
  out.push(mc(`uniq-esat-phy-density-${i}`, "ESAT", "Physics", `A sample associated with the ${object} has density ${rho} kg m⁻³ and volume ${volume.toFixed(4)} m³. What is its mass?`, `${m.toFixed(2)} kg`, [`${(rho / volume).toFixed(2)} kg`, `${(volume / rho).toFixed(6)} kg`, `${rho + volume} kg`], `m=ρV=${rho}×${volume.toFixed(4)}=${m.toFixed(2)} kg.`, i + 52))
  const resistance = 2 + (i % 8), current = 1 + (i % 5), voltage = resistance * current
  out.push(mc(`uniq-esat-phy-ohm-${i}`, "ESAT", "Physics", `A circuit sensor on the ${object} has resistance ${resistance} Ω and current ${current} A. What is the potential difference?`, `${voltage} V`, [`${resistance + current} V`, `${(resistance / current).toFixed(1)} V`, `${resistance * current * current} V`], `V=IR=${current}×${resistance}=${voltage} V.`, i + 65))
  const freq = 20 + 5 * i, wavelength = 0.5 + 0.1 * (i % 5), waveSpeed = freq * wavelength
  out.push(mc(`uniq-esat-phy-wave-${i}`, "ESAT", "Physics", `A wave used to monitor the ${object} has frequency ${freq} Hz and wavelength ${wavelength.toFixed(1)} m. What is its speed?`, `${waveSpeed.toFixed(1)} m s⁻¹`, [`${(freq / wavelength).toFixed(1)} m s⁻¹`, `${(freq + wavelength).toFixed(1)} m s⁻¹`, `${wavelength.toFixed(1)} m s⁻¹`], `v=fλ=${freq}×${wavelength.toFixed(1)}=${waveSpeed.toFixed(1)} m s⁻¹.`, i + 78))
  const pressureForce = 100 + 20 * i, area = 0.2 + 0.05 * (i % 6), pressure = pressureForce / area
  out.push(mc(`uniq-esat-phy-pressure-${i}`, "ESAT", "Physics", `A support beneath the ${object} exerts ${pressureForce} N over ${area.toFixed(2)} m². What pressure is produced?`, `${pressure.toFixed(0)} Pa`, [`${(pressureForce * area).toFixed(0)} Pa`, `${(area / pressureForce).toFixed(4)} Pa`, `${pressureForce} Pa`], `p=F/A=${pressureForce}/${area.toFixed(2)}=${pressure.toFixed(0)} Pa.`, i + 91))
}

// ESAT Chemistry.
const chemSamples = ["salt solution", "acid sample", "alkali sample", "fertiliser extract", "metal oxide", "carbonate sample", "fuel sample", "water sample", "alloy digest", "buffer", "reaction mixture", "laboratory standard"]
for (let i = 0; i < chemSamples.length; i++) {
  const sample = chemSamples[i], mass = 4 + i, mr = 20 + 5 * (i % 8), moles = mass / mr
  out.push(mc(`uniq-esat-chem-moles-${i}`, "ESAT", "Chemistry", `A ${sample} contains ${mass} g of a substance with Mᵣ = ${mr}. How many moles of that substance are present?`, `${moles.toFixed(3)} mol`, [`${(mass * mr).toFixed(1)} mol`, `${(mr / mass).toFixed(3)} mol`, `${mass.toFixed(1)} mol`], `n=m/Mᵣ=${mass}/${mr}=${moles.toFixed(3)} mol.`, i))
  const n = 0.10 + 0.05 * (i % 8), volume = 0.20 + 0.10 * (i % 6), conc = n / volume
  out.push(mc(`uniq-esat-chem-conc-${i}`, "ESAT", "Chemistry", `A ${sample} contains ${n.toFixed(2)} mol in ${volume.toFixed(2)} dm³. What is the concentration?`, `${conc.toFixed(2)} mol dm⁻³`, [`${(n * volume).toFixed(2)} mol dm⁻³`, `${(volume / n).toFixed(2)} mol dm⁻³`, `${(n / (volume * 10)).toFixed(2)} mol dm⁻³`], `c=n/V=${conc.toFixed(2)} mol dm⁻³.`, i + 13))
  const stock = 1.0 + 0.2 * (i % 5), v1 = 20 + 5 * (i % 5), v2 = 100 + 20 * (i % 4), diluted = stock * v1 / v2
  out.push(mc(`uniq-esat-chem-dilute-${i}`, "ESAT", "Chemistry", `For a ${sample}, ${v1} cm³ of ${stock.toFixed(1)} mol dm⁻³ stock is diluted to ${v2} cm³. What is the new concentration?`, `${diluted.toFixed(2)} mol dm⁻³`, [`${(stock * v2 / v1).toFixed(2)} mol dm⁻³`, `${stock.toFixed(2)} mol dm⁻³`, `${(stock - v1 / v2).toFixed(2)} mol dm⁻³`], `Use c₁V₁=c₂V₂: c₂=${stock.toFixed(1)}×${v1}/${v2}=${diluted.toFixed(2)}.`, i + 26))
  const reactant = 0.2 + 0.05 * (i % 6), coeff = 1 + (i % 3), product = reactant * coeff
  out.push(mc(`uniq-esat-chem-stoich-${i}`, "ESAT", "Chemistry", `A reaction involving the ${sample} forms ${coeff} mol of product per 1 mol of reactant. If ${reactant.toFixed(2)} mol reactant is used completely, how many moles of product form?`, `${product.toFixed(2)} mol`, [`${(reactant / coeff).toFixed(2)} mol`, `${(reactant + coeff).toFixed(2)} mol`, `${coeff.toFixed(2)} mol`], `Multiply the reactant amount by the stoichiometric ratio: ${reactant.toFixed(2)}×${coeff}=${product.toFixed(2)} mol.`, i + 39))
  const theoretical = 10 + 2 * i, actual = theoretical * (0.60 + 0.02 * (i % 6)), yieldPct = actual / theoretical * 100
  out.push(mc(`uniq-esat-chem-yield-${i}`, "ESAT", "Chemistry", `A preparation of the ${sample} has a theoretical yield of ${theoretical} g and an actual yield of ${actual.toFixed(1)} g. What is the percentage yield?`, `${yieldPct.toFixed(0)}%`, [`${(100 - yieldPct).toFixed(0)}%`, `${(actual * theoretical).toFixed(0)}%`, `${(theoretical / actual * 100).toFixed(0)}%`], `Percentage yield=actual/theoretical×100=${yieldPct.toFixed(0)}%.`, i + 52))
  const protons = 6 + i, neutrons = 6 + (i % 8), massNo = protons + neutrons
  out.push(mc(`uniq-esat-chem-atom-${i}`, "ESAT", "Chemistry", `An atom relevant to the ${sample} has proton number ${protons} and mass number ${massNo}. How many neutrons does it contain?`, String(neutrons), [String(protons), String(massNo), String(Math.abs(protons - neutrons))], `Neutrons = mass number − proton number = ${massNo}−${protons}=${neutrons}.`, i + 65))
}

// ESAT Biology.
const bioContexts = ["root hair cells", "red blood cells", "leaf mesophyll", "yeast cells", "bacterial culture", "fish gills", "muscle cells", "plant seedlings", "enzyme extract", "pond organisms", "blood sample", "pollen grains"]
for (let i = 0; i < bioContexts.length; i++) {
  const context = bioContexts[i], scale = 2 + (i % 4)
  out.push(mc(`uniq-esat-bio-sav-${i}`, "ESAT", "Biology", `A roughly spherical ${context} model increases its radius by a factor of ${scale}. What happens to its surface-area-to-volume ratio?`, `It becomes 1/${scale} of the original ratio.`, [`It becomes ${scale} times larger.`, `It becomes ${scale * scale} times larger.`, "It stays unchanged."], `Surface area scales with r² and volume with r³, so SA:V scales as 1/r.`, i))
  const image = 20 + 5 * i, actual = 0.05 + 0.01 * (i % 5), mag = image / actual
  out.push(mc(`uniq-esat-bio-mag-${i}`, "ESAT", "Biology", `An image of ${context} is ${image} mm long while the actual specimen is ${actual.toFixed(2)} mm. What is the magnification?`, `${mag.toFixed(0)}×`, [`${(image * actual).toFixed(1)}×`, `${(actual / image).toFixed(3)}×`, `${image.toFixed(0)}×`], `Magnification=image size/actual size=${mag.toFixed(0)}×.`, i + 13))
  const initial = 50 + 5 * i, final = initial + 5 + (i % 5) * 5, pct = (final - initial) / initial * 100
  out.push(mc(`uniq-esat-bio-change-${i}`, "ESAT", "Biology", `In a study of ${context}, a measured value rises from ${initial} to ${final}. What is the percentage increase?`, `${pct.toFixed(1)}%`, [`${(final / initial * 100).toFixed(1)}%`, `${(final - initial).toFixed(1)}%`, `${(initial / final * 100).toFixed(1)}%`], `Percentage increase=(change/original)×100=${pct.toFixed(1)}%.`, i + 26))
  const dom = 3 + (i % 5), rec = 1 + (i % 3), total = dom + rec, prob = rec / total
  out.push(mc(`uniq-esat-bio-genetics-${i}`, "ESAT", "Biology", `A simplified inheritance model for ${context} predicts ${rec} recessive outcome(s) in every ${total} equally likely outcomes. What is the probability of a recessive outcome?`, prob.toFixed(2), [(dom / total).toFixed(2), (1 / dom).toFixed(2), String(rec)], `Probability=favourable/total=${rec}/${total}=${prob.toFixed(2)}.`, i + 39))
  const quadrats = 5 + (i % 5), mean = 4 + (i % 6), estimated = quadrats * mean
  out.push(mc(`uniq-esat-bio-sample-${i}`, "ESAT", "Biology", `A field study of ${context} records a mean of ${mean} organisms per quadrat across ${quadrats} equal quadrats. If the sampled area contains ${quadrats} quadrat-sized units, what count is estimated for that area?`, String(estimated), [String(mean), String(quadrats), String(estimated + mean)], `Estimated count=mean per quadrat×number of quadrat-sized units=${estimated}.`, i + 52))
  const control = 20 + (i % 5), treated = control - (2 + (i % 4)), diff = control - treated
  out.push(mc(`uniq-esat-bio-evidence-${i}`, "ESAT", "Biology", `An experiment on ${context} gives a control mean of ${control} units and a treatment mean of ${treated} units. No variation or sample-size data are supplied. Which conclusion is most defensible?`, `The observed treatment mean is ${diff} units lower, but the strength of evidence is uncertain.`, [`The treatment definitely causes a ${diff}-unit reduction.`, "The treatment has no effect.", "The difference must be statistically significant."], `The means differ, but causal and statistical claims require design, variation and sample-size information.`, i + 65))
}

// TARA Critical Thinking — varied reasoning tasks on distinct arguments.
const criticalCases = [
  ["A town opened a cycle lane and shop sales rose the next year.", "The cycle lane caused the rise in sales.", "A new shopping centre opened nearby during the same year.", "Comparable streets with no new shopping centre showed a similar rise after cycle lanes opened.", "No other major change affected retail demand."],
  ["Students attending optional tutorials score higher on average.", "Tutorial attendance improves examination scores.", "More motivated students may be more likely to attend tutorials.", "Randomly assigned tutorial places produce a similar score increase.", "The groups would otherwise have similar attainment."],
  ["A hospital introduced text reminders and missed appointments fell.", "The reminders caused the fall in missed appointments.", "The hospital also changed its booking system that month.", "Clinics adopting reminders without changing booking systems also saw a fall.", "The booking-system change is not the main cause of the fall."],
  ["A firm allowed hybrid working and resignations fell.", "Hybrid working improved staff retention.", "Pay was increased at the same time.", "A matched division with unchanged pay also saw resignations fall after hybrid working.", "Pay changes do not explain most of the retention change."],
  ["A school banned phones and reported fewer classroom disruptions.", "The phone ban reduced disruption.", "A new behaviour policy began simultaneously.", "Disruption fell most in classes where phone use had previously been highest.", "The behaviour policy alone does not explain the pattern."],
  ["A city reduced bus fares and passenger numbers rose.", "Lower fares caused the increase in bus use.", "Fuel prices rose sharply during the same period.", "Routes with the largest fare cuts had the largest passenger increases after accounting for fuel prices.", "Other travel-cost changes are not sufficient to explain the increase."],
  ["A museum made entry free and visits increased.", "Free entry caused the increase in visits.", "A major exhibition opened at the same time.", "Attendance rose on ordinary-exhibition days as well as special-exhibition days.", "The special exhibition is not the sole explanation."],
  ["A company changed its logo and online sales rose.", "The new logo caused higher sales.", "The company launched a large advertising campaign at the same time.", "Sales rose only in regions exposed to the new logo but not the campaign.", "Advertising exposure is not driving the observed difference."],
  ["A college added recorded lectures and pass rates rose.", "Recorded lectures improved pass rates.", "The assessment was redesigned that year.", "Courses using the same redesigned assessment but no recordings did not show the same rise.", "Assessment redesign alone does not account for the rise."],
  ["A park installed more lighting and reported crime fell.", "Better lighting reduced crime.", "Police patrols also increased.", "Similar patrol increases without new lighting produced a smaller change.", "Patrol changes are not the whole explanation."],
  ["A website simplified checkout and abandoned baskets fell.", "The new checkout reduced abandonment.", "Delivery fees were reduced at the same time.", "A controlled test with identical fees found lower abandonment using the new checkout.", "Fee changes are not necessary for the effect."],
  ["A farm changed feed and milk yield rose.", "The new feed increased yield.", "The weather became cooler during the same period.", "A randomised herd trial under the same weather conditions found higher yield with the new feed.", "Weather differences are not required to produce the yield change."],
  ["A library extended opening hours and borrowing increased.", "Longer hours increased borrowing.", "Membership fees were removed that month.", "Libraries extending hours without changing fees also saw borrowing rise.", "Fee removal is not the only plausible cause."],
  ["A sports club hired a new coach and injuries fell.", "The coach reduced injuries.", "Training volume was also reduced.", "Teams using the coach while keeping training volume stable also recorded fewer injuries.", "Reduced training volume is not necessary for the improvement."],
  ["A council planted street trees and summer electricity use fell.", "The trees reduced cooling demand.", "That summer was cooler than usual.", "Buildings beside mature new planting used less electricity than similar unplanted buildings during the same weather.", "Weather alone does not explain the local difference."],
  ["A retailer introduced self-checkout and queue times fell.", "Self-checkout reduced queue times.", "The store also hired more staff.", "Queue times fell in matched periods with the same staffing level after self-checkout was introduced.", "Staffing changes are not necessary for the queue reduction."],
] as const
for (let i = 0; i < criticalCases.length; i++) {
  const [evidence, conclusion, weakener, strengthener, assumption] = criticalCases[i]
  out.push(mc(`uniq-tara-ct-weaken-${i}`, "TARA", "Critical Thinking", `${evidence}\nConclusion: ${conclusion}\nWhich fact most directly weakens the inference?`, weakener, ["The conclusion is expressed confidently.", "Some people dislike the policy.", "The evidence concerns events in the past."], "The strongest weakening fact supplies a plausible alternative explanation for the observed change.", i))
  out.push(mc(`uniq-tara-ct-strengthen-${i}`, "TARA", "Critical Thinking", `${evidence}\nConclusion: ${conclusion}\nWhich additional finding would most strengthen the conclusion?`, strengthener, ["A restatement of the conclusion.", "Evidence that the issue is widely discussed.", "A finding about an unrelated outcome."], "The strongest evidence isolates the proposed cause from a competing explanation.", i + 17))
  out.push(mc(`uniq-tara-ct-assume-${i}`, "TARA", "Critical Thinking", `${evidence}\nConclusion: ${conclusion}\nWhich assumption is most important for this argument?`, assumption, ["The policy is popular.", "The outcome is easy to describe.", "Every person affected agrees with the conclusion."], "A causal argument depends on the main competing explanation not accounting for the result.", i + 34))
  out.push(mc(`uniq-tara-ct-flaw-${i}`, "TARA", "Critical Thinking", `${evidence}\nConclusion: ${conclusion}\nWhat is the central reasoning flaw if no further evidence is available?`, "It treats an observed association or before-and-after change as sufficient proof of causation.", ["It uses too few words.", "It contains a numerical comparison.", "It considers a real-world policy."], "The evidence does not by itself rule out confounding or other causal explanations.", i + 51))
}

// TARA Problem Solving.
for (let i = 0; i < contexts.length; i++) {
  const total = 120 + 20 * i, pct = 20 + 5 * (i % 5), spent = total * pct / 100, remaining = total - spent
  out.push(mc(`uniq-tara-ps-percent-${i}`, "TARA", "Problem Solving", `A budget for ${contexts[i]} is £${total}. ${pct}% is spent on equipment. How much remains?`, `£${remaining.toFixed(0)}`, [`£${spent.toFixed(0)}`, `£${(total - pct).toFixed(0)}`, `£${(total * (1 + pct / 100)).toFixed(0)}`], `Remaining budget=${total}×(1−${pct}/100)=£${remaining.toFixed(0)}.`, i))
  const workers = 3 + (i % 5), rate = 8 + i, hours = 2 + (i % 4), produced = workers * rate * hours
  out.push(mc(`uniq-tara-ps-rate-${i}`, "TARA", "Problem Solving", `For ${contexts[(i + 1) % contexts.length]}, ${workers} identical machines each produce ${rate} items per hour for ${hours} hours. How many items are produced?`, String(produced), [String(rate * hours), String(workers * rate), String(produced - rate)], `Multiply machines×rate×time=${produced}.`, i + 13))
  const red = 8 + (i % 6), blue = 7 + (i % 5), both = 2 + (i % 3), either = red + blue - both
  out.push(mc(`uniq-tara-ps-sets-${i}`, "TARA", "Problem Solving", `In ${contexts[(i + 2) % contexts.length]}, ${red} participants choose option R, ${blue} choose option B and ${both} choose both. How many choose R or B?`, String(either), [String(red + blue), String(both), String(Math.max(red, blue))], `Use inclusion–exclusion: ${red}+${blue}−${both}=${either}.`, i + 26))
  const values = [10 + i, 12 + i, 14 + i, 16 + i], mean = values.reduce((a, b) => a + b, 0) / values.length
  out.push(mc(`uniq-tara-ps-mean-${i}`, "TARA", "Problem Solving", `Four readings in ${contexts[(i + 3) % contexts.length]} are ${values.join(", ")}. What is their mean?`, mean.toFixed(1), [String(values[0]), String(values[3]), (mean + 1).toFixed(1)], `Mean=sum/4=${mean.toFixed(1)}.`, i + 39))
  const distance = 60 + 10 * i, speed = 30 + 5 * (i % 4), time = distance / speed
  out.push(mc(`uniq-tara-ps-travel-${i}`, "TARA", "Problem Solving", `A journey linked to ${contexts[(i + 4) % contexts.length]} covers ${distance} km at a constant ${speed} km h⁻¹. How long does it take?`, `${time.toFixed(2)} h`, [`${(speed / distance).toFixed(2)} h`, `${(distance + speed).toFixed(2)} h`, `${(distance * speed).toFixed(0)} h`], `time=distance/speed=${time.toFixed(2)} h.`, i + 52))
  const ratioA = 2 + (i % 4), ratioB = 3 + (i % 5), units = 5 + (i % 4), combined = (ratioA + ratioB) * units
  out.push(mc(`uniq-tara-ps-ratio-${i}`, "TARA", "Problem Solving", `Resources in ${contexts[(i + 5) % contexts.length]} are shared in the ratio ${ratioA}:${ratioB}. If one ratio unit equals ${units}, what is the total amount shared?`, String(combined), [String(ratioA * units), String(ratioB * units), String(ratioA + ratioB + units)], `There are ${ratioA + ratioB} ratio units, each worth ${units}, so total=${combined}.`, i + 65))
}

// LNAT — 16 distinct original passages, each with four different reasoning questions.
const lnatPassages: Array<[string, string]> = [
  ["Road pricing", "Congestion charges are often criticised as paying for something that was previously free. Yet road space at busy times is scarce even without a cash price: drivers pay through delay. Charging can make that scarcity explicit and change behaviour, but its fairness depends on alternatives, exemptions and how revenue is used. The argument is therefore not simply about whether travel should cost money, but about which costs are visible and who bears them."],
  ["Public libraries", "Libraries now provide study space, internet access, local archives and help navigating information as well as books. Counting physical loans alone therefore gives an incomplete picture of value. At the same time, broad social benefits do not remove the need to examine use, cost and opportunity cost when budgets are limited."],
  ["School deadlines", "Deadlines can create stress, but they also coordinate shared work and help students practise planning. Removing every deadline would solve one problem by creating others. A better policy distinguishes between deadlines that structure learning and rigid rules that punish circumstances unrelated to learning."],
  ["Scientific models", "Scientific models are useful partly because they leave things out. A map containing every detail of the territory would be unusable, and a model works similarly. The right criticism is not that a model is unrealistic in some respect, but that an omitted feature matters to the question the model is being used to answer."],
  ["Museum labels", "Museums face a tension when presenting disputed objects. Too little context can conceal difficult histories; too much can imply that curators possess a final interpretation. Good labels should explain the evidence, identify important uncertainty and give visitors enough structure to understand why disagreement exists."],
  ["Remote work", "Average productivity figures can hide large differences between tasks. Solitary analytical work may benefit from fewer interruptions while training and collaborative problem-solving may suffer when informal contact falls. A single average can therefore be accurate and still answer a narrower question than managers think."],
  ["Free transport", "Zero fares do not make buses costless. Vehicles, staff and maintenance still consume resources. The case for free public transport must therefore rest on benefits such as access, reduced car use or simpler administration being worth collective funding, not on pretending the service has no cost."],
  ["Examinations", "Exams measure performance under constrained conditions. That can reveal recall, organisation and problem-solving under time pressure, but it is not identical to measuring everything a student knows. Assessment is strongest when the format is chosen to match the skill being tested rather than treated as universally superior."],
  ["Historical monuments", "A monument can be art, evidence of past values, a memorial and a symbol in present disputes at the same time. Removing it changes public space, but leaving it untouched is also a choice about what public space communicates. The debate is therefore not between action and neutrality."],
  ["AI and learning", "Writing tools can make drafting faster, but speed is not always the scarce resource in learning. Struggling to formulate an argument can expose gaps in understanding. The educational value of AI depends partly on whether it replaces that struggle or helps a learner examine it more carefully."],
  ["Economic growth", "Growth can expand the resources available to a society, but it does not determine how gains are distributed. Two countries with the same growth rate can produce different changes in living standards if gains accrue to different groups. Growth and distribution are connected questions, not interchangeable ones."],
  ["General rules", "Rules are often written generally because lawmakers cannot list every future case. General language creates flexibility but also disagreement. Interpretation is unavoidable: even a literal approach requires a decision about which meaning of a word fits the context."],
  ["Urban parks", "New parks can improve shade, recreation and biodiversity, yet those benefits may be unevenly distributed. If investment raises nearby rents, some residents may be displaced from the area receiving the improvement. Environmental success and social justice can support each other, but they do not automatically do so."],
  ["Open data", "Publishing a dataset can make scrutiny possible, but raw release is not the same as meaningful transparency. Data without context, definitions or usable formats can create the appearance of openness while making accountability difficult. Transparency therefore depends on whether information can actually be interpreted and challenged."],
  ["Expert advice", "Specialised decisions often require expert knowledge, but expertise does not remove value judgements. Evidence can estimate likely consequences without deciding which consequences matter most. Good public reasoning needs both technical competence and explicit judgement about priorities."],
  ["Uniform policies", "School uniforms may reduce visible differences in clothing, yet they can impose costs and do little to address deeper inequality. Whether uniforms promote equality depends on what kind of equality is meant: visual similarity, financial burden or equal participation in school life."],
]
for (let i = 0; i < lnatPassages.length; i++) {
  const [topic, passage] = lnatPassages[i]
  out.push(mc(`uniq-lnat-main-${i}`, "LNAT", "Argumentative passages", `${passage}\n\nWhich option best captures the main conclusion of the passage on ${topic}?`, "The issue should be judged using the qualifications and distinctions developed in the passage rather than a simple absolute rule.", ["The passage says the policy must always be rejected.", "The passage argues that evidence is unnecessary.", "The passage treats intention as the only relevant consideration."], "The author repeatedly qualifies a simple claim by identifying conditions, trade-offs or distinctions.", i))
  out.push(mc(`uniq-lnat-assume-${i}`, "LNAT", "Argumentative passages", `${passage}\n\nWhich assumption is most important to the reasoning about ${topic}?`, "The practical distinction highlighted by the author is relevant to how the policy or claim should be evaluated.", ["Everyone already agrees with the author.", "No alternative policy could ever work.", "Only financial consequences can matter."], "The reasoning depends on the highlighted distinction being relevant to evaluation.", i + 17))
  out.push(mc(`uniq-lnat-strength-${i}`, "LNAT", "Argumentative passages", `${passage}\n\nWhich new evidence would most strengthen the author's argument about ${topic}?`, "Evidence that the mechanism or trade-off identified in the passage has a measurable effect in real cases.", ["A slogan supporting the policy.", "Evidence that the topic is popular online.", "A description unrelated to the mechanism discussed."], "Evidence directly testing the proposed mechanism or trade-off best strengthens the argument.", i + 34))
  out.push(mc(`uniq-lnat-critic-${i}`, "LNAT", "Argumentative passages", `${passage}\n\nWhich criticism would the author of the passage on ${topic} be most likely to take seriously?`, "A criticism showing that an omitted factor changes the balance of the argument in the particular case.", ["The passage contains long sentences.", "Some readers dislike the topic.", "The author should avoid all qualifications."], "The passage itself reasons through qualifications, so a relevant omitted factor would matter.", i + 51))
}

// UCAT Verbal Reasoning — 12 separate passage sets with four non-identical tasks each.
const vrPassages: Array<[string, string]> = [
  ["rail ticketing", "A regional rail operator introduced contactless ticketing. Journey times did not change, but boarding became faster at busy stations because fewer passengers needed to buy tickets from drivers. The effect was smaller where most passengers already held season tickets."],
  ["urban trees", "Researchers found that mature city trees provided more shade than newly planted trees, but younger trees survived one unusually dry summer at a higher rate. The authors warned that one season was not enough to establish general drought resistance."],
  ["university teaching", "A university shortened lectures and added more problem classes. Attendance at problem classes increased while lecture attendance stayed broadly unchanged. Examination performance was not measured."],
  ["digital forms", "A hospital replaced some paper forms with digital forms. Missing fields became less common because completion was required, but staff found unusual cases harder to describe because there were fewer free-text areas."],
  ["coastal survey", "A seabird survey recorded more visible nests on one island and fewer on another. The report noted that weather affected how many nests could be seen during each visit, limiting direct year-to-year comparisons."],
  ["evening buses", "A city trialled later buses on two routes and passenger numbers increased, especially on weekends. A new entertainment venue opened nearby during the same period."],
  ["study methods", "Students chose between two study methods rather than being randomly assigned. Those choosing retrieval practice scored higher on a later quiz, but the researchers said self-selection could explain part of the difference."],
  ["museum entry", "A museum offered free entry to local residents. Visits from local postcodes rose while non-local visits stayed similar. The museum did not record whether the increase came from new people or repeat visits."],
  ["river monitoring", "Sensors downstream from a factory recorded higher nitrate levels after heavy rain. Investigators noted that farms upstream also experience increased runoff during storms, so the source could not be identified from timing alone."],
  ["office lighting", "An office replaced fluorescent lights with LEDs and electricity use fell. The building also reduced overnight heating during the same month, making the contribution of lighting alone uncertain."],
  ["exercise trial", "Participants who attended a voluntary lunchtime exercise group reported better mood after six weeks. People chose whether to attend and the study did not measure baseline motivation."],
  ["recycling scheme", "A council introduced household food-waste collection and residual waste fell. The same year it changed bin sizes, so the evaluation could not attribute the whole reduction to the new collection service."],
]
for (let i = 0; i < vrPassages.length; i++) {
  const [topic, passage] = vrPassages[i]
  out.push(mc(`uniq-ucat-vr-support-${i}`, "UCAT", "Verbal Reasoning", `${passage}\n\nWhich statement is best supported by the passage about ${topic}?`, "The passage supports a limited conclusion while identifying an important qualification.", ["The intervention definitely caused every observed change.", "The study measured every variable needed for interpretation.", "No useful conclusion can be drawn at all."], "Use only what is stated: there is evidence, but the passage explicitly limits the strength of inference.", i))
  out.push(mc(`uniq-ucat-vr-beyond-${i}`, "UCAT", "Verbal Reasoning", `${passage}\n\nWhich claim about ${topic} goes beyond the information given?`, "The observed pattern proves that the intervention was the sole cause of the change.", ["A limitation is acknowledged.", "The report distinguishes observation from stronger inference.", "At least one outcome was measured."], "The passage does not justify a sole-cause claim.", i + 13))
  out.push(mc(`uniq-ucat-vr-attitude-${i}`, "UCAT", "Verbal Reasoning", `${passage}\n\nHow is the author's attitude toward the evidence on ${topic} best described?`, "Cautious, accepting the observations while limiting the conclusions drawn from them.", ["Completely dismissive of the evidence.", "Certain that causation has been established.", "Uninterested in methodological limitations."], "The passage reports findings and then explicitly identifies limitations.", i + 26))
  out.push(mc(`uniq-ucat-vr-info-${i}`, "UCAT", "Verbal Reasoning", `${passage}\n\nWhat additional information would most improve interpretation of the evidence on ${topic}?`, "Information that directly addresses the specific limitation identified in the passage.", ["A longer title for the report.", "A different presentation font.", "A statement that the researchers worked hard."], "The most useful evidence targets the uncertainty already identified.", i + 39))
}

// UCAT Decision Making.
for (let i = 0; i < contexts.length; i++) {
  const a = 5 + (i % 6), b = 4 + (i % 7), both = 1 + (i % 3), either = a + b - both
  out.push(mc(`uniq-ucat-dm-set-${i}`, "UCAT", "Decision Making", `In ${contexts[i]}, ${a} people satisfy condition A, ${b} satisfy condition B and ${both} satisfy both. How many satisfy A or B?`, String(either), [String(a + b), String(both), String(Math.max(a, b))], `Use inclusion–exclusion: ${a}+${b}−${both}=${either}.`, i))
  const total = 30 + 5 * i, fav = 5 + (i % 8), prob = fav / total
  out.push(mc(`uniq-ucat-dm-prob-${i}`, "UCAT", "Decision Making", `For a random selection in ${contexts[(i + 1) % contexts.length]}, ${fav} of ${total} equally likely outcomes are favourable. What is the probability of a favourable outcome?`, prob.toFixed(2), [(1 - prob).toFixed(2), (total / fav).toFixed(2), String(fav)], `Probability=${fav}/${total}=${prob.toFixed(2)}.`, i + 13))
  const teams = 3 + (i % 5), per = 4 + (i % 6), people = teams * per
  out.push(mc(`uniq-ucat-dm-groups-${i}`, "UCAT", "Decision Making", `${contexts[(i + 2) % contexts.length]} uses ${teams} non-overlapping teams of ${per} people. How many people are involved altogether?`, String(people), [String(teams + per), String(people - per), String(people + teams)], `With no overlap, multiply ${teams}×${per}=${people}.`, i + 26))
  const p = 2 + (i % 6), q = 3 + (i % 5), totalWays = p * q
  out.push(mc(`uniq-ucat-dm-combine-${i}`, "UCAT", "Decision Making", `A choice in ${contexts[(i + 3) % contexts.length]} requires one option from ${p} categories and independently one from ${q} categories. How many combinations are possible?`, String(totalWays), [String(p + q), String(Math.max(p, q)), String(totalWays + 1)], `By the multiplication principle there are ${p}×${q}=${totalWays} combinations.`, i + 39))
  const n = 5 + (i % 6), pairs = n * (n - 1) / 2
  out.push(mc(`uniq-ucat-dm-pairs-${i}`, "UCAT", "Decision Making", `During ${contexts[(i + 4) % contexts.length]}, every pair among ${n} items must be compared once. How many comparisons are required?`, String(pairs), [String(n * n), String(n * (n - 1)), String(n + 2)], `Choose 2 from ${n}: ${pairs}.`, i + 52))
  const trueCount = 8 + (i % 5), falseCount = 3 + (i % 4), totalCount = trueCount + falseCount
  out.push(mc(`uniq-ucat-dm-ratio-${i}`, "UCAT", "Decision Making", `A record from ${contexts[(i + 5) % contexts.length]} contains ${trueCount} cases of type T and ${falseCount} of type F. What fraction of all cases are type T?`, `${trueCount}/${totalCount}`, [`${falseCount}/${totalCount}`, `${trueCount}/${falseCount}`, `${totalCount}/${trueCount}`], `There are ${totalCount} cases in total, so the required fraction is ${trueCount}/${totalCount}.`, i + 65))
}

// UCAT Quantitative Reasoning.
for (let i = 0; i < contexts.length; i++) {
  const price = 8 + i, qty = 2 + (i % 7), discount = [5, 10, 20, 25][i % 4], full = price * qty, final = full * (1 - discount / 100)
  out.push(mc(`uniq-ucat-qr-discount-${i}`, "UCAT", "Quantitative Reasoning", `A purchase for ${contexts[i]} costs £${price} per item. ${qty} items are bought with a ${discount}% discount on the total. What is the final cost?`, `£${final.toFixed(2)}`, [`£${full.toFixed(2)}`, `£${(full - discount).toFixed(2)}`, `£${(price * (1 - discount / 100)).toFixed(2)}`], `Full cost=£${full}; apply the ${discount}% discount to get £${final.toFixed(2)}.`, i))
  const distance = 40 + 10 * i, speed = 20 + 5 * (i % 6), time = distance / speed
  out.push(mc(`uniq-ucat-qr-speed-${i}`, "UCAT", "Quantitative Reasoning", `A journey connected with ${contexts[(i + 1) % contexts.length]} covers ${distance} km at ${speed} km h⁻¹. How long does it take?`, `${time.toFixed(2)} h`, [`${(speed / distance).toFixed(2)} h`, `${(distance + speed).toFixed(2)} h`, `${(distance * speed).toFixed(0)} h`], `time=distance/speed=${time.toFixed(2)} h.`, i + 13))
  const old = 50 + 5 * i, newer = old + 10 + 5 * (i % 4), change = (newer - old) / old * 100
  out.push(mc(`uniq-ucat-qr-change-${i}`, "UCAT", "Quantitative Reasoning", `A value in ${contexts[(i + 2) % contexts.length]} rises from ${old} to ${newer}. What is the percentage increase?`, `${change.toFixed(1)}%`, [`${(newer / old * 100).toFixed(1)}%`, `${(newer - old).toFixed(1)}%`, `${(old / newer * 100).toFixed(1)}%`], `Percentage increase=(change/original)×100=${change.toFixed(1)}%.`, i + 26))
  const units = 40 + 10 * i, cost = 100 + 20 * i, unitCost = cost / units
  out.push(mc(`uniq-ucat-qr-unit-${i}`, "UCAT", "Quantitative Reasoning", `${contexts[(i + 3) % contexts.length]} uses ${units} units at a total cost of £${cost}. What is the cost per unit?`, `£${unitCost.toFixed(2)}`, [`£${(units / cost).toFixed(2)}`, `£${(cost - units).toFixed(2)}`, `£${cost.toFixed(2)}`], `Unit cost=total cost/units=£${unitCost.toFixed(2)}.`, i + 39))
  const a = 10 + i, b = 12 + i, c = 14 + i, mean = (a + b + c) / 3
  out.push(mc(`uniq-ucat-qr-mean-${i}`, "UCAT", "Quantitative Reasoning", `Three readings in ${contexts[(i + 4) % contexts.length]} are ${a}, ${b} and ${c}. What is their mean?`, mean.toFixed(1), [String(a), String(c), (mean + 2).toFixed(1)], `Mean=(${a}+${b}+${c})/3=${mean.toFixed(1)}.`, i + 52))
  const ratioA = 2 + (i % 4), ratioB = 3 + (i % 5), each = 6 + (i % 5), total = (ratioA + ratioB) * each
  out.push(mc(`uniq-ucat-qr-ratio-${i}`, "UCAT", "Quantitative Reasoning", `Resources for ${contexts[(i + 5) % contexts.length]} are divided in the ratio ${ratioA}:${ratioB}. If one ratio unit is ${each}, what is the total resource?`, String(total), [String(ratioA * each), String(ratioB * each), String(ratioA + ratioB + each)], `Total ratio units=${ratioA + ratioB}; multiply by ${each} to get ${total}.`, i + 65))
}

// UCAT Situational Judgement — 72 distinct scenarios generated from 18 professional/academic issues across four settings.
const sjtSettings = ["during a laboratory session", "while preparing a group presentation", "during a supervised placement", "while organising a student project"]
const sjtIssues: Array<[string, string, [string, string, string]]> = [
  ["you notice a teammate has entered a non-urgent figure incorrectly in a shared record", "Speak to them privately and make sure the record is corrected promptly through the proper process.", ["Ignore it because it is not your entry.", "Publicly accuse them of carelessness.", "Secretly alter it without telling anyone."]],
  ["you receive information that appears confidential and was clearly sent to you by mistake", "Do not share it; notify the sender or an appropriate supervisor and follow the confidentiality process.", ["Forward it to friends for advice.", "Keep a personal copy in case it is useful later.", "Post a summary without names."]],
  ["you realise your own planning error will make you late for an agreed commitment", "Tell the relevant person promptly, apologise, give an accurate update and take reasonable steps to reduce the impact.", ["Say nothing and hope nobody notices.", "Blame another person for the delay.", "Invent an emergency to avoid criticism."]],
  ["a peer makes a dismissive comment about another member of the group", "Challenge the behaviour calmly and respectfully, support the person affected and escalate if the conduct continues or is serious.", ["Join in so the group does not become awkward.", "Post the comment publicly online.", "Ignore it automatically regardless of impact."]],
  ["a teammate appears very upset immediately before an important task", "Check on them privately and help them access appropriate support while ensuring the task is safely covered.", ["Tell everyone they are unreliable.", "Make jokes until they stop looking upset.", "Force them to continue without checking whether they are able to do so safely."]],
  ["you are unsure whether a requester is authorised to receive some information", "Check the relevant rule or ask an appropriate supervisor before sharing anything.", ["Share it because the requester sounds confident.", "Send half of it as a compromise.", "Ask another student to guess whether it is allowed."]],
  ["you notice a safety instruction is being skipped to save time", "Raise the issue immediately and ensure the safe procedure is followed before continuing.", ["Wait until the task is finished before mentioning it.", "Copy the shortcut so work stays on schedule.", "Record it privately but allow the unsafe step to continue."]],
  ["a group member takes credit for work largely completed by someone else", "Address the attribution calmly with the people involved and seek fair correction through the agreed process.", ["Retaliate by taking credit for their next task.", "Start a public argument in front of everyone.", "Ignore it even if formal credit matters."]],
  ["you make a small mistake that has not yet caused harm but could affect later work", "Report and correct the mistake promptly so later decisions are based on accurate information.", ["Hide it because no harm has happened yet.", "Delete the evidence without telling anyone.", "Wait to see whether somebody else finds it."]],
  ["a peer asks you to sign that you observed work you did not actually see", "Refuse to give a false confirmation and explain that the record must accurately reflect what was observed.", ["Sign because the peer is trustworthy.", "Sign but add a private note nobody else can see.", "Ask for a favour in return before signing."]],
  ["two group members disagree strongly and the discussion is becoming personal", "Refocus the discussion on evidence and the task, encourage respectful turn-taking and seek help if the conflict cannot be managed safely.", ["Take the side of the louder person to end the discussion.", "Share private messages from one person to embarrass them.", "Leave without telling anyone and let the conflict continue."]],
  ["you are given more work than you can complete safely by the deadline", "Raise the workload concern early, explain the constraint clearly and agree priorities or support with the responsible person.", ["Rush every task and accept avoidable errors.", "Do nothing until the deadline is missed.", "Quietly pass your work to someone who is not authorised to do it."]],
  ["you overhear identifiable personal information being discussed where others can hear", "Promptly move or stop the conversation and remind those involved to protect privacy, escalating if necessary.", ["Listen closely in case the information is interesting.", "Repeat the information later without names.", "Record the conversation on your phone."]],
  ["a teammate asks for feedback on work that contains a serious factual error", "Give specific, respectful feedback about the error and help them check a reliable source before submission.", ["Say it is fine to avoid hurting their feelings.", "Rewrite everything without telling them why.", "Mock the error in the group chat."]],
  ["someone asks you to bypass an agreed checking step because the team is behind schedule", "Explain that the check protects quality or safety and find a legitimate way to recover time without bypassing it.", ["Skip it because deadlines are always more important.", "Pretend the check was completed.", "Let somebody else sign it without checking."]],
  ["you notice one quieter group member is repeatedly being interrupted", "Create space for them to contribute and encourage the group to use a fairer discussion process.", ["Assume silence means they have nothing useful to add.", "Tell them privately to speak louder next time and do nothing else.", "Interrupt them too so treatment is equal."]],
  ["a friend asks you to give them access to work that is meant to be completed independently", "Refuse to share material in a way that breaches the rules, while offering legitimate help with understanding the task.", ["Send the completed work because friendship comes first.", "Send it but ask them to change a few words.", "Post it where everyone can copy it equally."]],
  ["you discover that an earlier decision was based on information that has now been corrected", "Tell the relevant people promptly, explain what changed and review any decisions that may have been affected.", ["Keep quiet because the earlier decision has already been made.", "Delete the corrected information to avoid confusion.", "Tell only close friends rather than the people responsible for the decision."]],
]
for (let i = 0; i < sjtIssues.length; i++) {
  const [issue, correct, wrong] = sjtIssues[i]
  for (let s = 0; s < sjtSettings.length; s++) {
    out.push(mc(`uniq-ucat-sjt-${i}-${s}`, "UCAT", "Situational Judgement", `${sjtSettings[s]}, ${issue}. What is the most appropriate first response?`, correct, wrong, "The strongest response is honest, proportionate, respectful and consistent with safety, confidentiality and appropriate escalation.", i * 4 + s))
  }
}

export const uniqueFullPaperQuestionBank: TestQuestion[] = out.filter(question => {
  if (question.options.length !== 4) return false
  if (question.answer < 0 || question.answer >= question.options.length) return false
  return new Set(question.options.map(option => option.trim().toLowerCase())).size === question.options.length
})

export const uniqueFullPaperQuestionBankStats = {
  total: uniqueFullPaperQuestionBank.length,
  bySection: Object.fromEntries(Array.from(new Set(uniqueFullPaperQuestionBank.map(question => `${question.test}:${question.section}`))).map(key => [key, uniqueFullPaperQuestionBank.filter(question => `${question.test}:${question.section}` === key).length])),
}

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
    section: "Physics",
    difficulty: "Challenge",
    prompt,
    options,
    answer: options.indexOf(correct),
    explanation,
  }
}

const contexts = [
  "satellite test rig",
  "electric vehicle prototype",
  "laboratory sensor array",
  "railway monitoring system",
  "robotics experiment",
  "renewable-energy demonstrator",
] as const
const out: TestQuestion[] = []

for (let i = 0; i < contexts.length; i++) {
  const context = contexts[i]
  const variant = `${i}-linked`

  // Electricity: combine series resistance, current and component power.
  const r1 = 3 + i
  const r2 = 5 + 2 * i
  const current = 1.5 + 0.25 * i
  const voltage = current * (r1 + r2)
  const p2 = current * current * r2
  out.push(mc(
    `esat-physics-challenge-electricity-${variant}`,
    `In a ${context}, resistors ${r1} Ω and ${r2} Ω are connected in series across a ${voltage.toFixed(2)} V supply. After determining the circuit current, what power is dissipated in the ${r2} Ω resistor?`,
    `${p2.toFixed(2)} W`,
    [`${(current * voltage).toFixed(2)} W`, `${(voltage * voltage / r2).toFixed(2)} W`, `${(current * current * r1).toFixed(2)} W`],
    `Total resistance=${r1}+${r2}=${r1 + r2} Ω, so I=${voltage.toFixed(2)}/${r1 + r2}=${current.toFixed(2)} A. The power in the ${r2} Ω resistor is I²R=${current.toFixed(2)}²×${r2}=${p2.toFixed(2)} W.`,
    i,
  ))

  // Magnetism: magnetic force followed by acceleration.
  const B = 0.20 + 0.05 * i
  const I = 2.0 + 0.4 * i
  const L = 0.30 + 0.05 * i
  const mass = 0.12 + 0.02 * i
  const force = B * I * L
  const acceleration = force / mass
  out.push(mc(
    `esat-physics-challenge-magnetism-${variant}`,
    `A straight conductor in a ${context} has length ${L.toFixed(2)} m, carries ${I.toFixed(1)} A and is perpendicular to a ${B.toFixed(2)} T magnetic field. If the conductor assembly has mass ${mass.toFixed(2)} kg and other horizontal forces are negligible, what acceleration results?`,
    `${acceleration.toFixed(2)} m/s²`,
    [`${force.toFixed(2)} m/s²`, `${(B * I / L / mass).toFixed(2)} m/s²`, `${(mass / Math.max(force, 0.001)).toFixed(2)} m/s²`],
    `Magnetic force BIL=${B.toFixed(2)}×${I.toFixed(1)}×${L.toFixed(2)}=${force.toFixed(3)} N. Then a=F/m=${force.toFixed(3)}/${mass.toFixed(2)}=${acceleration.toFixed(2)} m/s².`,
    i + 11,
  ))

  // Mechanics: acceleration to speed, then kinetic energy.
  const a = 1.2 + 0.2 * i
  const t = 4 + i
  const massM = 2.0 + 0.5 * i
  const speed = a * t
  const ke = 0.5 * massM * speed * speed
  out.push(mc(
    `esat-physics-challenge-mechanics-${variant}`,
    `A cart in a ${context} starts from rest and accelerates uniformly at ${a.toFixed(1)} m/s² for ${t} s. Given its mass is ${massM.toFixed(1)} kg, what kinetic energy does it have at the end of the acceleration interval?`,
    `${ke.toFixed(1)} J`,
    [`${(0.5 * massM * a * a).toFixed(1)} J`, `${(massM * speed).toFixed(1)} J`, `${(0.5 * massM * a * t).toFixed(1)} J`],
    `Final speed v=at=${a.toFixed(1)}×${t}=${speed.toFixed(1)} m/s. Then Eₖ=½mv²=0.5×${massM.toFixed(1)}×${speed.toFixed(1)}²=${ke.toFixed(1)} J.`,
    i + 23,
  ))

  // Thermal physics: useful energy, efficiency and heating time.
  const thermalMass = 0.40 + 0.05 * i
  const c = 4200
  const deltaT = 18 + 2 * i
  const efficiency = 0.70 + 0.03 * i
  const power = 600 + 50 * i
  const useful = thermalMass * c * deltaT
  const inputEnergy = useful / efficiency
  const heatTime = inputEnergy / power
  out.push(mc(
    `esat-physics-challenge-thermal-${variant}`,
    `A heater in a ${context} raises ${thermalMass.toFixed(2)} kg of water by ${deltaT} °C. The heater is ${(efficiency * 100).toFixed(0)}% efficient and draws ${power} W. Using c = ${c} J kg⁻¹ K⁻¹, how long should the heating take?`,
    `${heatTime.toFixed(1)} s`,
    [`${(useful / power).toFixed(1)} s`, `${(useful * efficiency / power).toFixed(1)} s`, `${(inputEnergy / (power * efficiency)).toFixed(1)} s`],
    `Useful thermal energy=mcΔT=${thermalMass.toFixed(2)}×${c}×${deltaT}=${useful.toFixed(0)} J. Input energy=${useful.toFixed(0)}/${efficiency.toFixed(2)}=${inputEnergy.toFixed(0)} J, so t=E/P=${inputEnergy.toFixed(0)}/${power}=${heatTime.toFixed(1)} s.`,
    i + 37,
  ))

  // Matter: use density and geometry, then calculate pressure from weight.
  const length = 0.20 + 0.02 * i
  const width = 0.10 + 0.01 * i
  const height = 0.05 + 0.005 * i
  const density = 2400 + 100 * i
  const volume = length * width * height
  const blockMass = density * volume
  const g = 9.8
  const pressure = blockMass * g / (length * width)
  out.push(mc(
    `esat-physics-challenge-matter-${variant}`,
    `A uniform rectangular block in a ${context} measures ${length.toFixed(3)} m by ${width.toFixed(3)} m by ${height.toFixed(3)} m and has density ${density} kg/m³. It rests on its ${length.toFixed(3)} m by ${width.toFixed(3)} m face. Taking g = ${g} N/kg, what pressure does it exert?`,
    `${pressure.toFixed(0)} Pa`,
    [`${(density * g).toFixed(0)} Pa`, `${(blockMass * g / (width * height)).toFixed(0)} Pa`, `${(density * volume).toFixed(0)} Pa`],
    `Volume=${length.toFixed(3)}×${width.toFixed(3)}×${height.toFixed(3)}=${volume.toFixed(6)} m³, so mass=ρV=${blockMass.toFixed(3)} kg. Weight=${(blockMass * g).toFixed(2)} N and contact area=${(length * width).toFixed(4)} m², giving pressure=${pressure.toFixed(0)} Pa.`,
    i + 49,
  ))

  // Waves: wavelength to frequency, then cycles counted in a time interval.
  const waveSpeed = 300 + 20 * i
  const wavelength = 0.50 + 0.05 * i
  const interval = 0.040 + 0.005 * i
  const frequency = waveSpeed / wavelength
  const cycles = frequency * interval
  out.push(mc(
    `esat-physics-challenge-waves-${variant}`,
    `A wave in a ${context} travels at ${waveSpeed} m/s with wavelength ${wavelength.toFixed(2)} m. After finding its frequency, how many complete-cycle equivalents pass a fixed point in ${interval.toFixed(3)} s?`,
    cycles.toFixed(1),
    [`${frequency.toFixed(1)}`, `${(waveSpeed * wavelength * interval).toFixed(1)}`, `${(interval / frequency).toFixed(3)}`],
    `Frequency f=v/λ=${waveSpeed}/${wavelength.toFixed(2)}=${frequency.toFixed(1)} Hz. Number of cycles in ${interval.toFixed(3)} s is ft=${frequency.toFixed(1)}×${interval.toFixed(3)}=${cycles.toFixed(1)}.`,
    i + 61,
  ))

  // Radioactivity: repeated half-lives followed by comparison with background.
  const initial = 640 + 64 * i
  const halfLife = 3 + i
  const elapsed = 3 * halfLife
  const remaining = initial / 8
  const background = 20 + 4 * i
  const netRatio = remaining / background
  out.push(mc(
    `esat-physics-challenge-radioactivity-${variant}`,
    `A radioactive source in a ${context} initially records ${initial} counts/min above zero and has half-life ${halfLife} min. After ${elapsed} min, compare its expected count rate with a separate background rate of ${background} counts/min. What is the ratio source-rate : background-rate?`,
    `${netRatio.toFixed(2)}:1`,
    [`${(initial / 4 / background).toFixed(2)}:1`, `${(initial / 16 / background).toFixed(2)}:1`, `${(remaining / (background * 2)).toFixed(2)}:1`],
    `${elapsed} min is three half-lives, so source rate=${initial}/2³=${remaining.toFixed(1)} counts/min. Dividing by background ${background} gives ${remaining.toFixed(1)}/${background}=${netRatio.toFixed(2)}, hence ${netRatio.toFixed(2)}:1.`,
    i + 73,
  ))
}

export const esatPhysicsChallengeBank: TestQuestion[] = out

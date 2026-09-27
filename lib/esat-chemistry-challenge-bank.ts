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
    section: "Chemistry",
    difficulty: "Challenge",
    prompt,
    options,
    answer: options.indexOf(correct),
    explanation,
  }
}

const contexts = [
  "battery-material trial",
  "water-treatment study",
  "atmospheric-monitoring experiment",
  "pharmaceutical synthesis",
  "industrial catalyst test",
  "food-analysis laboratory",
] as const

const out: TestQuestion[] = []

for (let i = 0; i < contexts.length; i++) {
  const context = contexts[i]
  const variant = `${i}-linked`

  // Atomic structure and periodicity: enrichment changes isotope abundance, so
  // the student must rebuild the weighted relative atomic mass.
  const light = 24 + i
  const heavy = light + 2
  const initialHeavyPct = 25 + 5 * i
  const enrichment = 8 + i
  const newHeavyPct = initialHeavyPct + enrichment
  const newRam = light * (1 - newHeavyPct / 100) + heavy * (newHeavyPct / 100)
  const initialRam = light * (1 - initialHeavyPct / 100) + heavy * (initialHeavyPct / 100)
  out.push(mc(
    `esat-chem-challenge-atomic-${variant}`,
    `In a ${context}, element X has two isotopes with mass numbers ${light} and ${heavy}. Initially ${initialHeavyPct}% of the atoms are the heavier isotope. A separation step increases the heavier-isotope abundance by ${enrichment} percentage points. What relative atomic mass should be used for the enriched sample?`,
    newRam.toFixed(2),
    [initialRam.toFixed(2), (light * (newHeavyPct / 100) + heavy * (1 - newHeavyPct / 100)).toFixed(2), (newRam + 0.20).toFixed(2)],
    `After enrichment the heavier isotope abundance is ${newHeavyPct}% and the lighter abundance is ${100 - newHeavyPct}%. The weighted mean is ${light}×${((100 - newHeavyPct) / 100).toFixed(2)} + ${heavy}×${(newHeavyPct / 100).toFixed(2)} = ${newRam.toFixed(2)}.`,
    i,
  ))

  // Reactions and equilibrium: use equilibrium extent to infer the amount left,
  // then compare it with the original limiting-reactant amount.
  const initialA = 1.00 + 0.10 * i
  const initialB = 0.80 + 0.08 * i
  const formedC = 0.20 + 0.04 * i
  const remainingB = initialB - formedC
  const percentRemaining = remainingB / initialB * 100
  out.push(mc(
    `esat-chem-challenge-equilibrium-${variant}`,
    `A reversible reaction A + B ⇌ C is studied during a ${context}. The mixture starts with ${initialA.toFixed(2)} mol A, ${initialB.toFixed(2)} mol B and no C. At equilibrium ${formedC.toFixed(2)} mol C is present. Assuming the reaction stoichiometry shown, what percentage of the original B remains at equilibrium?`,
    `${percentRemaining.toFixed(1)}%`,
    [`${(formedC / initialB * 100).toFixed(1)}%`, `${((initialA - formedC) / initialA * 100).toFixed(1)}%`, `${(remainingB / initialA * 100).toFixed(1)}%`],
    `Forming ${formedC.toFixed(2)} mol C consumes the same amount of B, so B remaining=${initialB.toFixed(2)}−${formedC.toFixed(2)}=${remainingB.toFixed(2)} mol. Relative to the original ${initialB.toFixed(2)} mol, the percentage remaining is ${remainingB.toFixed(2)}/${initialB.toFixed(2)}×100=${percentRemaining.toFixed(1)}%.`,
    i + 11,
  ))

  // Quantitative chemistry: mass -> moles -> stoichiometric product -> solution concentration.
  const molarMass = 50 + 5 * i
  const sampleMass = 10 + 2 * i
  const sampleMoles = sampleMass / molarMass
  const productRatio = i % 2 === 0 ? 2 : 1.5
  const productMoles = sampleMoles * productRatio
  const solutionVolumeDm3 = 0.25 + 0.05 * (i % 3)
  const concentration = productMoles / solutionVolumeDm3
  out.push(mc(
    `esat-chem-challenge-quantitative-${variant}`,
    `In a ${context}, ${sampleMass.toFixed(1)} g of reactant R (molar mass ${molarMass} g mol⁻¹) reacts completely. The balanced equation shows that 1 mol R forms ${productRatio.toFixed(1)} mol product P. All P is then dissolved to make ${solutionVolumeDm3.toFixed(2)} dm³ of solution. What is the concentration of P?`,
    `${concentration.toFixed(3)} mol dm⁻³`,
    [`${(sampleMoles / solutionVolumeDm3).toFixed(3)} mol dm⁻³`, `${(productMoles * solutionVolumeDm3).toFixed(3)} mol dm⁻³`, `${(sampleMass / solutionVolumeDm3).toFixed(3)} mol dm⁻³`],
    `Moles R=${sampleMass.toFixed(1)}/${molarMass}=${sampleMoles.toFixed(3)} mol. Moles P=${sampleMoles.toFixed(3)}×${productRatio.toFixed(1)}=${productMoles.toFixed(3)} mol. Concentration=${productMoles.toFixed(3)}/${solutionVolumeDm3.toFixed(2)}=${concentration.toFixed(3)} mol dm⁻³.`,
    i + 23,
  ))

  // Bonding and structure: derive ionic formula from charge balance, then formula mass.
  const metalAr = 24 + 3 * i
  const metalCharge = i % 2 === 0 ? 2 : 3
  const nonMetalAr = 16
  const metalCount = metalCharge === 2 ? 1 : 2
  const nonMetalCount = metalCharge === 2 ? 1 : 3
  const formulaMass = metalCount * metalAr + nonMetalCount * nonMetalAr
  out.push(mc(
    `esat-chem-challenge-bonding-${variant}`,
    `A material from a ${context} contains metal ions M${metalCharge}+ and oxide ions O2−. The relative atomic mass of M is ${metalAr}. After first balancing the ionic charges to obtain the empirical formula, what is the relative formula mass of the oxide?`,
    formulaMass.toFixed(0),
    [`${(metalAr + 2 * nonMetalAr).toFixed(0)}`, `${(2 * metalAr + nonMetalAr).toFixed(0)}`, `${(metalCharge * metalAr + 2 * nonMetalAr).toFixed(0)}`],
    metalCharge === 2
      ? `M2+ and O2− combine 1:1, so the formula is MO. Its relative formula mass is ${metalAr}+${nonMetalAr}=${formulaMass}.`
      : `Two M3+ ions give +6 and three O2− ions give −6, so the formula is M₂O₃. Its relative formula mass is 2×${metalAr}+3×${nonMetalAr}=${formulaMass}.`,
    i + 37,
  ))

  // Reactivity and acids: titration stoichiometry followed by concentration.
  const alkaliConcentration = 0.120 + 0.010 * i
  const alkaliVolumeCm3 = 24 + i
  const acidVolumeCm3 = 20 + (i % 3) * 5
  const alkaliMoles = alkaliConcentration * alkaliVolumeCm3 / 1000
  const acidMoles = alkaliMoles / 2
  const acidConcentration = acidMoles / (acidVolumeCm3 / 1000)
  out.push(mc(
    `esat-chem-challenge-acids-${variant}`,
    `During a ${context}, sulfuric acid is titrated with sodium hydroxide using H₂SO₄ + 2NaOH → Na₂SO₄ + 2H₂O. Exactly ${alkaliVolumeCm3} cm³ of ${alkaliConcentration.toFixed(3)} mol dm⁻³ NaOH neutralises ${acidVolumeCm3} cm³ of the acid. What is the acid concentration?`,
    `${acidConcentration.toFixed(3)} mol dm⁻³`,
    [`${(alkaliMoles / (acidVolumeCm3 / 1000)).toFixed(3)} mol dm⁻³`, `${(acidMoles / (alkaliVolumeCm3 / 1000)).toFixed(3)} mol dm⁻³`, `${(alkaliConcentration * acidVolumeCm3 / alkaliVolumeCm3).toFixed(3)} mol dm⁻³`],
    `Moles NaOH=${alkaliConcentration.toFixed(3)}×${(alkaliVolumeCm3 / 1000).toFixed(3)}=${alkaliMoles.toFixed(5)} mol. The 2:1 ratio gives H₂SO₄ moles=${acidMoles.toFixed(5)}. Dividing by ${acidVolumeCm3 / 1000} dm³ gives ${acidConcentration.toFixed(3)} mol dm⁻³.`,
    i + 49,
  ))

  // Energetics and rates: bond-energy enthalpy followed by energy for a stated amount.
  const broken = 420 + 10 * i
  const broken2 = 240 + 5 * i
  const formed = 610 + 8 * i
  const deltaH = broken + broken2 - formed
  const amount = 1.5 + 0.25 * i
  const totalEnergy = deltaH * amount
  out.push(mc(
    `esat-chem-challenge-energetics-${variant}`,
    `A simplified bond-energy model for a reaction in a ${context} requires ${broken} kJ mol⁻¹ and ${broken2} kJ mol⁻¹ to break the relevant bonds, while forming the product bonds releases ${formed} kJ mol⁻¹. Using ΔH = energy in − energy out, what energy change is predicted for ${amount.toFixed(2)} mol of reaction?`,
    `${totalEnergy.toFixed(1)} kJ`,
    [`${deltaH.toFixed(1)} kJ`, `${((broken + broken2 + formed) * amount).toFixed(1)} kJ`, `${((formed - broken - broken2) * amount).toFixed(1)} kJ`],
    `For one mole, ΔH=${broken}+${broken2}−${formed}=${deltaH} kJ mol⁻¹. For ${amount.toFixed(2)} mol, energy change=${deltaH}×${amount.toFixed(2)}=${totalEnergy.toFixed(1)} kJ.`,
    i + 61,
  ))

  // Electrochemistry and organic chemistry: alternate electrochemical and organic
  // multi-step tasks so the combined syllabus domain is not represented by one skill only.
  if (i % 2 === 0) {
    const cathode = 0.60 + 0.05 * i
    const anode = -0.30 - 0.04 * i
    const cell = cathode - anode
    const charge = 1800 + 200 * i
    const work = cell * charge
    out.push(mc(
      `esat-chem-challenge-electroorganic-${variant}`,
      `An electrochemical cell used in a ${context} has reduction potentials ${cathode.toFixed(2)} V for the cathode half-cell and ${anode.toFixed(2)} V for the anode half-cell. After calculating Ecell = Ecathode − Eanode, what electrical work magnitude corresponds to transferring ${charge} C of charge?`,
      `${work.toFixed(0)} J`,
      [`${(Math.abs(cathode + anode) * charge).toFixed(0)} J`, `${cell.toFixed(2)} J`, `${(cell * charge / 1000).toFixed(2)} J`],
      `Ecell=${cathode.toFixed(2)}−(${anode.toFixed(2)})=${cell.toFixed(2)} V. Electrical work magnitude W=QV=${charge}×${cell.toFixed(2)}=${work.toFixed(0)} J.`,
      i + 73,
    ))
  } else {
    const organicMr = 74 + 4 * i
    const feedMass = 18 + 2 * i
    const theoreticalMoles = feedMass / organicMr
    const yieldPct = 68 + 3 * i
    const actualMoles = theoreticalMoles * yieldPct / 100
    const actualMass = actualMoles * organicMr
    out.push(mc(
      `esat-chem-challenge-electroorganic-${variant}`,
      `An organic synthesis in a ${context} uses ${feedMass.toFixed(1)} g of a reagent with molar mass ${organicMr} g mol⁻¹. The stoichiometry is 1:1 to the product, which has the same molar mass for this model, and the isolated yield is ${yieldPct}%. What mass of product is obtained?`,
      `${actualMass.toFixed(2)} g`,
      [`${(theoreticalMoles * organicMr).toFixed(2)} g`, `${(theoreticalMoles * yieldPct / 100).toFixed(3)} g`, `${(feedMass / (yieldPct / 100)).toFixed(2)} g`],
      `Theoretical moles=${feedMass.toFixed(1)}/${organicMr}=${theoreticalMoles.toFixed(3)} mol. At ${yieldPct}% yield, actual moles=${actualMoles.toFixed(3)} mol, giving mass=${actualMoles.toFixed(3)}×${organicMr}=${actualMass.toFixed(2)} g.`,
      i + 73,
    ))
  }

  // Analysis, air and water: calibration equation followed by dilution correction.
  const slope = 0.40 + 0.05 * i
  const interceptA = 0.08 + 0.01 * i
  const dilutedConcentration = 1.20 + 0.20 * i
  const absorbance = slope * dilutedConcentration + interceptA
  const dilutionFactor = 5 + i
  const originalConcentration = dilutedConcentration * dilutionFactor
  out.push(mc(
    `esat-chem-challenge-analysis-${variant}`,
    `A sample from a ${context} is diluted by a factor of ${dilutionFactor} before analysis. The calibration relation is absorbance A = ${slope.toFixed(2)}c + ${interceptA.toFixed(2)}, where c is concentration in mg dm⁻³. The diluted sample gives A = ${absorbance.toFixed(3)}. What was the concentration in the original sample?`,
    `${originalConcentration.toFixed(2)} mg dm⁻³`,
    [`${dilutedConcentration.toFixed(2)} mg dm⁻³`, `${((absorbance - interceptA) / slope / dilutionFactor).toFixed(2)} mg dm⁻³`, `${(absorbance / slope * dilutionFactor).toFixed(2)} mg dm⁻³`],
    `For the diluted sample, c=(A−${interceptA.toFixed(2)})/${slope.toFixed(2)}=(${absorbance.toFixed(3)}−${interceptA.toFixed(2)})/${slope.toFixed(2)}=${dilutedConcentration.toFixed(2)} mg dm⁻³. Undoing the dilution gives ${dilutedConcentration.toFixed(2)}×${dilutionFactor}=${originalConcentration.toFixed(2)} mg dm⁻³.`,
    i + 89,
  ))
}

export const esatChemistryChallengeBank: TestQuestion[] = out

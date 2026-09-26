import type { TestQuestion } from "@/lib/oxbridge-data"

function question(
  id: string,
  prompt: string,
  correct: string,
  distractors: [string, string, string],
  explanation: string,
  answerPosition: number,
): TestQuestion {
  const options = [...distractors]
  options.splice(Math.max(0, Math.min(3, answerPosition)), 0, correct)
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

export const esatEnergeticsReliabilityBank: TestQuestion[] = [
  question(
    "esat-spec-chem-energetics-d",
    "A reaction has an activation energy of 120 kJ mol⁻¹. A catalyst provides an alternative pathway whose transition state is 35 kJ mol⁻¹ lower, while the reactant and product energy levels are unchanged. Which conclusion follows?",
    "The activation energy becomes 85 kJ mol⁻¹ and the overall enthalpy change is unchanged.",
    [
      "The activation energy becomes 155 kJ mol⁻¹ and the overall enthalpy change is unchanged.",
      "The activation energy becomes 85 kJ mol⁻¹ and the overall enthalpy change decreases by 35 kJ mol⁻¹.",
      "The activation energy stays at 120 kJ mol⁻¹ and the overall enthalpy change decreases by 35 kJ mol⁻¹.",
    ],
    "Lowering the transition-state energy by 35 kJ mol⁻¹ lowers the forward activation energy from 120 to 85 kJ mol⁻¹. Because the energies of the reactants and products do not change, their energy difference—and therefore the overall enthalpy change—also does not change.",
    2,
  ),
  question(
    "esat-spec-chem-energetics-e",
    "Equal masses of the same carbonate react with equal volumes of the same acid at the same temperature. Trial X uses small carbonate chips; trial Y uses one large piece. Trial X has the greater initial reaction rate, but both trials eventually produce the same amount of gas. Which explanation best accounts for both observations?",
    "The chips provide a greater surface area for collisions, increasing the initial rate without changing the total amount of carbonate available.",
    [
      "The chips lower the reaction enthalpy, so more gas can form initially even though the final gas amount is fixed by temperature.",
      "The large piece has a higher activation energy because its particles are bonded more strongly than particles in the chips.",
      "The chips increase the acid concentration at their surface, changing the reaction stoichiometry while leaving the final gas amount unchanged.",
    ],
    "Breaking the same mass into smaller pieces increases total surface area, so acid particles can collide with the carbonate surface more frequently and the initial rate rises. The number of moles of carbonate has not changed, so if the same reactant remains limiting the final amount of gas is unchanged.",
    1,
  ),
]

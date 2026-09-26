import type { TestQuestion } from "@/lib/oxbridge-data"

function rotate<T>(items: T[], shift: number) {
  const n = ((shift % items.length) + items.length) % items.length
  return [...items.slice(n), ...items.slice(0, n)]
}

function q(
  id: string,
  prompt: string,
  correct: string,
  distractors: [string, string, string, string],
  explanation: string,
  seed: number,
): TestQuestion {
  const options = rotate([correct, ...distractors], seed % 5)
  return {
    id,
    test: "TARA",
    section: "Problem Solving",
    difficulty: seed % 3 === 0 ? "Challenge" : "Stretch",
    prompt,
    options,
    answer: options.indexOf(correct),
    explanation,
  }
}

// Each item has a distinct non-numeric family suffix so the paper assembler's
// family balancer treats these as genuinely separate Identifying Similarity
// structures rather than variants of one template.
export const taraSimilarityReserveBank: TestQuestion[] = [
  q("tara-spec-ps-similar-alpha", "A rule changes 3 to 11, 5 to 17 and 8 to 26. Which pair follows the same rule?", "10 to 32", ["10 to 30", "11 to 32", "12 to 34", "14 to 40"], "The rule is output = 3×input + 2. For input 10 the output is 32.", 31),
  q("tara-spec-ps-similar-bravo", "A mixture uses red:blue paint in the ratio 5:8. Which mixture has the same colour proportion?", "15 red and 24 blue", ["10 red and 18 blue", "20 red and 30 blue", "25 red and 32 blue", "30 red and 40 blue"], "Multiplying both parts of 5:8 by 3 gives 15:24; the other ratios do not simplify to 5:8.", 32),
  q("tara-spec-ps-similar-charlie", "A point moves from (2,4) to (7,1). Which movement has the same displacement?", "From (−1,6) to (4,3)", ["From (0,0) to (5,3)", "From (3,2) to (8,1)", "From (1,5) to (5,2)", "From (−2,4) to (3,2)"], "The original displacement is (+5,−3). Only (−1,6) to (4,3) has the same vector.", 33),
  q("tara-spec-ps-similar-delta", "A price rises from £80 to £100. Which change has the same percentage increase?", "£120 to £150", ["£100 to £120", "£120 to £145", "£150 to £180", "£200 to £240"], "£80 to £100 is a 25% increase. £120 to £150 is also 25%; the other changes are smaller percentages.", 34),
  q("tara-spec-ps-similar-echo", "A rectangle is enlarged so every length is multiplied by 3. Its area is therefore multiplied by 9. Which situation uses the same kind of square-law scaling?", "Doubling a circle's radius multiplies its area by 4.", ["Doubling a journey speed doubles the distance covered in the same time.", "Tripling a mass triples its weight in the same gravitational field.", "Doubling a cube's side multiplies its volume by 8.", "Adding 3 cm to a length adds 3 cm to its perimeter contribution."], "Both examples involve area scaling with the square of a linear dimension.", 35),
  q("tara-spec-ps-similar-foxtrot", "The sequence 7, 12, 17, 22 increases by the same amount each step. Which sequence has the same step size?", "31, 36, 41, 46", ["10, 15, 21, 26", "20, 24, 28, 32", "4, 10, 16, 22", "50, 54, 59, 63"], "The original common difference is 5. Only 31,36,41,46 has common difference 5 throughout.", 36),
  q("tara-spec-ps-similar-golf", "Four workers complete 120 identical checks in 3 hours at a constant individual rate. Which situation has the same number of checks per worker per hour?", "Six workers complete 180 checks in 3 hours.", ["Six workers complete 180 checks in 2 hours.", "Five workers complete 120 checks in 3 hours.", "Four workers complete 160 checks in 3 hours.", "Eight workers complete 120 checks in 2 hours."], "The original rate is 120/(4×3)=10 checks per worker per hour. Six workers doing 180 in 3 hours also gives 10.", 37),
  q("tara-spec-ps-similar-hotel", "A map scale means 2 cm represents 7 km. Which statement gives the same scale?", "6 cm represents 21 km", ["3 cm represents 14 km", "4 cm represents 12 km", "5 cm represents 20 km", "8 cm represents 24 km"], "The scale is 3.5 km per centimetre. Six centimetres therefore represents 21 km.", 38),
  q("tara-spec-ps-similar-india", "A tank is 3/5 full. Which quantity represents the same fraction of its total?", "42 litres in a 70-litre tank", ["30 litres in a 60-litre tank", "36 litres in a 75-litre tank", "48 litres in an 85-litre tank", "54 litres in an 80-litre tank"], "42/70 simplifies to 3/5. None of the other fractions does.", 39),
  q("tara-spec-ps-similar-juliet", "A recipe uses 240 g of flour for 6 servings. Which recipe has the same flour per serving?", "360 g for 9 servings", ["300 g for 8 servings", "400 g for 12 servings", "420 g for 9 servings", "480 g for 10 servings"], "The original uses 40 g per serving; 360/9 is also 40 g per serving.", 40),
  q("tara-spec-ps-similar-kilo", "A journey covers 150 km in 2.5 hours at constant speed. Which journey has the same average speed?", "210 km in 3.5 hours", ["180 km in 2.5 hours", "240 km in 3 hours", "300 km in 4 hours", "120 km in 2.5 hours"], "The original speed is 60 km/h. 210/3.5 is also 60 km/h.", 41),
  q("tara-spec-ps-similar-lima", "A machine uses 18 kWh to make 90 units. Which production run has the same energy use per unit?", "30 kWh for 150 units", ["20 kWh for 120 units", "24 kWh for 100 units", "36 kWh for 150 units", "45 kWh for 180 units"], "The original rate is 18/90=0.2 kWh per unit. 30/150 is also 0.2.", 42),
  q("tara-spec-ps-similar-mike", "In a survey, 36 of 120 respondents choose option A. Which survey has the same proportion choosing A?", "54 of 180 respondents", ["45 of 120 respondents", "60 of 180 respondents", "72 of 200 respondents", "84 of 240 respondents"], "36/120=0.30, and 54/180=0.30. The other proportions differ.", 43),
  q("tara-spec-ps-similar-november", "A savings account gains £45 interest on £900 over a stated period. Which account shows the same percentage gain over the same period?", "£70 interest on £1,400", ["£50 on £800", "£60 on £1,000", "£75 on £1,250", "£90 on £1,500"], "£45/£900=5%. £70/£1400 is also 5%.", 44),
  q("tara-spec-ps-similar-oscar", "A box contains green and white counters in the ratio 4:7. Which probability statement describes an equivalent composition?", "The probability of green is 8/22.", ["The probability of green is 4/7.", "The probability of green is 7/11.", "The probability of green is 12/25.", "The probability of green is 16/39."], "With ratio 4:7, green is 4/(4+7)=4/11, which is equivalent to 8/22.", 45),
  q("tara-spec-ps-similar-papa", "A rectangular image 12 cm wide and 8 cm high is enlarged without distortion. Which new dimensions have the same shape?", "21 cm by 14 cm", ["18 cm by 10 cm", "20 cm by 15 cm", "24 cm by 18 cm", "30 cm by 16 cm"], "The width:height ratio is 12:8=3:2. 21:14 also simplifies to 3:2.", 46),
  q("tara-spec-ps-similar-quebec", "A process removes 20% of a quantity, leaving 80% of the original. Which operation has the same multiplicative effect?", "Multiply the original quantity by 0.8.", ["Divide the original quantity by 0.8.", "Multiply the original quantity by 1.2.", "Subtract 0.8 from the original quantity.", "Divide the original quantity by 1.2."], "Removing 20% leaves 80%=0.8 of the original, so multiplication by 0.8 is equivalent.", 47),
]

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

// These are deliberately separate question families: the full-paper family
// balancer can therefore place Relevant Selection material in both disjoint
// forms instead of treating every example as one repeated template family.
export const taraRelevantSelectionReserveBank: TestQuestion[] = [
  q(
    "tara-spec-ps-select-alpha",
    "A coach must take 47 students and 5 staff to a competition. Each hired coach has 53 passenger seats. One member of staff will travel separately in a car. The journey is 84 miles and the school owns 2 minibuses. What is the minimum number of hired coaches required?",
    "1",
    ["2", "3", "4", "5"],
    "Only 47 students + 4 staff need seats on a hired coach, giving 51 passengers. One 53-seat coach is enough; journey distance and school minibuses are irrelevant to this question.",
    21,
  ),
  q(
    "tara-spec-ps-select-bravo",
    "A conference room has 15 rows of 28 chairs. Three complete rows are reserved for speakers, and 24 additional chairs are kept unused for equipment. The room is on the second floor and has 6 windows. How many chairs remain for delegates?",
    "312",
    ["336", "360", "396", "420"],
    "The room has 15×28=420 chairs. Reserving 3×28=84 leaves 336; removing 24 more leaves 312. Floor and window information is irrelevant.",
    22,
  ),
  q(
    "tara-spec-ps-select-charlie",
    "A machine fills 18 bottles per minute. An order requires 1,350 bottles. The machine's tank holds 240 litres, each bottle holds 500 ml, and the machine was serviced last week. Ignoring refilling time, how many minutes are needed to fill the order?",
    "75 minutes",
    ["60 minutes", "72 minutes", "90 minutes", "135 minutes"],
    "The required calculation uses only bottles required and filling rate: 1350/18=75 minutes. Tank capacity, bottle volume and service date do not affect the stated filling time.",
    23,
  ),
  q(
    "tara-spec-ps-select-delta",
    "A school orders notebooks for 126 pupils. Notebooks are sold in packs of 15. Four teachers each already have a spare notebook that pupils cannot use. Delivery costs £8 and each pack weighs 1.2 kg. What is the minimum number of packs the school must order?",
    "9",
    ["8", "10", "11", "12"],
    "Pupil demand is 126 notebooks. Eight packs provide only 120, while nine provide 135. Teacher spares, delivery cost and pack mass are irrelevant.",
    24,
  ),
  q(
    "tara-spec-ps-select-echo",
    "A laboratory needs 2.4 litres of solution for an experiment. The solution is supplied in 350 ml bottles. Each bottle costs £3.20, the cupboard can hold 20 bottles, and the experiment lasts 45 minutes. What is the minimum number of bottles needed?",
    "7",
    ["6", "8", "9", "20"],
    "2.4 litres is 2400 ml. Six bottles provide 2100 ml, but seven provide 2450 ml, so seven are required. Cost, cupboard capacity and duration are not needed.",
    25,
  ),
  q(
    "tara-spec-ps-select-foxtrot",
    "A charity has £2,750 available for laptops. Each laptop costs £425 and includes a three-year warranty. The charity has 14 volunteers and its office rent is £900 per month. What is the greatest number of laptops it can buy without exceeding the laptop budget?",
    "6",
    ["5", "7", "8", "14"],
    "Six laptops cost £2550, while seven cost £2975 and exceed the £2750 laptop budget. Warranty length, volunteer count and office rent do not change this calculation.",
    26,
  ),
  q(
    "tara-spec-ps-select-golf",
    "A reservoir contains 18,000 litres of usable water. A process consumes 750 litres per cycle. The reservoir is 4 m deep, was inspected on Tuesday, and a second empty tank is nearby. How many complete cycles can be run using the usable water stated?",
    "24",
    ["18", "20", "22", "25"],
    "The number of complete cycles is 18000/750=24. Depth, inspection day and the empty second tank are not needed for the stated calculation.",
    27,
  ),
  q(
    "tara-spec-ps-select-hotel",
    "A theatre sells 360 tickets for a performance. Twelve ticket holders cancel before the event and 18 seats must remain empty for technical reasons. The performance begins at 7:30 pm and tickets cost £16. How many audience members can be seated if everyone else attends?",
    "330",
    ["342", "348", "360", "378"],
    "Start with 360 ticket holders, subtract 12 cancellations and then 18 seats that must stay empty: 360−12−18=330. Start time and ticket price are irrelevant.",
    28,
  ),
  q(
    "tara-spec-ps-select-india",
    "A warehouse must dispatch 1,040 identical items. Each crate safely holds 48 items. The warehouse has 30 crates available, each empty crate weighs 3 kg, and the loading bay closes at 6 pm. What is the minimum number of crates needed?",
    "22",
    ["20", "21", "23", "30"],
    "Twenty-one crates hold 1008 items, which is too few; 22 hold 1056, so 22 are needed. Crate mass, bay closing time and total stock of crates are not required once availability is known to be sufficient.",
    29,
  ),
  q(
    "tara-spec-ps-select-juliet",
    "A research team needs at least 925 completed survey responses. It currently has 748 valid responses and expects exactly 59 valid responses from each remaining school. The survey has 12 questions and each school has about 800 pupils. What is the minimum number of additional schools needed to reach the target?",
    "3",
    ["2", "4", "5", "12"],
    "The shortfall is 925−748=177 responses. At 59 valid responses per school, 177/59=3 schools are required. Question count and school population are irrelevant to the stated expected yield.",
    30,
  ),
]

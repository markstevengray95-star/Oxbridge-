import type { TestQuestion } from "@/lib/oxbridge-data"

function rotate<T>(items: T[], shift: number) {
  const n = ((shift % items.length) + items.length) % items.length
  return [...items.slice(n), ...items.slice(0, n)]
}

function q(
  id: string,
  section: "Critical Thinking" | "Problem Solving",
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
    section,
    difficulty: seed % 3 === 0 ? "Challenge" : "Stretch",
    prompt,
    options,
    answer: options.indexOf(correct),
    explanation,
  }
}

export const taraSpecificationExpansionBank: TestQuestion[] = [
  // Critical Thinking — Identifying the Main Conclusion.
  q(
    "tara-spec-ct-main-01",
    "Critical Thinking",
    "A school says phones should be kept in lockers during lessons. Notifications interrupt attention, and even pupils who do not check a phone can be distracted when nearby screens light up. Phones can still be collected at break and used after lessons. Which option best expresses the main conclusion?",
    "Phones should be kept in lockers during lessons.",
    [
      "Notifications can interrupt attention during lessons.",
      "Nearby screens can distract pupils who are not using a phone.",
      "Pupils should be allowed to use phones at break time.",
      "Schools should prevent pupils from owning mobile phones.",
    ],
    "The claims about notifications, nearby screens and access at break are reasons or qualifications supporting the policy conclusion that phones should be kept in lockers during lessons.",
    1,
  ),
  q(
    "tara-spec-ct-main-02",
    "Critical Thinking",
    "A council is considering planting more street trees. Mature trees reduce summer surface temperatures and can slow rainwater runoff. Young trees need maintenance, so planting schemes should include long-term care rather than simply counting how many saplings are planted. Which option best expresses the main conclusion?",
    "Street-tree schemes should include long-term care as well as planting targets.",
    [
      "Mature trees can reduce summer surface temperatures.",
      "Young trees require maintenance after planting.",
      "Rainwater runoff can sometimes be slowed by trees.",
      "Councils should replace every paved street with woodland.",
    ],
    "The passage uses the benefits of mature trees and the needs of young trees to support a recommendation about how planting schemes should be designed.",
    2,
  ),
  q(
    "tara-spec-ct-main-03",
    "Critical Thinking",
    "Museum labels cannot include every fact about an object. A useful label should therefore select evidence that helps visitors understand why an interpretation is supported, while identifying important uncertainty where it exists. Longer labels are not automatically better. Which option best expresses the main conclusion?",
    "Good museum labels should select relevant evidence and make important uncertainty clear.",
    [
      "Every museum label should contain all known facts about an object.",
      "Long museum labels are always more informative than short ones.",
      "Museums sometimes hold objects about which evidence is incomplete.",
      "Visitors should form interpretations without any guidance from curators.",
    ],
    "The passage argues for selective, evidence-based labels that acknowledge uncertainty; the other statements are either reasons, overstatements or contrary claims.",
    3,
  ),

  // Critical Thinking — Drawing a Conclusion.
  q(
    "tara-spec-ct-draw-01",
    "Critical Thinking",
    "A college ran two optional revision sessions. Session A was attended by 80 students and 60 completed the follow-up quiz. Session B was attended by 50 students and 45 completed the follow-up quiz. No information is given about quiz scores. Which conclusion can be drawn?",
    "A larger proportion of Session B attendees completed the follow-up quiz than Session A attendees.",
    [
      "Session B produced higher quiz scores than Session A.",
      "Every student who attended Session A completed the quiz.",
      "Session A was less useful for revision than Session B.",
      "Students attending Session B studied for longer overall.",
    ],
    "Completion proportions are 60/80 = 75% and 45/50 = 90%. Nothing in the information supports conclusions about scores, usefulness or total study time.",
    4,
  ),
  q(
    "tara-spec-ct-draw-02",
    "Critical Thinking",
    "On Monday, 96% of scheduled trains on a route arrived within five minutes of their timetable. On Tuesday, 92% did so. The number of scheduled trains was the same on both days. Which conclusion follows?",
    "More scheduled trains were within five minutes of the timetable on Monday than on Tuesday.",
    [
      "Every late train on Tuesday was more than an hour late.",
      "Monday passengers were more satisfied than Tuesday passengers.",
      "The railway changed its timetable between the two days.",
      "Tuesday had more cancelled trains than Monday.",
    ],
    "With equal numbers of scheduled trains, the higher percentage on Monday means a greater number met the stated punctuality criterion. The other claims require information not supplied.",
    5,
  ),
  q(
    "tara-spec-ct-draw-03",
    "Critical Thinking",
    "A library recorded 1,200 visits in April and 1,500 in May. In both months, 40% of visits included use of a study desk. Which conclusion follows?",
    "More visits included study-desk use in May than in April.",
    [
      "The proportion of visitors using study desks increased in May.",
      "Every May visitor stayed longer than every April visitor.",
      "The library added new study desks in May.",
      "Book borrowing must have increased by 25% in May.",
    ],
    "Forty per cent of 1,500 is greater than 40% of 1,200, although the proportion itself is unchanged and no other activity is described.",
    6,
  ),

  // Critical Thinking — Matching Arguments.
  q(
    "tara-spec-ct-match-01",
    "Critical Thinking",
    "Argument: If the laboratory is open, the technician is present. The technician is not present. Therefore the laboratory is not open. Which option uses the same pattern of reasoning?",
    "If the archive is unlocked, a supervisor is present. No supervisor is present, so the archive is not unlocked.",
    [
      "If the alarm sounds, the light flashes. The light flashes, so the alarm must have sounded.",
      "If a student revises, the student may improve. The student improved, so revision definitely occurred.",
      "Either the bus or the train is late. The bus is late, so the train is late as well.",
      "Some researchers are tutors. Some tutors are writers, so all researchers are writers.",
    ],
    "Both the original and keyed option use the valid contrapositive form: if P then Q; not Q; therefore not P.",
    7,
  ),
  q(
    "tara-spec-ct-match-02",
    "Critical Thinking",
    "Argument: Either the report was sent by email or it was delivered by hand. It was not delivered by hand. Therefore it was sent by email. Which option has the same structure?",
    "Either the key is in the drawer or it is in the safe. It is not in the drawer, so it is in the safe.",
    [
      "If the key is in the safe, the door is locked. The door is locked, so the key is in the safe.",
      "The key is in the drawer and the receipt is in the safe, so both records are complete.",
      "Some keys are labelled. This key is labelled, so every key is labelled.",
      "If the report is printed, it can be filed. It can be filed, so it was printed.",
    ],
    "Both arguments eliminate one of two stated alternatives and infer the remaining alternative.",
    8,
  ),
  q(
    "tara-spec-ct-match-03",
    "Critical Thinking",
    "Argument: All members of the committee received the briefing. Priya is a member of the committee. Therefore Priya received the briefing. Which option matches this reasoning?",
    "All accredited guides completed the safety course. Leon is an accredited guide, so Leon completed the safety course.",
    [
      "Some guides completed the safety course, so Leon completed it.",
      "Leon completed the safety course, so every accredited guide completed it.",
      "All guides carry identification, and Leon carries identification, so Leon must be a guide.",
      "No visitors entered the archive, and Leon is a guide, so Leon entered the archive.",
    ],
    "The keyed option applies a universal rule to an individual known to belong to the relevant group.",
    9,
  ),

  // Critical Thinking — Applying Principles.
  q(
    "tara-spec-ct-principle-01",
    "Critical Thinking",
    "Principle: When a person has accepted responsibility for a task, they should warn those relying on them as soon as they know they may not complete it on time. Which situation most clearly follows the principle?",
    "A student realises a shared data analysis will be late and immediately tells the group so they can adjust the plan.",
    [
      "A student notices the deadline has passed and waits to see whether anyone asks about the missing work.",
      "A student finishes early but withholds the file until the deadline because nobody requested it sooner.",
      "A student decides another group member probably has enough time and says nothing about an expected delay.",
      "A student abandons an assigned task without contacting anyone because the task was difficult.",
    ],
    "The principle requires early warning once a likely delay is known; the keyed action does exactly that.",
    10,
  ),
  q(
    "tara-spec-ct-principle-02",
    "Critical Thinking",
    "Principle: A restriction is justified only if it addresses the identified risk and does not go further than reasonably necessary. Which policy best applies the principle?",
    "Require protective eyewear only in laboratory activities where there is a realistic eye-splash or projectile risk.",
    [
      "Require protective eyewear in every lesson in every subject regardless of activity.",
      "Ban all practical science because some experiments involve hazards.",
      "Allow any practical activity without controls because most pupils behave responsibly.",
      "Require protective eyewear only after an accident has already occurred in that lesson.",
    ],
    "The keyed policy targets the stated risk while limiting the restriction to circumstances in which that risk is present.",
    11,
  ),
  q(
    "tara-spec-ct-principle-03",
    "Critical Thinking",
    "Principle: If a decision affects two groups in materially different ways, the decision-maker should consider evidence about both groups before claiming the policy is fair. Which action best follows the principle?",
    "Compare the costs and benefits for both groups before making a fairness judgement.",
    [
      "Measure only the group expected to benefit and infer that the other group is unaffected.",
      "Assume equal treatment always creates equal effects without collecting evidence.",
      "Avoid comparing the groups because differences could complicate the decision.",
      "Declare the policy fair first and collect evidence only if someone objects later.",
    ],
    "The principle requires evidence about both materially affected groups before reaching the fairness conclusion.",
    12,
  ),

  // Problem Solving — Relevant Selection.
  q(
    "tara-spec-ps-select-01",
    "Problem Solving",
    "A minibus has 16 passenger seats. A club has 38 pupils and 4 staff travelling; one staff member will drive a separate car and will not use a minibus seat. The school owns three identical minibuses. What is the minimum number of minibuses needed?",
    "3",
    ["1", "2", "4", "5"],
    "The relevant number needing minibus seats is 38 pupils + 3 staff = 41 people. Two minibuses hold 32; three hold 48, so three are needed. The total number owned is not needed unless capacity were insufficient.",
    13,
  ),
  q(
    "tara-spec-ps-select-02",
    "Problem Solving",
    "A hall has 18 rows of 24 seats. For an event, the first two rows are kept empty and 30 remaining seats are reserved for performers. The hall was built in 1998 and has four entrances. How many seats are available to the audience?",
    "354",
    ["384", "402", "432", "324"],
    "There are 18×24=432 seats. Two empty rows remove 48, leaving 384; reserving 30 more leaves 354. The year built and number of entrances are irrelevant.",
    14,
  ),
  q(
    "tara-spec-ps-select-03",
    "Problem Solving",
    "A printer produces 32 pages per minute. A booklet needs 18 printed pages and 120 copies are required. The printer tray holds 500 blank sheets and the printer weighs 14 kg. Ignoring setup time, how many minutes of printing are needed?",
    "67.5 minutes",
    ["60 minutes", "64 minutes", "72 minutes", "75 minutes"],
    "The required output is 18×120=2160 printed pages. At 32 pages per minute, 2160/32=67.5 minutes. Tray capacity and printer mass do not affect the printing time calculation.",
    15,
  ),

  // Problem Solving — Identifying Similarity.
  q(
    "tara-spec-ps-similar-01",
    "Problem Solving",
    "A machine converts inputs to outputs as follows: 2→7, 4→11, 6→15, 8→19. Which input-output pair follows the same rule?",
    "10→23",
    ["10→21", "12→23", "12→27", "14→31"],
    "Each output is twice the input plus 3. For input 10, the matching output is 2×10+3=23.",
    16,
  ),
  q(
    "tara-spec-ps-similar-02",
    "Problem Solving",
    "Five designs use black:white tiles in these ratios: A 2:3, B 4:6, C 3:5, D 6:9, E 8:12. Which design does NOT have the same black-to-white proportion as A?",
    "C",
    ["B", "D", "E", "All five have the same proportion"],
    "A simplifies to 2:3. B=4:6, D=6:9 and E=8:12 all simplify to 2:3, while C is 3:5.",
    17,
  ),
  q(
    "tara-spec-ps-similar-03",
    "Problem Solving",
    "A shape is translated 3 squares right and 2 squares up. Which movement has the same displacement?",
    "From (1,1) to (4,3)",
    ["From (1,1) to (3,4)", "From (2,2) to (4,5)", "From (0,3) to (2,6)", "From (4,4) to (6,5)"],
    "The displacement vector is (+3,+2). Only the movement from (1,1) to (4,3) has that same change in coordinates.",
    18,
  ),
]

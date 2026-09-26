import type { TestQuestion } from "@/lib/oxbridge-data"

type TfctAnswer = "True" | "False" | "Can't Tell"

type Passage = {
  passage: string
  main: string
  detail: string
  inference: string
  tfStatement: string
  tfAnswer: TfctAnswer
}

const tfctOptions: TfctAnswer[] = ["True", "False", "Can't Tell"]

const passages: Passage[] = [
  {
    passage: "A city library extended its weekday opening time by two hours for a twelve-week pilot. Evening visits rose substantially, but daytime visits fell slightly, so total weekly visits increased by a smaller amount than the evening figures alone suggested. Survey responses showed that many new evening users were people in full-time work. The library did not measure whether these visitors borrowed more books or studied for longer than daytime users. Staff overtime costs also rose during the pilot, and the council said it would compare the extra access with the additional staffing cost before deciding whether to keep the change.",
    main: "The pilot increased access, especially for full-time workers, but the overall value of longer opening still depends on costs and wider outcomes.",
    detail: "Staff overtime costs increased while the extended opening pilot was running.",
    inference: "Higher evening attendance alone is not enough to show that the extended hours should be made permanent.",
    tfStatement: "The library measured whether evening visitors studied for longer than daytime visitors.",
    tfAnswer: "False",
  },
  {
    passage: "A housing association painted several flat roofs with a light-coloured coating intended to reflect more sunlight. On clear summer afternoons, roof-surface temperatures on treated buildings were lower than on similar untreated buildings nearby. Indoor temperatures were also slightly lower on average, although the difference varied between buildings. The trial did not randomise buildings, and the treated blocks had somewhat newer insulation. Researchers therefore described the results as encouraging but said the insulation difference made it difficult to estimate how much of the indoor cooling was caused by the coating itself.",
    main: "The reflective coating was associated with cooler roofs and somewhat cooler interiors, but building differences limit the strength of the causal conclusion.",
    detail: "The treated buildings had somewhat newer insulation than the comparison buildings.",
    inference: "The roof-temperature result is clearer than the evidence about how much the coating reduced indoor temperature.",
    tfStatement: "Every treated building had a lower indoor temperature than every untreated building.",
    tfAnswer: "Can't Tell",
  },
  {
    passage: "Three secondary schools introduced a free breakfast club before morning lessons. Late arrival fell in all three schools during the following term. Teachers also reported that some pupils appeared more settled in first period, but the schools did not use a common measure of concentration. At the same time, one school changed its bus timetable and another introduced stricter follow-up for lateness. The evaluation concluded that breakfast provision may have contributed to improved punctuality but that the size of its effect could not be separated confidently from the other changes.",
    main: "Punctuality improved after breakfast clubs began, but simultaneous changes mean the breakfast programme cannot be treated as the sole established cause.",
    detail: "One participating school changed its bus timetable during the same period.",
    inference: "The evidence is stronger for a change in lateness than for a precisely measured change in classroom concentration.",
    tfStatement: "Late arrival increased in at least one of the three schools after the breakfast clubs were introduced.",
    tfAnswer: "False",
  },
  {
    passage: "A river-restoration project removed a small weir and replanted vegetation along a degraded bank. Surveys over the next two years recorded more fish species in the restored reach than before the work. However, rainfall was also higher in the second year, and a neighbouring reach that was not restored showed a smaller increase in fish diversity. The monitoring team argued that the comparison supports a restoration effect, while noting that weather and natural year-to-year variation prevent the study from identifying an exact effect size.",
    main: "Fish diversity increased more in the restored reach than nearby, supporting a restoration effect while leaving uncertainty about its exact size.",
    detail: "The neighbouring unrestored reach also showed a smaller increase in fish diversity.",
    inference: "The comparison reach makes a purely region-wide explanation less persuasive, but it does not eliminate all alternative explanations.",
    tfStatement: "Rainfall was lower in the second monitoring year than in the first.",
    tfAnswer: "False",
  },
  {
    passage: "A software company allowed one division to work from home up to three days each week. Output per employee changed little over six months, while staff-reported commuting stress fell and voluntary resignations were lower than in the previous six months. The company cautioned that the labour market had also weakened during the trial, which might independently reduce resignations. Managers also noted that tasks differed greatly between teams, so the findings could not be assumed to apply to every role in the organisation.",
    main: "Hybrid working coincided with lower commuting stress and fewer resignations without a clear productivity loss, but retention and role differences complicate interpretation.",
    detail: "The wider labour market weakened during the hybrid-working trial.",
    inference: "The trial does not justify assuming that the same hybrid arrangement would suit every team equally well.",
    tfStatement: "The company found a large increase in output per employee during the trial.",
    tfAnswer: "False",
  },
  {
    passage: "A museum experimented with opening late on Friday evenings. Friday attendance increased, and a higher proportion of visitors were aged under thirty than during ordinary weekday hours. Total weekly attendance also rose, although Saturday visits fell slightly. The museum collected entrance data but did not ask whether Friday visitors would otherwise have come on Saturday. It therefore could not determine how much of the rise represented genuinely new visitors rather than visits shifted from another day.",
    main: "Late Friday opening attracted more and younger visitors, but the data cannot fully distinguish new demand from visits moved from another day.",
    detail: "Saturday attendance fell slightly during the period of late Friday opening.",
    inference: "Some of the Friday increase may have come from people changing the day of an intended museum visit.",
    tfStatement: "The museum surveyed Friday visitors about whether they had originally planned to visit on Saturday.",
    tfAnswer: "False",
  },
  {
    passage: "A city introduced a peak-hour bus lane on a congested corridor. Bus journey times became shorter and more predictable, while average car journey times increased slightly during the first month. After six months, car delays had partly reduced as traffic patterns changed. Passenger counts on buses were higher than before the lane opened, but fuel prices also rose during the same period. Transport planners concluded that the lane improved bus performance but could not attribute the whole increase in bus use to the lane itself.",
    main: "The bus lane clearly improved bus journey performance, while the reason for higher passenger numbers is less certain because other conditions changed.",
    detail: "Average car journey times increased slightly during the first month of the scheme.",
    inference: "Improved bus performance is supported more directly than the claim that the lane caused all of the increase in bus use.",
    tfStatement: "Fuel prices remained unchanged throughout the six-month evaluation period.",
    tfAnswer: "False",
  },
  {
    passage: "Volunteers used a phone app to record garden birds during a national weekend survey. The project received far more observations than a professional team could have collected alone. To assess reliability, organisers compared a sample of volunteer records with photographs and expert checks. Most records were confirmed, but errors were more common for visually similar species. The organisers therefore kept the large volunteer dataset but applied additional checking rules to species that were frequently confused.",
    main: "Volunteer observations can provide large-scale useful data when targeted quality checks address the kinds of identification errors that actually occur.",
    detail: "Identification errors were more common for species that looked similar to one another.",
    inference: "The organisers treated data quality as something that could be improved rather than assuming volunteer records were either fully reliable or useless.",
    tfStatement: "The project verified every volunteer record using an expert photograph review.",
    tfAnswer: "False",
  },
  {
    passage: "A supermarket trialled reusable containers for selected takeaway foods. Customers paid a refundable deposit and could return containers at any branch. Return rates rose after reminder messages were added to the app, but some containers were still never returned. A lifecycle estimate suggested that a container needed to be reused several times before its higher manufacturing impact was offset by avoided single-use packaging. The company therefore said that return rate and number of reuses mattered more than the number of containers initially distributed.",
    main: "The environmental value of reusable containers depends heavily on repeated returns and reuse, not simply on distributing reusable packaging.",
    detail: "Reminder messages were followed by a higher container return rate.",
    inference: "A reusable container that is used only once may fail to deliver the intended environmental advantage.",
    tfStatement: "The trial reported that every distributed container was eventually returned.",
    tfAnswer: "False",
  },
  {
    passage: "A university introduced peer mentoring for first-year students in two departments. Students who joined the scheme were more likely to remain enrolled into the second year than students who did not join. However, participation was voluntary, and those who joined had also attended more induction activities at the start of term. The evaluation found that mentees valued practical advice and social support, but it warned that self-selection made it unsafe to interpret the retention difference as a direct estimate of the programme's causal effect.",
    main: "Peer mentoring was associated with higher retention and valued support, but voluntary participation prevents a clean causal estimate.",
    detail: "Students who joined mentoring had also attended more induction activities.",
    inference: "Differences between participants and non-participants existed before the mentoring experience could explain the retention gap.",
    tfStatement: "Students were randomly assigned either to receive peer mentoring or not to receive it.",
    tfAnswer: "False",
  },
  {
    passage: "Researchers compared summer temperatures on streets with dense mature tree cover and streets with little shade. Shaded streets were cooler during the hottest part of the day, although the size of the difference varied with wind and building layout. The study did not track health outcomes or electricity use in nearby homes. Its authors argued that the temperature measurements support the value of shade for local heat reduction, while separate evidence would be needed to quantify effects on health or household energy consumption.",
    main: "Mature tree shade was linked to lower street temperatures, but the study did not directly measure wider health or energy outcomes.",
    detail: "The size of the temperature difference varied with wind and building layout.",
    inference: "The study supports a local cooling effect more directly than claims about reduced illness or household electricity demand.",
    tfStatement: "The study measured electricity use in homes next to the shaded streets.",
    tfAnswer: "False",
  },
  {
    passage: "A research funder required grant recipients to make resulting journal articles freely available online. Downloads of funded articles increased after the policy, especially in countries where institutions subscribed to fewer journals. Citation rates also rose slightly, but the analysis noted that funded researchers were publishing in somewhat different journals after the policy. The authors concluded that the access effect was clear from download patterns, whereas the citation effect could not confidently be attributed to open access alone.",
    main: "Open-access requirements clearly expanded readership, while the evidence for a separate effect on citation rates is less secure.",
    detail: "Download growth was especially marked in countries with fewer institutional journal subscriptions.",
    inference: "Changes in journal choice make the citation comparison harder to interpret than the download comparison.",
    tfStatement: "The policy caused funded researchers to publish in exactly the same journals as before.",
    tfAnswer: "False",
  },
  {
    passage: "A neighbourhood converted an unused plot into a community garden. Participants reported meeting neighbours more often, and the site produced vegetables during most of the growing season. The project kept records of volunteer hours and harvest weight but did not measure whether local diets changed. Because people chose whether to participate, the organisers said the survey could describe participants' experiences but could not show that the garden itself caused changes in social connectedness across the whole neighbourhood.",
    main: "The garden created shared activity and food production, but the available evidence does not establish neighbourhood-wide social or dietary effects.",
    detail: "The project recorded volunteer hours and the weight of the harvest.",
    inference: "Participant reports provide information about their experiences without proving the same effect occurred among non-participants.",
    tfStatement: "The organisers measured changes in the diets of all households living near the garden.",
    tfAnswer: "False",
  },
  {
    passage: "A clinic began sending text reminders before routine appointments. Missed appointments fell after the change. The clinic also simplified its cancellation process at the same time, allowing patients to release unwanted slots by replying to the message. Managers therefore viewed the combined communication system as successful but said the data could not separate the effect of the reminder itself from the effect of making cancellation easier.",
    main: "Missed appointments declined after a combined reminder-and-cancellation change, but the data do not isolate which part produced the improvement.",
    detail: "Patients could cancel an appointment by replying to the reminder message.",
    inference: "The fall in missed appointments may reflect both remembering appointments and easier release of unwanted slots.",
    tfStatement: "The clinic introduced the reminder system without changing the way patients could cancel appointments.",
    tfAnswer: "False",
  },
  {
    passage: "A town added protected cycle lanes on two busy roads and counted travel at fixed points before and after construction. Cycle counts increased on the treated roads, while counts on several nearby untreated roads changed little. The survey did not identify individual travellers, so it could not show whether the extra cyclists were former drivers, former bus users or people making new trips. The council concluded that cycling on the treated corridors increased, but avoided claiming a precise reduction in car use.",
    main: "Protected lanes were followed by more cycling on the treated corridors, but the data do not reveal which previous travel modes those cyclists replaced.",
    detail: "Nearby untreated roads showed little change in cycle counts during the comparison period.",
    inference: "The evidence supports increased cycling on the treated roads more directly than a particular fall in car travel.",
    tfStatement: "The survey tracked the same individual commuters before and after the cycle lanes were built.",
    tfAnswer: "False",
  },
  {
    passage: "Several classrooms installed sound-absorbing ceiling panels after teachers reported difficulty hearing pupils during group work. Average background noise measured during comparable activities fell after installation. Teachers also rated communication as easier, although they knew which rooms had received the panels. The evaluation did not test examination results. Its authors concluded that the panels probably improved the acoustic environment but that any claim about academic attainment would require separate evidence.",
    main: "Sound-absorbing panels improved measured classroom acoustics and perceived communication, but the study did not test academic attainment.",
    detail: "Teachers knew which classrooms had received the new ceiling panels.",
    inference: "The objective noise measurements support an acoustic effect independently of teachers' subjective ratings.",
    tfStatement: "The evaluation compared examination results before and after the panels were installed.",
    tfAnswer: "False",
  },
  {
    passage: "A sixth-form college moved the start of its first lesson from 8:30 to 9:00 for one term. Student-reported sleep duration increased slightly and first-period lateness fell. The timetable change also shortened the lunch break, and extracurricular clubs were moved later in the afternoon. The evaluation did not measure whether total sleep changed at weekends. College leaders said the trial suggested benefits for morning routines but that broader timetable effects should be considered before making the change permanent.",
    main: "A later start was linked to slightly more reported sleep and less first-period lateness, but the wider timetable trade-offs also need consideration.",
    detail: "The trial shortened the lunch break and moved extracurricular clubs later.",
    inference: "The trial provides evidence about weekday morning routines but not about students' weekend sleep patterns.",
    tfStatement: "Students reported sleeping slightly longer during the trial term.",
    tfAnswer: "True",
  },
  {
    passage: "A council installed public drinking-water refill stations in parks and transport hubs. Sensor data showed frequent use in warm weather, and litter surveys found fewer discarded plastic bottles near several of the busiest stations. The council did not estimate how many refills replaced a bottle purchase rather than a drink brought from home. Maintenance problems also temporarily closed some stations. The review therefore described the scheme as promising for convenience and waste reduction but said the scale of avoided bottle purchases remained uncertain.",
    main: "Refill stations were widely used and coincided with less bottle litter in some locations, but the number of bottle purchases actually avoided is uncertain.",
    detail: "Some refill stations were temporarily closed because of maintenance problems.",
    inference: "Usage counts alone cannot show how many disposable bottles would otherwise have been purchased.",
    tfStatement: "The council calculated exactly how many refill uses replaced a new plastic-bottle purchase.",
    tfAnswer: "False",
  },
  {
    passage: "A public library expanded its e-book collection while keeping its print collection broadly unchanged. E-book loans rose quickly, but print borrowing fell only modestly. Surveys suggested that many readers used both formats for different purposes. The library did not record whether e-book users would have borrowed the same titles in print if digital copies had been unavailable. Staff concluded that digital access expanded choice, while the extent to which it substituted for print remained uncertain.",
    main: "Expanding e-books increased digital borrowing and reader choice, while the degree of substitution away from print cannot be measured directly from the data.",
    detail: "Many surveyed readers reported using both digital and print formats.",
    inference: "The rise in e-book loans does not imply that each digital loan replaced a print loan.",
    tfStatement: "Print borrowing disappeared after the library expanded its e-book collection.",
    tfAnswer: "False",
  },
  {
    passage: "A school fitted solar panels to three buildings and compared electricity bought from the grid with previous years. Grid purchases fell during sunny months, but total electricity use also changed because one building had new heating controls. The monitoring system recorded solar generation directly, so the school could estimate how much electricity the panels produced. It could not, however, attribute the entire change in grid purchases to solar generation because demand had changed too.",
    main: "The panels produced measurable electricity and reduced reliance on the grid, but changing demand means the full change in grid purchases is not a pure solar effect.",
    detail: "One building received new heating controls during the comparison period.",
    inference: "Direct generation data provide stronger evidence of solar output than a simple before-and-after comparison of grid purchases.",
    tfStatement: "The monitoring system directly recorded the electricity generated by the solar panels.",
    tfAnswer: "True",
  },
  {
    passage: "A wildlife charity built two road underpasses at locations where cameras had previously recorded frequent animal crossings. Camera detections inside the underpasses increased over the next year, while roadkill reports in the immediate area fell. Traffic volume also declined slightly during part of the monitoring period. The charity said the combined evidence was consistent with safer crossing, but longer monitoring would be needed to determine whether the reduction in roadkill persisted when traffic returned to previous levels.",
    main: "Wildlife used the new underpasses and local roadkill fell, supporting a safety benefit while leaving uncertainty about how durable the effect will be.",
    detail: "Traffic volume declined slightly during part of the monitoring period.",
    inference: "Changes in traffic volume are a plausible factor to consider when interpreting the roadkill reduction.",
    tfStatement: "The charity reported that traffic volume stayed exactly constant throughout monitoring.",
    tfAnswer: "False",
  },
  {
    passage: "A language-learning app introduced short daily review quizzes that selected older vocabulary for retrieval. Users who completed the reviews regularly remembered more words on an in-app test four weeks later than users who rarely completed them. Regular reviewers also used the app more frequently overall, and users were not randomly assigned to review habits. The company therefore treated the result as evidence that the feature was worth further testing rather than as proof that the quizzes alone caused the entire difference.",
    main: "Regular review was associated with better later recall, but heavier overall app use and self-selection prevent a clean estimate of the quiz feature's causal effect.",
    detail: "Regular reviewers used the app more frequently overall than users who rarely completed the reviews.",
    inference: "A randomised comparison would help separate the effect of retrieval quizzes from differences in overall engagement.",
    tfStatement: "Users were randomly assigned to complete either frequent or infrequent review quizzes.",
    tfAnswer: "False",
  },
  {
    passage: "A town replaced some street lamps with dimmer, warmer-coloured LEDs late at night to reduce light pollution. Sky-brightness readings near the trial streets fell, while pedestrian counts showed no clear change during the same hours. The study did not measure residents' sleep or wildlife behaviour. Engineers also found that electricity consumption was lower because the lamps used less power. The council said the trial demonstrated lower light output and energy use but did not by itself establish health or ecological benefits.",
    main: "The lighting trial reduced measured sky brightness and electricity use, while health and ecological effects were not directly tested.",
    detail: "Pedestrian counts showed no clear change during the late-night trial hours.",
    inference: "Claims about improved sleep or wildlife outcomes would require evidence beyond the measurements reported in the trial.",
    tfStatement: "The trial directly measured changes in residents' sleep quality.",
    tfAnswer: "False",
  },
]

const genericDistractors = [
  "The reported findings are sufficient on their own to justify applying the same policy across substantially different settings.",
  "The passage identifies the named change as the dominant cause after excluding the main competing explanations.",
  "The study reports the same size of effect in several independent populations using an identical method.",
] as const

function rotate<T>(items: readonly T[], shift: number) {
  const n = ((shift % items.length) + items.length) % items.length
  return [...items.slice(n), ...items.slice(0, n)]
}

function fourOptionQuestion(id: string, prompt: string, correct: string, distractors: readonly string[], seed: number, explanation: string): TestQuestion {
  const options = rotate([correct, ...distractors.slice(0, 3)], seed % 4)
  return {
    id,
    test: "UCAT",
    section: "Verbal Reasoning",
    difficulty: seed % 3 === 0 ? "Challenge" : "Stretch",
    prompt,
    options,
    answer: options.indexOf(correct),
    explanation,
  }
}

function tfctQuestion(id: string, prompt: string, answer: TfctAnswer, seed: number, explanation: string): TestQuestion {
  const options = rotate(tfctOptions, seed % tfctOptions.length)
  return {
    id,
    test: "UCAT",
    section: "Verbal Reasoning",
    difficulty: "Stretch",
    prompt,
    options,
    answer: options.indexOf(answer),
    explanation,
  }
}

const out: TestQuestion[] = []

for (let index = 0; index < passages.length; index++) {
  const item = passages[index]
  const passageId = 100 + index
  const common = item.passage

  out.push(fourOptionQuestion(
    `upgrade-ucat-vr-${passageId}-0`,
    `${common}\n\nWhich option best summarises the main point of the passage?`,
    item.main,
    [item.detail, item.inference, genericDistractors[0]],
    index,
    "The keyed answer captures the passage's overall qualified conclusion. The other supported statements are narrower details or inferences, while the remaining option overgeneralises beyond the evidence.",
  ))

  out.push(tfctQuestion(
    `upgrade-ucat-vr-${passageId}-1`,
    `${common}\n\nStatement: ${item.tfStatement}\n\nUsing only the passage, is the statement True, False or Can't Tell?`,
    item.tfAnswer,
    index + 7,
    item.tfAnswer === "True"
      ? "The statement is directly supported by information explicitly given in the passage."
      : item.tfAnswer === "False"
        ? "The statement conflicts with information explicitly given in the passage."
        : "The passage does not provide enough information to establish the statement as either true or false.",
  ))

  out.push(fourOptionQuestion(
    `upgrade-ucat-vr-${passageId}-2`,
    `${common}\n\nWhich statement is most strongly supported by the information in the passage?`,
    item.inference,
    genericDistractors,
    index + 13,
    "The keyed inference follows from the passage without adding a stronger causal, universal or replicated claim that the passage does not establish.",
  ))

  out.push(fourOptionQuestion(
    `upgrade-ucat-vr-${passageId}-3`,
    `${common}\n\nWhich statement is explicitly stated in the passage rather than merely inferred?`,
    item.detail,
    [item.inference, genericDistractors[1], genericDistractors[2]],
    index + 29,
    "The keyed statement is stated directly in the passage. The inference requires a reasoning step, while the other alternatives add evidence or causal certainty that is not reported.",
  ))
}

export const ucatVrMixedFormatBank = out

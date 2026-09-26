import type { TestQuestion } from "@/lib/oxbridge-data"

type Scenario = {
  scenario: string
  appropriate: string
  speech: string
  speechAnswer: 0 | 1 | 2 | 3
  important: string
  minor: string
  most: string
  middle: string
  least: string
}

const appropriateness = [
  "A very appropriate thing to do",
  "Appropriate, but not ideal",
  "Inappropriate, but not awful",
  "A very inappropriate thing to do",
] as const

const importance = [
  "Very important",
  "Important",
  "Of minor importance",
  "Not important at all",
] as const

function rotate<T>(items: readonly T[], shift: number) {
  const n = ((shift % items.length) + items.length) % items.length
  return [...items.slice(n), ...items.slice(0, n)]
}

function ratingQuestion(
  id: string,
  scenario: string,
  task: string,
  scale: readonly string[],
  correctIndex: number,
  explanation: string,
  seed: number,
): TestQuestion {
  const correct = scale[correctIndex]
  const options = rotate(scale, seed % scale.length)
  return {
    id,
    test: "UCAT",
    section: "Situational Judgement",
    difficulty: seed % 3 === 0 ? "Challenge" : "Stretch",
    prompt: `${scenario}\n\n${task}`,
    options,
    answer: options.indexOf(correct),
    explanation,
  }
}

function mostLeastQuestion(id: string, scenario: Scenario, seed: number): TestQuestion {
  const correct = `Most appropriate: ${scenario.most}\nLeast appropriate: ${scenario.least}`
  const options = rotate([
    correct,
    `Most appropriate: ${scenario.least}\nLeast appropriate: ${scenario.most}`,
    `Most appropriate: ${scenario.middle}\nLeast appropriate: ${scenario.least}`,
    `Most appropriate: ${scenario.most}\nLeast appropriate: ${scenario.middle}`,
  ], seed % 4)
  return {
    id,
    test: "UCAT",
    section: "Situational Judgement",
    difficulty: "Challenge",
    prompt: `${scenario.scenario}\n\nConsider these three possible actions:\n1. ${scenario.most}\n2. ${scenario.middle}\n3. ${scenario.least}\n\nWhich option correctly identifies the most and least appropriate actions?`,
    options,
    answer: options.indexOf(correct),
    explanation: "The most appropriate action addresses the key concern promptly and proportionately while preserving honesty, respect, safety and appropriate supervision. The least appropriate action neglects or worsens the central professional concern.",
  }
}

const scenarios: Scenario[] = [
  {
    scenario: "During a supervised teaching session, a student notices that a peer has entered an incorrect measurement in a shared practice record. The error has not yet affected any decision.",
    appropriate: "Speak to the peer promptly and make sure the record is corrected transparently through the agreed process.",
    speech: "I noticed this measurement may have been copied incorrectly. Shall we check it together before the record is used?",
    speechAnswer: 0,
    important: "Whether the inaccurate entry could later be relied on by somebody else.",
    minor: "Whether correcting the entry will make the group finish a few minutes later.",
    most: "Raise the discrepancy promptly and correct it openly.",
    middle: "Wait until the end of the session before mentioning it, provided nobody uses the record meanwhile.",
    least: "Change the entry quietly without telling anybody so the peer is not embarrassed.",
  },
  {
    scenario: "A student receives an email attachment containing identifiable information that was clearly intended for somebody else on the placement.",
    appropriate: "Do not use or forward the information; notify the sender or supervisor and follow the organisation's confidentiality process.",
    speech: "I think this attachment was sent to me by mistake. I have not shared it; please advise me how you want me to handle it securely.",
    speechAnswer: 0,
    important: "Protecting the person's confidentiality while the accidental disclosure is dealt with properly.",
    minor: "Whether the sender usually replies quickly to emails.",
    most: "Report the mistaken disclosure through the appropriate route and keep the information secure.",
    middle: "Leave the attachment unopened while seeking advice later that day.",
    least: "Send it to a friend for advice as long as the friend promises not to share it.",
  },
  {
    scenario: "In a group task, one student repeatedly interrupts a quieter member and dismisses their evidence before they can explain it.",
    appropriate: "Redirect the discussion so the quieter student can finish and ask the group to evaluate each contribution on its evidence.",
    speech: "Could we let her finish the point first, then compare the evidence behind both views?",
    speechAnswer: 0,
    important: "Whether everyone has a fair opportunity to contribute relevant evidence to the task.",
    minor: "Whether the dominant student normally speaks more quickly than the others.",
    most: "Refocus the group on respectful discussion and the evidence being presented.",
    middle: "Speak privately to the quieter student afterwards about how the discussion felt.",
    least: "Tell the quieter student they need to be more forceful if they want to be heard.",
  },
  {
    scenario: "A student realises they misunderstood a deadline and cannot complete an assigned placement task on time without rushing important checks.",
    appropriate: "Tell the supervisor early, explain the mistake honestly and agree which work should be prioritised safely.",
    speech: "I misread the deadline. I can finish everything only by rushing the checks, so could we agree the safest priority and plan?",
    speechAnswer: 0,
    important: "The risk that rushing the checks could reduce the quality or safety of the work.",
    minor: "Whether another student completed a different task earlier than expected.",
    most: "Communicate early and agree a safe revised plan with the supervisor.",
    middle: "Work faster for a while and update the supervisor if the deadline still looks unachievable.",
    least: "Record unfinished checks as completed so the task appears to be on time.",
  },
  {
    scenario: "A peer asks a student to sign that they witnessed a step which they did not actually observe, saying that the step definitely happened.",
    appropriate: "Decline to sign and explain that the record must state accurately what was personally observed.",
    speech: "I cannot sign that I witnessed it because I wasn't there, but I can help find the correct way to document what happened.",
    speechAnswer: 0,
    important: "Whether signing would create a false record of direct observation.",
    minor: "Whether correcting the paperwork will take several extra minutes.",
    most: "Refuse to make a false confirmation and use the proper recording process.",
    middle: "Ask whether somebody who was present can verify the step before anything is signed.",
    least: "Sign because the peer is usually trustworthy and says the step happened.",
  },
  {
    scenario: "During a laboratory teaching exercise, a peer skips an agreed safety check because the group is behind schedule.",
    appropriate: "Raise the missing check immediately and make sure the agreed safe procedure is followed before continuing.",
    speech: "We're running late, but we still need to complete that safety check before we carry on.",
    speechAnswer: 0,
    important: "Whether the omitted check exists to prevent an avoidable risk to people in the room.",
    minor: "Whether the group hoped to finish before another class arrived.",
    most: "Stop long enough to complete the missing safety step.",
    middle: "Ask the peer to explain why they thought the check could be skipped before deciding what to do next.",
    least: "Use the same shortcut so the rest of the group is not delayed.",
  },
  {
    scenario: "A student is unsure whether a person requesting confidential information is authorised to receive it. The requester says the matter is urgent but provides no clear verification.",
    appropriate: "Check the relevant process or seek guidance from an authorised supervisor before sharing the information.",
    speech: "I understand this is urgent, but I need to verify that I am allowed to share this information before I do so.",
    speechAnswer: 0,
    important: "Whether the requester's authority to receive the information has been verified.",
    minor: "Whether the requester sounds impatient while waiting.",
    most: "Verify authorisation through the proper route before disclosure.",
    middle: "Explain that there may be a short delay while authorisation is checked.",
    least: "Share the information because refusing an urgent request could appear unhelpful.",
  },
  {
    scenario: "Before a teaching session, a normally reliable group member appears very distressed and says they are struggling to concentrate.",
    appropriate: "Check on them privately, consider whether their task can be covered safely and help them access appropriate support or supervision.",
    speech: "You seem upset and said you're struggling to focus. Would you like to step aside and work out what support or cover you need?",
    speechAnswer: 0,
    important: "Both the person's wellbeing and whether they can carry out the planned task safely and effectively.",
    minor: "Whether changing roles will alter the group's original seating plan.",
    most: "Respond privately and arrange appropriate support or task cover.",
    middle: "Give them a short break and reassess how they feel before the task starts.",
    least: "Insist they continue exactly as planned so nobody else is inconvenienced.",
  },
  {
    scenario: "A group discovers shortly before submission that a factual statement in its presentation is wrong and several slides may depend on it.",
    appropriate: "Correct the error and recheck the affected material, explaining clearly to the group what changed and why.",
    speech: "This fact is wrong and may affect the next slides. We should correct it and check the dependent points before submitting.",
    speechAnswer: 0,
    important: "Whether other claims in the presentation rely on the same incorrect information.",
    minor: "Whether the incorrect statement appears on an early or late slide.",
    most: "Correct the mistake and check the material that depends on it.",
    middle: "Correct the visible statement first and review related slides if time remains.",
    least: "Leave the error because changing it close to the deadline might draw attention to the mistake.",
  },
  {
    scenario: "A student overhears identifiable personal information being discussed in a corridor where unrelated students and visitors can hear it.",
    appropriate: "Prompt the people involved to stop or move the conversation so the person's privacy is protected.",
    speech: "This is a public area and other people can hear us. Could we continue this conversation somewhere private?",
    speechAnswer: 0,
    important: "Whether people without a legitimate reason can hear the identifiable information.",
    minor: "Whether the corridor is usually busy at this time of day.",
    most: "Intervene proportionately to protect privacy and move the discussion.",
    middle: "Wait briefly to see whether the speakers notice the setting themselves.",
    least: "Listen carefully so you can later repeat exactly what was said if somebody asks.",
  },
  {
    scenario: "Two students disagree about evidence for an assignment and one begins criticising the other's ability rather than addressing the evidence.",
    appropriate: "Refocus the discussion on the evidence and ask both students to explain their reasoning without personal criticism.",
    speech: "Let's keep this about the evidence rather than each other. Can we compare the reasons for the two interpretations?",
    speechAnswer: 0,
    important: "Whether the disagreement can be handled respectfully while still testing the evidence critically.",
    minor: "Whether one student has contributed more words to the written assignment so far.",
    most: "Bring the discussion back to evidence and respectful reasoning.",
    middle: "Pause the discussion briefly before returning to the disputed evidence.",
    least: "Support whichever student sounds more confident so the group can move on quickly.",
  },
  {
    scenario: "A student is asked a question on placement that they do not know how to answer and a supervisor is available nearby.",
    appropriate: "Say honestly that they are unsure and seek guidance rather than guessing or presenting uncertain information as fact.",
    speech: "I'm not certain of the answer, so I don't want to guess. I'll check with my supervisor and come back with accurate information.",
    speechAnswer: 0,
    important: "The possibility that confident but incorrect information could mislead somebody.",
    minor: "Whether admitting uncertainty might make the conversation slightly longer.",
    most: "Acknowledge uncertainty and verify the answer appropriately.",
    middle: "Give only the part of the answer they are confident about and make clear what still needs checking.",
    least: "Give the most likely answer confidently so they do not appear inexperienced.",
  },
  {
    scenario: "A group member repeatedly arrives late to a shared project, causing others to redo the plan each time.",
    appropriate: "Speak to the person privately, explain the effect on the group and explore a practical way to improve reliability.",
    speech: "When you arrive late we have to change the plan and others lose time. Is there something affecting this, and can we agree a reliable arrangement?",
    speechAnswer: 0,
    important: "The repeated effect of the lateness on other people's work and whether there is a solvable underlying problem.",
    minor: "Whether the person usually brings useful ideas once they arrive.",
    most: "Address the repeated problem directly, privately and constructively.",
    middle: "Adjust the plan to reduce reliance on that member while arranging a conversation later.",
    least: "Complain about the person in a group chat before speaking to them directly.",
  },
  {
    scenario: "A student notices that a close friend has used unattributed text in a draft group report and says they will fix the references after submission.",
    appropriate: "Explain that the attribution should be corrected before submission and help ensure the group follows the required academic-integrity process.",
    speech: "We need to fix those references before we submit; leaving copied text unattributed puts the whole group's work at risk.",
    speechAnswer: 0,
    important: "Whether the submitted work would inaccurately present somebody else's words as the group's own.",
    minor: "Whether the copied passage is in the first or second half of the report.",
    most: "Correct the attribution before submission and follow the proper process if needed.",
    middle: "Ask the friend to correct it immediately and check the revised section before submitting.",
    least: "Ignore it because challenging a close friend could damage the friendship.",
  },
  {
    scenario: "A student feels too unwell to concentrate during a supervised practical but worries that leaving will disappoint the group.",
    appropriate: "Tell the supervisor and agree whether to stop, rest or change duties rather than concealing the problem.",
    speech: "I'm feeling unwell enough that I'm struggling to concentrate. I think I need to tell you before I continue the practical.",
    speechAnswer: 0,
    important: "Whether reduced concentration could affect safe or accurate completion of the task.",
    minor: "Whether the student had hoped to finish the practical early.",
    most: "Inform the supervisor and make a safe plan before continuing.",
    middle: "Pause briefly away from the task and reassess before deciding whether to continue.",
    least: "Hide the problem and keep working so the group does not have to adapt.",
  },
  {
    scenario: "A peer makes a dismissive joke about another student's accent during a teaching session and the targeted student looks uncomfortable.",
    appropriate: "Challenge the comment calmly, support the targeted student and reinforce respectful communication.",
    speech: "That comment isn't respectful. Let's keep the discussion focused on what people are saying, not how their accent sounds.",
    speechAnswer: 0,
    important: "The effect of the comment on respect, inclusion and the targeted student's ability to participate comfortably.",
    minor: "Whether the person making the joke usually gets laughs from the group.",
    most: "Address the disrespectful comment and support an inclusive discussion.",
    middle: "Check privately with the targeted student soon afterwards and offer support.",
    least: "Laugh along so the person who made the joke does not feel embarrassed.",
  },
  {
    scenario: "A student realises they accidentally damaged a piece of training equipment, although it still appears to work normally.",
    appropriate: "Report the damage promptly and stop relying on the equipment until an authorised person confirms it is safe to use.",
    speech: "I damaged this equipment accidentally. It still switches on, but I think it should be checked before anyone relies on it.",
    speechAnswer: 0,
    important: "Whether hidden damage could make the equipment unreliable or unsafe for the next user.",
    minor: "Whether the equipment was already several years old.",
    most: "Report the damage and arrange an appropriate check before further use.",
    middle: "Set the equipment aside while finding the person responsible for checking it.",
    least: "Put it back without mentioning the damage because it still appears to work.",
  },
  {
    scenario: "A group has more tasks than it can complete before a deadline and one member suggests quietly omitting a required quality check.",
    appropriate: "Raise the workload problem openly and agree priorities or seek guidance rather than hiding the omission of a required check.",
    speech: "We don't have enough time for everything as planned. We should agree priorities or ask for guidance rather than skip a required check without saying so.",
    speechAnswer: 0,
    important: "Why the quality check is required and what risk is created if it is omitted.",
    minor: "Whether the group prefers one task to another.",
    most: "Escalate the workload conflict and protect the required quality process.",
    middle: "Reallocate work within the group to see whether the required check can still be completed.",
    least: "Skip the check and say nothing because meeting the deadline matters more than documenting every step.",
  },
  {
    scenario: "A student is given constructive feedback by a supervisor and disagrees with part of it because they think important context was missed.",
    appropriate: "Listen to the feedback, ask for clarification and explain the missing context respectfully rather than dismissing the feedback immediately.",
    speech: "Thank you. Could I explain one piece of context that may affect that point, then check how you think I should improve next time?",
    speechAnswer: 0,
    important: "Understanding the supervisor's reasoning while also clarifying any relevant information they may not have known.",
    minor: "Whether the feedback conversation happens before or after lunch.",
    most: "Engage with the feedback constructively and clarify the disputed point respectfully.",
    middle: "Reflect on the feedback first, then arrange a short follow-up if the disagreement still matters.",
    least: "Ignore the feedback because the supervisor clearly did not understand the situation.",
  },
  {
    scenario: "A student notices another group has left confidential-looking paperwork unattended in a shared teaching room.",
    appropriate: "Protect the paperwork from unnecessary access and alert the responsible person or supervisor without reading it beyond what is needed to recognise the issue.",
    speech: "Some paperwork that looks confidential has been left unattended in the shared room. Could you help me secure it appropriately?",
    speechAnswer: 0,
    important: "Preventing people without a legitimate reason from seeing the information while it is unattended.",
    minor: "Whether the paperwork was left on a desk or a chair.",
    most: "Secure the material appropriately and notify somebody responsible.",
    middle: "Stay near the paperwork while locating the person who appears to own it.",
    least: "Read the documents carefully to work out who they belong to before telling anyone.",
  },
]

const out: TestQuestion[] = []
for (let index = 0; index < scenarios.length; index++) {
  const scenario = scenarios[index]
  const scenarioId = 100 + index
  out.push(ratingQuestion(
    `uniq-ucat-sjt-${scenarioId}-0`, scenario.scenario,
    `How appropriate is the following response?\n“${scenario.appropriate}”`,
    appropriateness, 0,
    "This response addresses the central concern promptly and proportionately while respecting honesty, safety, confidentiality, teamwork or appropriate supervision as relevant to the scenario.",
    index,
  ))
  out.push(ratingQuestion(
    `uniq-ucat-sjt-${scenarioId}-1`, scenario.scenario,
    `How appropriate is the following direct response?\n“${scenario.speech}”`,
    appropriateness, scenario.speechAnswer,
    "Judge the words as an action in context. A constructive, proportionate and respectful response is appropriate when it addresses the relevant concern without creating a new one.",
    index + 23,
  ))
  out.push(ratingQuestion(
    `uniq-ucat-sjt-${scenarioId}-2`, scenario.scenario,
    `How important is the following consideration when deciding how to respond?\n“${scenario.important}”`,
    importance, 0,
    "This consideration goes to the central professional or educational concern in the scenario and is therefore vital to an appropriate judgement.",
    index + 47,
  ))
  out.push(ratingQuestion(
    `uniq-ucat-sjt-${scenarioId}-3`, scenario.scenario,
    `How important is the following consideration when deciding how to respond?\n“${scenario.minor}”`,
    importance, 2,
    "The consideration may affect convenience or context, but it is secondary to the main issue and should not drive the decision.",
    index + 71,
  ))
  out.push(mostLeastQuestion(`uniq-ucat-sjt-${scenarioId}-4`, scenario, index + 91))
}

export const ucatSjtOfficialFormatBank = out

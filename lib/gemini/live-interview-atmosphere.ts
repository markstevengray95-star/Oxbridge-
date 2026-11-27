/** Shared formal atmosphere rules for native voice interviews. */
export function liveInterviewAtmosphereInstructions(panel: boolean, resume: boolean, minutes?: number): string[] {
  return [
    "FORMAL PRACTICE SESSION: this is an independent AI simulation, not a real Oxford or Cambridge interview. Be professional, calm and academically curious.",
    resume ? "Resume the existing discussion without a second introduction. Continue with the current academic problem and previously established role." : "Open with a brief professional greeting, identify this as an AI practice interview, invite the student to think aloud, and move directly into one accessible academic opening question. Do not ask for personal background or make a long introductory speech.",
    "Develop the session naturally through orientation and initial reasoning, a sustained academic discussion, a relevant changed condition or challenge, and a concise closing reflection. Do not announce stage labels mechanically. Do not advance simply to fill time, and allow a student to complete their reasoning.",
    minutes ? "The planned session is " + minutes + " minutes. Treat this as a target rather than a precise clock you can observe. Follow explicit facilitator stage updates and do not introduce a new problem during the closing stage." : "Use a flexible session length and allow the candidate to end at any time.",
    panel ? "Use two fictional academic roles, A and B. A develops the student's model or argument; B probes an assumption, evidence or alternative. Begin with A. Hand over naturally at a meaningful academic boundary rather than switching mechanically on every answer. One interviewer speaks at a time; do not restate the previous interviewer's question. Prefix each substantive interviewer turn with exactly A: or B: for role rendering. Do not imitate named real academics." : "Use one consistent academic interviewer throughout. Do not introduce additional speakers or use A: or B: labels.",
    "For the formal closing, thank the student, summarise one specific evidenced reasoning strength and one precise next practice action without marks or admissions predictions. Make the ending unambiguous, ask no new question, and do not provide the full model answer.",
    "Explicit clarification, thinking time, student safety and the selected support cap remain higher priority than presentation or timing.",
  ]
}

export type PanelRole = "A" | "B"
export function panelTurn(text: string): { role?: PanelRole; text: string } {
  const clean = text.trim()
  const match = clean.match(/^([AB])\s*:\s*/i)
  return match ? {role:match[1].toUpperCase() as PanelRole,text:clean.slice(match[0].length).trim()} : {text:clean}
}
export function panelSpeechSettings<T>(voices: readonly T[], role: PanelRole = "A") {
  return {
    voice: role === "B" ? voices[1] ?? voices[0] : voices[0],
    rate: role === "B" ? 1.02 : 0.94,
    pitch: voices.length < 2 && role === "B" ? 1.08 : 1,
  }
}

/** Count only clearly substantive turns for the schedule. A heuristic, not a grade. */
export function isAcademicStageResponse(text: string): boolean {
  const value = text.trim()
  if (!value || /^(?:um+|uh+|er+|hmm+|okay|ok|yes|no|thank you|thanks)[.!?\s]*$/i.test(value)) return false
  if (/^(?:could|can|would) you (?:repeat|rephrase|clarify|give me (?:a hint|a moment|some time))\b/i.test(value) && !/\b(?:because|therefore|since|assuming)\b/i.test(value)) return false
  if (/^(?:i need (?:a moment|more time|a hint)|let me think|i(?:'m| am) not sure|i (?:don't|do not) know)[.!?\s]*$/i.test(value)) return false
  return true
}

/**
 * FELLOW Phase 5: distinct, genuinely subject-led interview pathways.
 *
 * This library is practice content, not an Oxford/Cambridge official question
 * bank or validated assessment. There is never a need to expose model reasoning
 * to the candidate while the interview is in progress.
 */
import type { InterviewQuestion, TrackId } from "@/lib/oxbridge-data"

export type SubjectPathwayId =
  | "mathematics" | "computing" | "physics" | "engineering" | "chemistry"
  | "medicine" | "biology" | "psychology" | "law" | "economics"
  | "ppe" | "history" | "literature" | "philosophy" | "geography"
  | "languages" | "general"

export type SubjectPathway = {
  id: SubjectPathwayId
  label: string
  track: TrackId
  reasoningFocus: string[]
  isOpenEnded: boolean
  opening: {
    prompt: string
    concepts: string[]
    reasoningGuide: string
    probes: string[]
  }
  // Prompts explicitly preserve the current academic problem. The marker
  // {{claim}} is replaced with a bounded quote from the candidate's answer.
  probes: Record<SubjectProbeStrategy, string>
}

export type SubjectProbeStrategy =
  | "clarify" | "justify" | "verify" | "revision" | "assumption"
  | "prediction" | "alternative" | "stress-test" | "transfer" | "synthesis"

function profile(
  id: SubjectPathwayId,
  label: string,
  track: TrackId,
  reasoningFocus: string[],
  isOpenEnded: boolean,
  opening: SubjectPathway["opening"],
  subject: {
    principle: string
    test: string
    assumption: string
    challenge: string
    transfer: string
    rival: string
  },
): SubjectPathway {
  return {
    id, label, track, reasoningFocus, isOpenEnded, opening,
    probes: {
      clarify: "Stay with the original problem. Which " + subject.principle + " could you establish first, before drawing a conclusion?",
      justify: "In your claim {{claim}}, what precise " + subject.principle + " makes the conclusion follow?",
      verify: "Before accepting your claim {{claim}}, how would you independently check the " + subject.principle + " involved?",
      revision: "Your view has changed about {{claim}}. What " + subject.test + " explains the revision, and how would you check it?",
      assumption: "Which assumption about " + subject.assumption + " is necessary for {{claim}}, and what changes if it is false?",
      prediction: "Using {{claim}}, what specific result would you predict in " + subject.test + ", and what would count against it?",
      alternative: "What competing explanation involving " + subject.rival + " might account for {{claim}}, and how could you distinguish them?",
      "stress-test": "Consider " + subject.challenge + ". Does your reasoning about {{claim}} survive, and what would need to change?",
      transfer: "Take the reasoning you used for {{claim}} into " + subject.transfer + ". What principle carries over, and what changes?",
      synthesis: "Looking back at {{claim}}, which " + subject.principle + " proved decisive and what is the limit of your argument?",
    },
  }
}

const paths: Record<SubjectPathwayId, SubjectPathway> = {
  mathematics: profile("mathematics", "Mathematics", "maths", ["proof", "invariants", "counterexamples", "necessary versus sufficient conditions"], false, {
    prompt: "For positive real numbers x and y with x + y = 10, how would you find the greatest possible value of xy without first using calculus? I want to see a general argument, not just a numerical guess.",
    concepts: ["inequality", "symmetry", "maximum", "proof", "positive"],
    reasoningGuide: "Since (x-y)^2 is nonnegative, 4xy is no greater than (x+y)^2=100, so xy is at most 25 with equality at x=y=5. A reasoned explanation, correct constraint and equality case matter more than speed.",
    probes: ["Can you prove that equal values give the maximum without just testing examples?", "What changes if x or y can be negative?", "Would the same argument work for three positive numbers with a fixed sum?"],
  }, {
    principle: "definition, inequality or proof step", test: "a small numerical case or exact algebraic check", assumption: "the domain or constraints", challenge: "a boundary case or a carefully chosen counterexample", transfer: "a new optimisation or proof problem", rival: "a second proof method",
  }),
  computing: profile("computing", "Computer Science", "maths", ["algorithmic correctness", "complexity", "data structures", "edge cases"], false, {
    prompt: "You are given a long list of numbers and need to determine whether any two add up to a target. How would you solve it, how would you check the method is correct, and how does the cost change as the list grows?",
    concepts: ["algorithm", "pair", "correctness", "complexity", "edge case"],
    reasoningGuide: "A quadratic double loop works and handles distinct indices if implemented carefully. A hash set can provide expected linear time with suitable assumptions and memory; sorting plus two pointers is another option with different trade-offs.",
    probes: ["How do you avoid using the same list element twice?", "What changes when the list has duplicates or negative values?", "Compare the memory and time costs for each method."],
  }, {
    principle: "algorithmic invariant, complexity bound or correctness condition", test: "a concrete input trace or edge-case test", assumption: "the input size, ordering or available memory", challenge: "duplicate inputs, empty lists or adversarial data", transfer: "a streaming or memory-limited version", rival: "a different algorithm with a different time–space trade-off",
  }),
  physics: profile("physics", "Physics", "physical", ["physical models", "conservation", "dimensional analysis", "limiting cases"], false, {
    prompt: "A ball is released from rest on a smooth slope. The slope is made twice as long but kept at the same vertical height. Would the ball reach the bottom faster, slower, or at the same time? Explain what you would hold constant and why.",
    concepts: ["energy", "acceleration", "height", "time", "slope", "friction"],
    reasoningGuide: "With the same vertical drop, the final speed is the same if friction is negligible. The longer, shallower slope has a smaller acceleration and longer distance; the travel time is longer. A useful derivation uses acceleration g sin(theta), distance h/sin(theta), and constant-acceleration kinematics.",
    probes: ["Would the final speed change, even if the travel time does?", "Which approximation are you using about the surface?", "What if friction is introduced and is different along the two paths?"],
  }, {
    principle: "conservation law, equation or dimensional relationship", test: "a measurable prediction or limiting-case calculation", assumption: "friction, geometry or what is held fixed", challenge: "a limit where one of the relevant quantities tends to zero", transfer: "another motion or energy-transfer system", rival: "a different physical mechanism with a distinct quantitative prediction",
  }),
  engineering: profile("engineering", "Engineering", "physical", ["design constraints", "loads", "trade-offs", "testing"], false, {
    prompt: "Two beams of the same material and mass must span a gap. One is a solid rectangle and the other moves more material away from its centre. Which might resist bending better, and what would you need to know before choosing a design?",
    concepts: ["bending", "beam", "load", "moment of inertia", "constraint", "mass"],
    reasoningGuide: "Resistance to bending depends on second moment of area, shape and loading, not simply mass. Moving material away from the neutral axis can improve bending stiffness for a given mass, but stability, buckling, manufacture and load direction matter.",
    probes: ["How does the location of material relative to the neutral axis affect bending?", "What different failure mode could reverse your preference?", "How would you design a fair test?"],
  }, {
    principle: "load path, design constraint or stiffness relationship", test: "a repeatable load test or engineering estimate", assumption: "material, loading direction or manufacturing constraints", challenge: "a load reversal, instability or unexpected failure mode", transfer: "a bridge, wing or lightweight structural member", rival: "a contrasting design with different failure risks",
  }),
  chemistry: profile("chemistry", "Chemistry", "physical", ["particle mechanisms", "equilibria", "reaction rates", "experimental evidence"], false, {
    prompt: "Two sealed containers hold the same reversible reacting gas mixture at equilibrium. One is compressed to half the volume without changing temperature. What information do you need to predict how the equilibrium composition responds?",
    concepts: ["equilibrium", "pressure", "volume", "temperature", "stoichiometry"],
    reasoningGuide: "The direction depends on the stoichiometric gas mole count on each side. At fixed temperature, compressing increases pressures; a system with unequal gas mole totals may shift toward fewer gas moles, while equal gaseous totals do not give a shift on that basis alone. Must specify reaction first.",
    probes: ["Why is the balanced equation necessary?", "How would the result change if gaseous moles were equal on both sides?", "What would change if the compression also raised temperature?"],
  }, {
    principle: "particle mechanism, stoichiometric relationship or equilibrium condition", test: "a controlled chemical observation or rate comparison", assumption: "temperature, concentration, reaction conditions or stoichiometry", challenge: "a competing kinetic effect or a boundary condition", transfer: "a different reversible reaction or catalysed process", rival: "a different mechanism with distinguishable products or rates",
  }),
  medicine: profile("medicine", "Medicine", "life", ["causal inference", "evidence", "confounding", "ethical reasoning"], true, {
    prompt: "A hospital reports that patients who receive a new treatment recover more often than patients who do not. How would you decide whether the treatment caused the difference, and what would you want to know before advising a clinical trial?",
    concepts: ["causation", "selection bias", "confounder", "ethics", "trial", "evidence"],
    reasoningGuide: "Consider baseline differences, selection effects, severity, randomisation and comparators, outcome definitions, harms, equity, consent and clinical equipoise. No treatment recommendation is implied by the observation alone.",
    probes: ["Which baseline factor could make the treated group appear to recover more?", "What control or comparison would be most informative?", "How would risks and informed consent influence the study design?"],
  }, {
    principle: "clinical evidence, causal inference or ethically relevant distinction", test: "a controlled study or stronger comparison", assumption: "baseline risk, selection or patient characteristics", challenge: "a subgroup with different risk or a treatment with a serious adverse effect", transfer: "a different public-health or clinical study design", rival: "selection bias, spontaneous recovery or an alternative causal mechanism",
  }),
  biology: profile("biology", "Biology", "life", ["mechanisms", "experimental controls", "causality", "data"], false, {
    prompt: "A population of plants grows faster under blue light than under red light in one experiment. What biological mechanisms might explain this, and what would a fair follow-up experiment have to control?",
    concepts: ["light", "photosynthesis", "growth", "experiment", "control", "mechanism"],
    reasoningGuide: "Light wavelength, photon flux, pigment absorption, photoreceptor signalling and growth endpoints may all matter. A single result cannot distinguish mechanisms without matching intensity, exposure, environment and plant characteristics and measuring relevant responses.",
    probes: ["Would matching wattage necessarily match photon number?", "How would you separate photosynthesis from light-driven development?", "What observation would count against your favoured explanation?"],
  }, {
    principle: "biological mechanism or causal pathway", test: "a controlled biological experiment", assumption: "light intensity, sample characteristics or environment", challenge: "a result inconsistent with the proposed causal link", transfer: "another organism or environmental condition", rival: "an alternative pathway or uncontrolled variable",
  }),
  psychology: profile("psychology", "Psychology", "life", ["research methods", "operational definitions", "confounds", "ethical inference"], true, {
    prompt: "Researchers find that students who sleep longer score more highly on a memory test. What can they conclude, and how would you design a study to investigate whether more sleep improves memory?",
    concepts: ["correlation", "memory", "sleep", "confounder", "design", "ethics"],
    reasoningGuide: "Correlation alone does not establish causation. Consider operationalising sleep and memory, confounders, random assignment when feasible, within-subject designs, practice effects, consent and participant welfare.",
    probes: ["How would you define and measure memory?", "What could cause both longer sleep and higher scores?", "How would you reduce practice effects without creating undue participant risk?"],
  }, {
    principle: "operational definition, confound or inference", test: "a study with an appropriate comparison and outcome", assumption: "participant selection, measures or generalisability", challenge: "a conflicting subgroup or practice effect", transfer: "another behavioural experiment", rival: "reverse causality or an unmeasured influence",
  }),
  law: profile("law", "Law", "law", ["rule formulation", "fact sensitivity", "opposing arguments", "principled exceptions"], true, {
    prompt: "Imagine a town bans all vehicles from a public square for safety. A person using a powered wheelchair is stopped under the rule. How would you interpret and evaluate the rule without assuming that either side is automatically right?",
    concepts: ["interpretation", "principle", "exception", "safety", "fairness", "proportionality"],
    reasoningGuide: "Clearly distinguish literal wording, purpose, reasonable exceptions, competing interests, and the limits of the hypothetical. Do not invent a controlling legal statute or claim the case has a single settled outcome.",
    probes: ["Does the purpose of the rule affect the meaning of vehicle?", "Which one changed fact would most strongly affect the result?", "What general wording would handle safety while avoiding unjustified exclusions?"],
  }, {
    principle: "rule, interpretation or competing legal principle", test: "a changed factual scenario", assumption: "the purpose or scope of the rule", challenge: "a hard case where literal and purposive readings conflict", transfer: "a new hypothetical with a similar rule and different facts", rival: "a competing principled interpretation",
  }),
  economics: profile("economics", "Economics", "economics", ["incentives", "constraints", "equilibrium", "counterfactuals"], false, {
    prompt: "A city introduces a charge for driving into its centre during busy hours. What would you predict happens to congestion, and what information would you need before claiming the policy has worked?",
    concepts: ["demand", "incentive", "congestion", "substitution", "counterfactual"],
    reasoningGuide: "A charge increases the cost of central trips and may reduce demand, but responses depend on elasticity, alternatives, congestion displacement, time shifts, distributional effects and comparison against a credible no-policy counterfactual.",
    probes: ["Where might traffic move rather than disappear?", "How would the size of the response depend on alternatives?", "What data would distinguish the charging effect from other changes?"],
  }, {
    principle: "incentive, constraint or causal economic mechanism", test: "a counterfactual comparison or marginal response", assumption: "elasticity, available alternatives or market conditions", challenge: "a behavioural response that shifts costs elsewhere", transfer: "another policy or market with different constraints", rival: "a concurrent cause or substitution effect",
  }),
  ppe: profile("ppe", "PPE and Political Philosophy", "economics", ["conceptual clarity", "values and facts", "incentives", "counterarguments"], true, {
    prompt: "A government can increase overall wellbeing by a policy that makes a small minority significantly worse off. What would you need to decide whether the policy is justified?",
    concepts: ["welfare", "fairness", "rights", "trade-off", "principle", "evidence"],
    reasoningGuide: "A defensible response distinguishes welfare measurement, distribution, rights, consent, evidence, uncertainty and competing ethical principles. Neither an unqualified consequentialist nor an absolutist answer is automatically correct.",
    probes: ["What do you mean by wellbeing?", "Would your principle change if the minority were already disadvantaged?", "What evidence would help without determining the moral question on its own?"],
  }, {
    principle: "normative principle, economic trade-off or logical distinction", test: "a hard counterfactual with one changed condition", assumption: "welfare measurement, rights or whose interests count", challenge: "a minority-rights or distributional edge case", transfer: "another policy dilemma involving fairness and incentives", rival: "a competing moral framework or economic explanation",
  }),
  history: profile("history", "History", "humanities", ["primary sources", "provenance", "context", "causation"], true, {
    prompt: "Two witnesses describe the same political protest very differently: one calls it peaceful, the other calls it threatening. Neither account is necessarily invented. How would you investigate the disagreement, and what could each source reliably establish?",
    concepts: ["source", "provenance", "perspective", "corroboration", "context"],
    reasoningGuide: "A strong approach examines vantage point, dates, audience, purpose, selected evidence, differing definitions and corroborating sources. Disagreement itself does not prove either witness dishonest.",
    probes: ["What information about who wrote each account would matter most?", "Can both accounts be accurate descriptions of different observations?", "What third source could test an important disputed claim?"],
  }, {
    principle: "source inference, historical context or causal claim", test: "a corroborating source or provenance check", assumption: "source reliability, perspective or chronological context", challenge: "a document produced for a very different audience", transfer: "another historical episode with competing sources", rival: "a different interpretation consistent with the same evidence",
  }),
  literature: profile("literature", "English Literature", "humanities", ["close reading", "language", "alternative interpretations", "form"], true, {
    prompt: "Consider the invented line: 'The house kept its secrets, though every window stood open.' What might the tension between secrecy and openness suggest? Give a reading grounded in the words, then consider an alternative.",
    concepts: ["metaphor", "ambiguity", "contrast", "interpretation", "language"],
    reasoningGuide: "One defensible reading sees a contrast between physical visibility and emotional concealment; other readings are possible when grounded in diction, form and context. The line is original practice material, not a real published quotation.",
    probes: ["Why does 'kept' matter rather than simply 'had'?", "Could the open windows indicate vulnerability instead of honesty?", "What additional passage would help choose between interpretations?"],
  }, {
    principle: "choice of word, image, structure or interpretive inference", test: "a close quotation or contrasting line", assumption: "speaker, tone or narrative context", challenge: "an equally plausible reading of the same image", transfer: "a different invented passage with a similar tension", rival: "a rival interpretation supported by different textual details",
  }),
  philosophy: profile("philosophy", "Philosophy", "humanities", ["premises", "validity", "counterexamples", "conceptual distinctions"], true, {
    prompt: "Someone argues that a promise must always be kept because breaking promises is wrong. What is missing from this argument? Try to identify a principle that can survive a difficult counterexample.",
    concepts: ["argument", "premise", "validity", "exception", "moral principle"],
    reasoningGuide: "The argument risks circularity and needs a substantive account of why promises bind, their limits and competing duties. Test a hard case without asserting a uniquely correct moral theory.",
    probes: ["Is the original argument circular, or can you supply an independent reason?", "What if keeping the promise would harm someone?", "What narrower principle might handle both cases?"],
  }, {
    principle: "premise, inference or conceptual distinction", test: "a counterexample or validity check", assumption: "the meaning or scope of the central concept", challenge: "a hard case that reveals conflicting principles", transfer: "a different philosophical thought experiment", rival: "a competing account with different underlying premises",
  }),
  geography: profile("geography", "Geography", "humanities", ["spatial scale", "systems", "evidence", "uncertainty"], true, {
    prompt: "A coastal town reports fewer floods than before, but a neighbouring community reports more. How could a new flood barrier explain both observations, and what evidence would you need?",
    concepts: ["flood", "barrier", "scale", "risk", "transfer", "evidence"],
    reasoningGuide: "Possible flow diversion, exposure, coastal processes, differing conditions or reporting changes. An explanation must specify location, time scale, hydrological mechanism and credible comparison.",
    probes: ["What physical processes might move risk rather than eliminate it?", "Which spatial and temporal scale would you investigate?", "How could you separate barrier effects from a difference in storms?"],
  }, {
    principle: "spatial mechanism, scale or physical-human interaction", test: "a mapped comparison or environmental data pattern", assumption: "scale, exposure or baseline conditions", challenge: "a downstream or long-term consequence", transfer: "another location or environmental system", rival: "an alternative physical or social explanation",
  }),
  languages: profile("languages", "Languages and Linguistics", "languages", ["meaning", "translation", "register", "structure"], true, {
    prompt: "Imagine a language with two different words for 'you': one for close friends and one for formal situations. What problems arise when translating a conversation into English, and how would you preserve the meaning?",
    concepts: ["register", "translation", "context", "pragmatics", "meaning"],
    reasoningGuide: "English often collapses the pronoun distinction; choices may include register, tone, annotation or rephrasing. Translation depends on pragmatic context and no single strategy is always best.",
    probes: ["What meaning is lost if both become 'you'?", "Can word choice elsewhere compensate without changing the facts?", "How would your strategy differ between a poem and a legal text?"],
  }, {
    principle: "linguistic distinction, semantic inference or contextual choice", test: "a contrastive translation or example utterance", assumption: "register, audience or cultural context", challenge: "a sentence where the distinction cannot be preserved literally", transfer: "another language or text genre", rival: "a different translation that preserves a different nuance",
  }),
  general: profile("general", "Academic Reasoning", "humanities", ["definitions", "evidence", "assumptions", "counterexamples"], true, {
    prompt: "A school claims a new timetable improves learning because average test results have risen. What information would you need before concluding that the timetable caused the improvement?",
    concepts: ["claim", "causation", "evidence", "alternative", "control"],
    reasoningGuide: "Consider comparison groups, baseline, cohort, curriculum, assessment changes and mechanisms. Correlation is not proof of causation.",
    probes: ["What changed besides the timetable?", "How would you construct a fair comparison?", "What observation would weaken the school's explanation?"],
  }, {
    principle: "definition, causal link or inferential step", test: "a discriminating observation", assumption: "initial conditions or what counts as evidence", challenge: "a plausible contrary example", transfer: "another evidence-based question", rival: "a different explanation of the observed result",
  }),
}

function normalized(value: string) {
  return value.toLowerCase().replace(/\s+/g, " ").trim()
}

export function subjectInterviewPathway(course: string, track?: string): SubjectPathway {
  const name = normalized(course || "")
  const family = normalized(track || "")
  // Match the specific course before the broad track. PPE, medicine and
  // computer science must not silently turn into generic economics or biology.
  if (/computer|computing/.test(name) && !/mathematics and computer science/.test(name)) return paths.computing
  if (/mathematics and computer science/.test(name)) return paths.mathematics
  if (/math/.test(name)) return paths.mathematics
  if (/engineer/.test(name)) return paths.engineering
  if (/chemistr|chemical/.test(name)) return paths.chemistry
  if (/physics|astrophys/.test(name)) return paths.physics
  if (/material|earth sciences?/.test(name)) return paths.engineering
  if (/medicine|medical|biomed/.test(name)) return paths.medicine
  if (/psycholog/.test(name)) return paths.psychology
  if (/biolog|biochem|natural sciences?/.test(name)) return paths.biology
  if (/law|jurisprudence/.test(name)) return paths.law
  if (/ppe|philosophy, politics|politics, philosophy/.test(name)) return paths.ppe
  if (/econom|management|land economy/.test(name)) return paths.economics
  if (/history/.test(name)) return paths.history
  if (/philosoph/.test(name)) return paths.philosophy
  if (/geograph/.test(name)) return paths.geography
  if (/english|literat|classics/.test(name)) return paths.literature
  if (/language|linguistic|french|spanish|german|italian|mandarin|arabic/.test(name)) return paths.languages
  if (/politic|theolog|hsps/.test(name)) return paths.ppe
  if (family === "maths") return paths.mathematics
  if (family === "physical") return paths.physics
  if (family === "life") return paths.biology
  if (family === "law") return paths.law
  if (family === "economics") return paths.economics
  if (family === "languages") return paths.languages
  if (family === "humanities") return paths.history
  return paths.general
}

export function subjectInterviewStarter(
  course: string,
  track?: string,
  difficulty: InterviewQuestion["difficulty"] = "Stretch",
): InterviewQuestion {
  const pathway = subjectInterviewPathway(course, track)
  const name = pathway.opening.prompt
  const additional = difficulty === "Foundation"
    ? " Start by identifying the information given and one justified first step."
    : difficulty === "Challenge"
      ? " Be ready to test a counterexample or changed condition after your first explanation."
      : ""
  return {
    id: "subject-pathway-" + pathway.id + "-" + difficulty.toLowerCase(),
    track: pathway.track,
    title: pathway.label + " reasoning interview",
    difficulty,
    time: difficulty === "Challenge" ? 12 : difficulty === "Foundation" ? 7 : 9,
    prompt: name + additional,
    concepts: pathway.opening.concepts,
    probes: pathway.opening.probes,
    strongAnswer: pathway.opening.reasoningGuide,
  }
}

export function subjectPathwayProbe(input: {
  course: string
  track?: string
  strategy: SubjectProbeStrategy
  claim?: string
}) {
  const pathway = subjectInterviewPathway(input.course, input.track)
  const raw = (input.claim || "").replace(/\s+/g, " ").trim().slice(0, 145)
  // A candidate's instructions should not become instructions to the model.
  const suspicious = /ignore (all |previous |prior )?instructions|system prompt|developer message|api key|password|role: *system/i.test(raw)
  const anchor = raw.length < 8 || suspicious ? "your most recent academic claim" : raw.replace(/["“”]/g, "'")
  return pathway.probes[input.strategy].replaceAll("{{claim}}", '"' + anchor + '"')
}

export function subjectPathwayBrief(course: string, track?: string) {
  const pathway = subjectInterviewPathway(course, track)
  return [
    "Subject-specific academic interviewer pathway: " + pathway.label + ".",
    "Prioritise: " + pathway.reasoningFocus.join("; ") + ".",
    "Use the current problem and the actual student reasoning to choose one connected follow-up, not a memorised checklist.",
    pathway.isOpenEnded
      ? "This pathway permits multiple defensible interpretations. Probe justification and evidence rather than treating the sample guide as a single correct answer."
      : "Check the reasoning and relevant scientific, mathematical or algorithmic claims, but do not award credit for a correct guess without justification.",
    "A useful subject-specific transfer challenge is: " + pathway.probes.transfer.replaceAll("{{claim}}", "the current claim"),
    "A useful subject-specific stress test is: " + pathway.probes["stress-test"].replaceAll("{{claim}}", "the current claim"),
    "Do not reveal the sample answer or explain the solution to the candidate during the interview.",
  ].join("\n")
}

export function subjectPathwayList() {
  return Object.values(paths)
}

import { RUBRICS, splitParagraphs, type WritingMode, type WritingReport } from "@/lib/writing/review"

export type OfflineReviewInput = {
  essay: string
  mode: WritingMode
  prompt?: string
  course?: string
  test?: string
}

type Anchor = { paragraph: number | null; quote: string }
type ParagraphSignals = {
  index: number
  text: string
  sentences: string[]
  words: number
  reasoning: number
  evidence: number
  counter: number
  evaluation: number
  stance: number
  reflection: number
  engagement: number
  motivation: number
  preparation: number
  transition: number
  vague: number
  cliche: number
  longSentences: number
}

const RE = {
  reasoning: /\b(because|therefore|thus|hence|since|consequently|as a result|which means|implies?|suggests?|depends?|if|unless|so that|leads? to)\b/gi,
  evidence: /\b(for example|for instance|such as|evidence|data|study|studies|research|case|according to|survey|experiment|statistic|historical|historically|demonstrates?|illustrates?)\b/gi,
  counter: /\b(however|although|though|yet|nevertheless|nonetheless|on the other hand|counterargument|objection|critics?|might argue|could argue|limitation|despite|whereas|but)\b/gi,
  evaluation: /\b(to an extent|on balance|arguably|more convincing|less convincing|stronger|weaker|significant|limited|limitation|depends|only if|likely|unlikely|assumption|nevertheless|however|although)\b/gi,
  stance: /\b(i argue|i would argue|this essay argues|overall|ultimately|on balance|the central issue|the key issue|should|must|is better|is worse)\b/gi,
  reflection: /\b(i (?:learned|learnt|realised|realized|understood|discovered|found|noticed|questioned|developed)|made me (?:think|question|realise|realize)|led me to|changed my|challenged my|deepened my|showed me|taught me|prompted me|this made me)\b/gi,
  engagement: /\b(read|reading|book|article|paper|journal|lecture|podcast|project|research|experiment|olympiad|competition|essay|course|museum|documentary|seminar|workshop|independent study|investigat(?:e|ed|ion))\b/gi,
  motivation: /\b(want to study|wish to study|interested in|interest in|fascinat(?:ed|ing|ion)|curious|curiosity|drawn to|motivated|intrigued|question|problem)\b/gi,
  preparation: /\b(essay|project|research|experiment|problem[- ]solving|analysis|analysed|analyzed|mathematics|maths|coding|laboratory|lab|coursework|independent|extended project|epq|competition|olympiad|work experience|placement|volunteer)\b/gi,
  transition: /\b(first|firstly|second|secondly|furthermore|moreover|in addition|by contrast|conversely|however|therefore|thus|finally|ultimately|overall|on balance)\b/gi,
  vague: /\b(very|really|a lot|things?|stuff|amazing|great|good|bad|huge|extremely interesting|really interesting)\b/gi,
  cliche: /\b(since i was (?:young|a child)|from a young age|always been passionate|passion for|dream of|perfect candidate|prestigious|world[- ]class|ever since i can remember)\b/gi,
}

const STOPWORDS = new Set([
  "about","after","again","against","also","among","and","are","because","been","before","being","between","both","but","can","could","did","does","doing","during","each","essay","for","from","further","had","has","have","having","how","into","its","itself","more","most","not","of","off","once","only","other","our","out","over","same","should","some","such","than","that","the","their","them","then","there","these","they","this","those","through","to","too","under","very","was","were","what","when","where","which","while","who","why","with","would","you","your",
])

function clamp(value: number, min = 0, max = 4) {
  return Math.max(min, Math.min(max, Math.round(value)))
}

function count(text: string, pattern: RegExp) {
  pattern.lastIndex = 0
  const matches = text.match(pattern)
  return matches?.length ?? 0
}

function words(text: string) {
  return text.trim().split(/\s+/).filter(Boolean)
}

function sentenceList(text: string) {
  const parts = text.split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(Boolean)
  return parts.length ? parts : [text.trim()].filter(Boolean)
}

function shortQuote(text: string) {
  const sentence = sentenceList(text)[0] ?? text
  return sentence.length <= 760 ? sentence : sentence.slice(0, 760)
}

function anchor(paragraphs: string[], index: number | null, preferred?: string): Anchor {
  if (index === null || !paragraphs[index]) return { paragraph: null, quote: "" }
  if (preferred && paragraphs[index].includes(preferred)) return { paragraph: index, quote: preferred.length <= 760 ? preferred : preferred.slice(0, 760) }
  return { paragraph: index, quote: shortQuote(paragraphs[index]) }
}

function contentTerms(text: string) {
  return Array.from(new Set((text.toLowerCase().match(/[a-z][a-z'-]{2,}/g) ?? []).filter(token => !STOPWORDS.has(token))))
}

function overlapScore(source: string, target: string) {
  const terms = contentTerms(target)
  if (!terms.length) return { ratio: 0, hits: [] as string[] }
  const lower = source.toLowerCase()
  const hits = terms.filter(term => lower.includes(term))
  return { ratio: hits.length / terms.length, hits }
}

function inspectParagraph(text: string, index: number): ParagraphSignals {
  const sentences = sentenceList(text)
  const sentenceWords = sentences.map(s => words(s).length)
  return {
    index,
    text,
    sentences,
    words: words(text).length,
    reasoning: count(text, RE.reasoning),
    evidence: count(text, RE.evidence) + (/(?:\b\d{4}\b|\b\d+(?:\.\d+)?%\b)/.test(text) ? 1 : 0),
    counter: count(text, RE.counter),
    evaluation: count(text, RE.evaluation),
    stance: count(text, RE.stance),
    reflection: count(text, RE.reflection),
    engagement: count(text, RE.engagement),
    motivation: count(text, RE.motivation),
    preparation: count(text, RE.preparation),
    transition: count(text, RE.transition),
    vague: count(text, RE.vague),
    cliche: count(text, RE.cliche),
    longSentences: sentenceWords.filter(n => n > 38).length,
  }
}

function total(rows: ParagraphSignals[], key: keyof Omit<ParagraphSignals, "index" | "text" | "sentences">) {
  return rows.reduce((sum, row) => sum + Number(row[key]), 0)
}

function bestParagraph(rows: ParagraphSignals[], score: (row: ParagraphSignals) => number) {
  let best = rows[0]
  let bestScore = best ? score(best) : -1
  for (const row of rows.slice(1)) {
    const next = score(row)
    if (next > bestScore) { best = row; bestScore = next }
  }
  return { row: best, score: bestScore }
}

function criterion(label: string, level: number | null, judgement: string, evidence: Anchor, action: string) {
  return { label, level, judgement, evidence, action }
}

function essayCriteria(paragraphs: string[], rows: ParagraphSignals[], prompt: string) {
  const all = paragraphs.join("\n\n")
  const promptOverlap = overlapScore(all, prompt)
  const reasonCount = total(rows, "reasoning")
  const evidenceCount = total(rows, "evidence")
  const counterCount = total(rows, "counter")
  const evaluationCount = total(rows, "evaluation")
  const transitionCount = total(rows, "transition")
  const stanceCount = total(rows, "stance")
  const longCount = total(rows, "longSentences")
  const vagueCount = total(rows, "vague")
  const sentenceCount = rows.reduce((sum, row) => sum + row.sentences.length, 0)
  const reasonSpread = rows.filter(r => r.reasoning > 0).length
  const evidenceSpread = rows.filter(r => r.evidence > 0).length
  const counterSpread = rows.filter(r => r.counter > 0).length
  const evalSpread = rows.filter(r => r.evaluation > 0).length
  const promptBest = bestParagraph(rows, row => overlapScore(row.text, prompt).ratio + row.stance * .15)
  const reasonBest = bestParagraph(rows, row => row.reasoning * 2 + row.evaluation + row.stance)
  const evidenceBest = bestParagraph(rows, row => row.evidence * 2 + row.reasoning)
  const counterBest = bestParagraph(rows, row => row.counter * 2 + row.evaluation)
  const structureBest = rows[0]
  const clarityBest = bestParagraph(rows, row => Math.max(0, row.sentences.length - row.longSentences) + row.reasoning + row.evaluation)

  let answering: number | null = null
  if (prompt.trim()) answering = clamp(promptOverlap.ratio >= .48 && stanceCount ? 4 : promptOverlap.ratio >= .28 ? 3 : promptOverlap.ratio >= .12 ? 2 : 1)
  const reasoning = clamp(reasonCount >= 5 && reasonSpread >= Math.min(3, rows.length) && evaluationCount >= 2 ? 4 : reasonCount >= 3 && reasonSpread >= 2 ? 3 : reasonCount >= 1 ? 2 : 1)
  const evidence = clamp(evidenceCount >= 4 && evidenceSpread >= 2 && reasonCount >= 2 ? 4 : evidenceCount >= 2 && evidenceSpread >= 2 ? 3 : evidenceCount >= 1 ? 2 : 1)
  const evaluation = clamp(counterCount >= 3 && evaluationCount >= 3 && counterSpread >= 2 && evalSpread >= 2 ? 4 : counterCount >= 2 && evaluationCount >= 1 ? 3 : counterCount >= 1 ? 2 : 1)
  const structure = clamp(rows.length >= 5 && transitionCount >= 3 && stanceCount >= 1 ? 4 : rows.length >= 3 && (transitionCount >= 1 || stanceCount >= 1) ? 3 : rows.length >= 2 ? 2 : 1)
  const clarityBase = 3 - (sentenceCount && longCount / sentenceCount > .3 ? 1 : 0) - (vagueCount >= 5 ? 1 : 0) + (evaluationCount >= 2 && longCount === 0 ? .5 : 0)
  const clarity = clamp(clarityBase, 1, 4)

  return [
    criterion(RUBRICS.essay[0], answering,
      !prompt.trim() ? "No question was supplied, so relevance to the exact task cannot be assessed offline." : `The draft reuses ${promptOverlap.hits.length} meaningful term${promptOverlap.hits.length === 1 ? "" : "s"} from the question and ${stanceCount ? "contains an explicit position or judgement" : "does not yet make its overall position easy to locate"}. Keyword overlap is only a relevance check; it does not prove that the question has been answered fully.`,
      answering === null ? anchor(paragraphs, null) : anchor(paragraphs, promptBest.row?.index ?? 0),
      !prompt.trim() ? "Paste the exact question before judging relevance." : "Make the controlling answer explicit, then make each paragraph show how its claim advances that answer rather than merely sharing vocabulary with the question."),
    criterion(RUBRICS.essay[1], reasoning,
      `${reasonCount} visible reasoning link${reasonCount === 1 ? "" : "s"} were detected across ${reasonSpread} paragraph${reasonSpread === 1 ? "" : "s"}. ${evaluationCount ? "Some claims are qualified or tested." : "The draft rarely signals the assumptions or inferential steps that connect claims to conclusions."}`,
      anchor(paragraphs, reasonBest.score > 0 ? reasonBest.row.index : 0),
      "For each main claim, state the reason, then expose the assumption that makes the conclusion follow. Where the step is contestable, qualify it rather than hiding the uncertainty."),
    criterion(RUBRICS.essay[2], evidence,
      `${evidenceCount} visible example/evidence signal${evidenceCount === 1 ? "" : "s"} were detected across ${evidenceSpread} paragraph${evidenceSpread === 1 ? "" : "s"}. ${evidenceCount ? "The next test is whether each example actually establishes the claim attached to it." : "The argument currently gives the reader little concrete material with which to test its claims."}`,
      anchor(paragraphs, evidenceBest.score > 0 ? evidenceBest.row.index : 0),
      "Attach a specific example, case, text, datum or thought experiment to the claims that need support, then explain exactly what that evidence establishes and what it cannot establish."),
    criterion(RUBRICS.essay[3], evaluation,
      `${counterCount} objection/qualification signal${counterCount === 1 ? "" : "s"} and ${evaluationCount} evaluative signal${evaluationCount === 1 ? "" : "s"} were detected. ${counterCount && evaluationCount ? "The draft shows some willingness to test its own position." : "The argument is not yet visibly stress-testing its strongest assumptions or alternatives."}`,
      anchor(paragraphs, counterBest.score > 0 ? counterBest.row.index : 0),
      "Choose the strongest plausible objection, explain why it matters, and then show whether it defeats, narrows or strengthens your original claim. Avoid adding a token counterargument that changes nothing."),
    criterion(RUBRICS.essay[4], structure,
      `The response uses ${rows.length} paragraph${rows.length === 1 ? "" : "s"} and ${transitionCount} explicit progression marker${transitionCount === 1 ? "" : "s"}. ${rows.length >= 3 ? "There is enough paragraph separation to build a line of argument; the key question is whether each paragraph has a distinct job." : "The current paragraphing gives the reasoning limited room to develop in stages."}`,
      anchor(paragraphs, structureBest?.index ?? 0),
      "Give every paragraph one argumentative job: claim, development/evidence, evaluation, or synthesis. Make the opening establish the issue and make the ending answer the exact question rather than just repeat earlier points."),
    criterion(RUBRICS.essay[5], clarity,
      `${longCount} sentence${longCount === 1 ? "" : "s"} exceed 38 words and ${vagueCount} vague/intensifier signal${vagueCount === 1 ? "" : "s"} were detected. ${clarity >= 3 ? "Most of the prose is mechanically readable, so revision should focus on precision of claims and defined terms." : "Sentence load or vague wording may be obscuring the logical relationships between ideas."}`,
      anchor(paragraphs, clarityBest.row?.index ?? 0),
      "Prefer precise nouns and verbs over intensifiers, define contested terms when they first carry argumentative weight, and split a long sentence whenever it contains more than one inferential step."),
  ]
}

function statementCriteria(paragraphs: string[], rows: ParagraphSignals[], course: string) {
  const all = paragraphs.join("\n\n")
  const motivationCount = total(rows, "motivation")
  const engagementCount = total(rows, "engagement")
  const reflectionCount = total(rows, "reflection")
  const prepCount = total(rows, "preparation")
  const clicheCount = total(rows, "cliche")
  const vagueCount = total(rows, "vague")
  const longCount = total(rows, "longSentences")
  const engagementSpread = rows.filter(r => r.engagement > 0).length
  const reflectionSpread = rows.filter(r => r.reflection > 0).length
  const courseOverlap = overlapScore(all, course)
  const motBest = bestParagraph(rows, row => row.motivation * 2 + row.reasoning + row.reflection)
  const engagementBest = bestParagraph(rows, row => row.engagement * 2 + row.reflection)
  const reflectionBest = bestParagraph(rows, row => row.reflection * 3 + row.reasoning)
  const prepBest = bestParagraph(rows, row => row.preparation * 2 + row.reflection + row.engagement)
  const relevanceBest = bestParagraph(rows, row => overlapScore(row.text, course).ratio * 5 + row.engagement + row.motivation)
  const voiceBest = bestParagraph(rows, row => row.reflection * 2 + row.reasoning + row.engagement - row.cliche - row.vague)

  const motivation = clamp(motivationCount >= 3 && (reflectionCount || total(rows, "reasoning") >= 2) ? 4 : motivationCount >= 2 ? 3 : motivationCount >= 1 ? 2 : 1)
  const engagement = clamp(engagementCount >= 5 && engagementSpread >= 3 && reflectionCount >= 2 ? 4 : engagementCount >= 3 && engagementSpread >= 2 ? 3 : engagementCount >= 1 ? 2 : 1)
  const reflection = clamp(reflectionCount >= 4 && reflectionSpread >= 3 ? 4 : reflectionCount >= 2 && reflectionSpread >= 2 ? 3 : reflectionCount >= 1 ? 2 : 1)
  const preparation = clamp(prepCount >= 4 && engagementSpread >= 2 && reflectionCount >= 2 ? 4 : prepCount >= 2 ? 3 : prepCount >= 1 ? 2 : 1)
  let relevance: number | null = null
  if (course.trim()) relevance = clamp(courseOverlap.ratio >= .55 && engagementCount >= 2 ? 4 : courseOverlap.ratio >= .25 || (engagementCount >= 3 && motivationCount >= 2) ? 3 : engagementCount || motivationCount ? 2 : 1)
  const voiceBase = 3 + (reflectionCount >= 3 ? .5 : 0) - (clicheCount >= 2 ? 1 : 0) - (vagueCount >= 5 ? 1 : 0) - (longCount >= 3 ? .5 : 0)
  const voice = clamp(voiceBase, 1, 4)

  return [
    criterion(RUBRICS.statement[0], motivation,
      `${motivationCount} explicit motivation/curiosity signal${motivationCount === 1 ? "" : "s"} were detected. ${motivationCount && reflectionCount ? "The statement begins to connect interest with intellectual development rather than relying on enthusiasm alone." : "The motivation is more asserted than intellectually explained at present."}`,
      anchor(paragraphs, motBest.score > 0 ? motBest.row.index : 0),
      "Name the academic question, problem or idea that genuinely pulls you toward the subject, then explain why it matters to you intellectually rather than simply saying that you enjoy it."),
    criterion(RUBRICS.statement[1], engagement,
      `${engagementCount} academic-engagement signal${engagementCount === 1 ? "" : "s"} appear across ${engagementSpread} paragraph${engagementSpread === 1 ? "" : "s"}. ${engagementCount ? "Depth now depends on what the writer thought about those activities or materials, not how many are named." : "There is little visible evidence yet of exploration beyond broad interest."}`,
      anchor(paragraphs, engagementBest.score > 0 ? engagementBest.row.index : 0),
      "Select a small number of the strongest academic experiences and develop the ideas you encountered, the question they raised, and what you pursued next. Do not turn the paragraph into an inventory."),
    criterion(RUBRICS.statement[2], reflection,
      `${reflectionCount} explicit learning/reflection signal${reflectionCount === 1 ? "" : "s"} appear across ${reflectionSpread} paragraph${reflectionSpread === 1 ? "" : "s"}. ${reflectionCount ? "There is evidence of intellectual response; strengthen it by making the before/after change in thinking concrete." : "Activities are not yet being converted into evidence of how the writer thinks and learns."}`,
      anchor(paragraphs, reflectionBest.score > 0 ? reflectionBest.row.index : 0),
      "After each important activity or reading, add the intellectual consequence: what you understood differently, what you questioned, what limitation you noticed, or what you investigated next."),
    criterion(RUBRICS.statement[3], preparation,
      `${prepCount} visible preparation/skill signal${prepCount === 1 ? "" : "s"} were detected. ${prepCount ? "The strongest material will show how the preparation developed relevant academic habits rather than merely proving participation." : "The statement gives limited concrete evidence of preparation for demanding study."}`,
      anchor(paragraphs, prepBest.score > 0 ? prepBest.row.index : 0),
      "Use one or two specific examples to show preparation for university-level study: independent inquiry, analysis, problem-solving, sustained reading, research or disciplined reflection, and explain what the work demanded of you."),
    criterion(RUBRICS.statement[4], relevance,
      !course.trim() ? "No target course was supplied, so course relevance cannot be assessed without inventing a subject context." : `The draft matches ${courseOverlap.hits.length} meaningful term${courseOverlap.hits.length === 1 ? "" : "s"} from the supplied course label. Directly naming a course is not required; the more important test is whether the academic exploration clearly belongs to the field and leads naturally toward further study.`,
      relevance === null ? anchor(paragraphs, null) : anchor(paragraphs, relevanceBest.row?.index ?? 0),
      !course.trim() ? "Add the target course so relevance can be checked." : "Make the connection between your strongest academic exploration and the kinds of questions you want to pursue at degree level explicit, without flattering a particular university."),
    criterion(RUBRICS.statement[5], voice,
      `${clicheCount} cliché/prestige phrase signal${clicheCount === 1 ? "" : "s"}, ${vagueCount} vague/intensifier signal${vagueCount === 1 ? "" : "s"}, and ${longCount} very long sentence${longCount === 1 ? "" : "s"} were detected. ${voice >= 3 ? "The draft generally leaves room for the writer's own intellectual voice; the most convincing passages will be the specific reflective ones." : "Generic or overloaded phrasing may be crowding out specific evidence of the writer's own thinking."}`,
      anchor(paragraphs, voiceBest.row?.index ?? 0),
      "Keep the wording recognisably yours. Replace generic declarations of passion or prestige with a specific idea, reaction, difficulty or question that only makes sense in the context of your own academic exploration."),
  ]
}

function paragraphPurpose(row: ParagraphSignals, mode: WritingMode, isFirst: boolean, isLast: boolean) {
  if (mode === "essay") {
    if (isFirst && (row.stance || row.reasoning)) return "Frames the response and establishes the direction of the argument"
    if (row.counter) return "Tests or qualifies the argument through an objection or alternative"
    if (row.evidence) return "Develops a claim using an example or evidence"
    if (row.reasoning) return "Develops the reasoning between a claim and its consequence"
    if (isLast) return "Closes or synthesises the line of argument"
    return "Develops a main point in the response"
  }
  if (row.reflection && row.engagement) return "Explains academic exploration and what the writer learned from it"
  if (row.motivation) return "Explains an aspect of academic motivation or curiosity"
  if (row.engagement) return "Introduces subject exploration beyond a bare statement of interest"
  if (row.preparation) return "Provides evidence of preparation or relevant academic habits"
  return "Develops the academic narrative of the statement"
}

function paragraphReview(row: ParagraphSignals, mode: WritingMode, isFirst: boolean, isLast: boolean) {
  const purpose = paragraphPurpose(row, mode, isFirst, isLast)
  if (mode === "essay") {
    const strength = row.counter ? "It visibly acknowledges a competing consideration, which creates an opportunity for genuine evaluation." : row.evidence ? "It gives the reader something concrete to test rather than leaving the paragraph entirely abstract." : row.reasoning ? "It contains an explicit logical link between ideas rather than relying only on assertion." : row.stance ? "It makes a position visible to the reader." : "It contributes a distinct block of material, but the offline engine finds little explicit reasoning or evidence language in it."
    const limitation = row.longSentences ? `${row.longSentences} sentence${row.longSentences === 1 ? " is" : "s are"} longer than 38 words, which may be carrying more than one logical step.` : !row.reasoning ? "The inferential link is mostly implicit: the reader has to supply why the point supports the conclusion." : !row.evaluation && !row.counter ? "The paragraph develops a line of thought but does not visibly test its scope, assumptions or strongest objection." : "The paragraph contains useful argumentative machinery; its next weakness to test is whether the evidence warrants the size of the claim."
    const action = row.counter ? "State the objection in its strongest form, then say exactly whether it defeats, narrows or modifies the claim." : row.evidence ? "After the example, add one sentence explaining precisely what it proves and one sentence limiting what it does not prove." : "Turn the main assertion into a claim → reason → warrant chain, then link the final sentence back to the exact question."
    return { purpose, strength, limitation, action }
  }
  const strength = row.reflection ? "It contains an explicit sign of learning or changed thinking, which is stronger evidence than simply naming an activity." : row.engagement ? "It gives concrete evidence of academic engagement rather than relying only on enthusiasm." : row.motivation ? "It makes the writer's academic interest visible." : "It provides material about the writer, but the academic significance is not yet explicit."
  const limitation = row.cliche ? "A generic passion/prestige phrase risks sounding interchangeable with many applications and does not itself evidence academic potential." : row.engagement && !row.reflection ? "The activity is clearer than its intellectual consequence: the reader learns what happened more readily than what changed in the writer's thinking." : !row.engagement && !row.reflection ? "The paragraph offers limited visible evidence of subject exploration, learning or preparation." : "The reflection is promising but could be made more specific by naming the precise idea, difficulty or question that changed."
  const action = row.engagement && !row.reflection ? "Keep the activity to one concise clause, then spend more space on the idea encountered, your reaction, and the follow-up question or action it prompted." : row.reflection ? "Make the change in thinking concrete: state what you thought before, what challenged it, and what you now want to understand next." : "Replace broad claims with one specific academic example and explain what it reveals about how you think and prepare for the subject."
  return { purpose, strength, limitation, action }
}

function annotationCandidates(paragraphs: string[], rows: ParagraphSignals[], mode: WritingMode) {
  const out: WritingReport["annotations"] = []
  const seen = new Set<string>()
  for (const row of rows) {
    for (const sentence of row.sentences) {
      if (!sentence || seen.has(sentence) || sentence.length > 800) continue
      const reasoning = count(sentence, RE.reasoning)
      const evidence = count(sentence, RE.evidence) + (/\b\d{4}\b|\b\d+(?:\.\d+)?%\b/.test(sentence) ? 1 : 0)
      const counter = count(sentence, RE.counter)
      const reflection = count(sentence, RE.reflection)
      const engagement = count(sentence, RE.engagement)
      const motivation = count(sentence, RE.motivation)
      const cliche = count(sentence, RE.cliche)
      const length = words(sentence).length
      let kind: WritingReport["annotations"][number]["kind"] | null = null
      let explanation = ""
      let revision = ""
      if (mode === "statement" && reflection) {
        kind = "reflection"; explanation = "This passage explicitly signals learning or changed thinking, which is useful evidence of intellectual development."; revision = "Retain the reflective move, but make the exact idea that changed—and what prompted the change—as concrete as possible."
      } else if (mode === "statement" && engagement) {
        kind = "evidence"; explanation = "This gives a specific academic activity or source of engagement rather than relying only on a claim of enthusiasm."; revision = "Compress the description of the activity and expand what you thought, questioned or pursued because of it."
      } else if (mode === "statement" && motivation) {
        kind = "relevance"; explanation = "This makes an academic interest or motivating problem visible."; revision = "Push beyond interest: identify the intellectual problem underneath the motivation and why you want to study it further."
      } else if (mode === "essay" && counter) {
        kind = "reasoning"; explanation = "This passage introduces a qualification or competing consideration, creating an opportunity for evaluation."; revision = "Make clear how much this objection changes the original claim and why."
      } else if (mode === "essay" && reasoning) {
        kind = "reasoning"; explanation = "This sentence contains an explicit inferential link, so the reader can see part of the path from claim to conclusion."; revision = "Check the hidden assumption in this step and state it if a reasonable reader could dispute it."
      } else if (mode === "essay" && evidence) {
        kind = "evidence"; explanation = "This supplies concrete material that can support or test the argument."; revision = "Explain exactly what this evidence establishes and avoid drawing a broader conclusion than it warrants."
      } else if (cliche || length > 38) {
        kind = "clarity"; explanation = cliche ? "This wording is generic enough that it contributes little evidence about the writer's individual thinking." : "This sentence is carrying a high word load, which can hide more than one logical or reflective move."
        revision = cliche ? "Replace the generic claim with a specific idea, reaction, difficulty or question from your own work." : "Split the sentence at the change of logical job, then make the relationship between the two shorter claims explicit."
      }
      if (kind) {
        seen.add(sentence)
        out.push({ evidence: anchor(paragraphs, row.index, sentence), kind, explanation, revision })
      }
    }
  }
  if (!out.length && rows[0]) {
    const quote = shortQuote(rows[0].text)
    out.push({ evidence: anchor(paragraphs, 0, quote), kind: "clarity", explanation: "This is the opening material available to the offline engine. It does not yet contain a strong lexical signal for reasoning, evidence or reflection.", revision: mode === "essay" ? "Make the opening claim and its reason explicit, then connect both to the exact question." : "Make the academic idea, motivation or learning point explicit rather than relying on general description." })
  }
  const minimum = Math.min(4, rows.reduce((sum, row) => sum + row.sentences.length, 0))
  if (out.length < minimum) {
    for (const row of rows) {
      for (const sentence of row.sentences) {
        if (out.length >= minimum || seen.has(sentence) || !sentence || sentence.length > 800) continue
        seen.add(sentence)
        out.push({ evidence: anchor(paragraphs, row.index, sentence), kind: "clarity", explanation: "This passage is important enough to test for precision even though it does not contain one of the offline engine's stronger reasoning/reflection signals.", revision: mode === "essay" ? "Ask what exact claim this sentence makes, what supports it, and how it advances the answer." : "Ask what this sentence reveals about your academic thinking that the rest of the statement does not already show." })
      }
    }
  }
  return out.slice(0, 12)
}

const SUCCESS: Record<string, string> = {
  "Answering the question": "A reader can underline one sentence that gives the controlling answer and can explain how every body paragraph advances it.",
  "Reasoning and assumptions": "Each major claim has an explicit reason and the most contestable assumption is acknowledged or tested.",
  "Evidence and examples": "Every important example is followed by an explanation of what it establishes and what its limits are.",
  "Counterargument and evaluation": "The strongest objection changes, narrows or strengthens the conclusion rather than appearing as a token paragraph.",
  "Structure and progression": "Each paragraph has one distinct argumentative job and the conclusion answers the question rather than merely summarising.",
  "Precision and clarity": "Contested terms are defined where needed and no sentence hides multiple logical steps behind length or vague wording.",
  "Academic motivation": "The statement names a genuine academic problem or idea and explains why it motivates further study.",
  "Subject engagement": "A small number of academic experiences are explored in depth, with ideas and follow-up rather than a list of activities.",
  "Reflection and learning": "The reader can see what changed in the writer's thinking and what question or action followed from that change.",
  "Evidence of preparation": "Specific examples demonstrate the habits needed for demanding study and explain what the work required of the writer.",
  "Course relevance": "The academic interests and preparation lead naturally toward the supplied field without relying on university flattery.",
  "Clarity and authentic voice": "Generic application phrases have been replaced by specific observations, difficulties, ideas and questions in the writer's own voice.",
}

function buildPriorities(criteria: WritingReport["criteria"], wordCount: number) {
  const assessed = criteria.filter(c => c.level !== null).slice().sort((a, b) => (a.level ?? 99) - (b.level ?? 99))
  const number = wordCount < 180 ? Math.min(2, assessed.length) : Math.min(3, assessed.length)
  return assessed.slice(0, number).map(c => ({ title: c.label, evidence: c.evidence, why: c.judgement, action: c.action, successCheck: SUCCESS[c.label] ?? "The revision can be checked against a specific passage rather than a general impression." }))
}

function buildQuestions(annotations: WritingReport["annotations"], mode: WritingMode) {
  return annotations.slice(0, 4).map(a => {
    if (mode === "essay") {
      if (a.kind === "evidence") return { evidence: a.evidence, question: "What exactly does this example establish, and what conclusion would be too strong to draw from it?", purpose: "Test the evidential warrant rather than the presence of an example." }
      if (a.kind === "reasoning") return { evidence: a.evidence, question: "What assumption has to be true for this step in the reasoning to follow, and what would happen if it were false?", purpose: "Expose the hidden warrant and test robustness." }
      return { evidence: a.evidence, question: "What is the most precise version of the claim being made here, and how does it advance the answer to the question?", purpose: "Test precision and relevance." }
    }
    if (a.kind === "reflection") return { evidence: a.evidence, question: "What did you think before this experience, what specifically changed, and what did you do or want to understand next?", purpose: "Turn reflection into a defensible account of intellectual development." }
    if (a.kind === "evidence") return { evidence: a.evidence, question: "What single idea from this activity mattered most to you, and what did you question or disagree with about it?", purpose: "Test depth of academic engagement rather than activity quantity." }
    return { evidence: a.evidence, question: "What concrete academic idea or experience makes this claim true for you rather than for any applicant?", purpose: "Test authenticity, specificity and course relevance." }
  })
}

function summaryFor(mode: WritingMode, criteria: WritingReport["criteria"], rows: ParagraphSignals[], wordCount: number, prompt: string, course: string) {
  const assessed = criteria.filter(c => c.level !== null)
  const strongest = assessed.slice().sort((a, b) => (b.level ?? -1) - (a.level ?? -1))[0]
  const weakest = assessed.slice().sort((a, b) => (a.level ?? 99) - (b.level ?? 99))[0]
  const opening = mode === "essay"
    ? `This ${wordCount}-word response uses ${rows.length} paragraph${rows.length === 1 ? "" : "s"}. ${prompt.trim() ? "The offline engine checked visible relevance to the supplied question as well as reasoning, evidence, evaluation, structure and clarity." : "Because no question was supplied, the exact relevance of the answer is deliberately left unassessed."}`
    : `This ${wordCount}-word personal statement uses ${rows.length} paragraph${rows.length === 1 ? "" : "s"}. ${course.trim() ? `The offline engine reviewed it in relation to the supplied course (${course}) while prioritising academic motivation, exploration, reflection and preparation.` : "Because no course was supplied, course relevance is deliberately left unassessed."}`
  const strongText = strongest ? ` Its strongest visible area is ${strongest.label.toLowerCase()}: ${strongest.judgement}` : ""
  const weakText = weakest ? ` The first revision priority is ${weakest.label.toLowerCase()}: ${weakest.action}` : ""
  return opening + strongText + weakText
}

export function buildOfflineWritingReport({ essay, mode, prompt = "", course = "" }: OfflineReviewInput): WritingReport {
  const paragraphs = splitParagraphs(essay)
  if (!paragraphs.length) throw new Error("No writing supplied for offline review.")
  const rows = paragraphs.map(inspectParagraph)
  const wordCount = words(essay).length
  const criteria = mode === "essay" ? essayCriteria(paragraphs, rows, prompt) : statementCriteria(paragraphs, rows, course)
  const paragraphReports = rows.map((row, index) => ({ index, ...paragraphReview(row, mode, index === 0, index === rows.length - 1) }))
  const annotations = annotationCandidates(paragraphs, rows, mode)
  const priorities = buildPriorities(criteria, wordCount)
  const questions = buildQuestions(annotations, mode)
  const limitations = [
    "This is a deterministic offline coaching review. It can inspect wording, structure and explicit textual signals, but it cannot understand context with the same flexibility as a human tutor or a strong language model.",
    "The review cannot verify factual accuracy, authorship, plagiarism, the truth of personal experiences, or whether an example has been represented fairly.",
    "The qualitative levels are revision aids, not official Oxford, Cambridge or UCAS marks and not an admissions or offer prediction. Cambridge publicly states that it does not give personal statements a formal score.",
    mode === "statement" ? "For the current UCAS three-question format, the engine reads the pasted responses together. Unless section boundaries are explicitly present, it does not invent which paragraph belongs to which UCAS question." : "Argument quality can depend on subject-specific knowledge and the exact task; lexical signals such as 'however' or 'because' are evidence to inspect, not proof of sophisticated reasoning.",
  ]
  if (mode === "statement" && essay.length > 4000) limitations.push(`The pasted statement is ${essay.length} characters long. UCAS currently allows 4,000 characters in total across the three personal-statement questions, so this draft would need shortening before submission.`)
  return {
    summary: summaryFor(mode, criteria, rows, wordCount, prompt, course),
    criteria,
    paragraphs: paragraphReports,
    annotations,
    priorities,
    questions,
    limitations: limitations.slice(0, 5),
  }
}

# Phase 8 — Interview feedback with evidence, corrections and progress

FELLOW's interview feedback is **formative**. It must never be described as verified Oxford/Cambridge scoring, an admissions prediction, or definitive fact-checking. A student may use defensible reasoning without writing the exact trigger phrases sampled by the lightweight local observer.

## Implemented

- One reusable `lib/interview-feedback-intelligence.ts` analysis across Formal Interview Room, Reasoning Studio, Gemini Live Next and previously saved local transcripts.
- Each highlighted answer includes a **real excerpt, its transcript turn number and the actual preceding interviewer question**. No model-generated quotations or fabricated sources are presented as student speech.
- Separates (a) observable links to a stated reason, specific checks, and self-corrections, from (b) tentative software answer classifications and possible improvements after interviewer follow-ups.
- An `incorrect` classifier result is **only a request to verify** a concrete claim: a classification label is not proof the student's academic claim is wrong.
- Up to three specific practice priorities, each with an actionable task and a testable success criterion tied to a turn where possible.
- Same-course, same-mode comparisons require at least **three analysable candidate answers in both sessions**. Displayed differences refer solely to observable reasoning/check language, not academic accuracy, school predicted grades or admissions prospects.
- New /interview-insights history and direct links in the Interview Hub, with the shared detailed report on each interview's finish screen and existing /interview-feedback page.
- New Phase 8 snapshots are stored alongside existing `PROGRESS_KEY` browser-local interview records; historic interview event strings can be re-read conservatively, without retroactive accuracy ratings.
- AI voice transcripts have **no deterministic factual classification** assigned by this new engine; explicit transcript language can still be highlighted but must not imply correctness.

## Quality checks already executed

1. `node --experimental-strip-types --test tests/interview-feedback-intelligence.test.mjs`: **20/20 pass**.
2. Independent strict `tsc --noEmit` run for `lib/interview-feedback-intelligence.ts`: **pass**.
3. TypeScript-transpilation/syntax check for 8 modified/added TSX and TS files: **8/8 pass**.
4. CI job added: `npm run test:interview-feedback-intelligence`.

## Manual validation required before production

1. Formal interview: give a reasoned first answer, an incorrect claim, then an explicit correction. Verify each displayed excerpt exactly matches the saved candidate transcript and is paired with the actual interviewer prompt.
2. Reasoning Studio: trigger supported and independent recovery. The new report must distinguish explicit self-correction from a software-classified improvement; existing nine-dimension evidence and targeted practice still work.
3. Voice: test a 15–25 minute real Gemini Live session with spoken contradictions, interruptions and imperfect transcription. The new report must **not** claim any utterance is factually correct merely for being fluent or mentioning "because".
4. Low evidence: end after a single terse answer. Show limited evidence, a practical next step and no progress trend or admissions prediction.
5. Progress: complete 2+ sessions in the same course/mode with at least three answers each; verify percentages reflect explicit wording only, and switching course/mode disables any misleading comparison.
6. Legacy records: open previously saved transcript data where no Phase 8 report exists. Only reconstruct exact turn text, not classifications, recovery scores or academic accuracy.
7. Long evidence: test unknown classifications, adversarial transcript strings, very long answers, blank answers, no transcript, missing date or corrupt localStorage. React escapes user text; all stored snippets are bounded.
8. Check permissions and data minimisation for minors, privacy controls, deletion/export requirements, and any school/teacher access before releasing student or school analytics.
9. Validate responsive UI, readability and keyboard access on Android and desktop. Check that a marked report remains present after reload on the same device.
10. Verify full type-aware Next.js build, GitHub CI, browser E2E, production Vercel deployment and AI/voice API behavior. **Do not claim Phase 8 is live until these pass.**

## Known limitations

- **No verified full application build or real-device spoken interview** yet.
- **Browser-local** saved evidence does not guarantee cross-device, account, or teacher visibility. Account-scoped transcript and school tracking belong in Phase 9; no student records should be uploaded to a school dashboard without appropriate access controls and safeguarding review.
- An automated text observer cannot establish subject-specific correctness. Keywords, answer length or fluent speech should never be confused with demonstrated reasoning. Subject experts should review a representative sample of feedback across Maths, Medicine, Physics, Law, Humanities and Languages.
- Same-mode progress tracks **explicit habits in sample answers**. Its percentages are not marks, independent estimates of actual skill or evidence of admissions likelihood.
- The previous Phase 5, 6 and 7 PRs are stacked and still require merging, CI repair and a healthy Vercel deployment in that order.

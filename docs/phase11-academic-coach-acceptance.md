# Phase 11: academic coaching

## Completed implementation
Fellow's existing Tutor and Student Home contain an evidence-led diagnose → lesson → fresh transfer loop. The original eight generic exercise pairs are expanded with sixteen course-specific pairs and four spaced review pairs (28 pairs, 56 authored choice questions). All pairs have a written practice prompt and three reference criteria; the sixteen subject pairs have distinct course-specific prompts.

Recommendations use dated same-course transcript observations, quantitative paper evidence with a valid answered count, and recent missed fresh checks. A course-matched pack receives a modest preference. No evidence means baseline, not a finding of weakness. No practice score implies admissions likelihood or mastery.

The first result for each pair is saved under the authenticated learner's existing user_state records; duplicates are idempotent. Server checks course eligibility and due review dates. One fresh delayed review pair per skill is due one day after the first missed fresh answer or three days after the first correct fresh answer. This is an initial finite spaced-review cycle, not an unlimited adaptive curriculum.

Optional extended-response coaching uses a nested route in the existing /api/personal-tutor rate-limit scope, verified account identity, same-origin JSON requests, completed exercise eligibility, and student safety policy. It sends only task, criteria, written response and optional follow-up to Gemini after explicit learner action; the feature does not save written response or feedback. If AI is unavailable or the learner does not opt in, use the authored self-review criteria. AI feedback is formative and not a numerical grade.

## Verification
17 regression cases are wired into CI and npm prebuild. An independent JavaScript harness using the committed logic with TypeScript annotations removed passed 13 behavioural cases and 4 static integration checks. This is not the native Node suite, full type-aware Next.js build, or a browser test.

## Acceptance before production
1. Verify native regression tests and a full type-aware Next.js build.
2. With disposable learner accounts, complete a pair, refresh and sign in on a second browser. Verify saved history, new recommendations, a missed transfer, delayed review due enforcement and account isolation.
3. Verify expired practice-account handling, origin rejection, duplicate submissions, save retry, user_state RLS, and actual cloud evidence import.
4. Check optional Gemini feedback, follow-up and unavailable-provider fallback with a test learner. Verify privacy information, export, deletion/retention and absence of raw response persistence by the feature.
5. Check keyboard navigation, mobile layout and assistive technology. Subject-expert review should confirm item quality before wider school use.

No new database migration is required. Further subject depth, objective extended-response marking, and unlimited spaced practice remain future expansion opportunities.

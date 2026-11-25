# Phase 11: academic coaching — first increment

## Scope
The existing Tutor Command Centre already has planning, progress records, weekly execution loops, and AI tutor tools. This change adds a focused, deterministic diagnose → explanation → fresh transfer cycle, visible on Tutor and Student Home. It does not introduce another chatbot or use an AI answer as an authoritative grade.

- Eight original exercise pairs (16 questions) across inference, testing explanations, quantitative interpretation and adaptation to evidence.
- Select unfinished practice using dated same-course Phase 8 interview observations (not factual-correctness labels), real full-paper quantitative section results, and earlier missed transfer questions. Insufficient evidence results in an explicit baseline.
- A first completed pair is saved to the signed-in learner's existing user_state records, keyed by exercise, with no raw response text. Existing self-service data export includes user_state. No new database migration or AI provider key is required.
- Server grades known exercise IDs and integer choice indexes, rejects unknown IDs, uses authenticated account identity and ordinary RLS client. Duplicate writes are ignored. Browser state is cleared on account change.

## Acceptance before production
1. Verify 11 regression tests and a full type-aware Next.js build.
2. With a disposable learner: complete diagnostic, lesson and transfer; refresh and sign in on a second browser; verify history persists, next exercise differs and a missed transfer prioritises a second example.
3. Test another account and signed-out requests; neither should expose the first learner's practice. Verify origin rejection, duplicate submissions, save failure/retry, and real user_state RLS.
4. Verify real saved interview and paper results are reflected after existing cloud sync; if cloud state is absent or outdated, do not claim a confirmed weakness.
5. Confirm the coach record appears in subject access export and is included in account deletion/retention handling. Test keyboard, mobile and assistive technology use.
6. Add larger subject-specific diagnostic banks and extended-response/AI dialogue only after quality review. This increment is finite, generic reasoning practice rather than a complete adaptive AI curriculum.

Do not label a single correct transfer response as mastery, independent academic improvement, or admissions likelihood.

# Phase 5 — Course-specific interview pathways

## Delivered

- 17 distinct practice-interview pathways: Mathematics, Computer Science, Physics, Engineering, Chemistry, Medicine, Biology, Psychology, Law, Economics, PPE, History, English Literature, Philosophy, Geography, Languages/Linguistics, and general academic reasoning.
- Curated academic opening problems with reasoning guides, concepts and follow-up probes.
- Ten reasoning-linked follow-up categories per pathway: clarification, justification, verification, revision, assumption, prediction, alternative, stress-test, transfer and synthesis.
- Course-level routing ahead of broad track routing, including combined courses and common Oxbridge course naming.
- Distinct academic panel roles for course specialties, separate from the generic subject-family roles.
- Integration in the formal interview room, Reasoning Studio, Gemini Live Next, the compatible Gemini Live entry and their secure APIs.
- Open-ended subjects explicitly avoid presenting a sample interpretation as the sole correct answer. Correctness should not be based only on similarity to a sample guide.
- The existing broader academic question bank and application-context questions remain available.

## Quality gates and limitations

1. Run `npm run test:interview-subjects`, `npm run test:interview-followups`, `npm run test:interview-memory` and all prior interview regression suites.
2. Run a complete Next.js production build and browser interview E2E tests on the merge target.
3. Ask subject specialists to review the pathway prompts and sample reasoning. In particular verify quantitative claims, ambiguity in scenarios and the fairness of student follow-up questions.
4. Run a full candidate rehearsal in Mathematics, Physics, Medicine and Law, including wrong but thoughtful answers, justified corrections, uncertainty, different defensible interpretations and live voice interactions.
5. Validate actual Gemini Live prompt adherence and record transcript continuity; unit tests alone cannot guarantee its spoken behavior.
6. The openings are FELLOW-authored practice scenarios; do **not** claim they are actual Oxford or Cambridge interview questions or official marking criteria.
7. The `Different problem` control in typed modes alternates between a course-authored problem and the established broader subject bank. More course-specific starter variations can be added later.
8. Keep student feedback formative. Require school privacy, access controls and account-scoped transcript persistence before treating this as school-ready.

## Release sequence

Open a review PR based on `main`; the existing phase 2–4 changes have already been merged. Do not claim that Phase 5 is live until CI, production build, subject review and Vercel deployment are verified.

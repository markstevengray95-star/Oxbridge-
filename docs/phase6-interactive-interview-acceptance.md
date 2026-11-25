# Phase 6 — Interactive academic interview challenges

FELLOW's original practice content is not drawn from Oxford/Cambridge papers and is not university-approved admissions scoring.

## Delivered

- **17 course-aligned evidence challenges**, each with three sequential exhibits (51 total).
- Interactive SVG graphs with per-series visibility controls and an accessible numeric data table; tabular data, invented text extracts and changed scenarios are also supported.
- Evidence is initially concealed, then released on demand. A candidate must submit a response before opening each next exhibit.
- Shared staged-evidence experience in the formal academic interview room, Reasoning Studio and Gemini Live Next.
- The next exhibit becomes a new interviewer question; AI routes only receive the evidence already released, validated against the selected course and the transcript.
- Written notes support the typed interviewer; freehand canvas strokes are **not automatically interpreted or scored**.
- Gemini Live Next receives the new exhibit as a new conversational turn, and on a fresh-token reconnect it reintroduces previously revealed exhibit content.
- Evidence answers are **not compared with the original starter problem's model answer**. The reasoning rubric remains formative.

## Acceptance tests

1. **Physics:** Reason that, at fixed vertical drop with negligible friction, travel time scales with slope length while final speed is approximately constant; then challenge the model with friction. Confirm the graph units, positions and data table.
2. **Medicine:** Use the initial recovery counts, then observe baseline imbalance and a small randomised study. Do not turn fictional data into clinical advice.
3. **Law/History/Literature:** Test multiple defensible interpretations, not agreement with a single sample answer. Verify that source provenance and new facts change the next question.
4. **Maths/Computing:** Probe proof and algorithmic complexity rather than simply awarding the numerical or final answer.
5. **Chemistry/Biology/Psychology/PPE:** Check realistic causal or experimental confounders, reaction-rate relationships and ethically relevant assumptions.
6. **Reveal control:** Start an interview, try revealing before any answer (must be disabled), answer once, reveal exhibit 1, try skipping to exhibit 3 (not allowed), answer and reveal exhibit 2, then exhibit 3.
7. **Model context:** Verify that a turn after exhibit 1 does not include exhibit 2 or 3 in its model prompt. Try forged challenge IDs, wrong-course IDs, missing exhibit questions and invalid stages; all should be rejected.
8. **Working notes:** Write a counterexample/equation before a typed answer; confirm the API receives the notes labelled as *unverified student working*, not an automatically interpreted drawing.
9. **Voice:** In Gemini Live Next reveal an exhibit, discuss it, interrupt the interviewer and disconnect. After resuming, check that its stage and released data are restored without sending future exhibits.
10. **Accessibility/mobile:** Check SVG series toggles, tabular alternatives, reading order, keyboard interactions and canvas controls on Android and desktop.
11. **Performance/security:** Confirm all datasets are bounded, no student data are sent as untrusted model instructions, account-scoped logging follows the existing approved privacy policy and no private files are exposed.
12. **Build/release:** Run `npm run test:interview-evidence`, other interview regression suites, full type-aware Next.js production build, Vercel preview and a manual interview across at least four academic courses.

## Limits

- These datasets are **illustrative, invented numbers**, not published measurements, historical sources, trials or legal precedents.
- Graph controls allow series selection, not editing raw experimental data.
- The 17 challenges provide one staged case per course pathway. Later phases may add variety, teacher-authored question authoring, richer direct manipulation and validated multi-session feedback.
- Explicit written reasoning is evaluated. The canvas drawing itself is not automatically reviewed by the model.
- Live voice audio, WebSocket recovery and device access require real browser/device testing. Unit tests cannot prove spoken quality.
- Phase 6 is stacked on Phase 5 (PR #95); production must not be claimed until both are merged and Vercel is healthy.

# Phase 7 — full-length mock academic interviews

## Features implemented

- Launch page at `/full-mock-interview` linked from the Interview Hub.
- Five FELLOW practice formats: **5, 15, 25, 40 and 60 minutes**.
- Three entry modes: the Formal Interview Room, Reasoning Studio and Gemini Live Next.
- Academic stage scheduling based on approximate elapsed time **and** the candidate's completed answers. Stage changes never interrupt an unfinished spoken or written answer.
- Long sessions (40 and 60 minutes) include a genuinely distinct second academic problem and a second interviewer perspective. The typed rooms introduce the second problem on stage handover; Gemini Live has an explicit second-problem button.
- Subject-specific Phase 5 prompts, reasoning-first feedback and Phase 6 interactive evidence remain available in the underlying interview rooms.
- Timed reports record real elapsed duration, target length, candidate-answer count, covered academic stages and partial versus complete status.
- Reports are formative FELLOW practice diagnostics, **not** official Oxford/Cambridge admissions marking or interview timetables.
- Longer Gemini Live sessions include an optional planned reconnection after approximately 24 minutes because Gemini Live credentials are short-lived. Reconnection preserves the current browser transcript and elapsed time; it does **not** provide audio continuity.

## Testing executed in an isolated sandbox

- `node --experimental-strip-types --test tests/full-mock-interviews.test.mjs`: **14/14 passing**, including duration validation, stage gates, avoidance of skipped stages, second-problem handover, overrun handling, honest partial completion, typed API and UI wiring, Gemini token instructions, reconnect UI and launch links.
- **9/9 changed TS/TSX files passed independent TypeScript transpilation/syntax checks**. This is not a full type-aware Next.js build.

## Manual acceptance criteria before merge/release

1. From the Interview Hub open the full mock page. Confirm every duration and each typed/voice button loads the requested preset.
2. Run the **5-minute formal** format: answer slowly, wait through a planned stage time, and check the interviewer does not interrupt mid-response.
3. Run a **15-minute reasoning** format: test an incorrect but thoughtful answer and a later justified correction. Neither should receive a rote correctness verdict.
4. Run a **25-minute full mock**, with and without interactive evidence. Confirm only already-revealed exhibits reach the model and that feedback matches the current problem.
5. Run **40- and 60-minute** mocks: verify that the second problem is different from the first, its earlier hints and evidence are reset, and the candidate can return to the final synthesis.
6. End a session early: the report must identify it as partial, with accurate elapsed time and stage coverage; no full completion badge.
7. Finish after the target duration and academic synthesis, then ensure the report accurately reflects the achieved stage coverage and session duration.
8. With Gemini Live, test a real microphone and audio session, interruptions, silence, and a complete conversation; the model must respect the selected stage without speaking rehearsed or canned feedback.
9. For a long voice mock, use the planned secure reconnect after about 24 minutes. Check the transcript, course, elapsed clock and previously revealed evidence survive the new token. Do not assume an uninterrupted 60-minute socket.
10. Use Android and a desktop browser, including slow network and microphone permission denial. Check the UI stays usable and a lost connection does not falsely mark completion.
11. Run the full dependency install, type-aware TypeScript check, Next.js production build, browser E2E, security audit and Vercel production deployment. Stacked PRs must be merged **Phase 5 → Phase 6 → Phase 7** in that order.
12. Have subject experts review the substantive problems; keep child-data privacy and safeguarding requirements in place. Account-wide transcript tracking and teacher dashboards are planned for a later phase, not completed here.

## Limitations

- This is a structured *practice simulation*. Specific college/university departments vary in interview length, format, subjects and use of panels. No timetable here should be marketed as an official Oxford or Cambridge admissions schedule.
- Dynamic Gemini Live behavior still requires real live-device verification. Static tests establish code wiring, not the spoken interview's quality.
- Current saved mock reports use browser-local progress/replay storage. They are not guaranteed to sync to a different device or teacher account.
- Gemini Live credentials have a shorter validity window than long mocks, so 40-/60-minute voice sessions rely on controlled reconnects rather than a claimed uninterrupted stream.
- The remaining full-app CI and Vercel issues must be resolved before Phase 7 can be considered deployed.

# FELLOW Phase 4 — Live Interview Voice Acceptance Checks

The changes in this release apply to both `/gemini-live-next` and the Gemini Live interviewer accessed from `/ai-interview`.

## Automated verification

Run `npm run test:live-conversation`. It covers turn-end pacing, transcription merging, local interruption detection, microphone backpressure, bounded resume prompts and disconnection messages. This is **not** an end-to-end test against Gemini's live service.

## Manual browser acceptance tests

1. **Setup and permissions:** Start a new interview from desktop Chrome and Android Chrome. Check the microphone permission flow, audio quality, and that the token/API key is never logged or displayed. Verify no playback is heard from a previous session after restart.
2. **Thoughtful pauses:** Select Thoughtful. Answer a question with a 1–2 second thinking pause in the middle. The interviewer must not treat that pause as the end of the answer. Repeat with Natural and Quick to check sensible responsiveness. Test accents, quiet speech, and short hesitations without inferring reasoning ability from speech style.
3. **Barge-in:** While the interviewer is audibly speaking, say "Could you repeat the last part?" and continue. With interruptions enabled, playback should stop cleanly after sustained speech and the interviewer should address the clarification. A brief background noise or throat-clear should not cancel a turn.
4. **Transcripts:** Speak multi-part answers and deliberately use repeated phrases. Verify the resulting candidate/interviewer turns contain no duplicated cumulative transcription chunks, no missing end-of-turn answers, and preserve spoken words before an interruption. Treat transcription as best-effort and allow students to report errors.
5. **Network dropout:** Disconnect and reconnect Wi-Fi during an interview with at least two full candidate turns. The main Live Next interface should offer Resume and Save & finish. Resume must use a new secure session and carry forward relevant earlier reasoning instead of restarting the first question. Do not claim this is a seamless transport reconnect: it starts a fresh session with a bounded transcript recap.
6. **Finish/debrief:** Press Finish while speaking, while the interviewer is speaking, and during a stalled connection. Confirm outstanding text is retained, the final debrief ends the interview, and a transcript/replay is saved locally even if the debrief times out.
7. **Alternate Live entry point:** Start a voice interview via `/ai-interview`; verify thoughtful pacing and candidate interruption. Simulate a failed connection and confirm the compatible interviewer appears with the voice transcript still visible in an expandable record.
8. **Multiple sessions:** Start, finish, then start another interview on the same browser. Confirm audio resources are closed and no earlier audio or transcript appears in the new session.
9. **Fairness and privacy:** Do not use speech fluency, accent, speaking speed or silence duration as an admissions-quality proxy. Avoid testing with real minors' data without the school's approved privacy/consent process.

## Release gates

- The targeted tests and the existing interview regression suites pass.
- The full Next.js type-aware production build and browser authentication/E2E checks pass.
- A human completes at least one 20–30-minute realistic interview, including a deliberate interruption and a network dropout.
- Confirm the production Vercel deployment is healthy **before** claiming the voice feature live.

## Known limitations

- Browser audio device support and service-side turn detection vary by browser and Gemini Live model; the above cases require physical-device validation.
- Resume retains the recent transcript and restores academic context through a new Live token. This is **not** bit-for-bit audio stream resumption and may consume a new session allowance.
- Interview transcript persistence in the main Live Next flow is currently browser-local; the school/account-wide tracking work is a separate release.

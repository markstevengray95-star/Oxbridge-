# Phase 9 — Account-linked student, teacher and school tracking

## What was already present (and reused)

- Supabase Auth users, managed practice usernames, expiry/archival, teacher usernames, school membership/seat assignments, `school_staff_roles` and `school_teacher_student_links`.
- Student-owned `user_state`, `test_results`, `interview_sessions`, `interview_turns` and existing Orbits usage-session records.
- Existing platform-admin practice tracking and teacher roster. **We do not make new accounts, reset trial passwords, or generate a second identity for the learner.**

## Defects repaired

1. The newer voice client saves `Gemini Live Next · <course>`, while two cloud import paths only recognised older `Gemini Live Interview` records. Both now import the new title.
2. Panel speakers (`Interviewer A` / `Interviewer B`) and multiline candidate/interviewer responses are now recognised by cloud history importers.
3. Saved standard voice interview duration is now written to progress logs; mock and typed session durations are also passed to the account-owned `interview_sessions.duration_seconds` records.
4. Existing telemetry no longer transmits query parameters, or dynamic route identifiers, when reporting FELLOW sections.
5. The teacher roster treats missing recent activity as worth following up. Ordinary profile changes are not counted as evidence of active learning.

## New teacher and school capability

- School owner and active `school_admin` can see current members with active student seats. Ordinary teachers see only learners explicitly assigned through `school_teacher_student_links`.
- `/teacher-dashboard` opens `/teacher-student-progress?studentId=<uuid>`.
- `GET /api/teacher/student-detail` derives the viewer from their validated Supabase session, derives the organization from verified server-side staff scope, verifies active organization, student seat and membership, excludes other staff, and for teachers requires the exact student link. A user-supplied organization or teacher ID cannot override this.
- **Every permitted detailed read is recorded in `fellow_school_student_access_audit` before querying private transcripts, question reviews, or usage. Audit failure blocks detailed access.**
- The response includes account username where applicable, last sign-in time, last recorded activity, exact database totals for tests and interview sessions, recent test results and bounded question reviews, recent interview transcripts, feedback priorities, recorded interview duration, app page categories and recent estimated visible-tab activity.
- Only selected, bounded test payload fields are returned. No student health notes, unrelated account state, query strings, external browsing history, AI model credentials or private chat history are included.
- The former platform-wide practice tracking remains separate; school roles never grant access to `/admin`.

## New telemetry and database change

Apply `supabase/migrations/20261124_fellow_school_tracking_events_and_access_audit.sql` to the correct FELLOW Supabase environment before deploying the code. This creates service-role-only, RLS-enabled:

- `fellow_learning_activity_events`: authenticated, eligible student accounts only; named on-site learning sections and `visit` / `heartbeat` timestamps; 0–30 visible-tab seconds per heartbeat; recent duplicate suppression
- `fellow_school_student_access_audit`: organization, staff user, student user, resource and timestamp for authorised detailed access

The browser does not send raw usernames, student IDs, URL parameters, unrelated device activity, keyboard activity or answers to the telemetry endpoint. Time **is an estimate, not proof of engagement**. Recent records are bounded for performance, and legacy telemetry may be incomplete.

The updated student data export includes these two new record types. The privacy notice identifies school tracking and authorised staff access.

## Verification performed

- Phase 9 independent policy and data minimisation tests: **22 passing** before the final multiline importer guard; that guard is now added to the CI suite.
- **19 updated TS/TSX application files** passed independent TypeScript parsing/transpilation checks.
- **Three pure policy/data modules** passed strict independent `tsc --noEmit`.
- CI now runs `npm run test:school-tracking`.

### Manual security and functional acceptance (required)

1. Apply the SQL migration in a controlled test environment. Confirm neither the `anon` nor `authenticated` role can select, write or delete directly from either service-only tracking/audit table.
2. Create a new practice student username; record its **actual Supabase user ID**. Attach the account to a school with an active seat. Create a managed teacher username and link the existing student to that teacher. Do not duplicate the student profile.
3. Sign in as the student and complete a 15-minute practice, a full exam paper and a multi-paragraph Gemini Live interview. Verify both `user_state` and structured `test_results` / `interview_sessions` / `interview_turns` are saved **with the same user ID**, the original transcript, its answers, result and actual session duration.
4. Sign in as the linked teacher. Verify the roster shows that learner, open their detail, confirm their work and that the access audit recorded the teacher, learner, school and timestamp.
5. Sign in as a different teacher at the same school **without the link**. A direct request with the student UUID must be denied even if the UI URL is manually changed.
6. Sign in as a teacher/owner from a different school. Confirm cross-organization access to this student is denied, with no transcript or result returned.
7. Disable the teacher role, unlink the student, or deactivate the student's school seat. Repeat the direct student-detail request to confirm access is revoked immediately.
8. Expire a managed student login. Confirm sign-in is blocked, while existing assessed work is preserved and visibly marked as inactive to authorized staff.
9. Check the owner and school-administrator roles only see active students of their school, not students of other schools or another school's staff.
10. Use FELLOW for a few visible minutes, then switch away or minimize the tab. Verify the event stream records only whitelisted learning sections, no query parameters, and stops the visible-time heartbeats on a hidden tab. Confirm no activity is collected for non-managed/non-school ordinary users.
11. Verify a learner who has signed in but completed no saved work has a recorded sign-in time when the detail is opened. A missing activity record must never be shown as proof of no practice.
12. Check the new teacher detail view on laptop and Android and verify latest-row limits, accurate total counts, basic keyboard navigation, no unexpected timeouts, and clear incomplete-data warnings.
13. Check data subject export and account deletion. Verify activity and audit records honour approved privacy retention / deletion handling, including cascade behavior.

### Deployment, legal and privacy release gates

- Merge the stacked branches **Phase 5 PR #95 → Phase 6 PR #96 → Phase 7 PR #97 → Phase 8 PR #98 → Phase 9 PR #99**, then apply the SQL migration and verify a healthy Vercel production deployment. The exact PR number should be confirmed when created.
- Restore green app CI, full type-aware Next.js build, browser E2E, database integration tests and representative real-device Gemini voice interviews.
- Approve the school's DPIA / data processing roles and controller notices, staff access expectations, safeguarding policy and child-appropriate transparency. Under UK GDPR and the ICO Children's Code, do not rely on technical access checks alone to assert school readiness.
- **A production retention job is not installed by the SQL migration.** Establish and test a dated retention/deletion schedule (e.g. 90 days for raw activity, separately approved schedule for school access audit) before school rollout.
- Add periodic reconciliation/alerts for missing account sync and telemetry failures, ensuring missing cloud data is not mistaken for a student not working.
- Have a subject expert and safeguarding lead review the report contents. Do not claim that estimated time equals active academic engagement.

## Not yet verified

- No complete production database integration test or end-to-end account link has been run against real school/student logins.
- No confirmed live Vercel production release of Phases 5–9.
- No automated retention job, external penetration test or full safeguarding/legal approval yet.

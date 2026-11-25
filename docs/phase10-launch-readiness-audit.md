# Phase 10 — FELLOW launch-readiness and reliability audit

**Date:** 24 November 2026  
**Current decision:** **NO-GO for public school/pupil deployment, paid launch or declaring Phases 5–10 live.**  
**Scope:** GitHub `markstevengray95-star/Oxbridge-`, FELLOW Supabase database project `emjmvgginijkupwuflla` (shared), and Vercel `oxbridge-m6hq`. This document records verified checks, not security certification.

## 1. Verified work completed

### Real build blocker repaired
- A recent Vercel preview build reported **`TS18047: 'mock' is possibly 'null'`** in `components/cloud-progress-sync.tsx`.
- Phase 10 changes `Number(mock.elapsedSeconds)` to `Number(mock?.elapsedSeconds)`. The change is committed. **Full type-aware Next.js build on the fixed branch remains unverified**, because preview deployments are queued/rate-limited and GitHub Actions jobs have failed before reporting steps.
- Preview logs examined: `oxbridge-m6hq-f7kjkqhho-m-dff0.vercel.app` on Phase 9 commit `85a2120`.

### Production dependency remediation
- Original independent `npm audit --omit=dev --json`: **4 high/critical findings** (1 critical: Next.js; 3 high: Sharp, source-map-js, Zod). These are from the lockfile, not a confirmed exploit of FELLOW.
- Phase 10 updates **Next.js 16.3.8 → 16.4.6**, **Zod 3.25.76 → 4.6.7**, patched **Sharp 0.35.5** override and **source-map-js 1.2.2** override. `package-lock.json` updated using the exact resolved package versions and integrity metadata from a clean npm resolution.
- In an isolated sandbox with these versions: `npm ci --omit=dev --legacy-peer-deps --ignore-scripts` **succeeded** (216 production packages, on Node 24, while the app specifies Node 22); `npm audit --omit=dev` reported **0 vulnerabilities**. The *complete dev-dependency audit* was not completed; repeat in healthy CI.
- Zod 4: 5 targeted checks passed covering valid/invalid input, length limits, report structure, exact quotes and fabricated-quote rejection. `lib/writing/review.ts` passed independent **strict TypeScript checking**.
- The complete Next.js build, browser E2E and compatibility with all other transitive dependencies must still pass in Node 22 CI before merge. **Do not equate a clean dependency audit with a proven secure application.**

### New automated release gate
- `node scripts/phase10-release-gate.mjs` checks patched dependencies and lockfile, RLS/service-only migrations, audited teacher reads, cloud sync null safety, URL minimisation, and regression checks. **12/12 static checks passed** in the isolated sandbox.
- `npm run test:launch-readiness` runs 5 security and Zod 4 regression tests. **5/5 passed**.
- Add `--strict-env` to enforce required production environment settings, test-mode prohibition and public-secret-name guard without printing values.
- Add `--live-url=https://<approved-domain>` to verify public pages, health response and anonymous school-data denial. Live smoke requires operator-run access to the actual deployed domain.

### Phase 9 Supabase migration applied and checked
- Applied the additive migration `20261124_fellow_school_tracking_events_and_access_audit.sql` to `emjmvgginijkupwuflla` using the connected Supabase deployment tools.
- **Verified via live SQL**: `fellow_learning_activity_events` and `fellow_school_student_access_audit` now exist; both have RLS enabled; `anon` and `authenticated` have **no direct SELECT or INSERT** grants; `service_role` has SELECT.
- These tests establish table/grant configuration, **not** an end-to-end teacher/student account test. As Phase 9 app code is not yet deployed on main, the tables alone do not activate tracking.

## 2. What the tracking data actually shows

Read-only aggregate query for currently active managed student practice accounts:
- **8** accounts active.
- **4** have at least one saved FELLOW usage session; **2** have saved interview records.
- **0** have a structured cloud-saved test result.
- **6** have some cloud `user_state` records.

These are **database facts, not conclusions about individual users' effort**. They could indicate no attempts, unsaved browser-local work, sync bugs, or partial historical instrumentation. Do not tell a teacher that an account has never been used on this evidence alone. Acceptance requires a controlled real account lifecycle, detailed below.

## 3. External CI / deployment status (blocking)

- The Phase 9 head reported **three failing GitHub Actions workflows**: `Verify app`, `Security audit`, `Browser E2E`. Their jobs had **no steps available**, and the workflow job logs returned `404 BlobNotFound`; the underlying cause could not be established from the available GitHub API. Check GitHub Actions usage/billing, runner allocation, workflow permissions and run annotations in the repository UI, then re-run.
- The Vercel production deployment list was still on an older commit from Phase 4, **not Phase 5–10**. Newer preview deployments have been failing or queued; Vercel has reported a Hobby **build-rate limit**.
- **Do not merge the stacked branches or claim production readiness until:** fully green locked install + production audit + Next build + Playwright E2E + representative voice testing + school database integration and authorized staff tests.
- Merge ordering: **#95 → #96 → #97 → #98 → #99 → Phase 10 PR**. Recheck head SHAs and branch protections on each merge. Run the production release gate and compare the deployed Git SHA to the intended main SHA.

## 4. Security and privacy findings that remain open

| Gate | Current verified position | Required action |
| --- | --- | --- |
| Shared Supabase privileged RPCs | Security Advisor reports **99** authenticated-executable `SECURITY DEFINER` functions and **1** anonymous-executable function, largely shared with SPARK/A-level services. This warning does **not** by itself prove vulnerability. | Audit actual callers, roles and authorization of **each** high-privilege function; revoke/switch only after cross-product tests. Do not blanket-revoke functions on a shared database. |
| Leaked-password protection | Supabase Security Advisor reports it disabled. | Enable if plan supports, review password policies and test practice-login flows. |
| FELLOW child-data handling | School-student transcripts and activity involve under-18 data; Phase 9 access checks are added but no real-user E2E completed. | Complete DPIA, school DPA, documented controller/processor roles, safeguarding sign-off, age-appropriate monitoring notice, data-subject access/erasure tests. |
| Activity retention | Table migration does **not** schedule automatic deletion. | Approve and implement a tested retention mechanism for learning activity (e.g., 90 days if justified) and an appropriately documented audit-log retention period. Validate erasure and contractual offboarding. |
| Operator identity | Vercel production environment metadata lacks **`NEXT_PUBLIC_DATA_CONTROLLER_ADDRESS`**. | Supply the real controller/trader correspondence address and reconcile with Privacy/Terms. Do not invent one. |
| Account linkage and sync | Some managed accounts have cloud records but no saved exams/interviews. | Test actual student and teacher session IDs, full paper saving, voice sessions and transcript import, dashboard display and error alerts. |
| Third-party dependency review | Patched production npm tree is clean in an isolated audit, but full app build not verified. | Re-run CI and consider external dependency scanning/penetration test on deployed code. |
| Backup/recovery | No verified restore exercise in this Phase 10 audit. | Confirm available PITR/backups, retention and conduct a documented recovery drill. |
| Paid checkout | User deliberately currently operates FELLOW free for trials. | Keep payments off until legal/payment lifecycle and correct operator identity have been verified. |

Supabase remediation references:
- [Privileged authenticated RPC advisor](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable)
- [Anonymous privileged RPC advisor](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable)
- [Leaked password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)

## 5. Mandatory real-account release test

Use disposable accounts and **no real pupil data**:

1. Create a temporary managed student practice login; verify unique Supabase Auth user ID and browser account isolation. Attach to a test school, ensure an active school seat, create teacher login, link the **same** student ID. Record the identifiers privately.
2. Have the student sign in, navigate learning pages for a short visible period, complete an admissions-test practice paper and run both a typed mock and a Gemini Live mock. Record expected marks, actual duration and sample (non-sensitive) transcript turn counts.
3. Verify `test_results`, `interview_sessions`, `interview_turns`, and `user_state` use the same student user ID; check Phase 8 feedback and transcript exactness in the student's own account.
4. Log in as the authorized teacher; check summary + detail reflect results and each transcript, the test question review, last sign-in, and bounded app usage. Check access audit.
5. Repeat direct API request with (a) an unlinked same-school teacher, (b) a different school's teacher, (c) an inactive seat, and (d) a revoked teacher role. All must be denied without returning protected data.
6. Confirm history survives logout and a different device with the same account, but never appears in another student's account.
7. Disable or expire a practice login and confirm work remains preserved but access is revoked. Verify student export and deletion; check retention.
8. Verify 5-, 15-, 25-, 40- and 60-minute formats, a planned voice reconnect, audio denial and network interruption, and honest partial vs complete session reports.
9. Test public pages, production headers, login, support, Privacy Centre and safeguarding flows in a mobile and desktop browser; capture a screenshot/video of the result.
10. Deploy only after the above and legal/safeguarding sign-offs; retain a rollback release and monitor post-deploy errors without storing sensitive content in logs.

## 6. Reproducible commands

```bash
npm ci --legacy-peer-deps
npm audit --omit=dev --audit-level=high
npm run test:school-tracking
npm run test:interview-feedback-intelligence
npm run test:launch-readiness
npm run build

# After setting actual production environment variables locally:
node scripts/phase10-release-gate.mjs --strict-env

# Against the approved production domain:
node scripts/phase10-release-gate.mjs --live-url=https://<approved-fellow-domain>
```

**Final decision remains NO-GO** until source, infrastructure, data, human approvals and real-device verification jointly pass. It would be misleading to call the site secure or school-ready on the strength of isolated tests alone.

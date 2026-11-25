# Phase 16 release-readiness register

## Verified against the live database (25 November 2026)
- The 21 inspected school, pupil and account-state tables have RLS enabled and no direct anonymous SELECT grant. Service-only school and activity tables have no authenticated SELECT grant. Own-user policies on profiles, user_state and student_intelligence require the authenticated identity for reads and writes.
- All five inspected oxbridge-prefixed SECURITY DEFINER functions deny anonymous and ordinary authenticated EXECUTE.
- The database is shared with other products; no broad privilege revocations were applied. Shared-project security advisors still report exposed SECURITY DEFINER functions and leaked-password protection, and performance advisors report foreign-key/index and policy concerns. These need separate reviewed remediation.
- This is a metadata audit, not an external penetration test or authenticated cross-school integration test.

## Code changes
- School writes validate origin and bounded JSON payloads; student views omit cohort join codes. Sensitive school responses are not cacheable. Assignment deletion reports actual database errors.
- Privacy requests validate origin and bounded JSON and avoid logging raw database errors.
- Preparation pathway uses the actual stored 2027 requirement reference date; unverified future cycles must not inherit old deadlines.
- Release gate checks private account-scoped academic endpoints and all five recent regression suites, plus optional live unauthenticated API denial.

## Release blockers and evidence required
- Verify a full native build, all regression suites, production dependency audit and browser E2E. Earlier GitHub jobs failed; log downloads returned 404, so root causes remain unknown.
- Confirm deployment READY and production domain points to the exact integrated commit. Previous production was b9efe18. Vercel previously reported a daily deployment limit and commit-author membership rejection. Do not mark a branch push as a deployment.
- Run two disposable student accounts and two independent school/teacher fixtures: targeted assignments, reflection, progress, teacher link removal, expiry, cross-school denial, account switching, private academic report and export/deletion.
- Run 25–60 minute real Gemini voice sessions, microphone permissions, reconnect, image interpretation, API error and provider fallback. Run real browser full timed papers and mobile/keyboard/assistive technology checks.
- Conduct a controlled load test in a staging environment (not the live pupil service); measure latency, errors and concurrency. Do not claim performance capacity from advisory metadata.
- Verify actual backup availability and restore to an isolated environment; document recovery objectives, retention, and recovery test results. No production restore was attempted.
- Confirm controller identity/address, school DPIA and processor agreements, age-appropriate notice, safeguarding, deletion/retention and data export (including third-party data review), and leaked-password protection. Obtain independent penetration testing before wider school rollout.
- Saved student practice evidence is formative and may be client-editable; do not use it as verified exam attainment.

## Rollback
Keep the last known READY production deployment until the new build passes. If a release breaks production, use Vercel rollback to the known-good deployment and verify domain alias and key routes. No destructive DB migration is required for phases 11–16.

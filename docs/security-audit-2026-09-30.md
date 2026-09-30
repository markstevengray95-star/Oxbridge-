# ScholarBridge launch security audit — 30 September 2026

**Scope:** Oxbridge-/ScholarBridge application code and the production Supabase project `emjmvgginijkupwuflla` where accessible through authorised tooling.

**Outcome:** No confirmed ScholarBridge cross-account data exposure or browser-accessible privileged table was found in this pass. A small number of account/provider controls still require the account owner to complete in provider dashboards before commercial launch.

## 1. Database access-control checks

### Browser-granted tables without RLS

Production query result: **zero** public tables had `anon`/`authenticated` table grants while row-level security was disabled.

This is the most important broad exposure check for the Supabase Data API.

### ScholarBridge server-only tables

The following ScholarBridge/internal tables were checked because Supabase Security Advisor reports "RLS enabled, no policy":

- `ai_request_buckets`
- `ai_request_leases`
- `human_review_orders`
- `practice_access_accounts`
- `school_assignment_progress`
- `school_assignment_submissions`
- `school_assignments`
- `school_cohorts`
- `school_memberships`
- `school_seat_addons`
- `stripe_checkout_fulfillments`
- `stripe_webhook_events`
- `usage_events`

Verified production state on 30 September 2026:
- RLS enabled: **yes** for all listed tables.
- RLS policy count: **0** as expected for the server-only model.
- direct `anon` grants: **none**.
- direct `authenticated` grants: **none**.

Therefore the advisor finding is informational for these ScholarBridge tables: browser roles cannot reach them through the Data API. Keep this server-only pattern and do not add a permissive policy simply to silence the advisor.

### Core user-data tables

Verified live tables include:
- `student_intelligence`
- `interview_sessions`
- `interview_turns`
- `test_results`
- `memory_items`
- `user_state`
- `subscriptions`
- `legal_acceptances`
- `privacy_requests`
- `safeguarding_reports`
- `school_seat_entitlements`

These live tables have RLS enabled and policies appropriate to their client access model. The main learning tables have authenticated CRUD grants plus four ownership policies; subscription/seat data has restricted read access; privacy/safeguarding/legal tables use user-scoped policies.

Some names included in the data-export compatibility list are not production tables (`application_evidence`, `daily_challenges`, `mistake_events`, `practice_attempts`, `progress_evidence`, `study_plans`, `supercurricular`, `topic_progress`, `weekly_programmes`). They have no grants because the relations do not currently exist. The export route is designed to report unavailable tables rather than expose/fail on them.

## 2. Privileged Postgres functions

Production `SECURITY DEFINER` permissions were enumerated.

ScholarBridge privileged functions verified **not executable by `anon` or `authenticated`**, but executable by `service_role`:
- `guard_ai_request`
- `oxbridge_claim_stripe_webhook_event`
- `oxbridge_finish_stripe_webhook_event`
- `oxbridge_fulfill_live_credit_pack`
- `oxbridge_join_school_seat`
- `oxbridge_reserve_gemini_minutes`

Supabase Advisor also reports authenticated access to four `SECURITY DEFINER` functions belonging to other shared applications/features:
- `check_in_live_session`
- `complete_live_session_exit`
- `staff_development_has_org_role`
- `staff_development_is_org_member`

Those were **not changed by the ScholarBridge launch audit**, because changing shared-app permissions without validating their callers could break unrelated products. Their owning project should review whether authenticated execution is intentional.

## 3. Application authorization and browser tests

Existing CI already includes:
- privileged API authorization audit;
- non-admin AI access regression tests;
- cloud/private history checks;
- School route/roster/targeted-assignment isolation checks;
- AI request guard checks;
- production type-aware build;
- real Chromium browser journeys including authenticated route/session persistence.

Keep `.github/workflows/verify.yml` and `.github/workflows/e2e-browser.yml` required for launch branches where possible.

## 4. Security headers

`next.config.ts` globally configures:
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `X-Frame-Options: DENY`
- a restrictive `Permissions-Policy` (geolocation disabled; camera/microphone/payment scoped)
- HSTS with a one-year max age and subdomains
- `Cross-Origin-Opener-Policy: same-origin-allow-popups`

A Content-Security-Policy was **not added automatically in this audit**. ScholarBridge integrates browser/server flows involving Next.js, Stripe and voice/AI features; a restrictive CSP should first be tested in staging/report-only mode so it does not silently break checkout, auth or live interview functionality.

## 5. Repository secret scan

GitHub code search was checked for common committed-secret prefixes/patterns including:
- `sk_live_`
- `sk_test_`
- `AIza`
- `sb_secret_`

No matches were found in the repository in this pass.

This does not replace GitHub secret scanning or provider-side credential review. Enable GitHub secret scanning/Dependabot/security alerts where available, and rotate any credential that has ever been pasted into public code, logs or tickets.

## 6. Billing and entitlement controls

Verified code/previous production hardening includes:
- Stripe webhook signature verification;
- atomic webhook event claiming/finishing to prevent duplicate side effects;
- idempotent live-credit fulfilment by Checkout Session ID;
- server-side plan/amount selection;
- anonymous checkout rejection;
- School seat and Gemini usage operations behind server/service-role boundaries;
- no full payment-card storage in ScholarBridge.

Keep Stripe test/live keys separated and verify the production webhook endpoint after any domain or secret rotation.

## 7. Supabase Security Advisor — remaining items

### Leaked password protection — action required

**Current production finding:** Supabase Auth leaked-password protection is disabled.

Current Supabase guidance recommends preventing use of known compromised passwords; the feature is available on supported paid plans. Enable it in Supabase Auth settings if the current plan supports it, then rerun Security Advisor.

Reference: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

### RLS enabled/no policy — reviewed

For the ScholarBridge server-only tables listed above, the warning is expected because `anon`/`authenticated` grants are revoked. Do not add client policies unless the product architecture changes.

Reference: https://supabase.com/docs/guides/api/securing-your-api

### Shared-app SECURITY DEFINER warnings — separate owner review

The four non-Oxbridge functions listed in section 2 should be reviewed in the products that own them. They are outside this ScholarBridge release change set.

## 8. Provider/account controls that cannot be truthfully verified from code

The responsible account owner must confirm before launch:
- [ ] MFA/2FA enabled on GitHub.
- [ ] MFA enabled/enforced for Supabase organisation access where appropriate.
- [ ] MFA/2FA enabled on Vercel.
- [ ] MFA/2FA enabled on Stripe.
- [ ] MFA/2FA enabled on operational email and domain/DNS accounts.
- [ ] Supabase leaked-password protection enabled if the plan supports it.
- [ ] Supabase email confirmation enabled and OTP expiry/rate limits reviewed.
- [ ] custom production SMTP configured if required for reliable auth email delivery.
- [ ] SSL enforcement and database network restrictions reviewed in Supabase.
- [ ] backup/restore strategy confirmed; PITR enabled if the chosen recovery objective requires it.
- [ ] Vercel production environment values reviewed and access restricted to intended administrators.
- [ ] Stripe is knowingly in the intended live/test mode for launch.

These cannot be marked complete merely because the application builds.

## 9. Incident readiness

Adopt and assign owners for:
- `docs/security-incident-response.md`
- `docs/safeguarding-response-procedure.md`
- `docs/dpia-childrens-code-assessment.md`
- `docs/school-data-processing-agreement-template.md`

Run a tabletop exercise using a hypothetical cross-account transcript exposure before accepting school pupil data at scale.

## 10. Security decision

**Code/database finding:** suitable for continued launch preparation; no confirmed ScholarBridge-specific critical database authorization defect found in this audit.

**Not yet a complete security sign-off:** provider-account MFA, leaked-password protection, SMTP/auth settings, backup/recovery settings and network/SSL controls require an authorised account owner to verify in the relevant provider dashboards.

Reviewer: automated technical audit + controller review required  
Controller/technical owner sign-off: ____________________  
Date: ____________________  
Next review: after material auth/billing/database/provider change, or at least before major School rollout.

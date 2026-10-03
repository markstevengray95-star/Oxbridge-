# ScholarBridge public launch compliance checklist

This checklist is an operational launch gate, not a claim that the product is legally certified. Complete the relevant legal/security reviews for the actual business, users and school contracts before going public.

## Prepared launch evidence

The following working documents exist in the repository. They reduce launch-preparation work but **do not replace the named controller/owner's review and sign-off**:

- `docs/dpia-childrens-code-assessment.md` — child-focused DPIA / Children's Code assessment with risks, processor map, retention decisions and sign-off fields.
- `docs/safeguarding-response-procedure.md` — human safeguarding triage/escalation procedure.
- `docs/school-data-processing-agreement-template.md` — School DPA template requiring review/execution for each school relationship.
- `docs/security-incident-response.md` — security/personal-data incident and breach-response runbook.
- `docs/security-audit-2026-09-30.md` — dated technical audit of RLS, grants, privileged functions, headers and remaining provider-account actions.

## 1. Operator and public contacts
- [ ] Set the real legal/controller name in `NEXT_PUBLIC_DATA_CONTROLLER_NAME`.
- [ ] Set a valid business/correspondence address in `NEXT_PUBLIC_DATA_CONTROLLER_ADDRESS`.
- [ ] Set monitored privacy, legal, safeguarding and support inboxes in Vercel.
- [ ] Make sure the same identity/contact details appear consistently on invoices, Terms and Privacy Notice.
- [x] Paid checkout now fails closed when the operator name, address or legal/privacy contact is missing.

## 2. UK GDPR and Children’s Code
- [ ] Review, complete and sign off `docs/dpia-childrens-code-assessment.md`, including AI/voice processing and children’s use.
- [ ] Sign off the Children’s Code / best-interests section because ScholarBridge is likely to be used by under-18s.
- [ ] Confirm the working lawful-basis map by processing purpose; do not rely on one blanket lawful basis for everything.
- [ ] Approve the data-retention schedule and technically enforce it where possible.
- [ ] Complete the processor/international-transfer register and safeguards for each processor.
- [ ] Complete the ICO data-protection fee self-assessment and confirm whether the organisation must pay/register.
- [ ] Test Privacy Centre export, correction/request and erasure flows with a real non-admin account.
- [x] Privacy export now uses a current Oxbridge-only server-side allowlist rather than stale/nonexistent tables or unrelated tables from the shared Supabase project.
- [x] Account deletion now cancels active ScholarBridge Stripe subscriptions before deleting the user and relies on verified `auth.users` cascade/set-null relationships for user-linked data.
- [x] School-owner account deletion is blocked while other members would lose School workspace/cohort data.
- [x] Under-18 privacy information now has a short age-appropriate explanation and high-privacy defaults remain part of the product design.
- [x] Verify optional processing is off by default unless the student actively enables it.
- [ ] Re-run the DPIA before introducing materially new profiling, biometrics, health/special-category processing or public social features.

## 3. Children and safeguarding
- [ ] Name the person/team responsible for safeguarding reports and monitor the safeguarding inbox/queue.
- [x] Write an internal response procedure: `docs/safeguarding-response-procedure.md` covers triage, escalation, school communication boundaries, confidentiality, retention and closure.
- [ ] Train anyone with access to safeguarding reports on confidentiality and need-to-know access.
- [ ] Test the report form and the fallback email route using a real non-admin account.
- [x] Keep AI from being presented as a safeguarding professional or emergency service.
- [x] Keep public profiles, student-to-student messaging and public content sharing disabled unless separately risk-assessed and moderated.
- [ ] Assess Online Safety Act scope before adding user-to-user/search/community features.

## 4. Schools
- [ ] Review and execute a written school agreement/DPA based on `docs/school-data-processing-agreement-template.md` before importing pupil data for a school customer.
- [ ] Confirm whether ScholarBridge is controller, processor or joint controller for each school-data flow; roles can differ by processing purpose.
- [ ] Agree school admin permissions, offboarding and deletion/export when a school contract ends.
- [x] Technical School-route, roster and targeted-assignment isolation checks are present in CI; retain these tests as the School product changes.
- [x] School API routes now require active School entitlement at the server boundary, not only a protected page.
- [x] Do not allow a school account to silently override a student’s privacy/safeguarding rights.

## 5. Vendors and processors
- [ ] Sign/accept current data-processing terms with Supabase, Vercel, Stripe, Google/Gemini, OpenAI and ElevenLabs where used.
- [ ] Complete the processor register with purpose, data categories, hosting/transfer locations, retention and sub-processors.
- [ ] Disable providers/features that are not needed in production.
- [x] Make sure no secret/service-role/API keys use `NEXT_PUBLIC_` for privileged credentials; the launch checker separates public and server-only settings.
- [ ] Rotate any key that has ever been shared publicly or pasted into an insecure location.

## 6. Payments and consumer law
- [x] Plan price, renewal interval and included usage are shown before checkout in the current paid-plan flow.
- [x] First-time Individual Pro uses a 5-day trial and first-time School uses a 7-day trial in the current checkout code; previous Stripe customers do not receive repeated trials.
- [x] Trial duration, post-trial automatic charge, renewal cadence, prior-subscriber exception and cancellation route are shown before checkout.
- [x] Promotion codes remain enabled in Stripe Checkout.
- [x] Under-18 checkout requires confirmation that an appropriate adult has authorised the purchase.
- [ ] Configure and manually verify Stripe customer portal cancellation and invoice/receipt emails in the production Stripe account.
- [ ] Professionally review the Terms against the exact launch business model and current UK subscription/cancellation rules.
- [ ] Add/verify the real legal entity/trader information required on the checkout/website.
- [ ] Test cancellation, failed payments, refunds and account deletion with an active disposable/test subscription.
- [ ] Get specific consumer-law advice if selling paid subscriptions directly to under-18s.

## 7. Security
- [ ] Keep Vercel production public but protect preview/admin environments appropriately; confirm this in the Vercel account.
- [ ] Enable MFA for GitHub, Vercel, Supabase, Stripe, email and domain/DNS accounts.
- [x] Production database audit found no public table with browser grants and RLS disabled; core ScholarBridge user tables have RLS/policies and server-only ScholarBridge tables are service-role only.
- [x] Current Supabase security-advisor “RLS enabled/no policy” notices for Oxbridge server-only tables were checked against grants: the reviewed tables expose no `anon` or `authenticated` table grants, so adding permissive policies would weaken rather than strengthen them.
- [x] Privileged Oxbridge `SECURITY DEFINER` RPCs were previously verified service-role only in production.
- [ ] Confirm the production `ADMIN_EMAILS` allowlist contains only intended administrator accounts.
- [x] Review security headers and third-party script origins before adding a strict Content Security Policy; baseline headers are set globally and CSP remains a staging/report-only follow-up.
- [ ] Set up backups and test restoration; confirm PITR/recovery objectives in Supabase.
- [x] Define a breach/incident response procedure: `docs/security-incident-response.md`.
- [ ] Enable Supabase leaked-password protection if the current plan supports it; Security Advisor still reports it disabled on 3 October 2026.
- [ ] Review Supabase SSL enforcement, network restrictions, email confirmation, OTP/rate-limit and production SMTP settings.
- [ ] Add/confirm production monitoring for authentication failures, billing webhook failures and safeguarding queue failures without logging sensitive content unnecessarily.
- [x] Premium/School API access now has server-side entitlement checks so a Free user cannot bypass a locked page and call protected paid endpoints directly.
- [x] AI endpoints remain behind central burst/hour/concurrency request protection.
- [x] Repository scan found no matches for common committed secret prefixes (`sk_live_`, `sk_test_`, `AIza`, `sb_secret_`) in the previous launch pass.

## 8. AI quality and transparency
- [x] Keep all AI scores labelled as practice feedback, not official admissions predictions or decisions.
- [x] Do not infer health, disability, ethnicity, sexuality, religion or other sensitive traits from voice/video/writing.
- [x] Keep deterministic/offline fallbacks for core feedback where feasible.
- [ ] Maintain a model/version change log and regression-test marking before each material AI release.
- [x] Provide a clear route to report harmful, inappropriate or incorrect AI output.

## 9. Accessibility and product QA
- [ ] Keyboard-test login, pricing, privacy, safeguarding and payment flows.
- [ ] Test screen-reader labels and colour contrast.
- [x] Browser CI covers desktop/mobile production builds; still do a human mobile/low-bandwidth launch pass.
- [ ] Verify confirmation/reset emails use ScholarBridge branding and a production SMTP provider.
- [ ] Verify all public links (Privacy, Cookies, Terms, Safeguarding, Account, support) work on the final public production domain without Vercel account access.

## 10. Final launch gate
- [x] Required ScholarBridge compliance tables (`legal_acceptances`, `privacy_requests`, `safeguarding_reports`) are present in production; billing `subscriptions` is also present with RLS.
- [x] Direct PostgreSQL constraint inspection confirms the current Oxbridge `auth.users` cascade/set-null relationships are present, and an orphan audit found no orphaned rows in the reviewed Oxbridge user tables.
- [ ] Make the Admin → Launch Readiness page show no missing required Production environment settings.
- [ ] Re-run GitHub build and real-browser CI for the 3 October hardening branch and fix any failures before merge.
- [ ] Run the Admin → Launch Readiness live smoke test on the final production domain while signed in as the intended admin.
- [ ] Complete a controlled disposable-account lifecycle: signup → email verification → plan selection → Stripe test/known-safe checkout → trial entitlement → cancellation/failed-payment checks → export → deletion.
- [ ] Obtain professional review/sign-off of Terms, Privacy/DPIA and School DPA before commercial launch, particularly because the service is aimed at students and may be sold to schools/minors.

## 11. 3 October 2026 hardening evidence

Implemented on branch `launch-hardening-20261003` before production merge:
- server-side Pro and School API entitlement gates;
- one-time 5-day Pro and 7-day School trials with pre-checkout renewal disclosure;
- fail-closed paid checkout when public legal identity/contact settings are incomplete;
- age-appropriate under-18 privacy wording and explicit independent-service wording;
- corrected current-schema privacy export;
- Stripe cancellation before account deletion plus School-owner deletion safety checks;
- current Supabase RLS/grant and auth-cascade verification.

Items still unchecked above require either real operator/legal information, external provider/account configuration, professional judgement or a controlled test account/payment lifecycle and must not be marked complete merely because code exists.

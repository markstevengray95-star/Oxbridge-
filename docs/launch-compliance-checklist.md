# ScholarBridge public launch compliance checklist

This checklist is an operational launch gate, not a claim that the product is legally certified. Complete the relevant legal/security reviews for the actual business, users and school contracts before going public.

## 1. Operator and public contacts
- [ ] Set the real legal/controller name in `NEXT_PUBLIC_DATA_CONTROLLER_NAME`.
- [ ] Set a valid business/correspondence address in `NEXT_PUBLIC_DATA_CONTROLLER_ADDRESS`.
- [ ] Set monitored privacy, legal, safeguarding and support inboxes in Vercel.
- [ ] Make sure the same identity/contact details appear consistently on invoices, Terms and Privacy Notice.

## 2. UK GDPR and Children’s Code
- [ ] Complete and retain a Data Protection Impact Assessment (DPIA), including AI/voice/video processing and children’s use.
- [ ] Complete a Children’s Code / best-interests assessment because ScholarBridge is likely to be used by under-18s.
- [ ] Document lawful bases by processing purpose; do not rely on one blanket lawful basis for everything.
- [ ] Document the data-retention schedule and technically enforce it where possible.
- [ ] Document international data transfers and safeguards for each processor.
- [ ] Confirm whether the organisation must pay the ICO data-protection fee/register.
- [ ] Test Privacy Centre export, correction/request and erasure flows with a real non-admin account.
- [ ] Verify optional processing is off by default unless the student actively enables it.
- [ ] Re-run the DPIA before introducing materially new profiling, biometrics, health/special-category processing or public social features.

## 3. Children and safeguarding
- [ ] Name the person/team responsible for safeguarding reports and monitor the safeguarding inbox/queue.
- [ ] Write an internal response procedure: triage, escalation, school/parent communication where lawful/appropriate, record retention and closure.
- [ ] Train anyone with access to safeguarding reports on confidentiality and need-to-know access.
- [ ] Test the report form and the fallback email route.
- [ ] Keep AI from being presented as a safeguarding professional or emergency service.
- [ ] Keep public profiles, student-to-student messaging and public content sharing disabled unless separately risk-assessed and moderated.
- [ ] Assess Online Safety Act scope before adding user-to-user/search/community features.

## 4. Schools
- [ ] Put a written school agreement/DPA in place before importing pupil data for a school customer.
- [ ] Identify whether ScholarBridge is controller, processor or joint controller for each school-data flow; roles can differ by processing purpose.
- [ ] Document school admin permissions, offboarding and deletion/export when a school contract ends.
- [ ] Ensure teacher dashboards expose only pupils/classes the teacher is authorised to see.
- [ ] Do not allow a school account to silently override a student’s privacy/safeguarding rights.

## 5. Vendors and processors
- [ ] Sign/accept current data-processing terms with Supabase, Vercel, Stripe, Google/Gemini, OpenAI and ElevenLabs where used.
- [ ] Record processor purpose, data categories, hosting/transfer locations, retention and sub-processors.
- [ ] Disable providers/features that are not needed in production.
- [ ] Make sure no secret/service-role/API keys use `NEXT_PUBLIC_`.
- [ ] Rotate any key that has ever been shared publicly or pasted into an insecure location.

## 6. Payments and consumer law
- [ ] Verify plan price, renewal interval and included usage are shown before checkout.
- [ ] Configure Stripe customer portal cancellation and invoice/receipt emails.
- [ ] Confirm the Terms accurately describe cancellation, refunds, immediate digital supply and statutory rights for the way ScholarBridge is actually sold.
- [ ] Add the real legal entity/trader information required on the checkout/website.
- [ ] Test cancellation, failed payments, refunds and account deletion with an active subscription.
- [ ] Get specific consumer-law advice if selling paid subscriptions directly to under-18s; consider requiring an adult purchaser/approval route.

## 7. Security
- [ ] Keep Vercel production public but protect preview/admin environments appropriately.
- [ ] Enable MFA for GitHub, Vercel, Supabase, Stripe, email and domain/DNS accounts.
- [ ] Confirm RLS is enabled on every user-data table and test cross-account isolation.
- [ ] Confirm admin access is allowlisted to the intended admin email(s) only.
- [ ] Review security headers and third-party script origins before adding a strict Content Security Policy.
- [ ] Set up backups and test restoration.
- [ ] Define a breach/incident response procedure including ICO/user notification assessment.
- [ ] Add production monitoring for authentication failures, billing webhook failures and safeguarding queue failures without logging sensitive content unnecessarily.

## 8. AI quality and transparency
- [ ] Keep all AI scores labelled as practice feedback, not official admissions predictions or decisions.
- [ ] Do not infer health, disability, ethnicity, sexuality, religion or other sensitive traits from voice/video/writing.
- [ ] Keep deterministic/offline fallbacks for core feedback where feasible.
- [ ] Log model/version changes and regression-test marking before release.
- [ ] Provide a clear route to report harmful, inappropriate or incorrect AI output.

## 9. Accessibility and product QA
- [ ] Keyboard-test login, pricing, privacy, safeguarding and payment flows.
- [ ] Test screen-reader labels and colour contrast.
- [ ] Test mobile and low-bandwidth use.
- [ ] Verify confirmation/reset emails use ScholarBridge branding and a production SMTP provider.
- [ ] Verify all public links (Privacy, Cookies, Terms, Safeguarding, Account, support) work without Vercel account access.

## 10. Final launch gate
- [ ] Apply all required Supabase migrations in production.
- [ ] Populate all required Vercel environment variables for Production.
- [ ] Run GitHub CI and a production smoke test with a brand-new user.
- [ ] Complete signup → email verification → plan selection → Stripe checkout → entitlement → cancellation → export → deletion.
- [ ] Obtain professional review of Terms/Privacy/DPIA/school DPA if selling commercially, especially to schools or minors.

# ScholarBridge DPIA and Children's Code assessment

**Status:** Completed product/data-protection assessment for the current ScholarBridge design. Final controller sign-off, exact legal operator identity, full geographic service address, processor contract checks and operational ownership remain required before treating this as formally approved.

**Assessment date:** 4 October 2026  
**Service:** ScholarBridge / Oxbridge admissions-preparation platform  
**Current operating location supplied:** Cheshire, North West England, United Kingdom  
**Privacy contact:** scholarbridge@gmail.com  
**Legal operator/controller name:** To be confirmed before paid public launch  
**Full geographic service address:** To be confirmed before paid public launch  

This document records the DPIA process and Children’s Code assessment for the current product. It is not a legal certification and does not replace review by the person legally responsible for operating the service.

## 1. Why this DPIA is required

ScholarBridge is an online educational and university-admissions preparation service. It is likely to be accessed by people under 18 and is therefore designed on the basis that the ICO Children’s Code applies.

The service provides:
- Oxford and Cambridge admissions preparation;
- admissions-test practice;
- practice question marking and feedback;
- written-work and personal-statement analysis;
- progress tracking and study planning;
- simulated interviews and interview transcripts;
- AI and optional voice tutoring;
- paid individual subscriptions;
- School-plan dashboards, cohorts, assignments and progress views.

The service processes learning, account and, in some features, voice/transcript data belonging to teenagers. This creates a foreseeable risk to the rights and freedoms of children if data is over-collected, disclosed to the wrong person, used for intrusive profiling or handled without clear age-appropriate information.

Official guidance used for this assessment includes the ICO Children’s Code, the Children’s Code standards, current ICO children-and-UK-GDPR guidance and the ICO children’s DPIA template.

## 2. Data subjects

The current service may process information relating to:
- students aged 13–15;
- students aged 16–17;
- adult students aged 18+;
- teachers and school staff;
- school administrators;
- purchasers/account holders where different from the learner;
- people submitting privacy or safeguarding requests.

ScholarBridge uses a broad age band rather than collecting a full date of birth for normal product use. Direct self-registration is intended for users aged 13 or over. Users under 13 should not use the direct self-sign-up route.

Paid checkout is designed to require confirmation that a purchaser is authorised to make the purchase and, for a user under 18, that an appropriate adult has approved the purchase.

## 3. Personal data processed

### 3.1 Account and access data
- name;
- email address;
- authentication and session information;
- broad age band;
- Terms and Privacy Notice version acceptance;
- subscription tier and entitlement state;
- account-security and access-control information.

### 3.2 Learning and admissions-preparation data
- target university;
- target course;
- application year;
- preparation preferences;
- answers and responses;
- scores and feedback;
- progress history;
- reflections and revision/study-plan information;
- written work, essays and personal-statement content submitted by the user;
- interview transcripts and feedback;
- uploaded files selected by the user.

### 3.3 AI and voice data
- prompts and responses required for the requested AI feature;
- interview audio or transcript data when the user actively starts a voice/interview feature;
- usage metadata needed for rate limiting, entitlement control and purchased-live-minute accounting.

### 3.4 School-plan data
- school or organisation membership;
- cohort/class membership;
- authorised staff role information;
- assignments;
- student submissions;
- progress and completion information;
- school seat entitlements.

### 3.5 Safety, privacy and billing data
- safeguarding reports voluntarily submitted by users;
- privacy-rights requests;
- support communications;
- Stripe customer/subscription identifiers;
- subscription and payment-status information.

Full payment-card details are handled by Stripe and are not intended to be stored directly in the ScholarBridge application database.

## 4. Data-flow summary

1. A user creates an account through the authentication service.
2. Core account and learning data is stored in the ScholarBridge database.
3. The user submits answers, written work or interview responses for the feature they choose to use.
4. Where an AI or voice feature is requested, only the information needed for that request should be sent to the configured provider.
5. Results and progress may be stored against the authenticated account so the user can return to them later.
6. Where a School plan is used, authorised school staff may access data belonging to pupils within their permitted organisation/cohort scope.
7. Stripe processes checkout, subscription and payment activity and ScholarBridge stores entitlement/status identifiers needed to provide access.
8. Privacy and deletion tools allow authenticated users to request/export available account data and delete the account, subject to lawful exceptions and School-owner safeguards.

## 5. Purpose and lawful-basis assessment

The legal operator must keep this mapping under review. The current working assessment is:

| Processing purpose | Current working basis | Assessment |
| --- | --- | --- |
| Account creation, authentication and core requested service | Contract / steps requested before entering a contract | Necessary to provide the requested account and service. |
| Saving learning progress and history | Contract; legitimate interests may apply to limited service operation | Should remain limited to useful educational history rather than unrelated profiling. |
| Personalised practice and recommendations | Contract / legitimate interests depending on exact feature | Must remain proportionate and respect children’s best interests. |
| Security, abuse prevention and rate limiting | Legitimate interests; legal obligation where relevant | Necessary to protect users, accounts and service integrity. |
| Subscription and billing administration | Contract and legal obligation where relevant | Stripe handles card/payment credentials. |
| Optional AI or voice features | Contract where intrinsic to the actively requested feature; consent where consent is specifically relied on for optional processing | Must not silently enable unrelated third-party processing. |
| Privacy-rights handling | Legal obligation | Access restricted to those who need to process the request. |
| Safeguarding reports | Legitimate interests and/or legal obligations depending on circumstances | Human review required; AI must not be sole decision-maker. |
| School-managed pupil processing | Determined with the school for each purpose | Controller/processor roles and lawful basis must be documented before school-scale pupil import. |

Consent is not treated as the universal lawful basis for the product. Where consent is relied upon, withdrawal must be possible and refusal must not be undermined by manipulative design.

## 6. Necessity and proportionality

The current design applies the following minimisation and proportionality decisions:
- broad age bands are used instead of collecting a full date of birth for normal product use;
- there are no public student profiles;
- there is no student-to-student messaging feature in the current product;
- geolocation is not required for core ScholarBridge use;
- users are advised not to submit unnecessary sensitive information;
- full payment-card data remains with the payment provider;
- premium and School API entitlement is enforced on the server, not only in the interface;
- School access is scoped through membership/organisation controls;
- users can request/export available account information and request account deletion;
- AI output is presented as educational/practice feedback rather than an official admissions decision;
- deletion cancels active ScholarBridge Stripe subscriptions before removing the login where Stripe cancellation is required;
- School-owner deletion is blocked where deletion would improperly remove shared school/cohort data belonging to other members.

The service should continue to reject new data fields or third-party sharing that cannot be tied to a clear educational, security, billing, support, privacy or safeguarding purpose.

## 7. Children’s best-interests assessment

### 7.1 Benefits to children
- structured admissions-preparation support;
- opportunity to practise reasoning and interview skills;
- feedback without requiring public comparison with other students;
- persistent progress history so students do not need to repeatedly submit the same work;
- privacy and safeguarding routes visible within the service;
- educational preparation that can be accessed outside formal school lessons.

### 7.2 Foreseeable risks
- children may include excessive or sensitive personal information in essays, uploads or interview responses;
- AI feedback could be misunderstood as an official prediction or admissions judgement;
- transcript or voice information could be shared with more providers than necessary;
- an authorisation error could expose one learner’s results to another account or member of staff;
- school staff could receive access beyond their proper cohort/organisation scope;
- profiling could become overly intrusive if future features infer sensitive traits;
- persuasive subscription or engagement design could take advantage of younger users;
- a safeguarding report could be missed or incorrectly handled if left solely to automation;
- a minor could misunderstand a recurring subscription or trial-to-paid conversion;
- compromised credentials could expose private learning history.

### 7.3 Design response
- high-privacy defaults;
- age-band rather than full-date-of-birth collection;
- no public student profile/social feed;
- no student-to-student messaging;
- no geolocation requirement for core use;
- child-readable summary at the top of the Privacy Notice;
- Privacy Centre for available export, privacy requests and deletion;
- human handling expected for safeguarding concerns;
- AI scores and feedback labelled as practice support rather than admissions decisions;
- no intended sensitive-trait inference from writing, voice or interview behaviour;
- server-side entitlements for paid and School endpoints;
- rate limiting/concurrency controls on expensive AI routes;
- payment-card details kept with Stripe;
- explicit trial duration, renewal and price wording at checkout;
- under-18 purchase acknowledgement requiring appropriate-adult approval;
- paid checkout fails closed when required public operator/contact configuration is incomplete;
- account-deletion workflow cancels active ScholarBridge subscriptions before account deletion;
- School-owner deletion safeguards shared organisations/cohorts;
- users are told not to submit unnecessary sensitive information.

**Best-interests conclusion:** The current design has a legitimate educational purpose and can provide meaningful benefit to young users. On the evidence reviewed, the residual privacy risks can be reduced to a reasonable level only if the operational controls and provider checks in this DPIA are maintained. Children’s best interests must remain a primary consideration when new features are introduced.

## 8. Age-appropriate application

Current approach:
- direct sign-up is intended for age 13+;
- the service asks for an age band rather than a full date of birth;
- high-privacy defaults are applied broadly rather than relying on highly intrusive age verification;
- the product should not use the age-band field to weaken protections for younger users;
- any future feature with materially higher risk must reassess whether stronger age assurance is needed.

This risk-based age-band approach is considered proportionate to the current educational service because the app avoids public social functions, location sharing and other high-risk child-facing features. It must be reviewed if the product changes materially.

## 9. Transparency assessment

The public Privacy Notice now includes:
- a short plain-language summary;
- a dedicated under-18 explanation;
- categories of information collected;
- purposes;
- lawful-basis explanation;
- provider and international-transfer information;
- retention approach;
- rights and Privacy Centre access;
- AI/automated-feedback limitations;
- School-plan explanation;
- cookies/device-storage explanation;
- safeguarding and complaint routes;
- privacy email: scholarbridge@gmail.com;
- operating location: Cheshire, North West England, United Kingdom.

The remaining identity issue is that a full legal operator/controller name and suitable geographic service address have not yet been supplied. The notice must not imply that this regional location is a complete legal service address for paid launch.

## 10. Processor and data-flow register

The person legally operating ScholarBridge must confirm the current contractual terms, processing locations, sub-processors and transfer safeguards before launch.

| Provider | Purpose | Typical data | Required governance check |
| --- | --- | --- | --- |
| Supabase | Authentication, database, progress/account storage | account and learning data | Retain/review DPA, project region, security settings, backups and relevant sub-processors. |
| Vercel | Hosting and server execution | requests, application data and operational logs | Retain/review DPA, access controls, log retention and sub-processors. |
| Stripe | Checkout, payments and subscriptions | billing identifiers and payment data held by Stripe | Confirm production account, portal/cancellation configuration, DPA/terms and retention. |
| Google Gemini | AI/voice features where enabled | prompts, transcript/audio content required by selected feature | Confirm current business/API data terms, retention and transfer mechanism. |
| OpenAI | AI features where enabled | prompts/content required by selected feature | Confirm current business/API data terms, retention and transfer mechanism. |
| ElevenLabs | Voice features where enabled | audio/text required by selected feature | Confirm current data terms, retention and transfer mechanism. |

Providers not required for a production feature should be disabled rather than left connected without an identified purpose.

## 11. International transfers

Some providers may process information outside the United Kingdom. Before production use involving personal data, the legal operator must record for each provider whether the transfer is covered by:
- UK adequacy regulations;
- the UK International Data Transfer Agreement;
- the UK Addendum to approved EU Standard Contractual Clauses; or
- another lawful UK transfer mechanism/exemption.

Where required, a transfer-risk assessment should be retained with the provider record.

## 12. Detailed risk register

| Risk | Initial risk | Current controls | Residual risk / required action |
| --- | --- | --- | --- |
| Cross-account disclosure | High | Database access controls, owner filters, protected routes, server-side entitlement checks, regression/E2E testing | Low/medium. Re-test after schema/auth changes. |
| School pupil data exposed to wrong staff | High | School membership checks, organisation/cohort scoping, targeted-assignment isolation, School API gates | Medium. Periodically audit roles and staff offboarding. |
| AI output mistaken for admissions decision | Medium/high | Practice-only wording and explicit non-official status | Low/medium. Review every new scoring/readiness feature. |
| Excessive child-data collection | High | Age bands, minimisation wording, no required DOB, no public social layer | Medium. Review every new data field through this DPIA. |
| Unnecessary sensitive data entered by a user | Medium/high | User warning and feature-specific submission | Medium. Consider additional contextual reminders around upload/voice features. |
| Safeguarding report not acted on | High | Dedicated reporting route and expectation of human review | Medium until a named responsible adult/operational owner and response process are confirmed. |
| Optional processing enabled without meaningful choice | High | Privacy controls and feature-triggered processing | Low/medium. Re-test whenever third-party features change. |
| Credential/account takeover | High | Supabase Auth, protected server routes and rate limits | Medium. Enable available compromised-password protection and strong admin account controls where possible. |
| Subscription misunderstanding by a young user | Medium/high | Price, billing interval, 5-day Pro / 7-day School trial disclosure, renewal wording and adult-purchase acknowledgement | Medium. Keep wording prominent and review consumer-law position before paid launch. |
| Continued billing after account deletion | High | Deletion endpoint cancels active ScholarBridge Stripe subscriptions before deleting account | Low/medium. Complete controlled end-to-end billing testing before launch. |
| Provider/international-transfer risk | High | Provider minimisation and contractual safeguards expected | Medium until provider register and transfer mechanisms are formally recorded. |
| Data retained longer than necessary | Medium/high | Account deletion path and documented working retention schedule | Medium until operational retention periods/automated deletion are formally approved. |
| Business/operator identity unclear to users | Medium/high | Privacy email and regional operating location now public; paid checkout remains fail-closed when legal identity config is incomplete | Medium until legal operator name and full geographic service address are confirmed. |

No residual risk identified in this assessment is considered a reason to relax the existing child-protection controls. If a high residual risk cannot be reduced before a new feature launches, the operator must consider whether ICO consultation is required before proceeding.

## 13. Retention schedule

The following schedule is approved as the working product policy, subject to any longer retention that is required by law or a shorter period that is operationally feasible:

- **Active account and learning progress:** retained while the account remains active and while reasonably necessary to provide the user’s requested history/progress features.
- **Deleted accounts:** user-linked application data should be erased through the deletion workflow, subject to lawful exceptions and technical backup rotation.
- **Safeguarding reports:** may be retained for a proportionate period where required for safeguarding, legal or accountability purposes; user linkage should be minimised when no longer needed.
- **Privacy-rights requests:** retained only as long as reasonably necessary to respond to and evidence handling of the request/accountability obligations.
- **Billing records:** Stripe and/or legally required financial records may be retained for tax, accounting, fraud or statutory obligations even after the user account is deleted.
- **Security and rate-limit records:** retained for the shortest operational period reasonably necessary for security, abuse prevention and incident investigation.
- **Application/server logs:** retention should be kept proportionate and periodically reviewed; logs should not become a secondary long-term store of user content.

An operational owner must periodically check that actual provider/database retention settings continue to match this schedule.

## 14. Individual rights and deletion

ScholarBridge must support applicable rights under UK data-protection law. The current product includes:
- an authenticated privacy centre;
- an available account-data export path;
- account deletion;
- privacy-request submission;
- contact by scholarbridge@gmail.com.

Account deletion is designed to cancel active ScholarBridge billing before deleting the user authentication record. Some limited records may lawfully remain where necessary for financial, safeguarding, security or accountability obligations.

School-managed data requires separate consideration because the school may be the controller for some pupil information. A school user should not be promised deletion of records the school is legally entitled or required to retain.

## 15. Automated decision-making and profiling

ScholarBridge uses AI to support practice, marking, feedback and interview preparation. Current AI features are not intended to make legally significant or similarly significant decisions about whether a student is admitted to a university, allowed to attend a school or receives an official qualification.

Controls:
- AI results are framed as educational/practice feedback;
- no AI-generated score is an official Oxford/Cambridge decision;
- safeguarding concerns should not be accepted/rejected solely by AI;
- the service should not infer sensitive characteristics from voice, appearance, writing style or interview behaviour;
- any future automated decision that has legal or similarly significant effects requires a fresh UK GDPR assessment before release.

## 16. Security measures

Current technical safeguards include:
- managed authentication;
- protected server routes;
- server-side premium/School entitlement checks;
- database row/role restrictions and service-role separation for sensitive server-only operations;
- rate limiting/concurrency controls on AI routes;
- Stripe-hosted payment-card handling;
- account-export and deletion authorisation checks;
- regression, security and browser/E2E checks in the repository.

Operational security still requires:
- strong unique administrator credentials;
- MFA where supported for administrative/provider accounts;
- compromised-password/leaked-password protection where available;
- production email/authentication configuration;
- backup/restore processes appropriate to the data;
- prompt revocation of access when staff/admin roles change;
- an incident and breach-response process.

These particular products/settings are not individually mandated by statute, but appropriate technical and organisational security is required under UK data-protection law.

## 17. Personal-data breach process

The operator must:
1. record suspected and confirmed personal-data breaches;
2. establish what information and users are affected;
3. contain the breach and preserve necessary evidence;
4. assess the likely risk to individuals, giving particular weight to risks affecting children;
5. notify the ICO where the legal reporting threshold is met, within the applicable statutory timeframe;
6. notify affected people where the law requires it because of high risk;
7. document the decision even where a breach is not reported; and
8. update controls and this DPIA if the incident exposes a design weakness.

Privacy/security incidents can be escalated initially through scholarbridge@gmail.com until a separate security contact is introduced.

## 18. Children’s Code checklist

### Current product/design controls
- [x] Children’s best interests are documented as a primary design consideration.
- [x] A DPIA has been performed for the current service design.
- [x] The age-band approach and the risks behind it are documented.
- [x] The Privacy Notice includes a concise under-18 explanation.
- [x] Privacy settings are intended to be high by default.
- [x] Geolocation is not required for core ScholarBridge use.
- [x] Public student profiles are not part of the current service.
- [x] Student-to-student messaging is not part of the current service.
- [x] Paid-feature entitlement is enforced server-side rather than relying only on interface locks.
- [x] AI feedback is described as practice support rather than official admissions decision-making.
- [x] Sensitive-trait inference is prohibited by the current product policy.
- [x] Data-export and deletion routes exist.
- [x] The privacy contact is recorded as scholarbridge@gmail.com.

### Operational/controller confirmations still required
- [ ] Legal operator/controller identity confirmed.
- [ ] Full geographic service address confirmed.
- [ ] Responsible operator/adult formally signs this DPIA.
- [ ] Processor contracts/DPAs reviewed and retained.
- [ ] International-transfer mechanisms recorded.
- [ ] Actual production retention settings checked against this document.
- [ ] Named safeguarding/incident-response owner confirmed.
- [ ] scholarbridge@gmail.com is actively monitored for privacy/safety requests.
- [ ] ICO data-protection-fee assessment completed and fee paid if required.
- [ ] Material future product changes trigger a DPIA review.

## 19. ICO data-protection fee

The person or organisation legally operating ScholarBridge must complete the ICO data-protection-fee self-assessment. The service must not assume an exemption merely because the business is small or early stage.

## 20. Overall DPIA conclusion

The current ScholarBridge product design includes substantial controls to reduce privacy risks to young users: high-privacy defaults, data minimisation, no public pupil social layer, age bands instead of routine full-date-of-birth collection, server-side access control, data-rights tooling, practice-only AI positioning and safer billing/deletion controls.

**Technical/product assessment outcome:** The identified risks are capable of being reduced to a proportionate level for the current educational use case, provided the controls described in this DPIA remain in place and the outstanding operational/controller actions below are completed.

**Outstanding launch governance actions:**
1. Confirm the exact person/company/organisation that is the legal operator/data controller.
2. Confirm a suitable full geographic service address for legal/public business disclosures.
3. Review and accept the lawful-basis map and retention schedule.
4. Review provider DPAs, sub-processors and international-transfer mechanisms.
5. Complete the ICO fee assessment.
6. Assign the human owner for safeguarding, data-rights and breach response.
7. Formally sign and date this DPIA.

The current broad location, **Cheshire, North West England, United Kingdom**, is recorded but is not treated in this document as a substitute for a complete geographic service address where one is legally required.

## 21. Sign-off

**Legal operator/controller:** ____________________________________  
**Responsible person:** _________________________________________  
**Role:** _______________________________________________________  
**Signature/approval record:** __________________________________  
**Date approved:** ______________________________________________  
**Residual risks accepted/escalated:** ___________________________  
**Next scheduled review:** ______________________________________

A new or updated DPIA review must be carried out before introducing a material change likely to increase risk to children, such as public social features, location sharing, biometric analysis, materially broader profiling, new categories of sensitive data, new school-data sharing or automated decisions with significant effects.

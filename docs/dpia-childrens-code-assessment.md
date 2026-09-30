# ScholarBridge DPIA and Children's Code assessment

**Status:** Working launch document for controller review and sign-off. This is not a legal certification.

**Review date:** 30 September 2026  
**Owner/controller:** Complete from `NEXT_PUBLIC_DATA_CONTROLLER_NAME` before launch.  
**Privacy contact:** Complete from `NEXT_PUBLIC_PRIVACY_CONTACT_EMAIL` before launch.

## 1. Scope and purpose

ScholarBridge is an online university-admissions preparation service aimed at students preparing for Oxford and Cambridge applications. It provides practice questions, admissions-test preparation, written-work and personal-statement analysis, progress tracking, simulated interviews, AI/voice tutoring, subscriptions and School-plan dashboards.

The service is likely to be accessed by children aged 13–17. The assessment therefore treats children's best interests as a primary design consideration and applies high-privacy defaults across all users where practical.

Official guidance reviewed for this assessment:
- ICO Children's Code: https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/childrens-information/childrens-code-guidance-and-resources/age-appropriate-design-a-code-of-practice-for-online-services/
- ICO Children's Code standards: https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/childrens-information/childrens-code-guidance-and-resources/age-appropriate-design-a-code-of-practice-for-online-services/code-standards/
- ICO children's DPIA template: https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/childrens-information/childrens-code-guidance-and-resources/age-appropriate-design-a-code-of-practice-for-online-services/annex-d-dpia-template/

## 2. Data subjects

- Students aged 13–15.
- Students aged 16–17.
- Adult students aged 18+.
- Teachers/school staff using School-plan features.
- School administrators.
- Purchasers/account holders where different from the learner.

ScholarBridge records an age band rather than a full date of birth. Users under 13 are not intended to self-register.

## 3. Personal data processed

### Account and access
- name and email address;
- authentication/session information;
- broad age band;
- Terms/Privacy version acceptance;
- subscription tier and entitlement status.

### Learning and admissions preparation
- target university, course and application year;
- answers, scores, feedback and progress;
- study plans, reflections and revision history;
- written work, essays and personal-statement text submitted by the user;
- interview transcripts and related feedback;
- uploaded files selected by the user.

### Voice/AI features
- audio or transcript content when a user actively starts a voice/interview feature;
- prompts and responses needed to provide AI feedback;
- usage metadata required for rate limiting and purchased-live-minute accounting.

### School use
- organisation, cohort and authorised membership data;
- teacher-assigned work and student submission/progress data;
- school seat entitlements and role information.

### Safety, privacy and billing
- safeguarding reports submitted by users;
- privacy-rights requests;
- Stripe customer/subscription identifiers and payment status. Full card details remain with Stripe.

## 4. Processing purposes and working lawful-basis map

This section must be confirmed by the controller before launch; lawful basis can differ by purpose.

| Processing purpose | Working basis to confirm | Notes |
| --- | --- | --- |
| Account creation, authentication and core service delivery | Contract / steps requested before contract | Required to provide the user-requested service. |
| Saving learning progress and personalised practice | Contract; legitimate interests may apply to limited service optimisation | Personalisation must not override a child's interests. |
| Security, abuse prevention and rate limiting | Legitimate interests / legal obligations where applicable | Minimise retained identifiers and logs. |
| Paid subscription administration | Contract / legal obligation | Stripe handles payment-card data. |
| Optional AI/voice processing | Contract where intrinsic to the chosen feature; consent where relied upon for genuinely optional processing | Optional third-party processing must not be silently enabled. |
| Privacy-rights requests | Legal obligation | Restricted human-access queue. |
| Safeguarding reports | Legitimate interests/legal obligations depending on circumstances | Human review; not decided solely by AI. |
| School-managed pupil processing | Determined per school purpose and contract | Controller/processor roles must be written down before pupil import. |

## 5. Children's best-interests assessment

### Benefits
- structured educational preparation;
- clearer feedback and opportunity to practise reasoning;
- progress tracking without public profiles or social comparison;
- accessible privacy and safeguarding controls;
- reduced need to repeatedly submit the same data.

### Risks to children's rights
- over-collection of personal data in essays, transcripts or uploads;
- a student treating AI feedback as an official admissions judgement;
- voice/transcript data being sent to unnecessary third parties;
- school staff seeing data outside their authorised cohort;
- persuasive design encouraging excessive use;
- accidental exposure of one student's progress to another account;
- a safeguarding disclosure being missed or handled by AI alone;
- purchases by a minor without appropriate understanding/adult involvement;
- profiling becoming more intrusive over time.

### Design response
- no public profiles, student-to-student messaging or public feed;
- age bands instead of full date of birth;
- high-privacy defaults;
- optional privacy choice defaults to essential-only until the user acts;
- Privacy Centre provides export, rights-request and deletion controls;
- safety concerns enter a restricted human-review queue;
- AI scores are labelled as practice feedback, not admissions decisions;
- school data is isolated by user/organisation and protected with RLS/server authorization;
- full payment-card details are not stored by ScholarBridge;
- expensive AI routes use rate limiting and concurrency controls;
- users are told not to submit unnecessary sensitive information.

## 6. Processor/data-flow register

The controller must confirm current contracts, locations, sub-processors and international-transfer safeguards before launch.

| Provider | Purpose | Typical data | Action before launch |
| --- | --- | --- | --- |
| Supabase | Auth, database, user progress | account and learning data | Confirm DPA, region, backups, Auth security settings. |
| Vercel | Hosting/server execution | request/application data and logs | Confirm DPA, production access, log retention. |
| Stripe | Payments/subscriptions | billing identifiers, payment data held by Stripe | Confirm production account and customer-portal settings. |
| Google Gemini | AI/voice features where enabled | prompts/transcripts required for the feature | Confirm current data terms and retention. |
| OpenAI | AI features where enabled | prompts/content required for the feature | Confirm current data terms and retention. |
| ElevenLabs | Voice features where enabled | audio/text required for voice service | Confirm current data terms and retention. |

Providers that are not required for a production feature should be disabled rather than left connected without a purpose.

## 7. Risk assessment

| Risk | Initial risk | Controls | Residual risk/action |
| --- | --- | --- | --- |
| Cross-account disclosure | High | RLS, owner filters, protected routes, browser E2E, authorization audit | Medium/low; retain regression tests for every schema change. |
| School pupil data exposed to wrong staff | High | school-plan gates, membership checks, targeted-assignment isolation | Medium; school permissions and offboarding need periodic audit. |
| AI output mistaken for admissions decision | Medium/high | explicit practice-only wording across app | Low/medium; review new scoring features before release. |
| Excessive child-data collection | High | age bands, minimisation messaging, no DOB, no public social layer | Medium; review every new data field through this DPIA. |
| Safeguarding report not acted on | High | restricted queue, public report page, fallback contact | Medium until a named human owner and response rota are assigned. |
| Optional processing enabled without meaningful choice | High | essential-only default and Privacy Centre controls | Low/medium; test after every third-party feature change. |
| Credential/account takeover | High | Supabase Auth, rate limits, protected server routes | Medium; enable leaked-password protection/MFA where supported and review auth settings. |
| Payment/subscription misunderstanding | Medium/high | price/interval shown pre-checkout, cancellation via account/Stripe portal, Terms | Medium; controller must review consumer wording and current subscription law. |
| Provider/international transfer risk | High | provider minimisation and contracts | Medium until processor register/transfers are signed off. |

## 8. Retention schedule to approve

A final retention schedule must be approved by the controller. Working defaults:
- active account and learning progress: while the account remains active and necessary to provide the service;
- deleted accounts: erase user-linked cloud data through the deletion workflow, except records that must lawfully be retained;
- privacy requests: retain only as long as needed to evidence handling/accountability under the controller's chosen schedule;
- safeguarding reports: retain according to a documented safeguarding/legal schedule, access restricted on a need-to-know basis;
- billing: retain only ScholarBridge records required for entitlement/accounting; Stripe applies its own lawful retention obligations;
- technical/rate-limit records: shortest operational period consistent with security and abuse prevention.

## 9. Children's Code checkpoints

Before launch the controller must sign off that:
- [ ] children's best interests are a primary consideration;
- [ ] this DPIA has been reviewed by the responsible person;
- [ ] age-band approach is proportionate to identified risks;
- [ ] privacy information is understandable for teenagers;
- [ ] privacy settings are high by default;
- [ ] only minimum necessary personal data is collected;
- [ ] optional third-party processing is not silently enabled;
- [ ] geolocation is not required for core ScholarBridge use;
- [ ] profiling/personalisation is limited to educational preparation and not sensitive-trait inference;
- [ ] nudge techniques do not weaken privacy choices;
- [ ] safeguarding and privacy contacts are actively monitored;
- [ ] changes that materially increase risk trigger a DPIA review.

## 10. ICO data-protection fee

The controller must complete the ICO registration self-assessment before launch. As of 30 September 2026, the ICO states that controllers may need to pay an annual data-protection fee unless an exemption applies, with the tier depending on organisation size/turnover. Do not mark this item complete merely because ScholarBridge is small.

ICO fee guide: https://ico.org.uk/for-organisations/data-protection-fee/data-protection-fee/

## 11. Decision and sign-off

**Decision:** The technical design contains substantial child-privacy safeguards, but commercial launch should not be treated as DPIA-complete until the named controller has reviewed the purposes/lawful bases, processor contracts/transfers, retention periods, safeguarding owner and residual risks above.

Controller/DPO or responsible person: ____________________  
Date: ____________________  
Residual risks accepted/escalated: ____________________  
Next review date: ____________________

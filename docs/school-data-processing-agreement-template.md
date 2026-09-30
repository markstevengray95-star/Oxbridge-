# ScholarBridge School data-processing agreement template

**Status:** Commercial template for professional/legal review before use with a school. It is deliberately not marked as an executed agreement.

This document is intended to sit alongside the main ScholarBridge School subscription/order terms. The parties must identify their actual controller/processor roles for each processing purpose rather than assuming one role applies to every data flow.

## 1. Parties

**School / customer:** ____________________  
**Address:** ____________________  
**School privacy/DPO contact:** ____________________

**ScholarBridge operator:** use the real value configured as `NEXT_PUBLIC_DATA_CONTROLLER_NAME`.  
**Address:** use the real value configured as `NEXT_PUBLIC_DATA_CONTROLLER_ADDRESS`.  
**Privacy contact:** use the monitored `NEXT_PUBLIC_PRIVACY_CONTACT_EMAIL`.

Effective date: ____________________

## 2. Role allocation

For pupil/student data supplied by a school solely so ScholarBridge can provide the School-plan service on the school's documented instructions, the intended starting position is:
- school: controller;
- ScholarBridge: processor.

ScholarBridge may be an independent controller for separate purposes such as its own legal obligations, security/abuse prevention, direct consumer accounts, billing records, or handling a data-subject request addressed to ScholarBridge. These purposes must be documented and must not be disguised as processing on the school's instructions.

## 3. Subject matter and duration

**Subject matter:** hosting and processing authorised student/staff information to provide ScholarBridge admissions-preparation, progress, assignment, interview, written-work and reporting features.

**Duration:** for the School subscription and any documented post-termination period required to complete export/deletion, subject to lawful retention obligations.

## 4. Nature and purpose of processing

Depending on enabled features:
- create/manage school organisation, cohorts and authorised users;
- assign preparation activities;
- save student answers, progress, scores and feedback;
- provide interview/written-work practice;
- allow authorised staff to review progress;
- maintain account security and usage entitlements;
- export or delete data at the end of service.

ScholarBridge must not use school-controlled pupil data for unrelated advertising, public profiles, sale of personal data, or training unrelated services unless a separate lawful/controller basis and transparent arrangement has been established.

## 5. Categories of data subjects

- pupils/students;
- teachers and school staff;
- school administrators;
- where applicable, parent/carer contact information intentionally supplied by the school (not required by the default ScholarBridge design).

## 6. Types of personal data

May include:
- name/email/account identifiers;
- broad age band;
- school organisation/cohort membership;
- target course/university/application year;
- assignments, responses, progress, marks/practice feedback;
- submitted written work;
- interview transcripts/audio when the feature is actively used;
- technical/security records required to run the account.

The school must not upload special-category or highly sensitive data unless a feature expressly requires it, the parties have separately assessed the processing, and suitable safeguards/lawful bases are in place.

## 7. Documented instructions

ScholarBridge will process school-controlled data only:
- to provide the contracted School service;
- on instructions expressed through authorised product configuration, support requests or written instructions;
- as required by applicable law, in which case ScholarBridge will inform the school unless legally prohibited.

ScholarBridge should tell the school if an instruction appears to infringe applicable data-protection law rather than silently carrying it out.

## 8. Confidentiality

Anyone authorised to access school-controlled personal data must:
- be subject to appropriate confidentiality obligations;
- receive access only where needed for their role;
- not copy pupil information into ordinary support/engineering systems when redacted/minimised information would suffice.

## 9. Security measures

Current technical/organisational measures include:
- Supabase authentication and row-level security for user-scoped data;
- server-side authorization on privileged routes;
- School-plan and organisation membership gates;
- separation of service/admin keys from browser code;
- rate limiting/concurrency protection on expensive AI endpoints;
- encrypted HTTPS transport through production providers;
- Stripe handling full card data rather than ScholarBridge;
- CI build/browser regression tests;
- restricted privacy and safeguarding queues;
- account export/deletion functions.

The parties should review `docs/security-audit-2026-09-30.md` and update this schedule when the architecture materially changes.

## 10. Sub-processors

The current service may use the following categories/providers where the corresponding feature is enabled:
- Supabase — authentication/database;
- Vercel — application hosting/compute;
- Stripe — billing;
- Google Gemini — AI/voice feature processing;
- OpenAI — AI feature processing;
- ElevenLabs — voice feature processing.

Before signing, ScholarBridge must maintain a current processor/sub-processor register covering purpose, data categories, location/transfer safeguards and applicable data-processing terms. The school must be told how it will be informed of material sub-processor changes.

## 11. International transfers

Where a provider processes personal data outside the UK, ScholarBridge will document the transfer mechanism/safeguards required for that provider and processing activity. This template does not itself establish that each transfer is lawful; the current provider contracts and transfer documentation must be reviewed before execution.

## 12. Data-subject rights

Where the school is controller and ScholarBridge is processor, ScholarBridge will provide reasonable assistance for requests relating to data held in the School service, including access, correction, restriction, portability and erasure as applicable.

ScholarBridge must not respond on the school's behalf to a school-controlled request unless authorised or legally required. Direct ScholarBridge-controller data remains subject to ScholarBridge's own Privacy Centre/process.

## 13. Security incidents and breaches

ScholarBridge will notify the school without undue delay after becoming aware of a personal-data breach affecting school-controlled personal data and provide available information reasonably needed for the school to assess its obligations.

Incident handling follows `docs/security-incident-response.md`.

The school remains responsible for deciding its own regulator/data-subject notifications where it is controller, with reasonable assistance from ScholarBridge.

## 14. DPIAs and regulatory assistance

ScholarBridge will provide reasonable information about its processing/security to help a school complete a DPIA or regulator consultation relating to the School service. ScholarBridge maintains its own child-focused DPIA working document at `docs/dpia-childrens-code-assessment.md`.

## 15. Return and deletion at termination

At the end of a School contract:
1. the school should be offered a reasonable export route for data it is entitled to receive;
2. access/seat entitlements should be removed;
3. school-controlled personal data should be deleted after the agreed export/offboarding period unless law requires retention;
4. remaining independent-controller records must have a documented lawful purpose/retention period.

Offboarding owner: ____________________  
Export window: ____________________  
Deletion target after termination: ____________________

## 16. Audit and information

ScholarBridge will make reasonable security/compliance information available to the school. Any audit request should protect the security/confidentiality of other customers and may use independent assurance, documentation or scoped evidence rather than unrestricted production access.

## 17. Safeguarding boundary

This DPA does not replace the school's safeguarding obligations or procedures. The School agreement must identify the appropriate school safeguarding contact and escalation route. ScholarBridge safety reports remain need-to-know and are not automatically visible to every staff member in the organisation.

## 18. Sign-off schedule

Before executing this agreement, confirm:
- [ ] controller/processor role per processing purpose;
- [ ] school categories/data fields match actual use;
- [ ] sub-processor register reviewed;
- [ ] international-transfer safeguards reviewed;
- [ ] retention/offboarding schedule agreed;
- [ ] school safeguarding contact/process agreed;
- [ ] security measures checked against current product;
- [ ] liability/commercial clauses aligned with the main contract;
- [ ] professional/legal review completed where appropriate.

For the School: ____________________  Date: __________  
For ScholarBridge: ____________________  Date: __________

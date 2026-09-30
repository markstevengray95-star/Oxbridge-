# ScholarBridge safeguarding response procedure

**Status:** Operational procedure ready for the named safeguarding owner to adopt and sign off before public launch.

ScholarBridge is an educational preparation service, not an emergency service or a substitute for a school/parent safeguarding process. Safety reports are for human review. AI must not make the final decision about whether a safeguarding concern is genuine or what external safeguarding action is required.

## 1. Roles to assign before launch

- **Safeguarding owner:** named person with overall responsibility for the ScholarBridge safeguarding queue.
- **Deputy/backup:** named person able to cover absence.
- **Technical contact:** person who can disable a feature/account, preserve relevant technical evidence and investigate product defects.
- **Privacy contact:** person who reviews any personal-data implications or disclosure decisions.

Populate `NEXT_PUBLIC_SAFEGUARDING_CONTACT_EMAIL` with a monitored inbox. Access to safeguarding records must be need-to-know only.

## 2. Intake channels

Concerns can arrive through:
- the in-app `/safeguarding` form;
- the monitored safeguarding email address;
- support/privacy channels where the content is actually a safety concern;
- a school customer contacting ScholarBridge.

The in-app form stores a restricted report with category, user ID where available, brief details, follow-up preference and timestamps.

## 3. First review

A human reviewer should:
1. open the report only in the authorised admin queue;
2. read the minimum information necessary;
3. identify whether the concern relates to ScholarBridge content/AI, another user/account, a school use case, privacy, or an external situation;
4. avoid asking for unnecessary sensitive details;
5. record the reviewer, time and action taken;
6. escalate according to the organisation's safeguarding/legal responsibilities where necessary.

Do not promise confidentiality that cannot be maintained if information must lawfully be shared to protect someone.

## 4. Priority model

### Priority A — immediate/urgent safety concern
Examples include a credible indication that someone may be in immediate danger or a report requiring urgent real-world intervention.

- Do not rely on the ScholarBridge queue as an emergency-response mechanism.
- Direct the reporter toward an appropriate trusted adult/emergency route where relevant.
- Escalate immediately to the named safeguarding owner.
- Preserve only the information needed for the safeguarding response.
- Where a school account is involved, use the agreed school safeguarding contact/escalation route if appropriate and lawful.

### Priority B — serious product/safeguarding concern
Examples: harmful AI output, bullying/harassment linked to a future collaborative feature, misuse of a school account, serious inappropriate content, repeated safety reports.

- Human review promptly.
- Disable or restrict the affected feature/account when proportionate.
- Notify the technical/privacy owner where appropriate.
- Record decision and follow-up.

### Priority C — non-urgent safety/product concern
Examples: inappropriate wording, a confusing safety message, lower-risk school-account concern.

- Review in normal safeguarding queue workflow.
- Route product defects into engineering with sensitive information removed where possible.
- Close only after action/decision is documented.

## 5. School-related reports

ScholarBridge does not replace a school's designated safeguarding procedures. For School-plan users:
- identify the school's agreed safeguarding contact at onboarding/contracting;
- share only information necessary and lawful for the purpose;
- do not expose the report to ordinary teachers/admins merely because they share a school organisation;
- retain ScholarBridge's own audit record of the action taken;
- do not let a school administrator suppress a student's privacy or safeguarding rights.

## 6. AI and automated systems

- AI may help classify ordinary product feedback but must not decide whether a safeguarding concern is valid.
- Do not use an AI model to infer a student's health, mental state or other sensitive trait from voice, writing or behaviour.
- Do not generate an admissions/readiness penalty from a safeguarding report.
- Safety reports must not be used for marketing, engagement optimisation or unrelated profiling.

## 7. Confidentiality and access

- Keep safeguarding records server-side and restricted.
- Do not put full safeguarding details in routine application logs, analytics or issue trackers.
- When engineering needs to reproduce a bug, provide the minimum redacted context.
- Review admin access regularly and remove access immediately when no longer needed.

## 8. Retention and closure

The controller must define and document the retention period for safeguarding records with appropriate professional advice. Each closed report should record:
- outcome/action;
- date closed;
- reviewer;
- whether follow-up was provided;
- whether a product/security/privacy incident was opened;
- any external disclosure and lawful reason for it.

Do not delete a record simply because it is uncomfortable; equally, do not retain it indefinitely without a documented purpose.

## 9. Incident crossover

Open the security/privacy incident procedure if a safeguarding report indicates:
- account compromise;
- unauthorised data access;
- accidental disclosure;
- malicious access to school/student information;
- leakage of sensitive report content.

Use `docs/security-incident-response.md` once present.

## 10. Pre-launch sign-off

- [ ] Safeguarding owner named.
- [ ] Deputy named.
- [ ] Monitored inbox configured.
- [ ] Admin safeguarding queue access checked.
- [ ] In-app report submission tested with a non-admin account.
- [ ] School escalation/contact process included in School agreement.
- [ ] Staff with access briefed on confidentiality and need-to-know handling.
- [ ] Retention period approved.
- [ ] Response/closure fields and audit process understood.

Safeguarding owner: ____________________  
Deputy: ____________________  
Date adopted: ____________________  
Review date: ____________________

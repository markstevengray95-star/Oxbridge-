# ScholarBridge security and personal-data incident response

**Status:** Operational runbook ready for the named incident owner/controller to adopt before public launch.

This procedure covers suspected account compromise, data exposure, unauthorised access, secret leakage, payment/webhook issues with security impact, school-data incidents and personal-data breaches. Safeguarding concerns should also follow `docs/safeguarding-response-procedure.md` where relevant.

## 1. Roles to assign

Before launch name:
- **Incident lead:** coordinates containment, evidence, decisions and closure.
- **Technical lead:** application/database/hosting containment and recovery.
- **Privacy lead/controller contact:** assesses personal-data risk and regulator/data-subject duties.
- **Safeguarding lead:** joins where the incident involves a child-safety report or safeguarding information.
- **School/customer contact owner:** coordinates controller-to-controller/processor communications when School data is affected.

Incident lead: ____________________  
Technical lead: ____________________  
Privacy lead: ____________________  
Safeguarding lead: ____________________

## 2. What counts as an incident

Examples include:
- one user seeing another user's answers, transcript, progress or account data;
- a teacher seeing an unauthorised pupil/cohort;
- exposed Supabase secret/service-role key, Stripe secret, Gemini/OpenAI/voice-provider key, Vercel token, GitHub credential or database password;
- malicious or accidental admin access;
- compromised user account or credential-stuffing pattern;
- public Storage object that should have been private;
- security-definer/RLS/grant mistake exposing data;
- webhook/payment manipulation;
- loss or unauthorised disclosure of a privacy or safeguarding report;
- accidental logging of sensitive user content;
- deletion/corruption of user data beyond expected application behaviour.

A product bug is an incident when it creates a realistic confidentiality, integrity, availability or personal-data risk.

## 3. Severity

### SEV-1 — critical
Active or credible broad exposure, secret compromise giving privileged production access, destructive compromise, or urgent child-safety/data risk.

Actions: immediate containment; incident lead and privacy/safeguarding leads engaged; preserve evidence; assess external notifications without delay.

### SEV-2 — high
Confirmed limited unauthorised access, school-data isolation failure, compromised account with sensitive data access, or important security control bypass.

Actions: rapid containment and investigation; assess personal-data breach threshold and affected users/customers.

### SEV-3 — medium
Attempted abuse successfully blocked, limited security misconfiguration with no evidence of access, or non-sensitive data integrity problem.

Actions: remediate, document evidence and reassess if new facts emerge.

### SEV-4 — low
Security improvement or false positive with no realistic user impact.

Actions: track through ordinary engineering/security backlog.

## 4. First-response checklist

1. **Record the incident start time and reporter.**
2. **Contain before investigating deeply** if privileged access or active exposure is plausible.
3. **Do not destroy evidence** by mass-deleting logs/records before capturing the minimum evidence needed.
4. **Do not paste secrets or sensitive user content into tickets/chat.** Record identifiers/redacted summaries instead.
5. **Identify affected systems**: Vercel, Supabase, GitHub, Stripe, AI/voice providers, email/DNS, School account.
6. **Identify affected people/data categories** and whether children/school-controlled data are involved.
7. **Open the privacy/safeguarding tracks** where relevant.

## 5. Containment playbooks

### Secret/API-key exposure
- Remove the secret from public code/logs/content where possible.
- Rotate/revoke the affected credential in the provider dashboard.
- Update production secret storage and redeploy.
- Search for unauthorised use from the earliest plausible exposure time.
- If a Supabase secret/service-role key is involved, assume RLS could have been bypassed and assess data access accordingly.

### Account compromise
- Revoke/terminate affected sessions where supported.
- Reset credentials and require fresh authentication.
- Check privileged/account changes, billing activity and data access.
- Do not rely only on a locally valid JWT if strict session revocation matters for the response.

### Database/RLS/grant exposure
- Remove the browser grant or correct RLS/policy/function EXECUTE permissions.
- Verify with an unauthenticated role and at least two distinct authenticated identities.
- Inspect logs/query evidence to determine whether the flaw was exploited.
- Add a regression test before closure.

### School isolation issue
- Disable the affected School route/feature if necessary.
- Identify organisations, cohorts and users affected.
- Notify the relevant school controller according to the contract/DPA without undue delay when required.
- Preserve tenant-isolation evidence and add a negative cross-account test.

### Billing/webhook issue
- Stop accepting new affected checkouts if entitlement integrity is uncertain.
- Verify Stripe event signatures and idempotency state.
- Reconcile Stripe state against `subscriptions`, webhook-claim and fulfilment records.
- Avoid manually granting paid entitlement without a documented payment source.

## 6. Personal-data breach assessment

The privacy lead/controller must document:
- what happened and when;
- categories/approximate number of people and records affected where known;
- whether confidentiality, integrity or availability was affected;
- sensitivity of the data and whether children are involved;
- likely consequences for affected people;
- containment/remediation already completed;
- residual risk.

Use the current ICO breach self-assessment and guidance rather than relying only on this runbook. The ICO currently emphasises early assessment/reporting and follow-up information where necessary. Where the UK GDPR reporting threshold is met, the controller should report to the ICO within the applicable statutory period; current ICO guidance centres on the first 72 hours after awareness. If facts are incomplete, document what is known and update later.

Current ICO breach guidance: https://ico.org.uk/for-organisations/report-a-breach/personal-data-breach/

## 7. People/customer notifications

The privacy/controller lead decides whether affected individuals must be informed under applicable law. Communications should:
- state what happened in plain language;
- explain what information was involved;
- explain what ScholarBridge has done;
- give practical protective actions where relevant;
- provide a monitored contact route;
- avoid speculation or minimising uncertainty.

For School-controlled data, follow the executed School DPA and make clear which party is responsible for regulatory/data-subject notification.

## 8. Evidence and logs

Keep an incident record containing:
- incident ID, severity and timeline;
- affected systems/routes/tables/accounts;
- redacted evidence/log references;
- containment actions and credential rotations;
- regulator/customer/user notification decisions and reasons;
- fixes/tests/deployments;
- residual risks and owner.

Do not duplicate full essay/interview/safeguarding content into the incident record unless strictly necessary.

## 9. Recovery validation

Before declaring recovery:
- CI/build/browser tests pass;
- affected RLS/grants/RPC permissions are re-queried;
- critical public/auth/billing smoke checks pass;
- no relevant error spike remains in available logs;
- rotated secrets are no longer used by production;
- affected feature is tested with separate user/organisation identities;
- the privacy/safeguarding lead agrees containment is sufficient.

## 10. Post-incident review

Within a proportionate period after containment:
- document root cause, not just the immediate bug;
- identify why existing controls/tests did not catch it;
- add automated regression coverage;
- update the DPIA/security audit/processor register where risk materially changed;
- update training or access controls if human error contributed;
- define owner and due date for every follow-up.

## 11. Launch sign-off

- [ ] Incident lead assigned.
- [ ] Provider account recovery methods and MFA checked.
- [ ] Credential-rotation owners understood.
- [ ] ICO breach-assessment route bookmarked by privacy lead.
- [ ] School DPA notification contact/process ready.
- [ ] Safeguarding crossover procedure understood.
- [ ] A tabletop exercise has been run using a hypothetical cross-account data exposure.

Adopted by: ____________________  
Date: ____________________  
Next exercise/review: ____________________

# Fellow security work — 7 October2026

| Product | Verified repository | Vercel project | Supabase project | Audited production source SHA |
|---|---|---|---|---|
| Spark | markstevengray95-star/Revision- | revision | emjmvgginijkupwuflla | `62606c989ee0b514a0633f463653280e1dda1cd6` |
| Pulse | markstevengray95-star/teaching-cpd | teaching-cpd | tkjbaqkpkvomwwvwhowp | `6f5d0e81a0270678c3b4e2b16542653da76b6a9f` |
| Fellow | markstevengray95-star/Oxbridge- | oxbridge-m6hq | emjmvgginijkupwuflla | `2214f3e96b326afc5d47e132031aa2f69e983195` |
| Orbits | markstevengray95-star/orbital-ed | orbital-ed | emjmvgginijkupwuflla | `21ac7340178cb0240ab717565adb106a971a1f59` |

Full ecosystem evidence pack: markstevengray95-star/orbital-ed, branch security/orbits-school-audit-2026-10-07. Pulse and Fellow supplied repository names differed from production; above are verified names.

Only synthetic data used. Live fixes: shared calendar isolation, Pulse Storage name-shadow policies, shared anonymous RPC grants, MIS egress restrictions and MFA security snapshot. Relevant migrations/tests are versioned with the owning product. Repo application changes are staged pending review, not production deployed.

RLS enabled counts are not correctness proof. Full file/Realtime/API isolation, privileged MFA, backups, private-history/bundle scanning and independent pentest remain incomplete. Vercel API probes503 DEPLOYMENT_PAUSED are not application auth results. Spark full test baseline fails; Spark/Fellow HIGH dev advisories remain. Overall RED — NOT READY FOR REAL PUPIL DATA. See central SECURITY_REMEDIATION.md and FINAL_SECURITY_REPORT.md.

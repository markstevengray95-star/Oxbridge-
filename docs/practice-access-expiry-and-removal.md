# Expiring and removing Fellow practice logins

## From the platform Admin Dashboard
Open **Admin → Practice access** (`/admin/practice-access`). The **Create practice login** form has an optional expiry date. Leave it blank for unlimited time; practice usage remains unlimited while an account is active.

- Set a date when creating the login, or use **Change expiry → Save expiry** beside an existing issued username.
- The chosen date includes the entire UTC day. An expiry of 10 December remains active through 23:59:59.999 UTC on 10 December.
- **Clear expiry** allows access indefinitely again, provided the account has not been removed.
- **Remove login** revokes access and moves the username from **Active** to **Removed**, without deleting its Supabase Auth user, profile, answers, test results, school membership or progress.
- **Restore login** reverses removal, retaining the original username/password and saved progress. For a removed account that also expired, first clear or extend the expiry date.

This deliberately uses **reversible removal (archiving)**, not irreversible deletion of pupil records. If permanent data erasure is required, use the existing privacy/deletion process rather than this temporary access control.

## Enforcement
- `POST /api/auth/practice-login` rejects inactive and expired usernames.
- `lib/supabase/proxy.ts` checks managed account active/expiry status from the service-role-only table **on each authenticated app request**. A stale JWT cannot continue to open Fellow pages or make its API requests after removal or expiry.
- The app routes expired users back to the Practice Login page with a relevant explanation; the sign-in page itself stays accessible to avoid redirect loops.
- Only a verified platform admin can create, update, remove, restore or reset student practice logins, with server-checked user type and same-origin verification.
- Each lifecycle action is recorded in the server-only `practice_access_audit_events` table.
- The signed-in account's server-authoritative `app_metadata`, not editable user metadata, identifies managed practice users.
- Teachers issued through the separate Teacher Management page are not altered by these student-practice management controls.

## Implementation
Migration: `supabase/migrations/20261121_practice_login_expiry_and_archive.sql` (applied to Fellow Supabase project).
Regression: `node tests/practice-access-expiry.cjs` (run by `Verify app`).

Before pupil rollout, test: newly created no-expiry login, past and future date validation, expiry end-of-UTC-day, removal of a signed-in student, blocked API calls, restoration with password and history intact, teacher dashboards that link an archived student, and the school's retention/consent arrangements. The production Vercel build and real end-to-end checks must also pass.

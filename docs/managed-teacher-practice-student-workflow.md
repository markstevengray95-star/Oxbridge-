# Managed Fellow teacher logins and existing practice students

## Administrator workflow
1. Sign in with the existing **platform administrator** account.
2. Open **Admin Dashboard → Teacher & student logins** (`/admin/managed-school-logins`).
3. If no school exists, enter the school name and select **Create school**. This uses the existing owner-verified school workspace API.
4. Under **Create a teacher login**, enter a display name, username and temporary password. Select **Teacher** or **School Admin**. The account is created and attached to the chosen school automatically.
5. Copy the one-time username/password notice and share it privately with the intended teacher. No email registration or shared accounts are needed.
6. Under **Attach an existing practice student**, choose one of the managed practice usernames already issued from **Practice Access**. Click **Link student to school**. This keeps the same Supabase user ID, username, password, exam results, interviews and saved work.
7. Under **Assign practice students to a teacher**, choose a school teacher, select a school-attached student, then press **Assign**. More than one teacher can be assigned to a student.
8. Teachers open `/practice-login` using their issued credentials and are taken directly to `/teacher-dashboard`. Students continue to `/student-home`.

Teachers see aggregate practice tests completed and average accuracy, saved interview/practice counts, assignment completion, strengths and recent activity **only for students explicitly linked to them**. They cannot access pupils' full question responses, private Tutor conversations or interview transcripts through this dashboard.

## Existing accounts are preserved
All existing `practice_access_accounts` entries default to `account_type='student'`. The teacher creator writes `account_type='teacher'` using the same username/password sign-in flow. The original practice list and Practice Tracking remain **student-only**, while the new managed-teacher page lists staff accounts separately. The administrator can reset a teacher password without revealing its stored hash.

The system does not automatically move students between schools. If a practice student already belongs to another school, the API refuses the attachment rather than silently reassigning them.

## Permissions and safeguards
- Managed credential creation, linking and password resets are restricted to a **server-verified platform administrator** through `getAppAdminAccess`.
- School selection and every mutation verify `school_organizations.owner_user_id` against the current actor.
- Assignments use the existing school membership, active seats and `school_staff_roles` checks; teachers are never made platform administrators.
- School seat additions use `oxbridge_join_school_seat` for capacity checks and locking. Direct unauthenticated or authenticated-visitor execution of that RPC has been revoked.
- New staff credentials are held temporarily in the creating administrator's browser for copying. Existing passwords cannot be read back.
- Account permissions and teacher–student links are protected by Supabase RLS and service-only grants, and staff assignment operations are audit-logged.
- Use an appropriate pupil privacy notice, approved school processes and a secure channel for distributing credentials, especially for under-18s.
- The `test_results` query in teacher analytics selects **only** `user_id`, `accuracy` and `completed_at`; answer payloads are not returned.

## Technical rollout
- Migration: `supabase/migrations/20261121_managed_teacher_username_school_linking.sql`, applied to the Fellow Supabase project.
- API: `/api/admin/managed-school-logins`
- Admin UI: `/admin/managed-school-logins`
- Sign-in: `/practice-login`
- Teacher tracking: `/teacher-dashboard`
- Regression: `node tests/managed-school-logins.cjs`

**Before school rollout:** verify production build and deploy on Vercel, create a temporary teacher account (then safely remove it), test links with a *consenting test student*, verify an unassigned teacher receives no progress, and check password reset, previous student sign-in and saved test data.

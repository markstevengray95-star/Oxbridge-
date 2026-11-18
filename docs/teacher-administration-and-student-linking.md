# Fellow: teacher access and linked student progress

## Purpose
Allow a school owner to give colleagues scoped **Teacher** or **School Admin** roles and assign the students whose progress they may review. These are not Orbits platform administrator accounts.

## Setup for a school owner
1. Sign in and open **School workspace** (`/school-seats`). If necessary, create a free school workspace.
2. Open **Manage Teachers** (`/school/teachers`) and copy the private school join code.
3. Ask each teacher to register for their own Fellow account, verify their email and join the school using that code. **Do not share passwords.**
4. Back on **Manage Teachers**, find that member and select **Teacher** (linked students only) or **School Admin** (may also assign student–teacher links). Only the school owner can change staff roles.
5. Ask students to register and join the *same school* using the school code, with the school's usual pupil-data information and approvals in place. The joining screen explains academic progress sharing.
6. Choose a teacher and link individual school-member accounts. A student can be linked to more than one teacher.
7. The teacher signs in and opens **Teacher Dashboard** (`/teacher-dashboard`). No second login or shared credentials are needed.

## Teacher tracking
Each teacher sees only their explicitly linked active school students. The page shows saved preparation score when available, target course/university, counts of interview practice/full papers/essays, school assignment completion, recent activity, strengths and current priorities. Teachers may export the *assigned-student summary only* to CSV.

The school owner may view the whole school roster through existing School Overview. School Admins can maintain teacher–student links but do not gain full School Overview or the platform Admin Console.

## Protection and pupil privacy
- `school_staff_roles` and `school_teacher_student_links` are separate from `ADMIN_EMAILS` / platform-wide administrator permissions.
- Staff privileges are checked on the server for each request. A school's membership and active seat are required.
- All links are restricted to members in the same school. Staff or school owners cannot be assigned as students.
- Direct browser access to staff-role, link and audit tables is denied; row-level security is enabled.
- Revoking a teacher role deletes that teacher's student links (database cascade). Removing a member from a school also removes linked staff permissions.
- Teacher dashboards never return full interview transcripts, private Tutor chats, essay text or answers.
- Students can inspect their linked teachers at **My linked teachers** (`/student/teacher-links`).
- Schools should use their approved pupil-data privacy notices, parental/school processes where relevant and retention/access rules before onboarding real pupils.

## Maintenance
New schema is in `supabase/migrations/20261118_school_staff_roles_and_teacher_links.sql`; it has been applied to the Fellow Supabase project.

Run `node tests/teacher-access-boundaries.cjs`, the normal Next.js build, and scenario-based school owner / teacher / unassigned teacher / student tests after deployment. Test revocation in a separate browser session, including a direct request to `/api/teacher/progress`.

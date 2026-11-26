# Phase 24 — Teacher and Administrator Dashboards

## Purpose
Present existing staff functions as clear, role-appropriate daily tasks without weakening the current server-side security model or changing student data. The shared styling is defined in `app/fellow-design.css`.

## Teacher overview (`/teacher-dashboard`)
- Summary of **only the students authorised by** `/api/teacher/progress`.
- Quick links to the authorised roster and school-access settings. Cohort management, insights and reports are offered when the API confirms an owner or school-administrator role.
- Search and selectable roster filters: all, no recent account activity, active in the past week and insufficient baseline evidence.
- Short follow-up queue using recorded account activity only. Do **not** present missing telemetry as proof of no independent study or as a welfare/ability judgement.
- Keyboard-operable student selection and visible selection state; CSV continues to export the **currently filtered** authorised roster.
- Detailed test answers/interviews open in the existing student-detail viewer, where `authorizeSchoolStudentDetail` rechecks organisation membership, active seat and teacher-to-student link.

## Cohort workspace (`/school-dashboard`)
- Cohort overview and student join code, upcoming assignments within seven days (including overdue), and links to reporting, tracking and teacher access.
- New-cohort creation, detailed progress analysis and assignment composer are placed in expandable sections; **all existing create/delete/export logic is unchanged**.
- These views still depend on the existing authenticated school endpoints. A navigation link is never itself permission to access pupil information.

## Administrator console (`/admin`)
- Server-side `getAppAdminAccess` verification runs before the dashboard or any admin data query.
- Four frequent actions are visible immediately: practice tracking, practice accounts, managed school logins and safeguarding.
- Nine specialised actions remain grouped in expandable categories. All thirteen original destinations are preserved.
- If a summary query fails, the metric displays **—**, not a false zero.
- Managed practice accounts show a short recent roster, active/disabled counts and an explicit link to manage the full list. A data-load error is distinguished from an empty roster.
- The administration section does not render on unauthorised requests.

## Linked management pages
Visual styling is consistent across teacher student-detail, school reports/insights, staff permissions, practice tracking and account management. Their existing authenticated API calls, session histories, access checks and report exports remain unchanged.

## Checks and limitations
`npm run test:staff-dashboard` verifies role-boundary preservation, filter/due-date logic, route availability, accessible selection, administrative error states and original cohort operations. It is also included in `prebuild`. Independent logic/static checks passed 11/11. Production Next.js/TypeScript build, live sign-in tests for teacher/owner/admin, privacy checks for real school data, mobile browser review and Vercel deployment are required in Phase 25. **These checks do not constitute a completed external security audit or an approval for live pupil data.**

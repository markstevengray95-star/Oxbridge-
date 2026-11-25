-- Phase 9: minimal, service-only FELLOW learner activity and safeguarded
-- audit trail for teacher access to account-linked student assessments.
-- This schema is additive; no old students, usernames or results are changed.
create table if not exists public.fellow_learning_activity_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  page_path text not null check (char_length(page_path) between 2 and 80 and page_path ~ '^/[a-z0-9-]+$'),
  event_kind text not null check (event_kind in ('visit','heartbeat')),
  active_seconds integer not null default 0 check (active_seconds between 0 and 30),
  occurred_at timestamptz not null default now(),
  check (event_kind <> 'visit' or active_seconds = 0)
);
create index if not exists fellow_learning_activity_user_recent_idx
  on public.fellow_learning_activity_events(user_id,occurred_at desc);

alter table public.fellow_learning_activity_events enable row level security;
revoke all on table public.fellow_learning_activity_events from public,anon,authenticated;
grant select,insert,delete on table public.fellow_learning_activity_events to service_role;

create table if not exists public.fellow_school_student_access_audit (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.school_organizations(id) on delete cascade,
  viewer_user_id uuid not null references auth.users(id) on delete cascade,
  student_user_id uuid not null references auth.users(id) on delete cascade,
  resource text not null default 'student_detail' check (resource in ('student_detail')),
  viewed_at timestamptz not null default now(),
  check (viewer_user_id <> student_user_id)
);
create index if not exists fellow_school_student_access_audit_org_idx
  on public.fellow_school_student_access_audit(organization_id,viewed_at desc);

alter table public.fellow_school_student_access_audit enable row level security;
revoke all on table public.fellow_school_student_access_audit from public,anon,authenticated;
grant select,insert,delete on table public.fellow_school_student_access_audit to service_role;

-- Operations/privacy: schedule a verified retention job for the activity table
-- (e.g. 90 days), and for audit records according to the school's approved
-- retention schedule. Do not claim automatic deletion until the job is active.

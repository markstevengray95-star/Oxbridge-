create table if not exists public.school_cohorts (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  course text,
  join_code text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists school_cohorts_owner_idx on public.school_cohorts(owner_user_id, created_at desc);

create table if not exists public.school_memberships (
  id uuid primary key default gen_random_uuid(),
  cohort_id uuid not null references public.school_cohorts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'student' check (role in ('teacher','student')),
  joined_at timestamptz not null default now(),
  unique (cohort_id, user_id)
);
create index if not exists school_memberships_user_idx on public.school_memberships(user_id, joined_at desc);
create index if not exists school_memberships_cohort_idx on public.school_memberships(cohort_id, joined_at);

create table if not exists public.school_assignments (
  id uuid primary key default gen_random_uuid(),
  cohort_id uuid not null references public.school_cohorts(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  target_user_id uuid references auth.users(id) on delete set null,
  title text not null,
  description text not null default '',
  href text not null default '/tutor',
  task_type text not null default 'general' check (task_type in ('general','paper','interview','essay','defence','reading','other')),
  submission_required boolean not null default false,
  due_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists school_assignments_cohort_created_idx on public.school_assignments(cohort_id, created_at desc);
create index if not exists school_assignments_target_idx on public.school_assignments(cohort_id, target_user_id);

create table if not exists public.school_assignment_progress (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.school_assignments(id) on delete cascade,
  cohort_id uuid not null references public.school_cohorts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'not_started' check (status in ('not_started','in_progress','completed')),
  note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (assignment_id, user_id)
);
create index if not exists school_assignment_progress_cohort_idx on public.school_assignment_progress(cohort_id, assignment_id);
create index if not exists school_assignment_progress_user_idx on public.school_assignment_progress(user_id, updated_at desc);

create table if not exists public.school_assignment_submissions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.school_assignments(id) on delete cascade,
  cohort_id uuid not null references public.school_cohorts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  evidence_type text not null default 'other' check (evidence_type in ('test','interview','essay','reflection','other')),
  evidence_ref text,
  title text not null default 'Submitted evidence',
  evidence_snapshot jsonb not null default '{}'::jsonb,
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (assignment_id, user_id)
);
create index if not exists school_assignment_submissions_cohort_idx on public.school_assignment_submissions(cohort_id, assignment_id);
create index if not exists school_assignment_submissions_user_idx on public.school_assignment_submissions(user_id, submitted_at desc);

alter table public.school_cohorts enable row level security;
alter table public.school_memberships enable row level security;
alter table public.school_assignments enable row level security;
alter table public.school_assignment_progress enable row level security;
alter table public.school_assignment_submissions enable row level security;

revoke all on table public.school_cohorts from anon, authenticated;
revoke all on table public.school_memberships from anon, authenticated;
revoke all on table public.school_assignments from anon, authenticated;
revoke all on table public.school_assignment_progress from anon, authenticated;
revoke all on table public.school_assignment_submissions from anon, authenticated;

grant all on table public.school_cohorts to service_role;
grant all on table public.school_memberships to service_role;
grant all on table public.school_assignments to service_role;
grant all on table public.school_assignment_progress to service_role;
grant all on table public.school_assignment_submissions to service_role;

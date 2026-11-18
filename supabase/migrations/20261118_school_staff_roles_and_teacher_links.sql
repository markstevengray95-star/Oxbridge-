-- School-scoped teacher roles and assigned student progress. Applied to the Fellow Supabase project on 18 November 2026.
create table if not exists public.school_staff_roles (
  organization_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('teacher','school_admin')),
  active boolean not null default true,
  granted_by uuid references auth.users(id) on delete set null,
  granted_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (organization_id,user_id),
  constraint school_staff_org_membership_fk foreign key (organization_id,user_id)
    references public.school_organization_members(organization_id,user_id) on delete cascade
);
create table if not exists public.school_teacher_student_links (
  organization_id uuid not null,
  teacher_user_id uuid not null,
  student_user_id uuid not null,
  linked_by uuid references auth.users(id) on delete set null,
  linked_at timestamptz not null default now(),
  primary key (organization_id,teacher_user_id,student_user_id),
  constraint school_teacher_not_own_student check (teacher_user_id <> student_user_id),
  constraint school_teacher_link_role_fk foreign key (organization_id,teacher_user_id)
    references public.school_staff_roles(organization_id,user_id) on delete cascade,
  constraint school_teacher_link_student_fk foreign key (organization_id,student_user_id)
    references public.school_organization_members(organization_id,user_id) on delete cascade
);
create index if not exists school_student_teacher_reverse_idx
  on public.school_teacher_student_links(organization_id,student_user_id);
create index if not exists school_staff_active_roles_idx
  on public.school_staff_roles(user_id,active);
create table if not exists public.school_staff_audit_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.school_organizations(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  subject_user_id uuid references auth.users(id) on delete set null,
  related_user_id uuid references auth.users(id) on delete set null,
  action text not null check (action in ('grant_teacher','grant_school_admin','change_role','revoke_staff','link_student','unlink_student')),
  created_at timestamptz not null default now()
);
create index if not exists school_staff_audit_org_idx on public.school_staff_audit_events(organization_id,created_at desc);
alter table public.school_staff_roles enable row level security;
alter table public.school_teacher_student_links enable row level security;
alter table public.school_staff_audit_events enable row level security;
revoke all on table public.school_staff_roles from public, anon, authenticated;
revoke all on table public.school_teacher_student_links from public, anon, authenticated;
revoke all on table public.school_staff_audit_events from public, anon, authenticated;
grant all on table public.school_staff_roles to service_role;
grant all on table public.school_teacher_student_links to service_role;
grant all on table public.school_staff_audit_events to service_role;
-- No browser-facing policies; access is always checked by server routes.

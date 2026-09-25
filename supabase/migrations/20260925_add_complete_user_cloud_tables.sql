create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  target_university text check (target_university is null or target_university in ('Oxford','Cambridge','Both')),
  target_course text,
  application_year integer check (application_year is null or application_year between 2020 and 2100),
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
revoke all on table public.profiles from anon, authenticated;
grant select, insert, update, delete on table public.profiles to authenticated;
grant all on table public.profiles to service_role;
drop policy if exists "users_read_own_profile" on public.profiles;
create policy "users_read_own_profile" on public.profiles for select to authenticated using ((select auth.uid()) = id);
drop policy if exists "users_insert_own_profile" on public.profiles;
create policy "users_insert_own_profile" on public.profiles for insert to authenticated with check ((select auth.uid()) = id);
drop policy if exists "users_update_own_profile" on public.profiles;
create policy "users_update_own_profile" on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
drop policy if exists "users_delete_own_profile" on public.profiles;
create policy "users_delete_own_profile" on public.profiles for delete to authenticated using ((select auth.uid()) = id);

create table if not exists public.student_intelligence (
  user_id uuid primary key references auth.users(id) on delete cascade,
  snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.student_intelligence enable row level security;
revoke all on table public.student_intelligence from anon, authenticated;
grant select, insert, update, delete on table public.student_intelligence to authenticated;
grant all on table public.student_intelligence to service_role;
drop policy if exists "users_read_own_intelligence" on public.student_intelligence;
create policy "users_read_own_intelligence" on public.student_intelligence for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "users_insert_own_intelligence" on public.student_intelligence;
create policy "users_insert_own_intelligence" on public.student_intelligence for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "users_update_own_intelligence" on public.student_intelligence;
create policy "users_update_own_intelligence" on public.student_intelligence for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "users_delete_own_intelligence" on public.student_intelligence;
create policy "users_delete_own_intelligence" on public.student_intelligence for delete to authenticated using ((select auth.uid()) = user_id);

create table if not exists public.interview_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course text not null default 'General',
  duration_seconds integer not null default 0 check (duration_seconds >= 0),
  summary text,
  overall_feedback jsonb not null default '{}'::jsonb,
  source_ref text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);
create unique index if not exists interview_sessions_user_source_ref_uidx on public.interview_sessions(user_id, source_ref) where source_ref is not null;
create index if not exists interview_sessions_user_created_idx on public.interview_sessions(user_id, created_at desc);

alter table public.interview_sessions enable row level security;
revoke all on table public.interview_sessions from anon, authenticated;
grant select, insert, update, delete on table public.interview_sessions to authenticated;
grant all on table public.interview_sessions to service_role;
drop policy if exists "users_read_own_interview_sessions" on public.interview_sessions;
create policy "users_read_own_interview_sessions" on public.interview_sessions for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "users_insert_own_interview_sessions" on public.interview_sessions;
create policy "users_insert_own_interview_sessions" on public.interview_sessions for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "users_update_own_interview_sessions" on public.interview_sessions;
create policy "users_update_own_interview_sessions" on public.interview_sessions for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "users_delete_own_interview_sessions" on public.interview_sessions;
create policy "users_delete_own_interview_sessions" on public.interview_sessions for delete to authenticated using ((select auth.uid()) = user_id);

create table if not exists public.interview_turns (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  turn_index integer not null check (turn_index >= 0),
  role text not null check (role in ('candidate','interviewer','system')),
  content text not null,
  feedback text,
  created_at timestamptz not null default now(),
  unique (session_id, turn_index),
  constraint interview_turns_session_owner_fkey foreign key (session_id, user_id) references public.interview_sessions(id, user_id) on delete cascade
);
create index if not exists interview_turns_user_session_idx on public.interview_turns(user_id, session_id, turn_index);

alter table public.interview_turns enable row level security;
revoke all on table public.interview_turns from anon, authenticated;
grant select, insert, update, delete on table public.interview_turns to authenticated;
grant all on table public.interview_turns to service_role;
drop policy if exists "users_read_own_interview_turns" on public.interview_turns;
create policy "users_read_own_interview_turns" on public.interview_turns for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "users_insert_own_interview_turns" on public.interview_turns;
create policy "users_insert_own_interview_turns" on public.interview_turns for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "users_update_own_interview_turns" on public.interview_turns;
create policy "users_update_own_interview_turns" on public.interview_turns for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "users_delete_own_interview_turns" on public.interview_turns;
create policy "users_delete_own_interview_turns" on public.interview_turns for delete to authenticated using ((select auth.uid()) = user_id);

create table if not exists public.memory_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null default 'note',
  subject text,
  content text not null,
  confidence numeric(4,3) not null default 0.700 check (confidence >= 0 and confidence <= 1),
  source_type text,
  source_id uuid,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists memory_items_user_active_idx on public.memory_items(user_id, is_active, created_at desc);
create index if not exists memory_items_source_idx on public.memory_items(user_id, source_type, source_id);

alter table public.memory_items enable row level security;
revoke all on table public.memory_items from anon, authenticated;
grant select, insert, update, delete on table public.memory_items to authenticated;
grant all on table public.memory_items to service_role;
drop policy if exists "users_read_own_memory_items" on public.memory_items;
create policy "users_read_own_memory_items" on public.memory_items for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "users_insert_own_memory_items" on public.memory_items;
create policy "users_insert_own_memory_items" on public.memory_items for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "users_update_own_memory_items" on public.memory_items;
create policy "users_update_own_memory_items" on public.memory_items for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "users_delete_own_memory_items" on public.memory_items;
create policy "users_delete_own_memory_items" on public.memory_items for delete to authenticated using ((select auth.uid()) = user_id);

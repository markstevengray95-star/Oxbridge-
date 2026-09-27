create table if not exists public.test_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_ref text not null,
  test text not null,
  form integer,
  title text,
  completed_at timestamptz not null default now(),
  raw_score integer not null default 0,
  max_raw_marks integer,
  total_questions integer not null default 0,
  accuracy integer not null default 0 check (accuracy between 0 and 100),
  duration_seconds integer check (duration_seconds is null or duration_seconds >= 0),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, source_ref)
);

create index if not exists test_results_user_completed_idx
  on public.test_results(user_id, completed_at desc);

alter table public.test_results enable row level security;
revoke all on table public.test_results from anon, authenticated;
grant select, insert, update, delete on table public.test_results to authenticated;
grant all on table public.test_results to service_role;

drop policy if exists "users_read_own_test_results" on public.test_results;
create policy "users_read_own_test_results"
  on public.test_results for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "users_insert_own_test_results" on public.test_results;
create policy "users_insert_own_test_results"
  on public.test_results for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "users_update_own_test_results" on public.test_results;
create policy "users_update_own_test_results"
  on public.test_results for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "users_delete_own_test_results" on public.test_results;
create policy "users_delete_own_test_results"
  on public.test_results for delete to authenticated
  using ((select auth.uid()) = user_id);

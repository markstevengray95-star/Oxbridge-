-- Optional end-of-day expiry for managed learner practice usernames.
-- All existing usernames retain unlimited use and no expiry until assigned one.
alter table public.practice_access_accounts
  add column if not exists expires_at timestamptz null;

create index if not exists practice_access_expiry_idx
  on public.practice_access_accounts (expires_at)
  where active = true and expires_at is not null;

-- Keep a server-only record of administrative lifecycle changes.
create table if not exists public.practice_access_audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users(id) on delete set null,
  target_user_id uuid references auth.users(id) on delete set null,
  action text not null check (action in ('create','set_expiry','remove','restore','set_password')),
  expires_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists practice_access_audit_target_idx
  on public.practice_access_audit_events(target_user_id,created_at desc);

alter table public.practice_access_audit_events enable row level security;
revoke all on public.practice_access_audit_events from public, anon, authenticated;
grant all on public.practice_access_audit_events to service_role;

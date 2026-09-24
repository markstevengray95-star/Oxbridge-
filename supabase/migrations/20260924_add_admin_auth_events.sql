create table if not exists public.admin_auth_events (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid not null references auth.users(id) on delete cascade,
  target_user_id uuid not null references auth.users(id) on delete cascade,
  action text not null check (action in ('password_reset_email','account_view')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.admin_auth_events enable row level security;
revoke all on public.admin_auth_events from anon, authenticated;
create index if not exists admin_auth_events_target_created_idx on public.admin_auth_events(target_user_id, created_at desc);
create index if not exists admin_auth_events_admin_created_idx on public.admin_auth_events(admin_user_id, created_at desc);

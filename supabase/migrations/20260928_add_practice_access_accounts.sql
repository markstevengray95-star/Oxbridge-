create table if not exists public.practice_access_accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text not null,
  username_normalized text not null unique,
  display_name text,
  active boolean not null default true,
  unlimited_usage boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint practice_access_username_format check (username_normalized ~ '^[a-z0-9][a-z0-9._-]{2,31}$')
);

create index if not exists practice_access_accounts_active_idx
  on public.practice_access_accounts(active)
  where active = true;

alter table public.practice_access_accounts enable row level security;
revoke all on table public.practice_access_accounts from anon, authenticated;
grant all on table public.practice_access_accounts to service_role;

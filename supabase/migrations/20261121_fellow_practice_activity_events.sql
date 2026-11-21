-- Record only in-app navigation for administrator-issued Fellow practice student accounts.
-- Private service-only telemetry; no browser direct table access.
create table if not exists public.fellow_practice_activity_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  page_path text not null check (char_length(page_path) between 1 and 160 and left(page_path, 1) = '/'),
  occurred_at timestamptz not null default now()
);

create index if not exists fellow_practice_activity_user_at_idx
  on public.fellow_practice_activity_events (user_id, occurred_at desc);

alter table public.fellow_practice_activity_events enable row level security;
revoke all on table public.fellow_practice_activity_events from public, anon, authenticated;
grant select, insert, delete on table public.fellow_practice_activity_events to service_role;

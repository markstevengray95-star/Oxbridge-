create table if not exists public.usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null,
  quantity numeric not null default 0 check (quantity >= 0),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists usage_events_user_type_created_idx
  on public.usage_events(user_id, event_type, created_at desc);

alter table public.usage_events enable row level security;
revoke all on table public.usage_events from anon, authenticated;
grant all on table public.usage_events to service_role;

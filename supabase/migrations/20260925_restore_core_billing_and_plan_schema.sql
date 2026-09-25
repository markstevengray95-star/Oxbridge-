create table if not exists public.subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  tier text not null default 'free' check (tier in ('free','pro','school')),
  status text not null default 'inactive' check (status in ('inactive','trialing','active','past_due','canceled')),
  stripe_customer_id text,
  stripe_subscription_id text,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists subscriptions_stripe_customer_unique_idx
  on public.subscriptions(stripe_customer_id)
  where stripe_customer_id is not null;
create unique index if not exists subscriptions_stripe_subscription_unique_idx
  on public.subscriptions(stripe_subscription_id)
  where stripe_subscription_id is not null;

alter table public.subscriptions enable row level security;
revoke all on table public.subscriptions from anon, authenticated;
grant select on table public.subscriptions to authenticated;
grant all on table public.subscriptions to service_role;
drop policy if exists "users_read_own_subscription" on public.subscriptions;
create policy "users_read_own_subscription" on public.subscriptions
  for select to authenticated
  using ((select auth.uid()) = user_id);

create table if not exists public.user_state (
  user_id uuid not null references auth.users(id) on delete cascade,
  state_key text not null,
  state_value jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, state_key)
);

alter table public.user_state enable row level security;
revoke all on table public.user_state from anon, authenticated;
grant select, insert, update, delete on table public.user_state to authenticated;
grant all on table public.user_state to service_role;
drop policy if exists "users_read_own_state" on public.user_state;
create policy "users_read_own_state" on public.user_state
  for select to authenticated
  using ((select auth.uid()) = user_id);
drop policy if exists "users_insert_own_state" on public.user_state;
create policy "users_insert_own_state" on public.user_state
  for insert to authenticated
  with check ((select auth.uid()) = user_id);
drop policy if exists "users_update_own_state" on public.user_state;
create policy "users_update_own_state" on public.user_state
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
drop policy if exists "users_delete_own_state" on public.user_state;
create policy "users_delete_own_state" on public.user_state
  for delete to authenticated
  using ((select auth.uid()) = user_id);

create table if not exists public.stripe_webhook_events (
  event_id text primary key,
  event_type text not null,
  created_at timestamptz not null default now()
);

alter table public.stripe_webhook_events enable row level security;
revoke all on table public.stripe_webhook_events from anon, authenticated;
grant all on table public.stripe_webhook_events to service_role;

create table if not exists public.school_organizations (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade unique,
  name text not null default 'School workspace',
  join_code text not null unique,
  seat_limit integer not null default 5 check (seat_limit between 1 and 500),
  status text not null default 'active' check (status in ('active','inactive')),
  stripe_subscription_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.school_organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.school_organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner','member')),
  joined_at timestamptz not null default now(),
  unique (organization_id, user_id),
  unique (user_id)
);

create table if not exists public.school_seat_entitlements (
  user_id uuid primary key references auth.users(id) on delete cascade,
  organization_id uuid not null references public.school_organizations(id) on delete cascade,
  role text not null default 'member' check (role in ('owner','member')),
  active boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.school_organizations enable row level security;
alter table public.school_organization_members enable row level security;
alter table public.school_seat_entitlements enable row level security;
revoke all on public.school_organizations from anon, authenticated;
revoke all on public.school_organization_members from anon, authenticated;
revoke all on public.school_seat_entitlements from anon, authenticated;
grant all on public.school_organizations to service_role;
grant all on public.school_organization_members to service_role;
grant select on public.school_seat_entitlements to authenticated;
grant all on public.school_seat_entitlements to service_role;
drop policy if exists "users_read_own_school_seat" on public.school_seat_entitlements;
create policy "users_read_own_school_seat" on public.school_seat_entitlements
  for select to authenticated
  using ((select auth.uid()) = user_id);

create index if not exists school_org_members_org_idx
  on public.school_organization_members(organization_id);
create index if not exists school_seat_org_idx
  on public.school_seat_entitlements(organization_id);

create table if not exists public.school_seat_addons (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.school_organizations(id) on delete cascade,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  stripe_subscription_id text not null unique,
  stripe_customer_id text,
  quantity integer not null default 1 check (quantity between 1 and 100),
  status text not null default 'inactive' check (status in ('inactive','trialing','active','past_due','canceled')),
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.school_seat_addons enable row level security;
revoke all on table public.school_seat_addons from anon, authenticated;
grant all on table public.school_seat_addons to service_role;
create index if not exists school_seat_addons_org_status_idx
  on public.school_seat_addons(organization_id, status);
create index if not exists school_seat_addons_owner_idx
  on public.school_seat_addons(owner_user_id);

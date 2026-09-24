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
grant select on public.school_seat_entitlements to authenticated;

create policy "users_read_own_school_seat" on public.school_seat_entitlements
for select to authenticated using ((select auth.uid()) = user_id);

create index if not exists school_org_members_org_idx on public.school_organization_members(organization_id);
create index if not exists school_seat_org_idx on public.school_seat_entitlements(organization_id);

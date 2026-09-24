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

create index if not exists school_seat_addons_org_status_idx on public.school_seat_addons(organization_id, status);
create index if not exists school_seat_addons_owner_idx on public.school_seat_addons(owner_user_id);

alter table public.school_seat_addons enable row level security;
revoke all on table public.school_seat_addons from anon, authenticated;

drop policy if exists "deny anon school seat addons" on public.school_seat_addons;
create policy "deny anon school seat addons" on public.school_seat_addons for all to anon using (false) with check (false);
drop policy if exists "deny authenticated school seat addons" on public.school_seat_addons;
create policy "deny authenticated school seat addons" on public.school_seat_addons for all to authenticated using (false) with check (false);

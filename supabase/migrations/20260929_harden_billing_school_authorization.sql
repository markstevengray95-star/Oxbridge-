-- Oxbridge-only production hardening.
-- This migration intentionally does not alter the shared Zones/CPD tables in this Supabase project.

alter table public.stripe_webhook_events
  add column if not exists status text not null default 'completed',
  add column if not exists attempt_count integer not null default 1,
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists processed_at timestamptz,
  add column if not exists last_error text;

update public.stripe_webhook_events
set processed_at = coalesce(processed_at, created_at),
    updated_at = coalesce(updated_at, created_at),
    status = 'completed'
where processed_at is null or status is distinct from 'completed';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'stripe_webhook_events_status_check'
      and conrelid = 'public.stripe_webhook_events'::regclass
  ) then
    alter table public.stripe_webhook_events
      add constraint stripe_webhook_events_status_check
      check (status in ('processing','completed','failed'));
  end if;
end $$;

create table if not exists public.stripe_checkout_fulfillments (
  checkout_session_id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null,
  quantity numeric not null default 0 check (quantity >= 0),
  metadata jsonb not null default '{}'::jsonb,
  fulfilled_at timestamptz not null default now()
);

alter table public.stripe_checkout_fulfillments enable row level security;
revoke all on table public.stripe_checkout_fulfillments from anon, authenticated;
grant select, insert, update, delete on table public.stripe_checkout_fulfillments to service_role;

create table if not exists public.human_review_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  stripe_checkout_session_id text not null unique,
  status text not null default 'queued' check (status in ('paid','queued','in_review','completed','cancelled','refunded')),
  source_type text not null default 'interview',
  title text not null default 'Expert interview review',
  notes text not null default '',
  reviewer_name text,
  feedback text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists human_review_orders_user_created_idx
  on public.human_review_orders(user_id, created_at desc);

alter table public.human_review_orders enable row level security;
revoke all on table public.human_review_orders from anon, authenticated;
grant select, insert, update, delete on table public.human_review_orders to service_role;

create or replace function public.oxbridge_claim_stripe_webhook_event(
  p_event_id text,
  p_event_type text
)
returns table(claimed boolean, state text)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_row public.stripe_webhook_events%rowtype;
begin
  insert into public.stripe_webhook_events(
    event_id, event_type, status, attempt_count, created_at, updated_at, processed_at, last_error
  ) values (
    p_event_id, p_event_type, 'processing', 1, now(), now(), null, null
  )
  on conflict (event_id) do nothing;

  if found then
    return query select true, 'claimed'::text;
    return;
  end if;

  select * into v_row
  from public.stripe_webhook_events
  where event_id = p_event_id
  for update;

  if v_row.status = 'completed' then
    return query select false, 'completed'::text;
    return;
  end if;

  if v_row.status = 'failed'
     or (v_row.status = 'processing' and v_row.updated_at < now() - interval '5 minutes') then
    update public.stripe_webhook_events
    set event_type = p_event_type,
        status = 'processing',
        attempt_count = attempt_count + 1,
        updated_at = now(),
        processed_at = null,
        last_error = null
    where event_id = p_event_id;
    return query select true, 'reclaimed'::text;
    return;
  end if;

  return query select false, 'processing'::text;
end;
$$;

create or replace function public.oxbridge_finish_stripe_webhook_event(
  p_event_id text,
  p_success boolean,
  p_error text default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.stripe_webhook_events
  set status = case when p_success then 'completed' else 'failed' end,
      processed_at = case when p_success then now() else null end,
      updated_at = now(),
      last_error = case when p_success then null else left(coalesce(p_error, 'unknown error'), 1000) end
  where event_id = p_event_id;
end;
$$;

create or replace function public.oxbridge_fulfill_live_credit_pack(
  p_checkout_session_id text,
  p_user_id uuid,
  p_minutes numeric,
  p_pack_count integer,
  p_minutes_per_pack numeric
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_inserted integer;
begin
  insert into public.stripe_checkout_fulfillments(
    checkout_session_id, user_id, kind, quantity, metadata
  ) values (
    p_checkout_session_id,
    p_user_id,
    'live_credit_pack',
    p_minutes,
    jsonb_build_object('pack_count', p_pack_count, 'minutes_per_pack', p_minutes_per_pack)
  )
  on conflict (checkout_session_id) do nothing;

  get diagnostics v_inserted = row_count;
  if v_inserted = 0 then
    return false;
  end if;

  insert into public.usage_events(user_id, event_type, quantity, metadata)
  values (
    p_user_id,
    'gemini_live_credit_minutes',
    p_minutes,
    jsonb_build_object(
      'source', 'stripe',
      'kind', 'live_credit_pack',
      'checkout_session_id', p_checkout_session_id,
      'pack_count', p_pack_count,
      'minutes_per_pack', p_minutes_per_pack
    )
  );

  return true;
end;
$$;

create or replace function public.oxbridge_reserve_gemini_minutes(
  p_user_id uuid,
  p_amount numeric,
  p_monthly_limit numeric,
  p_month_start timestamptz
)
returns table(
  allowed boolean,
  reservation_id uuid,
  event_type text,
  used_minutes numeric,
  base_remaining_minutes numeric,
  credit_remaining_minutes numeric
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_used numeric := 0;
  v_purchased numeric := 0;
  v_consumed numeric := 0;
  v_base_remaining numeric := 0;
  v_credit_remaining numeric := 0;
  v_event_type text;
  v_id uuid;
begin
  if p_amount <= 0 or p_monthly_limit < 0 then
    raise exception 'Invalid Gemini reservation amount or limit';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('oxbridge-gemini:' || p_user_id::text, 0));

  select coalesce(sum(quantity), 0) into v_used
  from public.usage_events
  where user_id = p_user_id
    and event_type = 'gemini_live_reserved_minutes'
    and created_at >= p_month_start;

  select coalesce(sum(quantity), 0) into v_purchased
  from public.usage_events
  where user_id = p_user_id
    and event_type = 'gemini_live_credit_minutes';

  select coalesce(sum(quantity), 0) into v_consumed
  from public.usage_events
  where user_id = p_user_id
    and event_type = 'gemini_live_credit_consumed_minutes';

  v_base_remaining := greatest(0, p_monthly_limit - v_used);
  v_credit_remaining := greatest(0, v_purchased - v_consumed);

  if v_base_remaining >= p_amount then
    v_event_type := 'gemini_live_reserved_minutes';
  elsif v_credit_remaining >= p_amount then
    v_event_type := 'gemini_live_credit_consumed_minutes';
  else
    return query select false, null::uuid, null::text, v_used, v_base_remaining, v_credit_remaining;
    return;
  end if;

  insert into public.usage_events(user_id, event_type, quantity, metadata)
  values (
    p_user_id,
    v_event_type,
    p_amount,
    jsonb_build_object(
      'source', 'server',
      'feature', 'gemini_live',
      'reservation_minutes', p_amount,
      'source_bucket', case when v_event_type = 'gemini_live_reserved_minutes' then 'monthly_allowance' else 'purchased_credit' end
    )
  )
  returning id into v_id;

  if v_event_type = 'gemini_live_reserved_minutes' then
    v_used := v_used + p_amount;
    v_base_remaining := greatest(0, v_base_remaining - p_amount);
  else
    v_credit_remaining := greatest(0, v_credit_remaining - p_amount);
  end if;

  return query select true, v_id, v_event_type, v_used, v_base_remaining, v_credit_remaining;
end;
$$;

create or replace function public.oxbridge_join_school_seat(
  p_user_id uuid,
  p_organization_id uuid
)
returns table(result text, school_name text, seats_used integer, seat_limit integer)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_org public.school_organizations%rowtype;
  v_count integer := 0;
  v_other_org uuid;
begin
  perform pg_advisory_xact_lock(hashtextextended('oxbridge-school-user:' || p_user_id::text, 0));
  perform pg_advisory_xact_lock(hashtextextended('oxbridge-school-org:' || p_organization_id::text, 0));

  select * into v_org
  from public.school_organizations
  where id = p_organization_id
  for update;

  if not found or v_org.status <> 'active' then
    return query select 'inactive'::text, null::text, 0, 0;
    return;
  end if;

  select organization_id into v_other_org
  from public.school_seat_entitlements
  where user_id = p_user_id and active = true
  limit 1;

  if v_other_org is not null then
    return query select 'already_seated'::text, v_org.name, 0, v_org.seat_limit;
    return;
  end if;

  select count(*)::integer into v_count
  from public.school_organization_members
  where organization_id = p_organization_id;

  if v_count >= v_org.seat_limit then
    return query select 'full'::text, v_org.name, v_count, v_org.seat_limit;
    return;
  end if;

  insert into public.school_organization_members(organization_id, user_id, role)
  values (p_organization_id, p_user_id, 'member')
  on conflict (user_id) do update
    set organization_id = excluded.organization_id,
        role = excluded.role;

  insert into public.school_seat_entitlements(user_id, organization_id, role, active, updated_at)
  values (p_user_id, p_organization_id, 'member', true, now())
  on conflict (user_id) do update
    set organization_id = excluded.organization_id,
        role = excluded.role,
        active = true,
        updated_at = now();

  return query select 'joined'::text, v_org.name, v_count + 1, v_org.seat_limit;
end;
$$;

revoke all on function public.oxbridge_claim_stripe_webhook_event(text,text) from public, anon, authenticated;
revoke all on function public.oxbridge_finish_stripe_webhook_event(text,boolean,text) from public, anon, authenticated;
revoke all on function public.oxbridge_fulfill_live_credit_pack(text,uuid,numeric,integer,numeric) from public, anon, authenticated;
revoke all on function public.oxbridge_reserve_gemini_minutes(uuid,numeric,numeric,timestamptz) from public, anon, authenticated;
revoke all on function public.oxbridge_join_school_seat(uuid,uuid) from public, anon, authenticated;

grant execute on function public.oxbridge_claim_stripe_webhook_event(text,text) to service_role;
grant execute on function public.oxbridge_finish_stripe_webhook_event(text,boolean,text) to service_role;
grant execute on function public.oxbridge_fulfill_live_credit_pack(text,uuid,numeric,integer,numeric) to service_role;
grant execute on function public.oxbridge_reserve_gemini_minutes(uuid,numeric,numeric,timestamptz) to service_role;
grant execute on function public.oxbridge_join_school_seat(uuid,uuid) to service_role;

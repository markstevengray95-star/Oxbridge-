create table if not exists public.ai_request_buckets (
  bucket_key text primary key,
  window_started_at timestamptz not null default now(),
  request_count integer not null default 0 check (request_count >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_request_leases (
  lease_id text primary key,
  actor_key text not null,
  scope text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists ai_request_leases_actor_scope_expires_idx
  on public.ai_request_leases(actor_key, scope, expires_at);

alter table public.ai_request_buckets enable row level security;
alter table public.ai_request_leases enable row level security;
revoke all on table public.ai_request_buckets from anon, authenticated;
revoke all on table public.ai_request_leases from anon, authenticated;
grant select, insert, update, delete on table public.ai_request_buckets to service_role;
grant select, insert, update, delete on table public.ai_request_leases to service_role;

create or replace function public.guard_ai_request(
  p_actor_key text,
  p_scope text,
  p_burst_limit integer,
  p_hour_limit integer,
  p_concurrency_limit integer,
  p_lease_seconds integer,
  p_lease_id text
)
returns table(
  allowed boolean,
  reason text,
  retry_after_seconds integer,
  burst_remaining integer,
  hour_remaining integer
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_burst_key text := p_actor_key || ':' || p_scope || ':burst';
  v_hour_key text := p_actor_key || ':ai:hour';
  v_burst_count integer;
  v_hour_count integer;
  v_burst_start timestamptz;
  v_hour_start timestamptz;
  v_active integer;
  v_retry integer := 0;
begin
  if p_burst_limit < 1 or p_hour_limit < 1 or p_concurrency_limit < 1 then
    return query select false, 'misconfigured', 60, 0, 0;
    return;
  end if;

  insert into public.ai_request_buckets(bucket_key, window_started_at, request_count, updated_at)
  values (v_burst_key, v_now, 1, v_now)
  on conflict (bucket_key) do update set
    request_count = case
      when public.ai_request_buckets.window_started_at <= v_now - interval '60 seconds' then 1
      else public.ai_request_buckets.request_count + 1
    end,
    window_started_at = case
      when public.ai_request_buckets.window_started_at <= v_now - interval '60 seconds' then v_now
      else public.ai_request_buckets.window_started_at
    end,
    updated_at = v_now
  returning request_count, window_started_at into v_burst_count, v_burst_start;

  insert into public.ai_request_buckets(bucket_key, window_started_at, request_count, updated_at)
  values (v_hour_key, v_now, 1, v_now)
  on conflict (bucket_key) do update set
    request_count = case
      when public.ai_request_buckets.window_started_at <= v_now - interval '1 hour' then 1
      else public.ai_request_buckets.request_count + 1
    end,
    window_started_at = case
      when public.ai_request_buckets.window_started_at <= v_now - interval '1 hour' then v_now
      else public.ai_request_buckets.window_started_at
    end,
    updated_at = v_now
  returning request_count, window_started_at into v_hour_count, v_hour_start;

  if v_burst_count > p_burst_limit then
    v_retry := greatest(1, ceil(extract(epoch from ((v_burst_start + interval '60 seconds') - v_now)))::integer);
    return query select false, 'burst', v_retry, greatest(0, p_burst_limit - v_burst_count), greatest(0, p_hour_limit - v_hour_count);
    return;
  end if;

  if v_hour_count > p_hour_limit then
    v_retry := greatest(1, ceil(extract(epoch from ((v_hour_start + interval '1 hour') - v_now)))::integer);
    return query select false, 'hourly_budget', v_retry, greatest(0, p_burst_limit - v_burst_count), greatest(0, p_hour_limit - v_hour_count);
    return;
  end if;

  delete from public.ai_request_leases
  where actor_key = p_actor_key and scope = p_scope and expires_at <= v_now;

  insert into public.ai_request_leases(lease_id, actor_key, scope, expires_at)
  values (p_lease_id, p_actor_key, p_scope, v_now + make_interval(secs => greatest(5, least(p_lease_seconds, 120))));

  select count(*)::integer into v_active
  from public.ai_request_leases
  where actor_key = p_actor_key and scope = p_scope and expires_at > v_now;

  if v_active > p_concurrency_limit then
    delete from public.ai_request_leases where lease_id = p_lease_id;
    return query select false, 'concurrency', greatest(1, least(p_lease_seconds, 30)), greatest(0, p_burst_limit - v_burst_count), greatest(0, p_hour_limit - v_hour_count);
    return;
  end if;

  return query select true, 'ok', 0, greatest(0, p_burst_limit - v_burst_count), greatest(0, p_hour_limit - v_hour_count);
end;
$$;

revoke all on function public.guard_ai_request(text,text,integer,integer,integer,integer,text) from public, anon, authenticated;
grant execute on function public.guard_ai_request(text,text,integer,integer,integer,integer,text) to service_role;

comment on table public.ai_request_buckets is 'Server-only rolling request counters for AI cost and abuse protection.';
comment on table public.ai_request_leases is 'Short-lived server-only AI request leases used to constrain parallel request spikes.';

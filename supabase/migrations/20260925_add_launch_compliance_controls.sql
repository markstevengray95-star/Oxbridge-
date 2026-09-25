create table if not exists public.legal_acceptances (
  user_id uuid primary key references auth.users(id) on delete cascade,
  age_band text not null check (age_band in ('13-15','16-17','18+')),
  terms_version text not null,
  privacy_version text not null,
  accepted_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.legal_acceptances enable row level security;
revoke all on table public.legal_acceptances from anon, authenticated;
grant select, insert, update on table public.legal_acceptances to authenticated;
grant all on table public.legal_acceptances to service_role;
drop policy if exists "users_read_own_legal_acceptance" on public.legal_acceptances;
create policy "users_read_own_legal_acceptance" on public.legal_acceptances for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "users_insert_own_legal_acceptance" on public.legal_acceptances;
create policy "users_insert_own_legal_acceptance" on public.legal_acceptances for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "users_update_own_legal_acceptance" on public.legal_acceptances;
create policy "users_update_own_legal_acceptance" on public.legal_acceptances for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create table if not exists public.privacy_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  request_type text not null check (request_type in ('access','correction','erasure','restriction','objection','portability','other')),
  details text check (details is null or char_length(details) <= 3000),
  status text not null default 'open' check (status in ('open','in_progress','completed','rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists privacy_requests_user_created_idx on public.privacy_requests(user_id, created_at desc);
alter table public.privacy_requests enable row level security;
revoke all on table public.privacy_requests from anon, authenticated;
grant select, insert on table public.privacy_requests to authenticated;
grant all on table public.privacy_requests to service_role;
drop policy if exists "users_read_own_privacy_requests" on public.privacy_requests;
create policy "users_read_own_privacy_requests" on public.privacy_requests for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "users_create_own_privacy_requests" on public.privacy_requests;
create policy "users_create_own_privacy_requests" on public.privacy_requests for insert to authenticated with check ((select auth.uid()) = user_id);

create table if not exists public.safeguarding_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  category text not null check (category in ('safety','bullying','inappropriate-content','privacy','school-concern','other')),
  details text not null check (char_length(details) between 10 and 3000),
  contact_requested boolean not null default false,
  status text not null default 'open' check (status in ('open','reviewing','actioned','closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists safeguarding_reports_user_created_idx on public.safeguarding_reports(user_id, created_at desc);
create index if not exists safeguarding_reports_status_created_idx on public.safeguarding_reports(status, created_at desc);
alter table public.safeguarding_reports enable row level security;
revoke all on table public.safeguarding_reports from anon, authenticated;
grant select, insert on table public.safeguarding_reports to authenticated;
grant all on table public.safeguarding_reports to service_role;
drop policy if exists "users_read_own_safeguarding_reports" on public.safeguarding_reports;
create policy "users_read_own_safeguarding_reports" on public.safeguarding_reports for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "users_create_own_safeguarding_reports" on public.safeguarding_reports;
create policy "users_create_own_safeguarding_reports" on public.safeguarding_reports for insert to authenticated with check ((select auth.uid()) = user_id);

comment on table public.legal_acceptances is 'Versioned user acknowledgement of ScholarBridge terms/privacy and coarse age band. No date of birth is collected.';
comment on table public.privacy_requests is 'Audit trail for data-protection rights requests that need human handling.';
comment on table public.safeguarding_reports is 'Restricted safeguarding concern queue. Users can only see their own reports; service role handles review.';

create table if not exists public.app_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'admin' check (role = 'admin'),
  created_at timestamptz not null default now()
);

comment on table public.app_admins is
  'Server-managed application administrators. Normal users may only read their own role.';

alter table public.app_admins enable row level security;

revoke all on table public.app_admins from anon, authenticated;
grant select on table public.app_admins to authenticated;

drop policy if exists "Users can read own admin role" on public.app_admins;
create policy "Users can read own admin role"
on public.app_admins
for select
to authenticated
using ((select auth.uid()) = user_id);

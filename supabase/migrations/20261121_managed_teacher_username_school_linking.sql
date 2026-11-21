-- Distinguish teacher logins from existing practice student usernames without
-- modifying their credentials, records, history or original user IDs.
alter table public.practice_access_accounts
  add column if not exists account_type text not null default 'student';

do $$
begin
  if not exists(select 1 from pg_constraint
    where conname='practice_access_account_type_check'
      and conrelid='public.practice_access_accounts'::regclass) then
    alter table public.practice_access_accounts add constraint practice_access_account_type_check
      check (account_type in ('student','teacher'));
  end if;
end $$;

-- School-staff changes are auditable, including school-attached managed pupils.
alter table public.school_staff_audit_events
  drop constraint if exists school_staff_audit_events_action_check;
alter table public.school_staff_audit_events
  add constraint school_staff_audit_events_action_check
  check (action in ('grant_teacher','grant_school_admin','change_role','revoke_staff','link_student','unlink_student','attach_student'));

-- The existing seat-join RPC receives arbitrary user IDs, so restrict it to
-- server-side service-role usage; browser clients must never call it directly.
revoke execute on function public.oxbridge_join_school_seat(uuid,uuid) from public,anon,authenticated;
grant execute on function public.oxbridge_join_school_seat(uuid,uuid) to service_role;

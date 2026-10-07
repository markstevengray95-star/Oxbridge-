-- BREAK GLASS ONLY: restores known CRITICAL vulnerability. Contain access first.
-- No data deletion. Prefer a corrective scoped policy migration.
begin;
drop policy calendar_view on public.cpd_calendar_events;
create policy calendar_view on public.cpd_calendar_events for select to authenticated using(true);
drop policy calendar_admin_insert on public.cpd_calendar_events;
create policy calendar_admin_insert on public.cpd_calendar_events for insert to authenticated with check(private.is_cpd_admin() and created_by=auth.uid());
drop policy calendar_admin_update on public.cpd_calendar_events;
create policy calendar_admin_update on public.cpd_calendar_events for update to authenticated using(private.is_cpd_admin()) with check(private.is_cpd_admin());
drop policy calendar_admin_delete on public.cpd_calendar_events;
create policy calendar_admin_delete on public.cpd_calendar_events for delete to authenticated using(private.is_cpd_admin());
drop function private.security_calendar_scope_access(uuid,uuid,boolean);
commit;

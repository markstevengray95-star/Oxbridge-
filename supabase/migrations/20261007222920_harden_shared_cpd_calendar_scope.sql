-- Applies only to shared project emjmvgginijkupwuflla.
-- No data updates/deletions. Existing admin checks remain; school scope is enforced.
create or replace function private.security_calendar_scope_access(
 target_org uuid, event_creator uuid, manage boolean default false
) returns boolean language sql stable security definer set search_path = ''
as $function$
 select (select auth.uid()) is not null and (
  exists(select 1 from public.staff_development_profiles p
   where p.user_id=(select auth.uid()) and p.platform_role='admin')
  or (target_org is null and event_creator=(select auth.uid()))
  or (target_org is not null and (
   exists(select 1 from public.organisations o
    where o.id=target_org and o.created_by=(select auth.uid()))
   or exists(select 1 from public.organisation_memberships m
    where m.organisation_id=target_org and m.user_id=(select auth.uid())
     and m.active and (not manage or m.member_role='org_admin'))
   or exists(select 1 from public.school_organizations o
    where o.id=target_org and o.owner_user_id=(select auth.uid()))
   or exists(select 1 from public.school_organization_members m
    where m.organization_id=target_org and m.user_id=(select auth.uid())
     and (not manage or m.role in ('owner','admin','cpd_lead')))
  ))
 );
$function$;
revoke all on function private.security_calendar_scope_access(uuid,uuid,boolean) from public, anon;
grant execute on function private.security_calendar_scope_access(uuid,uuid,boolean) to authenticated;
drop policy if exists calendar_view on public.cpd_calendar_events;
create policy calendar_view on public.cpd_calendar_events for select to authenticated
 using(private.security_calendar_scope_access(organisation_id,created_by,false));
drop policy if exists calendar_admin_insert on public.cpd_calendar_events;
create policy calendar_admin_insert on public.cpd_calendar_events for insert to authenticated
 with check(private.is_cpd_admin() and created_by=(select auth.uid())
 and private.security_calendar_scope_access(organisation_id,created_by,true));
drop policy if exists calendar_admin_update on public.cpd_calendar_events;
create policy calendar_admin_update on public.cpd_calendar_events for update to authenticated
 using(private.is_cpd_admin() and private.security_calendar_scope_access(organisation_id,created_by,true))
 with check(private.is_cpd_admin() and private.security_calendar_scope_access(organisation_id,created_by,true));
drop policy if exists calendar_admin_delete on public.cpd_calendar_events;
create policy calendar_admin_delete on public.cpd_calendar_events for delete to authenticated
 using(private.is_cpd_admin() and private.security_calendar_scope_access(organisation_id,created_by,true));

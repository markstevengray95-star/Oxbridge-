-- Synthetic transaction only. Do not replace these fixtures with real user IDs.
begin;
do $test$
declare
 a uuid:=gen_random_uuid(); b uuid:=gen_random_uuid(); c uuid:=gen_random_uuid();
 teacher_a uuid:=gen_random_uuid(); inactive_a uuid:=gen_random_uuid();
 oa uuid:=gen_random_uuid(); ob uuid:=gen_random_uuid(); oc uuid:=gen_random_uuid();
 ea uuid:=gen_random_uuid(); eb uuid:=gen_random_uuid(); ec uuid:=gen_random_uuid();
 actor uuid; expected uuid; n integer;
begin
 insert into auth.users(id,email,raw_user_meta_data,raw_app_meta_data)
 select x,x::text||'@example.invalid','{}'::jsonb,'{}'::jsonb
 from unnest(array[a,b,c,teacher_a,inactive_a]) x;
 insert into public.school_organizations(id,owner_user_id,name,join_code)
 values(oa,a,'SECURITY TEST SCHOOL A',oa::text),(ob,b,'SECURITY TEST SCHOOL B',ob::text),(oc,c,'SECURITY TEST SCHOOL C',oc::text);
 insert into public.organisations(id,name,slug,created_by,join_code)
 values(oa,'SECURITY TEST SCHOOL A',oa::text,a,oa::text),(ob,'SECURITY TEST SCHOOL B',ob::text,b,ob::text),(oc,'SECURITY TEST SCHOOL C',oc::text,c,oc::text)
 on conflict(id) do nothing;
 insert into public.school_organization_members(organization_id,user_id,role)
 values(oa,a,'admin'),(ob,b,'admin'),(oc,c,'admin'),(oa,teacher_a,'member')
 on conflict(organization_id,user_id) do update set role=excluded.role;
 update public.staff_development_profiles set preferred_organization_id=oa where user_id=a;
 update public.staff_development_profiles set preferred_organization_id=ob where user_id=b;
 update public.staff_development_profiles set preferred_organization_id=oc where user_id=c;
 insert into public.organisation_memberships(organisation_id,user_id,member_role,active)
 values(oa,inactive_a,'member',false) on conflict(organisation_id,user_id) do update set active=false;
 insert into public.cpd_calendar_events(id,title,starts_at,created_by,organisation_id)
 values(ea,'SECURITY EVENT A',now(),a,oa),(eb,'SECURITY EVENT B',now(),b,ob),(ec,'SECURITY EVENT C',now(),c,oc);
 foreach actor in array array[a,b,c] loop
  expected:=case actor when a then ea when b then eb else ec end;
  perform set_config('request.jwt.claim.sub',actor::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',actor,'role','authenticated')::text,true);
  execute 'set local role authenticated';
  select count(*) into n from public.cpd_calendar_events where id in(ea,eb,ec);
  if n<>1 or not exists(select 1 from public.cpd_calendar_events where id=expected) then raise exception 'School read isolation failed';end if;
  update public.cpd_calendar_events set description='Synthetic own-school edit' where id=expected;
  if not found then raise exception 'Legitimate admin update denied';end if;
  update public.cpd_calendar_events set description='ATTACK' where id in(ea,eb,ec) and id<>expected;
  if found then raise exception 'Cross-school update allowed';end if;
  delete from public.cpd_calendar_events where id in(ea,eb,ec) and id<>expected;
  if found then raise exception 'Cross-school delete allowed';end if;
  begin
   insert into public.cpd_calendar_events(title,starts_at,created_by,organisation_id)
   values('ATTACK',now(),actor,case actor when a then ob else oa end);
   raise exception 'Cross-school insert allowed';
  exception when insufficient_privilege then null;end;
  begin
   update public.cpd_calendar_events set organisation_id=case actor when a then ob else oa end where id=expected;
   raise exception 'School reassignment allowed';
  exception when insufficient_privilege then null;end;
  execute 'reset role';
 end loop;
 perform set_config('request.jwt.claim.sub',teacher_a::text,true);
 execute 'set local role authenticated';
 if (select count(*) from public.cpd_calendar_events where id in(ea,eb,ec))<>1 then raise exception 'Teacher scope wrong';end if;
 update public.cpd_calendar_events set description='ATTACK' where id=ea;
 if found then raise exception 'Ordinary teacher write allowed';end if;
 execute 'reset role';
 perform set_config('request.jwt.claim.sub',inactive_a::text,true);
 execute 'set local role authenticated';
 if exists(select 1 from public.cpd_calendar_events where id in(ea,eb,ec)) then raise exception 'Inactive legacy membership allowed';end if;
 execute 'reset role';
 perform set_config('request.jwt.claim.sub','',true);
 perform set_config('request.jwt.claims','{}',true);
 execute 'set local role anon';
 begin
  perform 1 from public.cpd_calendar_events where id in(ea,eb,ec);
  if found then raise exception 'Anonymous read allowed';end if;
 exception when insufficient_privilege then null;end;
 execute 'reset role';
end $test$;
rollback;
select 'PASS: three-school calendar reads, own admin writes, cross-school read/insert/update/delete/reassignment denial, teacher read-only, inactive/anonymous denial; synthetic fixtures rolled back' as result;

-- Follow-up to 20260929_harden_billing_school_authorization.sql.
-- Qualify usage_events columns so the RETURNS TABLE event_type output variable
-- cannot collide with the table column inside PL/pgSQL.

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

  select coalesce(sum(ue.quantity), 0) into v_used
  from public.usage_events ue
  where ue.user_id = p_user_id
    and ue.event_type = 'gemini_live_reserved_minutes'
    and ue.created_at >= p_month_start;

  select coalesce(sum(ue.quantity), 0) into v_purchased
  from public.usage_events ue
  where ue.user_id = p_user_id
    and ue.event_type = 'gemini_live_credit_minutes';

  select coalesce(sum(ue.quantity), 0) into v_consumed
  from public.usage_events ue
  where ue.user_id = p_user_id
    and ue.event_type = 'gemini_live_credit_consumed_minutes';

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

revoke all on function public.oxbridge_reserve_gemini_minutes(uuid,numeric,numeric,timestamptz) from public, anon, authenticated;
grant execute on function public.oxbridge_reserve_gemini_minutes(uuid,numeric,numeric,timestamptz) to service_role;

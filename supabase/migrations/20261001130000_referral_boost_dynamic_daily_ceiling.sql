-- Referral/team boost dynamically raises the plan's daily earning ceiling.
-- Applies only to future ad completions; existing rewards are untouched.

do $$
declare
  v_def text;
  v_old text;
  v_new text;
begin
  select pg_get_functiondef(p.oid)
  into v_def
  from pg_proc p
  join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public'
    and p.proname='complete_ad_view'
    and pg_get_function_identity_arguments(p.oid)='p_session_id uuid, p_idempotency_key text'
  limit 1;

  if v_def is null then
    raise exception 'complete_ad_view function not found';
  end if;

  v_old := '  v_remaining_daily numeric;
  v_count integer;';
  v_new := '  v_remaining_daily numeric;
  v_effective_daily_limit numeric;
  v_count integer;';
  if position(v_old in v_def)=0 then
    raise exception 'Expected daily limit declaration not found';
  end if;
  v_def := replace(v_def,v_old,v_new);

  v_old := '  v_remaining_daily := greatest(coalesce(p.daily_reward_limit_pkr, 0) - v_daily, 0);';
  v_new := '  /* Referral/team boost also raises the daily earning ceiling. */
  v_effective_daily_limit := round(
    coalesce(p.daily_reward_limit_pkr, 0)
    * (1.00 + v_total_boost_pct / 100.00),
    2
  );
  v_remaining_daily := greatest(v_effective_daily_limit - v_daily, 0);';
  if position(v_old in v_def)=0 then
    raise exception 'Expected daily limit calculation not found';
  end if;
  v_def := replace(v_def,v_old,v_new);

  execute v_def;
end
$$;
-- Keep the configured daily PKR limit as a hard cap.
-- Referral/team boosts may affect earning_rating_pct, but must not inflate the daily monetary ceiling.
do $migration$
declare
  v_definition text;
  v_updated text;
begin
  select pg_get_functiondef('public.complete_ad_view(uuid,text)'::regprocedure)
    into v_definition;

  if position('v_effective_daily_limit := round(' in v_definition) = 0 then
    raise exception 'Expected daily-limit expression was not found; aborting safely';
  end if;

  v_updated := regexp_replace(
    v_definition,
    'v_effective_daily_limit := round\(\s*coalesce\(p\.daily_reward_limit_pkr, 0\) \* \(1\.00 \+ v_total_boost_pct / 100\.00\),\s*2\s*\);',
    'v_effective_daily_limit := coalesce(p.daily_reward_limit_pkr, 0);'
  );

  if v_updated = v_definition
     or position('v_effective_daily_limit := coalesce(p.daily_reward_limit_pkr, 0);' in v_updated) = 0 then
    raise exception 'Daily-limit replacement did not match exactly; aborting safely';
  end if;

  execute v_updated;
end
$migration$;
-- Make daily_reward_limit_pkr an earning guide, not a hard stop.
-- Actual rewards remain bounded by live plan + recovery reserves and the
-- budget-aware 30-day curve. Referral/team boosts now affect the real reward.
do $migration$
declare
  v_definition text;
  v_updated text;
begin
  select pg_get_functiondef('public.complete_ad_view(uuid,text)'::regprocedure)
    into v_definition;

  v_updated := v_definition;

  v_updated := replace(
    v_updated,
    'v_effective_daily_limit := coalesce(p.daily_reward_limit_pkr, 0);' || E'\n  v_remaining_daily := greatest(v_effective_daily_limit - v_daily, 0);',
    'v_effective_daily_limit := coalesce(p.daily_reward_limit_pkr, 0);' || E'\n  v_remaining_daily := null; -- informational only; no hard daily monetary cap'
  );

  v_updated := replace(
    v_updated,
    'if v_remaining_daily <= 0 or v_combined_available <= 0 then',
    'if v_combined_available <= 0 then'
  );

  v_updated := replace(
    v_updated,
    'least(100.00,',
    'least(150.00,'
  );

  v_updated := replace(
    v_updated,
    'v_curve_target := v_sustainable_per_ad * v_curve_factor * v_curve_noise;',
    'v_curve_target := v_sustainable_per_ad * v_curve_factor * v_curve_noise * (1.00 + v_total_boost_pct / 100.00);'
  );

  v_updated := replace(
    v_updated,
    '        v_curve_target * 1.35,' || E'\n        v_remaining_daily,' || E'\n        v_combined_available',
    '        v_curve_target * 1.35,' || E'\n        v_combined_available'
  );

  v_updated := replace(
    v_updated,
    'v_reward := round(least(v_sustainable_per_ad * 0.75, v_remaining_daily, v_combined_available), 2);',
    'v_reward := round(least(v_sustainable_per_ad * 0.75, v_combined_available), 2);'
  );

  if v_updated = v_definition
     or position('if v_combined_available <= 0 then' in v_updated) = 0
     or position('least(150.00,' in v_updated) = 0
     or position('(1.00 + v_total_boost_pct / 100.00)' in v_updated) = 0
     or position('v_remaining_daily,' in v_updated) > 0
     or position('v_remaining_daily <= 0' in v_updated) > 0 then
    raise exception 'Safe reward-policy patch verification failed; no function change applied';
  end if;

  execute v_updated;
end
$migration$;
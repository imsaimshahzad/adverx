-- Referral boost qualification: plan purchase/activation only.
-- Ads are NOT used to qualify referral boosts.
-- Each qualified direct referral contributes to the team boost only for
-- the rolling 7 days following its qualifying referral commission event.
-- Also ensure the dynamic daily ceiling is calculated after boost values.

DO $do$
DECLARE
  v_def text;
BEGIN
  SELECT pg_get_functiondef(p.oid) INTO v_def
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname='public' AND p.proname='complete_ad_view';

  v_def := replace(
    v_def,
    $replace$and exists (
      select 1
      from public.ad_view_sessions avs
      where avs.user_id = rc.source_user_id
        and avs.status = 'completed'
        and avs.completed_at >= now() - interval '7 days'
    );$replace$,
    $replace$and rc.created_at >= now() - interval '7 days';$replace$
  );

  v_def := replace(
    v_def,
    $replace$  v_effective_daily_limit := round(
    coalesce(p.daily_reward_limit_pkr, 0)
    * (1.00 + v_total_boost_pct / 100.00),
    2
  );
  v_remaining_daily := greatest(v_effective_daily_limit - v_daily, 0);

  v_level := CASE$replace$,
    $replace$  v_level := CASE$replace$
  );

  v_def := replace(
    v_def,
    $replace$  v_total_boost_pct := least(
    50.00,
    v_team_boost_pct + v_referral_boost_pct
  );

  v_earning_rating := least($replace$,
    $replace$  v_total_boost_pct := least(
    50.00,
    v_team_boost_pct + v_referral_boost_pct
  );

  v_effective_daily_limit := round(
    coalesce(p.daily_reward_limit_pkr, 0)
    * (1.00 + v_total_boost_pct / 100.00),
    2
  );
  v_remaining_daily := greatest(v_effective_daily_limit - v_daily, 0);

  v_earning_rating := least($replace$
  );

  IF v_def LIKE '%ad_view_sessions avs%' THEN
    RAISE EXCEPTION 'Referral boost qualification still depends on ad activity';
  END IF;

  EXECUTE v_def;
END $do$;
-- Apply referral/team boost exactly once in the reward formula.
-- The earning rating/decay multiplier already includes the boost, so the
-- sustainable reserve target must not multiply by it a second time.
do $migration$
declare
  v_definition text;
  v_updated text;
  v_old text;
  v_new text;
  v_old_comment text;
  v_new_comment text;
begin
  select pg_get_functiondef('public.complete_ad_view(uuid,text)'::regprocedure)
    into v_definition;

  v_old := 'v_curve_target := v_sustainable_per_ad * v_curve_factor * v_curve_noise * (1.00 + v_total_boost_pct / 100.00);';
  v_new := 'v_curve_target := v_sustainable_per_ad * v_curve_factor * v_curve_noise;';

  v_old_comment := '   * Referral/team boosts remain available, but they modify the earning' || E'\n' ||
    '   * rating only. The 30-day budget guard below remains the hard monetary' || E'\n' ||
    '   * ceiling, so boosts cannot consume the reserve prematurely.';

  v_new_comment := '   * Referral/team boosts are included once in the earning rating and' || E'\n' ||
    '   * decay multiplier. The reserve-aware 30-day target remains unboosted' || E'\n' ||
    '   * to avoid double-counting the boost and to pace available funds.';

  if position(v_old in v_definition) = 0 then
    raise exception 'Expected boosted target expression not found; no change applied';
  end if;

  v_updated := replace(v_definition, v_old, v_new);
  v_updated := replace(v_updated, v_old_comment, v_new_comment);

  if v_updated = v_definition
     or position(v_new in v_updated) = 0
     or position(v_old in v_updated) > 0 then
    raise exception 'Single-boost correction verification failed; no change applied';
  end if;

  execute v_updated;
end
$migration$;
-- Referral team-size + short activation boost for ad earnings.
-- Applies only to future ad completions; existing rewards are untouched.

do $$
declare
  v_def text;
  v_old text;
  v_new text;
  v_start integer;
  v_end integer;
  v_end_marker text := '  v_decay_multiplier := v_decay_multiplier * (1.00 + v_referral_boost_pct / 100.00);';
begin
  select pg_get_functiondef(p.oid)
  into v_def
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'complete_ad_view'
    and pg_get_function_identity_arguments(p.oid) = 'p_session_id uuid, p_idempotency_key text'
  limit 1;

  if v_def is null then
    raise exception 'complete_ad_view function not found';
  end if;

  v_old := '  v_referral_boost_pct numeric := 0;
  v_latest_referral_date date;';
  v_new := '  v_referral_boost_pct numeric := 0;
  v_team_boost_pct numeric := 0;
  v_total_boost_pct numeric := 0;
  v_active_direct_referrals integer := 0;
  v_latest_referral_date date;';

  if position(v_old in v_def) = 0 then
    raise exception 'Expected complete_ad_view declaration block not found';
  end if;
  v_def := replace(v_def, v_old, v_new);

  v_start := position('  /*' in substring(v_def from position('Qualified direct referral activity boost' in v_def) - 100))
             + position('Qualified direct referral activity boost' in v_def) - 101;
  v_end := position(v_end_marker in v_def);

  if v_start <= 0 or v_end <= v_start then
    raise exception 'Expected referral boost implementation block not found';
  end if;

  v_new := '  /*
   * Referral activity earning boost:
   * - Only qualified direct referrals with an ACTIVE plan count toward
   *   the permanent team-size boost.
   * - Team boost:
   *     0 => 0%, 1 => 15%, 2 => 20%, 3 => 25%,
   *     4-5 => 30%, 6-9 => 35%, 10+ => 40%.
   * - New qualified referral activation boost:
   *     Day 0 => +15%, Day 1 => +10%, Day 2 => +5%, then 0%.
   * - Activation boost uses the latest qualified referral only, so it
   *   never stacks across multiple referrals.
   * - Total referral boost is capped at +50 percentage points.
   * - Boost is added to the post-curve earning rating. This makes an
   *   active mature team meaningfully improve earning after the normal
   *   day-based curve starts declining.
   * - Daily reward limit and reserve remain hard safety ceilings.
   */
  select count(distinct rc.source_user_id)::integer
  into v_active_direct_referrals
  from public.referral_commissions rc
  where rc.user_id = v_user
    and rc.level = 1
    and lower(coalesce(rc.status, '''')) = ''completed''
    and rc.source_user_id is not null
    and exists (
      select 1
      from public.user_plans up
      where up.user_id = rc.source_user_id
        and up.status = ''active''
    );

  v_team_boost_pct := case
    when v_active_direct_referrals >= 10 then 40.00
    when v_active_direct_referrals >= 6 then 35.00
    when v_active_direct_referrals >= 4 then 30.00
    when v_active_direct_referrals = 3 then 25.00
    when v_active_direct_referrals = 2 then 20.00
    when v_active_direct_referrals = 1 then 15.00
    else 0.00
  end;

  select max((rc.created_at at time zone ''Asia/Karachi'')::date)
  into v_latest_referral_date
  from public.referral_commissions rc
  where rc.user_id = v_user
    and rc.level = 1
    and lower(coalesce(rc.status, '''')) = ''completed''
    and rc.source_user_id is not null
    and exists (
      select 1
      from public.user_plans up
      where up.user_id = rc.source_user_id
        and up.status = ''active''
    );

  if v_latest_referral_date is not null then
    v_referral_boost_pct := case current_date - v_latest_referral_date
      when 0 then 15.00
      when 1 then 10.00
      when 2 then 5.00
      else 0.00
    end;
  end if;

  v_total_boost_pct := least(
    50.00,
    v_team_boost_pct + v_referral_boost_pct
  );

  v_earning_rating := least(
    100.00,
    v_earning_rating + v_total_boost_pct
  );
  v_decay_multiplier := v_earning_rating / 100.00;';

  v_def := substring(v_def from 1 for v_start - 1)
         || v_new
         || substring(v_def from v_end + length(v_end_marker));

  execute v_def;
end
$$;

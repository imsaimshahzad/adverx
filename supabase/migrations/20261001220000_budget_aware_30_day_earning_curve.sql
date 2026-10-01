-- Budget-aware 30-day earning curve.
-- Uses each user's live allocated reward budget and keeps plan-specific curve shapes.
CREATE OR REPLACE FUNCTION public.complete_ad_view(p_session_id uuid, p_idempotency_key text)
 RETURNS numeric
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
 SET "TimeZone" TO 'Asia/Karachi'
AS $function$
declare
  s public.ad_view_sessions;
  p public.user_plans;
  a public.ads;
  rr public.reward_ranges;
  v_user uuid := auth.uid();
  v_reward numeric;
  v_raw_reward numeric;
  v_before numeric;
  v_after numeric;
  v_daily numeric;
  v_remaining_daily numeric;
  v_effective_daily_limit numeric;
  v_count integer;
  v_level text;
  v_existing public.ad_view_sessions;
  v_recovery_reserve numeric;
  v_plan_available numeric;
  v_combined_available numeric;
  v_plan_spend numeric;
  v_recovery_spend numeric;
  v_plan_age_days integer;
  v_earning_rating numeric;
  v_decay_multiplier numeric;
  v_referral_boost_pct numeric := 0;
  v_team_boost_pct numeric := 0;
  v_total_boost_pct numeric := 0;
  v_active_direct_referrals integer := 0;
  v_latest_referral_date date;
  v_existing_reward numeric;
  v_plan_name text;
  v_curve_factor numeric;
  v_curve_noise numeric;
  v_remaining_slots_30d numeric;
  v_sustainable_per_ad numeric;
  v_curve_target numeric;
begin
  if v_user is null then raise exception 'not authenticated'; end if;
  if length(coalesce(trim(p_idempotency_key), '')) < 8 then raise exception 'invalid idempotency key'; end if;

  select amount_pkr into v_reward
  from public.reward_transactions
  where idempotency_key = p_idempotency_key and user_id = v_user;
  if found then return v_reward; end if;

  select * into s
  from public.ad_view_sessions
  where id = p_session_id and user_id = v_user
  for update;
  if not found then raise exception 'Ad session not found'; end if;
  if s.status = 'completed' then return coalesce(s.reward_amount_pkr, 0); end if;
  if s.status <> 'started' then raise exception 'Ad session is not claimable'; end if;
  if s.loaded_at is null then raise exception 'Ad has not reported as loaded'; end if;
  if now() - s.started_at > interval '15 minutes' then raise exception 'Ad session expired'; end if;

  if exists (
    select 1 from public.profiles
    where id = v_user and role in ('admin', 'super_admin', 'moderator')
  ) then
    select * into a from public.ads where id = s.ad_id and status = 'active';
    if not found then raise exception 'Ad unavailable'; end if;
    if extract(epoch from now() - s.loaded_at) < greatest(a.duration_seconds, 0) + 1.5 then
      raise exception 'Ad engagement time is incomplete';
    end if;
    update public.ad_view_sessions
    set status = 'completed', completed_at = now(), reward_amount_pkr = 0
    where id = s.id and status = 'started';
    if not found then raise exception 'Ad session already completed'; end if;
    return 0;
  end if;

  select * into p
  from public.user_plans
  where id = s.user_plan_id and user_id = v_user and status = 'active'
  for update;
  if not found then raise exception 'No active plan'; end if;

  select name into v_plan_name from public.plans where id = p.plan_id;

  select coalesce(recovery_reserve_pkr, 0) into v_recovery_reserve
  from public.profiles where id = v_user for update;
  if not found then raise exception 'User profile not found'; end if;

  select * into v_existing
  from public.ad_view_sessions
  where user_id = v_user
    and user_plan_id = p.id
    and ad_id = s.ad_id
    and status = 'completed'
    and (completed_at at time zone 'Asia/Karachi')::date = current_date
  order by completed_at desc
  limit 1
  for update;

  if found then
    update public.ad_view_sessions
    set status = 'rejected', completed_at = null, reward_amount_pkr = 0
    where id = s.id and status = 'started';
    return coalesce(v_existing.reward_amount_pkr, 0);
  end if;

  select * into a from public.ads where id = s.ad_id and status = 'active';
  if not found then raise exception 'Ad unavailable'; end if;

  if extract(epoch from now() - s.loaded_at) < greatest(a.duration_seconds, 0) + 1.5 then
    raise exception 'Ad engagement time is incomplete';
  end if;

  select count(*) into v_count
  from public.ad_view_sessions
  where user_id = v_user
    and user_plan_id = p.id
    and status = 'completed'
    and (completed_at at time zone 'Asia/Karachi')::date = current_date;

  if v_count >= coalesce(p.ads_per_day, 0) then raise exception 'Daily ad limit reached'; end if;

  v_daily := case
    when p.daily_reward_date = current_date then coalesce(p.daily_reward_used_pkr, 0)
    else 0
  end;

  v_level := case
    when v_count < 2 then 'low'
    when v_count < 5 then 'normal'
    else 'high'
  end;

  select * into rr
  from public.reward_ranges
  where plan_id = p.plan_id
    and activity_level = v_level
    and active = true
  limit 1;

  v_raw_reward := coalesce(rr.minimum_pkr, p.base_ad_reward_pkr, 0)
    + random() * (
      coalesce(rr.maximum_pkr, p.max_ad_reward_pkr)
      - coalesce(rr.minimum_pkr, p.base_ad_reward_pkr, 0)
    );

  v_plan_age_days := greatest(
    0,
    current_date - (p.purchased_at at time zone 'Asia/Karachi')::date
  );

  /*
   * Budget-aware 30-day earning curve.
   * The curve is different per plan, but the actual user_plan budget is
   * always the source of truth. No fixed daily subtraction is used.
   *
   * Starter: wider early-to-late curve
   * Growth: medium curve
   * Pro: smoother curve
   *
   * Each ad recalculates the sustainable amount from the live remaining
   * combined reserve, so early higher days naturally reduce later targets.
   */
  v_curve_factor := case v_plan_name
    when 'Starter' then 1.12 - (0.24 * least(v_plan_age_days, 29) / 29.0)
    when 'Growth' then 1.08 - (0.16 * least(v_plan_age_days, 29) / 29.0)
    when 'Pro' then 1.05 - (0.10 * least(v_plan_age_days, 29) / 29.0)
    else 1.10 - (0.20 * least(v_plan_age_days, 29) / 29.0)
  end;

  v_curve_noise := 0.90 + (random() * 0.20);

  /*
   * Referral/team boosts remain available, but they modify the earning
   * rating only. The 30-day budget guard below remains the hard monetary
   * ceiling, so boosts cannot consume the reserve prematurely.
   */
  select count(distinct rc.source_user_id)::integer
  into v_active_direct_referrals
  from public.referral_commissions rc
  where rc.user_id = v_user
    and rc.level = 1
    and lower(coalesce(rc.status, '')) = 'completed'
    and rc.source_user_id is not null
    and exists (
      select 1 from public.user_plans up
      where up.user_id = rc.source_user_id and up.status = 'active'
    )
    and rc.created_at >= now() - interval '7 days';

  v_team_boost_pct := case
    when v_active_direct_referrals >= 10 then 40.00
    when v_active_direct_referrals >= 6 then 35.00
    when v_active_direct_referrals >= 4 then 30.00
    when v_active_direct_referrals = 3 then 25.00
    when v_active_direct_referrals = 2 then 20.00
    when v_active_direct_referrals = 1 then 15.00
    else 0.00
  end;

  select max((rc.created_at at time zone 'Asia/Karachi')::date)
  into v_latest_referral_date
  from public.referral_commissions rc
  where rc.user_id = v_user
    and rc.level = 1
    and lower(coalesce(rc.status, '')) = 'completed'
    and rc.source_user_id is not null
    and exists (
      select 1 from public.user_plans up
      where up.user_id = rc.source_user_id and up.status = 'active'
    )
    and rc.created_at >= now() - interval '7 days';

  if v_latest_referral_date is not null then
    v_referral_boost_pct := case current_date - v_latest_referral_date
      when 0 then 15.00
      when 1 then 10.00
      when 2 then 5.00
      else 0.00
    end;
  end if;

  v_total_boost_pct := least(50.00, v_team_boost_pct + v_referral_boost_pct);

  v_earning_rating := least(
    100.00,
    greatest(10.00, (v_curve_factor * 100.00) + v_total_boost_pct)
  );
  v_decay_multiplier := v_earning_rating / 100.00;

  v_effective_daily_limit := round(
    coalesce(p.daily_reward_limit_pkr, 0) * (1.00 + v_total_boost_pct / 100.00),
    2
  );
  v_remaining_daily := greatest(v_effective_daily_limit - v_daily, 0);

  update public.user_plans
  set earning_rating_pct = v_earning_rating,
      earning_rating_updated_at = now()
  where id = p.id;

  v_plan_available := greatest(coalesce(p.remaining_reward_budget_pkr, 0), 0);
  v_combined_available := v_plan_available + v_recovery_reserve;

  if v_remaining_daily <= 0 or v_combined_available <= 0 then
    v_reward := 0;
  else
    /*
     * Count only the remaining ad slots inside the 30-day horizon.
     * If a user watches fewer ads, their unused budget is preserved and
     * the next claim recalculates from the new live balance.
     */
    v_remaining_slots_30d := greatest(
      case
        when v_plan_age_days < 30 then
          ((30 - v_plan_age_days - 1) * coalesce(p.ads_per_day, 0))
          + greatest(coalesce(p.ads_per_day, 0) - v_count, 0)
        else
          greatest(coalesce(p.ads_per_day, 0) - v_count, 0)
      end,
      1
    );

    v_sustainable_per_ad := v_combined_available / v_remaining_slots_30d;

    /*
     * Natural variation around the sustainable budget rate.
     * 0.75x-1.35x is deliberately bounded so the curve is gradual rather
     * than a visible fixed decrement.
     */
    v_curve_target := v_sustainable_per_ad * v_curve_factor * v_curve_noise;

    v_reward := round(
      least(
        v_raw_reward * v_decay_multiplier,
        v_curve_target * 1.35,
        v_remaining_daily,
        v_combined_available
      ),
      2
    );

    if v_reward > 0 and v_reward < round(v_sustainable_per_ad * 0.75, 2) then
      v_reward := round(least(v_sustainable_per_ad * 0.75, v_remaining_daily, v_combined_available), 2);
    end if;
  end if;

  v_plan_spend := least(v_reward, v_plan_available);
  v_recovery_spend := v_reward - v_plan_spend;
  v_before := v_combined_available;
  v_after := v_combined_available - v_reward;

  update public.user_plans
  set remaining_reward_budget_pkr = v_plan_available - v_plan_spend,
      daily_reward_used_pkr = v_daily + v_reward,
      daily_reward_date = current_date,
      updated_at = now()
  where id = p.id
    and remaining_reward_budget_pkr >= v_plan_spend;
  if not found then raise exception 'Reward reserve changed, retry'; end if;

  if v_recovery_spend > 0 then
    update public.profiles
    set recovery_reserve_pkr = coalesce(recovery_reserve_pkr, 0) - v_recovery_spend
    where id = v_user
      and coalesce(recovery_reserve_pkr, 0) >= v_recovery_spend;
    if not found then raise exception 'Recovery Reserve changed, retry'; end if;

    insert into public.recovery_fund_ledger(
      entry_type, amount_pkr, reference_id, user_id, plan_id, note
    )
    values(
      'referrer_debit', v_recovery_spend, s.id, v_user, p.plan_id,
      'Recovery Reserve consumed for additional ad earning capacity'
    );
  end if;

  update public.ad_view_sessions
  set status = 'completed', completed_at = now(), reward_amount_pkr = v_reward
  where id = s.id and status = 'started';
  if not found then raise exception 'Ad session already completed'; end if;

  insert into public.reward_transactions(
    user_id, user_plan_id, ad_id, reward_type, amount_pkr,
    reserve_before_pkr, reserve_after_pkr,
    daily_reward_before_pkr, daily_reward_after_pkr,
    idempotency_key, status
  )
  values(
    v_user, p.id, s.ad_id, 'ad_reward', v_reward,
    v_before, v_after, v_daily, v_daily + v_reward,
    p_idempotency_key, 'completed'
  );

  if v_reward > 0 then
    insert into public.ledger_entries(user_id, entry_type, amount, reference_id, note)
    values(v_user, 'ad_reward', v_reward, s.id, 'Server-calculated budget-aware ad reward');

    insert into public.wallet_transactions(
      user_id, type, amount, currency, status, reference_id, reference_type, metadata
    )
    values(
      v_user, 'TASK_REWARD', v_reward, 'PKR', 'completed',
      s.id, 'ad_reward',
      jsonb_build_object(
        'user_plan_id', p.id,
        'plan_reserve_spend', v_plan_spend,
        'recovery_reserve_spend', v_recovery_spend,
        'plan_age_days', v_plan_age_days,
        'earning_rating_pct', v_earning_rating,
        'decay_multiplier', v_decay_multiplier,
        'curve_factor', v_curve_factor,
        'curve_noise', v_curve_noise,
        'sustainable_per_ad', v_sustainable_per_ad,
        'currency', 'PKR'
      )
    );
  end if;

  return v_reward;

exception
  when unique_violation then
    select amount_pkr into v_existing_reward
    from public.reward_transactions
    where idempotency_key = p_idempotency_key and user_id = v_user;
    if found then return v_existing_reward; end if;
    raise;
end;
$function$


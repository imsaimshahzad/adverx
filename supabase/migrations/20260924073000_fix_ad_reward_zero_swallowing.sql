-- Never convert an unrelated unique-constraint failure into a fake Rs.0 reward.
-- Only return 0/nonzero from an idempotency race when the reward transaction
-- actually exists for the same user + idempotency key.

create or replace function public.complete_ad_view(p_session_id uuid, p_idempotency_key text)
returns numeric
language plpgsql
security definer
set search_path to ''
set "TimeZone" to 'Asia/Karachi'
as $function$
DECLARE
  s public.ad_view_sessions;
  p public.user_plans;
  a public.ads;
  rr public.reward_ranges;
  v_user uuid := auth.uid();
  v_reward numeric;
  v_before numeric;
  v_after numeric;
  v_daily numeric;
  v_count integer;
  v_level text;
  v_existing public.ad_view_sessions;
  v_recovery_reserve numeric;
  v_plan_available numeric;
  v_combined_available numeric;
  v_plan_spend numeric;
  v_recovery_spend numeric;
  v_plan_age_days integer;
  v_decay_multiplier numeric;
  v_existing_reward numeric;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF length(coalesce(trim(p_idempotency_key), '')) < 8 THEN RAISE EXCEPTION 'invalid idempotency key'; END IF;

  SELECT amount_pkr INTO v_reward
  FROM public.reward_transactions
  WHERE idempotency_key = p_idempotency_key AND user_id = v_user;
  IF FOUND THEN RETURN v_reward; END IF;

  SELECT * INTO s FROM public.ad_view_sessions
  WHERE id = p_session_id AND user_id = v_user FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Ad session not found'; END IF;
  IF s.status = 'completed' THEN RETURN coalesce(s.reward_amount_pkr, 0); END IF;
  IF s.status <> 'started' THEN RAISE EXCEPTION 'Ad session is not claimable'; END IF;

  SELECT * INTO p FROM public.user_plans
  WHERE id = s.user_plan_id AND user_id = v_user AND status = 'active' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'No active plan'; END IF;

  SELECT COALESCE(recovery_reserve_pkr, 0) INTO v_recovery_reserve
  FROM public.profiles WHERE id = v_user FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'User profile not found'; END IF;

  SELECT * INTO v_existing
  FROM public.ad_view_sessions
  WHERE user_id = v_user AND user_plan_id = p.id AND ad_id = s.ad_id
    AND status = 'completed' AND completed_at::date = current_date
  ORDER BY completed_at DESC LIMIT 1 FOR UPDATE;
  IF FOUND THEN
    UPDATE public.ad_view_sessions SET status = 'rejected', completed_at = now()
    WHERE id = s.id AND status = 'started';
    RETURN coalesce(v_existing.reward_amount_pkr, 0);
  END IF;

  SELECT * INTO a FROM public.ads WHERE id = s.ad_id AND status = 'active';
  IF NOT FOUND THEN RAISE EXCEPTION 'Ad unavailable'; END IF;
  IF extract(epoch from now() - s.started_at) < a.duration_seconds THEN
    RAISE EXCEPTION 'Ad engagement time is incomplete';
  END IF;

  SELECT count(*) INTO v_count
  FROM public.ad_view_sessions
  WHERE user_id = v_user AND user_plan_id = p.id
    AND status = 'completed' AND completed_at::date = current_date;
  IF v_count >= coalesce(p.ads_per_day, 0) THEN RAISE EXCEPTION 'Daily ad limit reached'; END IF;

  v_daily := CASE WHEN p.daily_reward_date = current_date THEN coalesce(p.daily_reward_used_pkr, 0) ELSE 0 END;
  v_level := CASE WHEN v_count < 2 THEN 'low' WHEN v_count < 5 THEN 'normal' ELSE 'high' END;

  SELECT * INTO rr FROM public.reward_ranges
  WHERE plan_id = p.plan_id AND activity_level = v_level AND active = true LIMIT 1;

  v_reward := coalesce(rr.minimum_pkr, p.base_ad_reward_pkr, 0)
    + random() * (coalesce(rr.maximum_pkr, p.max_ad_reward_pkr) - coalesce(rr.minimum_pkr, p.base_ad_reward_pkr, 0));

  v_plan_age_days := greatest(0, current_date - (p.purchased_at AT TIME ZONE 'Asia/Karachi')::date);
  v_decay_multiplier := CASE WHEN v_plan_age_days <= 7 THEN 1.0000
    ELSE greatest(0.5000, power(0.975::numeric, v_plan_age_days - 7)) END;
  v_reward := v_reward * v_decay_multiplier;

  v_plan_available := greatest(coalesce(p.remaining_reward_budget_pkr, 0), 0);
  v_combined_available := v_plan_available + v_recovery_reserve;
  v_reward := round(least(v_reward, coalesce(p.max_ad_reward_pkr, v_reward),
    greatest(coalesce(p.daily_reward_limit_pkr, 0) - v_daily, 0), v_combined_available), 2);
  IF v_reward <= 0 THEN RAISE EXCEPTION 'Reward reserve exhausted'; END IF;

  v_plan_spend := least(v_reward, v_plan_available);
  v_recovery_spend := v_reward - v_plan_spend;
  v_before := v_combined_available;
  v_after := v_combined_available - v_reward;

  UPDATE public.user_plans
  SET remaining_reward_budget_pkr = v_plan_available - v_plan_spend,
      daily_reward_used_pkr = v_daily + v_reward,
      daily_reward_date = current_date,
      updated_at = now()
  WHERE id = p.id AND remaining_reward_budget_pkr >= v_plan_spend;
  IF NOT FOUND THEN RAISE EXCEPTION 'Reward reserve changed, retry'; END IF;

  IF v_recovery_spend > 0 THEN
    UPDATE public.profiles
    SET recovery_reserve_pkr = COALESCE(recovery_reserve_pkr, 0) - v_recovery_spend
    WHERE id = v_user AND COALESCE(recovery_reserve_pkr, 0) >= v_recovery_spend;
    IF NOT FOUND THEN RAISE EXCEPTION 'Recovery Reserve changed, retry'; END IF;

    INSERT INTO public.recovery_fund_ledger(entry_type, amount_pkr, reference_id, user_id, plan_id, note)
    VALUES('referrer_debit', v_recovery_spend, s.id, v_user, p.plan_id,
           'Recovery Reserve consumed for additional ad earning capacity');
  END IF;

  UPDATE public.ad_view_sessions
  SET status = 'completed', completed_at = now(), reward_amount_pkr = v_reward
  WHERE id = s.id AND status = 'started';
  IF NOT FOUND THEN RAISE EXCEPTION 'Ad session already completed'; END IF;

  INSERT INTO public.reward_transactions(
    user_id, user_plan_id, ad_id, reward_type, amount_pkr,
    reserve_before_pkr, reserve_after_pkr, daily_reward_before_pkr,
    daily_reward_after_pkr, idempotency_key, status
  ) VALUES(
    v_user, p.id, s.ad_id, 'ad_reward', v_reward,
    v_before, v_after, v_daily, v_daily + v_reward,
    p_idempotency_key, 'completed'
  );

  INSERT INTO public.ledger_entries(user_id, entry_type, amount, reference_id, note)
  VALUES(v_user, 'ad_reward', v_reward, s.id, 'Server-calculated activity-based ad reward');

  INSERT INTO public.wallet_transactions(
    user_id, type, amount, currency, status, reference_id, reference_type, metadata
  ) VALUES(
    v_user, 'TASK_REWARD', v_reward, 'PKR', 'completed', s.id, 'ad_reward',
    jsonb_build_object(
      'user_plan_id', p.id,
      'plan_reserve_spend', v_plan_spend,
      'recovery_reserve_spend', v_recovery_spend,
      'plan_age_days', v_plan_age_days,
      'decay_multiplier', v_decay_multiplier,
      'currency', 'PKR'
    )
  );

  RETURN v_reward;

EXCEPTION
  WHEN unique_violation THEN
    -- A genuine idempotency race is safe to resolve, but any other unique
    -- constraint must surface its real error instead of returning Rs.0.
    SELECT amount_pkr INTO v_existing_reward
    FROM public.reward_transactions
    WHERE idempotency_key = p_idempotency_key AND user_id = v_user;

    IF FOUND THEN
      RETURN v_existing_reward;
    END IF;

    RAISE;
END;
$function$;

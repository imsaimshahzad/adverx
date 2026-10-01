-- Referral activity boost for ad earnings
-- Day 0: +15%, Day 1: +10%, Day 2: +5%, then normal.
-- Only the latest completed direct (level-1) referral qualifies.
-- This never changes the plan's daily reward ceiling.

DO $$
DECLARE
  v_def text;
  v_new text;
BEGIN
  SELECT pg_get_functiondef(p.oid)
    INTO v_def
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname = 'complete_ad_view'
    AND pg_get_function_identity_arguments(p.oid) = 'p_session_id uuid, p_idempotency_key text';

  IF v_def IS NULL THEN
    RAISE EXCEPTION 'complete_ad_view(uuid,text) not found';
  END IF;

  v_new := replace(
    v_def,
    '  v_decay_multiplier numeric;',
    '  v_decay_multiplier numeric;
  v_referral_boost_pct numeric := 0;
  v_latest_referral_date date;'
  );

  v_new := replace(
    v_new,
    '  v_decay_multiplier := v_earning_rating / 100.00;',
    '  v_decay_multiplier := v_earning_rating / 100.00;

  /*
   * Qualified direct referral activity boost:
   * - latest completed level-1 referral only
   * - Day 0: +15%, Day 1: +10%, Day 2: +5%
   * - Day 3 onward: normal earning curve
   * - does not stack; a newer qualified referral resets the 3-day window
   * - never increases the daily reward ceiling
   */
  SELECT max((rc.created_at AT TIME ZONE ''Asia/Karachi'')::date)
  INTO v_latest_referral_date
  FROM public.referral_commissions rc
  WHERE rc.user_id = v_user
    AND rc.level = 1
    AND lower(coalesce(rc.status, '''')) = ''completed'';

  IF v_latest_referral_date IS NOT NULL THEN
    v_referral_boost_pct := CASE current_date - v_latest_referral_date
      WHEN 0 THEN 15.00
      WHEN 1 THEN 10.00
      WHEN 2 THEN 5.00
      ELSE 0.00
    END;
  END IF;

  v_decay_multiplier := v_decay_multiplier * (1.00 + v_referral_boost_pct / 100.00);'
  );

  IF v_new = v_def THEN
    RAISE EXCEPTION 'No changes were applied to complete_ad_view';
  END IF;

  EXECUTE v_new;
END $$;

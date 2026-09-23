-- Lock the approved six-level indirect referral pool allocation.
-- Pool percentages must total exactly 100%; payout eligibility remains Pro-only
-- and non-eligible levels are skipped without rollover.

UPDATE public.indirect_referral_level_rates
SET percentage = CASE level
  WHEN 1 THEN 30
  WHEN 2 THEN 20
  WHEN 3 THEN 15
  WHEN 4 THEN 15
  WHEN 5 THEN 10
  WHEN 6 THEN 10
END,
updated_at = now();

DO $$
DECLARE
  v_total numeric;
BEGIN
  SELECT COALESCE(SUM(percentage), 0)
  INTO v_total
  FROM public.indirect_referral_level_rates;

  IF v_total <> 100 THEN
    RAISE EXCEPTION 'Indirect referral level rates must total 100%%; current total is %', v_total;
  END IF;
END $$;
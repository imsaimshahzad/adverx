-- Pro Rs 900 indirect referral commission model: L1 direct 18%; L2-L6 indirect 2/1.5/1/0.75/0.75%; recovery 6%; ad budget 58%.
ALTER TABLE public.plans
  ALTER COLUMN ad_budget_pct SET EXPRESSION AS (
    100 - admin_profit_pct - referrer_commission_pct - indirect_referral_pct - recovery_fund_pct
  );

UPDATE public.plans SET indirect_referral_pct = 0, updated_at = now()
WHERE lower(name) IN ('starter','growth');

UPDATE public.plans
SET indirect_referral_pct = 6,
    recovery_fund_pct = 6,
    activity_rules = jsonb_build_object(
      'indirect_referral_levels', jsonb_build_object(
        'level_2', 2, 'level_3', 1.5, 'level_4', 1,
        'level_5', 0.75, 'level_6', 0.75
      ),
      'indirect_referral_total_pct', 6,
      'indirect_referral_max_level', 6
    ),
    updated_at = now()
WHERE lower(name) = 'pro' AND price_pkr = 900;





ALTER FUNCTION public.admin_approve_deposit(uuid,text,text) SET search_path = public, pg_catalog;
ALTER FUNCTION public.sync_approved_plan_snapshot() SET search_path = public, pg_catalog;
REVOKE EXECUTE ON FUNCTION public.process_referral_commissions() FROM anon, authenticated;

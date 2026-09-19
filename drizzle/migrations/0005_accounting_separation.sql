-- =====================================================================
-- Accounting separation for approved plan deposits.
-- This migration is intentionally not executed by v0. Review and run it
-- manually in the target Supabase SQL Editor after validating the schema.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.admin_accounting_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deposit_id uuid NOT NULL UNIQUE REFERENCES public.deposits(id) ON DELETE RESTRICT,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  plan_id uuid REFERENCES public.plans(id) ON DELETE RESTRICT,
  plan_name text NOT NULL,
  gross_amount numeric(14,2) NOT NULL CHECK (gross_amount > 0),
  platform_profit_rate numeric(8,4) NOT NULL,
  referral_rate numeric(8,4) NOT NULL,
  platform_profit_amount numeric(14,2) NOT NULL,
  assigned_referral_amount numeric(14,2) NOT NULL DEFAULT 0,
  unassigned_referral_amount numeric(14,2) NOT NULL DEFAULT 0,
  retained_reward_budget_amount numeric(14,2) NOT NULL DEFAULT 0,
  user_reward_reserve_amount numeric(14,2) NOT NULL DEFAULT 0,
  recovery_fund_amount numeric(14,2) NOT NULL DEFAULT 0,
  referrer_id uuid REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (assigned_referral_amount >= 0),
  CHECK (unassigned_referral_amount >= 0),
  CHECK (retained_reward_budget_amount >= 0),
  CHECK (user_reward_reserve_amount >= 0),
  CHECK (recovery_fund_amount >= 0),
  CHECK (platform_profit_amount + assigned_referral_amount + unassigned_referral_amount
    + retained_reward_budget_amount + user_reward_reserve_amount + recovery_fund_amount = gross_amount)
);

CREATE TABLE IF NOT EXISTS public.admin_profit_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deposit_id uuid NOT NULL REFERENCES public.deposits(id) ON DELETE RESTRICT,
  allocation_id uuid NOT NULL REFERENCES public.admin_accounting_allocations(id) ON DELETE RESTRICT,
  category text NOT NULL CHECK (category IN ('PLATFORM_PROFIT','UNASSIGNED_REFERRAL','RETAINED_REWARD_BUDGET')),
  amount numeric(14,2) NOT NULL CHECK (amount >= 0),
  currency text NOT NULL DEFAULT 'PKR',
  source text NOT NULL DEFAULT 'approved_deposit',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (deposit_id, category)
);

CREATE INDEX IF NOT EXISTS idx_admin_profit_ledger_category_created
  ON public.admin_profit_ledger(category, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_profit_ledger_deposit
  ON public.admin_profit_ledger(deposit_id);
CREATE INDEX IF NOT EXISTS idx_admin_allocations_user_created
  ON public.admin_accounting_allocations(user_id, created_at DESC);

ALTER TABLE public.admin_accounting_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_profit_ledger ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admins read accounting allocations" ON public.admin_accounting_allocations;
CREATE POLICY "admins read accounting allocations" ON public.admin_accounting_allocations
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
DROP POLICY IF EXISTS "admins read profit ledger" ON public.admin_profit_ledger;
CREATE POLICY "admins read profit ledger" ON public.admin_profit_ledger
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
GRANT SELECT ON public.admin_accounting_allocations, public.admin_profit_ledger TO authenticated;
GRANT ALL ON public.admin_accounting_allocations, public.admin_profit_ledger TO service_role;

CREATE OR REPLACE FUNCTION public.admin_approve_deposit(
  p_deposit_id uuid,
  p_next_status text,
  p_rejection_reason text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_admin uuid := auth.uid();
  v_deposits public.deposits;
  v_plan public.plans;
  v_referrer uuid;
  v_plan_name text;
  v_referral_rate numeric;
  v_platform_rate numeric := 0.12;
  v_platform numeric;
  v_referral numeric;
  v_recovery numeric;
  v_reserve numeric;
  v_retained numeric;
  v_allocation_id uuid;
  v_tx uuid;
BEGIN
  IF NOT public.is_admin(v_admin) THEN RAISE EXCEPTION 'Forbidden'; END IF;
  IF p_next_status NOT IN ('approved', 'rejected') THEN RAISE EXCEPTION 'Invalid deposit status'; END IF;

  SELECT * INTO v_deposits FROM public.deposits WHERE id = p_deposit_id FOR UPDATE;
  IF v_deposits.id IS NULL THEN RAISE EXCEPTION 'Deposit not found'; END IF;
  IF v_deposits.status <> 'pending' THEN RAISE EXCEPTION 'Deposit already reviewed'; END IF;

  IF p_next_status = 'rejected' THEN
    UPDATE public.deposits SET status = 'rejected', reviewed_at = now(), reviewer_id = v_admin,
      review_note = p_rejection_reason WHERE id = p_deposit_id;
    PERFORM public.notify_user(v_deposits.user_id, 'Deposit rejected',
      COALESCE(p_rejection_reason, 'We could not verify this payment.'), 'deposit');
    PERFORM public.log_audit('deposit.reject', 'deposit', p_deposit_id::text,
      jsonb_build_object('status','pending'), jsonb_build_object('status','rejected'), p_rejection_reason);
    RETURN jsonb_build_object('ok', true, 'status', 'rejected', 'deposit_id', p_deposit_id);
  END IF;

  IF v_deposits.plan_id IS NULL THEN RAISE EXCEPTION 'Approved deposits require a plan'; END IF;
  SELECT * INTO v_plan FROM public.plans WHERE id = v_deposits.plan_id FOR UPDATE;
  IF v_plan.id IS NULL THEN RAISE EXCEPTION 'Plan not found'; END IF;

  v_plan_name := lower(v_plan.name);
  v_referral_rate := CASE
    WHEN v_plan_name LIKE '%starter%' THEN 0.12
    WHEN v_plan_name LIKE '%growth%' THEN 0.15
    WHEN v_plan_name LIKE '%pro%' THEN 0.18
    ELSE NULL
  END;
  IF v_referral_rate IS NULL THEN RAISE EXCEPTION 'Unsupported plan referral rate'; END IF;

  v_platform := round(v_deposits.amount * v_platform_rate, 2);
  v_referral := round(v_deposits.amount * v_referral_rate, 2);
  v_recovery := round(v_deposits.amount * 0.08, 2);
  v_reserve := round(v_deposits.amount - v_platform - v_referral - v_recovery, 2);
  v_retained := 0;
  IF v_reserve < 0 OR v_platform + v_referral + v_recovery + v_reserve <> v_deposits.amount THEN
    RAISE EXCEPTION 'Deposit allocation does not reconcile';
  END IF;

  SELECT r.referrer_id INTO v_referrer
  FROM public.referrals r
  WHERE r.referred_id = v_deposits.user_id AND r.level = 1
    AND r.referrer_id <> v_deposits.user_id
  LIMIT 1;

  IF v_referrer IS NOT NULL THEN
    v_referral := v_referral;
  END IF;

  INSERT INTO public.admin_accounting_allocations (
    deposit_id, user_id, plan_id, plan_name, gross_amount,
    platform_profit_rate, referral_rate, platform_profit_amount,
    assigned_referral_amount, unassigned_referral_amount,
    retained_reward_budget_amount, user_reward_reserve_amount,
    recovery_fund_amount, referrer_id
  ) VALUES (
    p_deposit_id, v_deposits.user_id, v_plan.id, v_plan.name, v_deposits.amount,
    v_platform_rate, v_referral_rate, v_platform,
    CASE WHEN v_referrer IS NULL THEN 0 ELSE v_referral END,
    CASE WHEN v_referrer IS NULL THEN v_referral ELSE 0 END,
    v_retained, v_reserve, v_recovery, v_referrer
  ) RETURNING id INTO v_allocation_id;

  INSERT INTO public.admin_profit_ledger (deposit_id, allocation_id, category, amount, metadata)
  VALUES
    (p_deposit_id, v_allocation_id, 'PLATFORM_PROFIT', v_platform,
      jsonb_build_object('plan_name', v_plan.name, 'rate', v_platform_rate)),
    (p_deposit_id, v_allocation_id, 'UNASSIGNED_REFERRAL',
      CASE WHEN v_referrer IS NULL THEN v_referral ELSE 0 END,
      jsonb_build_object('plan_name', v_plan.name, 'rate', v_referral_rate)),
    (p_deposit_id, v_allocation_id, 'RETAINED_REWARD_BUDGET', v_retained,
      jsonb_build_object('plan_name', v_plan.name));

  INSERT INTO public.wallet_transactions
    (user_id, type, amount, status, reference_type, reference_id, description, admin_id, processed_at, metadata)
  VALUES (v_deposits.user_id, 'DEPOSIT', v_deposits.amount, 'completed', 'deposit', p_deposit_id,
    'Deposit approved', v_admin, now(), jsonb_build_object('allocation_id', v_allocation_id))
  RETURNING id INTO v_tx;
  INSERT INTO public.wallet_transactions
    (user_id, type, amount, status, reference_type, reference_id, description, admin_id, processed_at)
  VALUES (v_deposits.user_id, 'PLAN_ACTIVATION', -v_deposits.amount, 'completed', 'plan', v_plan.id,
    'Plan access — ' || v_plan.name, v_admin, now());

  IF v_referrer IS NOT NULL THEN
    INSERT INTO public.wallet_transactions
      (user_id, type, amount, status, reference_type, reference_id, description, admin_id, processed_at, metadata)
    VALUES (v_referrer, 'REFERRAL_REWARD', v_referral, 'completed', 'deposit', p_deposit_id,
      'Referral commission on approved plan deposit', v_admin, now(),
      jsonb_build_object('rate', v_referral_rate, 'allocation_id', v_allocation_id));
    INSERT INTO public.referral_commissions
      (referrer_id, referred_id, level, rate, amount, qualifying_activity, source_transaction_id)
    VALUES (v_referrer, v_deposits.user_id, 1, v_referral_rate, v_referral,
      'approved_plan_deposit', v_tx);
  END IF;

  UPDATE public.user_plans SET is_active = false
    WHERE user_id = v_deposits.user_id AND is_active;
  INSERT INTO public.user_plans (user_id, plan_id, expires_at, source_deposit_id)
    VALUES (v_deposits.user_id, v_plan.id, now() + (v_plan.duration_days || ' days')::interval, p_deposit_id);
  UPDATE public.profiles SET status = 'active' WHERE id = v_deposits.user_id;
  UPDATE public.deposits SET status = 'approved', reviewed_at = now(), reviewer_id = v_admin,
    review_note = p_rejection_reason WHERE id = p_deposit_id;
  PERFORM public.notify_user(v_deposits.user_id, 'Deposit approved',
    'Your payment was verified and your plan access is active.', 'deposit');
  PERFORM public.log_audit('deposit.approve', 'deposit', p_deposit_id::text,
    jsonb_build_object('status','pending'), jsonb_build_object('status','approved', 'allocation_id', v_allocation_id), NULL);
  RETURN jsonb_build_object('ok', true, 'status', 'approved', 'deposit_id', p_deposit_id,
    'allocation_id', v_allocation_id, 'platform_profit', v_platform,
    'referral_amount', v_referral);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_profit_summary()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'platform_profit_total', COALESCE((SELECT SUM(amount) FROM public.admin_profit_ledger WHERE category = 'PLATFORM_PROFIT'), 0),
    'platform_profit_today', COALESCE((SELECT SUM(amount) FROM public.admin_profit_ledger WHERE category = 'PLATFORM_PROFIT' AND created_at >= date_trunc('day', now())), 0),
    'platform_profit_month', COALESCE((SELECT SUM(amount) FROM public.admin_profit_ledger WHERE category = 'PLATFORM_PROFIT' AND created_at >= date_trunc('month', now())), 0),
    'available_platform_balance', COALESCE((SELECT SUM(amount) FROM public.admin_profit_ledger WHERE category = 'PLATFORM_PROFIT'), 0),
    'unassigned_referral_total', COALESCE((SELECT SUM(amount) FROM public.admin_profit_ledger WHERE category = 'UNASSIGNED_REFERRAL'), 0),
    'retained_reward_budget_total', COALESCE((SELECT SUM(amount) FROM public.admin_profit_ledger WHERE category = 'RETAINED_REWARD_BUDGET'), 0),
    'user_reward_reserve_total', COALESCE((SELECT SUM(user_reward_reserve_amount) FROM public.admin_accounting_allocations), 0),
    'recovery_fund_total', COALESCE((SELECT SUM(recovery_fund_amount) FROM public.admin_accounting_allocations), 0),
    'recovery_fund_remaining', COALESCE((SELECT SUM(recovery_fund_amount) FROM public.admin_accounting_allocations), 0),
    'admin_own_balance', COALESCE((SELECT SUM(amount) FROM public.admin_profit_ledger WHERE category = 'PLATFORM_PROFIT'), 0)
  );
$$;

CREATE OR REPLACE FUNCTION public.admin_operations_overview()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'platform_profit_total', COALESCE((SELECT SUM(amount) FROM public.admin_profit_ledger WHERE category = 'PLATFORM_PROFIT'), 0),
    'unassigned_referral_total', COALESCE((SELECT SUM(amount) FROM public.admin_profit_ledger WHERE category = 'UNASSIGNED_REFERRAL'), 0),
    'retained_reward_budget_total', COALESCE((SELECT SUM(amount) FROM public.admin_profit_ledger WHERE category = 'RETAINED_REWARD_BUDGET'), 0),
    'total_referral_commissions', COALESCE((SELECT SUM(amount) FROM public.referral_commissions WHERE status = 'completed'), 0),
    'total_remaining_user_reward_reserves', COALESCE((SELECT SUM(user_reward_reserve_amount) FROM public.admin_accounting_allocations), 0),
    'total_recovery_fund_collected', COALESCE((SELECT SUM(recovery_fund_amount) FROM public.admin_accounting_allocations), 0),
    'total_recovery_fund_used', 0,
    'remaining_recovery_fund', COALESCE((SELECT SUM(recovery_fund_amount) FROM public.admin_accounting_allocations), 0)
  );
$$;

REVOKE ALL ON FUNCTION public.admin_approve_deposit(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_approve_deposit(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_profit_summary() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_operations_overview() TO authenticated;

-- Manual verification examples (do not run as part of this migration):
-- SELECT public.admin_profit_summary();
-- SELECT public.admin_operations_overview();
-- Starter Rs.300 without a referrer must yield 36 platform, 36 unassigned,
-- 24 recovery, 204 user reserve, and 0 retained budget.
-- Existing historical rows are intentionally not backfilled or rewritten.
-- Ahmad's existing retained Starter plan is intentionally untouched.

COMMIT;

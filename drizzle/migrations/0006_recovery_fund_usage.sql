-- Recovery Fund usage flow. Review and run manually in Supabase; v0 does not execute SQL.
CREATE TABLE IF NOT EXISTS public.recovery_fund_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  direction text NOT NULL CHECK (direction IN ('CREDIT', 'DEBIT')),
  amount numeric(14,2) NOT NULL CHECK (amount > 0),
  usage_type text CHECK (usage_type IN ('User Recovery', 'Platform Recovery', 'Other')),
  target_user_id uuid REFERENCES auth.users(id) ON DELETE RESTRICT,
  reason text NOT NULL CHECK (length(trim(reason)) > 0),
  reference text,
  actor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  balance_after numeric(14,2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((direction = 'DEBIT' AND usage_type IS NOT NULL) OR direction = 'CREDIT')
);
ALTER TABLE public.recovery_fund_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read recovery fund transactions" ON public.recovery_fund_transactions FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
GRANT SELECT ON public.recovery_fund_transactions TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_use_recovery_fund(
  p_amount numeric, p_usage_type text, p_target_user_id uuid DEFAULT NULL,
  p_reason text DEFAULT NULL, p_reference text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_admin uuid := auth.uid(); v_collected numeric; v_used numeric; v_remaining numeric; v_id uuid;
BEGIN
  IF NOT public.is_admin(v_admin) THEN RAISE EXCEPTION 'Forbidden'; END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN RAISE EXCEPTION 'Amount must be greater than zero'; END IF;
  IF p_usage_type NOT IN ('User Recovery', 'Platform Recovery', 'Other') THEN RAISE EXCEPTION 'Invalid usage type'; END IF;
  IF p_usage_type = 'User Recovery' AND p_target_user_id IS NULL THEN RAISE EXCEPTION 'A target user is required'; END IF;
  IF p_usage_type <> 'User Recovery' AND p_target_user_id IS NOT NULL THEN RAISE EXCEPTION 'Target user is only valid for User Recovery'; END IF;
  IF p_reason IS NULL OR length(trim(p_reason)) = 0 THEN RAISE EXCEPTION 'Reason is required'; END IF;
  IF p_target_user_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_target_user_id) THEN RAISE EXCEPTION 'Target user not found'; END IF;
  SELECT COALESCE(SUM(recovery_fund_amount), 0) INTO v_collected FROM public.admin_accounting_allocations;
  SELECT COALESCE(SUM(amount), 0) INTO v_used FROM public.recovery_fund_transactions WHERE direction = 'DEBIT';
  v_remaining := v_collected - v_used;
  IF p_amount > v_remaining THEN RAISE EXCEPTION 'Amount exceeds available Recovery Fund'; END IF;
  v_remaining := v_remaining - p_amount;
  INSERT INTO public.recovery_fund_transactions(direction, amount, usage_type, target_user_id, reason, reference, actor_id, balance_after)
  VALUES ('DEBIT', p_amount, p_usage_type, p_target_user_id, trim(p_reason), NULLIF(trim(p_reference), ''), v_admin, v_remaining) RETURNING id INTO v_id;
  IF p_usage_type = 'User Recovery' THEN
    INSERT INTO public.wallet_transactions
      (user_id, type, amount, status, reference_type, reference_id, description, admin_id, processed_at, metadata)
    VALUES (p_target_user_id, 'ADMIN_ADJUSTMENT', p_amount, 'completed', 'recovery_fund', v_id,
      'Recovery Fund: ' || trim(p_reason), v_admin, now(), jsonb_build_object('usage_type', p_usage_type, 'reference', p_reference));
  END IF;
  INSERT INTO public.audit_logs(admin_id, action, target_type, target_id, new_value, reason, metadata)
  VALUES (v_admin, 'recovery_fund.debit', 'recovery_fund_transaction', v_id::text,
    jsonb_build_object('amount', p_amount, 'usage_type', p_usage_type, 'target_user_id', p_target_user_id, 'balance_after', v_remaining), trim(p_reason), jsonb_build_object('reference', p_reference));
  RETURN jsonb_build_object('id', v_id, 'balance_after', v_remaining);
END; $$;
REVOKE ALL ON FUNCTION public.admin_use_recovery_fund(numeric, text, uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_use_recovery_fund(numeric, text, uuid, text, text) TO authenticated;
COMMIT;

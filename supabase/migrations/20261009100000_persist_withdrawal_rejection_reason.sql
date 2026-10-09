ALTER TABLE public.withdrawals
  ADD COLUMN IF NOT EXISTS rejection_reason text;

CREATE OR REPLACE FUNCTION public.review_withdrawal(
  p_id uuid,
  p_status text,
  p_note text DEFAULT NULL
)
RETURNS public.withdrawals
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_actor uuid := auth.uid();
  v_row public.withdrawals;
  v_next text := lower(trim(p_status));
  v_balance numeric;
  v_target_is_admin boolean;
  v_reason text := nullif(trim(p_note), '');
BEGIN
  IF v_actor IS NULL OR NOT public.is_admin() THEN
    RAISE EXCEPTION 'not authorized' USING errcode = '42501';
  END IF;
  IF v_next NOT IN ('approved', 'processing', 'paid', 'rejected') THEN
    RAISE EXCEPTION 'Invalid withdrawal status';
  END IF;

  SELECT * INTO v_row FROM public.withdrawals WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Withdrawal not found'; END IF;

  -- Permit admins to add/correct a reason for an already-rejected request without
  -- issuing a second refund or changing its final status.
  IF v_row.status IN ('rejected', 'paid') THEN
    IF v_row.status = v_next THEN
      IF v_next = 'rejected' AND v_reason IS NOT NULL THEN
        UPDATE public.withdrawals
        SET rejection_reason = v_reason, reviewed_by = v_actor, reviewed_at = now()
        WHERE id = v_row.id RETURNING * INTO v_row;
        UPDATE public.ledger_entries
        SET note = v_reason
        WHERE entry_type = 'withdrawal_refund'
          AND reference_id = v_row.id AND user_id = v_row.user_id;
      END IF;
      RETURN v_row;
    END IF;
    RAISE EXCEPTION 'Withdrawal cannot transition from current status';
  END IF;

  IF v_next = 'approved' AND v_row.status NOT IN ('pending', 'under_review', 'approved') THEN
    RAISE EXCEPTION 'Invalid approval transition';
  END IF;
  IF v_next = 'processing' AND v_row.status NOT IN ('approved', 'processing') THEN
    RAISE EXCEPTION 'Withdrawal must be approved before processing';
  END IF;
  IF v_next = 'paid' AND v_row.status NOT IN ('pending', 'approved', 'processing') THEN
    RAISE EXCEPTION 'Withdrawal cannot be marked paid from current status';
  END IF;

  IF v_next IN ('approved', 'processing', 'paid') THEN
    SELECT role = 'admin' INTO v_target_is_admin
    FROM public.profiles WHERE id = v_row.user_id;
    IF coalesce(v_target_is_admin, false) THEN
      SELECT coalesce(sum(amount), 0) INTO v_balance FROM public.ledger_entries
      WHERE user_id = v_row.user_id
        AND entry_type IN ('platform_admin_profit', 'unassigned_referral', 'admin_adjustment', 'withdrawal', 'withdrawal_refund');
    ELSE
      SELECT coalesce(sum(amount), 0) INTO v_balance FROM public.ledger_entries
      WHERE user_id = v_row.user_id
        AND entry_type IN ('ad_reward', 'referral_commission', 'admin_adjustment', 'withdrawal', 'withdrawal_refund');
    END IF;
    IF coalesce(v_balance, 0) + coalesce(v_row.hold_amount, 0) < coalesce(v_row.amount, 0) THEN
      RAISE EXCEPTION 'Insufficient withdrawable balance. Unallocated Recovery is not withdrawable. Available before this hold: Rs %, Requested: Rs %',
        coalesce(v_balance, 0) + coalesce(v_row.hold_amount, 0), v_row.amount;
    END IF;
  END IF;

  IF v_next = 'rejected' THEN
    IF v_reason IS NULL THEN RAISE EXCEPTION 'A rejection reason is required'; END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.ledger_entries
      WHERE entry_type = 'withdrawal_refund' AND reference_id = v_row.id
    ) THEN
      INSERT INTO public.ledger_entries(user_id, entry_type, amount, reference_id, note)
      VALUES (v_row.user_id, 'withdrawal_refund', coalesce(v_row.hold_amount, v_row.amount), v_row.id, v_reason);
      INSERT INTO public.wallet_transactions(user_id, type, amount, status, reference_id, reference_type, metadata)
      VALUES (v_row.user_id, 'REFUND', coalesce(v_row.hold_amount, v_row.amount),
        'completed', v_row.id, 'withdrawal', jsonb_build_object('original_amount', coalesce(v_row.hold_amount, v_row.amount)));
    ELSE
      UPDATE public.ledger_entries SET note = v_reason
      WHERE entry_type = 'withdrawal_refund' AND reference_id = v_row.id AND user_id = v_row.user_id;
    END IF;
    UPDATE public.withdrawals
    SET status = 'rejected', rejection_reason = v_reason,
        refunded_at = coalesce(refunded_at, now()), reviewed_by = v_actor, reviewed_at = now()
    WHERE id = v_row.id RETURNING * INTO v_row;
  ELSE
    UPDATE public.withdrawals
    SET status = v_next, reviewed_by = v_actor, reviewed_at = now()
    WHERE id = v_row.id RETURNING * INTO v_row;
  END IF;
  RETURN v_row;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.review_withdrawal(uuid, text, text) TO authenticated;

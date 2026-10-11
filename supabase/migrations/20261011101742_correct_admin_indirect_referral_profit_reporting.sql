-- Keep admin profit/referral reports aligned with reversal-aware withdrawal logic.
-- Legacy Starter indirect-pool commission rows were reversed in referral_commissions,
-- but their original ledger rows are intentionally preserved for audit history.
DO $migration$
DECLARE
  v_definition text;
  v_updated text;
  v_old text;
  v_new text;
  v_old_today text;
  v_new_today text;
BEGIN
  SELECT pg_get_functiondef('public.admin_profit_summary()'::regprocedure)
    INTO v_definition;

  v_old := 'AND NOT (entry_type=''unassigned_referral'' AND COALESCE(note,'''') ILIKE ''%Ahmad31 purchase%'')';
  v_new := v_old || E'\n' ||
    'AND NOT (entry_type=''referral_commission'' AND COALESCE(note,'''') ILIKE ''Indirect referral pool%'' AND NOT EXISTS (SELECT 1 FROM public.referral_commissions rc WHERE rc.user_id=v_admin AND rc.purchase_id=public.ledger_entries.reference_id AND rc.level > 1 AND rc.status=''completed'' AND rc.reversal_of IS NULL AND NOT EXISTS (SELECT 1 FROM public.referral_commissions rv WHERE rv.reversal_of=rc.id)))';

  v_old_today := 'AND COALESCE(note,'''') NOT ILIKE ''%Ahmad31 purchase%''';
  v_new_today := v_old_today || E'\n' ||
    'AND NOT (entry_type=''referral_commission'' AND COALESCE(note,'''') ILIKE ''Indirect referral pool%'' AND NOT EXISTS (SELECT 1 FROM public.referral_commissions rc WHERE rc.user_id=v_admin AND rc.purchase_id=public.ledger_entries.reference_id AND rc.level > 1 AND rc.status=''completed'' AND rc.reversal_of IS NULL AND NOT EXISTS (SELECT 1 FROM public.referral_commissions rv WHERE rv.reversal_of=rc.id)))';

  v_updated := replace(v_definition, v_old, v_new);
  v_updated := replace(v_updated, v_old_today, v_new_today);

  IF v_updated = v_definition
     OR position('Indirect referral pool%' in v_updated) = 0 THEN
    RAISE EXCEPTION 'Correction-aware referral reporting patch failed verification';
  END IF;

  EXECUTE v_updated;
END
$migration$;

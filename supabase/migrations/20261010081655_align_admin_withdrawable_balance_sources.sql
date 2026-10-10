-- Align admin withdrawal validation with the same eligible ledger sources shown by admin_profit_summary.
-- Recovery-fund tracking entries remain excluded; only admin_recovery allocations explicitly credited to admin are withdrawable.
DO $fix$
DECLARE
  r record;
  v_def text;
  v_old text;
  v_new text;
  v_count integer;
BEGIN
  FOR r IN
    SELECT p.oid, p.proname
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public'
      AND p.proname IN ('request_withdrawal','review_withdrawal','admin_transition_withdrawal','admin_profit_summary')
  LOOP
    v_def := pg_get_functiondef(r.oid);

    IF r.proname IN ('request_withdrawal','review_withdrawal','admin_transition_withdrawal') THEN
      v_count := 0;
      v_old := 'entry_type in (''platform_admin_profit'',''unassigned_referral'',''admin_adjustment'',''withdrawal'',''withdrawal_refund'')';
      v_new := 'entry_type IN (''platform_admin_profit'',''unassigned_referral'',''referral_commission'',''referral_commission_adjustment'',''admin_recovery'',''platform_profit'',''admin_adjustment'',''withdrawal'',''withdrawal_refund'')';
      IF position(v_old in lower(v_def)) > 0 THEN
        v_def := regexp_replace(v_def, 'entry_type[[:space:]]+in[[:space:]]*\([[:space:]]*''platform_admin_profit''[[:space:]]*,[[:space:]]*''unassigned_referral''[[:space:]]*,[[:space:]]*''admin_adjustment''[[:space:]]*,[[:space:]]*''withdrawal''[[:space:]]*,[[:space:]]*''withdrawal_refund''[[:space:]]*\)', v_new, 'gi');
        v_count := 1;
      ELSE
        v_old := 'entry_type IN (''platform_admin_profit'', ''unassigned_referral'', ''admin_adjustment'', ''withdrawal'', ''withdrawal_refund'')';
        IF position(v_old in v_def) > 0 THEN
          v_def := replace(v_def, v_old, v_new);
          v_count := 1;
        END IF;
      END IF;
      IF v_count = 0 THEN RAISE EXCEPTION 'Expected admin balance clause not found in %', r.proname; END IF;

    ELSIF r.proname = 'admin_profit_summary' THEN
      v_old := '''platform_admin_profit'',
      ''unassigned_referral'',';
      v_new := '''platform_admin_profit'',
      ''platform_profit'',
      ''unassigned_referral'',';
      IF position(v_old in v_def) = 0 THEN RAISE EXCEPTION 'Expected summary balance clause not found'; END IF;
      v_def := replace(v_def, v_old, v_new);
      v_old := 'entry_type in (''platform_admin_profit'',''unassigned_referral'',''admin_recovery'')';
      v_new := 'entry_type in (''platform_admin_profit'',''platform_profit'',''unassigned_referral'',''admin_recovery'')';
      IF position(v_old in lower(v_def)) > 0 THEN
        v_def := regexp_replace(v_def, 'entry_type[[:space:]]+in[[:space:]]*\([[:space:]]*''platform_admin_profit''[[:space:]]*,[[:space:]]*''unassigned_referral''[[:space:]]*,[[:space:]]*''admin_recovery''[[:space:]]*\)', v_new, 'gi');
      END IF;
    END IF;

    EXECUTE v_def;
  END LOOP;
END
$fix$;

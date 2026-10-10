-- Add separate referral and lifetime earnings metrics for the Revenue dashboard.
DO $fix$
DECLARE
  v_def text;
  v_old text;
  v_new text;
BEGIN
  SELECT pg_get_functiondef(p.oid) INTO v_def
  FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='public' AND p.proname='admin_profit_summary';

  IF v_def IS NULL THEN RAISE EXCEPTION 'admin_profit_summary not found'; END IF;

  v_old := '''platform_profit'', coalesce((select sum(case when transaction_type=''platform_profit'' then profit_amount else -profit_amount end) from public.admin_profit_ledger),0),';
  v_new := '''platform_profit'', coalesce((select sum(case when transaction_type=''platform_profit'' then profit_amount else -profit_amount end) from public.admin_profit_ledger),0),
    ''referral_profit'', coalesce((select sum(amount) from public.ledger_entries where user_id=v_admin and entry_type in (''referral_commission'',''referral_commission_adjustment'',''unassigned_referral'')),0),
    ''all_time_profit'', coalesce((select sum(amount) from public.ledger_entries where user_id=v_admin and entry_type in (''platform_admin_profit'',''platform_profit'',''referral_commission'',''referral_commission_adjustment'',''unassigned_referral'',''admin_recovery'')),0),';

  IF position(v_old in v_def) = 0 THEN
    IF position('referral_profit' in v_def) = 0 THEN
      RAISE EXCEPTION 'Expected platform_profit summary key not found';
    ELSE
      RETURN;
    END IF;
  END IF;

  v_def := replace(v_def, v_old, v_new);
  EXECUTE v_def;
END
$fix$;

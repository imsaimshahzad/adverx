-- Expose audited category totals for the Revenue dashboard.
-- Keep historical recovery migration rows and the unsupported Ahmad31 referral excluded.
DO $fix$
DECLARE
  v_def text;
  v_old text := $old$'referral_profit',coalesce((select sum(amount) from public.ledger_entries where user_id=v_admin and entry_type in ('referral_commission','referral_commission_adjustment','unassigned_referral') and not (entry_type='unassigned_referral' and coalesce(note,'') ilike '%Ahmad31 purchase%')),0),$old$;
  v_new text := $new$'referral_profit',coalesce((select sum(amount) from public.ledger_entries where user_id=v_admin and entry_type in ('referral_commission','referral_commission_adjustment','unassigned_referral') and not (entry_type='unassigned_referral' and coalesce(note,'') ilike '%Ahmad31 purchase%')),0),
    'undistributed_indirect_referral_pool',coalesce((select sum(amount) from public.ledger_entries where user_id=v_admin and entry_type='platform_profit' and coalesce(note,'') ilike 'Undistributed indirect referral pool settled to admin%'),0),
    'admin_recovery_total',coalesce((select sum(amount) from public.ledger_entries where user_id=v_admin and entry_type='admin_recovery' and coalesce(note,'') not ilike 'Historical recovery allocation migrated from Admin Recovery Reserve%'),0),$new$;
BEGIN
  SELECT pg_get_functiondef(p.oid) INTO v_def
  FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='public' AND p.proname='admin_profit_summary' AND p.pronargs=0;
  IF v_def IS NULL THEN RAISE EXCEPTION 'admin_profit_summary() not found'; END IF;
  IF position(v_old in v_def)=0 THEN
    IF position('undistributed_indirect_referral_pool' in v_def)>0 AND position('admin_recovery_total' in v_def)>0 THEN RETURN; END IF;
    RAISE EXCEPTION 'Expected referral_profit expression not found; no function changes made';
  END IF;
  v_def := replace(v_def,v_old,v_new);
  EXECUTE v_def;
END
$fix$;

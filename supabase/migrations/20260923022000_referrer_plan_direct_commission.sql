-- Direct referral commission is determined by the referrer's active plan.
-- Example: Pro referrer -> Starter purchase = 18% of the Starter purchase.
-- Existing purchases are untouched; this changes only future approvals.

DO $migration$
DECLARE
  src text;
  old_block text := $old$
  v_admin_amount := round(d.amount * v_admin_pct / 100, 2);
  v_direct_amount := round(d.amount * v_direct_pct / 100, 2);
  v_recovery_amount := round(d.amount * v_recovery_pct / 100, 2);
  v_ad_amount := round(
    d.amount - v_admin_amount - v_direct_amount
    - v_indirect_pool - v_recovery_amount, 2
  );
$old$;
  new_block text := $new$
  -- The purchaser's plan still controls the purchase pool/recovery rules.
  -- The referrer's ACTIVE plan controls the direct referral percentage.
  if v_direct_id is not null then
    select lower(pl.name)
      into v_referrer_plan_name
      from public.user_plans up
      join public.plans pl on pl.id=up.plan_id
     where up.user_id=v_direct_id
       and up.status='active'
       and pl.active=true
       and pl.status='active'
     order by up.created_at desc
     limit 1;

    if v_referrer_plan_name='starter' then
      v_direct_pct := 12;
    elsif v_referrer_plan_name='growth' then
      v_direct_pct := 15;
    elsif v_referrer_plan_name='pro' then
      v_direct_pct := 18;
    end if;
  end if;

  v_admin_amount := round(d.amount * v_admin_pct / 100, 2);
  v_direct_amount := round(d.amount * v_direct_pct / 100, 2);
  v_recovery_amount := round(d.amount * v_recovery_pct / 100, 2);
  v_ad_amount := round(
    d.amount - v_admin_amount - v_direct_amount
    - v_indirect_pool - v_recovery_amount, 2
  );
$new$;
BEGIN
  SELECT pg_get_functiondef(p.oid)
    INTO src
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid=p.pronamespace
   WHERE n.nspname='public'
     AND p.proname='admin_approve_deposit'
     AND pg_get_function_identity_arguments(p.oid)='p_deposit_id uuid, p_next_status text, p_rejection_reason text DEFAULT NULL::text'
   LIMIT 1;

  IF src IS NULL THEN
    RAISE EXCEPTION 'admin_approve_deposit function not found';
  END IF;

  IF position(old_block in src)=0 THEN
    RAISE EXCEPTION 'Expected direct commission allocation block was not found; migration aborted safely';
  END IF;

  src := replace(src, old_block, new_block);
  EXECUTE src;
END
$migration$;

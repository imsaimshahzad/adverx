-- Align approved plan snapshots with the locked indirect pool economics.
-- Starter: 8, Growth: 16, Pro: 24 PKR.
-- Reward budget is the residual after admin profit, direct referral,
-- indirect pool and recovery fund.

CREATE OR REPLACE FUNCTION public.sync_approved_plan_snapshot()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $function$
DECLARE
  p public.plans;
  v_admin_pct numeric;
  v_direct_pct numeric;
  v_indirect_pool numeric(14,2);
  v_recovery_pct numeric;
  v_ad_pct numeric;
  v_reward_reserve numeric(14,2);
BEGIN
  IF new.status='approved' AND (old.status IS DISTINCT FROM 'approved') AND new.plan_id IS NOT NULL THEN
    SELECT * INTO p
    FROM public.plans
    WHERE id=new.plan_id AND active=true
    FOR SHARE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Plan is inactive or missing';
    END IF;

    v_admin_pct := coalesce(p.admin_profit_pct,12);

    IF lower(p.name)='starter' THEN
      v_direct_pct := 12;
      v_indirect_pool := 8;
      v_recovery_pct := 8;
    ELSIF lower(p.name)='growth' THEN
      v_direct_pct := 15;
      v_indirect_pool := 16;
      v_recovery_pct := 8;
    ELSIF lower(p.name)='pro' THEN
      v_direct_pct := 18;
      v_indirect_pool := 24;
      v_recovery_pct := 6;
    ELSE
      v_direct_pct := coalesce(p.direct_referral_pct,0);
      v_indirect_pool := 0;
      v_recovery_pct := coalesce(p.recovery_fund_pct,8);
    END IF;

    v_reward_reserve := round(
      new.amount
      - round(new.amount*v_admin_pct/100,2)
      - round(new.amount*v_direct_pct/100,2)
      - v_indirect_pool
      - round(new.amount*v_recovery_pct/100,2),
      2
    );

    IF v_reward_reserve < 0 THEN
      RAISE EXCEPTION 'Plan reward reserve is negative after locked indirect pool allocation';
    END IF;

    v_ad_pct := CASE
      WHEN new.amount > 0 THEN round(v_reward_reserve*100/new.amount,4)
      ELSE 0
    END;

    UPDATE public.user_plans
       SET status='archived', updated_at=now()
     WHERE user_id=new.user_id AND status='active';

    INSERT INTO public.user_plans(
      user_id,plan_id,plan_name_snapshot,purchase_price_pkr,
      platform_allocation_pkr,direct_referral_allocation_pkr,
      indirect_referral_allocation_pkr,reward_budget_pkr,
      remaining_reward_budget_pkr,original_reward_reserve_pkr,
      base_ad_reward_pkr,max_ad_reward_pkr,daily_reward_limit_pkr,
      max_lifetime_reward_pkr,ads_per_day,referral_enabled,
      lifetime_access,purchased_at,status,daily_reward_date
    )
    VALUES(
      new.user_id,p.id,p.name,new.amount,
      round(new.amount*v_admin_pct/100,2),
      round(new.amount*v_direct_pct/100,2),
      v_indirect_pool,
      v_reward_reserve,v_reward_reserve,v_reward_reserve,
      p.base_ad_reward_pkr,p.max_ad_reward_pkr,p.daily_reward_limit_pkr,
      v_reward_reserve,p.ads_per_day,p.referral_enabled,true,
      coalesce(new.approved_at,now()),'active',current_date
    );

    UPDATE public.profiles
       SET plan_id=p.id,plan_activated_at=now(),status='active'
     WHERE id=new.user_id;

    INSERT INTO public.audit_logs(actor_id,action,entity_type,entity_id,metadata)
    VALUES(
      auth.uid(),'plan_purchase_snapshot_synced','deposits',new.id,
      jsonb_build_object(
        'purchase_price',new.amount,
        'admin_profit',round(new.amount*v_admin_pct/100,2),
        'direct_referral',round(new.amount*v_direct_pct/100,2),
        'indirect_pool',v_indirect_pool,
        'recovery_fund',round(new.amount*v_recovery_pct/100,2),
        'ad_budget',v_reward_reserve,
        'ad_budget_percentage',v_ad_pct,
        'legacy_referral_reward_disabled',true
      )
    );
  END IF;

  RETURN new;
END;
$function$;

-- Distribution is now invoked internally by admin_approve_deposit().
-- It must not be exposed as a public RPC endpoint.
REVOKE EXECUTE ON FUNCTION public.distribute_indirect_referral_pool(uuid) FROM PUBLIC, anon, authenticated;

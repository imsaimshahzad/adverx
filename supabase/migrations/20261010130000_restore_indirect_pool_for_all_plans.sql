begin;

-- All three plans contribute to the indirect referral pool:
-- Starter PKR 8 (2.6667%), Growth PKR 16 (2.6667%), Pro PKR 54 (6%).
-- ad_budget_pct is generated from the other allocation percentages.
update public.plans
set indirect_referral_pct = case lower(name)
      when 'starter' then 2.6667
      when 'growth' then 2.6667
      when 'pro' then 6
    end,
    updated_at = now()
where lower(name) in ('starter','growth','pro');

do $$
declare v_def text;
begin
  v_def := pg_get_functiondef('public.admin_approve_deposit(uuid,text,text)'::regprocedure);
  v_def := replace(v_def,
    'v_direct_pct:=12; v_indirect_pool:=0; v_recovery_pct:=8;',
    'v_direct_pct:=12; v_indirect_pool:=round(d.amount*coalesce(p.indirect_referral_pct,0)/100,2); v_recovery_pct:=8;');
  v_def := replace(v_def,
    'v_direct_pct:=15; v_indirect_pool:=0; v_recovery_pct:=8;',
    'v_direct_pct:=15; v_indirect_pool:=round(d.amount*coalesce(p.indirect_referral_pct,0)/100,2); v_recovery_pct:=8;');
  execute v_def;

  v_def := pg_get_functiondef('public.sync_approved_plan_snapshot()'::regprocedure);
  v_def := replace(v_def,
    'v_direct_pct := 12; v_indirect_pool := 0; v_recovery_pct := 8;',
    'v_direct_pct := 12; v_indirect_pool := round(new.amount*coalesce(p.indirect_referral_pct,0)/100,2); v_recovery_pct := 8;');
  v_def := replace(v_def,
    'v_direct_pct := 15; v_indirect_pool := 0; v_recovery_pct := 8;',
    'v_direct_pct := 15; v_indirect_pool := round(new.amount*coalesce(p.indirect_referral_pct,0)/100,2); v_recovery_pct := 8;');
  execute v_def;
end $$;

-- Reconcile existing purchases without erasing any already distributed pool amount.
update public.purchase_allocations pa
set indirect_pool_amount_pkr = case lower(p.name)
      when 'starter' then 8
      when 'growth' then 16
      when 'pro' then 54
    end,
    ad_budget_amount = round(
      pa.gross_amount
      - coalesce(pa.admin_profit_amount,0)
      - coalesce(pa.referral_commission_amount,0)
      - coalesce(pa.recovery_fund_amount,0)
      - case lower(p.name) when 'starter' then 8 when 'growth' then 16 when 'pro' then 54 end,
      2
    )
from public.plans p
where pa.plan_id=p.id and lower(p.name) in ('starter','growth','pro');

-- Preserve historical reward consumption while adjusting snapshots.
with revised as (
  select up.id, up.reward_budget_pkr as old_budget,
         up.remaining_reward_budget_pkr as old_remaining,
         round(up.purchase_price_pkr
           - coalesce(up.platform_allocation_pkr,0)
           - coalesce(up.direct_referral_allocation_pkr,0)
           - coalesce(up.recovery_fund_allocation_pkr,0)
           - case lower(up.plan_name_snapshot)
               when 'starter' then 8 when 'growth' then 16 when 'pro' then 54 end, 2) as new_budget,
         case lower(up.plan_name_snapshot)
           when 'starter' then 8 when 'growth' then 16 when 'pro' then 54 end as new_indirect
  from public.user_plans up
  where lower(up.plan_name_snapshot) in ('starter','growth','pro')
)
update public.user_plans up
set reward_budget_pkr = revised.new_budget,
    original_reward_reserve_pkr = revised.new_budget,
    max_lifetime_reward_pkr = revised.new_budget,
    remaining_reward_budget_pkr = greatest(0, revised.new_budget
      - greatest(0, revised.old_budget - coalesce(revised.old_remaining,revised.old_budget))),
    indirect_referral_allocation_pkr = revised.new_indirect,
    updated_at = now()
from revised
where up.id = revised.id and revised.new_budget >= 0;

commit;

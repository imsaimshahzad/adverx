begin;

with revised as (
  select up.id,
         up.reward_budget_pkr as old_budget,
         up.remaining_reward_budget_pkr as old_remaining,
         round(up.purchase_price_pkr
           - round(up.purchase_price_pkr*coalesce(p.admin_profit_pct,12)/100,2)
           - round(up.purchase_price_pkr*coalesce(p.direct_referral_pct,0)/100,2)
           - round(up.purchase_price_pkr*coalesce(p.indirect_referral_pct,0)/100,2)
           - round(up.purchase_price_pkr*coalesce(p.recovery_fund_pct,8)/100,2),2) as new_budget,
         round(up.purchase_price_pkr*coalesce(p.admin_profit_pct,12)/100,2) as new_admin,
         round(up.purchase_price_pkr*coalesce(p.direct_referral_pct,0)/100,2) as new_direct,
         round(up.purchase_price_pkr*coalesce(p.indirect_referral_pct,0)/100,2) as new_indirect,
         round(up.purchase_price_pkr*coalesce(p.recovery_fund_pct,8)/100,2) as new_recovery
    from public.user_plans up
    join public.plans p on p.id=up.plan_id
   where lower(p.name) in ('starter','growth','pro')
)
update public.user_plans up
set platform_allocation_pkr = revised.new_admin,
    direct_referral_allocation_pkr = revised.new_direct,
    indirect_referral_allocation_pkr = revised.new_indirect,
    recovery_fund_allocation_pkr = revised.new_recovery,
    reward_budget_pkr = greatest(0,revised.new_budget),
    original_reward_reserve_pkr = greatest(0,revised.new_budget),
    max_lifetime_reward_pkr = greatest(0,revised.new_budget),
    remaining_reward_budget_pkr = greatest(0,revised.new_budget
      - greatest(0,revised.old_budget-coalesce(revised.old_remaining,revised.old_budget))),
    updated_at=now()
from revised
where up.id=revised.id and revised.new_budget>=0;

commit;
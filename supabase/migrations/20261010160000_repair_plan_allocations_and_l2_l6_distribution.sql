begin;

-- Correct the plan catalogue allocations for all future purchases.
update public.plans
set reward_budget_pkr = case lower(name) when 'starter' then 196 when 'growth' then 374 when 'pro' then 522 end,
    max_lifetime_reward_pkr = case lower(name) when 'starter' then 196 when 'growth' then 374 when 'pro' then 522 end,
    direct_referral_pct = case lower(name) when 'starter' then 12 when 'growth' then 15 when 'pro' then 18 end,
    referrer_commission_pct = case lower(name) when 'starter' then 12 when 'growth' then 15 when 'pro' then 18 end,
    indirect_referral_pct = case lower(name) when 'starter' then 2.6667 when 'growth' then 2.6667 when 'pro' then 6 end,
    updated_at = now()
where lower(name) in ('starter','growth','pro');

-- L1 remains the direct referral. The indirect pool is split only across L2-L6.
delete from public.indirect_referral_level_rates where level not between 2 and 6;
insert into public.indirect_referral_level_rates(level, percentage, updated_at)
values
  (2,33.3333,now()),
  (3,25.0000,now()),
  (4,16.6667,now()),
  (5,12.5000,now()),
  (6,12.5000,now())
on conflict (level) do update
set percentage=excluded.percentage, updated_at=now();

-- Internal idempotent distributor: all three purchase plans contribute a pool;
-- only active Pro upliners are eligible recipients at indirect levels L2-L6.
create or replace function public._distribute_indirect_referral_pool_internal(p_purchase_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  d public.deposits;
  a public.purchase_allocations;
  v_plan_name text;
  v_pool numeric(14,2);
  v_current_id uuid;
  v_parent_id uuid;
  v_source_referral_id uuid;
  v_level integer;
  v_weight numeric(7,4);
  v_target numeric(14,2);
  v_distributed numeric(14,2);
  v_remaining numeric(14,2);
  v_commission public.referral_commissions;
begin
  select * into d from public.deposits where id=p_purchase_id for update;
  if not found or d.status <> 'approved' then
    raise exception 'approved purchase not found';
  end if;

  select * into a from public.purchase_allocations where purchase_id=p_purchase_id for update;
  if not found then raise exception 'purchase allocation not found'; end if;

  select lower(name) into v_plan_name from public.plans where id=d.plan_id;
  if v_plan_name not in ('starter','growth','pro') then
    return jsonb_build_object('status','unsupported_plan','purchase_id',p_purchase_id);
  end if;

  v_pool := coalesce(a.indirect_pool_amount_pkr,0);
  if v_pool <= 0 then
    update public.purchase_allocations set indirect_pool_distributed_pkr=0 where purchase_id=p_purchase_id;
    return jsonb_build_object('status','no_indirect_pool','purchase_id',p_purchase_id,'pool',0,'distributed',0);
  end if;

  if (select count(*) from public.indirect_referral_level_rates where level between 2 and 6) <> 5
     or (select round(sum(percentage),4) from public.indirect_referral_level_rates where level between 2 and 6) <> 100.0000 then
    raise exception 'Indirect level rates L2-L6 must be configured and total 100';
  end if;

  select r.referrer_id, r.id
    into v_current_id, v_source_referral_id
    from public.referrals r
   where r.referred_id=d.user_id and r.level=1
   order by r.created_at asc limit 1;

  if v_current_id is null then
    select ref.id into v_current_id
      from public.profiles child
      join public.profiles ref on upper(trim(ref.referral_code))=upper(trim(child.referred_by))
     where child.id=d.user_id and ref.id<>d.user_id
     limit 1;
  end if;

  -- Move from L1 (direct referrer) to L2 (the direct referrer's parent).
  if v_current_id is not null then
    select parent.id into v_parent_id
      from public.profiles child
      join public.profiles parent on upper(trim(parent.referral_code))=upper(trim(child.referred_by))
     where child.id=v_current_id and parent.id<>d.user_id
     limit 1;
    v_current_id := v_parent_id;
  end if;

  select coalesce(sum(amount),0) into v_distributed
    from public.referral_commissions
   where purchase_id=p_purchase_id
     and source='approved_plan_purchase_indirect'
     and status='completed'
     and reversal_of is null;
  v_remaining := round(v_pool-v_distributed,2);

  for v_level in 2..6 loop
    exit when v_current_id is null or v_remaining <= 0;

    select percentage into v_weight
      from public.indirect_referral_level_rates where level=v_level;

    if exists (
      select 1
        from public.user_plans up
        join public.plans rp on rp.id=up.plan_id
       where up.user_id=v_current_id
         and up.status='active'
         and lower(rp.name)='pro'
         and round(rp.price_pkr,2)=900
    ) and not exists (
      select 1 from public.referral_commissions rc
       where rc.purchase_id=p_purchase_id
         and rc.user_id=v_current_id
         and rc.level=v_level
         and rc.source='approved_plan_purchase_indirect'
         and rc.reversal_of is null
    ) then
      v_target := round(v_pool*v_weight/100,2);

      -- Never exceed the reserved pool; don't reassign an absent/ineligible level's share.
      if v_target > 0 and v_target <= v_remaining then
        insert into public.referral_commissions(
          user_id,source_user_id,referral_id,purchase_id,plan_id,
          amount,percentage,level,source,status
        )
        values(
          v_current_id,d.user_id,v_source_referral_id,d.id,d.plan_id,
          v_target,v_weight,v_level,'approved_plan_purchase_indirect','completed'
        )
        on conflict (purchase_id,user_id,level) where reversal_of is null
        do nothing
        returning * into v_commission;

        if v_commission.id is not null then
          insert into public.ledger_entries(user_id,entry_type,amount,reference_id,note)
          values(v_current_id,'referral_commission',v_target,d.id,
                 format('Indirect referral pool commission - Level %s',v_level));

          insert into public.wallet_transactions(
            user_id,type,amount,currency,status,reference_id,reference_type,metadata
          )
          values(
            v_current_id,'REFERRAL_COMMISSION',v_target,'PKR','completed',
            v_commission.id,'referral_commission',
            jsonb_build_object('purchase_id',d.id,'referred_id',d.user_id,
              'level',v_level,'percentage',v_weight,'indirect_pool',v_pool,
              'plan_id',d.plan_id,'commission_source','indirect')
          );

          v_distributed := round(v_distributed+v_target,2);
          v_remaining := round(v_pool-v_distributed,2);
        end if;
      end if;
    end if;

    select parent.id into v_parent_id
      from public.profiles child
      join public.profiles parent on upper(trim(parent.referral_code))=upper(trim(child.referred_by))
     where child.id=v_current_id and parent.id<>d.user_id
     limit 1;
    v_current_id := v_parent_id;
  end loop;

  select coalesce(sum(amount),0) into v_distributed
    from public.referral_commissions
   where purchase_id=p_purchase_id
     and source='approved_plan_purchase_indirect'
     and status='completed'
     and reversal_of is null;

  update public.purchase_allocations
     set indirect_pool_distributed_pkr=round(v_distributed,2)
   where purchase_id=p_purchase_id;

  return jsonb_build_object('status','completed','purchase_id',p_purchase_id,
    'pool',v_pool,'distributed',round(v_distributed,2),
    'unallocated',round(v_pool-v_distributed,2));
end;
$function$;

revoke all on function public._distribute_indirect_referral_pool_internal(uuid) from public, anon, authenticated;

create or replace function public.distribute_indirect_referral_pool(p_purchase_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if not public.is_admin() then
    raise exception 'not authorized' using errcode='42501';
  end if;
  return public._distribute_indirect_referral_pool_internal(p_purchase_id);
end;
$function$;

-- Repair the plan snapshots while preserving rewards already consumed.
with revised as (
  select up.id,
         up.purchase_price_pkr,
         up.reward_budget_pkr as old_budget,
         up.remaining_reward_budget_pkr as old_remaining,
         round(up.purchase_price_pkr
           - round(up.purchase_price_pkr*coalesce(p.admin_profit_pct,12)/100,2)
           - round(up.purchase_price_pkr*coalesce(p.direct_referral_pct,0)/100,2)
           - coalesce(up.indirect_referral_allocation_pkr,0)
           - coalesce(up.recovery_fund_allocation_pkr,0),2) as new_budget,
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

-- Backfill approved purchases with undistributed pool. Existing commission rows are
-- preserved; missing eligible L2-L6 rows are inserted idempotently without exceeding pool.
do $$
declare r record;
begin
  for r in
    select d.id
      from public.deposits d
      join public.purchase_allocations pa on pa.purchase_id=d.id
     where d.status='approved'
       and coalesce(pa.indirect_pool_amount_pkr,0)>0
       and coalesce(pa.indirect_pool_distributed_pkr,0)<coalesce(pa.indirect_pool_amount_pkr,0)
     order by d.created_at
  loop
    perform public._distribute_indirect_referral_pool_internal(r.id);
  end loop;
end $$;

commit;
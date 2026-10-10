-- Keep plan purchase allocation and user-plan reserve snapshots consistent with plan economics.
-- Starter: 68% ad budget, 12% admin, 12% direct referral, 8% recovery, no indirect pool.
-- Growth: 65% ad budget, 12% admin, 15% direct referral, 8% recovery, no indirect pool.
-- Pro indirect pool is driven by plans.indirect_referral_pct (currently 6%).

do $fix_functions$
declare
  v_def text;
  v_old text;
begin
  v_def := pg_get_functiondef('public.admin_approve_deposit(uuid,text,text)'::regprocedure);
  v_old := v_def;
  v_def := regexp_replace(v_def, 'v_direct_pct:=12;[[:space:]]*v_indirect_pool:=8;[[:space:]]*v_recovery_pct:=8;', 'v_direct_pct:=12; v_indirect_pool:=0; v_recovery_pct:=8;');
  v_def := regexp_replace(v_def, 'v_direct_pct:=15;[[:space:]]*v_indirect_pool:=16;[[:space:]]*v_recovery_pct:=8;', 'v_direct_pct:=15; v_indirect_pool:=0; v_recovery_pct:=8;');
  v_def := regexp_replace(v_def, 'v_direct_pct:=18;[[:space:]]*v_indirect_pool:=24;[[:space:]]*v_recovery_pct:=6;', 'v_direct_pct:=18; v_indirect_pool:=round(d.amount*coalesce(p.indirect_referral_pct,0)/100,2); v_recovery_pct:=6;');
  if v_def <> v_old then
    execute v_def;
  elsif position('v_direct_pct:=12; v_indirect_pool:=0; v_recovery_pct:=8;' in v_def)=0
     or position('v_direct_pct:=15; v_indirect_pool:=0; v_recovery_pct:=8;' in v_def)=0
     or position('v_direct_pct:=18; v_indirect_pool:=round(d.amount*coalesce(p.indirect_referral_pct,0)/100,2); v_recovery_pct:=6;' in v_def)=0 then
    raise exception 'Could not safely reconcile admin_approve_deposit allocation rules';
  end if;

  v_def := pg_get_functiondef('public.sync_approved_plan_snapshot()'::regprocedure);
  v_old := v_def;
  v_def := regexp_replace(v_def, 'v_direct_pct := 12;[[:space:]]+v_indirect_pool := 8;[[:space:]]+v_recovery_pct := 8;', 'v_direct_pct := 12; v_indirect_pool := 0; v_recovery_pct := 8;');
  v_def := regexp_replace(v_def, 'v_direct_pct := 15;[[:space:]]+v_indirect_pool := 16;[[:space:]]+v_recovery_pct := 8;', 'v_direct_pct := 15; v_indirect_pool := 0; v_recovery_pct := 8;');
  v_def := regexp_replace(v_def, 'v_direct_pct := 18;[[:space:]]+v_indirect_pool := 24;[[:space:]]+v_recovery_pct := 6;', 'v_direct_pct := 18; v_indirect_pool := round(new.amount*coalesce(p.indirect_referral_pct,0)/100,2); v_recovery_pct := 6;');
  if v_def <> v_old then
    execute v_def;
  elsif position('v_direct_pct := 12; v_indirect_pool := 0; v_recovery_pct := 8;' in v_def)=0
     or position('v_direct_pct := 15; v_indirect_pool := 0; v_recovery_pct := 8;' in v_def)=0
     or position('v_direct_pct := 18; v_indirect_pool := round(new.amount*coalesce(p.indirect_referral_pct,0)/100,2); v_recovery_pct := 6;' in v_def)=0 then
    raise exception 'Could not safely reconcile sync_approved_plan_snapshot allocation rules';
  end if;
end;
$fix_functions$;

-- Repair the affected Starter purchase by public UID, preserving the original ledger history.
do $fix_existing_purchase$
declare
  v_user_id uuid;
  v_purchase_id uuid;
  v_plan_id uuid;
  v_user_plan_id uuid;
  v_used numeric(14,2);
begin
  select id into v_user_id from public.profiles where public_uid='146606';
  if v_user_id is null then
    -- A clean environment may not contain the specific historical user; function fixes still apply.
    return;
  end if;

  select d.id, d.plan_id into v_purchase_id, v_plan_id
  from public.deposits d
  join public.plans p on p.id=d.plan_id
  where d.user_id=v_user_id and d.status='approved' and lower(p.name)='starter'
  order by d.approved_at desc nulls last
  limit 1;

  if v_purchase_id is null then return; end if;

  update public.purchase_allocations
     set ad_budget_amount=204,
         indirect_pool_amount_pkr=0,
         indirect_pool_distributed_pkr=0
   where purchase_id=v_purchase_id
     and round(gross_amount,2)=300
     and round(ad_budget_amount,2)=196
     and round(indirect_pool_amount_pkr,2)=8;

  if not exists (
    select 1 from public.purchase_allocations
    where purchase_id=v_purchase_id
      and round(gross_amount,2)=300
      and round(ad_budget_amount,2)=204
      and round(indirect_pool_amount_pkr,2)=0
  ) then
    raise exception 'Starter allocation for UID 146606 did not reconcile after correction';
  end if;

  select id into v_user_plan_id
  from public.user_plans
  where user_id=v_user_id and plan_id=v_plan_id
  order by purchased_at desc nulls last, created_at desc
  limit 1;

  if v_user_plan_id is null then raise exception 'Starter user plan snapshot not found'; end if;

  select coalesce(sum(amount_pkr),0) into v_used
  from public.reward_transactions
  where user_plan_id=v_user_plan_id
    and reward_type='ad_reward'
    and status='completed';

  update public.user_plans
     set reward_budget_pkr=204,
         original_reward_reserve_pkr=204,
         max_lifetime_reward_pkr=204,
         remaining_reward_budget_pkr=greatest(round(204-v_used,2),0),
         indirect_referral_allocation_pkr=0,
         updated_at=now()
   where id=v_user_plan_id;

  if not exists (
    select 1 from public.ledger_entries
    where user_id=v_user_id and entry_type='plan_ad_budget_correction' and reference_id=v_purchase_id
  ) then
    insert into public.ledger_entries(user_id,entry_type,amount,reference_id,note)
    values(v_user_id,'plan_ad_budget_correction',8,v_purchase_id,
      'Correct Starter plan allocation: indirect pool removed; ad budget aligned to 68%');
  end if;

  if not exists (
    select 1 from public.audit_logs
    where action='STARTER_ALLOCATION_CORRECTED'
      and entity_type='deposits'
      and entity_id=v_purchase_id
  ) then
    insert into public.audit_logs(actor_id,action,entity_type,entity_id,metadata)
    values(auth.uid(),'STARTER_ALLOCATION_CORRECTED','deposits',v_purchase_id,
      jsonb_build_object('user_plan_id',v_user_plan_id,'old_ad_budget',196,'new_ad_budget',204,
        'old_indirect_pool',8,'new_indirect_pool',0,'ad_rewards_used',v_used));
  end if;
end;
$fix_existing_purchase$;

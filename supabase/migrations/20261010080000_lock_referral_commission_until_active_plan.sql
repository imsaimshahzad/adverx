CREATE OR REPLACE FUNCTION public.admin_approve_deposit(p_deposit_id uuid, p_next_status text, p_rejection_reason text DEFAULT NULL::text)
 RETURNS deposits
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare
 d public.deposits; p public.plans; a public.purchase_allocations; v_admin uuid;
 v_admin_pct numeric(7,4); v_direct_pct numeric(7,4); v_recovery_pct numeric(7,4);
 v_admin_amount numeric(14,2); v_direct_amount numeric(14,2); v_indirect_pool numeric(14,2);
 v_recovery_amount numeric(14,2); v_ad_amount numeric(14,2);
 v_direct_id uuid; v_referral_id uuid; v_commission public.referral_commissions;
 v_indirect_result jsonb; v_referrer_plan_name text;
begin
 if not public.is_admin() then raise exception 'not authorized' using errcode='42501'; end if;
 select auth.uid() into v_admin;
 select * into d from public.deposits where id=p_deposit_id for update;
 if not found then raise exception 'deposit not found'; end if;
 if d.status <> 'pending' then raise exception 'deposit already reviewed'; end if;
 if p_next_status not in ('approved','rejected') then raise exception 'invalid deposit status'; end if;

 if p_next_status='rejected' then
   update public.deposits set status='rejected',approved_at=null where id=d.id returning * into d;
   insert into public.notifications(user_id,title,body) values(d.user_id,'Deposit rejected',
     format('Your PKR %s deposit request was rejected.%s',to_char(d.amount,'FM999999999990.00'),
     case when nullif(trim(p_rejection_reason),'') is not null then ' Reason: '||trim(p_rejection_reason) else '' end));
   insert into public.audit_logs(actor_id,action,entity_type,entity_id,metadata)
   values(v_admin,'PLAN_PURCHASE_REJECTED','deposit',d.id,jsonb_build_object('reason',p_rejection_reason));
   return d;
 end if;

 select * into p from public.plans where id=d.plan_id and active=true and status='active' for update;
 if not found then raise exception 'active plan not found'; end if;
 if d.amount <> p.price_pkr then raise exception 'Deposit amount does not match selected plan price'; end if;

 v_admin_pct:=coalesce(p.admin_profit_pct,12);

 if lower(p.name)='starter' then
   v_direct_pct:=12; v_indirect_pool:=8; v_recovery_pct:=8;
 elsif lower(p.name)='growth' then
   v_direct_pct:=15; v_indirect_pool:=16; v_recovery_pct:=8;
 elsif lower(p.name)='pro' then
   v_direct_pct:=18; v_indirect_pool:=24; v_recovery_pct:=6;
 else
   v_direct_pct:=coalesce(p.direct_referral_pct,0); v_indirect_pool:=0; v_recovery_pct:=coalesce(p.recovery_fund_pct,8);
 end if;

 select r.id,r.referrer_id into v_referral_id,v_direct_id
 from public.referrals r where r.referred_id=d.user_id and r.level=1 order by r.created_at asc limit 1;

 if v_direct_id is null then
   select ref.id into v_direct_id from public.profiles child
   join public.profiles ref on upper(trim(ref.referral_code))=upper(trim(child.referred_by))
   where child.id=d.user_id and ref.id<>d.user_id limit 1;
   if v_direct_id is not null then
     insert into public.referrals(referrer_id,referred_id,level) values(v_direct_id,d.user_id,1)
     on conflict (referred_id) do nothing;
     select id into v_referral_id from public.referrals
     where referrer_id=v_direct_id and referred_id=d.user_id and level=1
     order by created_at asc limit 1;
   end if;
 end if;

 select lower(pl.name) into v_referrer_plan_name
 from public.user_plans up join public.plans pl on pl.id=up.plan_id
 where up.user_id=v_direct_id and up.status='active' and pl.active=true and pl.status='active'
 order by up.created_at desc limit 1;

 v_admin_amount:=round(d.amount*v_admin_pct/100,2);
 v_direct_amount:=round(d.amount*v_direct_pct/100,2);
 v_recovery_amount:=round(d.amount*v_recovery_pct/100,2);
 v_ad_amount:=round(d.amount-v_admin_amount-v_direct_amount-v_indirect_pool-v_recovery_amount,2);

 if v_ad_amount<0 then raise exception 'Plan allocation exceeds purchase amount'; end if;
 if round(v_admin_amount+v_direct_amount+v_indirect_pool+v_recovery_amount+v_ad_amount,2)<>round(d.amount,2)
 then raise exception 'Plan allocation does not reconcile'; end if;

 update public.deposits set status='approved',approved_at=now() where id=d.id returning * into d;

 insert into public.purchase_allocations(
   purchase_id,user_id,plan_id,gross_amount,admin_profit_amount,referral_commission_amount,
   indirect_pool_amount_pkr,indirect_pool_distributed_pkr,recovery_fund_amount,ad_budget_amount)
 values(d.id,d.user_id,p.id,d.amount,v_admin_amount,v_direct_amount,v_indirect_pool,0,v_recovery_amount,v_ad_amount)
 on conflict (purchase_id) do nothing returning * into a;
 if a.id is null then select * into a from public.purchase_allocations where purchase_id=d.id; end if;

 insert into public.admin_profit_ledger(
   purchase_id,allocation_id,user_id,plan_id,gross_amount,profit_percentage,profit_amount,
   transaction_type,status,admin_user_id)
 values(d.id,a.id,d.user_id,p.id,d.amount,v_admin_pct,v_admin_amount,'platform_profit','completed',v_admin)
 on conflict (purchase_id) where reversal_of is null do nothing;

 insert into public.ledger_entries(user_id,entry_type,amount,reference_id,note)
 values(v_admin,'platform_admin_profit',v_admin_amount,d.id,'Platform profit from approved plan purchase');

 insert into public.wallet_transactions(user_id,type,amount,currency,status,reference_id,reference_type,metadata)
 values(v_admin,'PLATFORM_PROFIT',v_admin_amount,'PKR','completed',d.id,'admin_profit',
 jsonb_build_object('purchase_id',d.id,'allocation_id',a.id,'plan_id',p.id,'profit_percentage',v_admin_pct));

 if v_recovery_amount>0 and v_direct_id is not null then
   if exists(select 1 from public.profiles rp where rp.id=v_direct_id and rp.role in ('admin','super_admin','moderator')) then
     insert into public.ledger_entries(user_id,entry_type,amount,reference_id,note)
     values(v_direct_id,'admin_recovery',v_recovery_amount,d.id,'Recovery allocation from direct referral credited to admin balance');
     insert into public.wallet_transactions(user_id,type,amount,currency,status,reference_id,reference_type,metadata)
     values(v_direct_id,'ADMIN_RECOVERY',v_recovery_amount,'PKR','completed',d.id,'admin_recovery',
     jsonb_build_object('purchase_id',d.id,'plan_id',p.id,'amount',v_recovery_amount,'source','direct_referral_recovery'));
   else
     insert into public.recovery_fund_ledger(entry_type,amount_pkr,reference_id,user_id,plan_id,note)
     values('referrer_credit',v_recovery_amount,d.id,v_direct_id,p.id,'Recovery Reserve credited to qualified direct referrer from approved plan purchase');
     update public.profiles set recovery_reserve_pkr=coalesce(recovery_reserve_pkr,0)+v_recovery_amount where id=v_direct_id;
   end if;
 elsif v_recovery_amount>0 then
   insert into public.recovery_fund_ledger(entry_type,amount_pkr,reference_id,plan_id,note)
   values('credit',v_recovery_amount,d.id,p.id,'Unallocated Recovery credited to the non-withdrawable platform-use fund because purchaser has no eligible direct referrer');
 end if;

 insert into public.ledger_entries(user_id,entry_type,amount,reference_id,note)
 values(d.user_id,'plan_ad_budget',v_ad_amount,d.id,'Initial user reward reserve from approved plan purchase');
 insert into public.ledger_entries(user_id,entry_type,amount,reference_id,note)
 values(d.user_id,'plan_purchase',-d.amount,d.id,'Approved plan purchase');

 if v_direct_id is not null and v_direct_amount>0 then
   insert into public.referral_commissions(
     user_id,source_user_id,referral_id,purchase_id,plan_id,amount,percentage,level,source,status)
   values(v_direct_id,d.user_id,v_referral_id,d.id,p.id,v_direct_amount,v_direct_pct,1,'approved_plan_purchase',case when v_referrer_plan_name is not null then 'completed' else 'locked' end)
   on conflict (purchase_id,user_id,level) where reversal_of is null do nothing returning * into v_commission;
   if v_commission.id is not null and v_commission.status = 'completed' then
     insert into public.ledger_entries(user_id,entry_type,amount,reference_id,note)
     values(v_direct_id,'referral_commission',v_direct_amount,d.id,'Qualified direct referral commission - Level 1');
     insert into public.wallet_transactions(user_id,type,amount,currency,status,reference_id,reference_type,metadata)
     values(v_direct_id,'REFERRAL_COMMISSION',v_direct_amount,'PKR','completed',v_commission.id,'referral_commission',
     jsonb_build_object('purchase_id',d.id,'referred_id',d.user_id,'level',1,'percentage',v_direct_pct,'plan_id',p.id,'referrer_plan',v_referrer_plan_name));
   end if;
 elsif v_direct_amount>0 then
   insert into public.ledger_entries(user_id,entry_type,amount,reference_id,note)
   values(v_admin,'unassigned_referral',v_direct_amount,d.id,'Unassigned direct referral allocation automatically credited to admin');
   insert into public.wallet_transactions(user_id,type,amount,currency,status,reference_id,reference_type,metadata)
   values(v_admin,'UNASSIGNED_REFERRAL',v_direct_amount,'PKR','completed',d.id,'unassigned_referral',
   jsonb_build_object('purchase_id',d.id,'plan_id',p.id,'percentage',v_direct_pct,'level',1));
 end if;

 v_indirect_result:=public.distribute_indirect_referral_pool(d.id);

 insert into public.notifications(user_id,title,body)
 values(d.user_id,'Deposit approved',format('Your PKR %s deposit for the %s plan has been approved. Your plan is now active.',
 to_char(d.amount,'FM999999999990.00'),p.name));

 insert into public.audit_logs(actor_id,action,entity_type,entity_id,metadata)
 values(v_admin,'PLAN_PURCHASE_APPROVED','deposit',d.id,
 jsonb_build_object('allocation_id',a.id,'plan_name',p.name,'gross_amount',d.amount,
 'admin_profit',v_admin_amount,'direct_referral',v_direct_amount,'direct_referral_percentage',v_direct_pct,
 'indirect_pool',v_indirect_pool,'indirect_distribution',v_indirect_result,'recovery_fund',v_recovery_amount,
 'ad_budget',v_ad_amount,'direct_referrer_id',v_direct_id,
 'allocation_reconciles_to_purchase',
 round(v_admin_amount+v_direct_amount+v_indirect_pool+v_recovery_amount+v_ad_amount,2)=round(d.amount,2)));
 return d;
end;
$function$;

-- Release previously locked commissions exactly once when the referrer activates an eligible plan.
create or replace function public.release_locked_referral_commissions_on_plan_activation()
returns trigger
language plpgsql
security definer
set search_path to 'pg_catalog', 'public'
as $function$
declare
  c public.referral_commissions;
begin
  if new.status <> 'active'
     or not exists (
       select 1 from public.plans p
       where p.id = new.plan_id and p.active = true and p.status = 'active'
     ) then
    return new;
  end if;

  for c in
    update public.referral_commissions rc
       set status = 'completed'
     where rc.user_id = new.user_id
       and rc.status = 'locked'
     returning rc.*
  loop
    insert into public.ledger_entries(user_id, entry_type, amount, reference_id, note)
    values (
      c.user_id, 'referral_commission', c.amount, c.id,
      'Locked referral commission released after plan activation'
    );

    insert into public.wallet_transactions(
      user_id, type, amount, currency, status, reference_id, reference_type, metadata
    )
    values (
      c.user_id, 'REFERRAL_COMMISSION', c.amount, 'PKR', 'completed',
      c.id, 'referral_commission',
      jsonb_build_object(
        'commission_id', c.id,
        'purchase_id', c.purchase_id,
        'referred_id', c.source_user_id,
        'level', c.level,
        'percentage', c.percentage,
        'unlock_reason', 'active_plan_activated'
      )
    );
  end loop;

  return new;
end;
$function$;

revoke all on function public.release_locked_referral_commissions_on_plan_activation() from public, anon, authenticated;

drop trigger if exists trg_release_locked_referral_commissions on public.user_plans;
create trigger trg_release_locked_referral_commissions
after insert or update of status on public.user_plans
for each row
when (new.status = 'active')
execute function public.release_locked_referral_commissions_on_plan_activation();

-- Correct the confirmed unqualified direct commission without deleting its audit trail.
do $migration$
declare
  c record;
begin
  for c in
    select rc.id, rc.user_id, rc.amount
    from public.referral_commissions rc
    join public.profiles referrer on referrer.id = rc.user_id
    join public.profiles source_user on source_user.id = rc.source_user_id
    where referrer.public_uid = '220517'
      and source_user.public_uid = '146606'
      and rc.source = 'approved_plan_purchase'
      and rc.level = 1
      and rc.status = 'completed'
      and not exists (
        select 1 from public.user_plans up
        join public.plans p on p.id = up.plan_id
        where up.user_id = rc.user_id
          and up.status = 'active'
          and p.active = true
          and p.status = 'active'
      )
    for update of rc
  loop
    update public.referral_commissions
       set status = 'locked'
     where id = c.id;

    update public.wallet_transactions
       set status = 'reversed'
     where reference_type = 'referral_commission'
       and reference_id = c.id
       and status = 'completed'
       and type in ('REFERRAL_COMMISSION', 'REFERRAL_REWARD');

    update public.transactions t
       set status = 'reversed'
     where t.source_type = 'wallet_transaction'
       and t.source_id in (
         select wt.id from public.wallet_transactions wt
         where wt.reference_type = 'referral_commission'
           and wt.reference_id = c.id
           and wt.status = 'reversed'
       );

    if not exists (
      select 1 from public.ledger_entries le
      where le.user_id = c.user_id
        and le.entry_type = 'referral_commission_lock'
        and le.reference_id = c.id
    ) then
      insert into public.ledger_entries(user_id, entry_type, amount, reference_id, note)
      values (
        c.user_id, 'referral_commission_lock', -c.amount, c.id,
        'Commission locked because referrer has no active plan; compensating entry'
      );
    end if;
  end loop;
end;
$migration$;

create or replace function public.distribute_indirect_referral_pool(p_purchase_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  d public.deposits;
  a public.purchase_allocations;
  v_level integer;
  v_current_id uuid;
  v_parent_id uuid;
  v_source_referral_id uuid;
  v_pool numeric(14,2);
  v_distributed numeric(14,2);
  v_weight numeric(14,4);
  v_total_weight numeric(14,4);
  v_target numeric(14,2);
  v_allocated_before numeric(14,2) := 0;
  v_existing numeric(14,2);
  v_delta numeric(14,2);
  v_commission public.referral_commissions;
  v_is_eligible boolean;
  v_eligible_count integer := 0;
  v_last_level integer := null;
begin
  if not public.is_admin() then
    raise exception 'not authorized' using errcode='42501';
  end if;

  select * into d from public.deposits where id=p_purchase_id for update;
  if not found or d.status <> 'approved' then
    raise exception 'approved purchase not found';
  end if;

  select * into a from public.purchase_allocations where purchase_id=p_purchase_id for update;
  if not found then raise exception 'purchase allocation not found'; end if;

  v_pool := coalesce(a.indirect_pool_amount_pkr,0);

  if v_pool <= 0 then
    return jsonb_build_object('status','no_indirect_pool','purchase_id',p_purchase_id,'pool',0,'distributed',0,'unallocated',0);
  end if;

  if not exists (select 1 from public.indirect_referral_level_rates where level between 1 and 6)
     or (select count(*) from public.indirect_referral_level_rates where level between 1 and 6) <> 6 then
    raise exception 'Indirect level weights L1-L6 are not configured';
  end if;

  select r.referrer_id, r.id into v_current_id, v_source_referral_id
  from public.referrals r
  where r.referred_id=d.user_id and r.level=1
  order by r.created_at asc limit 1;

  if v_current_id is null then
    select ref.id into v_current_id
    from public.profiles child
    join public.profiles ref on upper(trim(ref.referral_code))=upper(trim(child.referred_by))
    where child.id=d.user_id and ref.id<>d.user_id limit 1;

    if v_current_id is null then
      update public.purchase_allocations set indirect_pool_distributed_pkr=0 where purchase_id=p_purchase_id;
      return jsonb_build_object('status','no_eligible_recipient','purchase_id',p_purchase_id,'pool',v_pool,'distributed',0,'unallocated',v_pool);
    end if;
  end if;

  -- Skip the direct referrer. Indirect distribution starts at Level 2.
  select parent.id into v_parent_id
  from public.profiles child
  join public.profiles parent on upper(trim(parent.referral_code))=upper(trim(child.referred_by))
  where child.id=v_current_id and parent.id<>d.user_id limit 1;
  v_current_id := v_parent_id;

  for v_level in 2..6 loop
    if v_current_id is null then exit; end if;

    select exists(
      select 1 from public.user_plans up
      join public.plans rp on rp.id=up.plan_id
      where up.user_id=v_current_id and up.status='active'
        and lower(rp.name)='pro' and round(rp.price_pkr,2)=900
    ) into v_is_eligible;

    if v_is_eligible then
      select percentage into v_weight from public.indirect_referral_level_rates where level=v_level;
      v_total_weight := coalesce(v_total_weight,0) + coalesce(v_weight,0);
      v_eligible_count := v_eligible_count + 1;
      v_last_level := v_level;
    end if;

    select parent.id into v_parent_id
    from public.profiles child
    join public.profiles parent on upper(trim(parent.referral_code))=upper(trim(child.referred_by))
    where child.id=v_current_id and parent.id<>d.user_id limit 1;
    v_current_id := v_parent_id;
  end loop;

  if v_eligible_count=0 or coalesce(v_total_weight,0)<=0 then
    update public.purchase_allocations set indirect_pool_distributed_pkr=0 where purchase_id=p_purchase_id;
    return jsonb_build_object('status','no_eligible_recipient','purchase_id',p_purchase_id,'pool',v_pool,'distributed',0,'unallocated',v_pool);
  end if;

  select r.referrer_id into v_current_id
  from public.referrals r
  where r.referred_id=d.user_id and r.level=1
  order by r.created_at asc limit 1;

  if v_current_id is null then
    select ref.id into v_current_id
    from public.profiles child
    join public.profiles ref on upper(trim(ref.referral_code))=upper(trim(child.referred_by))
    where child.id=d.user_id and ref.id<>d.user_id limit 1;
  end if;

  select parent.id into v_parent_id
  from public.profiles child
  join public.profiles parent on upper(trim(parent.referral_code))=upper(trim(child.referred_by))
  where child.id=v_current_id and parent.id<>d.user_id limit 1;
  v_current_id := v_parent_id;

  for v_level in 2..6 loop
    if v_current_id is null then exit; end if;

    select exists(
      select 1 from public.user_plans up
      join public.plans rp on rp.id=up.plan_id
      where up.user_id=v_current_id and up.status='active'
        and lower(rp.name)='pro' and round(rp.price_pkr,2)=900
    ) into v_is_eligible;

    if v_is_eligible then
      select percentage into v_weight from public.indirect_referral_level_rates where level=v_level;

      if v_level = v_last_level then
        v_target := round(v_pool - v_allocated_before,2);
      else
        v_target := round(v_pool * v_weight / v_total_weight,2);
        v_allocated_before := v_allocated_before + v_target;
      end if;

      select * into v_commission
      from public.referral_commissions
      where purchase_id=p_purchase_id and user_id=v_current_id and level=v_level
        and source='approved_plan_purchase_indirect' and reversal_of is null
      order by created_at asc limit 1 for update;

      v_existing := coalesce(v_commission.amount,0);
      v_delta := round(v_target - v_existing,2);

      if v_commission.id is null then
        insert into public.referral_commissions(
          user_id,source_user_id,referral_id,purchase_id,plan_id,amount,percentage,level,source,status
        ) values(
          v_current_id,d.user_id,v_source_referral_id,d.id,d.plan_id,v_target,
          round(v_weight/v_total_weight*100,4),v_level,'approved_plan_purchase_indirect','completed'
        ) returning * into v_commission;
        v_delta := v_target;
      else
        update public.referral_commissions
        set amount=v_target, percentage=round(v_weight/v_total_weight*100,4), status='completed'
        where id=v_commission.id;
      end if;

      if v_delta <> 0 then
        insert into public.ledger_entries(user_id,entry_type,amount,reference_id,note)
        values(v_current_id,'referral_commission',v_delta,d.id,format('Indirect referral pool normalization - Level %s',v_level));

        insert into public.wallet_transactions(
          user_id,type,amount,currency,status,reference_id,reference_type,metadata
        ) values(
          v_current_id,'REFERRAL_COMMISSION',v_delta,'PKR','completed',v_commission.id,'referral_commission',
          jsonb_build_object('purchase_id',d.id,'referred_id',d.user_id,'level',v_level,
            'percentage',round(v_weight/v_total_weight*100,4),'indirect_pool',v_pool,
            'plan_id',d.plan_id,'commission_source','indirect_normalized')
        );
      end if;
    end if;

    select parent.id into v_parent_id
    from public.profiles child
    join public.profiles parent on upper(trim(parent.referral_code))=upper(trim(child.referred_by))
    where child.id=v_current_id and parent.id<>d.user_id limit 1;
    v_current_id := v_parent_id;
  end loop;

  select coalesce(sum(amount),0) into v_distributed
  from public.referral_commissions
  where purchase_id=p_purchase_id and source='approved_plan_purchase_indirect'
    and status='completed' and reversal_of is null;

  if round(v_distributed,2) > v_pool then
    raise exception 'Indirect distribution exceeds reserved pool';
  end if;

  update public.purchase_allocations
  set indirect_pool_distributed_pkr=round(v_distributed,2)
  where purchase_id=p_purchase_id;

  return jsonb_build_object('status','completed','purchase_id',p_purchase_id,'pool',v_pool,
    'distributed',round(v_distributed,2),'unallocated',round(v_pool-v_distributed,2),
    'eligible_recipients',v_eligible_count);
end;
$$;
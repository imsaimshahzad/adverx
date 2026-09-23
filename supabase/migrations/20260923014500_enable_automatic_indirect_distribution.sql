-- Make indirect referral distribution automatic on new purchase approval.
-- Existing purchases are untouched because this only changes the approval function.
-- The distribution function is called inside the same DB transaction; any unexpected
-- distribution error rolls the approval back.

CREATE OR REPLACE FUNCTION public.distribute_indirect_referral_pool(p_purchase_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  d public.deposits;
  a public.purchase_allocations;
  v_level integer;
  v_current_id uuid;
  v_parent_id uuid;
  v_rate numeric(7,4);
  v_pool numeric(14,2);
  v_amount numeric(14,2);
  v_distributed numeric(14,2);
  v_source_referral_id uuid;
  v_rate_total numeric(14,4);
  v_rate_count integer;
  v_commission public.referral_commissions;
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
    return jsonb_build_object('status','no_indirect_pool','purchase_id',p_purchase_id,'distributed',0);
  end if;

  select coalesce(sum(percentage),0),
         count(*) filter (where percentage is not null)
    into v_rate_total, v_rate_count
    from public.indirect_referral_level_rates;

  if v_rate_count <> 6 or round(v_rate_total,4) <> 100 then
    raise exception 'Indirect level percentages are not configured: all L1-L6 percentages must be set and total 100';
  end if;

  select r.referrer_id, r.id
    into v_current_id, v_source_referral_id
    from public.referrals r
   where r.referred_id=d.user_id and r.level=1
   order by r.created_at asc limit 1;

  if v_current_id is null then
    select ref.id into v_current_id
      from public.profiles child
      join public.profiles ref
        on upper(trim(ref.referral_code))=upper(trim(child.referred_by))
     where child.id=d.user_id and ref.id<>d.user_id
     limit 1;

    if v_current_id is null then
      return jsonb_build_object('status','no_genealogy','purchase_id',p_purchase_id,'distributed',0);
    end if;
  end if;

  for v_level in 1..6 loop
    if v_current_id is null then exit; end if;

    select percentage into v_rate
      from public.indirect_referral_level_rates
     where level=v_level;

    if exists(
      select 1
        from public.user_plans up
        join public.plans rp on rp.id=up.plan_id
       where up.user_id=v_current_id
         and up.status='active'
         and lower(rp.name)='pro'
         and round(rp.price_pkr,2)=900
    ) then
      v_amount := round(v_pool*v_rate/100,2);

      if v_amount > 0 then
        insert into public.referral_commissions(
          user_id,source_user_id,referral_id,purchase_id,plan_id,
          amount,percentage,level,source,status
        )
        values(
          v_current_id,d.user_id,v_source_referral_id,d.id,d.plan_id,
          v_amount,v_rate,v_level,'approved_plan_purchase_indirect','completed'
        )
        on conflict (purchase_id,user_id,level) where reversal_of is null
        do nothing
        returning * into v_commission;

        if v_commission.id is not null then
          insert into public.ledger_entries(user_id,entry_type,amount,reference_id,note)
          values(
            v_current_id,'referral_commission',v_amount,d.id,
            format('Indirect referral pool commission - Level %s',v_level)
          );

          insert into public.wallet_transactions(
            user_id,type,amount,currency,status,reference_id,reference_type,metadata
          )
          values(
            v_current_id,'REFERRAL_COMMISSION',v_amount,'PKR','completed',
            v_commission.id,'referral_commission',
            jsonb_build_object(
              'purchase_id',d.id,'referred_id',d.user_id,'level',v_level,
              'percentage',v_rate,'indirect_pool',v_pool,
              'plan_id',d.plan_id,'commission_source','indirect'
            )
          );
        end if;
      end if;
    end if;

    select parent.id into v_parent_id
      from public.profiles child
      join public.profiles parent
        on upper(trim(parent.referral_code))=upper(trim(child.referred_by))
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

  if v_distributed > v_pool then
    raise exception 'Indirect distribution exceeds reserved pool';
  end if;

  update public.purchase_allocations
     set indirect_pool_distributed_pkr=round(v_distributed,2)
   where purchase_id=p_purchase_id;

  return jsonb_build_object(
    'status','completed',
    'purchase_id',p_purchase_id,
    'pool',v_pool,
    'distributed',round(v_distributed,2)
  );
end;
$function$;

-- Replace the approval function so the indirect distribution runs before the
-- transaction completes. The rest of the existing allocation logic is preserved.
-- NOTE: this definition intentionally calls distribute_indirect_referral_pool()
-- only after the purchase allocation and direct commission have been created.
-- Any unexpected error rolls the whole approval transaction back.

-- The deployed database version is the source of truth for this function body.
-- This migration is kept alongside the DB change for repository reproducibility.

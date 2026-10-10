begin;

create table if not exists public.indirect_pool_admin_settlements (
  id uuid primary key default gen_random_uuid(),
  purchase_id uuid not null unique references public.deposits(id) on delete restrict,
  admin_user_id uuid not null references public.profiles(id) on delete restrict,
  amount numeric(14,2) not null check (amount >= 0),
  created_at timestamptz not null default now()
);

alter table public.indirect_pool_admin_settlements enable row level security;
revoke all on public.indirect_pool_admin_settlements from public, anon, authenticated;

-- Preserve the already-tested, idempotent L2-L6 distributor as a private base.
do $$
begin
  if to_regprocedure('public._distribute_indirect_referral_pool_base(uuid)') is null
     and to_regprocedure('public._distribute_indirect_referral_pool_internal(uuid)') is not null then
    alter function public._distribute_indirect_referral_pool_internal(uuid)
      rename to _distribute_indirect_referral_pool_base;
  end if;
end $$;

create or replace function public._distribute_indirect_referral_pool_internal(p_purchase_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public','pg_catalog'
as $function$
declare
  v_existing public.indirect_pool_admin_settlements;
  v_admin_id uuid;
  v_pool numeric(14,2);
  v_distributed numeric(14,2);
  v_remainder numeric(14,2);
  v_settlement_id uuid;
  v_result jsonb;
begin
  select * into v_existing
    from public.indirect_pool_admin_settlements
   where purchase_id=p_purchase_id;

  -- Once remainder is settled to admin, it must never be re-distributed to a later-eligible upliner.
  if found then
    select coalesce(indirect_pool_amount_pkr,0)
      into v_pool from public.purchase_allocations where purchase_id=p_purchase_id;
    select coalesce(sum(amount),0)
      into v_distributed from public.referral_commissions
     where purchase_id=p_purchase_id
       and source='approved_plan_purchase_indirect'
       and status='completed' and reversal_of is null;
    return jsonb_build_object('status','already_settled','purchase_id',p_purchase_id,
      'pool',coalesce(v_pool,0),'distributed',v_distributed,
      'admin_settled',v_existing.amount,'unallocated',0);
  end if;

  -- First pay only eligible L2-L6 recipients, using the established idempotent function.
  v_result := public._distribute_indirect_referral_pool_base(p_purchase_id);

  select coalesce(indirect_pool_amount_pkr,0)
    into v_pool from public.purchase_allocations where purchase_id=p_purchase_id;
  select coalesce(sum(amount),0)
    into v_distributed from public.referral_commissions
   where purchase_id=p_purchase_id
     and source='approved_plan_purchase_indirect'
     and status='completed' and reversal_of is null;

  v_remainder := greatest(0,round(v_pool-v_distributed,2));

  if v_remainder > 0 then
    select id into v_admin_id from public.profiles
     where lower(username)='admin' order by created_at asc limit 1;
    if v_admin_id is null then
      raise exception 'Admin profile not found; cannot settle unused indirect pool';
    end if;

    insert into public.indirect_pool_admin_settlements(purchase_id,admin_user_id,amount)
    values(p_purchase_id,v_admin_id,v_remainder)
    on conflict (purchase_id) do nothing
    returning id into v_settlement_id;

    if v_settlement_id is not null then
      insert into public.ledger_entries(user_id,entry_type,amount,reference_id,note)
      values(v_admin_id,'platform_profit',v_remainder,p_purchase_id,
        'Undistributed indirect referral pool settled to admin');

      insert into public.wallet_transactions(
        user_id,type,amount,currency,status,reference_id,reference_type,metadata
      )
      values(
        v_admin_id,'PLATFORM_PROFIT',v_remainder,'PKR','completed',
        v_settlement_id,'indirect_pool_admin_settlement',
        jsonb_build_object('purchase_id',p_purchase_id,'indirect_pool',v_pool,
          'distributed_to_eligible_upliners',v_distributed,
          'settlement_reason','undistributed_indirect_pool')
      );
    end if;
  end if;

  select * into v_existing
    from public.indirect_pool_admin_settlements where purchase_id=p_purchase_id;

  return jsonb_build_object('status','completed','purchase_id',p_purchase_id,
    'pool',v_pool,'distributed',v_distributed,
    'admin_settled',coalesce(v_existing.amount,0),
    'unallocated',greatest(0,round(v_pool-v_distributed-coalesce(v_existing.amount,0),2)));
end;
$function$;

revoke all on function public._distribute_indirect_referral_pool_internal(uuid) from public, anon, authenticated;
revoke all on function public._distribute_indirect_referral_pool_base(uuid) from public, anon, authenticated;

create or replace function public.distribute_indirect_referral_pool(p_purchase_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public','pg_catalog'
as $function$
begin
  if not public.is_admin() then
    raise exception 'not authorized' using errcode='42501';
  end if;
  return public._distribute_indirect_referral_pool_internal(p_purchase_id);
end;
$function$;

-- Backfill historical approved purchases. Each purchase can settle to admin only once.
do $$
declare r record;
begin
  for r in
    select d.id
      from public.deposits d
      join public.purchase_allocations pa on pa.purchase_id=d.id
     where d.status='approved'
       and coalesce(pa.indirect_pool_amount_pkr,0)>0
       and not exists (
         select 1 from public.indirect_pool_admin_settlements s where s.purchase_id=d.id
       )
     order by d.created_at
  loop
    perform public._distribute_indirect_referral_pool_internal(r.id);
  end loop;
end $$;

commit;
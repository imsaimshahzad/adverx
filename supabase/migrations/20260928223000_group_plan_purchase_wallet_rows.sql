-- Plan purchase is one human financial event. Reuse the deposit/purchase
-- transaction for its wallet accounting row instead of creating a second TXN.

update public.wallet_transactions wt
set transaction_id = parent.id
from public.transactions parent
where wt.type='PLAN_PURCHASE'
  and parent.source_type='deposit'
  and parent.source_id=wt.reference_id;

delete from public.transactions t
where t.source_type='wallet_transaction'
  and t.kind='PLAN_PURCHASE'
  and not exists (select 1 from public.wallet_transactions wt where wt.transaction_id=t.id);

create or replace function public.sync_transaction_for_wallet()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_parent uuid; v_kind text; v_description text; v_purchase uuid;
begin
  if new.transaction_id is not null then return new; end if;

  v_purchase := case when coalesce(new.metadata->>'purchase_id','') ~* '^[0-9a-f-]{36}$'
                     then (new.metadata->>'purchase_id')::uuid
                     when new.reference_type='plan_purchase' then new.reference_id
                     else null end;

  if v_purchase is not null then
    select id into v_parent from public.transactions where source_type='deposit' and source_id=v_purchase limit 1;
  end if;

  if upper(new.type)='PLAN_PURCHASE' and v_parent is not null then
    update public.wallet_transactions set transaction_id=v_parent where id=new.id and transaction_id is null;
    return new;
  end if;

  v_kind := case
    when upper(new.type) in ('TASK_REWARD','AD_REWARD','REWARD') then 'AD_REWARD'
    when upper(new.type) in ('REFERRAL_COMMISSION','REFERRAL_REWARD') then 'REFERRAL_REWARD'
    when upper(new.type) in ('PLATFORM_PROFIT','PLATFORM_ADMIN_PROFIT') then 'PLATFORM_PROFIT'
    when upper(new.type)='UNASSIGNED_REFERRAL' then 'UNASSIGNED_REFERRAL'
    when upper(new.type)='ADMIN_ADJUSTMENT' then 'ADMIN_ADJUSTMENT'
    when upper(new.type)='PLAN_PURCHASE' then 'PLAN_PURCHASE'
    else upper(new.type) end;

  v_description := case v_kind
    when 'AD_REWARD' then 'Advertisement reward'
    when 'REFERRAL_REWARD' then 'Referral reward'
    when 'PLATFORM_PROFIT' then 'Platform profit'
    when 'UNASSIGNED_REFERRAL' then 'Unassigned referral allocation'
    when 'ADMIN_ADJUSTMENT' then 'Admin adjustment'
    when 'PLAN_PURCHASE' then 'Plan purchase'
    else initcap(replace(lower(v_kind),'_',' ')) end;

  insert into public.transactions(user_id,parent_transaction_id,kind,amount,currency,status,source_type,source_id,description,metadata,created_at,processed_at)
  values(new.user_id,v_parent,v_kind,new.amount,coalesce(new.currency,'PKR'),new.status,'wallet_transaction',new.id,v_description,coalesce(new.metadata,'{}'::jsonb),new.created_at,new.created_at)
  on conflict (source_type,source_id) where source_type is not null and source_id is not null
  do update set user_id=excluded.user_id,parent_transaction_id=excluded.parent_transaction_id,kind=excluded.kind,
    amount=excluded.amount,status=excluded.status,metadata=excluded.metadata,processed_at=excluded.processed_at;

  update public.wallet_transactions wt
  set transaction_id=t.id
  from public.transactions t
  where wt.id=new.id and t.source_type='wallet_transaction' and t.source_id=new.id and wt.transaction_id is null;

  return new;
end; $$;

-- Repair ledger-to-wallet grouping for reward events and keep future
-- ledger inserts attached to their canonical wallet transaction.

update public.ledger_entries le
set transaction_id = wt.transaction_id
from public.wallet_transactions wt
where le.transaction_id is not null
  and le.entry_type = 'ad_reward'
  and wt.transaction_id is not null
  and wt.user_id = le.user_id
  and wt.reference_type = 'ad_reward'
  and wt.reference_id = le.reference_id
  and abs(wt.amount - le.amount) < 0.00001;

create or replace function public.sync_transaction_for_ledger()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_tx uuid; v_kind text;
begin
  if new.transaction_id is not null then return new; end if;

  select id into v_tx from public.transactions where source_type='deposit' and source_id=new.reference_id limit 1;

  if v_tx is null then
    select transaction_id into v_tx from public.wallet_transactions
    where id=new.reference_id and transaction_id is not null limit 1;
  end if;

  if v_tx is null then
    select transaction_id into v_tx from public.wallet_transactions
    where user_id=new.user_id and reference_type=new.entry_type
      and reference_id=new.reference_id and abs(amount-new.amount) < 0.00001
      and transaction_id is not null
    order by created_at desc limit 1;
  end if;

  if v_tx is null and new.entry_type='referral_commission' then
    select t.id into v_tx
    from public.referral_commissions rc
    join public.transactions t on t.source_type='wallet_transaction'
      and t.kind='REFERRAL_REWARD' and t.user_id=rc.user_id
      and t.metadata->>'purchase_id'=rc.purchase_id::text
    where rc.id=new.reference_id limit 1;
  end if;

  if v_tx is null then
    v_kind := case new.entry_type
      when 'ad_reward' then 'AD_REWARD'
      when 'referral_commission' then 'REFERRAL_REWARD'
      when 'platform_admin_profit' then 'PLATFORM_PROFIT'
      when 'unassigned_referral' then 'UNASSIGNED_REFERRAL'
      when 'admin_adjustment' then 'ADMIN_ADJUSTMENT'
      when 'plan_purchase' then 'PLAN_PURCHASE'
      else 'ACCOUNTING_ENTRY' end;
    insert into public.transactions(user_id,kind,amount,currency,status,source_type,source_id,description,metadata,created_at,processed_at)
    values(new.user_id,v_kind,new.amount,'PKR','completed','ledger_entry',new.id,
      coalesce(new.note,initcap(replace(new.entry_type,'_',' '))),
      jsonb_build_object('entry_type',new.entry_type,'reference_id',new.reference_id),
      new.created_at,new.created_at)
    returning id into v_tx;
  end if;

  update public.ledger_entries set transaction_id=v_tx where id=new.id and transaction_id is null;
  return new;
end; $$;

delete from public.transactions t
where t.source_type='ledger_entry'
  and t.kind='AD_REWARD'
  and not exists (select 1 from public.ledger_entries le where le.transaction_id=t.id);

-- Human-facing transaction identity layer.
-- Keeps existing UUIDs/accounting intact while adding stable TXN-XXXXXXXX tracing IDs.

create sequence if not exists public.transaction_no_seq as bigint start 10000000;

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  transaction_no text not null unique default ('TXN-' || lpad(nextval('public.transaction_no_seq')::text, 8, '0')),
  user_id uuid null references public.profiles(id) on delete set null,
  parent_transaction_id uuid null references public.transactions(id) on delete set null,
  kind text not null,
  amount numeric not null default 0,
  currency text not null default 'PKR',
  status text not null default 'completed',
  source_type text null,
  source_id uuid null,
  description text null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  processed_at timestamptz null
);

comment on table public.transactions is 'Human-facing financial activity layer. UUIDs remain machine identifiers; transaction_no is the stable support/tracing ID.';

create unique index if not exists transactions_source_unique on public.transactions(source_type, source_id)
where source_type is not null and source_id is not null;
create index if not exists transactions_user_created_idx on public.transactions(user_id, created_at desc);
create index if not exists transactions_parent_idx on public.transactions(parent_transaction_id);

alter table public.wallet_transactions add column if not exists transaction_id uuid references public.transactions(id) on delete set null;
alter table public.ledger_entries add column if not exists transaction_id uuid references public.transactions(id) on delete set null;
create index if not exists wallet_transactions_transaction_idx on public.wallet_transactions(transaction_id);
create index if not exists ledger_entries_transaction_idx on public.ledger_entries(transaction_id);

alter table public.transactions enable row level security;

drop policy if exists "transactions_select_own_or_staff" on public.transactions;
create policy "transactions_select_own_or_staff" on public.transactions for select to authenticated
using (user_id = auth.uid() or public.is_staff(auth.uid()));

drop policy if exists "transactions_insert_staff" on public.transactions;
create policy "transactions_insert_staff" on public.transactions for insert to authenticated
with check (public.is_staff(auth.uid()));

drop policy if exists "transactions_update_staff" on public.transactions;
create policy "transactions_update_staff" on public.transactions for update to authenticated
using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));

create or replace function public.sync_transaction_for_deposit()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_kind text; v_status text; v_amount numeric; v_plan_name text;
begin
  v_kind := case when new.plan_id is not null then 'PLAN_PURCHASE' else 'DEPOSIT' end;
  v_status := case when new.status='approved' then 'completed' when new.status='rejected' then 'failed' else 'pending' end;
  v_amount := case when new.status='approved' and new.plan_id is not null then -abs(new.amount) else abs(new.amount) end;
  select name into v_plan_name from public.plans where id=new.plan_id;
  insert into public.transactions(user_id,kind,amount,currency,status,source_type,source_id,description,metadata,created_at,processed_at)
  values(new.user_id,v_kind,v_amount,'PKR',v_status,'deposit',new.id,
    case when v_plan_name is not null then v_plan_name || ' Plan Purchase' else 'Deposit' end,
    jsonb_build_object('plan_id',new.plan_id,'payment_method',new.method,'payment_reference',new.transaction_id),
    new.created_at,new.approved_at)
  on conflict (source_type,source_id) where source_type is not null and source_id is not null do update set
    user_id=excluded.user_id, kind=excluded.kind, amount=excluded.amount, status=excluded.status,
    description=excluded.description, metadata=excluded.metadata, processed_at=excluded.processed_at;
  return new;
end; $$;

create or replace function public.sync_transaction_for_withdrawal()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_status text;
begin
  v_status := case when new.status in ('completed','paid','approved','processing') then 'completed'
                   when new.status in ('rejected','cancelled') then 'failed' else 'pending' end;
  insert into public.transactions(user_id,kind,amount,currency,status,source_type,source_id,description,metadata,created_at,processed_at)
  values(new.user_id,'WITHDRAWAL',-abs(coalesce(new.amount,0)),coalesce(new.currency,'PKR'),v_status,'withdrawal',new.id,
    'Withdrawal Request',jsonb_build_object('method',new.method,'account',new.account,'fee',coalesce(new.fee,0)),
    new.created_at,new.reviewed_at)
  on conflict (source_type,source_id) where source_type is not null and source_id is not null do update set
    status=excluded.status, amount=excluded.amount, metadata=excluded.metadata, processed_at=excluded.processed_at;
  return new;
end; $$;

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
  values(new.user_id,v_parent,v_kind,new.amount,coalesce(new.currency,'PKR'),new.status,'wallet_transaction',new.id,
    v_description,coalesce(new.metadata,'{}'::jsonb),new.created_at,new.created_at)
  on conflict (source_type,source_id) where source_type is not null and source_id is not null do update set
    user_id=excluded.user_id,parent_transaction_id=excluded.parent_transaction_id,kind=excluded.kind,
    amount=excluded.amount,status=excluded.status,metadata=excluded.metadata,processed_at=excluded.processed_at;

  update public.wallet_transactions wt
  set transaction_id=t.id
  from public.transactions t
  where wt.id=new.id and t.source_type='wallet_transaction' and t.source_id=new.id and wt.transaction_id is null;
  return new;
end; $$;

create or replace function public.sync_transaction_for_ledger()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_tx uuid; v_kind text;
begin
  if new.transaction_id is not null then return new; end if;

  select id into v_tx from public.transactions where source_type='deposit' and source_id=new.reference_id limit 1;
  if v_tx is null then
    select transaction_id into v_tx from public.wallet_transactions where id=new.reference_id and transaction_id is not null limit 1;
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

drop trigger if exists deposits_transaction_sync on public.deposits;
create trigger deposits_transaction_sync after insert or update of status,approved_at,method,transaction_id on public.deposits
for each row execute function public.sync_transaction_for_deposit();

drop trigger if exists withdrawals_transaction_sync on public.withdrawals;
create trigger withdrawals_transaction_sync after insert or update of status,reviewed_at,method,account,fee on public.withdrawals
for each row execute function public.sync_transaction_for_withdrawal();

drop trigger if exists wallet_transactions_transaction_sync on public.wallet_transactions;
create trigger wallet_transactions_transaction_sync after insert on public.wallet_transactions
for each row execute function public.sync_transaction_for_wallet();

drop trigger if exists ledger_entries_transaction_sync on public.ledger_entries;
create trigger ledger_entries_transaction_sync after insert on public.ledger_entries
for each row execute function public.sync_transaction_for_ledger();

insert into public.transactions(user_id,kind,amount,currency,status,source_type,source_id,description,metadata,created_at,processed_at)
select d.user_id, case when d.plan_id is not null then 'PLAN_PURCHASE' else 'DEPOSIT' end,
  case when d.status='approved' and d.plan_id is not null then -abs(d.amount) else abs(d.amount) end,
  'PKR', case when d.status='approved' then 'completed' when d.status='rejected' then 'failed' else 'pending' end,
  'deposit',d.id,coalesce(pl.name || ' Plan Purchase','Deposit'),
  jsonb_build_object('plan_id',d.plan_id,'payment_method',d.method,'payment_reference',d.transaction_id),
  d.created_at,d.approved_at
from public.deposits d left join public.plans pl on pl.id=d.plan_id
on conflict (source_type,source_id) where source_type is not null and source_id is not null do nothing;

insert into public.transactions(user_id,parent_transaction_id,kind,amount,currency,status,source_type,source_id,description,metadata,created_at,processed_at)
select wt.user_id,parent.id,
  case when upper(wt.type) in ('TASK_REWARD','AD_REWARD','REWARD') then 'AD_REWARD'
       when upper(wt.type) in ('REFERRAL_COMMISSION','REFERRAL_REWARD') then 'REFERRAL_REWARD'
       when upper(wt.type) in ('PLATFORM_PROFIT','PLATFORM_ADMIN_PROFIT') then 'PLATFORM_PROFIT'
       when upper(wt.type)='UNASSIGNED_REFERRAL' then 'UNASSIGNED_REFERRAL'
       when upper(wt.type)='ADMIN_ADJUSTMENT' then 'ADMIN_ADJUSTMENT'
       when upper(wt.type)='PLAN_PURCHASE' then 'PLAN_PURCHASE'
       else upper(wt.type) end,
  wt.amount,coalesce(wt.currency,'PKR'),wt.status,'wallet_transaction',wt.id,
  case when upper(wt.type) in ('TASK_REWARD','AD_REWARD','REWARD') then 'Advertisement reward'
       when upper(wt.type) in ('REFERRAL_COMMISSION','REFERRAL_REWARD') then 'Referral reward'
       when upper(wt.type) in ('PLATFORM_PROFIT','PLATFORM_ADMIN_PROFIT') then 'Platform profit'
       when upper(wt.type)='UNASSIGNED_REFERRAL' then 'Unassigned referral allocation'
       when upper(wt.type)='ADMIN_ADJUSTMENT' then 'Admin adjustment'
       when upper(wt.type)='PLAN_PURCHASE' then 'Plan purchase'
       else initcap(replace(lower(wt.type),'_',' ')) end,
  coalesce(wt.metadata,'{}'::jsonb),wt.created_at,wt.created_at
from public.wallet_transactions wt
left join lateral (
  select t.id from public.transactions t
  where t.source_type='deposit'
    and t.source_id=coalesce(
      case when (wt.metadata->>'purchase_id') ~* '^[0-9a-f-]{36}$' then (wt.metadata->>'purchase_id')::uuid end,
      case when wt.reference_type='plan_purchase' then wt.reference_id end)
  limit 1
) parent on true
on conflict (source_type,source_id) where source_type is not null and source_id is not null do nothing;

update public.wallet_transactions wt
set transaction_id=t.id
from public.transactions t
where t.source_type='wallet_transaction' and t.source_id=wt.id and wt.transaction_id is null;

update public.ledger_entries le
set transaction_id=tx.id
from public.transactions tx
where le.transaction_id is null
  and ((tx.source_type='deposit' and tx.source_id=le.reference_id)
    or (tx.source_type='wallet_transaction' and tx.source_id=le.reference_id));

update public.ledger_entries le
set transaction_id=(
  select t.id
  from public.referral_commissions rc
  join public.transactions t on t.source_type='wallet_transaction'
    and t.kind='REFERRAL_REWARD'
    and t.user_id=rc.user_id
    and t.metadata->>'purchase_id'=rc.purchase_id::text
  where rc.id=le.reference_id
  limit 1)
where le.transaction_id is null and le.entry_type='referral_commission'
  and exists(select 1 from public.referral_commissions rc2 where rc2.id=le.reference_id);

insert into public.transactions(user_id,kind,amount,currency,status,source_type,source_id,description,metadata,created_at,processed_at)
select le.user_id,
  case le.entry_type when 'ad_reward' then 'AD_REWARD' when 'referral_commission' then 'REFERRAL_REWARD'
       when 'platform_admin_profit' then 'PLATFORM_PROFIT' when 'unassigned_referral' then 'UNASSIGNED_REFERRAL'
       when 'admin_adjustment' then 'ADMIN_ADJUSTMENT' when 'plan_purchase' then 'PLAN_PURCHASE'
       else 'ACCOUNTING_ENTRY' end,
  le.amount,'PKR','completed','ledger_entry',le.id,
  coalesce(le.note,initcap(replace(le.entry_type,'_',' '))),
  jsonb_build_object('entry_type',le.entry_type,'reference_id',le.reference_id),
  le.created_at,le.created_at
from public.ledger_entries le
where le.transaction_id is null
on conflict (source_type,source_id) where source_type is not null and source_id is not null do nothing;

update public.ledger_entries le
set transaction_id=tx.id
from public.transactions tx
where le.transaction_id is null and tx.source_type='ledger_entry' and tx.source_id=le.id;

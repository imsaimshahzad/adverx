-- Fix: withdrawals does not have a currency column.
-- The platform wallet/transaction currency is PKR, so the withdrawal sync
-- trigger must not read new.currency.

create or replace function public.sync_transaction_for_withdrawal()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_status text;
begin
  v_status := case
    when new.status in ('completed','paid','approved','processing') then 'completed'
    when new.status in ('rejected','cancelled') then 'failed'
    else 'pending'
  end;

  insert into public.transactions(
    user_id,kind,amount,currency,status,source_type,source_id,
    description,metadata,created_at,processed_at
  )
  values(
    new.user_id,
    'WITHDRAWAL',
    -abs(coalesce(new.amount,0)),
    'PKR',
    v_status,
    'withdrawal',
    new.id,
    'Withdrawal Request',
    jsonb_build_object(
      'method',new.method,
      'account',new.account,
      'fee',coalesce(new.fee,0)
    ),
    new.created_at,
    new.reviewed_at
  )
  on conflict (source_type,source_id)
  where source_type is not null and source_id is not null
  do update set
    status=excluded.status,
    amount=excluded.amount,
    metadata=excluded.metadata,
    processed_at=excluded.processed_at;

  return new;
end;
$function$;
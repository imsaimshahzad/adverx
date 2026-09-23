-- Keep Admin > Revenue > Platform Wallet Activity aligned with the platform accounting ledger.
-- This migration extends the admin profit ledger RPC with admin-owned wallet entries:
-- unassigned referrals, admin adjustments, withdrawals, and withdrawal refunds.
-- It also exposes created_at/amount so the existing activity table can render them.

create or replace function public.admin_profit_ledger_page()
returns setof jsonb
language sql
security definer
set search_path = ''
as $function$
  select jsonb_build_object(
    'id', x.id,
    'date', x.created_at,
    'created_at', x.created_at,
    'purchase_id', x.purchase_id,
    'user_id', x.user_id,
    'user_name', x.user_name,
    'plan_name', x.plan_name,
    'purchase_amount', x.purchase_amount,
    'profit_percentage', x.profit_percentage,
    'amount', x.amount,
    'admin_profit', x.amount,
    'status', x.status,
    'source', x.source,
    'category', x.category
  )
  from (
    select
      l.id,
      l.created_at,
      l.purchase_id,
      l.user_id,
      p.full_name as user_name,
      pl.name as plan_name,
      l.gross_amount as purchase_amount,
      l.profit_percentage,
      case when l.transaction_type = 'platform_profit_reversal'
        then -l.profit_amount
        else l.profit_amount
      end as amount,
      l.status,
      l.transaction_type as source,
      'platform_profit'::text as category
    from public.admin_profit_ledger l
    join public.profiles p on p.id = l.user_id
    join public.plans pl on pl.id = l.plan_id
    where public.is_admin()

    union all

    select
      le.id,
      le.created_at,
      null::uuid as purchase_id,
      le.user_id,
      p.full_name as user_name,
      null::text as plan_name,
      null::numeric as purchase_amount,
      null::numeric as profit_percentage,
      le.amount,
      coalesce(le.note, le.entry_type) as source,
      'completed'::text as status,
      le.entry_type as category
    from public.ledger_entries le
    left join public.profiles p on p.id = le.user_id
    where public.is_admin()
      and le.user_id = auth.uid()
      and le.entry_type in (
        'unassigned_referral',
        'admin_adjustment',
        'withdrawal',
        'withdrawal_refund'
      )
  ) x
  order by x.created_at desc;
$function$;

revoke execute on function public.admin_profit_ledger_page() from public, anon, authenticated;
grant execute on function public.admin_profit_ledger_page() to authenticated;

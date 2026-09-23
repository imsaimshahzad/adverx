-- Keep the admin's withdrawable balance aligned with the real admin ledger.
-- Direct referral commissions earned by the admin are admin-owned funds,
-- including historical correction entries.

create or replace function public.admin_profit_summary()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_admin uuid;
  v_unallocated_recovery numeric;
  v_available_balance numeric;
begin
  if not public.is_admin() then
    raise exception 'not authorized' using errcode='42501';
  end if;

  select auth.uid() into v_admin;

  select coalesce(sum(
    case
      when entry_type = 'credit' then amount_pkr
      when entry_type in ('debit','reversal') then -amount_pkr
      else 0
    end
  ),0)
  into v_unallocated_recovery
  from public.recovery_fund_ledger
  where user_id is null;

  select coalesce(sum(amount),0)
  into v_available_balance
  from public.ledger_entries
  where user_id = v_admin
    and entry_type in (
      'platform_admin_profit',
      'unassigned_referral',
      'referral_commission',
      'referral_commission_adjustment',
      'admin_adjustment',
      'withdrawal',
      'withdrawal_refund'
    );

  return jsonb_build_object(
    'total_admin_profit', coalesce((select sum(case when transaction_type='platform_profit' then profit_amount else -profit_amount end) from public.admin_profit_ledger),0),
    'total_profit', coalesce((select sum(case when transaction_type='platform_profit' then profit_amount else -profit_amount end) from public.admin_profit_ledger),0),
    'platform_profit', coalesce((select sum(case when transaction_type='platform_profit' then profit_amount else -profit_amount end) from public.admin_profit_ledger),0),
    'today_profit', coalesce((select sum(case when transaction_type='platform_profit' then profit_amount else -profit_amount end) from public.admin_profit_ledger where (created_at at time zone 'Asia/Karachi')::date=(now() at time zone 'Asia/Karachi')::date),0),
    'today_admin_earnings', coalesce((select sum(amount) from public.ledger_entries where user_id=v_admin and entry_type in ('platform_admin_profit','unassigned_referral','referral_commission','referral_commission_adjustment') and (created_at at time zone 'Asia/Karachi')::date=(now() at time zone 'Asia/Karachi')::date and coalesce(note,'') not ilike '%Ahmad31 purchase%'),0),
    'month_profit', coalesce((select sum(case when transaction_type='platform_profit' then profit_amount else -profit_amount end) from public.admin_profit_ledger where date_trunc('month',created_at at time zone 'Asia/Karachi')=date_trunc('month',now() at time zone 'Asia/Karachi')),0),
    'unassigned_referral', coalesce((select sum(amount) from public.ledger_entries where user_id=v_admin and entry_type='unassigned_referral'),0),
    'total_unassigned_referral', coalesce((select sum(amount) from public.ledger_entries where user_id=v_admin and entry_type='unassigned_referral'),0),
    'unallocated_recovery', v_unallocated_recovery,
    'unallocated_recovery_withdrawable', false,
    'admin_platform_total', coalesce((select sum(amount) from public.ledger_entries where user_id=v_admin and entry_type in ('platform_admin_profit','unassigned_referral')),0),
    'retained_reward_budget', 0,
    'available_balance', v_available_balance,
    'available_platform_funds', v_available_balance,
    'admin_own_balance', v_available_balance,
    'total_withdrawn', coalesce((select sum(amount) from public.withdrawals where user_id=v_admin and status='paid'),0),
    'withdrawn_balance', coalesce((select sum(amount) from public.withdrawals where user_id=v_admin and status='paid'),0),
    'pending_withdrawals', coalesce((select sum(amount) from public.withdrawals where user_id=v_admin and status in ('pending','approved','processing','under_review')),0),
    'pending_balance', coalesce((select sum(amount) from public.withdrawals where user_id=v_admin and status in ('pending','approved','processing','under_review')),0),
    'total_owed_to_users', coalesce((select sum(b) from (select user_id,sum(amount) b from public.ledger_entries where entry_type in ('ad_reward','referral_commission','admin_adjustment','withdrawal','withdrawal_refund') group by user_id) x where b>0),0),
    'users_with_balance', coalesce((select count(*) from (select user_id,sum(amount) b from public.ledger_entries where entry_type in ('ad_reward','referral_commission','admin_adjustment','withdrawal','withdrawal_refund') group by user_id) x where b>0),0),
    'users_in_debt', coalesce((select -sum(b) from (select user_id,sum(amount) b from public.ledger_entries where entry_type in ('ad_reward','referral_commission','admin_adjustment','withdrawal','withdrawal_refund') group by user_id) x where b<0),0),
    'platform_withdrawn_paid', coalesce((select sum(amount) from public.withdrawals where status='paid'),0),
    'platform_withdrawals_pending', coalesce((select sum(amount) from public.withdrawals where status in ('pending','approved','processing','under_review')),0)
  );
end;
$function$;

revoke execute on function public.admin_profit_summary() from public, anon;
grant execute on function public.admin_profit_summary() to authenticated;

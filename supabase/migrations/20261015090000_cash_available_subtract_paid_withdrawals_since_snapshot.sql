CREATE OR REPLACE FUNCTION public.admin_operations_overview()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare
  result jsonb;
  v_total_sales numeric := 0;
  v_paid_withdrawals numeric := 0;
  v_total_payable numeric := 0;
  v_actual_cash numeric := 0;
  v_cash_updated_at timestamptz;
  v_new_cash_receipts numeric := 0;
  v_paid_withdrawals_since_update numeric := 0;
  v_available_cash numeric := 0;
begin
  if not public.is_admin() then
    raise exception 'not authorized' using errcode='42501';
  end if;

  select coalesce(sum(amount),0) into v_total_sales
  from public.deposits
  where plan_id is not null and status='approved'
    and id <> '7aafda9e-bebf-414f-a2dc-116107701073'::uuid;

  select coalesce(sum(amount),0) into v_paid_withdrawals
  from public.withdrawals where status='paid';

  v_total_payable := greatest(v_total_sales - v_paid_withdrawals, 0);

  select coalesce(value,0), updated_at into v_actual_cash, v_cash_updated_at
  from public.admin_settings where key='actual_cash_available_pkr';

  v_actual_cash := greatest(coalesce(v_actual_cash,0),0);

  select coalesce(sum(amount),0) into v_new_cash_receipts
  from public.deposits
  where plan_id is not null and status='approved'
    and id <> '7aafda9e-bebf-414f-a2dc-116107701073'::uuid
    and approved_at > coalesce(v_cash_updated_at, 'epoch'::timestamptz);

  -- Cash is a snapshot: subtract only payouts marked paid after that snapshot.
  select coalesce(sum(amount),0) into v_paid_withdrawals_since_update
  from public.withdrawals
  where status='paid'
    and reviewed_at > coalesce(v_cash_updated_at, 'epoch'::timestamptz);

  v_available_cash := greatest(v_actual_cash + v_new_cash_receipts - v_paid_withdrawals_since_update, 0);

  select jsonb_build_object(
    'total_users',(select count(*) from public.profiles),
    'active_users',(select count(*) from public.profiles where status='active'),
    'gross_plan_sales',v_total_sales,
    'today_plan_sales',(select coalesce(sum(amount),0) from public.deposits where plan_id is not null and status='approved' and id <> '7aafda9e-bebf-414f-a2dc-116107701073'::uuid and created_at::date=current_date),
    'approved_plan_sales',(select count(*) from public.deposits where plan_id is not null and status='approved' and id <> '7aafda9e-bebf-414f-a2dc-116107701073'::uuid),
    'pending_deposits',(select count(*) from public.deposits where status='pending'),
    'pending_withdrawals',(select count(*) from public.withdrawals where status='pending'),
    'completed_withdrawals',(select count(*) from public.withdrawals where status='paid'),
    'total_rewards_issued',(select coalesce(sum(amount_pkr),0) from public.reward_transactions where reward_type='ad_reward' and status='completed'),
    'total_remaining_user_reward_reserves',(select coalesce(sum(remaining_reward_budget_pkr),0) from public.user_plans where status='active') + (select coalesce(sum(recovery_reserve_pkr),0) from public.profiles),
    'total_referral_commissions',(select coalesce(sum(amount),0) from public.referral_commissions where status='completed'),
    'total_withdrawals_paid',v_paid_withdrawals,
    'tracked_cash_retained',v_total_sales-v_paid_withdrawals,
    'today_ad_completions',(select count(*) from public.ad_completions where completed_at::date=current_date),
    'pending_support_tickets',(select count(*) from public.support_tickets where status in ('open','in_progress')),
    'risk_alerts',(select count(*) from public.fraud_flags where status='open'),
    'advertiser_revenue',(select coalesce(sum(amount),0) from public.advertiser_revenue where status='verified'),
    'total_recovery_fund_collected',(select coalesce(sum(amount_pkr),0) from public.recovery_fund_ledger where entry_type='credit' and user_id is null),
    'total_recovery_fund_used',(select coalesce(sum(amount_pkr),0) from public.recovery_fund_ledger where entry_type='debit' and user_id is null),
    'remaining_recovery_fund',(select coalesce(sum(case when entry_type='credit' then amount_pkr when entry_type='debit' then -amount_pkr when entry_type='reversal' then amount_pkr else 0 end),0) from public.recovery_fund_ledger where user_id is null),
    'total_ad_budget_recovered',(select coalesce(sum(amount_pkr),0) from public.recovery_fund_ledger where entry_type='referrer_credit'),
    'user_wallet_payable',(select coalesce(sum(b),0) from (select user_id,sum(case when entry_type='withdrawal' then -abs(amount) else amount end) b from public.ledger_entries where entry_type in ('ad_reward','referral_commission','admin_adjustment','withdrawal','withdrawal_refund') group by user_id) x where b>0),
    'reward_reserve_payable',(select coalesce(sum(remaining_reward_budget_pkr),0) from public.user_plans where status='active'),
    'profile_recovery_reserve_payable',(select coalesce(sum(recovery_reserve_pkr),0) from public.profiles where recovery_reserve_pkr>0),
    'admin_payable_balance',(select coalesce(sum(le.amount),0) from public.ledger_entries le join public.profiles p on p.id=le.user_id where p.role in ('admin','super_admin','moderator') and le.entry_type in ('platform_admin_profit','unassigned_referral','referral_commission','referral_commission_adjustment','admin_adjustment','withdrawal','withdrawal_refund')),
    'total_payable_liability',v_total_payable,
    'actual_cash_available',v_actual_cash,
    'new_cash_receipts_since_update',v_new_cash_receipts,
    'paid_withdrawals_since_update',v_paid_withdrawals_since_update,
    'cash_available_total',v_available_cash,
    'cash_surplus_shortfall',v_available_cash-v_total_payable,
    'cash_coverage_pct',case when v_total_payable>0 then v_available_cash/v_total_payable*100 else 100 end
  ) into result;
  return result;
end;
$function$;

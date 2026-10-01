-- Show the referral-funded amount allocated into ad reward capacity.
create or replace function public.admin_operations_overview()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare result jsonb;
begin
  if not public.is_admin() then raise exception 'not authorized' using errcode='42501'; end if;
  select jsonb_build_object(
    'total_users',(select count(*) from public.profiles),
    'active_users',(select count(*) from public.profiles where status='active'),
    'gross_plan_sales',(select coalesce(sum(amount),0) from public.deposits where plan_id is not null and status='approved' and id <> '7aafda9e-bebf-414f-a2dc-116107701073'::uuid),
    'today_plan_sales',(select coalesce(sum(amount),0) from public.deposits where plan_id is not null and status='approved' and id <> '7aafda9e-bebf-414f-a2dc-116107701073'::uuid and created_at::date=current_date),
    'approved_plan_sales',(select count(*) from public.deposits where plan_id is not null and status='approved' and id <> '7aafda9e-bebf-414f-a2dc-116107701073'::uuid),
    'pending_deposits',(select count(*) from public.deposits where status='pending'),
    'pending_withdrawals',(select count(*) from public.withdrawals where status='pending'),
    'completed_withdrawals',(select count(*) from public.withdrawals where status='paid'),
    'total_rewards_issued',(select coalesce(sum(amount_pkr),0) from public.reward_transactions where reward_type='ad_reward' and status='completed'),
    'total_remaining_user_reward_reserves',(select coalesce(sum(remaining_reward_budget_pkr),0) from public.user_plans where status='active') + (select coalesce(sum(recovery_reserve_pkr),0) from public.profiles),
    'total_referral_commissions',(select coalesce(sum(amount),0) from public.referral_commissions where status='completed'),
    'total_withdrawals_paid',(select coalesce(sum(amount),0) from public.withdrawals where status='paid'),
    'tracked_cash_retained',(select coalesce(sum(amount),0) from public.deposits where plan_id is not null and status='approved' and id <> '7aafda9e-bebf-414f-a2dc-116107701073'::uuid) - (select coalesce(sum(amount),0) from public.withdrawals where status='paid'),
    'today_ad_completions',(select count(*) from public.ad_completions where completed_at::date=current_date),
    'pending_support_tickets',(select count(*) from public.support_tickets where status in ('open','in_progress')),
    'risk_alerts',(select count(*) from public.fraud_flags where status='open'),
    'advertiser_revenue',(select coalesce(sum(amount),0) from public.advertiser_revenue where status='verified'),
    'total_recovery_fund_collected',(select coalesce(sum(amount_pkr),0) from public.recovery_fund_ledger where entry_type='credit' and user_id is null),
    'total_recovery_fund_used',(select coalesce(sum(amount_pkr),0) from public.recovery_fund_ledger where entry_type='debit' and user_id is null),
    'remaining_recovery_fund',(select coalesce(sum(case when entry_type='credit' then amount_pkr when entry_type='debit' then -amount_pkr when entry_type='reversal' then amount_pkr else 0 end),0) from public.recovery_fund_ledger where user_id is null),
    'total_ad_budget_recovered',(select coalesce(sum(amount_pkr),0) from public.recovery_fund_ledger where entry_type='referrer_credit')
  ) into result;
  return result;
end;
$$;

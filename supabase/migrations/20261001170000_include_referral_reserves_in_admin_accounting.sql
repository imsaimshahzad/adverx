-- Keep referral-funded reward reserves visible in admin financial summaries.
-- User-specific reserve credits remain separate from spendable wallet cash.

-- Members can see only their own referral-reserve credits for Recent Activity.
drop policy if exists recovery_fund_user_select on public.recovery_fund_ledger;
create policy recovery_fund_user_select
on public.recovery_fund_ledger
for select
to authenticated
using (user_id = auth.uid());

create or replace function public.admin_operations_overview()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  result jsonb;
begin
  if not public.is_admin() then
    raise exception 'not authorized' using errcode='42501';
  end if;

  select jsonb_build_object(
    'total_users', (select count(*) from public.profiles),
    'active_users', (select count(*) from public.profiles where status='active'),
    'gross_plan_sales', (select coalesce(sum(amount),0) from public.deposits where plan_id is not null and status='approved' and id <> '7aafda9e-bebf-414f-a2dc-116107701073'::uuid),
    'today_plan_sales', (select coalesce(sum(amount),0) from public.deposits where plan_id is not null and status='approved' and id <> '7aafda9e-bebf-414f-a2dc-116107701073'::uuid and created_at::date=current_date),
    'approved_plan_sales', (select count(*) from public.deposits where plan_id is not null and status='approved' and id <> '7aafda9e-bebf-414f-a2dc-116107701073'::uuid),
    'pending_deposits', (select count(*) from public.deposits where status='pending'),
    'pending_withdrawals', (select count(*) from public.withdrawals where status='pending'),
    'completed_withdrawals', (select count(*) from public.withdrawals where status='paid'),
    'total_rewards_issued', (select coalesce(sum(amount_pkr),0) from public.reward_transactions where reward_type='ad_reward' and status='completed'),
    'total_remaining_user_reward_reserves',
      (select coalesce(sum(remaining_reward_budget_pkr),0) from public.user_plans where status='active')
      + (select coalesce(sum(recovery_reserve_pkr),0) from public.profiles),
    'total_referral_commissions', (select coalesce(sum(amount),0) from public.referral_commissions where status='completed'),
    'total_withdrawals_paid', (select coalesce(sum(amount),0) from public.withdrawals where status='paid'),
    'tracked_cash_retained',
      (select coalesce(sum(amount),0) from public.deposits where plan_id is not null and status='approved' and id <> '7aafda9e-bebf-414f-a2dc-116107701073'::uuid)
      - (select coalesce(sum(amount),0) from public.withdrawals where status='paid'),
    'today_ad_completions', (select count(*) from public.ad_completions where completed_at::date=current_date),
    'pending_support_tickets', (select count(*) from public.support_tickets where status in ('open','in_progress')),
    'risk_alerts', (select count(*) from public.fraud_flags where status='open'),
    'advertiser_revenue', (select coalesce(sum(amount),0) from public.advertiser_revenue where status='verified'),
    'total_recovery_fund_collected',
      (select coalesce(sum(amount_pkr),0) from public.recovery_fund_ledger where entry_type='credit' and user_id is null),
    'total_recovery_fund_used',
      (select coalesce(sum(amount_pkr),0) from public.recovery_fund_ledger where entry_type='debit' and user_id is null),
    'remaining_recovery_fund',
      (select coalesce(sum(case when entry_type='credit' then amount_pkr when entry_type='debit' then -amount_pkr when entry_type='reversal' then amount_pkr else 0 end),0)
       from public.recovery_fund_ledger where user_id is null),
    'total_ad_budget_recovered', (select coalesce(sum(amount_pkr),0) from public.ad_budget_recoveries where status='completed')
  ) into result;
  return result;
end;
$function$;

create or replace function public.admin_reserve_summary()
returns table(
  plan_name text,
  total_users bigint,
  total_original_reserve numeric,
  total_reserve_used numeric,
  total_reserve_remaining numeric,
  total_rewards_issued numeric
)
language sql
set search_path to 'public'
as $function$
  with active as (
    select up.*,
      coalesce(up.original_reward_reserve_pkr, up.reward_budget_pkr, 0) as plan_allocated,
      coalesce(up.referral_reward_allocated_pkr, 0) as referral_allocated,
      coalesce(up.remaining_reward_budget_pkr, 0) as plan_remaining
    from public.user_plans up
    where up.status='active'
  ),
  rewards as (
    select user_plan_id, sum(amount_pkr) filter(where reward_type='ad_reward' and status='completed') as total
    from public.reward_transactions
    group by user_plan_id
  ),
  grouped as (
    select a.plan_name_snapshot as plan_name,
      count(*)::bigint as total_users,
      sum(a.plan_allocated + a.referral_allocated) as allocated,
      sum(a.plan_remaining) as plan_remaining,
      coalesce(sum(r.total),0) as rewards_issued
    from active a
    left join rewards r on r.user_plan_id=a.id
    group by a.plan_name_snapshot
  ),
  latest_active_plan_per_user as (
    select distinct on (user_id) user_id, plan_name_snapshot
    from active
    order by user_id, purchased_at desc nulls last, created_at desc
  ),
  reserve_by_plan as (
    select a.plan_name_snapshot as plan_name,
      sum(coalesce(p.recovery_reserve_pkr,0)) as referral_remaining
    from latest_active_plan_per_user a
    join public.profiles p on p.id=a.user_id
    group by a.plan_name_snapshot
  )
  select g.plan_name,
    g.total_users,
    g.allocated,
    greatest(g.allocated - (g.plan_remaining + coalesce(r.referral_remaining,0)),0),
    g.plan_remaining + coalesce(r.referral_remaining,0),
    g.rewards_issued
  from grouped g
  left join reserve_by_plan r on r.plan_name=g.plan_name
  order by g.plan_name;
$function$;

-- Expose aggregate-only homepage metrics without granting public access to member or wallet rows.
create or replace function public.get_public_homepage_stats()
returns table (
  members bigint,
  rewards_paid numeric,
  average_withdrawal_hours numeric
)
language sql
stable
security definer
set search_path = public
as $$
  select
    (select count(*)::bigint from public.profiles) as members,
    (
      select coalesce(sum(wt.amount), 0)::numeric
      from public.wallet_transactions wt
      where wt.type in ('TASK_REWARD', 'REFERRAL_REWARD', 'REFERRAL_COMMISSION')
        and wt.status = 'completed'
    ) as rewards_paid,
    (
      select avg(extract(epoch from (w.reviewed_at - w.requested_at)) / 3600.0)::numeric
      from public.withdrawals w
      where w.status in ('paid', 'approved')
        and w.requested_at is not null
        and w.reviewed_at is not null
        and w.reviewed_at >= w.requested_at
    ) as average_withdrawal_hours;
$$;

revoke all on function public.get_public_homepage_stats() from public;
grant execute on function public.get_public_homepage_stats() to anon, authenticated;

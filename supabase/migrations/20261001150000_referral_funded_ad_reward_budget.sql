-- Referral-funded ad reward budget
-- Keeps referral-generated reward funding distinct from the original plan reserve
-- while making it part of the user's spendable ad-reward capacity.

alter table public.user_plans
  add column if not exists referral_reward_allocated_pkr numeric not null default 0;

-- Backfill cumulative referral-funded allocations from the existing authoritative
-- referrer-credit ledger. This does not change the spendable recovery reserve.
update public.user_plans up
set referral_reward_allocated_pkr = coalesce(x.total_referral, 0),
    updated_at = now()
from (
  select user_id, sum(amount_pkr) as total_referral
  from public.recovery_fund_ledger
  where entry_type = 'referrer_credit'
    and user_id is not null
  group by user_id
) x
where up.user_id = x.user_id
  and up.status = 'active';

create or replace function public.initialize_referral_reward_allocation()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_alloc numeric;
begin
  if new.user_id is not null
     and coalesce(new.referral_reward_allocated_pkr, 0) = 0 then
    select coalesce(sum(r.amount_pkr), 0)
      into v_alloc
      from public.recovery_fund_ledger r
     where r.user_id = new.user_id
       and r.entry_type = 'referrer_credit';

    new.referral_reward_allocated_pkr := v_alloc;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_initialize_referral_reward_allocation
  on public.user_plans;

create trigger trg_initialize_referral_reward_allocation
before insert on public.user_plans
for each row
execute function public.initialize_referral_reward_allocation();

create or replace function public.sync_referral_reward_allocation()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  if new.entry_type = 'referrer_credit'
     and new.user_id is not null
     and new.amount_pkr > 0 then
    update public.user_plans
       set referral_reward_allocated_pkr =
             coalesce(referral_reward_allocated_pkr, 0) + new.amount_pkr,
           updated_at = now()
     where user_id = new.user_id
       and status = 'active';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_sync_referral_reward_allocation
  on public.recovery_fund_ledger;

create trigger trg_sync_referral_reward_allocation
after insert on public.recovery_fund_ledger
for each row
execute function public.sync_referral_reward_allocation();

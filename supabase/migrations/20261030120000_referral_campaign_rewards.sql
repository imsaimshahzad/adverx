-- AdverX referral campaign rewards
-- Separate from existing referral commission calculations.
alter table public.wallet_transactions
  drop constraint if exists wallet_transactions_type_check;
alter table public.wallet_transactions
  add constraint wallet_transactions_type_check check (
    type = any (array[
      'DEPOSIT','PLAN_ACTIVATION','PLAN_PURCHASE','TASK_REWARD','REFERRAL_REWARD',
      'REFERRAL_COMMISSION','UNASSIGNED_REFERRAL','PLATFORM_PROFIT','ADMIN_RECOVERY',
      'WITHDRAWAL','WITHDRAWAL_FEE','REFUND','REVERSAL','ADMIN_ADJUSTMENT',
      'REFERRAL_CAMPAIGN_BONUS'
    ]::text[])
  );

create table if not exists public.referral_campaign_settings (
  plan_key text primary key check (plan_key in ('starter','growth','pro')),
  is_active boolean not null default true,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id)
);

create table if not exists public.referral_campaign_milestones (
  plan_key text not null references public.referral_campaign_settings(plan_key) on delete restrict,
  referral_target integer not null check (referral_target in (3,5,10,20)),
  reward_amount_pkr numeric(12,2) not null check (reward_amount_pkr > 0),
  updated_at timestamptz not null default now(),
  primary key (plan_key, referral_target)
);

create table if not exists public.referral_campaign_cycles (
  referrer_id uuid not null references public.profiles(id) on delete cascade,
  plan_key text not null references public.referral_campaign_settings(plan_key) on delete restrict,
  cycle_started_at timestamptz not null default now(),
  primary key (referrer_id, plan_key)
);

create table if not exists public.referral_campaign_payouts (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references public.profiles(id) on delete restrict,
  plan_key text not null references public.referral_campaign_settings(plan_key) on delete restrict,
  referral_target integer not null,
  reward_amount_pkr numeric(12,2) not null check (reward_amount_pkr > 0),
  cycle_started_at timestamptz not null,
  transaction_id uuid references public.transactions(id),
  claimed_at timestamptz not null default now(),
  constraint referral_campaign_payout_milestone_fk
    foreign key (plan_key, referral_target)
    references public.referral_campaign_milestones(plan_key, referral_target)
);

create index if not exists referral_campaign_payouts_referrer_date_idx
  on public.referral_campaign_payouts(referrer_id, claimed_at desc);
create index if not exists referral_campaign_cycles_referrer_idx
  on public.referral_campaign_cycles(referrer_id);

insert into public.referral_campaign_settings(plan_key,is_active)
values ('starter',true),('growth',true),('pro',true)
on conflict (plan_key) do nothing;

insert into public.referral_campaign_milestones(plan_key,referral_target,reward_amount_pkr)
values
 ('starter',3,30),('starter',5,50),('starter',10,100),('starter',20,250),
 ('growth',3,60),('growth',5,100),('growth',10,200),('growth',20,450),
 ('pro',3,90),('pro',5,150),('pro',10,300),('pro',20,750)
on conflict (plan_key,referral_target) do nothing;

alter table public.referral_campaign_settings enable row level security;
alter table public.referral_campaign_milestones enable row level security;
alter table public.referral_campaign_cycles enable row level security;
alter table public.referral_campaign_payouts enable row level security;

create or replace function public.get_referral_campaign_rewards()
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_user uuid := auth.uid();
  v_month_start timestamptz :=
    date_trunc('month', now() at time zone 'Asia/Karachi') at time zone 'Asia/Karachi';
  v_campaigns jsonb;
  v_history jsonb;
begin
  if v_user is null then
    raise exception 'authentication required' using errcode='42501';
  end if;

  insert into public.referral_campaign_cycles(referrer_id,plan_key)
  select v_user, s.plan_key from public.referral_campaign_settings s
  on conflict (referrer_id,plan_key) do nothing;

  with campaign_progress as (
    select
      s.plan_key,
      s.is_active,
      greatest(v_month_start,c.cycle_started_at) as cycle_started_at,
      count(distinct r.referred_id) filter (where latest.active_plan_key=s.plan_key and latest.purchased_at >= greatest(v_month_start,c.cycle_started_at))::integer as progress
    from public.referral_campaign_settings s
    join public.referral_campaign_cycles c
      on c.referrer_id=v_user and c.plan_key=s.plan_key
    left join public.referrals r
      on r.referrer_id=v_user and r.level=1
    left join lateral (
      select lower(coalesce(up.plan_name_snapshot,p.name)) as active_plan_key,
             up.purchased_at
      from public.user_plans up
      left join public.plans p on p.id=up.plan_id
      where up.user_id=r.referred_id and up.status='active'
      order by up.purchased_at desc, up.created_at desc
      limit 1
    ) latest on true
    group by s.plan_key,s.is_active,c.cycle_started_at
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'plan_key',cp.plan_key,
    'is_active',cp.is_active,
    'progress',cp.progress,
    'cycle_started_at',cp.cycle_started_at,
    'milestones',(
      select coalesce(jsonb_agg(jsonb_build_object(
        'target',m.referral_target,
        'reward_amount_pkr',m.reward_amount_pkr,
        'claimed',exists(
          select 1 from public.referral_campaign_payouts p
          where p.referrer_id=v_user and p.plan_key=cp.plan_key
            and p.referral_target=m.referral_target
            and p.cycle_started_at=cp.cycle_started_at
        ),
        'claimable',cp.is_active and cp.progress >= m.referral_target
          and not exists(
            select 1 from public.referral_campaign_payouts p
            where p.referrer_id=v_user and p.plan_key=cp.plan_key
              and p.referral_target=m.referral_target
              and p.cycle_started_at=cp.cycle_started_at
          )
      ) order by m.referral_target), '[]'::jsonb)
      from public.referral_campaign_milestones m where m.plan_key=cp.plan_key
    )
  ) order by case cp.plan_key when 'starter' then 1 when 'growth' then 2 else 3 end), '[]'::jsonb)
  into v_campaigns
  from campaign_progress cp;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id',p.id,'plan_key',p.plan_key,'referral_target',p.referral_target,
    'reward_amount_pkr',p.reward_amount_pkr,'claimed_at',p.claimed_at
  ) order by p.claimed_at desc), '[]'::jsonb)
  into v_history
  from public.referral_campaign_payouts p
  where p.referrer_id=v_user;

  return jsonb_build_object('campaigns',v_campaigns,'history',v_history);
end;
$$;

create or replace function public.claim_referral_campaign_reward(p_plan_key text,p_referral_target integer)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_user uuid := auth.uid();
  v_admin uuid;
  v_cycle timestamptz;
  v_month_start timestamptz :=
    date_trunc('month', now() at time zone 'Asia/Karachi') at time zone 'Asia/Karachi';
  v_progress integer;
  v_reward numeric(12,2);
  v_balance numeric(14,2);
  v_payout uuid := gen_random_uuid();
  v_tx uuid := gen_random_uuid();
  v_tx_no text := 'TXN-' || lpad(nextval('public.transaction_no_seq')::text,8,'0');
begin
  if v_user is null then
    raise exception 'authentication required' using errcode='42501';
  end if;
  if p_plan_key not in ('starter','growth','pro') or p_referral_target not in (3,5,10,20) then
    raise exception 'invalid campaign milestone';
  end if;

  insert into public.referral_campaign_cycles(referrer_id,plan_key)
  values(v_user,p_plan_key) on conflict do nothing;

  select c.cycle_started_at into v_cycle
  from public.referral_campaign_cycles c
  where c.referrer_id=v_user and c.plan_key=p_plan_key
  for update;

  v_cycle := greatest(v_month_start,v_cycle);

  if not exists(select 1 from public.referral_campaign_settings s where s.plan_key=p_plan_key and s.is_active) then
    raise exception 'this campaign is currently paused';
  end if;

  select m.reward_amount_pkr into v_reward
  from public.referral_campaign_milestones m
  where m.plan_key=p_plan_key and m.referral_target=p_referral_target;
  if v_reward is null then raise exception 'milestone not found'; end if;

  select count(distinct r.referred_id)::integer into v_progress
  from public.referrals r
  join lateral (
    select lower(coalesce(up.plan_name_snapshot,p.name)) as active_plan_key, up.purchased_at
    from public.user_plans up
    left join public.plans p on p.id=up.plan_id
    where up.user_id=r.referred_id and up.status='active'
    order by up.purchased_at desc,up.created_at desc limit 1
  ) latest on true
  where r.referrer_id=v_user and r.level=1
    and latest.active_plan_key=p_plan_key
    and latest.purchased_at >= v_cycle;

  if v_progress < p_referral_target then raise exception 'milestone is not complete yet'; end if;
  if exists(
    select 1 from public.referral_campaign_payouts p
    where p.referrer_id=v_user and p.plan_key=p_plan_key
      and p.referral_target=p_referral_target and p.cycle_started_at=v_cycle
  ) then raise exception 'this milestone has already been claimed'; end if;

  -- Lock the canonical Admin profile so concurrent claims cannot spend the same balance.
  select id into v_admin from public.profiles
  where role='admin' order by created_at asc limit 1
  for update;
  if v_admin is null then raise exception 'Admin balance account is unavailable'; end if;

  select coalesce(sum(le.amount),0) into v_balance
  from public.ledger_entries le
  where le.user_id=v_admin
    and le.entry_type in (
      'platform_admin_profit','platform_profit','unassigned_referral',
      'referral_commission','referral_commission_adjustment',
      'referral_commission_reversal','referral_commission_reserve_adjustment',
      'admin_recovery','admin_adjustment','withdrawal','withdrawal_refund'
    )
    and not (le.entry_type='admin_recovery' and coalesce(le.note,'') ilike 'Historical recovery allocation migrated from Admin Recovery Reserve%')
    and not (le.entry_type='unassigned_referral' and coalesce(le.note,'') ilike '%Ahmad31 purchase%')
    and not (le.entry_type='referral_commission' and coalesce(le.note,'') ilike 'Indirect referral pool%'
      and not exists (
        select 1 from public.referral_commissions rc
        where rc.user_id=v_admin and rc.purchase_id=le.reference_id and rc.level>1
          and rc.status='completed' and rc.reversal_of is null
          and not exists(select 1 from public.referral_commissions rv where rv.reversal_of=rc.id)
      ));

  if v_balance < v_reward then
    raise exception 'Insufficient Admin balance. Please try again later.';
  end if;

  insert into public.referral_campaign_payouts(
    id,referrer_id,plan_key,referral_target,reward_amount_pkr,cycle_started_at
  ) values(v_payout,v_user,p_plan_key,p_referral_target,v_reward,v_cycle);

  insert into public.transactions(
    id,transaction_no,user_id,kind,amount,currency,status,source_type,source_id,description,metadata,processed_at
  ) values(
    v_tx,v_tx_no,v_user,'REFERRAL_CAMPAIGN_BONUS',v_reward,'PKR','completed',
    'referral_campaign_bonus',v_payout,
    'Referral campaign bonus · '||initcap(p_plan_key)||' · '||p_referral_target||' referrals',
    jsonb_build_object('plan_key',p_plan_key,'referral_target',p_referral_target,'admin_user_id',v_admin),
    now()
  );

  update public.referral_campaign_payouts set transaction_id=v_tx where id=v_payout;

  insert into public.ledger_entries(user_id,entry_type,amount,reference_id,note,transaction_id)
  values
    (v_admin,'admin_adjustment',-v_reward,v_payout,
      'Referral campaign bonus paid to user '||v_user::text||' ('||p_plan_key||' / '||p_referral_target||')',v_tx),
    (v_user,'admin_adjustment',v_reward,v_payout,
      'Referral campaign bonus · '||initcap(p_plan_key)||' · '||p_referral_target||' referrals',v_tx);

  insert into public.wallet_transactions(
    user_id,type,amount,currency,status,reference_id,reference_type,metadata,transaction_id
  ) values
    (v_admin,'REFERRAL_CAMPAIGN_BONUS',-v_reward,'PKR','completed',v_payout,'referral_campaign_bonus',
      jsonb_build_object('direction','debit','beneficiary_id',v_user,'plan_key',p_plan_key,'referral_target',p_referral_target),v_tx),
    (v_user,'REFERRAL_CAMPAIGN_BONUS',v_reward,'PKR','completed',v_payout,'referral_campaign_bonus',
      jsonb_build_object('direction','credit','plan_key',p_plan_key,'referral_target',p_referral_target),v_tx);

  -- Claiming a milestone starts a fresh cycle for this plan campaign only.
  update public.referral_campaign_cycles
  set cycle_started_at=now()
  where referrer_id=v_user and plan_key=p_plan_key;

  return jsonb_build_object(
    'success',true,'payout_id',v_payout,'transaction_id',v_tx,
    'reward_amount_pkr',v_reward,'admin_balance_after',v_balance-v_reward
  );
end;
$$;

create or replace function public.admin_referral_campaign_overview()
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_admin uuid;
  v_balance numeric(14,2);
  v_paid numeric(14,2);
  v_recent jsonb;
  v_settings jsonb;
begin
  if not public.is_admin() then raise exception 'not authorized' using errcode='42501'; end if;
  select id into v_admin from public.profiles where role='admin' order by created_at asc limit 1 for update;
  select coalesce(sum(le.amount),0) into v_balance
  from public.ledger_entries le
  where le.user_id=v_admin
    and le.entry_type in ('platform_admin_profit','platform_profit','unassigned_referral','referral_commission',
      'referral_commission_adjustment','referral_commission_reversal','referral_commission_reserve_adjustment',
      'admin_recovery','admin_adjustment','withdrawal','withdrawal_refund')
    and not (le.entry_type='admin_recovery' and coalesce(le.note,'') ilike 'Historical recovery allocation migrated from Admin Recovery Reserve%')
    and not (le.entry_type='unassigned_referral' and coalesce(le.note,'') ilike '%Ahmad31 purchase%')
    and not (le.entry_type='referral_commission' and coalesce(le.note,'') ilike 'Indirect referral pool%'
      and not exists(select 1 from public.referral_commissions rc where rc.user_id=v_admin and rc.purchase_id=le.reference_id
        and rc.level>1 and rc.status='completed' and rc.reversal_of is null
        and not exists(select 1 from public.referral_commissions rv where rv.reversal_of=rc.id)));
  select coalesce(sum(reward_amount_pkr),0) into v_paid from public.referral_campaign_payouts;
  select coalesce(jsonb_agg(to_jsonb(s)||jsonb_build_object('milestones',(
    select coalesce(jsonb_agg(to_jsonb(m) order by m.referral_target),'[]'::jsonb)
    from public.referral_campaign_milestones m where m.plan_key=s.plan_key
  )) order by case s.plan_key when 'starter' then 1 when 'growth' then 2 else 3 end),'[]'::jsonb)
  into v_settings from public.referral_campaign_settings s;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',p.id,'referrer_id',p.referrer_id,'referrer_name',pr.full_name,
    'public_uid',pr.public_uid,'plan_key',p.plan_key,'referral_target',p.referral_target,
    'reward_amount_pkr',p.reward_amount_pkr,'claimed_at',p.claimed_at
  ) order by p.claimed_at desc),'[]'::jsonb)
  into v_recent
  from (select * from public.referral_campaign_payouts order by claimed_at desc limit 100) p
  left join public.profiles pr on pr.id=p.referrer_id;
  return jsonb_build_object('admin_balance',v_balance,'total_bonus_paid',v_paid,
    'settings',v_settings,'recent_payouts',v_recent);
end;
$$;

create or replace function public.admin_update_referral_campaign_milestone(
  p_plan_key text,p_referral_target integer,p_reward_amount_pkr numeric,p_is_active boolean
) returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if not public.is_admin() then raise exception 'not authorized' using errcode='42501'; end if;
  if p_plan_key not in ('starter','growth','pro') or p_referral_target not in (3,5,10,20)
     or p_reward_amount_pkr <= 0 or p_reward_amount_pkr > 10000 then
    raise exception 'invalid campaign configuration';
  end if;
  update public.referral_campaign_milestones
  set reward_amount_pkr=p_reward_amount_pkr,updated_at=now()
  where plan_key=p_plan_key and referral_target=p_referral_target;
  update public.referral_campaign_settings
  set is_active=p_is_active,updated_at=now(),updated_by=auth.uid()
  where plan_key=p_plan_key;
end;
$$;

revoke all on function public.get_referral_campaign_rewards() from public;
revoke all on function public.claim_referral_campaign_reward(text,integer) from public;
revoke all on function public.admin_referral_campaign_overview() from public;
revoke all on function public.admin_update_referral_campaign_milestone(text,integer,numeric,boolean) from public;
grant execute on function public.get_referral_campaign_rewards() to authenticated;
grant execute on function public.claim_referral_campaign_reward(text,integer) to authenticated;
grant execute on function public.admin_referral_campaign_overview() to authenticated;
grant execute on function public.admin_update_referral_campaign_milestone(text,integer,numeric,boolean) to authenticated;

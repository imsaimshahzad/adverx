CREATE OR REPLACE FUNCTION public.claim_referral_campaign_reward(p_plan_key text, p_referral_target integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog', 'public'
AS $function$
declare
  v_user uuid := auth.uid();
  v_cycle timestamptz;
  v_month_start timestamptz := date_trunc('month', now() at time zone 'Asia/Karachi') at time zone 'Asia/Karachi';
  v_progress integer;
  v_reward numeric(12,2);
  v_payout uuid := gen_random_uuid();
  v_tx uuid := gen_random_uuid();
  v_tx_no text := 'TXN-' || lpad(nextval('public.transaction_no_seq')::text,8,'0');
begin
  if v_user is null then raise exception 'authentication required' using errcode='42501'; end if;
  if p_plan_key not in ('starter','growth','pro') or p_referral_target not in (3,5,10,20) then raise exception 'invalid campaign milestone'; end if;

  insert into public.referral_campaign_cycles(referrer_id,plan_key) values(v_user,p_plan_key) on conflict do nothing;
  select c.cycle_started_at into v_cycle from public.referral_campaign_cycles c where c.referrer_id=v_user and c.plan_key=p_plan_key for update;
  v_cycle := greatest(v_month_start,v_cycle);

  if not exists(select 1 from public.referral_campaign_settings s where s.plan_key=p_plan_key and s.is_active) then raise exception 'this campaign is currently paused'; end if;
  select m.reward_amount_pkr into v_reward from public.referral_campaign_milestones m where m.plan_key=p_plan_key and m.referral_target=p_referral_target;
  if v_reward is null then raise exception 'milestone not found'; end if;

  select count(distinct r.referred_id)::integer into v_progress
  from public.referrals r
  join lateral (
    select lower(coalesce(up.plan_name_snapshot,p.name)) as active_plan_key, up.purchased_at
    from public.user_plans up left join public.plans p on p.id=up.plan_id
    where up.user_id=r.referred_id and up.status='active'
    order by up.purchased_at desc,up.created_at desc limit 1
  ) latest on true
  where r.referrer_id=v_user and r.level=1 and latest.active_plan_key=p_plan_key and latest.purchased_at >= v_cycle;

  if v_progress < p_referral_target then raise exception 'milestone is not complete yet'; end if;
  if exists(select 1 from public.referral_campaign_payouts p where p.referrer_id=v_user and p.plan_key=p_plan_key and p.referral_target=p_referral_target and p.cycle_started_at=v_cycle) then raise exception 'this milestone has already been claimed'; end if;

  insert into public.referral_campaign_payouts(id,referrer_id,plan_key,referral_target,reward_amount_pkr,cycle_started_at)
  values(v_payout,v_user,p_plan_key,p_referral_target,v_reward,v_cycle);

  insert into public.transactions(id,transaction_no,user_id,kind,amount,currency,status,source_type,source_id,description,metadata,processed_at)
  values(v_tx,v_tx_no,v_user,'REFERRAL_CAMPAIGN_BONUS',v_reward,'PKR','completed','referral_campaign_bonus',v_payout,
    'Referral campaign bonus · '||initcap(p_plan_key)||' · '||p_referral_target||' referrals',
    jsonb_build_object('plan_key',p_plan_key,'referral_target',p_referral_target),now());

  update public.referral_campaign_payouts set transaction_id=v_tx where id=v_payout;

  insert into public.ledger_entries(user_id,entry_type,amount,reference_id,note,transaction_id)
  values(v_user,'admin_adjustment',v_reward,v_payout,
    'Referral campaign bonus · '||initcap(p_plan_key)||' · '||p_referral_target||' referrals',v_tx);

  insert into public.wallet_transactions(user_id,type,amount,currency,status,reference_id,reference_type,metadata,transaction_id)
  values(v_user,'REFERRAL_CAMPAIGN_BONUS',v_reward,'PKR','completed',v_payout,'referral_campaign_bonus',
    jsonb_build_object('direction','credit','plan_key',p_plan_key,'referral_target',p_referral_target),v_tx);

  update public.referral_campaign_cycles set cycle_started_at=now() where referrer_id=v_user and plan_key=p_plan_key;

  return jsonb_build_object('success',true,'payout_id',v_payout,'transaction_id',v_tx,'reward_amount_pkr',v_reward);
end;
$function$;

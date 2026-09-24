-- Harden ad-view session handling:
-- * abandon stale sessions after 10 minutes
-- * allow only one active session per user/plan
-- * rate-limit repeated starts to 10 seconds
-- * preserve the existing plan daily completion limit

create or replace function public.start_ad_view(p_ad_id uuid)
returns uuid
language plpgsql
security definer
set search_path to 'public'
set "TimeZone" to 'Asia/Karachi'
as $function$
declare
  v_user uuid := auth.uid();
  v_plan public.user_plans;
  v_ad public.ads;
  v_session uuid;
  v_count integer;
  v_active_count integer;
begin
  if v_user is null then
    raise exception 'not authenticated';
  end if;

  select * into v_plan
  from public.user_plans
  where user_id = v_user
    and status = 'active'
    and (
      lifetime_access = true
      or (
        lifetime_access = false
        and expires_at is not null
        and expires_at > now()
      )
    )
  order by purchased_at desc
  limit 1
  for update;

  if not found then
    raise exception 'No active plan';
  end if;

  -- Automatically abandon old sessions so they cannot remain active forever.
  -- completed_at stays NULL because this is not a successful completion.
  update public.ad_view_sessions
  set status = 'rejected',
      completed_at = null,
      reward_amount_pkr = 0
  where user_id = v_user
    and user_plan_id = v_plan.id
    and status = 'started'
    and started_at < now() - interval '10 minutes';

  -- Prevent multiple concurrent ad sessions for the same user/plan.
  select count(*) into v_active_count
  from public.ad_view_sessions
  where user_id = v_user
    and user_plan_id = v_plan.id
    and status = 'started';

  if v_active_count > 0 then
    raise exception 'An ad session is already active. Finish it before starting another ad.';
  end if;

  -- Prevent rapid repeated starts/spam.
  if exists (
    select 1
    from public.ad_view_sessions
    where user_id = v_user
      and user_plan_id = v_plan.id
      and started_at > now() - interval '10 seconds'
  ) then
    raise exception 'Please wait a few seconds before starting another ad.';
  end if;

  select * into v_ad
  from public.ads
  where id = p_ad_id
    and status = 'active';

  if not found then
    raise exception 'Ad unavailable';
  end if;

  if exists (
    select 1
    from public.ad_view_sessions
    where user_id = v_user
      and user_plan_id = v_plan.id
      and ad_id = p_ad_id
      and status = 'completed'
      and completed_at::date = current_date
  ) then
    raise exception 'Ad already completed today';
  end if;

  select count(*) into v_count
  from public.ad_view_sessions
  where user_id = v_user
    and user_plan_id = v_plan.id
    and status = 'completed'
    and completed_at::date = current_date;

  if v_count >= coalesce(v_plan.ads_per_day, 0) then
    raise exception 'Daily ad limit reached';
  end if;

  insert into public.ad_view_sessions(
    user_id,
    user_plan_id,
    ad_id,
    started_at,
    status
  )
  values (
    v_user,
    v_plan.id,
    p_ad_id,
    now(),
    'started'
  )
  returning id into v_session;

  return v_session;
end;
$function$;

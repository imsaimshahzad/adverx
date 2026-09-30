-- Server-authoritative ad load timestamps and claim validation.
-- The live database was updated with this SQL before this migration file was committed.

alter table public.ad_view_sessions
  add column if not exists loaded_at timestamptz;

create index if not exists ad_view_sessions_started_status_idx
  on public.ad_view_sessions (user_id, user_plan_id, status, started_at);

create or replace function public.mark_ad_view_loaded(p_session_id uuid)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user uuid := auth.uid();
  v_loaded_at timestamptz;
begin
  if v_user is null then
    raise exception 'not authenticated';
  end if;

  update public.ad_view_sessions
  set loaded_at = coalesce(loaded_at, now())
  where id = p_session_id
    and user_id = v_user
    and status = 'started'
    and started_at >= now() - interval '15 minutes'
  returning loaded_at into v_loaded_at;

  if v_loaded_at is null then
    raise exception 'Ad session not found or expired';
  end if;

  return v_loaded_at;
end;
$function$;

revoke execute on function public.mark_ad_view_loaded(uuid) from anon, public;
grant execute on function public.mark_ad_view_loaded(uuid) to authenticated;

create or replace function public.claim_ad_view(p_session_id uuid, p_idempotency_key text)
returns numeric
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user uuid := auth.uid();
  v_loaded_at timestamptz;
  v_started_at timestamptz;
  v_duration integer;
  v_status text;
  v_existing_reward numeric;
begin
  if v_user is null then
    raise exception 'not authenticated';
  end if;

  if length(coalesce(trim(p_idempotency_key), '')) < 8 then
    raise exception 'invalid idempotency key';
  end if;

  select amount_pkr
    into v_existing_reward
  from public.reward_transactions
  where idempotency_key = p_idempotency_key
    and user_id = v_user;

  if found then
    return v_existing_reward;
  end if;

  select s.status, s.started_at, s.loaded_at, a.duration_seconds
    into v_status, v_started_at, v_loaded_at, v_duration
  from public.ad_view_sessions s
  join public.ads a on a.id = s.ad_id
  where s.id = p_session_id
    and s.user_id = v_user
    and a.status = 'active'
  for update;

  if not found then
    raise exception 'Ad session not found';
  end if;

  if v_status <> 'started' then
    raise exception 'Ad session already claimed';
  end if;

  if v_loaded_at is null then
    raise exception 'Ad has not reported as loaded';
  end if;

  if now() - v_started_at > interval '15 minutes' then
    raise exception 'Ad session expired';
  end if;

  if extract(epoch from now() - v_loaded_at) < greatest(coalesce(v_duration, 0), 0) + 1.5 then
    raise exception 'Ad engagement time is incomplete';
  end if;

  return public.complete_ad_view(
    p_session_id,
    p_idempotency_key
  );
end;
$function$;

revoke execute on function public.claim_ad_view(uuid, text) from anon, public;
grant execute on function public.claim_ad_view(uuid, text) to authenticated;

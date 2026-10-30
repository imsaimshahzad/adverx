-- Referral Nudge & Earning Continuity: 30-day transition and reserve-aware ad eligibility.
-- Reserve amounts remain private; members receive only a status and grace-period metadata.

create table if not exists public.earning_continuity_settings (
  id boolean primary key default true check (id = true),
  enforcement_starts_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.earning_continuity_settings enable row level security;
revoke all on table public.earning_continuity_settings from public, anon, authenticated;

insert into public.earning_continuity_settings (id, enforcement_starts_at)
values (true, now() + interval '30 days')
on conflict (id) do nothing;

create or replace function public.get_my_earning_continuity()
returns jsonb
language plpgsql
stable
security definer
set search_path to 'pg_catalog', 'public'
as $function$
declare
  v_user uuid := auth.uid();
  v_role text;
  v_plan record;
  v_allocated numeric := 0;
  v_remaining numeric := 0;
  v_percent numeric;
  v_status text := 'no_plan';
  v_enforcement_at timestamptz;
  v_paused boolean := false;
begin
  if v_user is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  select role into v_role from public.profiles where id = v_user;
  if v_role in ('admin', 'super_admin', 'moderator') then
    return jsonb_build_object(
      'reserve_status', 'normal',
      'earning_paused', false,
      'has_active_plan', true,
      'grace_until', null,
      'grace_days_remaining', 0
    );
  end if;

  select
    coalesce(up.original_reward_reserve_pkr, up.reward_budget_pkr, 0)
      + coalesce(up.referral_reward_allocated_pkr, 0) as allocated,
    coalesce(up.remaining_reward_budget_pkr, 0)
      + coalesce(pr.recovery_reserve_pkr, 0) as remaining
  into v_plan
  from public.user_plans up
  join public.profiles pr on pr.id = up.user_id
  where up.user_id = v_user
    and up.status = 'active'
    and (
      up.lifetime_access = true
      or (up.lifetime_access = false and up.expires_at is not null and up.expires_at > now())
    )
  order by up.purchased_at desc, up.created_at desc
  limit 1;

  select enforcement_starts_at into v_enforcement_at
  from public.earning_continuity_settings
  where id = true;

  if found and v_plan is not null then
    v_allocated := greatest(coalesce(v_plan.allocated, 0), 0);
    v_remaining := greatest(coalesce(v_plan.remaining, 0), 0);

    if v_remaining <= 0 then
      v_status := 'exhausted';
    else
      v_percent := case when v_allocated > 0 then (v_remaining / v_allocated) * 100 else null end;
      v_status := case
        when v_percent is null then 'normal'
        when v_percent < 20 then 'low'
        when v_percent <= 50 then 'medium'
        else 'normal'
      end;
    end if;

    v_paused := v_remaining <= 0 and v_enforcement_at is not null and now() >= v_enforcement_at;
  elsif v_plan is not null then
    v_status := case when coalesce(v_plan.remaining, 0) <= 0 then 'exhausted' else 'normal' end;
  end if;

  return jsonb_build_object(
    'reserve_status', v_status,
    'earning_paused', v_paused,
    'has_active_plan', v_plan is not null,
    'grace_until', v_enforcement_at,
    'grace_days_remaining', case
      when v_enforcement_at is null then null
      else greatest(0, ceil(extract(epoch from (v_enforcement_at - now())) / 86400))::integer
    end
  );
end;
$function$;

revoke all on function public.get_my_earning_continuity() from public, anon;
grant execute on function public.get_my_earning_continuity() to authenticated;

do $migration$
declare
  v_definition text;
  v_old text;
  v_new text;
begin
  v_definition := pg_get_functiondef('public.start_ad_view(uuid)'::regprocedure);
  v_old := 'if not found then raise exception ''No active plan''; end if;';
  v_new := v_old || E'\n\n  if not exists (select 1 from public.profiles where id = v_user and role in (''admin'', ''super_admin'', ''moderator''))\n     and coalesce((public.get_my_earning_continuity()->>''earning_paused'')::boolean, false) then\n    raise exception ''Ad rewards are paused because your earning reserve is exhausted. Refer an eligible new user to restore your reserve.'';\n  end if;';
  if position(v_old in v_definition) = 0 then
    raise exception 'Could not safely locate active-plan check in start_ad_view';
  end if;
  execute replace(v_definition, v_old, v_new);

  v_definition := pg_get_functiondef('public.complete_ad_view(uuid,text)'::regprocedure);
  v_old := 'if not found then raise exception ''User profile not found''; end if;';
  v_new := v_old || E'\n\n  if coalesce((public.get_my_earning_continuity()->>''earning_paused'')::boolean, false) then\n    raise exception ''Ad rewards are paused because your earning reserve is exhausted. Refer an eligible new user to restore your reserve.'';\n  end if;';
  if position(v_old in v_definition) = 0 then
    raise exception 'Could not safely locate profile check in complete_ad_view';
  end if;
  execute replace(v_definition, v_old, v_new);
end;
$migration$;

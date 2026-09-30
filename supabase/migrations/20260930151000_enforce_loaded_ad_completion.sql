-- Defense-in-depth: no ad session can become completed unless the server-recorded
-- load event exists and the server-side engagement window has elapsed.

create or replace function public.enforce_ad_view_loaded_before_complete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_duration integer;
begin
  if old.status = 'started' and new.status = 'completed' then
    if new.loaded_at is null then
      raise exception 'Ad has not reported as loaded';
    end if;

    if now() - old.started_at > interval '15 minutes' then
      raise exception 'Ad session expired';
    end if;

    select duration_seconds
      into v_duration
    from public.ads
    where id = new.ad_id
      and status = 'active';

    if v_duration is null then
      raise exception 'Ad unavailable';
    end if;

    if extract(epoch from now() - new.loaded_at) < greatest(v_duration, 0) + 1.5 then
      raise exception 'Ad engagement time is incomplete';
    end if;
  end if;

  return new;
end;
$function$;

drop trigger if exists enforce_ad_view_loaded_before_complete
  on public.ad_view_sessions;

create trigger enforce_ad_view_loaded_before_complete
before update of status on public.ad_view_sessions
for each row
execute function public.enforce_ad_view_loaded_before_complete();

revoke execute on function public.enforce_ad_view_loaded_before_complete() from anon, authenticated, public;

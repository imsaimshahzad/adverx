-- Keep reserve pacing stable for plans that remain active beyond day 30.
-- Before day 30, retain the original plan-age horizon. After day 30, use a
-- rolling 30-day horizon (remaining ads today + 29 future days), rather than
-- dividing the entire reserve by only today's remaining ad slots.
do $migration$
declare
  v_definition text;
  v_updated text;
  v_old text;
  v_new text;
begin
  select pg_get_functiondef('public.complete_ad_view(uuid,text)'::regprocedure)
    into v_definition;

  v_old := 'v_remaining_slots_30d := greatest(' || E'\n' ||
    '      case' || E'\n' ||
    '        when v_plan_age_days < 30 then' || E'\n' ||
    '          ((30 - v_plan_age_days - 1) * coalesce(p.ads_per_day, 0))' || E'\n' ||
    '          + greatest(coalesce(p.ads_per_day, 0) - v_count, 0)' || E'\n' ||
    '        else' || E'\n' ||
    '          greatest(coalesce(p.ads_per_day, 0) - v_count, 0)' || E'\n' ||
    '      end,' || E'\n' ||
    '      1' || E'\n' ||
    '    );';

  v_new := 'v_remaining_slots_30d := greatest(' || E'\n' ||
    '      case' || E'\n' ||
    '        when v_plan_age_days < 30 then' || E'\n' ||
    '          ((30 - v_plan_age_days - 1) * coalesce(p.ads_per_day, 0))' || E'\n' ||
    '          + greatest(coalesce(p.ads_per_day, 0) - v_count, 0)' || E'\n' ||
    '        else' || E'\n' ||
    '          ((30 - 1) * coalesce(p.ads_per_day, 0))' || E'\n' ||
    '          + greatest(coalesce(p.ads_per_day, 0) - v_count, 0)' || E'\n' ||
    '      end,' || E'\n' ||
    '      1' || E'\n' ||
    '    );';

  if position(v_old in v_definition) = 0 then
    raise exception 'Expected remaining-slot calculation not found; no change applied';
  end if;

  v_updated := replace(v_definition, v_old, v_new);

  if v_updated = v_definition or position(v_new in v_updated) = 0 then
    raise exception 'Rolling 30-day curve replacement failed; no change applied';
  end if;

  execute v_updated;
end
$migration$;
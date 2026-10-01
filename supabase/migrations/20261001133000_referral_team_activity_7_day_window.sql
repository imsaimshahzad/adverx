-- Count a direct referral toward the permanent team boost only when the
-- referred user has completed at least one ad in the last 7 days.
-- Existing rewards are untouched; this changes only future ad completions.

do $$
declare
  v_def text;
  v_old text;
  v_new text;
begin
  select pg_get_functiondef(p.oid)
  into v_def
  from pg_proc p
  join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public'
    and p.proname='complete_ad_view'
    and pg_get_function_identity_arguments(p.oid)='p_session_id uuid, p_idempotency_key text'
  limit 1;

  if v_def is null then
    raise exception 'complete_ad_view not found';
  end if;

  v_old := '    and rc.source_user_id is not null
    and exists (
      select 1
      from public.user_plans up
      where up.user_id = rc.source_user_id
        and up.status = ''active''
    );';

  v_new := '    and rc.source_user_id is not null
    and exists (
      select 1
      from public.user_plans up
      where up.user_id = rc.source_user_id
        and up.status = ''active''
    )
    and exists (
      select 1
      from public.ad_view_sessions avs
      where avs.user_id = rc.source_user_id
        and avs.status = ''completed''
        and avs.completed_at >= now() - interval ''7 days''
    );';

  if position(v_old in v_def)=0 then
    raise exception 'Expected team referral qualification block not found';
  end if;

  v_def := replace(v_def, v_old, v_new);
  execute v_def;
end
$$;
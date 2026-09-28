-- Privileged platform accounts must never earn personal ad rewards.
-- Enforce this inside both RPCs so direct RPC calls cannot bypass the UI.
DO $guard$
DECLARE
  v_start text;
  v_complete text;
  v_old text;
  v_new text;
BEGIN
  SELECT pg_get_functiondef('public.start_ad_view(uuid)'::regprocedure) INTO v_start;
  v_old := $old$if v_user is null then raise exception 'not authenticated'; end if;$old$;
  v_new := $new$if v_user is null then raise exception 'not authenticated'; end if;

  if exists (
    select 1 from public.profiles
    where id = v_user and role in ('admin', 'super_admin', 'moderator')
  ) then
    raise exception 'Admin accounts cannot earn ad rewards';
  end if;$new$;

  IF position(v_old in v_start) = 0 THEN
    RAISE EXCEPTION 'Could not locate start_ad_view auth guard';
  END IF;
  v_start := replace(v_start, v_old, v_new);
  EXECUTE v_start;

  SELECT pg_get_functiondef('public.complete_ad_view(uuid,text)'::regprocedure) INTO v_complete;
  v_old := $old$IF v_user IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;$old$;
  v_new := $new$IF v_user IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = v_user AND role IN ('admin', 'super_admin', 'moderator')
  ) THEN
    RAISE EXCEPTION 'Admin accounts cannot earn ad rewards';
  END IF;$new$;

  IF position(v_old in v_complete) = 0 THEN
    RAISE EXCEPTION 'Could not locate complete_ad_view auth guard';
  END IF;
  v_complete := replace(v_complete, v_old, v_new);
  EXECUTE v_complete;
END
$guard$;

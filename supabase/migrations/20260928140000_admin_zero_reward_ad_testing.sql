-- Allow privileged accounts to test ad playback while forcing zero personal rewards.
-- They still consume the daily ad count and cannot create reward/ledger/reserve entries.
DO $do$
DECLARE d text; old text;
BEGIN
  d := pg_get_functiondef('public.start_ad_view(uuid)'::regprocedure);
  old := $guard$  if exists (
    select 1 from public.profiles
    where id = v_user and role in ('admin', 'super_admin', 'moderator')
  ) then
    raise exception 'Admin accounts cannot earn ad rewards';
  end if;

$guard$;
  IF position(old in d) > 0 THEN
    d := replace(d, old, '');
    EXECUTE d;
  END IF;

  d := pg_get_functiondef('public.complete_ad_view(uuid,text)'::regprocedure);
  old := $guard$  IF EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = v_user AND role IN ('admin', 'super_admin', 'moderator')
  ) THEN
    RAISE EXCEPTION 'Admin accounts cannot earn ad rewards';
  END IF;
$guard$;
  IF position(old in d) > 0 THEN
    d := replace(d, old, $new$  -- Privileged accounts may test ad playback, but never receive a reward.
$new$);
  END IF;

  old := $after$  IF s.status <> 'started' THEN RAISE EXCEPTION 'Ad session is not claimable'; END IF;
$after$;
  IF position(old in d) > 0 AND position('Testing mode: complete ad with zero reward' in d) = 0 THEN
    d := replace(d, old, old || $branch$

  -- Testing mode: complete ad with zero reward for privileged accounts.
  IF EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = v_user AND role IN ('admin', 'super_admin', 'moderator')
  ) THEN
    SELECT * INTO a FROM public.ads WHERE id = s.ad_id AND status = 'active';
    IF NOT FOUND THEN RAISE EXCEPTION 'Ad unavailable'; END IF;
    IF extract(epoch from now() - s.started_at) < a.duration_seconds THEN
      RAISE EXCEPTION 'Ad engagement time is incomplete';
    END IF;
    UPDATE public.ad_view_sessions
    SET status = 'completed', completed_at = now(), reward_amount_pkr = 0
    WHERE id = s.id AND status = 'started';
    IF NOT FOUND THEN RAISE EXCEPTION 'Ad session already completed'; END IF;
    RETURN 0;
  END IF;
$branch$);
  END IF;

  EXECUTE d;
END
$do$;

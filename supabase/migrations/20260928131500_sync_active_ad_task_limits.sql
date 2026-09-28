-- Keep active user-plan ad counts aligned with the currently configured plan limits.
-- In particular, Pro is 9 ads/day, not the stale 10-ad snapshot.
UPDATE public.user_plans up
SET ads_per_day = p.ads_per_day,
    updated_at = now()
FROM public.plans p
WHERE up.plan_id = p.id
  AND up.status = 'active'
  AND up.ads_per_day IS DISTINCT FROM p.ads_per_day;

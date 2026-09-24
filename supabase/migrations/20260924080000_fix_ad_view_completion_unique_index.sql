-- Fix the completion uniqueness rule.
-- The previous index used only (user_id, ad_id, completed_at IS NOT NULL),
-- which allowed only one completion for an ad for the user's entire lifetime.
-- It also included rejected sessions because they have a non-null completed_at.
-- The business rule is one successful completion per user/ad/day in Pakistan time.

DROP INDEX IF EXISTS public.ad_view_sessions_one_completion_idx;

CREATE UNIQUE INDEX ad_view_sessions_one_completion_idx
ON public.ad_view_sessions (
  user_id,
  ad_id,
  ((completed_at AT TIME ZONE 'Asia/Karachi')::date)
)
WHERE status = 'completed' AND completed_at IS NOT NULL;

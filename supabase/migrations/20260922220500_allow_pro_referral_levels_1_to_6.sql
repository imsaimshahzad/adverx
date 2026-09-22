-- Pro uses six referral levels. Keep the database constraint aligned
-- with admin_approve_deposit(), which writes levels 2 through 6.
ALTER TABLE public.referral_commissions
  DROP CONSTRAINT IF EXISTS referral_commissions_level_check;

ALTER TABLE public.referral_commissions
  ADD CONSTRAINT referral_commissions_level_check
  CHECK (level >= 1 AND level <= 6);

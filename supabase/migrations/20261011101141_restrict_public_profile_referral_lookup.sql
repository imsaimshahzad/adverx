-- Restrict public referral lookup to the referral-code column only.
-- Signup validation only needs to establish that a code exists.
DROP POLICY IF EXISTS profiles_public_referral_lookup ON public.profiles;
CREATE POLICY profiles_public_referral_lookup
  ON public.profiles
  FOR SELECT
  TO anon
  USING (referral_code IS NOT NULL);

REVOKE ALL PRIVILEGES ON TABLE public.profiles FROM anon;
GRANT SELECT (referral_code) ON TABLE public.profiles TO anon;

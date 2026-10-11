-- Prevent anonymous users from enumerating every profile referral code.
-- Public signup validates only the exact code supplied by the visitor.
DROP POLICY IF EXISTS profiles_public_referral_lookup ON public.profiles;
REVOKE SELECT ON TABLE public.profiles FROM anon;
REVOKE SELECT (referral_code) ON TABLE public.profiles FROM anon;

CREATE OR REPLACE FUNCTION public.validate_public_referral_code(p_code text)
RETURNS TABLE(referral_code text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
  SELECT p.referral_code::text
  FROM public.profiles AS p
  WHERE nullif(upper(trim(coalesce(p_code, ''))), '') IS NOT NULL
    AND upper(trim(p.referral_code::text)) = upper(trim(p_code))
    AND p.referral_code IS NOT NULL
  LIMIT 1;
$function$;

REVOKE ALL ON FUNCTION public.validate_public_referral_code(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.validate_public_referral_code(text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.validate_public_referral_code(text) TO anon, authenticated;

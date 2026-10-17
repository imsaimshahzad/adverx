-- Allow signed-in users to evaluate staff-only RLS policies without exposing
-- these tables to anonymous callers. The function itself checks the supplied
-- user ID against the trusted profiles role column.
GRANT EXECUTE ON FUNCTION public.is_staff(uuid) TO authenticated;

DROP POLICY IF EXISTS admin_settings_staff ON public.admin_settings;
CREATE POLICY admin_settings_staff
  ON public.admin_settings
  FOR SELECT
  TO authenticated
  USING (public.is_staff((SELECT auth.uid())));

DROP POLICY IF EXISTS fraud_flags_staff ON public.fraud_flags;
CREATE POLICY fraud_flags_staff
  ON public.fraud_flags
  FOR SELECT
  TO authenticated
  USING (public.is_staff((SELECT auth.uid())));

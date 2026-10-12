-- Fix wallet activity RLS without exposing arbitrary-user staff role probes.
CREATE OR REPLACE FUNCTION public.is_current_user_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = (SELECT auth.uid())
      AND p.role IN ('admin', 'super_admin')
  );
$function$;

REVOKE ALL ON FUNCTION public.is_current_user_staff() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_current_user_staff() TO authenticated, service_role;

DROP POLICY IF EXISTS transactions_select_own_or_staff ON public.transactions;
CREATE POLICY transactions_select_own_or_staff
  ON public.transactions
  FOR SELECT
  TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR (SELECT public.is_current_user_staff())
  );

DROP POLICY IF EXISTS transactions_insert_staff ON public.transactions;
CREATE POLICY transactions_insert_staff
  ON public.transactions
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT public.is_current_user_staff()));

DROP POLICY IF EXISTS transactions_update_staff ON public.transactions;
CREATE POLICY transactions_update_staff
  ON public.transactions
  FOR UPDATE
  TO authenticated
  USING ((SELECT public.is_current_user_staff()))
  WITH CHECK ((SELECT public.is_current_user_staff()));

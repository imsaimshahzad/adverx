-- Fix ON CONFLICT inference for referral_commissions.
-- The uniqueness rule is a partial unique index on original commissions
-- (reversal_of IS NULL), so the conflict target must include the same predicate.
DO $$
DECLARE
  ddl text;
BEGIN
  SELECT pg_get_functiondef('public.admin_approve_deposit(uuid,text,text)'::regprocedure)
  INTO ddl;

  ddl := replace(
    ddl,
    'ON CONFLICT (purchase_id,user_id,level) DO NOTHING RETURNING * INTO v_commission;',
    'ON CONFLICT (purchase_id,user_id,level) WHERE reversal_of IS NULL DO NOTHING RETURNING * INTO v_commission;'
  );

  EXECUTE ddl;
END $$;

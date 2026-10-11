-- Historical correction: reverse admin settlements from non-Pro purchases.
-- The ledger is append-only; the settlement table remains as the original audit snapshot.
-- Idempotent guard prevents duplicate reversals if this migration is replayed manually.
DO $migration$
DECLARE
  s record;
BEGIN
  FOR s IN
    SELECT ips.id, ips.purchase_id, ips.admin_user_id, ips.amount
    FROM public.indirect_pool_admin_settlements ips
    JOIN public.deposits d ON d.id = ips.purchase_id
    JOIN public.plans p ON p.id = d.plan_id
    WHERE lower(p.name) <> 'pro'
  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM public.ledger_entries le
      WHERE le.user_id = s.admin_user_id
        AND le.entry_type = 'platform_profit'
        AND le.amount = -s.amount
        AND le.note LIKE '%' || s.id::text || '%'
    ) THEN
      INSERT INTO public.ledger_entries(user_id, entry_type, amount, reference_id, note)
      VALUES (
        s.admin_user_id,
        'platform_profit',
        -s.amount,
        gen_random_uuid(),
        format(
          'Undistributed indirect referral pool settled to admin reversal: current policy permits indirect pool only for Pro; policy reversal settlement_id=%s; purchase_id=%s',
          s.id,
          s.purchase_id
        )
      );
    END IF;
  END LOOP;
END
$migration$;

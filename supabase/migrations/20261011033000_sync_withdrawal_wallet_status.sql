-- Keep wallet transaction status consistent with the canonical withdrawal request.
-- A rejected withdrawal must not remain marked completed in wallet history.
CREATE OR REPLACE FUNCTION public.sync_wallet_transaction_withdrawal_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    UPDATE public.wallet_transactions
    SET status = CASE
      WHEN NEW.status = 'paid' THEN 'completed'
      WHEN NEW.status IN ('rejected', 'cancelled') THEN CASE WHEN NEW.status = 'rejected' THEN 'failed' ELSE 'cancelled' END
      ELSE 'pending'
    END
    WHERE user_id = NEW.user_id
      AND reference_id = NEW.id
      AND upper(type) = 'WITHDRAWAL';
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS withdrawals_wallet_status_sync ON public.withdrawals;
CREATE TRIGGER withdrawals_wallet_status_sync
AFTER UPDATE OF status ON public.withdrawals
FOR EACH ROW
EXECUTE FUNCTION public.sync_wallet_transaction_withdrawal_status();

-- Repair historical wallet-history status only; financial ledger entries are untouched.
UPDATE public.wallet_transactions wt
SET status = CASE
  WHEN w.status = 'paid' THEN 'completed'
  WHEN w.status = 'rejected' THEN 'failed'
  WHEN w.status = 'cancelled' THEN 'cancelled'
  ELSE 'pending'
END
FROM public.withdrawals w
WHERE wt.user_id = w.user_id
  AND wt.reference_id = w.id
  AND upper(wt.type) = 'WITHDRAWAL'
  AND wt.status IS DISTINCT FROM CASE
    WHEN w.status = 'paid' THEN 'completed'
    WHEN w.status = 'rejected' THEN 'failed'
    WHEN w.status = 'cancelled' THEN 'cancelled'
    ELSE 'pending'
  END;

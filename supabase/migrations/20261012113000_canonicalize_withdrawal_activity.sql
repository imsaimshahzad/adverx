-- Represent each withdrawal request as one canonical wallet activity row.
-- Wallet and ledger rows remain intact for accounting; their display transaction
-- links are attached to the canonical withdrawal transaction.

CREATE OR REPLACE FUNCTION public.attach_withdrawal_activity_transaction()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_transaction_id uuid;
BEGIN
  IF TG_TABLE_NAME = 'wallet_transactions' THEN
    IF upper(coalesce(NEW.type, '')) <> 'WITHDRAWAL' THEN
      RETURN NEW;
    END IF;
  ELSIF lower(coalesce(NEW.entry_type, '')) NOT LIKE '%withdrawal%' THEN
    RETURN NEW;
  END IF;

  SELECT t.id
    INTO v_transaction_id
  FROM public.transactions t
  WHERE t.source_type = 'withdrawal'
    AND t.source_id = NEW.reference_id
    AND t.user_id = NEW.user_id
  ORDER BY t.created_at DESC
  LIMIT 1;

  IF v_transaction_id IS NOT NULL THEN
    NEW.transaction_id := v_transaction_id;
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.attach_withdrawal_activity_transaction() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS wallet_transactions_attach_withdrawal_activity ON public.wallet_transactions;
CREATE TRIGGER wallet_transactions_attach_withdrawal_activity
BEFORE INSERT OR UPDATE ON public.wallet_transactions
FOR EACH ROW
EXECUTE FUNCTION public.attach_withdrawal_activity_transaction();

DROP TRIGGER IF EXISTS ledger_entries_attach_withdrawal_activity ON public.ledger_entries;
CREATE TRIGGER ledger_entries_attach_withdrawal_activity
BEFORE INSERT OR UPDATE ON public.ledger_entries
FOR EACH ROW
EXECUTE FUNCTION public.attach_withdrawal_activity_transaction();

CREATE OR REPLACE FUNCTION public.canonicalize_withdrawal_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_transaction_id uuid;
BEGIN
  SELECT t.id
    INTO v_transaction_id
  FROM public.transactions t
  WHERE t.source_type = 'withdrawal'
    AND t.source_id = NEW.id
    AND t.user_id = NEW.user_id
  ORDER BY t.created_at DESC
  LIMIT 1;

  -- The existing withdrawal sync trigger creates/updates this canonical row.
  IF v_transaction_id IS NULL THEN
    RETURN NEW;
  END IF;

  UPDATE public.wallet_transactions wt
  SET transaction_id = v_transaction_id
  WHERE wt.user_id = NEW.user_id
    AND upper(wt.type) = 'WITHDRAWAL'
    AND wt.reference_id = NEW.id
    AND wt.transaction_id IS DISTINCT FROM v_transaction_id;

  UPDATE public.ledger_entries le
  SET transaction_id = v_transaction_id
  WHERE le.user_id = NEW.user_id
    AND le.reference_id = NEW.id
    AND lower(coalesce(le.entry_type, '')) LIKE '%withdrawal%'
    AND le.transaction_id IS DISTINCT FROM v_transaction_id;

  -- Preserve ledger rows while moving their display links off shadow rows.
  UPDATE public.ledger_entries le
  SET transaction_id = v_transaction_id
  FROM public.transactions duplicate_tx
  WHERE le.transaction_id = duplicate_tx.id
    AND duplicate_tx.source_type = 'wallet_transaction'
    AND duplicate_tx.kind = 'WITHDRAWAL'
    AND duplicate_tx.source_id IN (
      SELECT wt.id
      FROM public.wallet_transactions wt
      WHERE wt.user_id = NEW.user_id
        AND upper(wt.type) = 'WITHDRAWAL'
        AND wt.reference_id = NEW.id
    );

  DELETE FROM public.transactions duplicate_tx
  WHERE duplicate_tx.source_type = 'wallet_transaction'
    AND duplicate_tx.kind = 'WITHDRAWAL'
    AND duplicate_tx.source_id IN (
      SELECT wt.id
      FROM public.wallet_transactions wt
      WHERE wt.user_id = NEW.user_id
        AND upper(wt.type) = 'WITHDRAWAL'
        AND wt.reference_id = NEW.id
    );

  UPDATE public.ledger_entries le
  SET transaction_id = v_transaction_id
  WHERE le.user_id = NEW.user_id
    AND le.reference_id = NEW.id
    AND lower(coalesce(le.entry_type, '')) LIKE '%withdrawal%';

  DELETE FROM public.transactions shadow_tx
  WHERE shadow_tx.source_type = 'ledger_entry'
    AND shadow_tx.metadata->>'reference_id' = NEW.id::text
    AND lower(coalesce(shadow_tx.metadata->>'entry_type', '')) LIKE '%withdrawal%'
    AND NOT EXISTS (
      SELECT 1 FROM public.ledger_entries le WHERE le.transaction_id = shadow_tx.id
    );

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.canonicalize_withdrawal_activity() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS zzz_withdrawal_activity_canonicalize ON public.withdrawals;
CREATE TRIGGER zzz_withdrawal_activity_canonicalize
AFTER INSERT OR UPDATE OF status, amount, reviewed_at ON public.withdrawals
FOR EACH ROW
EXECUTE FUNCTION public.canonicalize_withdrawal_activity();

-- Backfill existing activity: one transaction row per withdrawal request.
UPDATE public.wallet_transactions wt
SET transaction_id = canonical.id
FROM public.transactions canonical
WHERE canonical.source_type = 'withdrawal'
  AND canonical.source_id = wt.reference_id
  AND canonical.user_id = wt.user_id
  AND upper(wt.type) = 'WITHDRAWAL'
  AND wt.transaction_id IS DISTINCT FROM canonical.id;

UPDATE public.ledger_entries le
SET transaction_id = canonical.id
FROM public.transactions canonical
WHERE canonical.source_type = 'withdrawal'
  AND canonical.source_id = le.reference_id
  AND canonical.user_id = le.user_id
  AND lower(coalesce(le.entry_type, '')) LIKE '%withdrawal%'
  AND le.transaction_id IS DISTINCT FROM canonical.id;

UPDATE public.ledger_entries le
SET transaction_id = canonical.id
FROM public.transactions duplicate_tx
JOIN public.wallet_transactions wt
  ON duplicate_tx.source_type = 'wallet_transaction'
 AND duplicate_tx.source_id = wt.id
JOIN public.transactions canonical
  ON canonical.source_type = 'withdrawal'
 AND canonical.source_id = wt.reference_id
 AND canonical.user_id = wt.user_id
WHERE le.transaction_id = duplicate_tx.id
  AND duplicate_tx.kind = 'WITHDRAWAL'
  AND upper(wt.type) = 'WITHDRAWAL';

DELETE FROM public.transactions duplicate_tx
USING public.wallet_transactions wt, public.transactions canonical
WHERE duplicate_tx.source_type = 'wallet_transaction'
  AND duplicate_tx.source_id = wt.id
  AND duplicate_tx.kind = 'WITHDRAWAL'
  AND upper(wt.type) = 'WITHDRAWAL'
  AND canonical.source_type = 'withdrawal'
  AND canonical.source_id = wt.reference_id
  AND canonical.user_id = wt.user_id;

UPDATE public.ledger_entries le
SET transaction_id = canonical.id
FROM public.transactions shadow_tx
JOIN public.transactions canonical
  ON canonical.source_type = 'withdrawal'
 AND canonical.source_id::text = shadow_tx.metadata->>'reference_id'
WHERE le.transaction_id = shadow_tx.id
  AND shadow_tx.source_type = 'ledger_entry'
  AND lower(coalesce(shadow_tx.metadata->>'entry_type', '')) LIKE '%withdrawal%'
  AND canonical.user_id = le.user_id;

DELETE FROM public.transactions shadow_tx
WHERE shadow_tx.source_type = 'ledger_entry'
  AND lower(coalesce(shadow_tx.metadata->>'entry_type', '')) LIKE '%withdrawal%'
  AND EXISTS (
    SELECT 1
    FROM public.transactions canonical
    WHERE canonical.source_type = 'withdrawal'
      AND canonical.source_id::text = shadow_tx.metadata->>'reference_id'
      AND canonical.user_id = shadow_tx.user_id
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.ledger_entries le WHERE le.transaction_id = shadow_tx.id
  );

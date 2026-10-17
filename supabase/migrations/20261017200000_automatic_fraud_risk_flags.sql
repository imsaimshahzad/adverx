-- Automatic, evidence-based Fraud & Risk flags.
-- These triggers only create review records. They never block accounts,
-- alter balances, reject rewards, or change financial records.

CREATE OR REPLACE FUNCTION public.record_automatic_fraud_flag(
  p_user_id uuid,
  p_flag_type text,
  p_severity text,
  p_details jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_user_id IS NULL OR p_flag_type IS NULL OR btrim(p_flag_type) = '' THEN
    RETURN;
  END IF;

  -- Keep one active flag per user and rule; resolved/false-positive cases can
  -- be flagged again if the same pattern happens later.
  IF EXISTS (
    SELECT 1
    FROM public.fraud_flags f
    WHERE f.user_id = p_user_id
      AND f.flag_type = p_flag_type
      AND f.status IN ('open', 'reviewed')
  ) THEN
    RETURN;
  END IF;

  INSERT INTO public.fraud_flags (user_id, flag_type, severity, status, details, created_at)
  VALUES (
    p_user_id,
    p_flag_type,
    CASE WHEN p_severity IN ('low', 'medium', 'high', 'critical') THEN p_severity ELSE 'medium' END,
    'open',
    COALESCE(p_details, '{}'::jsonb),
    now()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.record_automatic_fraud_flag(uuid, text, text, jsonb) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.detect_fraud_self_referral()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.referrer_id = NEW.referred_id THEN
    PERFORM public.record_automatic_fraud_flag(
      NEW.referred_id,
      'self_referral',
      'high',
      jsonb_build_object(
        'source_table', 'referrals',
        'referral_id', NEW.id,
        'reason', 'Referrer and referred account are the same user'
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.detect_fraud_fast_ad_completion()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  elapsed_seconds numeric;
BEGIN
  IF NEW.status = 'completed'
     AND NEW.user_id IS NOT NULL
     AND NEW.started_at IS NOT NULL
     AND NEW.completed_at IS NOT NULL THEN
    elapsed_seconds := extract(epoch FROM (NEW.completed_at - NEW.started_at));
    IF elapsed_seconds < 5 THEN
      PERFORM public.record_automatic_fraud_flag(
        NEW.user_id,
        'ad_completed_too_fast',
        CASE WHEN elapsed_seconds < 0 THEN 'critical' ELSE 'medium' END,
        jsonb_build_object(
          'source_table', 'ad_view_sessions',
          'session_id', NEW.id,
          'elapsed_seconds', round(elapsed_seconds, 2),
          'reason', 'Ad session was marked completed in under 5 seconds'
        )
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.detect_fraud_fast_task_completion()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  elapsed_seconds numeric;
BEGIN
  IF NEW.status = 'completed'
     AND NEW.user_id IS NOT NULL
     AND NEW.started_at IS NOT NULL
     AND NEW.completed_at IS NOT NULL
     AND NEW.required_seconds IS NOT NULL THEN
    elapsed_seconds := extract(epoch FROM (NEW.completed_at - NEW.started_at));
    IF elapsed_seconds < GREATEST(NEW.required_seconds - 2, 0) THEN
      PERFORM public.record_automatic_fraud_flag(
        NEW.user_id,
        'task_completed_too_fast',
        CASE WHEN elapsed_seconds < 0 THEN 'critical' ELSE 'high' END,
        jsonb_build_object(
          'source_table', 'task_sessions',
          'session_id', NEW.id,
          'elapsed_seconds', round(elapsed_seconds, 2),
          'required_seconds', NEW.required_seconds,
          'reason', 'Task was completed materially faster than its configured duration'
        )
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.detect_fraud_reused_deposit_proof()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  other_deposit record;
  matched_type text;
BEGIN
  IF NEW.user_id IS NULL THEN
    RETURN NEW;
  END IF;

  FOR other_deposit IN
    SELECT d.id, d.user_id, d.transaction_id, d.image_hash
    FROM public.deposits d
    WHERE d.id <> NEW.id
      AND d.user_id <> NEW.user_id
      AND (
        (NULLIF(btrim(NEW.transaction_id), '') IS NOT NULL
          AND lower(btrim(d.transaction_id)) = lower(btrim(NEW.transaction_id)))
        OR
        (NULLIF(btrim(NEW.image_hash), '') IS NOT NULL
          AND lower(btrim(d.image_hash)) = lower(btrim(NEW.image_hash)))
      )
    LIMIT 10
  LOOP
    matched_type := CASE
      WHEN NULLIF(btrim(NEW.transaction_id), '') IS NOT NULL
       AND lower(btrim(other_deposit.transaction_id)) = lower(btrim(NEW.transaction_id))
        THEN 'duplicate_deposit_transaction'
      ELSE 'reused_deposit_proof'
    END;

    PERFORM public.record_automatic_fraud_flag(
      NEW.user_id,
      matched_type,
      'high',
      jsonb_build_object(
        'source_table', 'deposits',
        'deposit_id', NEW.id,
        'matched_deposit_id', other_deposit.id,
        'reason', 'Deposit transaction reference or proof hash matches another user'
      )
    );

    PERFORM public.record_automatic_fraud_flag(
      other_deposit.user_id,
      matched_type,
      'high',
      jsonb_build_object(
        'source_table', 'deposits',
        'deposit_id', other_deposit.id,
        'matched_deposit_id', NEW.id,
        'reason', 'Deposit transaction reference or proof hash matches another user'
      )
    );
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.detect_fraud_withdrawal_burst()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  recent_requests integer;
BEGIN
  IF NEW.user_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT count(*)::integer
    INTO recent_requests
  FROM public.withdrawals w
  WHERE w.user_id = NEW.user_id
    AND w.created_at >= now() - interval '10 minutes';

  IF recent_requests >= 5 THEN
    PERFORM public.record_automatic_fraud_flag(
      NEW.user_id,
      'withdrawal_request_burst',
      'medium',
      jsonb_build_object(
        'source_table', 'withdrawals',
        'latest_withdrawal_id', NEW.id,
        'requests_in_10_minutes', recent_requests,
        'reason', 'Five or more withdrawal requests were recorded within 10 minutes'
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS fraud_detect_self_referral ON public.referrals;
CREATE TRIGGER fraud_detect_self_referral
AFTER INSERT OR UPDATE OF referrer_id, referred_id ON public.referrals
FOR EACH ROW EXECUTE FUNCTION public.detect_fraud_self_referral();

DROP TRIGGER IF EXISTS fraud_detect_fast_ad_completion ON public.ad_view_sessions;
CREATE TRIGGER fraud_detect_fast_ad_completion
AFTER INSERT OR UPDATE ON public.ad_view_sessions
FOR EACH ROW EXECUTE FUNCTION public.detect_fraud_fast_ad_completion();

DROP TRIGGER IF EXISTS fraud_detect_fast_task_completion ON public.task_sessions;
CREATE TRIGGER fraud_detect_fast_task_completion
AFTER INSERT OR UPDATE ON public.task_sessions
FOR EACH ROW EXECUTE FUNCTION public.detect_fraud_fast_task_completion();

DROP TRIGGER IF EXISTS fraud_detect_reused_deposit_proof ON public.deposits;
CREATE TRIGGER fraud_detect_reused_deposit_proof
AFTER INSERT OR UPDATE OF transaction_id, image_hash, user_id ON public.deposits
FOR EACH ROW EXECUTE FUNCTION public.detect_fraud_reused_deposit_proof();

DROP TRIGGER IF EXISTS fraud_detect_withdrawal_burst ON public.withdrawals;
CREATE TRIGGER fraud_detect_withdrawal_burst
AFTER INSERT ON public.withdrawals
FOR EACH ROW EXECUTE FUNCTION public.detect_fraud_withdrawal_burst();

-- These are trigger entry points, not client-callable RPCs.
REVOKE ALL ON FUNCTION public.detect_fraud_self_referral() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.detect_fraud_fast_ad_completion() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.detect_fraud_fast_task_completion() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.detect_fraud_reused_deposit_proof() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.detect_fraud_withdrawal_burst() FROM PUBLIC, anon, authenticated;

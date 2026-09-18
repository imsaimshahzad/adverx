-- =====================================================================
-- Server-side business logic. Every financial mutation lives here.
-- The client can only call these; it can never write the ledger directly.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.log_audit(
  _action text, _target_type text, _target_id text,
  _old jsonb, _new jsonb, _reason text
) RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO public.audit_logs (admin_id, action, target_type, target_id, old_value, new_value, reason)
  VALUES (auth.uid(), _action, _target_type, _target_id, _old, _new, _reason);
$$;

CREATE OR REPLACE FUNCTION public.notify_user(_user uuid, _title text, _body text, _cat text DEFAULT 'system')
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO public.notifications (user_id, title, body, category) VALUES (_user, _title, _body, _cat);
$$;

CREATE OR REPLACE FUNCTION public.active_plan(_user uuid)
RETURNS TABLE (plan_id uuid, name text, daily_task_limit integer, min_withdrawal numeric, expires_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.name, p.daily_task_limit, p.min_withdrawal, up.expires_at
  FROM public.user_plans up JOIN public.plans p ON p.id = up.plan_id
  WHERE up.user_id = _user AND up.is_active AND up.expires_at > now()
  ORDER BY up.activated_at DESC LIMIT 1;
$$;

-- ---------------------------------------------------------- task sessions
CREATE OR REPLACE FUNCTION public.start_task_session(_task_id uuid, _ip text DEFAULT NULL, _ua text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user uuid := auth.uid();
  v_task public.tasks;
  v_limit integer;
  v_today integer;
  v_status public.account_status;
  v_open uuid;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT status INTO v_status FROM public.profiles WHERE id = v_user;
  IF v_status IN ('suspended','banned','restricted') THEN
    RAISE EXCEPTION 'Your account is not eligible for tasks right now';
  END IF;

  SELECT * INTO v_task FROM public.tasks WHERE id = _task_id AND status = 'active';
  IF v_task.id IS NULL THEN RAISE EXCEPTION 'Task is not available'; END IF;
  IF v_task.ends_at IS NOT NULL AND v_task.ends_at < now() THEN RAISE EXCEPTION 'Task has expired'; END IF;

  IF NOT EXISTS (SELECT 1 FROM public.active_plan(v_user)) THEN
    RAISE EXCEPTION 'An active plan is required before completing tasks';
  END IF;
  SELECT daily_task_limit INTO v_limit FROM public.active_plan(v_user);

  SELECT count(*) INTO v_today FROM public.task_completions
   WHERE user_id = v_user AND created_at >= date_trunc('day', now());
  IF v_today >= v_limit THEN RAISE EXCEPTION 'Daily task limit reached'; END IF;

  IF EXISTS (SELECT 1 FROM public.task_completions
             WHERE user_id = v_user AND task_id = _task_id
               AND created_at >= date_trunc('day', now())
             HAVING count(*) >= v_task.daily_limit_per_user) THEN
    RAISE EXCEPTION 'You already completed this task today';
  END IF;

  IF v_task.global_completion_limit IS NOT NULL AND
     (SELECT count(*) FROM public.task_completions WHERE task_id = _task_id) >= v_task.global_completion_limit THEN
    RAISE EXCEPTION 'This task has reached its completion limit';
  END IF;

  IF (SELECT reward_available FROM public.reward_pool_state()) < v_task.reward THEN
    RAISE EXCEPTION 'Reward budget is exhausted. New rewards resume once more verified revenue is recorded.';
  END IF;

  -- rate limit: reuse an open session instead of stacking them
  SELECT id INTO v_open FROM public.task_sessions
   WHERE user_id = v_user AND task_id = _task_id AND status = 'open'
     AND started_at > now() - interval '30 minutes' ORDER BY started_at DESC LIMIT 1;
  IF v_open IS NOT NULL THEN RETURN v_open; END IF;

  INSERT INTO public.task_sessions (task_id, user_id, ip_address, user_agent)
  VALUES (_task_id, v_user, _ip, _ua)
  RETURNING id INTO v_open;
  RETURN v_open;
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_task_session(_session_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user uuid := auth.uid();
  v_s public.task_sessions;
  v_task public.tasks;
  v_elapsed integer;
  v_tx uuid;
  v_ref record;
  v_rate numeric;
  v_amount numeric;
  v_ref_avail numeric;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT * INTO v_s FROM public.task_sessions WHERE id = _session_id FOR UPDATE;
  IF v_s.id IS NULL OR v_s.user_id <> v_user THEN RAISE EXCEPTION 'Session not found'; END IF;
  IF v_s.status <> 'open' THEN RAISE EXCEPTION 'This session was already submitted'; END IF;
  IF EXISTS (SELECT 1 FROM public.task_completions WHERE session_id = _session_id) THEN
    RAISE EXCEPTION 'Duplicate completion rejected';
  END IF;

  SELECT * INTO v_task FROM public.tasks WHERE id = v_s.task_id;
  v_elapsed := floor(EXTRACT(EPOCH FROM (now() - v_s.started_at)))::int;

  -- server-side watch-time verification; the client is never trusted
  IF v_elapsed < v_task.required_watch_seconds THEN
    UPDATE public.task_sessions
       SET status = 'rejected', submitted_at = now(),
           reject_reason = 'Minimum watch time not met'
     WHERE id = _session_id;
    INSERT INTO public.fraud_flags (user_id, flag_type, severity, details)
    VALUES (v_user, 'fast_task_completion', 'medium',
            jsonb_build_object('session_id', _session_id, 'elapsed', v_elapsed,
                               'required', v_task.required_watch_seconds));
    RETURN jsonb_build_object('ok', false, 'reason', 'Minimum watch time not met');
  END IF;

  IF (SELECT reward_available FROM public.reward_pool_state()) < v_task.reward THEN
    UPDATE public.task_sessions SET status = 'rejected', submitted_at = now(),
      reject_reason = 'Reward budget exhausted' WHERE id = _session_id;
    RETURN jsonb_build_object('ok', false, 'reason',
      'Reward budget exhausted — rewards resume when more verified revenue is available.');
  END IF;

  UPDATE public.task_sessions SET status = 'verified', submitted_at = now() WHERE id = _session_id;

  INSERT INTO public.wallet_transactions
    (user_id, type, amount, status, reference_type, reference_id, description, processed_at)
  VALUES (v_user, 'TASK_REWARD', v_task.reward, 'completed', 'task', v_task.id,
          'Task reward — ' || v_task.title, now())
  RETURNING id INTO v_tx;

  INSERT INTO public.task_completions (task_id, user_id, session_id, reward, watched_seconds, transaction_id)
  VALUES (v_task.id, v_user, _session_id, v_task.reward, v_elapsed, v_tx);

  -- Referral commissions are paid from the referral budget and are tied to a
  -- verified activity reward, never to anyone's deposit.
  FOR v_ref IN
    SELECT referrer_id, level FROM public.referrals WHERE referred_id = v_user ORDER BY level
  LOOP
    v_rate := public.setting_num('referral_l' || v_ref.level || '_pct', 0) / 100;
    v_amount := round(v_task.reward * v_rate, 2);
    CONTINUE WHEN v_amount <= 0;
    CONTINUE WHEN v_ref.referrer_id = v_user;
    CONTINUE WHEN NOT EXISTS (SELECT 1 FROM public.active_plan(v_ref.referrer_id));
    SELECT referral_available INTO v_ref_avail FROM public.reward_pool_state();
    CONTINUE WHEN v_ref_avail < v_amount;

    INSERT INTO public.wallet_transactions
      (user_id, type, amount, status, reference_type, reference_id, description, processed_at, metadata)
    VALUES (v_ref.referrer_id, 'REFERRAL_REWARD', v_amount, 'completed', 'task', v_task.id,
            'Level ' || v_ref.level || ' commission on verified task activity', now(),
            jsonb_build_object('source_user', v_user, 'level', v_ref.level));

    INSERT INTO public.referral_commissions
      (referrer_id, referred_id, level, rate, amount, qualifying_activity, source_transaction_id)
    VALUES (v_ref.referrer_id, v_user, v_ref.level, v_rate, v_amount, 'task_reward', v_tx);
  END LOOP;

  RETURN jsonb_build_object('ok', true, 'reward', v_task.reward, 'transaction_id', v_tx);
END;
$$;

-- ---------------------------------------------------------------- deposits
CREATE OR REPLACE FUNCTION public.review_deposit(_deposit_id uuid, _approve boolean, _note text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_admin uuid := auth.uid();
  v_d public.deposits;
  v_plan public.plans;
BEGIN
  IF NOT public.is_admin(v_admin) THEN RAISE EXCEPTION 'Forbidden'; END IF;
  SELECT * INTO v_d FROM public.deposits WHERE id = _deposit_id FOR UPDATE;
  IF v_d.id IS NULL THEN RAISE EXCEPTION 'Deposit not found'; END IF;
  IF v_d.status <> 'pending' THEN RAISE EXCEPTION 'Deposit already reviewed'; END IF;

  UPDATE public.deposits
     SET status = CASE WHEN _approve THEN 'approved' ELSE 'rejected' END::public.deposit_status,
         reviewed_at = now(), reviewer_id = v_admin, review_note = _note
   WHERE id = _deposit_id;

  IF _approve THEN
    -- A deposit pays for plan access. It is recorded on the ledger for
    -- traceability and immediately consumed by the activation, so it never
    -- becomes withdrawable balance and is never a promised return.
    INSERT INTO public.wallet_transactions
      (user_id, type, amount, status, reference_type, reference_id, description, admin_id, processed_at)
    VALUES (v_d.user_id, 'DEPOSIT', v_d.amount, 'completed', 'deposit', v_d.id,
            'Deposit approved', v_admin, now());

    IF v_d.plan_id IS NOT NULL THEN
      SELECT * INTO v_plan FROM public.plans WHERE id = v_d.plan_id;
      INSERT INTO public.wallet_transactions
        (user_id, type, amount, status, reference_type, reference_id, description, admin_id, processed_at)
      VALUES (v_d.user_id, 'PLAN_ACTIVATION', -v_d.amount, 'completed', 'plan', v_plan.id,
              'Plan access — ' || v_plan.name, v_admin, now());

      UPDATE public.user_plans SET is_active = false WHERE user_id = v_d.user_id AND is_active;
      INSERT INTO public.user_plans (user_id, plan_id, expires_at, source_deposit_id)
      VALUES (v_d.user_id, v_plan.id, now() + (v_plan.duration_days || ' days')::interval, v_d.id);
      UPDATE public.profiles SET status = 'active' WHERE id = v_d.user_id;
    END IF;

    PERFORM public.notify_user(v_d.user_id, 'Deposit approved',
      'Your payment was verified and your plan access is active.', 'deposit');
  ELSE
    PERFORM public.notify_user(v_d.user_id, 'Deposit rejected',
      COALESCE(_note, 'We could not verify this payment.'), 'deposit');
  END IF;

  PERFORM public.log_audit(CASE WHEN _approve THEN 'deposit.approve' ELSE 'deposit.reject' END,
    'deposit', _deposit_id::text, jsonb_build_object('status','pending'),
    jsonb_build_object('status', CASE WHEN _approve THEN 'approved' ELSE 'rejected' END), _note);
END;
$$;

-- ------------------------------------------------------------- withdrawals
CREATE OR REPLACE FUNCTION public.request_withdrawal(_amount numeric, _method_id uuid, _destination text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user uuid := auth.uid();
  v_state record;
  v_min numeric;
  v_max numeric;
  v_fee_pct numeric;
  v_fee numeric;
  v_daily numeric;
  v_used numeric;
  v_id uuid;
  v_tx uuid;
  v_profile public.profiles;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  -- serialize concurrent requests for this user to prevent double spending
  PERFORM pg_advisory_xact_lock(hashtextextended(v_user::text, 0));

  SELECT * INTO v_profile FROM public.profiles WHERE id = v_user;
  IF v_profile.status IN ('suspended','banned','restricted') THEN
    RAISE EXCEPTION 'Withdrawals are disabled on your account. Contact support.';
  END IF;
  IF EXISTS (SELECT 1 FROM public.fraud_flags WHERE user_id = v_user AND NOT resolved AND severity = 'high') THEN
    RAISE EXCEPTION 'Your account is under review. Withdrawals are paused.';
  END IF;

  v_min := COALESCE((SELECT min_withdrawal FROM public.active_plan(v_user)),
                    public.setting_num('min_withdrawal', 10));
  v_max := public.setting_num('max_withdrawal', 1000);
  v_fee_pct := public.setting_num('withdrawal_fee_pct', 2);
  v_daily := public.setting_num('daily_withdrawal_limit', 1000);

  IF _amount < v_min THEN RAISE EXCEPTION 'Minimum withdrawal is %', v_min; END IF;
  IF _amount > v_max THEN RAISE EXCEPTION 'Maximum withdrawal is %', v_max; END IF;

  SELECT COALESCE(SUM(amount), 0) INTO v_used FROM public.withdrawals
   WHERE user_id = v_user AND requested_at >= date_trunc('day', now())
     AND status <> 'rejected' AND status <> 'cancelled';
  IF v_used + _amount > v_daily THEN RAISE EXCEPTION 'Daily withdrawal limit exceeded'; END IF;

  SELECT * INTO v_state FROM public.wallet_state(v_user);
  IF v_state.available < _amount THEN RAISE EXCEPTION 'Insufficient available balance'; END IF;

  v_fee := round(_amount * v_fee_pct / 100, 2);

  INSERT INTO public.withdrawals (user_id, method_id, amount, fee, net_amount, destination)
  VALUES (v_user, _method_id, _amount, v_fee, _amount - v_fee, _destination)
  RETURNING id INTO v_id;

  -- pending debit immediately locks the funds so they cannot be spent twice
  INSERT INTO public.wallet_transactions
    (user_id, type, amount, status, reference_type, reference_id, description)
  VALUES (v_user, 'WITHDRAWAL', -_amount, 'pending', 'withdrawal', v_id, 'Withdrawal requested')
  RETURNING id INTO v_tx;
  UPDATE public.withdrawals SET hold_transaction_id = v_tx WHERE id = v_id;

  IF (SELECT count(*) FROM public.withdrawals
       WHERE user_id = v_user AND requested_at > now() - interval '1 hour') > 3 THEN
    INSERT INTO public.fraud_flags (user_id, flag_type, severity, details)
    VALUES (v_user, 'withdrawal_velocity', 'medium', jsonb_build_object('window','1h'));
  END IF;

  PERFORM public.notify_user(v_user, 'Withdrawal submitted',
    'Your request is queued for manual review.', 'withdrawal');
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.review_withdrawal(_id uuid, _status text, _note text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_admin uuid := auth.uid();
  v_w public.withdrawals;
BEGIN
  IF NOT public.is_admin(v_admin) THEN RAISE EXCEPTION 'Forbidden'; END IF;
  SELECT * INTO v_w FROM public.withdrawals WHERE id = _id FOR UPDATE;
  IF v_w.id IS NULL THEN RAISE EXCEPTION 'Withdrawal not found'; END IF;
  IF v_w.status IN ('completed','rejected','cancelled') THEN RAISE EXCEPTION 'Already finalised'; END IF;

  IF _status = 'completed' THEN
    UPDATE public.wallet_transactions SET status = 'completed', processed_at = now()
     WHERE id = v_w.hold_transaction_id;
    IF v_w.fee > 0 AND v_w.fee_transaction_id IS NULL THEN
      INSERT INTO public.wallet_transactions
        (user_id, type, amount, status, reference_type, reference_id, description, admin_id, processed_at)
      VALUES (v_w.user_id, 'WITHDRAWAL_FEE', 0, 'completed', 'withdrawal', v_w.id,
              'Withdrawal fee deducted from payout', v_admin, now());
    END IF;
    UPDATE public.withdrawals SET status = 'completed', processed_at = now(),
      reviewed_at = now(), reviewer_id = v_admin, review_note = _note WHERE id = _id;
    PERFORM public.notify_user(v_w.user_id, 'Withdrawal paid',
      'Your payout has been processed.', 'withdrawal');
  ELSIF _status IN ('rejected','cancelled') THEN
    -- release the hold with a reversal instead of editing history
    UPDATE public.wallet_transactions SET status = 'cancelled', processed_at = now()
     WHERE id = v_w.hold_transaction_id;
    INSERT INTO public.wallet_transactions
      (user_id, type, amount, status, reference_type, reference_id, description, admin_id, processed_at)
    VALUES (v_w.user_id, 'REVERSAL', 0, 'completed', 'withdrawal', v_w.id,
            'Withdrawal hold released', v_admin, now());
    UPDATE public.withdrawals SET status = _status::public.withdrawal_status, reviewed_at = now(),
      reviewer_id = v_admin, review_note = _note WHERE id = _id;
    PERFORM public.notify_user(v_w.user_id, 'Withdrawal ' || _status,
      COALESCE(_note, 'Your request was not approved. Funds returned to your balance.'), 'withdrawal');
  ELSE
    UPDATE public.withdrawals SET status = _status::public.withdrawal_status, reviewed_at = now(),
      reviewer_id = v_admin, review_note = _note WHERE id = _id;
  END IF;

  PERFORM public.log_audit('withdrawal.' || _status, 'withdrawal', _id::text,
    jsonb_build_object('status', v_w.status), jsonb_build_object('status', _status), _note);
END;
$$;

-- ----------------------------------------------------------- admin actions
CREATE OR REPLACE FUNCTION public.review_revenue(_id uuid, _status text, _note text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_admin uuid := auth.uid(); v_old text;
BEGIN
  IF NOT public.is_admin(v_admin) THEN RAISE EXCEPTION 'Forbidden'; END IF;
  SELECT status::text INTO v_old FROM public.advertiser_revenue WHERE id = _id;
  UPDATE public.advertiser_revenue
     SET status = _status::public.revenue_status, verified_by = v_admin,
         verified_at = now(), notes = COALESCE(_note, notes)
   WHERE id = _id;
  PERFORM public.log_audit('revenue.' || _status, 'advertiser_revenue', _id::text,
    jsonb_build_object('status', v_old), jsonb_build_object('status', _status), _note);
END;
$$;

CREATE OR REPLACE FUNCTION public.update_setting(_key text, _value numeric, _reason text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_admin uuid := auth.uid(); v_old numeric;
BEGIN
  IF NOT public.is_admin(v_admin) THEN RAISE EXCEPTION 'Forbidden'; END IF;
  SELECT value INTO v_old FROM public.admin_settings WHERE key = _key;
  IF v_old IS NULL AND NOT EXISTS (SELECT 1 FROM public.admin_settings WHERE key = _key) THEN
    RAISE EXCEPTION 'Unknown setting %', _key;
  END IF;
  UPDATE public.admin_settings SET value = _value, updated_at = now(), updated_by = v_admin WHERE key = _key;
  PERFORM public.log_audit('setting.update', 'admin_settings', _key,
    jsonb_build_object('value', v_old), jsonb_build_object('value', _value), _reason);
END;
$$;

CREATE OR REPLACE FUNCTION public.set_user_status(_user uuid, _status text, _risk text, _reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_admin uuid := auth.uid(); v_old jsonb;
BEGIN
  IF NOT public.is_admin(v_admin) THEN RAISE EXCEPTION 'Forbidden'; END IF;
  SELECT jsonb_build_object('status', status, 'risk', risk_status) INTO v_old
    FROM public.profiles WHERE id = _user;
  UPDATE public.profiles
     SET status = _status::public.account_status, risk_status = _risk::public.risk_level
   WHERE id = _user;
  PERFORM public.log_audit('user.status', 'profile', _user::text, v_old,
    jsonb_build_object('status', _status, 'risk', _risk), _reason);
END;
$$;

CREATE OR REPLACE FUNCTION public.adjust_wallet(_user uuid, _amount numeric, _reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_admin uuid := auth.uid();
BEGIN
  IF NOT public.is_admin(v_admin) THEN RAISE EXCEPTION 'Forbidden'; END IF;
  IF _reason IS NULL OR length(trim(_reason)) < 3 THEN RAISE EXCEPTION 'A reason is required'; END IF;
  INSERT INTO public.wallet_transactions
    (user_id, type, amount, status, description, admin_id, processed_at)
  VALUES (_user, 'ADMIN_ADJUSTMENT', _amount, 'completed', _reason, v_admin, now());
  PERFORM public.log_audit('wallet.adjust', 'profile', _user::text, NULL,
    jsonb_build_object('amount', _amount), _reason);
END;
$$;

CREATE OR REPLACE FUNCTION public.resolve_fraud_flag(_id uuid, _note text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_admin uuid := auth.uid();
BEGIN
  IF NOT public.is_staff(v_admin) THEN RAISE EXCEPTION 'Forbidden'; END IF;
  UPDATE public.fraud_flags SET resolved = true, resolved_by = v_admin,
    resolved_at = now(), resolution_note = _note WHERE id = _id;
  PERFORM public.log_audit('fraud.resolve', 'fraud_flag', _id::text, NULL, NULL, _note);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_overview()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_pool record; v_res jsonb;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'Forbidden'; END IF;
  SELECT * INTO v_pool FROM public.reward_pool_state();
  SELECT jsonb_build_object(
    'total_users', (SELECT count(*) FROM public.profiles),
    'active_users', (SELECT count(DISTINCT user_id) FROM public.task_completions
                      WHERE created_at > now() - interval '7 days'),
    'verified_revenue', v_pool.verified_revenue,
    'today_revenue', (SELECT COALESCE(SUM(platform_revenue),0) FROM public.advertiser_revenue
                       WHERE status='verified' AND received_on = current_date),
    'total_rewards', v_pool.reward_liability,
    'today_rewards', (SELECT COALESCE(SUM(amount),0) FROM public.wallet_transactions
                       WHERE type='TASK_REWARD' AND created_at >= date_trunc('day', now())),
    'referral_payouts', v_pool.referral_liability,
    'total_withdrawn', (SELECT COALESCE(-SUM(amount),0) FROM public.wallet_transactions
                       WHERE type='WITHDRAWAL' AND status='completed'),
    'pending_withdrawals', v_pool.pending_withdrawals,
    'pending_deposits', (SELECT count(*) FROM public.deposits WHERE status='pending'),
    'open_flags', (SELECT count(*) FROM public.fraud_flags WHERE NOT resolved),
    'open_tickets', (SELECT count(*) FROM public.support_tickets WHERE status='open'),
    'reward_budget', v_pool.reward_budget,
    'reward_available', v_pool.reward_available,
    'referral_budget', v_pool.referral_budget,
    'referral_available', v_pool.referral_available,
    'reserve', v_pool.reserve,
    'operations', v_pool.operations,
    'outstanding_liability', v_pool.outstanding_liability,
    'available_funds', v_pool.available_funds
  ) INTO v_res;
  RETURN v_res;
END;
$$;

GRANT EXECUTE ON FUNCTION public.start_task_session(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_task_session(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_withdrawal(numeric, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.review_deposit(uuid, boolean, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.review_withdrawal(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.review_revenue(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_setting(text, numeric, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_user_status(uuid, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.adjust_wallet(uuid, numeric, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_fraud_flag(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_overview() TO authenticated;
GRANT EXECUTE ON FUNCTION public.wallet_state(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.active_plan(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reward_pool_state() TO authenticated;

-- ------------------------------------------------------------------ seeds
INSERT INTO public.admin_settings (key, value, category, label, description) VALUES
 ('reward_pool_pct', 60, 'pool', 'Reward pool %', 'Share of verified revenue funding task rewards'),
 ('referral_pool_pct', 10, 'pool', 'Referral pool %', 'Share of verified revenue funding referral commissions'),
 ('reserve_pct', 20, 'pool', 'Reserve %', 'Held back as solvency reserve'),
 ('operations_pct', 10, 'pool', 'Operations %', 'Platform operating costs'),
 ('referral_l1_pct', 5, 'referral', 'Level 1 commission %', 'Percent of a referred user''s verified task reward'),
 ('referral_l2_pct', 2, 'referral', 'Level 2 commission %', 'Percent of a level-2 verified task reward'),
 ('referral_l3_pct', 1, 'referral', 'Level 3 commission %', 'Percent of a level-3 verified task reward'),
 ('min_deposit', 10, 'payments', 'Minimum deposit', NULL),
 ('min_withdrawal', 10, 'payments', 'Minimum withdrawal', NULL),
 ('max_withdrawal', 1000, 'payments', 'Maximum withdrawal', NULL),
 ('withdrawal_fee_pct', 2, 'payments', 'Withdrawal fee %', NULL),
 ('daily_withdrawal_limit', 1000, 'payments', 'Daily withdrawal limit', NULL),
 ('liability_warning_pct', 70, 'risk', 'Liability warning threshold %', 'Liability vs available funds'),
 ('liability_critical_pct', 90, 'risk', 'Liability critical threshold %', NULL),
 ('maintenance_mode', 0, 'system', 'Maintenance mode', '1 disables user financial actions');

INSERT INTO public.plans (name, slug, description, price, duration_days, daily_task_limit, min_withdrawal, sort_order) VALUES
 ('Starter','starter','Access to daily verified tasks and level 1 referral commissions.',25,90,3,10,1),
 ('Growth','growth','More daily tasks and access to all three referral levels.',75,180,5,15,2),
 ('Pro','pro','Highest daily task allowance and priority withdrawal review.',150,365,8,20,3);

INSERT INTO public.deposit_methods (name, account_title, account_number, instructions, sort_order) VALUES
 ('Bank transfer','Platform Operations Ltd','PK36 MEZN 0001 2345 6789 0000','Send the exact amount and upload the stamped receipt.',1),
 ('Mobile wallet','Platform Operations Ltd','0300-1234567','Use account transfer, not bill payment. Keep the confirmation SMS.',2);

INSERT INTO public.withdrawal_methods (name, destination_label, sort_order) VALUES
 ('Bank transfer','IBAN / account number',1),
 ('Mobile wallet','Wallet number',2);

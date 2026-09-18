-- =====================================================================
-- Advertiser revenue -> reward budget -> verified activity -> rewards
-- =====================================================================
CREATE TYPE public.revenue_status AS ENUM ('pending','verified','rejected');
CREATE TYPE public.task_status AS ENUM ('draft','active','paused','completed','expired');
CREATE TYPE public.session_status AS ENUM ('open','submitted','verified','rejected','expired');

CREATE TABLE public.advertisers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  contact_email text,
  website text,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.advertisers TO authenticated;
GRANT ALL ON public.advertisers TO service_role;
ALTER TABLE public.advertisers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read advertisers" ON public.advertisers FOR SELECT TO authenticated USING (true);

CREATE TABLE public.advertiser_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_id uuid NOT NULL REFERENCES public.advertisers(id) ON DELETE CASCADE,
  name text NOT NULL,
  budget numeric(14,2) NOT NULL DEFAULT 0,
  starts_on date,
  ends_on date,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.advertiser_campaigns TO authenticated;
GRANT ALL ON public.advertiser_campaigns TO service_role;
ALTER TABLE public.advertiser_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read campaigns" ON public.advertiser_campaigns FOR SELECT TO authenticated USING (true);

CREATE TABLE public.advertiser_revenue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_id uuid NOT NULL REFERENCES public.advertisers(id) ON DELETE RESTRICT,
  campaign_id uuid REFERENCES public.advertiser_campaigns(id) ON DELETE SET NULL,
  gross_revenue numeric(14,2) NOT NULL CHECK (gross_revenue >= 0),
  platform_revenue numeric(14,2) NOT NULL CHECK (platform_revenue >= 0),
  currency text NOT NULL DEFAULT 'USD',
  received_on date NOT NULL DEFAULT current_date,
  status public.revenue_status NOT NULL DEFAULT 'pending',
  reference text,
  notes text,
  verified_by uuid,
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.advertiser_revenue TO authenticated;
GRANT ALL ON public.advertiser_revenue TO service_role;
ALTER TABLE public.advertiser_revenue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read revenue" ON public.advertiser_revenue FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));

-- ---------------------------------------------------------------- tasks
CREATE TABLE public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_id uuid REFERENCES public.advertisers(id) ON DELETE SET NULL,
  campaign_id uuid REFERENCES public.advertiser_campaigns(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'General',
  reward numeric(14,2) NOT NULL CHECK (reward >= 0),
  required_watch_seconds integer NOT NULL DEFAULT 15,
  daily_limit_per_user integer NOT NULL DEFAULT 1,
  global_completion_limit integer,
  cooldown_minutes integer NOT NULL DEFAULT 0,
  verification_method text NOT NULL DEFAULT 'watch_time',
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz,
  status public.task_status NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.tasks TO authenticated;
GRANT ALL ON public.tasks TO service_role;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read eligible tasks" ON public.tasks FOR SELECT TO authenticated
  USING (status = 'active' OR public.is_staff(auth.uid()));

CREATE TABLE public.task_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL DEFAULT now(),
  submitted_at timestamptz,
  status public.session_status NOT NULL DEFAULT 'open',
  ip_address text,
  user_agent text,
  reject_reason text
);
GRANT SELECT ON public.task_sessions TO authenticated;
GRANT ALL ON public.task_sessions TO service_role;
ALTER TABLE public.task_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own sessions read" ON public.task_sessions FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_staff(auth.uid()));
CREATE INDEX idx_sessions_user ON public.task_sessions(user_id, started_at DESC);

CREATE TABLE public.task_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id uuid NOT NULL UNIQUE REFERENCES public.task_sessions(id) ON DELETE CASCADE,
  reward numeric(14,2) NOT NULL,
  watched_seconds integer NOT NULL,
  transaction_id uuid REFERENCES public.wallet_transactions(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.task_completions TO authenticated;
GRANT ALL ON public.task_completions TO service_role;
ALTER TABLE public.task_completions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own completions read" ON public.task_completions FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_staff(auth.uid()));
CREATE INDEX idx_completions_user_day ON public.task_completions(user_id, created_at DESC);

-- ---------------------------------------------------------------- payments
CREATE TYPE public.deposit_status AS ENUM ('pending','approved','rejected');
CREATE TYPE public.withdrawal_status AS ENUM
  ('pending','under_review','approved','processing','completed','rejected','cancelled');

CREATE TABLE public.deposit_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  account_title text NOT NULL,
  account_number text NOT NULL,
  instructions text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0
);
GRANT SELECT ON public.deposit_methods TO authenticated;
GRANT ALL ON public.deposit_methods TO service_role;
ALTER TABLE public.deposit_methods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read deposit methods" ON public.deposit_methods FOR SELECT TO authenticated
  USING (is_active OR public.is_staff(auth.uid()));

CREATE TABLE public.withdrawal_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  destination_label text NOT NULL DEFAULT 'Account number',
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0
);
GRANT SELECT ON public.withdrawal_methods TO authenticated;
GRANT ALL ON public.withdrawal_methods TO service_role;
ALTER TABLE public.withdrawal_methods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read withdrawal methods" ON public.withdrawal_methods FOR SELECT TO authenticated
  USING (is_active OR public.is_staff(auth.uid()));

CREATE TABLE public.deposits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id uuid REFERENCES public.plans(id),
  method_id uuid REFERENCES public.deposit_methods(id),
  amount numeric(14,2) NOT NULL CHECK (amount > 0),
  currency text NOT NULL DEFAULT 'USD',
  transaction_reference text NOT NULL,
  proof_path text,
  status public.deposit_status NOT NULL DEFAULT 'pending',
  submitted_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewer_id uuid,
  review_note text
);
GRANT SELECT, INSERT ON public.deposits TO authenticated;
GRANT ALL ON public.deposits TO service_role;
ALTER TABLE public.deposits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own deposits read" ON public.deposits FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_staff(auth.uid()));
CREATE POLICY "own deposits insert" ON public.deposits FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND status = 'pending');

CREATE TABLE public.withdrawals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  method_id uuid REFERENCES public.withdrawal_methods(id),
  amount numeric(14,2) NOT NULL CHECK (amount > 0),
  fee numeric(14,2) NOT NULL DEFAULT 0,
  net_amount numeric(14,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  destination text NOT NULL,
  status public.withdrawal_status NOT NULL DEFAULT 'pending',
  hold_transaction_id uuid REFERENCES public.wallet_transactions(id),
  fee_transaction_id uuid REFERENCES public.wallet_transactions(id),
  requested_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  processed_at timestamptz,
  reviewer_id uuid,
  review_note text
);
GRANT SELECT ON public.withdrawals TO authenticated;
GRANT ALL ON public.withdrawals TO service_role;
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own withdrawals read" ON public.withdrawals FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_staff(auth.uid()));

-- ---------------------------------------------------------------- risk
CREATE TABLE public.fraud_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  flag_type text NOT NULL,
  severity text NOT NULL DEFAULT 'low',
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  resolved boolean NOT NULL DEFAULT false,
  resolved_by uuid,
  resolved_at timestamptz,
  resolution_note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.fraud_flags TO authenticated;
GRANT ALL ON public.fraud_flags TO service_role;
ALTER TABLE public.fraud_flags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read flags" ON public.fraud_flags FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));

CREATE TABLE public.user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.user_sessions TO authenticated;
GRANT ALL ON public.user_sessions TO service_role;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own sessions log read" ON public.user_sessions FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_staff(auth.uid()));

CREATE TABLE public.user_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fingerprint text NOT NULL,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, fingerprint)
);
GRANT SELECT ON public.user_devices TO authenticated;
GRANT ALL ON public.user_devices TO service_role;
ALTER TABLE public.user_devices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own devices read" ON public.user_devices FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_staff(auth.uid()));

-- ---------------------------------------------------------- comms + support
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'system',
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own notifications read" ON public.notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "own notifications update" ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject text NOT NULL,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  admin_reply text,
  replied_by uuid,
  replied_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.support_tickets TO authenticated;
GRANT ALL ON public.support_tickets TO service_role;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own tickets read" ON public.support_tickets FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_staff(auth.uid()));
CREATE POLICY "own tickets insert" ON public.support_tickets FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE TABLE public.admin_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL,
  action text NOT NULL,
  target_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.admin_actions TO authenticated;
GRANT ALL ON public.admin_actions TO service_role;
ALTER TABLE public.admin_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin read actions" ON public.admin_actions FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

-- ------------------------------------------------------------- reward pool
-- The pool is derived, never hand-edited: verified revenue x allocation split
-- minus liabilities already created.
CREATE OR REPLACE FUNCTION public.reward_pool_state()
RETURNS TABLE (
  verified_revenue numeric,
  reward_budget numeric,
  referral_budget numeric,
  reserve numeric,
  operations numeric,
  reward_liability numeric,
  referral_liability numeric,
  reward_available numeric,
  referral_available numeric,
  pending_withdrawals numeric,
  outstanding_liability numeric,
  available_funds numeric
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_rev numeric;
BEGIN
  SELECT COALESCE(SUM(platform_revenue), 0) INTO v_rev
    FROM public.advertiser_revenue WHERE status = 'verified';

  verified_revenue := v_rev;
  reward_budget   := round(v_rev * public.setting_num('reward_pool_pct', 60) / 100, 2);
  referral_budget := round(v_rev * public.setting_num('referral_pool_pct', 10) / 100, 2);
  reserve         := round(v_rev * public.setting_num('reserve_pct', 20) / 100, 2);
  operations      := round(v_rev * public.setting_num('operations_pct', 10) / 100, 2);

  SELECT COALESCE(SUM(amount), 0) INTO reward_liability
    FROM public.wallet_transactions
   WHERE type = 'TASK_REWARD' AND status IN ('completed','pending');
  SELECT COALESCE(SUM(amount), 0) INTO referral_liability
    FROM public.wallet_transactions
   WHERE type = 'REFERRAL_REWARD' AND status IN ('completed','pending');

  reward_available   := reward_budget - reward_liability;
  referral_available := referral_budget - referral_liability;

  SELECT COALESCE(SUM(amount), 0) INTO pending_withdrawals
    FROM public.withdrawals
   WHERE status IN ('pending','under_review','approved','processing');

  outstanding_liability := reward_liability + referral_liability
    - COALESCE((SELECT -SUM(amount) FROM public.wallet_transactions
                 WHERE type = 'WITHDRAWAL' AND status = 'completed'), 0);
  available_funds := v_rev - COALESCE((SELECT -SUM(amount) FROM public.wallet_transactions
                 WHERE type = 'WITHDRAWAL' AND status = 'completed'), 0);
  RETURN NEXT;
END;
$$;

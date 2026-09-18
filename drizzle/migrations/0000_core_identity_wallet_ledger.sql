-- =====================================================================
-- PHASE 1: identity, roles, settings, audit
-- =====================================================================
CREATE TYPE public.app_role AS ENUM ('user','moderator','admin','super_admin');
CREATE TYPE public.account_status AS ENUM ('active','pending_verification','restricted','suspended','banned');
CREATE TYPE public.risk_level AS ENUM ('normal','watchlist','restricted','suspended','banned');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  username text UNIQUE,
  email text,
  phone text,
  referral_code text NOT NULL UNIQUE,
  referred_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  status public.account_status NOT NULL DEFAULT 'pending_verification',
  risk_status public.risk_level NOT NULL DEFAULT 'normal',
  email_verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('moderator','admin','super_admin')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin','super_admin')
  );
$$;

CREATE POLICY "own profile read" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_staff(auth.uid()));
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "staff profile update" ON public.profiles FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "own roles read" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_staff(auth.uid()));

-- ---------------------------------------------------------------- settings
CREATE TABLE public.admin_settings (
  key text PRIMARY KEY,
  value numeric,
  text_value text,
  category text NOT NULL DEFAULT 'general',
  label text NOT NULL,
  description text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);
GRANT SELECT ON public.admin_settings TO authenticated;
GRANT ALL ON public.admin_settings TO service_role;
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read settings" ON public.admin_settings FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));

CREATE OR REPLACE FUNCTION public.setting_num(_key text, _default numeric DEFAULT 0)
RETURNS numeric LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT value FROM public.admin_settings WHERE key = _key), _default);
$$;

CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  target_type text,
  target_id text,
  old_value jsonb,
  new_value jsonb,
  reason text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read audit" ON public.audit_logs FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));
CREATE INDEX idx_audit_created ON public.audit_logs(created_at DESC);

-- ---------------------------------------------------------------- plans
CREATE TABLE public.plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text NOT NULL DEFAULT '',
  price numeric(14,2) NOT NULL DEFAULT 0,
  duration_days integer NOT NULL DEFAULT 90,
  daily_task_limit integer NOT NULL DEFAULT 3,
  min_withdrawal numeric(14,2) NOT NULL DEFAULT 5,
  referral_eligible boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.plans TO authenticated, anon;
GRANT ALL ON public.plans TO service_role;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone reads active plans" ON public.plans FOR SELECT TO anon, authenticated
  USING (is_active OR public.is_staff(auth.uid()));

CREATE TABLE public.user_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES public.plans(id),
  activated_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  source_deposit_id uuid
);
GRANT SELECT ON public.user_plans TO authenticated;
GRANT ALL ON public.user_plans TO service_role;
ALTER TABLE public.user_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own plans read" ON public.user_plans FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_staff(auth.uid()));

-- ---------------------------------------------------------------- ledger
CREATE TYPE public.tx_type AS ENUM (
  'DEPOSIT','PLAN_ACTIVATION','TASK_REWARD','REFERRAL_REWARD',
  'WITHDRAWAL','WITHDRAWAL_FEE','REFUND','REVERSAL','ADMIN_ADJUSTMENT'
);
CREATE TYPE public.tx_status AS ENUM ('pending','completed','failed','reversed','cancelled');

-- Immutable, append-only ledger. Positive amount = credit, negative = debit.
CREATE TABLE public.wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type public.tx_type NOT NULL,
  amount numeric(14,2) NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  status public.tx_status NOT NULL DEFAULT 'completed',
  reference_type text,
  reference_id uuid,
  description text NOT NULL DEFAULT '',
  admin_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz
);
GRANT SELECT ON public.wallet_transactions TO authenticated;
GRANT ALL ON public.wallet_transactions TO service_role;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own ledger read" ON public.wallet_transactions FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_staff(auth.uid()));
CREATE INDEX idx_wtx_user ON public.wallet_transactions(user_id, created_at DESC);
CREATE INDEX idx_wtx_type ON public.wallet_transactions(type, status);

-- Ledger rows may never be edited or deleted, only superseded by REVERSAL rows.
CREATE OR REPLACE FUNCTION public.block_ledger_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'wallet_transactions are immutable: deletion is not allowed';
  END IF;
  IF NEW.id <> OLD.id OR NEW.user_id <> OLD.user_id OR NEW.amount <> OLD.amount
     OR NEW.type <> OLD.type OR NEW.created_at <> OLD.created_at THEN
    RAISE EXCEPTION 'wallet_transactions are immutable: only status/processed_at may change';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_ledger_immutable
  BEFORE UPDATE OR DELETE ON public.wallet_transactions
  FOR EACH ROW EXECUTE FUNCTION public.block_ledger_mutation();

-- Balance state is always derived from the ledger, never stored.
CREATE OR REPLACE FUNCTION public.wallet_state(_user_id uuid)
RETURNS TABLE (
  available numeric, pending numeric, locked numeric,
  total_earned numeric, total_withdrawn numeric, today_earned numeric
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    COALESCE(SUM(amount) FILTER (WHERE status IN ('completed','pending')), 0)::numeric,
    COALESCE(SUM(amount) FILTER (WHERE status = 'pending' AND amount > 0), 0)::numeric,
    COALESCE(-SUM(amount) FILTER (WHERE status = 'pending' AND amount < 0), 0)::numeric,
    COALESCE(SUM(amount) FILTER (WHERE status = 'completed' AND type IN ('TASK_REWARD','REFERRAL_REWARD')), 0)::numeric,
    COALESCE(-SUM(amount) FILTER (WHERE status = 'completed' AND type = 'WITHDRAWAL'), 0)::numeric,
    COALESCE(SUM(amount) FILTER (WHERE amount > 0 AND type IN ('TASK_REWARD','REFERRAL_REWARD')
             AND created_at >= date_trunc('day', now())), 0)::numeric
  FROM public.wallet_transactions WHERE user_id = _user_id;
$$;

-- ---------------------------------------------------------------- referrals
CREATE TABLE public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  level integer NOT NULL CHECK (level BETWEEN 1 AND 3),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (referrer_id, referred_id),
  CHECK (referrer_id <> referred_id)
);
GRANT SELECT ON public.referrals TO authenticated;
GRANT ALL ON public.referrals TO service_role;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own referrals read" ON public.referrals FOR SELECT TO authenticated
  USING (referrer_id = auth.uid() OR referred_id = auth.uid() OR public.is_staff(auth.uid()));
CREATE INDEX idx_ref_referrer ON public.referrals(referrer_id, level);

CREATE TABLE public.referral_commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  level integer NOT NULL,
  rate numeric(6,4) NOT NULL,
  amount numeric(14,2) NOT NULL,
  qualifying_activity text NOT NULL,
  source_transaction_id uuid REFERENCES public.wallet_transactions(id),
  status public.tx_status NOT NULL DEFAULT 'completed',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.referral_commissions TO authenticated;
GRANT ALL ON public.referral_commissions TO service_role;
ALTER TABLE public.referral_commissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own commissions read" ON public.referral_commissions FOR SELECT TO authenticated
  USING (referrer_id = auth.uid() OR public.is_staff(auth.uid()));

-- ------------------------------------------------------ signup provisioning
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_code text;
  v_ref_code text;
  v_referrer uuid;
  v_l2 uuid;
  v_l3 uuid;
  v_first boolean;
BEGIN
  v_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  v_ref_code := nullif(trim(NEW.raw_user_meta_data ->> 'referral_code'), '');

  SELECT id INTO v_referrer FROM public.profiles
   WHERE upper(referral_code) = upper(v_ref_code) LIMIT 1;
  -- self-referral is impossible here (row does not exist yet), circular chains
  -- are prevented because a referrer is always an older account.
  IF v_referrer = NEW.id THEN v_referrer := NULL; END IF;

  INSERT INTO public.profiles (id, full_name, username, email, referral_code, referred_by, email_verified)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    nullif(NEW.raw_user_meta_data ->> 'username', ''),
    NEW.email,
    v_code,
    v_referrer,
    NEW.email_confirmed_at IS NOT NULL
  );

  SELECT NOT EXISTS (SELECT 1 FROM public.user_roles) INTO v_first;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, CASE WHEN v_first THEN 'super_admin'::public.app_role ELSE 'user'::public.app_role END);

  IF v_referrer IS NOT NULL THEN
    INSERT INTO public.referrals (referrer_id, referred_id, level) VALUES (v_referrer, NEW.id, 1)
      ON CONFLICT DO NOTHING;
    SELECT referred_by INTO v_l2 FROM public.profiles WHERE id = v_referrer;
    IF v_l2 IS NOT NULL AND v_l2 <> NEW.id THEN
      INSERT INTO public.referrals (referrer_id, referred_id, level) VALUES (v_l2, NEW.id, 2)
        ON CONFLICT DO NOTHING;
      SELECT referred_by INTO v_l3 FROM public.profiles WHERE id = v_l2;
      IF v_l3 IS NOT NULL AND v_l3 <> NEW.id THEN
        INSERT INTO public.referrals (referrer_id, referred_id, level) VALUES (v_l3, NEW.id, 3)
          ON CONFLICT DO NOTHING;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

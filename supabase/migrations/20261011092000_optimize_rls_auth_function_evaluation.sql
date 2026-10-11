-- Performance-only RLS policy optimization.
-- Wrap stable auth lookups in scalar SELECTs so PostgreSQL can evaluate them once per statement.
-- Authorization predicates and policy roles remain unchanged.

ALTER POLICY ad_completions_admin_select ON public.ad_completions
  USING ((SELECT is_admin()) OR (user_id = (SELECT auth.uid())));

ALTER POLICY admin_fraud_select ON public.fraud_flags
  USING ((SELECT is_admin()) OR (user_id = (SELECT auth.uid())));

ALTER POLICY admin_support_select ON public.support_tickets
  USING ((SELECT is_admin()) OR (user_id = (SELECT auth.uid())));

ALTER POLICY admin_referrals_select ON public.referrals
  USING ((SELECT is_admin()) OR (referrer_id = (SELECT auth.uid())) OR (referred_id = (SELECT auth.uid())));

ALTER POLICY admin_commissions_select ON public.referral_commissions
  USING ((SELECT is_admin()) OR (user_id = (SELECT auth.uid())));

ALTER POLICY profiles_admin_select ON public.profiles
  USING ((SELECT is_admin()) OR (id = (SELECT auth.uid())));

ALTER POLICY audit_logs_admin_insert ON public.audit_logs
  WITH CHECK ((SELECT is_admin()) AND (actor_id = (SELECT auth.uid())));

ALTER POLICY deposits_admin_select ON public.deposits
  USING ((SELECT is_admin()) OR (user_id = (SELECT auth.uid())));

ALTER POLICY withdrawals_admin_select ON public.withdrawals
  USING ((SELECT is_admin()) OR (user_id = (SELECT auth.uid())));

ALTER POLICY ledger_admin_select ON public.ledger_entries
  USING ((SELECT is_admin()) OR (user_id = (SELECT auth.uid())));

ALTER POLICY wallets_admin_select ON public.wallets
  USING ((SELECT is_admin()) OR (user_id = (SELECT auth.uid())));

ALTER POLICY wallet_transactions_admin_select ON public.wallet_transactions
  USING ((SELECT is_admin()) OR (user_id = (SELECT auth.uid())));

ALTER POLICY task_sessions_admin_select ON public.task_sessions
  USING ((SELECT is_admin()) OR (user_id = (SELECT auth.uid())));

ALTER POLICY notifications_admin_select ON public.notifications
  USING ((SELECT is_admin()) OR (user_id = (SELECT auth.uid())));

ALTER POLICY profiles_select_own ON public.profiles
  USING ((SELECT auth.uid()) = id);

ALTER POLICY profiles_insert_own ON public.profiles
  WITH CHECK ((SELECT auth.uid()) = id);

ALTER POLICY profiles_update_own ON public.profiles
  USING ((SELECT auth.uid()) = id)
  WITH CHECK ((SELECT auth.uid()) = id);

ALTER POLICY recoveries_owner_or_admin ON public.ad_budget_recoveries
  USING (((SELECT auth.uid()) = referrer_id) OR ((SELECT auth.uid()) = referred_id) OR (SELECT is_admin()));

ALTER POLICY transactions_select_own_or_staff ON public.transactions
  USING ((user_id = (SELECT auth.uid())) OR is_staff((SELECT auth.uid())));

ALTER POLICY transactions_insert_staff ON public.transactions
  WITH CHECK (is_staff((SELECT auth.uid())));

ALTER POLICY transactions_update_staff ON public.transactions
  USING (is_staff((SELECT auth.uid())))
  WITH CHECK (is_staff((SELECT auth.uid())));

ALTER POLICY recovery_fund_user_select ON public.recovery_fund_ledger
  USING (user_id = (SELECT auth.uid()));

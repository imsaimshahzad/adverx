-- Restore the intended daily ad limits for the lifetime plans.
-- Starter = 5, Growth = 7, Pro = 9.
update public.plans set ads_per_day = 5 where lower(name) = 'starter' and price_pkr = 300;
update public.plans set ads_per_day = 7 where lower(name) = 'growth' and price_pkr = 600;
update public.plans set ads_per_day = 9 where lower(name) = 'pro' and price_pkr = 900;

-- SECURITY DEFINER admin RPCs remain callable by signed-in admins,
-- but are no longer callable anonymously. Each function enforces is_admin().
revoke execute on function public.admin_adjust_ledger(uuid,numeric,text) from anon;
revoke execute on function public.admin_adjust_user_reserve(uuid,numeric,text) from anon;
revoke execute on function public.admin_approve_deposit(uuid,text,text) from anon;
revoke execute on function public.admin_broadcast_notification(text,text) from anon;
revoke execute on function public.admin_dispatch_notification(uuid,text,text) from anon;
revoke execute on function public.admin_profit_ledger_page() from anon;
revoke execute on function public.admin_profit_summary() from anon;
revoke execute on function public.admin_remove_user(uuid) from anon;
revoke execute on function public.admin_reply_support_ticket(uuid,text,text) from anon;
revoke execute on function public.admin_set_user_status(uuid,text) from anon;
revoke execute on function public.admin_transition_withdrawal(uuid,text) from anon;
revoke execute on function public.admin_use_recovery_fund(numeric,text,uuid,text,text) from anon;
revoke execute on function public.admin_users_page(text,text,integer,integer) from anon;
revoke execute on function public.reverse_approved_purchase(uuid,text) from anon;
revoke execute on function public.review_withdrawal(uuid,text,text) from anon;

-- User-facing SECURITY DEFINER RPCs also must not be callable anonymously.
revoke execute on function public.complete_ad(uuid) from anon;
revoke execute on function public.complete_ad_view(uuid,text) from anon;
revoke execute on function public.is_admin() from anon;
revoke execute on function public.is_staff(uuid) from anon;
revoke execute on function public.next_random_public_uid() from anon;
revoke execute on function public.normalize_profile_referral_fields() from anon, authenticated;
revoke execute on function public.request_withdrawal(numeric,text,text,text) from anon;
revoke execute on function public.start_ad_view(uuid) from anon;
revoke execute on function public.submit_deposit(numeric,text,text,text,uuid) from anon;

-- Trigger-only SECURITY DEFINER functions must not be callable through the API.
revoke execute on function public.sync_approved_plan_snapshot() from anon, authenticated;
revoke execute on function public.audit_completion_event() from anon, authenticated;
revoke execute on function public.audit_deposit_event() from anon, authenticated;
revoke execute on function public.audit_reward_event() from anon, authenticated;
revoke execute on function public.audit_withdrawal_event() from anon, authenticated;

-- Keep the audit trigger function on a fixed search path.
alter function public.prevent_audit_logs_mutation()
  set search_path = public, pg_catalog;

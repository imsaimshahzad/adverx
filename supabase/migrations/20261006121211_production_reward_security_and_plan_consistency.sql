-- Production reward/security hardening applied to the live ADVERX database.
-- Legacy complete_ad() is disabled; trigger-only SECURITY DEFINER functions are not
-- callable through the Data API; public/anon function execution is opt-in; plan
-- metadata matches the current purchase allocation behavior.
revoke execute on function public.complete_ad(uuid) from public, anon, authenticated;

revoke execute on function public.audit_completion_event() from public, anon, authenticated;
revoke execute on function public.audit_deposit_event() from public, anon, authenticated;
revoke execute on function public.audit_reward_event() from public, anon, authenticated;
revoke execute on function public.audit_withdrawal_event() from public, anon, authenticated;
revoke execute on function public.notify_admin_on_pending_deposit() from public, anon, authenticated;
revoke execute on function public.notify_admin_on_pending_withdrawal() from public, anon, authenticated;
revoke execute on function public.notify_admin_on_new_support_ticket() from public, anon, authenticated;
revoke execute on function public.notify_admin_on_user_support_reply() from public, anon, authenticated;
revoke execute on function public.notify_user_on_notification() from public, anon, authenticated;
revoke execute on function public.assign_public_uid() from public, anon, authenticated;
revoke execute on function public.normalize_profile_referral_fields() from public, anon, authenticated;

revoke execute on all functions in schema public from public;
revoke execute on all functions in schema public from anon;
grant execute on function public.get_referral_count(text) to anon;

alter default privileges for role postgres in schema public
  revoke execute on functions from public;
alter default privileges for role postgres in schema public
  revoke execute on functions from anon, authenticated;

update public.plans
set
  indirect_referral_pct = case
    when lower(name) in ('starter','growth','pro') then round((8.0 / 300.0 * 100.0)::numeric, 10)
    else indirect_referral_pct
  end,
  daily_ads = ads_per_day,
  updated_at = now()
where lower(name) in ('starter','growth','pro');

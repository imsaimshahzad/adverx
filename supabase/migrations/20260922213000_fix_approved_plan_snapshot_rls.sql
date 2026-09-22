-- Deposit approval updates deposits as an authenticated admin.
-- The AFTER UPDATE trigger creates the user's plan row, so the trigger
-- function must run with its owner's privileges rather than the caller's RLS.
alter function public.sync_approved_plan_snapshot()
  security definer;

alter function public.sync_approved_plan_snapshot()
  set search_path = public, pg_catalog;

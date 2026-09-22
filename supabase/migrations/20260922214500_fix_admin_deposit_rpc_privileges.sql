-- Deposit approval is an admin-only RPC. It performs the complete accounting
-- transaction across protected tables, so it must execute with definer privileges.
-- The function itself still enforces public.is_admin() before doing any work.
alter function public.admin_approve_deposit(uuid, text, text)
  security definer;

alter function public.admin_approve_deposit(uuid, text, text)
  set search_path = public, pg_catalog;

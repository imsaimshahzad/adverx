-- Trigger-only helper; must not be callable as a PostgREST RPC.
REVOKE EXECUTE ON FUNCTION public.sync_wallet_transaction_withdrawal_status() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.sync_wallet_transaction_withdrawal_status() FROM anon;
REVOKE EXECUTE ON FUNCTION public.sync_wallet_transaction_withdrawal_status() FROM authenticated;

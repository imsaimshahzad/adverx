-- Preserve wallet_transactions_type_check and historical rows.
-- The live schema permits the existing vocabulary (including WITHDRAWAL,
-- TASK_REWARD, REFERRAL_REWARD, DEPOSIT, PLAN_ACTIVATION, REFUND,
-- REVERSAL, and ADMIN_ADJUSTMENT). Existing RPC definitions are normalized
-- through the Supabase migration executor to use that vocabulary.

-- No CHECK constraint is dropped or weakened in this migration.

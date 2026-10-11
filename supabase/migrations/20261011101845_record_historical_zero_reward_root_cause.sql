-- Record the confirmed historical cause without changing reward or wallet balances.
-- Five legacy Starter reward transactions have amount=0 while daily_reward_before_pkr=15
-- and reserve_before_pkr remained positive. The previous hard daily monetary cap was reached.
-- Their exact randomized intended reward was not persisted, so no fabricated backfill is issued.
INSERT INTO public.audit_logs(actor_id, action, entity_type, entity_id, metadata)
SELECT
  'dfe99973-80f9-480c-86e5-725197e83df3'::uuid,
  'HISTORICAL_ZERO_REWARD_ROOT_CAUSE_CONFIRMED',
  'reward_transactions',
  'ec07375c-942c-4b24-abdb-13663e64544d'::uuid,
  jsonb_build_object(
    'audit_date', '2026-10-11',
    'root_cause', 'legacy_hard_daily_monetary_cap',
    'zero_reward_transaction_ids', jsonb_build_array(
      'ec07375c-942c-4b24-abdb-13663e64544d',
      'fd3796b2-fda5-4700-a6dc-7e36b95e3e86',
      'afdf1d36-169a-409e-974f-12fd4653fc4d',
      'd69c6a4a-9b4f-480b-83b7-dadd2af13f07',
      'c94f388b-60e0-4c5a-b2ae-85eea983c196'
    ),
    'positive_reserve_snapshots_preserved', true,
    'daily_reward_before_pkr', 15,
    'daily_reward_after_pkr', 15,
    'historical_randomized_reward_amount_reconstructible', false,
    'wallet_balance_changed', false,
    'reward_history_overwritten', false,
    'resolution', 'future logic corrected; historical amount not fabricated'
  )
WHERE NOT EXISTS (
  SELECT 1
  FROM public.audit_logs
  WHERE action = 'HISTORICAL_ZERO_REWARD_ROOT_CAUSE_CONFIRMED'
    AND metadata->>'audit_date' = '2026-10-11'
);

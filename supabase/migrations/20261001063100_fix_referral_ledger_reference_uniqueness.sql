-- Allow multiple ledger entries for the same purchase when they belong to different users.
-- A single plan purchase can legitimately create direct and multiple indirect
-- referral commission ledger entries sharing the same reference_id.
drop index if exists public.ledger_entries_reference_once;

create unique index ledger_entries_reference_once
  on public.ledger_entries using btree (entry_type, reference_id, user_id)
  where reference_id is not null;

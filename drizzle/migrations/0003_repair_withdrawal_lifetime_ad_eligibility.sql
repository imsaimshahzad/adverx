alter table public.withdrawals add column if not exists hold_amount numeric not null default 0;
alter table public.withdrawals add column if not exists reviewed_by uuid null;
alter table public.withdrawals add column if not exists reviewed_at timestamptz null;
alter table public.withdrawals add column if not exists refunded_at timestamptz null;

update public.withdrawals
set hold_amount = amount
where hold_amount = 0 and status in ('pending', 'under_review', 'approved', 'processing');

create unique index if not exists withdrawals_user_request_key_uidx
on public.withdrawals(user_id, request_key)
where request_key is not null;

create index if not exists withdrawals_user_status_created_idx
on public.withdrawals(user_id, status, created_at desc);

-- Canonical RPC definitions are applied through the Supabase migration tool because
-- the live project is the source of truth for function signatures and privileges.

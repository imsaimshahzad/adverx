-- Store IP-derived access signals for manual fraud review.
-- Raw IP and location are restricted to the service role; no client policies are created.
create table if not exists public.user_access_signals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  ip_address inet,
  country text,
  region text,
  city text,
  user_agent text,
  source text not null default 'auth',
  created_at timestamptz not null default now()
);

create index if not exists user_access_signals_user_created_idx
  on public.user_access_signals (user_id, created_at desc);
create index if not exists user_access_signals_ip_created_idx
  on public.user_access_signals (ip_address, created_at desc)
  where ip_address is not null;

alter table public.user_access_signals enable row level security;
revoke all on public.user_access_signals from anon, authenticated;
grant all on public.user_access_signals to service_role;

comment on table public.user_access_signals is
  'Security/fraud-review access metadata. IP-derived city/region is approximate and must not be treated as proof of identity.';

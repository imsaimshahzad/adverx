create table if not exists public.impersonation_grants (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references auth.users(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  token_digest text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists impersonation_grants_expires_at_idx
  on public.impersonation_grants (expires_at);

alter table public.impersonation_grants enable row level security;

revoke all on table public.impersonation_grants from anon, authenticated;

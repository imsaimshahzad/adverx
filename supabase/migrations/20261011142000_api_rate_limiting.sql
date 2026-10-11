-- Shared, atomic rate-limit buckets for serverless API routes.
-- No wallet, reward, referral, deposit, or withdrawal data is touched.
create table if not exists public.api_rate_limit_buckets (
  bucket_key text not null check (bucket_key ~ '^[a-f0-9]{64}$'),
  route_key text not null check (length(route_key) between 1 and 100),
  window_start timestamptz not null,
  request_count integer not null check (request_count >= 1),
  updated_at timestamptz not null default now(),
  primary key (bucket_key, route_key, window_start)
);

create index if not exists api_rate_limit_buckets_window_start_idx
  on public.api_rate_limit_buckets (window_start);

alter table public.api_rate_limit_buckets enable row level security;
revoke all on table public.api_rate_limit_buckets from anon, authenticated;

create or replace function public.consume_api_rate_limit(
  p_bucket_key text,
  p_route_key text,
  p_limit integer,
  p_window_seconds integer
)
returns table(allowed boolean, remaining integer, reset_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_window_start timestamptz;
  v_count integer;
begin
  if p_bucket_key !~ '^[a-f0-9]{64}$'
    or p_route_key is null
    or length(p_route_key) < 1
    or length(p_route_key) > 100
    or p_limit < 1
    or p_limit > 10000
    or p_window_seconds < 1
    or p_window_seconds > 86400 then
    raise exception 'Invalid rate limit parameters';
  end if;

  v_window_start := to_timestamp(
    floor(extract(epoch from v_now) / p_window_seconds) * p_window_seconds
  );

  insert into public.api_rate_limit_buckets as current_bucket
    (bucket_key, route_key, window_start, request_count, updated_at)
  values
    (p_bucket_key, p_route_key, v_window_start, 1, v_now)
  on conflict (bucket_key, route_key, window_start)
  do update set
    request_count = current_bucket.request_count + 1,
    updated_at = excluded.updated_at
  returning request_count into v_count;

  -- Opportunistic bounded-retention cleanup; no raw IP or token is stored.
  if mod(extract(epoch from v_now)::bigint, 60) = 0 then
    delete from public.api_rate_limit_buckets
    where window_start < v_now - interval '1 day';
  end if;

  return query select
    (v_count <= p_limit),
    greatest(0, p_limit - v_count),
    v_window_start + make_interval(secs => p_window_seconds);
end;
$$;

revoke all on function public.consume_api_rate_limit(text, text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.consume_api_rate_limit(text, text, integer, integer)
  to service_role;

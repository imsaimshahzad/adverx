-- Keep only the latest IP-derived access signal for each account.
-- Preserve the newest record if older deployments created duplicates.
with ranked as (
  select id, row_number() over (partition by user_id order by created_at desc, id desc) as rn
  from public.user_access_signals
)
delete from public.user_access_signals s
using ranked r
where s.id = r.id and r.rn > 1;

create unique index if not exists user_access_signals_user_id_uidx
  on public.user_access_signals (user_id);

-- Keep only the latest IP activity record for each account.
-- New real sign-ins update this row instead of creating a history list.
with ranked as (
  select id, row_number() over (
    partition by user_id
    order by created_at desc, id desc
  ) as position
  from public.user_access_signals
)
delete from public.user_access_signals s
using ranked r
where s.id = r.id and r.position > 1;

create unique index if not exists user_access_signals_one_row_per_user_idx
  on public.user_access_signals (user_id);

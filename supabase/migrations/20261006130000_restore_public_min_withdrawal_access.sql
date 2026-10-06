-- The homepage needs the aggregate minimum withdrawal value without exposing
-- the underlying withdrawal methods table. Keep the view limited to the minimum.
create or replace view public.public_min_withdrawal
as
select min(min_withdrawal_pkr) as min_withdrawal_pkr
from public.withdrawal_methods
where is_active = true
  and min_withdrawal_pkr > 0;

grant select on public.public_min_withdrawal to anon, authenticated;

-- Make the public withdrawal minimum view use the caller's RLS/privileges.
create or replace view public.public_min_withdrawal
with (security_invoker = true)
as
select min(min_withdrawal_pkr) as min_withdrawal_pkr
from public.withdrawal_methods
where is_active = true
  and min_withdrawal_pkr > 0;

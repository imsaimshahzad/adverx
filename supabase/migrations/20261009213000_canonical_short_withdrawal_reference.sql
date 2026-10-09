alter table public.withdrawals
add column if not exists reference_code text generated always as ('WD-' || upper(left(replace(id::text, '-', ''), 10))) stored;

create or replace function public.admin_get_activity_reports(p_report_type text default 'all')
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_result jsonb;
  v_type text := lower(coalesce(nullif(trim(p_report_type), ''), 'all'));
begin
  if not public.is_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;

  if v_type not in ('all', 'deposits', 'withdrawals', 'rewards', 'referrals', 'plans') then
    raise exception 'Unsupported report type';
  end if;

  select coalesce(jsonb_agg(activity.row_data order by activity.sort_at desc nulls last), '[]'::jsonb)
    into v_result
  from (
    select jsonb_build_object('id', d.id, 'user_id', d.user_id, 'amount', d.amount, 'status', d.status,
      'created_at', d.created_at, 'method', d.method,
      'transaction_no', coalesce(nullif(d.transaction_id, ''), d.id::text),
      'record_id', d.id::text, 'report_type', 'deposits') as row_data, d.created_at as sort_at
    from (select * from public.deposits order by created_at desc limit 1000) d
    where v_type in ('all', 'deposits')
    union all
    select jsonb_build_object('id', w.id, 'user_id', w.user_id, 'amount', w.amount, 'status', w.status,
      'created_at', w.created_at, 'method', w.method, 'transaction_no', w.reference_code, 'record_id', w.reference_code, 'reference_code', w.reference_code,
      'rejection_reason', w.rejection_reason, 'report_type', 'withdrawals'), w.created_at
    from (select * from public.withdrawals order by created_at desc limit 1000) w
    where v_type in ('all', 'withdrawals')
    union all
    select jsonb_build_object('id', l.id, 'user_id', l.user_id, 'amount', l.amount, 'status', 'recorded',
      'created_at', l.created_at, 'method', l.entry_type, 'entry_type', l.entry_type, 'note', l.note,
      'transaction_no', coalesce(l.reference_id::text, l.id::text), 'record_id', l.id::text, 'report_type', 'rewards'), l.created_at
    from (select * from public.ledger_entries where entry_type = 'ad_reward' order by created_at desc limit 1000) l
    where v_type in ('all', 'rewards')
    union all
    select jsonb_build_object('id', c.id, 'user_id', c.user_id, 'amount', c.amount, 'status', c.status,
      'created_at', c.created_at, 'method', coalesce(c.source, 'referral'), 'source', c.source, 'level', c.level,
      'transaction_no', c.id::text, 'record_id', c.id::text, 'report_type', 'referrals'), c.created_at
    from (select * from public.referral_commissions order by created_at desc limit 1000) c
    where v_type in ('all', 'referrals')
    union all
    select jsonb_build_object('id', t.id, 'user_id', t.user_id, 'amount', t.amount, 'status', t.status,
      'created_at', t.created_at, 'method', t.kind, 'kind', t.kind, 'description', t.description,
      'transaction_no', t.transaction_no, 'record_id', coalesce(t.transaction_no, t.id::text), 'report_type', 'plans'), t.created_at
    from (select * from public.transactions where kind = 'PLAN_PURCHASE' order by created_at desc limit 1000) t
    where v_type in ('all', 'plans')
  ) activity;

  return v_result;
end;
$function$;

revoke all on function public.admin_get_activity_reports(text) from public, anon;
grant execute on function public.admin_get_activity_reports(text) to authenticated;

-- Persist boost details for future reward audits. Live function patch was applied separately.
do $$
declare
  d text;
  n text;
begin
  select pg_get_functiondef('public.complete_ad_view(uuid,text)'::regprocedure) into d;
  n := replace(d,
    '''earning_rating_pct'', v_earning_rating,',
    '''earning_rating_pct'', v_earning_rating,' || E'\n' ||
    '        ''referral_boost_pct'', v_referral_boost_pct,' || E'\n' ||
    '        ''team_boost_pct'', v_team_boost_pct,' || E'\n' ||
    '        ''total_boost_pct'', v_total_boost_pct,' || E'\n' ||
    '        ''active_direct_referrals_7d'', v_active_direct_referrals,');
  if n <> d and position('total_boost_pct' in d) = 0 then execute n; end if;
end $$;
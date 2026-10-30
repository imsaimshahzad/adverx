create or replace function public.run_referral_nudge_notifications()
returns jsonb language plpgsql security definer set search_path = pg_catalog, public
as $function$
declare
  v_user record; v_status text; v_previous_status text; v_last_sent_at timestamptz;
  v_due boolean; v_sent integer := 0; v_checked integer := 0; v_now timestamptz := now();
  v_secret text; v_title text; v_body text;
begin
  perform pg_advisory_xact_lock(hashtext('adverx_referral_nudge_notifications'));
  select webhook_secret into v_secret from public.admin_push_config where id=true;
  for v_user in
    select p.id as user_id,
      greatest(coalesce(up.original_reward_reserve_pkr,up.reward_budget_pkr,0)+coalesce(up.referral_reward_allocated_pkr,0),0) allocated,
      greatest(coalesce(up.remaining_reward_budget_pkr,0)+coalesce(p.recovery_reserve_pkr,0),0) remaining
    from public.profiles p
    join lateral (
      select up.* from public.user_plans up
      where up.user_id=p.id and up.status='active'
        and (up.lifetime_access=true or (up.lifetime_access=false and up.expires_at is not null and up.expires_at>v_now))
      order by up.purchased_at desc,up.created_at desc limit 1
    ) up on true
    where coalesce(p.role,'') not in ('admin','super_admin','moderator')
      and coalesce(p.status,'active')='active'
  loop
    v_checked:=v_checked+1;
    if v_user.remaining<=0 then v_status:='exhausted';
    elsif v_user.allocated>0 and v_user.remaining/v_user.allocated*100<20 then v_status:='low';
    elsif v_user.allocated>0 and v_user.remaining/v_user.allocated*100<=50 then v_status:='medium';
    else v_status:='normal'; end if;
    select s.last_status,s.last_sent_at into v_previous_status,v_last_sent_at
    from public.referral_nudge_notification_state s where s.user_id=v_user.user_id for update;
    v_due:=false;
    if not found or v_previous_status is distinct from v_status then v_due:=true;
    elsif v_status='normal' then v_due:=v_last_sent_at is null or v_last_sent_at<=v_now-interval '7 days';
    elsif v_status='medium' then v_due:=v_last_sent_at is null or v_last_sent_at<=v_now-interval '5 days';
    elsif v_status='low' then v_due:=v_last_sent_at is null or v_last_sent_at<=v_now-interval '3 days';
    else v_due:=false; end if;
    if v_due then
      v_title:=case v_status when 'exhausted' then 'Ad rewards paused' when 'low' then 'Keep your earning journey active' when 'medium' then 'Your AdverX network is growing' else 'Keep growing with AdverX' end;
      v_body:=case v_status
        when 'exhausted' then 'Your AdverX ad rewards are currently paused because your earning reserve has been fully used. Refer an eligible new user; any applicable reserve credit is subject to verification and platform rules. Ad rewards can resume automatically after an eligible reserve credit is recorded. Open /network to refer now.'
        when 'low' then 'Keep your earning journey active. Invite eligible new users through your referral link to support earning continuity. Open /network to refer now.'
        when 'medium' then 'Your AdverX network is growing. Invite more friends today and keep building your earning journey. Open /network to refer now.'
        else 'Keep growing with AdverX. Invite friends, build your network and explore more earning opportunities. Open /network to refer now.'
      end;
      insert into public.notifications(user_id,title,body) values(v_user.user_id,v_title,v_body);
      if v_status='exhausted' and v_secret is not null then
        perform net.http_post(
          url:='https://iozdfcsounatmcqmgoct.supabase.co/functions/v1/referral-nudge-email',
          headers:=jsonb_build_object('Content-Type','application/json','x-adverx-push-secret',v_secret),
          body:=jsonb_build_object('action','referral_nudge_email','user_id',v_user.user_id,'title',v_title,'body',v_body)
        );
      end if;
      v_sent:=v_sent+1;
      insert into public.referral_nudge_notification_state(user_id,last_status,last_sent_at,updated_at)
      values(v_user.user_id,v_status,v_now,v_now)
      on conflict(user_id) do update set last_status=excluded.last_status,last_sent_at=excluded.last_sent_at,updated_at=excluded.updated_at;
    end if;
  end loop;
  return jsonb_build_object('checked',v_checked,'sent',v_sent,'ran_at',v_now);
end;
$function$;
revoke all on function public.run_referral_nudge_notifications() from public,anon,authenticated;
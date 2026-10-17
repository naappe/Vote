-- Keep privilege-elevated implementations outside the exposed public schema.
-- Public RPC wrappers remain SECURITY INVOKER and validate identity internally.

create or replace function vote_private.list_mdp_user_access()
returns table(user_id uuid)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not exists (
    select 1 from public.user_roles r
    where r.user_id = (select auth.uid()) and r.active is true and r.role = 'admin'
  ) then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;
  return query select a.user_id from public.mdp_user_access a where a.allowed is true;
end;
$$;
revoke all on function vote_private.list_mdp_user_access() from public, anon;
grant execute on function vote_private.list_mdp_user_access() to authenticated;

create or replace function public.mdp_list_user_access()
returns table(user_id uuid)
language sql stable security invoker set search_path = '' as $$
  select * from vote_private.list_mdp_user_access()
$$;
revoke all on function public.mdp_list_user_access() from public, anon;
grant execute on function public.mdp_list_user_access() to authenticated;

create or replace function vote_private.set_mdp_user_access(p_user_id uuid, p_allowed boolean)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (
    select 1 from public.user_roles r
    where r.user_id = (select auth.uid()) and r.active is true and r.role = 'admin'
  ) then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;
  if p_user_id is null or not exists (
    select 1 from public.user_roles r
    where r.user_id = p_user_id and r.active is true
      and r.role in ('admin','supervisor','call_agent','field_agent','election_operator')
  ) then
    raise exception 'Choose an active operations staff account';
  end if;
  insert into public.mdp_user_access(user_id, allowed, updated_by, updated_at)
  values (p_user_id, coalesce(p_allowed, false), (select auth.uid()), now())
  on conflict (user_id) do update
    set allowed = excluded.allowed,
        updated_by = excluded.updated_by,
        updated_at = excluded.updated_at;
end;
$$;
revoke all on function vote_private.set_mdp_user_access(uuid,boolean) from public, anon;
grant execute on function vote_private.set_mdp_user_access(uuid,boolean) to authenticated;

create or replace function public.mdp_set_user_access(p_user_id uuid, p_allowed boolean)
returns void
language sql security invoker set search_path = '' as $$
  select vote_private.set_mdp_user_access(p_user_id, p_allowed)
$$;
revoke all on function public.mdp_set_user_access(uuid,boolean) from public, anon;
grant execute on function public.mdp_set_user_access(uuid,boolean) to authenticated;

create or replace function vote_private.set_resident_vote(
  p_resident_id bigint,
  p_voting_day_id uuid,
  p_has_voted boolean
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  current_actor uuid := auth.uid();
  current_role text := vote_private.staff_role();
  changed integer := 0;
begin
  if current_actor is null or not vote_private.mdp_has_access()
    or current_role not in ('admin','supervisor','election_operator') then
    raise exception 'Turnout access denied. Ask an administrator to enable MDP access for your account.' using errcode = '42501';
  end if;
  if not exists (select 1 from public.voting_days d where d.id = p_voting_day_id and d.active is true) then
    raise exception 'Voting day is unavailable';
  end if;
  if p_has_voted then
    insert into public.resident_voting_status(resident_id,voting_day_id,voted_at,recorded_by)
    values (p_resident_id,p_voting_day_id,now(),current_actor)
    on conflict (resident_id,voting_day_id) do nothing;
    get diagnostics changed = row_count;
    if changed > 0 then
      insert into public.resident_voting_status_events(resident_id,voting_day_id,action,actor_id)
      values (p_resident_id,p_voting_day_id,'marked_voted',current_actor);
    end if;
  else
    delete from public.resident_voting_status
    where resident_id=p_resident_id and voting_day_id=p_voting_day_id;
    get diagnostics changed = row_count;
    if changed > 0 then
      insert into public.resident_voting_status_events(resident_id,voting_day_id,action,actor_id)
      values (p_resident_id,p_voting_day_id,'undo',current_actor);
    end if;
  end if;
end;
$$;
revoke all on function vote_private.set_resident_vote(bigint,uuid,boolean) from public, anon;
grant execute on function vote_private.set_resident_vote(bigint,uuid,boolean) to authenticated;

create or replace function public.mdp_set_resident_vote(
  p_resident_id bigint,
  p_voting_day_id uuid,
  p_has_voted boolean
) returns void
language sql security invoker set search_path = '' as $$
  select vote_private.set_resident_vote(p_resident_id, p_voting_day_id, p_has_voted)
$$;
revoke all on function public.mdp_set_resident_vote(bigint,uuid,boolean) from public, anon;
grant execute on function public.mdp_set_resident_vote(bigint,uuid,boolean) to authenticated;

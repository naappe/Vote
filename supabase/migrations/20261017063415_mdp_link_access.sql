-- Restrict the MDP workspace to explicitly approved active staff accounts.
-- Existing staff roles and resident records remain unchanged.

create table if not exists public.mdp_user_access (
  user_id uuid primary key references auth.users(id) on delete cascade,
  allowed boolean not null default false,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.mdp_user_access enable row level security;
revoke all on public.mdp_user_access from public, anon, authenticated;
grant select on public.mdp_user_access to authenticated;

create policy mdp_user_access_read_own on public.mdp_user_access
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy mdp_user_access_admin_read on public.mdp_user_access
  for select to authenticated
  using ((select vote_private.staff_role()) = 'admin');

create or replace function vote_private.mdp_has_access()
returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.mdp_user_access a
    join public.user_roles r on r.user_id = a.user_id
    where a.user_id = (select auth.uid())
      and a.allowed is true
      and r.active is true
      and r.role in ('admin','supervisor','call_agent','field_agent','election_operator')
  )
$$;
revoke all on function vote_private.mdp_has_access() from public, anon;
grant execute on function vote_private.mdp_has_access() to authenticated;

create or replace function public.mdp_has_access()
returns boolean
language sql stable security invoker set search_path = '' as $$
  select vote_private.mdp_has_access()
$$;
revoke all on function public.mdp_has_access() from public, anon;
grant execute on function public.mdp_has_access() to authenticated;

create or replace function public.mdp_list_user_access()
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
revoke all on function public.mdp_list_user_access() from public, anon;
grant execute on function public.mdp_list_user_access() to authenticated;

create or replace function public.mdp_set_user_access(p_user_id uuid, p_allowed boolean)
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
revoke all on function public.mdp_set_user_access(uuid,boolean) from public, anon;
grant execute on function public.mdp_set_user_access(uuid,boolean) to authenticated;

-- Existing MDP-specific turnout and transport-link records also require an
-- explicit grant; generic active staff roles alone are no longer sufficient.
drop policy if exists mdp_voting_days_staff_read on public.voting_days;
create policy mdp_voting_days_staff_read on public.voting_days
  for select to authenticated
  using ((select vote_private.mdp_has_access()));

drop policy if exists mdp_voting_days_admin_write on public.voting_days;
create policy mdp_voting_days_admin_write on public.voting_days
  for all to authenticated
  using ((select vote_private.mdp_has_access()) and (select vote_private.staff_role()) in ('admin','supervisor'))
  with check ((select vote_private.mdp_has_access()) and (select vote_private.staff_role()) in ('admin','supervisor'));

drop policy if exists mdp_turnout_staff_read on public.resident_voting_status;
create policy mdp_turnout_staff_read on public.resident_voting_status
  for select to authenticated
  using ((select vote_private.mdp_has_access()));

drop policy if exists mdp_turnout_events_staff_read on public.resident_voting_status_events;
create policy mdp_turnout_events_staff_read on public.resident_voting_status_events
  for select to authenticated
  using ((select vote_private.mdp_has_access()));

drop policy if exists mdp_transport_links_staff_read on public.transport_request_links;
create policy mdp_transport_links_staff_read on public.transport_request_links
  for select to authenticated
  using ((select vote_private.mdp_has_access()));

drop policy if exists mdp_transport_links_staff_write on public.transport_request_links;
create policy mdp_transport_links_staff_write on public.transport_request_links
  for all to authenticated
  using ((select vote_private.mdp_has_access()) and (select vote_private.staff_role()) in ('admin','supervisor','election_operator'))
  with check ((select vote_private.mdp_has_access()) and (select vote_private.staff_role()) in ('admin','supervisor','election_operator'));

-- SECURITY DEFINER RPCs must enforce the same grant inside the function.
create or replace function public.mdp_set_resident_vote(
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
revoke all on function public.mdp_set_resident_vote(bigint,uuid,boolean) from public, anon;
grant execute on function public.mdp_set_resident_vote(bigint,uuid,boolean) to authenticated;

-- A staff user without an explicit grant receives an empty directory result,
-- even when calling the RPC directly rather than entering through the UI.
create or replace function public.mdp_voting_residents(
  p_voting_day_id uuid,
  p_page integer default 1,
  p_page_size integer default 30,
  p_search text default ''
) returns jsonb
language sql stable security invoker set search_path = '' as $$
  with filtered as materialized (
    select r.id,r.name,r.national_id,r.house,r.lives_in,r.phone,r.election_box
    from public."Resident" r
    where vote_private.mdp_has_access()
      and (coalesce(btrim(p_search),'')=''
        or lower(concat_ws(' ',r.id::text,r.name,r.national_id,r.house,r.lives_in,r.phone::text,r.election_box))
          like '%'||lower(btrim(p_search))||'%')
  ), page_rows as (
    select f.*, (v.resident_id is not null) as has_voted, v.voted_at,
      t.transport_status,
      note.remark as latest_remark,
      note.section as latest_remark_section,
      note.recorded_at as latest_remark_at
    from filtered f
    left join public.resident_voting_status v
      on v.resident_id=f.id and v.voting_day_id=p_voting_day_id
    left join public.transportation t on t.resident_id=f.id
    left join lateral (
      select r.remark,r.section,r.recorded_at
      from public.remarks r
      where r.resident_id=f.id
      order by r.recorded_at desc nulls last
      limit 1
    ) note on true
    order by f.id
    limit greatest(1,least(100,p_page_size))
    offset (greatest(1,p_page)-1)::bigint*greatest(1,least(100,p_page_size))
  )
  select jsonb_build_object(
    'count',(select count(*) from filtered),
    'rows',coalesce((select jsonb_agg(to_jsonb(p) order by p.id) from page_rows p),'[]'::jsonb)
  )
$$;
revoke all on function public.mdp_voting_residents(uuid,integer,integer,text) from public, anon;
grant execute on function public.mdp_voting_residents(uuid,integer,integer,text) to authenticated;

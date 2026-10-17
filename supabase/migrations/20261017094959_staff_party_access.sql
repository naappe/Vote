-- Give staff an explicit resident-party scope. Main app access continues to
-- follow user_roles.active; MDP workspace access remains a separate grant.
create table if not exists public.staff_party_access (
  user_id uuid primary key references auth.users(id) on delete cascade,
  party_scope text not null check (party_scope in ('MDP','PNC','ALL')),
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.staff_party_access enable row level security;
revoke all on public.staff_party_access from public, anon, authenticated;
grant select on public.staff_party_access to authenticated;
drop policy if exists staff_party_access_read_own on public.staff_party_access;
create policy staff_party_access_read_own on public.staff_party_access
  for select to authenticated using (user_id=(select auth.uid()));
drop policy if exists staff_party_access_admin_read on public.staff_party_access;
create policy staff_party_access_admin_read on public.staff_party_access
  for select to authenticated using ((select vote_private.staff_role())='admin');

-- Keep the existing allowlist grants and give admins their existing all-data
-- administrator scope. All other staff default to no resident rows until an
-- administrator assigns MDP or PNC.
insert into public.staff_party_access(user_id,party_scope)
select user_id,'MDP' from public.mdp_user_access where allowed is true
on conflict(user_id) do nothing;
insert into public.staff_party_access(user_id,party_scope)
select user_id,'ALL' from public.user_roles where active is true and role='admin'
on conflict(user_id) do update set party_scope='ALL',updated_at=now();

create or replace function vote_private.staff_party_scope()
returns text language sql stable security definer set search_path='' as $$
  select case
    when r.role='admin' then 'ALL'
    when a.party_scope in ('MDP','PNC') then a.party_scope
    else null
  end
  from public.user_roles r
  left join public.staff_party_access a on a.user_id=r.user_id
  where r.user_id=(select auth.uid()) and r.active is true
$$;
revoke all on function vote_private.staff_party_scope() from public,anon;
grant execute on function vote_private.staff_party_scope() to authenticated;

create or replace function vote_private.staff_can_access_resident(p_resident_id bigint)
returns boolean language sql stable security definer set search_path='' as $$
  select exists (
    select 1 from public."Resident" r
    where r.id=p_resident_id
      and (
        vote_private.staff_party_scope()='ALL'
        or upper(btrim(coalesce(r.party,'')))=vote_private.staff_party_scope()
      )
  )
$$;
revoke all on function vote_private.staff_can_access_resident(bigint) from public,anon;
grant execute on function vote_private.staff_can_access_resident(bigint) to authenticated;

create or replace function vote_private.mdp_has_access()
returns boolean language sql stable security definer set search_path='' as $$
  select vote_private.staff_party_scope() in ('MDP','ALL') and exists (
    select 1 from public.mdp_user_access a
    where a.user_id=(select auth.uid()) and a.allowed is true
  )
$$;
revoke all on function vote_private.mdp_has_access() from public,anon;
grant execute on function vote_private.mdp_has_access() to authenticated;

create or replace function vote_private.mdp_can_access_resident(p_resident_id bigint)
returns boolean language sql stable security definer set search_path='' as $$
  select vote_private.mdp_has_access() and exists(
    select 1 from public."Resident" r where r.id=p_resident_id and upper(btrim(coalesce(r.party,'')))='MDP'
  )
$$;
revoke all on function vote_private.mdp_can_access_resident(bigint) from public,anon;
grant execute on function vote_private.mdp_can_access_resident(bigint) to authenticated;

create or replace function vote_private.list_staff_party_access()
returns table(user_id uuid,party_scope text)
language plpgsql stable security definer set search_path='' as $$
begin
  if not exists(select 1 from public.user_roles r where r.user_id=(select auth.uid()) and r.active is true and r.role='admin') then
    raise exception 'Administrator access required' using errcode='42501';
  end if;
  return query select a.user_id,a.party_scope from public.staff_party_access a;
end
$$;
revoke all on function vote_private.list_staff_party_access() from public,anon;
grant execute on function vote_private.list_staff_party_access() to authenticated;
create or replace function public.staff_list_party_access()
returns table(user_id uuid,party_scope text)
language sql stable security invoker set search_path='' as $$ select * from vote_private.list_staff_party_access() $$;
revoke all on function public.staff_list_party_access() from public,anon;
grant execute on function public.staff_list_party_access() to authenticated;

create or replace function vote_private.set_staff_party_access(p_user_id uuid,p_party_scope text)
returns void language plpgsql security definer set search_path='' as $$
declare target_role text;
begin
  if not exists(select 1 from public.user_roles r where r.user_id=(select auth.uid()) and r.active is true and r.role='admin') then
    raise exception 'Administrator access required' using errcode='42501';
  end if;
  if p_user_id is null then raise exception 'Choose a staff account'; end if;
  select r.role into target_role from public.user_roles r where r.user_id=p_user_id and r.active is true;
  if target_role is null then raise exception 'Choose an active staff account'; end if;
  if p_party_scope is null or p_party_scope='' then
    delete from public.staff_party_access where user_id=p_user_id;
    update public.mdp_user_access set allowed=false,updated_by=(select auth.uid()),updated_at=now() where user_id=p_user_id;
    return;
  end if;
  if p_party_scope not in ('MDP','PNC','ALL') or (p_party_scope='ALL' and target_role<>'admin') then
    raise exception 'Choose MDP or PNC. All parties is reserved for administrators';
  end if;
  insert into public.staff_party_access(user_id,party_scope,updated_by,updated_at)
  values(p_user_id,p_party_scope,(select auth.uid()),now())
  on conflict(user_id) do update set party_scope=excluded.party_scope,updated_by=excluded.updated_by,updated_at=excluded.updated_at;
  if p_party_scope not in ('MDP','ALL') then
    update public.mdp_user_access set allowed=false,updated_by=(select auth.uid()),updated_at=now() where user_id=p_user_id;
  end if;
end
$$;
revoke all on function vote_private.set_staff_party_access(uuid,text) from public,anon;
grant execute on function vote_private.set_staff_party_access(uuid,text) to authenticated;
create or replace function public.staff_set_party_access(p_user_id uuid,p_party_scope text)
returns void language sql security invoker set search_path='' as $$ select vote_private.set_staff_party_access(p_user_id,p_party_scope) $$;
revoke all on function public.staff_set_party_access(uuid,text) from public,anon;
grant execute on function public.staff_set_party_access(uuid,text) to authenticated;

-- A party scope is enforced by RLS on resident rows and every resident-linked
-- workflow table, so changing client filters cannot reveal another party.
drop policy if exists staff_read on public."Resident";
create policy staff_read on public."Resident" for select to authenticated
  using (vote_private.staff_party_scope() is not null and vote_private.staff_can_access_resident(id));

do $$
declare t text; p record;
begin
  foreach t in array array['call_center','door_to_door','assignments','remarks','election_day','transportation','contact_verification'] loop
    for p in select policyname from pg_policies where schemaname='public' and tablename=t loop
      execute format('drop policy %I on public.%I',p.policyname,t);
    end loop;
    execute format('create policy staff_read on public.%I for select to authenticated using (vote_private.staff_can_access_resident(resident_id))',t);
    execute format('create policy staff_write on public.%I for all to authenticated using (vote_private.staff_can_access_resident(resident_id) and (select vote_private.staff_role()) in (''admin'',''supervisor'')) with check (vote_private.staff_can_access_resident(resident_id) and (select vote_private.staff_role()) in (''admin'',''supervisor''))',t);
    if t in ('call_center','remarks','contact_verification') then
      execute format('create policy call_staff_insert on public.%I for insert to authenticated with check (vote_private.staff_can_access_resident(resident_id) and (select vote_private.staff_role())=''call_agent'')',t);
    end if;
    if t='call_center' then
      execute format('create policy call_staff_update on public.%I for update to authenticated using (vote_private.staff_can_access_resident(resident_id) and (select vote_private.staff_role())=''call_agent'') with check (vote_private.staff_can_access_resident(resident_id) and (select vote_private.staff_role())=''call_agent'')',t);
    end if;
    if t in ('door_to_door','remarks','contact_verification') then
      execute format('create policy field_staff_insert on public.%I for insert to authenticated with check (vote_private.staff_can_access_resident(resident_id) and (select vote_private.staff_role())=''field_agent'')',t);
    end if;
    if t='door_to_door' then
      execute format('create policy field_staff_update on public.%I for update to authenticated using (vote_private.staff_can_access_resident(resident_id) and (select vote_private.staff_role())=''field_agent'') with check (vote_private.staff_can_access_resident(resident_id) and (select vote_private.staff_role())=''field_agent'')',t);
    end if;
    if t in ('election_day','transportation','remarks') then
      execute format('create policy election_staff_insert on public.%I for insert to authenticated with check (vote_private.staff_can_access_resident(resident_id) and (select vote_private.staff_role())=''election_operator'')',t);
    end if;
    if t in ('election_day','transportation') then
      execute format('create policy election_staff_update on public.%I for update to authenticated using (vote_private.staff_can_access_resident(resident_id) and (select vote_private.staff_role())=''election_operator'') with check (vote_private.staff_can_access_resident(resident_id) and (select vote_private.staff_role())=''election_operator'')',t);
    end if;
  end loop;
  -- Reports store aggregate JSON without resident ids; only admins may read
  -- these pre-aggregated records. Live reports use the protected workflows.
  for p in select policyname from pg_policies where schemaname='public' and tablename='reports' loop
    execute format('drop policy %I on public.reports',p.policyname);
  end loop;
  execute 'create policy reports_admin_read on public.reports for select to authenticated using ((select vote_private.staff_role())=''admin'')';
end
$$;

-- Share links are public bearer links. Staff can only create or manage links
-- whose entire resident list is within their assigned scope.
do $$ declare p record; begin
  for p in select policyname from pg_policies where schemaname='public' and tablename='workflow_shares' loop
    execute format('drop policy %I on public.workflow_shares',p.policyname);
  end loop;
end $$;
create policy staff_read on public.workflow_shares for select to authenticated using (
  (select vote_private.staff_role())='admin'
  or (vote_private.staff_party_scope() is not null and coalesce(cardinality(resident_ids),0)>0
    and not exists(select 1 from unnest(resident_ids) as ids(resident_id) where not vote_private.staff_can_access_resident(ids.resident_id)))
);
create policy staff_write on public.workflow_shares for all to authenticated using (
  (select vote_private.staff_role()) in ('admin','supervisor')
  and ((select vote_private.staff_role())='admin' or (vote_private.staff_party_scope() is not null and coalesce(cardinality(resident_ids),0)>0
    and not exists(select 1 from unnest(resident_ids) as ids(resident_id) where not vote_private.staff_can_access_resident(ids.resident_id))))
) with check (
  (select vote_private.staff_role()) in ('admin','supervisor')
  and ((select vote_private.staff_role())='admin' or (vote_private.staff_party_scope() is not null and coalesce(cardinality(resident_ids),0)>0
    and not exists(select 1 from unnest(resident_ids) as ids(resident_id) where not vote_private.staff_can_access_resident(ids.resident_id))))
);

-- Old share links are only served when their complete resident set belongs to
-- one known party. This prevents legacy mixed-party links from crossing scopes.
create or replace function vote_private.shared_workflow(p_token text) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare s public.workflow_shares%rowtype; result jsonb;
begin
  if length(coalesce(p_token,''))<20 then raise exception 'Invalid or expired share link'; end if;
  select * into s from public.workflow_shares where token=p_token and active is true and (expires_at is null or expires_at>now());
  if not found then raise exception 'Invalid or expired share link'; end if;
  if coalesce(cardinality(s.resident_ids),0)=0 or exists(
    select 1 from unnest(s.resident_ids) as ids(resident_id)
    left join public."Resident" r on r.id=ids.resident_id
    where r.id is null or upper(btrim(coalesce(r.party,''))) not in ('MDP','PNC')
  ) or (select count(distinct upper(btrim(r.party))) from unnest(s.resident_ids) as ids(resident_id) join public."Resident" r on r.id=ids.resident_id)<>1 then
    raise exception 'This share contains residents from multiple or unverified party groups';
  end if;
  select jsonb_build_object('share',to_jsonb(s),
    'residents',coalesce((select jsonb_agg(to_jsonb(r) order by r.id) from public."Resident" r where r.id=any(s.resident_ids)),'[]'::jsonb),
    'progress',case when s.workflow='assignments' then coalesce((select jsonb_agg(jsonb_build_object('resident_id',a.resident_id,'assignee_name',a.assignee_name,'assigned_at',a.assigned_at,'status',a.status)) from public.assignments a where a.notes='Submitted from share '||s.token and a.resident_id=any(s.resident_ids) and a.assignee_name=btrim(s.status_filter)),'[]'::jsonb) else '[]'::jsonb end) into result;
  return result;
end
$$;

create or replace function vote_private.submit_assignments(p_token text,p_resident_ids bigint[]) returns integer
language plpgsql security definer set search_path='' as $$
declare s public.workflow_shares%rowtype; affected integer;
begin
  if length(coalesce(p_token,''))<20 then raise exception 'Invalid or expired share link'; end if;
  select * into s from public.workflow_shares where token=p_token for update;
  if not found or s.active is not true or (s.expires_at is not null and s.expires_at<=now()) or s.workflow<>'assignments' or s.can_update is not true or coalesce(length(btrim(s.status_filter)),0)=0 then
    raise exception 'This share does not allow assignment submissions';
  end if;
  if coalesce(cardinality(s.resident_ids),0)=0 or exists(
    select 1 from unnest(s.resident_ids) as ids(resident_id)
    left join public."Resident" r on r.id=ids.resident_id
    where r.id is null or upper(btrim(coalesce(r.party,''))) not in ('MDP','PNC')
  ) or (select count(distinct upper(btrim(r.party))) from unnest(s.resident_ids) as ids(resident_id) join public."Resident" r on r.id=ids.resident_id)<>1 then
    raise exception 'This share contains residents from multiple or unverified party groups';
  end if;
  if coalesce(cardinality(p_resident_ids),0)=0 or cardinality(p_resident_ids)>10000 then raise exception 'Choose residents'; end if;
  if exists(select 1 from unnest(p_resident_ids) as selected(id) where selected.id is null or not coalesce(selected.id=any(s.resident_ids),false)) then
    raise exception 'Resident is outside this share';
  end if;
  insert into public.assignments(resident_id,assignee_name,assignment_type,status,notes,assigned_at)
  select ids.id,btrim(s.status_filter),'shared-link','active','Submitted from share '||s.token,now()
  from (select distinct unnest(p_resident_ids) as id) ids
  where not exists(select 1 from public.assignments a where a.resident_id=ids.id and lower(btrim(a.assignee_name))=lower(btrim(s.status_filter)) and a.status is distinct from 'inactive');
  get diagnostics affected=row_count;
  return affected;
end
$$;

-- Turnout and transport links are specific to the MDP workspace and also
-- inherit the assigned resident-party scope.
drop policy if exists mdp_voting_days_staff_read on public.voting_days;
create policy mdp_voting_days_staff_read on public.voting_days for select to authenticated
  using ((select vote_private.mdp_has_access()));
drop policy if exists mdp_voting_days_admin_write on public.voting_days;
create policy mdp_voting_days_admin_write on public.voting_days for all to authenticated
  using ((select vote_private.mdp_has_access()) and (select vote_private.staff_role()) in ('admin','supervisor'))
  with check ((select vote_private.mdp_has_access()) and (select vote_private.staff_role()) in ('admin','supervisor'));
drop policy if exists mdp_turnout_staff_read on public.resident_voting_status;
create policy mdp_turnout_staff_read on public.resident_voting_status for select to authenticated
  using (vote_private.mdp_can_access_resident(resident_id));
drop policy if exists mdp_turnout_events_staff_read on public.resident_voting_status_events;
create policy mdp_turnout_events_staff_read on public.resident_voting_status_events for select to authenticated
  using (vote_private.mdp_can_access_resident(resident_id));
drop policy if exists mdp_transport_links_staff_read on public.transport_request_links;
create policy mdp_transport_links_staff_read on public.transport_request_links for select to authenticated
  using (vote_private.mdp_can_access_resident(resident_id));
drop policy if exists mdp_transport_links_staff_write on public.transport_request_links;
create policy mdp_transport_links_staff_write on public.transport_request_links for all to authenticated
  using (vote_private.mdp_can_access_resident(resident_id) and (select vote_private.staff_role()) in ('admin','supervisor','election_operator'))
  with check (vote_private.mdp_can_access_resident(resident_id) and (select vote_private.staff_role()) in ('admin','supervisor','election_operator'));

-- The voting RPC runs with elevated table privileges, so validate party scope
-- inside the function as well as in RLS.
create or replace function vote_private.set_resident_vote(
  p_resident_id bigint,p_voting_day_id uuid,p_has_voted boolean
) returns void language plpgsql security definer set search_path='' as $$
declare current_actor uuid:=auth.uid(); current_role text:=vote_private.staff_role(); changed integer:=0;
begin
  if current_actor is null or not vote_private.mdp_can_access_resident(p_resident_id)
    or current_role not in ('admin','supervisor','election_operator') then
    raise exception 'Turnout access denied. Ask an administrator to enable MDP access for your account.' using errcode='42501';
  end if;
  if not exists(select 1 from public.voting_days d where d.id=p_voting_day_id and d.active is true) then
    raise exception 'Voting day is unavailable';
  end if;
  if p_has_voted then
    insert into public.resident_voting_status(resident_id,voting_day_id,voted_at,recorded_by)
    values(p_resident_id,p_voting_day_id,now(),current_actor) on conflict(resident_id,voting_day_id) do nothing;
    get diagnostics changed=row_count;
    if changed>0 then insert into public.resident_voting_status_events(resident_id,voting_day_id,action,actor_id)
      values(p_resident_id,p_voting_day_id,'marked_voted',current_actor); end if;
  else
    delete from public.resident_voting_status where resident_id=p_resident_id and voting_day_id=p_voting_day_id;
    get diagnostics changed=row_count;
    if changed>0 then insert into public.resident_voting_status_events(resident_id,voting_day_id,action,actor_id)
      values(p_resident_id,p_voting_day_id,'undo',current_actor); end if;
  end if;
end
$$;
revoke all on function vote_private.set_resident_vote(bigint,uuid,boolean) from public,anon;
grant execute on function vote_private.set_resident_vote(bigint,uuid,boolean) to authenticated;

create or replace function public.mdp_voting_residents(
  p_voting_day_id uuid,p_page integer default 1,p_page_size integer default 30,p_search text default ''
) returns jsonb language sql stable security invoker set search_path='' as $$
  with filtered as materialized (
    select r.id,r.name,r.national_id,r.house,r.lives_in,r.phone,r.election_box
    from public."Resident" r
    where vote_private.mdp_can_access_resident(r.id)
      and (coalesce(btrim(p_search),'')='' or lower(concat_ws(' ',r.id::text,r.name,r.national_id,r.house,r.lives_in,r.phone::text,r.election_box)) like '%'||lower(btrim(p_search))||'%')
  ), page_rows as (
    select f.*,(v.resident_id is not null) as has_voted,v.voted_at,t.transport_status,
      note.remark as latest_remark,note.section as latest_remark_section,note.recorded_at as latest_remark_at
    from filtered f
    left join public.resident_voting_status v on v.resident_id=f.id and v.voting_day_id=p_voting_day_id
    left join public.transportation t on t.resident_id=f.id
    left join lateral (select r.remark,r.section,r.recorded_at from public.remarks r where r.resident_id=f.id order by r.recorded_at desc nulls last limit 1) note on true
    order by f.id limit greatest(1,least(100,p_page_size)) offset (greatest(1,p_page)-1)::bigint*greatest(1,least(100,p_page_size))
  )
  select jsonb_build_object('count',(select count(*) from filtered),'rows',coalesce((select jsonb_agg(to_jsonb(p) order by p.id) from page_rows p),'[]'::jsonb))
$$;
revoke all on function public.mdp_voting_residents(uuid,integer,integer,text) from public,anon;
grant execute on function public.mdp_voting_residents(uuid,integer,integer,text) to authenticated;

-- Old direct grants cannot bypass the party assignment when someone changes
-- from MDP to PNC (or loses their scope).
create or replace function vote_private.set_mdp_user_access(p_user_id uuid,p_allowed boolean)
returns void language plpgsql security definer set search_path='' as $$
declare target_role text; target_scope text;
begin
  if not exists(select 1 from public.user_roles r where r.user_id=(select auth.uid()) and r.active is true and r.role='admin') then
    raise exception 'Administrator access required' using errcode='42501';
  end if;
  select r.role into target_role from public.user_roles r where r.user_id=p_user_id and r.active is true;
  select a.party_scope into target_scope from public.staff_party_access a where a.user_id=p_user_id;
  if target_role is null then raise exception 'Choose an active operations staff account'; end if;
  if coalesce(p_allowed,false) and not (target_scope='MDP' or (target_scope='ALL' and target_role='admin')) then
    raise exception 'Assign MDP party access before enabling the MDP link';
  end if;
  insert into public.mdp_user_access(user_id,allowed,updated_by,updated_at)
  values(p_user_id,coalesce(p_allowed,false),(select auth.uid()),now())
  on conflict(user_id) do update set allowed=excluded.allowed,updated_by=excluded.updated_by,updated_at=excluded.updated_at;
end
$$;
revoke all on function vote_private.set_mdp_user_access(uuid,boolean) from public,anon;
grant execute on function vote_private.set_mdp_user_access(uuid,boolean) to authenticated;

-- Vote access is based on server-managed membership, never user_metadata.
create schema if not exists vote_private;
revoke all on schema vote_private from public;
grant usage on schema vote_private to anon, authenticated;
create or replace function vote_private.staff_role() returns text
language sql stable security definer set search_path = '' as $$
 select role from public.user_roles where user_id=(select auth.uid()) and active is true
$$;
revoke all on function vote_private.staff_role() from public;
grant execute on function vote_private.staff_role() to authenticated;

-- Remove permissive legacy table policies and require active membership.
do $$
declare t text; p record;
begin
 foreach t in array array['Resident','call_center','door_to_door','assignments','remarks','election_day','transportation','contact_verification','reports','workflow_shares','user_roles','user_activity'] loop
  execute format('alter table public.%I enable row level security',t);
  for p in select policyname from pg_policies where schemaname='public' and tablename=t loop
   execute format('drop policy %I on public.%I',p.policyname,t);
  end loop;
  execute format('revoke all on public.%I from anon, authenticated',t);
  execute format('grant select on public.%I to authenticated',t);
  if t='user_roles' then
   execute 'create policy staff_read_own_role on public.user_roles for select to authenticated using (user_id=(select auth.uid()))';
  elsif t='user_activity' then
   execute 'create policy staff_read_own_activity on public.user_activity for select to authenticated using (user_id=(select auth.uid()) and (select vote_private.staff_role()) is not null)';
  else
   execute format('create policy staff_read on public.%I for select to authenticated using ((select vote_private.staff_role()) is not null)',t);
   if t <> 'Resident' then
    execute format('grant insert, update, delete on public.%I to authenticated',t);
    execute format('create policy staff_write on public.%I for all to authenticated using ((select vote_private.staff_role()) in (''admin'',''supervisor'')) with check ((select vote_private.staff_role()) in (''admin'',''supervisor''))',t);
    if t in ('call_center','remarks','contact_verification') then
     execute format('create policy call_staff_insert on public.%I for insert to authenticated with check ((select vote_private.staff_role()) = ''call_agent'')',t);
     if t='call_center' then execute format('create policy call_staff_update on public.%I for update to authenticated using ((select vote_private.staff_role()) = ''call_agent'') with check ((select vote_private.staff_role()) = ''call_agent'')',t); end if;
    end if;
    if t in ('door_to_door','remarks','contact_verification') then
     execute format('create policy field_staff_insert on public.%I for insert to authenticated with check ((select vote_private.staff_role()) = ''field_agent'')',t);
     if t='door_to_door' then execute format('create policy field_staff_update on public.%I for update to authenticated using ((select vote_private.staff_role()) = ''field_agent'') with check ((select vote_private.staff_role()) = ''field_agent'')',t); end if;
    end if;
    if t in ('election_day','transportation','remarks') then
     execute format('create policy election_staff_insert on public.%I for insert to authenticated with check ((select vote_private.staff_role()) = ''election_operator'')',t);
     if t<>'remarks' then execute format('create policy election_staff_update on public.%I for update to authenticated using ((select vote_private.staff_role()) = ''election_operator'') with check ((select vote_private.staff_role()) = ''election_operator'')',t); end if;
    end if;
   end if;
  end if;
 end loop;
 -- Unused legacy privileged RPCs must not remain a bypass around these policies.
 for p in select proc.oid::regprocedure as signature from pg_proc proc join pg_namespace n on n.oid=proc.pronamespace where n.nspname='public' and proc.prosecdef loop
  execute format('revoke execute on function %s from public, anon, authenticated',p.signature);
 end loop;
end $$;

-- Public RPC wrappers call private, narrowly scoped implementations.
create or replace function vote_private.shared_workflow(p_token text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare s public.workflow_shares%rowtype; result jsonb;
begin
 if length(coalesce(p_token,''))<20 then raise exception 'Invalid or expired share link'; end if;
 select * into s from public.workflow_shares where token=p_token and active is true and (expires_at is null or expires_at>now());
 if not found then raise exception 'Invalid or expired share link'; end if;
 select jsonb_build_object('share',to_jsonb(s),
  'residents',coalesce((select jsonb_agg(to_jsonb(r) order by r.id) from public."Resident" r where r.id=any(s.resident_ids)),'[]'::jsonb),
  'progress',case when s.workflow='assignments' then coalesce((select jsonb_agg(jsonb_build_object('resident_id',a.resident_id,'assignee_name',a.assignee_name,'assigned_at',a.assigned_at,'status',a.status)) from public.assignments a where a.notes='Submitted from share '||s.token and a.resident_id=any(s.resident_ids) and a.assignee_name=btrim(s.status_filter)),'[]'::jsonb) else '[]'::jsonb end) into result;
 return result;
end $$;
create or replace function public.get_vote_shared_workflow(p_token text) returns jsonb
language sql stable security invoker set search_path = '' as $$ select vote_private.shared_workflow(p_token) $$;
revoke all on function vote_private.shared_workflow(text), public.get_vote_shared_workflow(text) from public;
grant execute on function vote_private.shared_workflow(text), public.get_vote_shared_workflow(text) to anon, authenticated;

create or replace function vote_private.submit_assignments(p_token text,p_resident_ids bigint[]) returns integer
language plpgsql security definer set search_path = '' as $$
declare s public.workflow_shares%rowtype; affected integer;
begin
 if length(coalesce(p_token,''))<20 then raise exception 'Invalid or expired share link'; end if;
 select * into s from public.workflow_shares where token=p_token for update;
 if not found or s.active is not true or (s.expires_at is not null and s.expires_at<=now()) or s.workflow<>'assignments' or s.can_update is not true or coalesce(length(btrim(s.status_filter)),0)=0 then raise exception 'This share does not allow assignment submissions'; end if;
 if coalesce(cardinality(p_resident_ids),0)=0 or cardinality(p_resident_ids)>10000 then raise exception 'Choose residents'; end if;
 if exists(select 1 from unnest(p_resident_ids) r(id) where r.id is null or not coalesce(r.id=any(s.resident_ids),false)) then raise exception 'Resident is outside this share'; end if;
 insert into public.assignments(resident_id,assignee_name,assignment_type,status,notes,assigned_at)
 select r.id,btrim(s.status_filter),'shared-link','active','Submitted from share '||s.token,now()
 from (select distinct unnest(p_resident_ids) as id) r
 where not exists(select 1 from public.assignments a where a.resident_id=r.id and lower(btrim(a.assignee_name))=lower(btrim(s.status_filter)) and a.status is distinct from 'inactive');
 get diagnostics affected=row_count;
 return affected;
end $$;
create or replace function public.submit_vote_shared_assignments(p_token text,p_resident_ids bigint[]) returns integer
language sql security invoker set search_path = '' as $$ select vote_private.submit_assignments(p_token,p_resident_ids) $$;
revoke all on function vote_private.submit_assignments(text,bigint[]), public.submit_vote_shared_assignments(text,bigint[]) from public;
grant execute on function vote_private.submit_assignments(text,bigint[]), public.submit_vote_shared_assignments(text,bigint[]) to anon, authenticated;

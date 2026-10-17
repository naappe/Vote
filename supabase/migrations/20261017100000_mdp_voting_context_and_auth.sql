-- Show the latest workflow context beside turnout without exposing party data.
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
    where coalesce(btrim(p_search),'')=''
      or lower(concat_ws(' ',r.id::text,r.name,r.national_id,r.house,r.lives_in,r.phone::text,r.election_box))
        like '%'||lower(btrim(p_search))||'%'
  ), page_rows as (
    select f.*,
      (v.resident_id is not null) as has_voted,
      v.voted_at,
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
revoke all on function public.mdp_voting_residents(uuid,integer,integer,text) from public,anon;
grant execute on function public.mdp_voting_residents(uuid,integer,integer,text) to authenticated;

-- Check the active staff role against the authenticated actor directly. The
-- caller remains the only source of actor identity, and writes stay atomic.
create or replace function public.mdp_set_resident_vote(
  p_resident_id bigint,
  p_voting_day_id uuid,
  p_has_voted boolean
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  current_actor uuid := auth.uid();
  changed integer := 0;
begin
  if current_actor is null or not exists (
    select 1 from public.user_roles r
    where r.user_id=current_actor and r.active is true
      and r.role in ('admin','supervisor','election_operator')
  ) then
    raise exception 'Turnout access denied. Sign in with an active staff account that can record turnout.' using errcode = '42501';
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
revoke all on function public.mdp_set_resident_vote(bigint,uuid,boolean) from public,anon;
grant execute on function public.mdp_set_resident_vote(bigint,uuid,boolean) to authenticated;

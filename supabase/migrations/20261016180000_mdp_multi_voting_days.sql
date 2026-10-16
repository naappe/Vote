-- Add multi-day turnout and contextual transport links without changing
-- Resident rows or rewriting the existing election_day records.

create table if not exists public.voting_days (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) between 1 and 120),
  voting_date date not null unique,
  active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

create table if not exists public.resident_voting_status (
  resident_id bigint not null references public."Resident"(id) on delete cascade,
  voting_day_id uuid not null references public.voting_days(id) on delete restrict,
  voted_at timestamptz not null default now(),
  recorded_by uuid references auth.users(id) on delete set null default auth.uid(),
  primary key (resident_id, voting_day_id)
);

create table if not exists public.resident_voting_status_events (
  id bigint generated always as identity primary key,
  resident_id bigint not null references public."Resident"(id) on delete restrict,
  voting_day_id uuid not null references public.voting_days(id) on delete restrict,
  action text not null check (action in ('marked_voted', 'undo')),
  actor_id uuid not null references auth.users(id),
  occurred_at timestamptz not null default now()
);

-- Existing transportation is one row per resident. This additive relation
-- records which day/door-to-door visit a request supports without rewriting it.
create table if not exists public.transport_request_links (
  id uuid primary key default gen_random_uuid(),
  resident_id bigint not null references public.transportation(resident_id) on delete cascade,
  request_kind text not null default 'general' check (request_kind in ('general', 'door_to_door')),
  voting_day_id uuid references public.voting_days(id) on delete set null,
  door_to_door_resident_id bigint references public.door_to_door(resident_id) on delete set null,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  constraint transport_request_link_context_check check (
    (request_kind = 'general' and door_to_door_resident_id is null)
    or (request_kind = 'door_to_door' and door_to_door_resident_id = resident_id)
  )
);

alter table public.voting_days enable row level security;
alter table public.resident_voting_status enable row level security;
alter table public.resident_voting_status_events enable row level security;
alter table public.transport_request_links enable row level security;

-- Preserve the existing Remarks history shape and add optional context links.
alter table public.remarks add column if not exists context text;
alter table public.remarks add column if not exists context_record_id text;
alter table public.remarks drop constraint if exists remarks_context_check;
alter table public.remarks add constraint remarks_context_check
  check (context is null or context in ('general','door_to_door','voting_day','transport'));

revoke all on public.voting_days, public.resident_voting_status,
  public.resident_voting_status_events, public.transport_request_links
  from public, anon, authenticated;
grant select on public.voting_days, public.resident_voting_status,
  public.resident_voting_status_events, public.transport_request_links to authenticated;
grant insert, update, delete on public.voting_days to authenticated;
grant insert, update, delete on public.transport_request_links to authenticated;
grant usage, select on sequence public.resident_voting_status_events_id_seq to authenticated;

create policy mdp_voting_days_staff_read on public.voting_days
  for select to authenticated
  using ((select vote_private.staff_role()) in ('admin','supervisor','call_agent','field_agent','election_operator'));
create policy mdp_voting_days_admin_write on public.voting_days
  for all to authenticated
  using ((select vote_private.staff_role()) in ('admin','supervisor'))
  with check ((select vote_private.staff_role()) in ('admin','supervisor'));

create policy mdp_turnout_staff_read on public.resident_voting_status
  for select to authenticated
  using ((select vote_private.staff_role()) in ('admin','supervisor','call_agent','field_agent','election_operator'));
-- Status writes go through mdp_set_resident_vote so status and audit are atomic.

create policy mdp_turnout_events_staff_read on public.resident_voting_status_events
  for select to authenticated
  using ((select vote_private.staff_role()) in ('admin','supervisor','call_agent','field_agent','election_operator'));
-- No client insert/update/delete policy: history is append-only via the RPC.

create policy mdp_transport_links_staff_read on public.transport_request_links
  for select to authenticated
  using ((select vote_private.staff_role()) in ('admin','supervisor','election_operator','field_agent'));
create policy mdp_transport_links_staff_write on public.transport_request_links
  for all to authenticated
  using ((select vote_private.staff_role()) in ('admin','supervisor','election_operator'))
  with check ((select vote_private.staff_role()) in ('admin','supervisor','election_operator'));

-- The directory response is an explicit field allowlist. In particular it
-- never serializes the party column or any future resident-table columns.
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
    select f.*, (v.resident_id is not null) as has_voted, v.voted_at
    from filtered f left join public.resident_voting_status v
      on v.resident_id=f.id and v.voting_day_id=p_voting_day_id
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
  if current_actor is null or current_role not in ('admin','supervisor','election_operator') then
    raise exception 'Turnout access denied' using errcode = '42501';
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

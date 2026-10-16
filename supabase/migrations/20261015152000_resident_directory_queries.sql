-- Both directory RPCs run with the caller's permissions and existing staff RLS.
create or replace function vote_private.house_group(value text) returns text
language sql immutable security invoker set search_path='' as $$
 select case
 when trim(coalesce(value,'')) ~* 'dhafthar|^(no\s*)?(dh\s*r|dhr|rs)(\s*no)?\s*[0-9]|^no\s*[0-9]' then 'Dhafthar'
 when lower(value) like '%sina male%' or lower(value) like '%sina malé%' then 'Sina Malé'
 else trim(coalesce(value,'')) end
$$;
revoke all on function vote_private.house_group(text) from public, anon;
grant execute on function vote_private.house_group(text) to authenticated;

create or replace function public.vote_resident_directory(
 p_page integer default 1,p_page_size integer default 24,p_search text default '',
 p_house text default 'all',p_party text default 'all',p_gender text default 'all',
 p_age text default 'all',p_box text default 'all'
) returns jsonb language sql stable security invoker set search_path='' as $$
 with filtered as materialized(
 select r.* from public."Resident" r
 where (coalesce(trim(p_search),'')='' or strpos(lower(concat_ws('|',r.id::text,r.name,r.national_id,r.phone::text,r.house,r.lives_in,r.election_box)),lower(trim(p_search)))>0)
 and (p_house='all' or vote_private.house_group(r.house)=p_house)
 and (p_party='all' or case when p_party='Unspecified' then nullif(trim(r.party),'') is null else lower(trim(r.party))=lower(p_party) end)
 and (p_gender='all' or upper(trim(r.sex))=upper(p_gender))
 and (p_box='all' or r.election_box=p_box)
 and (p_age='all' or case p_age when '18-25' then r.age between 18 and 25 when '26-35' then r.age between 26 and 35 when '36-45' then r.age between 36 and 45 when '46-60' then r.age between 46 and 60 when '61+' then r.age>=61 else false end)
 ), page_rows as(select * from filtered order by id limit greatest(1,least(500,p_page_size)) offset (greatest(1,p_page)-1)::bigint*greatest(1,least(500,p_page_size)))
 select jsonb_build_object('count',(select count(*) from filtered),'rows',coalesce((select jsonb_agg(to_jsonb(p) order by p.id) from page_rows p),'[]'::jsonb))
$$;
revoke all on function public.vote_resident_directory(integer,integer,text,text,text,text,text,text) from public, anon;
grant execute on function public.vote_resident_directory(integer,integer,text,text,text,text,text,text) to authenticated;

create or replace function public.vote_resident_directory_filters() returns jsonb
language sql stable security invoker set search_path='' as $$
 with base as materialized(select vote_private.house_group(house) as house,coalesce(nullif(trim(party),''),'Unspecified') as party,nullif(trim(election_box),'') as box from public."Resident"),
 houses as(select house as name,count(*) as count from base where house<>'' group by house),
 parties as(select party as name,count(*) as count from base group by party)
 select jsonb_build_object('houses',coalesce((select jsonb_agg(to_jsonb(h) order by h.name) from houses h),'[]'::jsonb),'parties',coalesce((select jsonb_agg(to_jsonb(p) order by case p.name when 'MDP' then 1 when 'Verify party' then 2 when 'PNC' then 3 else 4 end,p.name) from parties p),'[]'::jsonb),'boxes',coalesce((select jsonb_agg(box order by box) from (select distinct box from base where box is not null)b),'[]'::jsonb))
$$;
revoke all on function public.vote_resident_directory_filters() from public, anon;
grant execute on function public.vote_resident_directory_filters() to authenticated;

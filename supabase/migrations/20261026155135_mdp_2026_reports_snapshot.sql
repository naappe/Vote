-- Auth-scoped report aggregation. Mirrored from the applied production migration.
CREATE OR REPLACE FUNCTION public.mdp_2026_reports_snapshot()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
with permissions as (
 select
  (auth.uid() is not null
    and vote_private.mdp_has_access()
    and public.staff_has_feature_permission('residents')) as can_read,
  public.staff_has_feature_permission('voting') as can_voting,
  public.staff_has_feature_permission('calls') as can_calls,
  public.staff_has_feature_permission('remarks') as can_remarks,
  public.staff_has_feature_permission('transport') as can_transport,
  (vote_private.staff_role() = 'admin'
    or now() >= '2026-11-27 23:30:00+05'::timestamptz) as can_election
),
roster as materialized (
 select distinct r.id
 from public.mdp_2026_import_review i
 join public."Resident" r on r.id=i.matched_resident_id
 where (select can_read from permissions)
   and vote_private.staff_can_access_resident(r.id)
   and upper(btrim(coalesce(r.party,'')))='MDP'
),
scoped as (
 select
  r.id,
  c.phone_status,
  c.reach_status,
  coalesce(nullif(c.vote_status,'not-decided'),nullif(d.vote_status,'not-decided')) as vote_plan,
  t.transport_status
 from roster r
 left join public.call_center c on c.resident_id=r.id
 left join public.door_to_door d on d.resident_id=r.id
 left join public.transportation t on t.resident_id=r.id
),
counts as (
 select
  count(*)::integer as total,
  count(*) filter(where vote_plan='will-vote')::integer as will_vote,
  count(*) filter(where vote_plan='not-vote')::integer as will_not_vote,
  count(*) filter(where phone_status='called')::integer as called,
  count(*) filter(where reach_status='reached')::integer as reached,
  count(*) filter(where transport_status in ('needed','need-transport','requested'))::integer as transport_needed,
  count(*) filter(where transport_status in ('assigned','picked-up'))::integer as transport_in_progress,
  count(*) filter(where transport_status='completed')::integer as transport_completed
 from scoped
),
notes as (
 select
  count(*)::integer as note_count,
  count(distinct n.resident_id)::integer as residents_with_remarks
 from public.remarks n
 join roster r on r.id=n.resident_id
 where n.section='general'
   and nullif(btrim(n.remark),'') is not null
   and (select can_remarks from permissions)
),
active_day as (
 select day.id, day.name
 from public.voting_days day
 where day.active is true
 order by day.voting_date,day.id
 limit 1
),
day_count as (
 select count(*)::integer as voted
 from public.resident_voting_status s
 join roster r on r.id=s.resident_id
 join active_day d on d.id=s.voting_day_id
 where (select can_election from permissions)
)
select jsonb_build_object(
 'total',c.total,
 'willVote',case when p.can_voting then c.will_vote else 0 end,
 'willNotVote',case when p.can_voting then c.will_not_vote else 0 end,
 'called',case when p.can_calls then c.called else 0 end,
 'reached',case when p.can_calls then c.reached else 0 end,
 'noteCount',case when p.can_remarks then n.note_count else 0 end,
 'residentsWithRemarks',case when p.can_remarks then n.residents_with_remarks else 0 end,
 'transportNeeded',case when p.can_transport then c.transport_needed else 0 end,
 'transportInProgress',case when p.can_transport then c.transport_in_progress else 0 end,
 'transportCompleted',case when p.can_transport then c.transport_completed else 0 end,
 'canViewVoting',p.can_read and p.can_voting,
 'canViewCalls',p.can_read and p.can_calls,
 'canViewRemarks',p.can_read and p.can_remarks,
 'canViewTransport',p.can_read and p.can_transport,
 'canViewVotingDay',p.can_read and p.can_election,
 'votingDay',case when p.can_read and p.can_election
   then (select jsonb_build_object('name',d.name,'voted',(select voted from day_count)) from active_day d)
   else null end
)
from counts c cross join notes n cross join permissions p;
$function$
;
revoke all on function public.mdp_2026_reports_snapshot() from public,anon;
grant execute on function public.mdp_2026_reports_snapshot() to authenticated;

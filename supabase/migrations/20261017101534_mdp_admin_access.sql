-- Administrators with the ALL resident scope can always enter the MDP workspace.
-- Non-admin staff still need both an MDP party scope and the explicit MDP-link grant.
create or replace function vote_private.mdp_has_access()
returns boolean
language sql stable security definer set search_path = '' as $$
  select case
    when vote_private.staff_role() = 'admin'
      and vote_private.staff_party_scope() = 'ALL' then true
    when vote_private.staff_party_scope() = 'MDP' then exists (
      select 1
      from public.mdp_user_access a
      join public.user_roles r on r.user_id = a.user_id
      where a.user_id = (select auth.uid())
        and a.allowed is true
        and r.active is true
        and r.role in ('admin','supervisor','call_agent','field_agent','election_operator')
    )
    else false
  end
$$;
revoke all on function vote_private.mdp_has_access() from public, anon;
grant execute on function vote_private.mdp_has_access() to authenticated;

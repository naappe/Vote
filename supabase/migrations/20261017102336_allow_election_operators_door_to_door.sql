-- The MDP workspace exposes visit recording to election operators. Allow those
-- staff to create/update visit outcomes, while preserving their assigned-party
-- resident scope and leaving other role permissions unchanged.
create policy election_operator_door_to_door_insert
  on public.door_to_door for insert to authenticated
  with check (
    vote_private.staff_can_access_resident(resident_id)
    and (select vote_private.staff_role()) = 'election_operator'
  );

create policy election_operator_door_to_door_update
  on public.door_to_door for update to authenticated
  using (
    vote_private.staff_can_access_resident(resident_id)
    and (select vote_private.staff_role()) = 'election_operator'
  )
  with check (
    vote_private.staff_can_access_resident(resident_id)
    and (select vote_private.staff_role()) = 'election_operator'
  );

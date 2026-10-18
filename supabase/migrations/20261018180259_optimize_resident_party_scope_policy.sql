-- Preserve the existing resident visibility rules while avoiding a nested
-- Resident lookup for every candidate row. Scalar subqueries let Postgres
-- evaluate the signed-in user's fixed party scope once per statement.
drop policy if exists staff_read on public."Resident";
create policy staff_read on public."Resident"
for select to authenticated
using (
  (select vote_private.staff_party_scope()) is not null
  and (
    (select vote_private.staff_party_scope()) = 'ALL'
    or upper(btrim(coalesce(party, ''))) = (select vote_private.staff_party_scope())
  )
);

# Vote Operations — Villimalé 2026

Campaign operations platform for resident outreach, field work, election-day coordination, transportation, contact verification, and reporting.

## Live website

Primary GitHub Pages address:

- https://naappe.github.io/Vote/

The repository name is case-sensitive. Use `/Vote/`, not `/vote/`.

## Current application routes

- Dashboard: https://naappe.github.io/Vote/
- Residents: https://naappe.github.io/Vote/residents/
- Resident profile: `https://naappe.github.io/Vote/resident-profile/?id=<resident_id>`
- Call Center: https://naappe.github.io/Vote/call-center/
- Door-to-Door: https://naappe.github.io/Vote/door-to-door/
- Assignments: https://naappe.github.io/Vote/assignments/
- Remarks: https://naappe.github.io/Vote/remarks/
- Election Day: https://naappe.github.io/Vote/election-day/
- Transportation: https://naappe.github.io/Vote/transportation/
- Contact Verification: https://naappe.github.io/Vote/contact-verification/
- Reports: https://naappe.github.io/Vote/reports/

## Removed legacy routes

The following old routes are no longer part of the application and must not be used in documentation, navigation, or shared links:

- `/voter-management/`
- `/voter-detail/`
- `/admin-verification/`
- `/notifications/`
- `/settings/`

## Application structure

The `Resident` table is the read-only identity master. Workflow actions must save only to their matching operational tables.

Operational areas:

- `call_center`
- `door_to_door`
- `assignments`
- `remarks`
- `election_day`
- `transportation`
- `contact_verification`
- `workflow_shares`

## Transportation

Transportation is organized by election box. The page supports:

- election-box summary cards
- box, party, status, and text filters
- resident identity and contact information
- transport status updates
- election-box-specific share links

## Residents

Residents supports:

- resident photos
- pagination
- search
- house filter
- party filter
- gender filter
- age filter
- election-box filter
- read-only identity information
- contact-correction requests through Contact Verification

## Deployment

Technology:

- Next.js static export
- TypeScript
- Tailwind CSS
- Supabase
- GitHub Pages

GitHub Actions workflow:

- `.github/workflows/deploy.yml`

The workflow uses:

```bash
npm install
npm run build
```

It verifies that `out/index.html` exists before uploading the Pages artifact.

Required repository secrets:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Current code baseline

Latest functional fix before this documentation update:

- `7f3433bcac0aa4ac0c897095f5911644906a1cf0` — add election-box filtering support to the resident paging function

Deployment workflow repair:

- `23bcf95f7108d76fb50d8f611db81dcb9417ae9f` — remove the npm cache lock-file requirement

Transportation by election box:

- `aea1209110ab7fafc207657465d6d6ba200f2b5f` — organize transportation by election box

See `SHAS.md` for the maintained change history.

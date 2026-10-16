# MDN Resident Operations — Design (Updated)

Date: 2026-10-16
Repository: `naappe/Vote`
Working base: `fix/workflow-navigation-review`

## Goal

Create a separate, mobile-friendly entry link for **Maldivian Democracy Network (MDN)** resident operations. Keep existing resident-management functions, simplify the navigation, and remove MDP and party-based labels from this experience. Election-day status remains neutral: `voted / not yet recorded`.

## Route and data

- Add an MDN entry route at `/Vote/mdn/` (Next.js route `/mdn` under the existing GitHub Pages base path).
- Reuse current Supabase authentication, authorization, resident, and workflow data. Do not copy residents into a second database.
- Include all resident records already available to the signed-in staff through the existing `Resident` table. Changes in either view refer to the same records.
- Keep party affiliation out of MDN navigation, search filters, profiles, workflow boards, reports, and CSV exports. Do not create a party-specific resident view.
- Preserve current role checks for administration, contact verification, and backup.

## Navigation and functions

Use a compact home screen with clear action buttons and primary navigation:

1. Dashboard: pending work and shortcuts.
2. Residents: search, open a profile, and export filtered CSV; less-used filters under “More filters.”
3. Calls and visits: find a resident, record an outcome, and save.
4. Door-to-door: record household contact, address/household, date, staff, outcome, and notes.
5. Voting Days: select a voting day, search a resident, mark voted, and undo.
6. Transportation: manage pending, assigned, and completed requests, including door-to-door transport.
7. Remarks: add a resident note and view timestamped history with staff attribution.
8. Reports and administration: retain reports, staff controls, verification, and backup behind existing role checks.

Use the exact app title **Maldivian Democracy Network (MDN)**. Do not use MDP identity, colors, party badges, or party labels in this route.

## Voting Days

**Recommended choice: admin-defined voting days.** An administrator creates each dated voting day once; staff select from that list. Each resident's turnout status is recorded separately for each day. Show neutral statuses only: `voted / not yet recorded`. Support undo and date filtering without party information.

## Door-to-door

Keep door-to-door outcomes separate from phone-call outcomes because the contact situations differ. Use a dedicated neutral set:

- Reached resident
- Spoke with household member
- Not home
- Address not found or incorrect
- Unable to access
- Follow-up needed
- Not visited

The existing `door_to_door` workflow remains the source for household visits; general phone-call outcomes stay in the call workflow.

## Transportation

Manage both general and door-to-door requests with states `pending → assigned → completed`. A request may optionally reference a voting day or a door-to-door visit.

## Interaction and failure handling

Keep search in the same place across resident workflows. Use large buttons, compact lists, clear saved/failed messages, and pagination for long directories. Show loading and empty states. Do not show a success message until Supabase confirms the save. CSV export must include every matching page and report incomplete exports.

## Data-model compatibility blocker

The requested multi-day behavior conflicts with the “database schema unchanged” requirement. In the current app, election-day status is saved with `resident_id` as the upsert conflict key, so it supports one turnout row per resident. Transportation is also upserted by `resident_id`, so it cannot hold separately linked requests per voting day or visit. Multiple voting days and those optional links need an additive schema migration (for example, a voting-days table and resident/day status records, plus request links) and corresponding RLS policies.

The implementation must not start until one of these choices is approved:

- **Keep the schema unchanged:** retain one voting day and do not add voting-day/visit links to transportation; or
- **Keep the updated multi-day requirements:** allow the smallest additive schema migration and new RLS policies, preserving existing resident rows and authentication.

The recommended choice is to allow additive schema changes so the requested multi-day workflow works correctly.

## Verification

- Build and existing tests pass.
- Direct navigation to `/Vote/mdn/` works with the GitHub Pages base path and authenticated access.
- Directory, search, profile, CSV export, calls/visits, door-to-door, voting days (including undo), transportation, remarks, and reports load and save.
- No MDP text, party controls, party values, or party-based filters appear in the MDN experience or its exports.
- Non-admin staff remain blocked from existing admin-only screens.
- Preserve resident records and authentication. Any approved new tables or links have RLS policies matching the existing staff-role access model.

## Data-scope assumption

“Only take the resident” means all resident records already visible to signed-in staff, with party affiliation omitted from the MDN experience. This is a separate link and simpler interface, not a separate copy or security boundary for resident data.

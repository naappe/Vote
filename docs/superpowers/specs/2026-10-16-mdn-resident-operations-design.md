# MDP Resident Operations — Design (Revised)

Date: 2026-10-16
Repository: `naappe/Vote`
Working base: `fix/workflow-navigation-review`

## Goal

Create a separate, mobile-friendly entry link for **Maldivian Democratic Party (MDP)** resident operations. Keep existing resident-management functions, simplify navigation, and use the MDP name for this experience. **Turnout status for each voting day remains neutral: `voted / not yet recorded`.**

## Route and data

- Add an MDP entry route at `/Vote/mdp/` (Next.js route `/mdp` under the existing GitHub Pages base path).
- Reuse current Supabase authentication, authorization, resident, and workflow data. Do not copy residents into a second database.
- Include all resident records already available to signed-in staff through the existing `Resident` table. Changes in either view refer to the same records.
- Reuse the existing resident workflows and their established fields, while the new MDP entry screen focuses on common operational actions.
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

Use the exact app title **Maldivian Democratic Party (MDP) Resident Operations**.

## Voting Days

Use an admin-defined list of voting days. An administrator creates each dated entry once; staff select from that list. Store turnout separately for each resident and voting day. Show only neutral statuses: `voted / not yet recorded`. Support undo and filtering by voting day without party information.

## Door-to-door

Keep door-to-door outcomes separate from phone-call outcomes because the contact situations differ. Use a dedicated neutral set:

- Reached resident
- Spoke with household member
- Not home
- Address not found or incorrect
- Unable to access
- Follow-up needed
- Visit postponed

“Not visited” is a pending workflow state, not an outcome. Keep household contact in the existing `door_to_door` workflow; phone-call outcomes stay in the call workflow.

## Transportation

Manage both general and door-to-door requests with states `pending → assigned → completed`. A request may optionally reference a voting day or a door-to-door visit. Record transport remarks in the shared remarks table with context `transport` and a link to the transport request; do not add a second notes history to each request.

## Remarks

Use one resident remarks history with an optional context: `general`, `door_to_door`, `voting_day`, or `transport`. Store the associated workflow record ID when a remark is contextual. Show timestamp and staff for every remark.

## Interaction and failure handling

Keep search in the same place across resident workflows. Use large buttons, compact lists, clear saved/failed messages, and pagination for long directories. Show loading and empty states. Do not show a success message until Supabase confirms the save.

Resident directory and CSV export continue to use the existing implementation and access rules. The new voting-day directory RPC selects named resident columns and does not expose party values.

## Data-model compatibility and decision

The requested multi-day behavior conflicts with the original “database schema unchanged” requirement. The current app saves election-day status with `resident_id` as the upsert conflict key, so it supports one turnout row per resident. Transportation is also upserted by `resident_id`, so it cannot hold separately linked requests per voting day or visit.

**Decision (2026-10-16): Option 2 approved — permit the smallest additive migration.** Proposed additive structures:

- `voting_days`: admin-managed date entries.
- `resident_voting_status`: one status per resident and voting day, unique on `(resident_id, voting_day_id)`.
- `resident_voting_status_events`: append-only mark/undo audit events with resident, voting day, prior/new status, actor, and timestamp.
- `transport_request_links`: optional links from a transport request to a voting day or door-to-door visit.
- Extend `remarks` with optional context and context-record ID, if equivalent columns do not already exist.

Record every vote mark and undo in `resident_voting_status_events` with actor and timestamp, so undo does not erase the audit trail. The existing activity logger records page views and logins, so it is not the voting audit source. Preserve all existing resident rows and authentication. Existing one-day turnout rows remain in `election_day` as legacy and are not backfilled without a confirmed voting date.

Implementation must retain the multi-day and linked-transport requirements using the approved additive schema changes. Preserve current role-based access; review the migration and RLS policies before applying them to any Supabase project.

## RLS roles

Keep current policies for existing tables. For new or extended data, apply row-level security using the exact existing role names:

- Active staff roles: `admin`, `supervisor`, `call_agent`, `field_agent`, `election_operator`.
- All active staff may read resident and operational records as allowed by current policies.
- `admin` and `supervisor` may manage voting-day definitions and perform supervisor-level writes.
- `election_operator` may record or undo turnout, append voting-status audit events, and manage transport requests/links, matching current `election_day` and `transportation` permissions.
- Voting-status audit events are append-only; staff may read them under existing operational read permissions, and no client role may update or delete them.
- `field_agent` may create/update door-to-door records under the existing field-agent policy.
- `call_agent` may write call records under the existing call-agent policy.
- Remarks retain role-specific write permissions; context does not grant additional access.
- Authorization must use server-managed `user_roles`/staff-role checks, never user-editable metadata.

## Verification

- Build and existing tests pass.
- Direct navigation to `/Vote/mdp/` works with the GitHub Pages base path and authenticated access.
- Directory, search, profile, explicit-column CSV export, calls/visits, door-to-door, voting days (including undo), transportation, remarks, and reports load and save.
- Existing resident, call, visit, transport, remarks, report, and administration screens remain available through the entry page and preserve their current role checks.
- Non-admin staff remain blocked from existing admin-only screens.
- Migration validation confirms existing resident rows are unchanged. Opening the MDP route does not require a resident-table backfill.
- Marking a resident voted on Day A does not change Day B.
- Mark and undo actions append actor, timestamp, day, and status change to `resident_voting_status_events`.
- Door-to-door outcomes cannot be written to call records, and call outcomes cannot be written to door-to-door records.
- RLS tests cover each named role and the new tables/links.
- Migration uses additive changes only and is reviewed against the connected Supabase project's actual schema before application.

## Data-scope assumption

“Only take the resident” means use all resident records already visible to signed-in staff. This is a separate entry link and simpler home screen, not a separate copy or security boundary for resident data.

# MDN Resident Operations — Design

Date: 2026-10-16
Repository: `naappe/Vote`
Working base: `fix/workflow-navigation-review`

## Goal

Create a separate, mobile-friendly entry link for **Maldivian Democracy Network (MDN)** resident operations. Keep the existing resident-management functions, simplify the navigation, and remove MDP and party-based labels from this experience. Election-day status must remain available as a neutral `voted / not yet recorded` workflow for the resident list.

## Proposed route and data

- Add an MDN entry route at `/Vote/mdn/` (Next.js route `/mdn` under the existing GitHub Pages base path).
- Reuse the current Supabase authentication, authorization, and resident/workflow tables. Do not copy residents into a second database or change permissions.
- Include all resident records available to the signed-in staff through the existing Resident table. Changes made in MDN and the existing app therefore refer to the same records.
- Keep party affiliation out of MDN navigation, search filters, profile summary, workflow boards, reports, and CSV exports. Do not create a party-specific resident view.
- Preserve existing role checks for administration, verification, and backup features.

## Navigation and functions

Use a compact home screen with clear action buttons and a small primary navigation:

1. Dashboard: pending work and shortcuts.
2. Residents: search, open profile, and export filtered CSV; less-used filters under “More filters.”
3. Calls and visits: find a resident, record the result, save.
4. Assignments: select residents and assign staff.
5. Election Day: search a resident, mark voted, and allow undo.
6. Transportation: review pending, assigned, and completed requests.
7. Remarks: add a resident note and see its history.
8. Reports and administration: retain existing reports, staff controls, verification, and backup behind existing role checks.

Use the exact app title **Maldivian Democracy Network (MDN)**. Do not use MDP identity, colors, party badges, or party labels in this route.

## Interaction and failure handling

Keep search in the same place across resident workflows. Use large buttons, compact lists, clear saved/failed messages, and pagination for long directories. Show loading and empty states. Do not show a success message until Supabase confirms the save. Keep CSV export complete across every matching page and report any incomplete export.

## Verification

- Build and existing tests pass.
- Direct navigation to `/Vote/mdn/` works with GitHub Pages base path and authenticated access.
- Directory, search, profile, CSV export, call/visit, assignment, election-day status (including undo), transportation, remarks, and reports load and save through the existing workflow tables.
- No MDP text, party controls, party values, or party-based filters appear in the MDN experience or its exports.
- Non-admin staff remain blocked from existing admin-only screens.
- Database schema, resident records, authentication, and access policies remain unchanged.

## Explicit assumption to confirm

“Only take the resident” is interpreted as using all resident records already visible to the signed-in staff, while omitting party affiliation from the MDN experience. This is a separate link and simpler interface, not a separate copy or security boundary for resident data.

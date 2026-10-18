# MDP Resident Operations — UX and Data Layer Polish

Date: 2026-10-18  
Repository: `naappe/Vote`  
Scope: Existing `/Vote/mdp/` experience and its shared Supabase data-access code

## Goal

Make the MDP resident operations experience easy to understand on a phone, reduce the number of taps needed to complete common resident tasks, and make navigation feel responsive. Preserve existing resident data, workflow behavior, authentication, role checks, and database policies.

The user should be able to identify the next action without interpreting technical labels or searching through a crowded menu. Keep the established MDP blue-and-yellow visual identity.

## Screenshot and code review findings

- The mobile resident search placeholder is clipped in the supplied narrow-screen view. Search, house filters, list/gallery controls, and pagination need a deliberate single-column mobile layout.
- Resident cards repeat many fields and create long scrolls. The first useful action should be visible without opening a profile or scrolling through a large card.
- The desktop Calls screen shows large multi-column resident cards. The call action should remain prominent, while secondary history stays collapsed.
- The Remarks form relies on placeholder text for fields that need labels and does not make the sequence—select resident, write note, save—obvious.
- Transportation gives the filtered share-link action high visual priority, while the day-to-day request status and next action need stronger prominence.
- Common work is split across routes and secondary navigation. The existing shared header is useful, but mobile navigation and the account control use scarce width.
- Page data access is concentrated in a large `lib/supabase.ts` module. Some list paths use broad `select('*')` queries and some workflow filters are applied after fetching rows into the browser.

## Approved design

### 1. Navigation and page hierarchy

Retain existing routes and preserve deep links. Use a consistent compact navigation structure across the MDP workspace:

- Desktop: Home, Residents, Tasks, and account actions remain visible.
- Mobile: a compact header plus a persistent, thumb-friendly primary navigation for Home, Residents, and Tasks. Keep sign-out accessible without allowing the email address to crowd out navigation.
- Tasks opens a clearly grouped list of Calls, Door-to-door, Voting Days, Transportation, Remarks, and Reports. Role-restricted items continue to be hidden and blocked by their existing guards.
- Keep a visible Back action on task pages, while preserving search, current filters, list page, and useful scroll position when returning to a resident list.
- Avoid introducing extra confirmation screens for ordinary navigation or resident selection.

### 2. Consistent resident task flow

Use one reusable resident search and selection pattern in resident workflows. Search by name, national ID, record ID, phone, or house, with the search in the same location on each page. Keep less-used filters collapsed under “More filters.”

The common flow is:

1. Search for and select a resident.
2. Show the selected resident’s identity and the action relevant to the current page.
3. Record the result and save once.
4. Show success only after Supabase confirms the save; keep the user in context and offer the next resident/task.

Calls, door-to-door visits, voting status, transportation, and remarks remain separate workflows with separate fields and outcome/status values. Reuse the search and resident identity components; do not combine different operational records into one ambiguous form.

### 3. Page-specific behavior

- **Residents:** Keep search visible, stack controls cleanly on mobile, preserve the selected page and filters, and show concise resident rows/cards with a clear “Open” or task action. Keep CSV export easy to find and ensure it covers all matching pages using explicit allowed columns.
- **Calls:** Keep search and call-status/result filters together. Make “Record call” the primary card action. Keep call history collapsed until requested. After save, refresh the current list and maintain its search/page context.
- **Door-to-door:** Keep it distinct from calls, with a clear household visit result form and factual notes. No call-specific result fields appear here.
- **Voting Days:** Preserve admin-defined dates, per-day resident status, neutral “Voted / Not yet recorded” labels, and undo/audit behavior from the existing design. Day A changes must not affect Day B.
- **Transportation:** Put Pending, Assigned, and Completed views/actions first. Keep search, status, and box filters together. Make share-link creation a secondary action. Continue supporting general and door-to-door-linked requests with current role restrictions.
- **Remarks:** Label every field. Present the order as resident → optional context → note → save. Show a compact, timestamped history with staff attribution after the entry form.
- **Reports and administration:** Keep reports discoverable. Staff, verification, and backup screens remain behind the current role checks and are not exposed to unauthorized roles.

### 4. Mobile and visual behavior

- Target a 360–430 CSS-pixel viewport first, with a clear desktop layout retained.
- Prevent horizontal overflow and clipped placeholders, names, IDs, and phone numbers.
- Use comfortably tappable controls (minimum 44 CSS pixels for primary controls), clear field labels, concise helper text, and visible saved/failed/loading/empty states.
- Keep the MDP blue-and-yellow palette. Avoid introducing party badges or new party controls in this MDP workflow.
- Review real screenshots at a narrow phone width and a desktop width before completion.

### 5. Supabase and code organization

- Keep the current Supabase project, authentication, one resident master table, existing workflow tables, and RLS policies. No schema change, resident duplication, or policy broadening is in scope.
- Keep the existing client key model. Never place a service-role or secret key in browser code.
- Organize data-access code into small, named resident, call, visit, voting, transport, remarks, and report modules. Retain a compatibility export where needed so the UI refactor can be incremental.
- Use explicit named-column selections for MDP resident lists and exports; avoid `select('*')` in the MDP data paths. Apply MDP scoping in the database query/RPC, not only after loading rows into the browser. Keep role/RLS checks as the authority for access.
- Paginate directory and workflow lists at the data source. Do not fetch every resident merely to render a page or apply ordinary status filters.
- Reuse recently loaded route/query results briefly to make back-and-forth navigation faster. Clear cache entries after successful writes and on auth user changes. Do not cache full exports or use local storage for resident records.
- Keep error handling explicit: surface query failures, do not convert them into empty success states, and invalidate related cached views after writes.

## Non-goals

- No changes to authentication providers, staff roles, RLS policies, or who can access MDP routes.
- No new resident database, table migration, or data backfill.
- No redesign of the main admin application outside shared components that require a regression check.
- No change to CSV business rules beyond using an explicit allowlist and completing all filtered result pages.

## Acceptance criteria

- A staff member can move from a resident search result to the page’s primary action with at most one additional tap and save without losing the current search/list context.
- On a 360px-wide viewport, no horizontal page overflow or clipped search field remains; primary navigation, sign-out, field labels, and main task actions are understandable and tappable.
- The supplied Residents, Calls, Remarks, and Transportation screens are visually reviewed at phone and desktop sizes after changes.
- MDP links remain under `/Vote/mdp/`, deep links work in the static GitHub Pages build, and navigation does not trigger full document reloads during normal use.
- MDP queries and CSV exports return only the intended MDP-scoped, explicitly named columns; no party controls or values leak into MDP UI/exports.
- Existing workflow tables and policies remain unchanged. Save, undo, filtering, pagination, and role restrictions continue to work.
- Recent-page caching is invalidated after writes and account changes; build and existing tests pass.

## Risks and mitigations

- **Stale or cross-account cached results:** Use short-lived in-memory caches, invalidate on writes and auth changes, and never persist resident results to local storage.
- **Incorrectly scoped database queries:** Keep server/RLS authorization authoritative; verify MDP list queries and export requests use the MDP filter before returning rows.
- **Shared-component regressions:** Test the main admin routes and role-restricted routes after modifying shared search, resident-card, or navigation components.
- **More information on small screens:** Prioritize the resident identity and current task action; move secondary history and less-used filters behind accessible disclosures.

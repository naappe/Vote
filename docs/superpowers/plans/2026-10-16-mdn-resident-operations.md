# MDN Resident Operations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a separate MDN-branded, mobile-friendly resident operations workspace at `/Vote/mdn/` with all agreed workflows and multi-day turnout tracking.

**Architecture:** Add static-exportable MDN routes under the existing Next.js `/Vote` base path, reuse the current Supabase authentication and resident records, and add an MDN layout that hides party data while preserving role checks. Add an additive migration for admin-managed voting days, per-resident/day turnout with append-only audit events, contextual remarks, and links from transport requests to voting days or door-to-door visits.

**Tech Stack:** Next.js 15.5.28, React 19.3.1, TypeScript 5.9.3, Supabase JS 2.118.0, PostgreSQL/Supabase, Tailwind CSS 3.4.19, Node built-in test runner.

**Spec:** `docs/superpowers/specs/2026-10-16-mdn-resident-operations-design.md`

## Global Constraints

- Use the exact app title **Maldivian Democracy Network (MDN)**.
- Do not show MDP identity, colors, party badges, party labels, party values, or party-based filters in the MDN experience or its exports.
- Include all resident records already visible to signed-in staff through the existing `Resident` table; do not copy resident records.
- Keep turnout neutral per voting day: `voted / not yet recorded`; support undo and retain actor/timestamp audit events.
- Use admin-defined voting day dates and the dedicated door-to-door outcome values in the spec.
- Preserve current authentication and the roles `admin`, `supervisor`, `call_agent`, `field_agent`, and `election_operator`.
- Use additive database changes, retain existing resident rows, and add RLS to every new exposed table.
- For MDN CSV export, select explicit named resident columns; never use `select *`.

## Review Focus

1. **A staff member opens an MDN URL directly or uses Back/Forward.** MDN route remains active and internal navigation stays within MDN; test nested routes and links.
2. **A party value is present in the database or added to a later schema version.** MDN UI, search filters, reports, and CSV remain party-free; test a resident fixture containing a party field.
3. **A resident is marked voted on one date, then undone.** Other dates remain unchanged and both events retain actor and timestamp; test day isolation and audit.
4. **A staff member lacks the required role for a write or admin screen.** RLS and client routes deny the operation; test the named active roles and forbidden role/action pairs.
5. **Supabase fails partway through a page load or export.** UI gives a useful error and does not claim success or silently export partial results; test failed reads and incomplete pagination.

---

### Task 1: Additive Supabase schema and role policies

**Files:**
- Create: CLI-generated `supabase/migrations/<timestamp>_mdn_resident_operations.sql`
- Create: `supabase/tests/mdn_resident_operations.sql` (or the repository's supported SQL test location)
- Reference: `supabase/migrations/20261015143000_secure_vote_access.sql`

**Interfaces:**
- Produces tables `voting_days`, `resident_voting_status`, `resident_voting_status_events`, and `transport_request_links`; nullable `context` and `context_record_id` fields on `remarks`.
- `resident_voting_status` is unique on `(resident_id, voting_day_id)`.
- `resident_voting_status_events` is append-only and records resident, voting day, previous/new status, actor, action, and timestamp.
- New table read/write policies follow the exact existing roles documented in the spec. Only `admin`/`supervisor` manage day definitions; `election_operator` writes turnout, audit events, and transport links; existing `field_agent` rules continue to govern door-to-door writes.

- [ ] **Step 1: Inspect the linked Supabase project and supported CLI commands.** Use `supabase --help` and `supabase db --help`; confirm the linked project is the VotersVillimale project and inspect its real table definitions and migration state before writing SQL.
- [ ] **Step 2: Create the migration using the CLI.** Run `supabase migration new mdn_resident_operations`; add only the structures and RLS/grants listed above. Keep `Resident`, authentication, and existing role data untouched.
- [ ] **Step 3: Add SQL assertions.** Verify table uniqueness, foreign keys, allowed door-to-door/transport context values, append-only turnout audit, and role-specific access. Verify that the old `election_day` and `transportation` rows remain present and unchanged.
- [ ] **Step 4: Apply and verify in a Supabase development branch.** Use the linked project's development branch, not production. Run SQL assertions and Supabase security advisors; expected result is no unauthorized anonymous access and only documented staff-role writes.
- [ ] **Step 5: Commit the migration and SQL checks.**

### Task 2: Define MDN route and data contracts

**Files:**
- Modify: `lib/types.ts`
- Create: `lib/mdn-routing.ts`
- Create: `lib/mdn-operations.ts`
- Create: `tests/mdn-routing.test.ts`
- Create: `tests/mdn-operations.test.ts`

**Interfaces:**
- `isMDNPath(pathname: string): boolean`
- `mdnHref(section: MDNSection, query?: string): string`
- `getVotingDays(): Promise<VotingDay[]>`
- `getVotingDayResidents(votingDayId: string, page: number, pageSize: number, search: string): Promise<{ rows: ResidentVotingRow[]; count: number }>`
- `saveVotingStatus(input: { residentId: number | string; votingDayId: string; hasVoted: boolean }): Promise<void>`
- `getTransportLinks(residentId: number | string): Promise<TransportRequestLink[]>`

- [ ] **Step 1: Write failing pure tests** for MDN path recognition with and without the `/Vote` base path, valid section links, invalid section fallback, resident/day status isolation, and neutral status labels.
- [ ] **Step 2: Run `npm test` and confirm the new tests fail for missing helpers/types.**
- [ ] **Step 3: Implement route helpers, record types, and Supabase query functions.** Every voter status write calls one transactional RPC that updates the status and appends its audit event; do not make two independent client writes.
- [ ] **Step 4: Run `npm test`; expected result is all old and new tests pass.**
- [ ] **Step 5: Commit the route and data contracts.**

### Task 3: Build the MDN route shell and access checks

**Files:**
- Create: `app/mdn/page.tsx`
- Create: `app/mdn/[section]/page.tsx`
- Create: `components/MDNWorkspaceLayout.tsx`
- Create: `components/MDNNavigation.tsx`
- Modify: `components/AuthGate.tsx`
- Create: `tests/mdn-routing.test.ts`

**Interfaces:**
- `MDNWorkspaceLayout({ activeSection, children })` renders the MDN title, simple navigation, and shared content frame.
- `generateStaticParams()` enumerates supported MDN sections for GitHub Pages static export.

- [ ] **Step 1: Add failing route/access tests** for the dashboard, each listed section, unknown section, and admin-only `users`, `backup`, and contact-verification routes.
- [ ] **Step 2: Run the focused test and confirm it fails.**
- [ ] **Step 3: Implement the static MDN routes and shell.** Keep route links under `/mdn`; preserve the existing AuthGate behavior and explicitly enforce role checks for the MDN-prefixed admin sections.
- [ ] **Step 4: Run `npm test` and `npm run build`; verify exported paths include `/Vote/mdn/` and supported sections.**
- [ ] **Step 5: Commit the MDN shell.**

### Task 4: Add party-free residents and core work screens

**Files:**
- Modify: `components/VoterManagementContent.tsx`
- Modify: `components/CallCenterContent.tsx`
- Modify: `components/OperationsListContent.tsx`
- Modify: `components/AssignmentsContent.tsx`
- Modify: `shared/ResidentIdentity.tsx`
- Modify: `lib/directory-utils.ts`
- Create: `components/MDNWorkspaceContent.tsx`
- Create: `tests/mdn-directory.test.ts`

**Interfaces:**
- Existing content components receive a typed `workspaceMode: 'standard' | 'mdn'` prop; MDN mode removes party controls/labels and uses `mdnHref` for internal navigation.
- `residentsMdnCsv(rows)` emits an explicit allowlist of resident columns with no party or workflow fields.

- [ ] **Step 1: Write failing tests** proving MDN resident UI data and CSV omit a populated party value, while name, national ID, address, phone, election box, and record ID remain.
- [ ] **Step 2: Run `npm test` and confirm the MDN export test fails.**
- [ ] **Step 3: Implement typed MDN mode in directory, call, door-to-door, assignment, and resident-profile links.** Retain current standard mode unchanged.
- [ ] **Step 4: Run `npm test`; expected result is no party value in the MDN CSV and no missing resident fields.**
- [ ] **Step 5: Commit the party-free core screens.**

### Task 5: Implement Voting Days and multi-day turnout

**Files:**
- Create: `components/MDNVotingDaysContent.tsx`
- Modify: `components/MDNWorkspaceContent.tsx`
- Modify: `lib/mdn-operations.ts`
- Modify: `components/AuthGate.tsx` if role routing needs a section rule
- Create: `tests/mdn-voting-days.test.ts`

**Interfaces:**
- `MDNVotingDaysContent` loads admin-defined dates, selects a date, searches/paginates residents, shows `Voted` or `Not yet recorded`, and supports undo.
- Day create/edit is available only to `admin` and `supervisor`; turnout mark/undo is available only to `admin`, `supervisor`, and `election_operator`.

- [ ] **Step 1: Write failing tests** for date selection, day A/day B isolation, mark then undo, audit actor/timestamp, and role permissions.
- [ ] **Step 2: Run the focused tests and confirm they fail.**
- [ ] **Step 3: Implement Voting Days UI and transactional save calls.** Search and pagination must use named resident fields and must not load party values.
- [ ] **Step 4: Run `npm test` and verify role/RLS cases against the development Supabase branch; expected result is day isolation and an audit event for both actions.**
- [ ] **Step 5: Commit Voting Days.**

### Task 6: Complete door-to-door, transportation, remarks, reports, and administration

**Files:**
- Modify: `components/OperationsListContent.tsx`
- Modify: `components/TransportationContent.tsx`
- Modify: `components/RemarksContent.tsx`
- Modify: `components/DashboardContent.tsx`
- Modify: `app/mdn/[section]/page.tsx`
- Create: `tests/mdn-workflows.test.ts`

**Interfaces:**
- Door-to-door outcomes are exactly `reached`, `household-member-contacted`, `not-home`, `address-not-found`, `unable-to-access`, `follow-up-needed`, and `visit-postponed`; `not-visited` is only a pending state.
- Remarks use contexts `general`, `door_to_door`, `voting_day`, or `transport`, and display timestamp/staff history.
- Transportation links connect a resident request to an optional voting day or door-to-door visit.

- [ ] **Step 1: Write failing tests** for door-to-door/call outcome separation, valid transport links and states, remark context/history, party-free dashboard metrics, and denied non-admin access to admin sections.
- [ ] **Step 2: Run `npm test` and confirm the targeted tests fail.**
- [ ] **Step 3: Implement the workflow views in MDN mode.** Record transport remarks in the shared remarks history with context `transport`; preserve existing role checks for verification, backup, and user management.
- [ ] **Step 4: Run `npm test`; expected result is separate workflow outcomes, contextual remarks, and neutral reports.**
- [ ] **Step 5: Commit the completed MDN workflows.**

### Task 7: End-to-end verification and review

**Files:**
- Modify: `README.md` with the MDN entry URL and usage note
- Review: all files changed in Tasks 1–6

- [ ] **Step 1: Run `npm test`; expected result is all auth, directory, MDN routing, data, voting-day, and workflow tests pass.**
- [ ] **Step 2: Run `npm run build`; expected result is successful static export of `/Vote/mdn/` and every supported subroute.**
- [ ] **Step 3: Smoke-test the authenticated MDN routes** on mobile-sized and desktop viewports; verify search placement, saves, undo, CSV download, and visible errors on failed requests.
- [ ] **Step 4: Verify MDP/party strings and party fields are absent from the MDN UI and CSV output, and run the Supabase advisor on the migration branch.**
- [ ] **Step 5: Review the complete branch against the spec, then open a draft pull request targeting `fix/workflow-navigation-review`.**


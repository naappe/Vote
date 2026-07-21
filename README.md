# CampaignOps — Villimalé 2026

CampaignOps is a campaign operations platform for resident records, outreach, field work, assignments, election-day coordination, transportation, contact verification, remarks, and reporting.

The product direction is workflow-first:

> The system should tell each user what needs attention and what to do next.

## Live application

- https://naappe.github.io/Vote/

The static export uses the `/Vote` base path configured in `next.config.js`.

## Current implementation status

CampaignOps is not a blank project. Navigation, the resident data model, operational tables, core pages, styling, and deployment already exist. However, the final workflow-first architecture is still being implemented.

| Area | Status |
|---|---|
| Product vision | Complete |
| Application architecture | Complete |
| Database structure | Mostly complete |
| Core navigation | Implemented |
| Operational pages | Partially implemented |
| Shared design system | Partially implemented |
| Workflow-first experience | In progress |
| Automatic activity timeline | Planned |
| Resident Mission Control | Planned |
| Supervisor Command Center | Planned |

Progress should be measured by completed workflows, not by the existence of page routes alone.

## Core product principles

### One resident

The Supabase `Resident` table is the source of truth for resident identity.

Resident identity is not duplicated inside operational modules. Phone or living-place corrections are submitted through `contact_verification` and reviewed separately.

### One operational history

Calls, visits, verification changes, assignments, transportation actions, election-day updates, and remarks should contribute to one chronological resident timeline.

Free-text notes should not be duplicated across workflows. User-entered comments belong in the central Remarks system, while structured workflow actions should generate automatic timeline events.

### One clear action

Each operational screen should prioritize the next useful action rather than displaying data without context.

Examples:

- Call Center: call, save, move to the next resident.
- Door-to-Door: visit, save, move to the next resident or house.
- Election Day: open an actionable queue, assign it, or share it.
- Transportation: assign a driver or vehicle and complete the pickup.

## Active routes

| Section | Route | Current responsibility |
|---|---|---|
| Dashboard | `/Vote/` | Campaign overview; planned evolution into the supervisor Command Center |
| Residents | `/Vote/residents/` | Searchable resident identity directory and entry point to resident profiles |
| Resident Profile | `/Vote/resident-profile/?id=<resident_id>` | Resident details; planned evolution into Mission Control |
| Call Center | `/Vote/call-center/` | Call outcomes, vote intention, support, callback, and agent workflow |
| Door-to-Door | `/Vote/door-to-door/` | Field visit outcomes and resident outreach |
| Assignments | `/Vote/assignments/` | Assignment creation, sharing, ownership, and planned progress tracking |
| Remarks | `/Vote/remarks/` | Centralized operational remarks |
| Election Day | `/Vote/election-day/` | Turnout operations and actionable resident queues |
| Transportation | `/Vote/transportation/` | Election-box transport planning and completion tracking |
| Contact Verification | `/Vote/contact-verification/` | Review phone and living-place correction requests |
| Reports | `/Vote/reports/` | Read-only campaign reporting |
| Shared Workflow | `/Vote/share/?token=<token>` | Restricted resident subset created from a workflow share |

Do not restore or document legacy routes that are absent from the current `app/` structure and sidebar.

## Data model

### Resident identity master

The `Resident` table contains resident identity and reference information.

Operational pages must not overwrite resident identity directly unless the application explicitly supports an approved administrative correction workflow.

### Operational tables

Workflow data is stored in dedicated tables:

- `call_center`
- `door_to_door`
- `assignments`
- `remarks`
- `election_day`
- `transportation`
- `contact_verification`
- `workflow_shares`

All operational records should reference `resident_id`.

## Target operating model

### Dashboard — Supervisor Command Center

The Dashboard should answer three questions:

1. What needs attention now?
2. Who is working?
3. Where are operations behind?

Target sections:

- Critical queues
- Calls and visits in progress
- Expected votes not yet recorded
- Transport pending
- Assignment completion
- Agent activity
- Live activity feed

The Dashboard is read-only. Operational updates happen in their relevant workflows.

### Residents — Command Search

Residents remains the master directory and becomes the global campaign search experience.

Search targets:

- Name
- National ID
- Phone
- Resident ID
- Official address
- Current living place
- Election box
- Assignee

The page should use shared filters, shared pagination, and the standardized Resident Card.

### Resident Profile — Mission Control

The Resident Profile is the central workspace for one resident.

Target sections:

- Overview
- Timeline
- Call Center
- Door-to-Door
- Contact Verification
- Assignments
- Election Day
- Transportation
- Remarks

The user should be able to understand the resident's complete campaign history without opening multiple unrelated pages.

### Automatic timeline

Every meaningful structured action should create an activity event automatically.

Examples:

- Call completed
- Vote intention changed
- Door visit completed
- Contact correction requested or verified
- Assignment created or completed
- Transport requested, assigned, or completed
- Resident marked voted
- Remark added

A timeline event should include:

- Resident ID
- Module
- Action
- Structured summary
- Acting user or agent
- Timestamp
- Optional related record ID

### Assignments — Operations and progress

Assignments should show more than share-link creation.

Target agent metrics:

- Assigned
- Completed
- Remaining
- Completion percentage
- Last activity
- Open queue
- Share remaining queue

The same resident may be assigned to different assignees. Duplicate assignment prevention applies within the same assignee's queue.

### Election Day — Actionable queues

Election Day should prioritize residents requiring action instead of showing the full resident master by default.

Primary queue:

- Expected to vote
- Not yet recorded as voted

Additional filters:

- Party
- Election box
- House
- Assignee
- Assigned or unassigned
- Vote intention
- Needs transport
- Search

Use one `Share Current Queue` action that respects the current filters.

### Transportation — Logistics

Transportation should focus on residents who need transport.

Target fields:

- Resident
- Election box
- Pickup location
- Driver
- Vehicle
- Status
- Completion time

### Remarks

Remarks is the central place for free-text operational comments.

Each remark should contain:

- Resident ID
- Workflow section
- Remark
- Recorded by
- Recorded at

Structured actions remain in their own workflow tables and appear automatically in the resident timeline.

### Reports

Reports are read-only.

Planned views:

- Daily
- Weekly
- Overall
- Agent performance
- Party
- House
- Election box
- Call Center
- Door-to-Door
- Election Day
- Transportation

CSV export is the initial target. PDF export can be added later.

## Shared platform foundation

Before adding more standalone features, complete the reusable platform layer.

### Shared UI

- Resident Card
- Filter bar
- Search input
- Status badges
- Pagination
- Loading skeletons
- Empty states
- Primary and secondary actions

### Shared data layer

- Server-side pagination where supported
- Shared search and filter query handling
- Request deduplication
- Short-lived cache for resident identity
- Reliable refresh after writes
- Consistent error handling

### Shared workflow behavior

- Preserve filters when opening a profile and returning
- Scroll to the top when changing pages
- Avoid full-page reloads
- Use the correct `/resident-profile/?id=` route
- Generate remarks and timeline links consistently
- Keep resident identity separate from workflow records

## Implementation roadmap

### Phase 1 — Foundation

1. Verify and repair all current operational components.
2. Complete pagination and filter consistency on every resident-based page.
3. Standardize the Resident Card.
4. Standardize loading, empty, and error states.
5. Complete centralized Remarks integration.

### Phase 2 — Operational workflow

1. Build the automatic timeline engine.
2. Expand Resident Profile into Mission Control.
3. Add assignment completion and agent progress.
4. Finalize Election Day actionable queues.
5. Complete transportation workflow states.
6. Add a focused `My Work` experience after user identity and roles are implemented.

### Phase 3 — Management

1. Upgrade Dashboard into the Supervisor Command Center.
2. Add live activity as a Dashboard widget.
3. Add notifications through a compact global interface rather than another sidebar page.
4. Add house and election-box operational views.
5. Expand reports and exports.

### Phase 4 — Reliability

1. Add role-based access control.
2. Add audit and recovery procedures.
3. Add offline-safe or retryable Election Day writes where feasible.
4. Add database indexes based on real query usage.
5. Add regression tests for critical workflows.

## Immediate engineering priorities

The next implementation sequence should be:

1. Audit the repository for truncated or broken components.
2. Fix resident-list performance and pagination.
3. Standardize Resident Card usage.
4. Complete Remarks links and remove duplicate note fields.
5. Implement the automatic timeline data model and writer.
6. Build Resident Mission Control.
7. Add assignment progress.
8. Finalize Election Day queues.
9. Upgrade the Dashboard.

Known files requiring verification before further feature work:

- `components/CallCenterContent.tsx`
- `components/OperationsListContent.tsx`
- `styles/tailwind.css`

Do not treat a successful commit as proof that a whole-file replacement is complete. Fetch and inspect changed files after connector-based updates.

## Technology

- Next.js 15 static export
- React 19
- TypeScript
- Tailwind CSS
- Supabase
- GitHub Pages
- GitHub Actions

## Key source files

| Area | File |
|---|---|
| Root Dashboard | `app/page.tsx` |
| Shared application layout | `layout/AppLayout.tsx` |
| Current navigation | `layout/Sidebar.tsx` |
| Residents | `components/VoterManagementContent.tsx` |
| Call Center | `components/CallCenterContent.tsx` |
| Door-to-Door and shared operations | `components/OperationsListContent.tsx` |
| Transportation | `components/TransportationContent.tsx` |
| Resident and call data access | `lib/supabase.ts` |
| Election, transport, assignments, and sharing | `lib/operations.ts` |
| Static export configuration | `next.config.js` |
| GitHub Pages deployment | `.github/workflows/deploy.yml` |

## Deployment

Every push to `main` runs `.github/workflows/deploy.yml`.

The workflow should:

1. Check out the latest `main` branch.
2. Use Node.js 20.
3. Install dependencies.
4. Run the production build.
5. Verify `out/index.html`.
6. Upload the static export to GitHub Pages.

Required repository secrets:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Local verification:

```bash
npm install
npm run build
```

## Documentation maintenance

After a structural change:

1. Remove links to deleted routes.
2. Update the active route table from `layout/Sidebar.tsx`.
3. Update relevant architecture and workflow documentation.
4. Record important restore or migration commits in `SHAS.md`.
5. Run `npm run build` before treating the change as deployable.

Avoid maintaining mutable file blob SHAs inside this README. Use `SHAS.md` for recovery baselines.

## Project status definition

CampaignOps v1.0 is complete when:

- All operational pages use consistent resident cards, filters, pagination, loading, and error states.
- Resident Profile provides a complete operational view.
- Timeline events are generated automatically.
- Assignment completion and agent progress are visible.
- Election Day is driven by actionable queues.
- Transportation can be assigned and completed reliably.
- The Dashboard gives supervisors a clear operational picture.
- Critical workflows pass production build and regression testing.

Until those conditions are met, the architecture is complete but implementation remains in progress.

## License

Private project.

CampaignOps © 2026.
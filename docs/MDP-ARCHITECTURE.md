# MDP Vote app architecture and navigation

## Pages and links (all relative to /Vote)
| Purpose | Route | Main component |
| --- | --- | --- |
| Dashboard and workflow cards | /mdp/ | components/MDPResidentHome.tsx |
| Resident roster/search/remarks | /mdp/residents/ | components/VoterManagementContent.tsx |
| Phone calls | /mdp/calls/ | components/CallCenterContent.tsx |
| Visits | /mdp/residents/?focus=visited | components/VoterManagementContent.tsx |
| Voting plans | /mdp/residents/?focus=undecided | components/VoterManagementContent.tsx |
| Election-day turnout | /mdp/voting-days/ | components/MDPVotingDaysContent.tsx |
| Transport | /mdp/transportation/ | transport page component |
| Assignments | /mdp/assignments/ | assignments page component |
| Reporting | /mdp/reports/ | reports page component |

## Shared code
- `layout/MDPWorkspaceLayout.tsx`: global frame.
- `components/MDPWorkspaceNavigation.tsx`: navigation; use Next.js Link for internal routes.
- `components/AuthGate.tsx`: authorized session and feature access. Recent checks reused for 30 seconds for navigation only. Database permission checks remain authoritative.
- `lib/supabase.ts`: Supabase access and resident roster pagination.
- `components/ResidentTaskIcon.tsx`: shared workflow icons.
- `styles/mdp-workspace.css`: MDP look-and-feel and responsive spacing.
- `public/mdp/sw.js`: cache static assets only; do not cache resident data or authenticated API responses.

## Recommended user workflow
1. Find a resident by MDP serial, name or house.
2. Record call result and remark.
3. Record house visit or meeting and remark.
4. Record voting intention (not the same as confirmed turnout).
5. On election day mark a confirmed vote, or undo a mistaken vote.
6. Record transport and review reports.

## Performance rules
- Do not clear an authenticated shell on every route change.
- Reuse recent permission checks for fast navigation; backend enforces authorization on each protected operation.
- Prefetch static Next.js routes via Link, but not sensitive resident data.
- Page resident records; never fetch entire resident tables for each navigation if a paginated query can do the job.
- Use request sequence guards to prevent stale search results overwriting newer results.
- Verify GitHub Actions build and a signed-in browser journey before claiming production performance is solved.

## Known limits
- Initial sign-in, expired permissions, and uncached features still require server validation.
- Calls, visits and resident directory have their own data fetches; further timing and query-plan measurements are needed for a complete performance fix.

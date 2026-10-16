# MDP Resident Operations Implementation Plan

**Goal:** Provide a simpler mobile entry at `/Vote/mdp/` and preserve the existing staff workflows and records, with multi-day voting status.

**Architecture:** This repository is a Next.js static export with a `/Vote` base path. The entry screen and voting-day screen use the existing Supabase client, staff roles, Resident table, and workflow tables. New turnout tables are additive; the current `election_day` rows remain untouched. Do not apply the migration to production in this implementation.

**Spec:** `docs/superpowers/specs/2026-10-16-mdn-resident-operations-design.md`

## Completed

- [x] Add an MDP workspace layout with compact mobile navigation, dedicated MDP paths for the existing resident workflows, and action cards for all operational tasks.
- [x] Add `/mdp/voting-days/` with admin/supervisor date creation, paginated resident search using an explicit response allowlist, neutral status, mark, and undo controls.
- [x] Add `/mdp/transport-links/` to associate existing transport requests with a voting day or door-to-door visit.
- [x] Add additive SQL for voting days, per-resident/day status, append-only actor/time events, transport links, contextual remark fields, RLS, and atomic turnout RPCs.
- [x] Preserve current data and role gates; no resident data backfill or existing workflow table rewrite.
- [x] Add unit checks for neutral labels and pagination.

## Verification and remaining rollout

- [x] `npm test`
- [x] `npm run build`; static output includes `/mdp/` and `/mdp/voting-days/` under the configured `/Vote` base path.
- [ ] Review and apply `supabase/migrations/20261016180000_mdp_multi_voting_days.sql` in a Supabase development branch, run policy checks, and verify per-day isolation and audit behavior.
- [ ] Smoke-test using an authenticated staff account on mobile and desktop; verify resident links, role-restricted screens, mark/undo, and saved/failed messages.
- [ ] Open a draft PR targeting `fix/workflow-navigation-review` after review.

# Roster teams implementation plan

> **For agentic workers:** Use superpowers:executing-plans inline. Track checked steps here.

**Goal:** Predefined competition rosters, email-match joining, individual gameplay and roster-size team averages.
**Architecture:** Competition-scoped roster teams and member slots are authoritative. Keep legacy Team records intact; new runs get a separate rosterTeamId. Claims are unique per competition and user. CSV import and game creation are atomic.
**Tech Stack:** Next.js 16, React 19, Prisma 6, Postgres, Vitest.
**Spec:** docs/superpowers/specs/2026-10-20-roster-teams-design.md

## Global constraints
- Real source and converted CSV stay local and ignored; never log participant data.
- One to four members per team; average uses all listed members, including zero scores.
- OIDC identity plus entered roster email; no OTP or extra identity step.
- Admin-only competition creation and roster upload; private emails never returned in public APIs.

## Review focus
- Same team names in different competitions must not collide.
- Concurrent claims and repeat submissions must not duplicate membership.
- Roster upload errors must roll back game creation.
- Unclaimed members must count in averages without exposing emails.
- Legacy memberships and OIDC claims must not bypass roster verification.

## Tasks
- [x] 1. Add tested CSV parser and competition-scoped roster schema/migration. Parser tests cover quotes, blank columns, invalid rows, duplicate emails and variable sizes.
- [x] 2. Add transactional roster creation and claiming; integrate creation upload and access checks. Test matching, idempotency, conflicts and rollback.
- [x] 3. Replace onboarding; add roster upload UI, personal/team profile links and independent gameplay. Keep existing visual system and accessible labels/error states.
- [x] 4. Build standings from all roster slots; test team sizes 1–4, zero participants, best individual challenge scores and cross-team isolation.
- [x] 5. Run suite, lint, type checks and production compilation; exercise browser flows where local services allow. Review final diff and verify private files remain ignored.

## Execution ledger
- User explicitly requested complete inline implementation in the current project. Work in place; do not push or commit private data.
- Baseline: 22 test files pass; 3 database-dependent files fail because configured remote Postgres is unreachable. No schema or real roster imported remotely.
- Ruling: use separate CompetitionTeam/RosterMember models and Run.rosterTeamId instead of changing legacy Team uniqueness. This scopes membership and roster denominators to each competition and preserves historical records.

- Task 1: complete — strict CSV parser; additive schema and migration.
- Task 2: complete — atomic competition creation/import, idempotent claims, event-row locking, unique constraints, registration/run gating.
- Task 3: complete — scheduled/live CSV upload, onboarding, individual and team profiles, full independent challenge lineup.
- Task 4: complete — roster denominators 1–4, unclaimed zero scores, best completed individual runs, cross-team isolation.
- Task 5: complete — final full suite 29 files / 166 tests pass against isolated local Postgres; TypeScript passes; production build passes. Browser scenario passes desktop/mobile with no page errors. Additive SQL applied to a separate old-schema local DB; Prisma diff reports no differences.
- Final review: independent reviewer found selected-competition redirect loss; regression test observed failing, fixed, then passing. Reviewer verified follow-up; no further concrete issues reported.
- Ruling: fix existing live-preset minute rounding while testing creation — equal close/start timestamps prevented valid competition creation. Preserve local time and seconds. Remove render-time Date.now from the touched instant-launch preview.
- Existing unrelated lint failures: 8 errors remain in LeaderboardView.tsx, play/[runId]/page.tsx, LiveTimer.tsx, StandingsTable.tsx, and vfs/operations.ts. New roster files and touched creation components pass targeted lint.
- Privacy verification: converted upload CSV remains ignored/untracked; no real roster emails appear in deliverable changes. Original root CSV was absent at final verification; no implementation action deleted it. Nothing committed or pushed.
- Deployment boundary: configured remote DB and real roster were not modified. Apply schema to the intended database before running these changes there. Temporary databases contain fictional data only.

## Approved follow-up: per-member question sets and schema activation

- User approved database schema migration, but no import of real CSV data.
- Give each member 15 questions from the competition pool. Teams of 1–3 have disjoint sets. Teams of 4 use all 50 questions across 60 placements, minimizing repeats. Stable per-team/member shuffle; no new questions.
- Deterministic assignments use immutable roster positions and competition/team IDs. Lock published competition editing so a refresh cannot change sets.
- Enforce assigned questions in run creation, lobby, and next-question navigation. Require enough questions before publish/instant launch.
- Verify assignment boundaries, browser/API rejection, full suite, build, and configured DB metadata after migration.

- Follow-up complete: 15-question deterministic sets; disjoint for 1–3 members; minimum repeated placements for 4. API, lobby, next-question navigation share the same assignment helper.
- Configured database: additive roster migration applied with a direct connection and transaction. Verified CompetitionTeam and RosterMember tables; 50 existing published challenges retained. No CSV or roster data imported.
- Final checks: 30 files / 175 tests pass; production build passes; browser flow passes stable15, unauthorized-question403, profiles and returning sign-in. Independent review findings addressed, including transaction/status bypasses and hidden-question playability.
- Ruling: later catalog hiding must not remove already assigned questions. New publication rejects hidden pool entries. Published lineups cannot return to editable draft via either status endpoint.
- Type-check fix: move existing sanitizer out of a route module into src/lib/challenges/playerView.ts; use tagged union guards in lifecycle callers.

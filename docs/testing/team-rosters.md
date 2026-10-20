# Competition team rosters

## Prepare the database

Run `npx prisma generate` and `npx prisma db push` against the intended development database before starting the app. The change adds `CompetitionTeam`, `RosterMember`, and nullable `Run.rosterTeamId`; legacy users, teams, registrations, and runs remain stored. The additive SQL is also recorded in `prisma/migrations/20261020131000_competition_rosters/migration.sql`.

The repository's old initial migration uses SQLite `DATETIME` types even though the current provider is Postgres. Do not blindly replay that historical migration into a new Postgres database; the project's established setup uses `prisma db push`.

## Create a competition

1. Open Admin → Games → Create game (or Start Live Game).
2. Upload a CSV using `public/templates/team-roster.csv` as the format.
3. Complete the schedule and challenge lineup, save, and publish.

Each row has `team_name,email_1,email_2,email_3,email_4`. Supply one to four emails, leaving unused columns blank. Names may be quoted when containing commas. Emails are trimmed and lowercased. Duplicate emails or team names within one competition reject the entire file. The roster is scoped to its competition, so the same roster can be reused for another event.

A draft's detail screen shows team/member counts and allows replacing the roster. Published rosters are locked. An identical re-upload through the endpoint is idempotent. Original import files are never saved by the app: it stores only the team names and roster emails needed for matching.

## Join and play

Sign in with OIDC, choose the competition and an existing team, then enter your own roster email. A matching unclaimed email links the signed-in account to that team for that competition. As requested, this performs email matching only; it does not send an OTP or require the address to equal the OIDC address. A roster email and an account can each claim only one place in a competition.

A successful team/email match automatically registers the member and opens the challenge lobby. Upcoming competitions show the waiting state there; live competitions show the assigned challenges immediately. Every member has independent runs and a stable shuffled set of 15 assigned questions. Teams of 1–3 have disjoint sets. A four-member team uses all 50 existing questions across 60 placements with exactly 10 repeated placements. Published lineups are locked. The server rejects unassigned questions, and next-question navigation follows the member’s own order. Personal profile shows individual scores and links to team profiles. Team profile and standings use each member's best completed ranked score per challenge. Team score and time are averaged across joined members. Joined members who have not played contribute zero; unclaimed roster slots are excluded from both averages. A team with no joined members scores zero and has zero time. The displayed member count still reflects the uploaded roster size.

Existing competitions need a roster before new registrations or gameplay. Existing draft competitions can receive one on their admin detail screen. Historical runs remain accessible to their owner; legacy invite codes and OIDC team claims no longer grant gameplay access.

## Private files

`final_selected_teams.csv` and `private-rosters/` are ignored by Git. The local converted upload file is `private-rosters/competition-roster.csv`. Neither real CSV belongs in commits, public assets, screenshots, test fixtures, or external uploads performed by an agent. Only the fictional template is public. The user can upload the private converted file through the admin UI when ready.

## Verification

Use an isolated local Postgres database and fictional rosters:

```sh
DATABASE_URL=postgresql://postgres:localtest@127.0.0.1:55439/forge_test npx prisma db push
DATABASE_URL=postgresql://postgres:localtest@127.0.0.1:55439/forge_test npx tsx prisma/seed.ts
DATABASE_URL=postgresql://postgres:localtest@127.0.0.1:55439/forge_test ROSTER_INTEGRATION=true npm test
```

The opt-in roster integration suite refuses nonlocal database URLs. It exercises concurrent email claims, repeat claims, wrong-team matching, registration gating, idempotent import, published roster locking, and transaction rollback. Unit tests cover quoted CSV, validation, team sizes one through four, zero scores, cross-team score isolation, and authentication redirect preservation.

## Verification result (2026-10-20)

- 30 test files and 175 tests passed on isolated local Postgres, including nine roster integration tests.
- TypeScript check and production build passed.
- Additive SQL migration applied to an old-schema local database; schema comparison reported no differences.
- Browser checks passed admin CSV draft creation/publishing, wrong-email rejection, successful join, registration, full individual challenge access, run creation, personal/team profiles, returning sign-in, and mobile layout. Screenshots were inspected using fictional data only.
- Independent code review completed; the selected-competition login handoff finding was fixed and retested.
- Full lint retains eight pre-existing errors in unchanged files; targeted checks for new roster files and touched creation components passed.

## Approved follow-up

The user authorized applying the additive roster tables to the configured database. That migration has been applied and the new tables verified. No real roster was imported; competitions receive roster data only through the admin CSV upload.

Question sets require at least 15, 30, or 45 questions for rosters whose largest team has 1, 2, or 3–4 members. Publication and instant launch validate this requirement. Draft creation remains available before the pool is complete.

Final follow-up checks passed: exactly 15 stable questions after reload, server rejection of an unassigned question, individual run creation, returning sign-in, and desktop/mobile profiles. Browser QA used the Webpack development option after an environment-specific Turbopack hot-reload loop; the production Turbopack build passed. The Next.js route sanitizer was moved unchanged to a shared library to satisfy generated route-export checks.

Publication, roster replacement, and draft edits serialize on the competition row. Status APIs cannot bypass publish validation or return published games to draft. Hidden questions cannot enter a newly published pool; hiding an already assigned question from the catalog does not remove it from the locked competition.

## Standings and joining regression checks (2026-10-20)

Reproduced the omitted-team-rows update loop in an isolated browser: the old code produced 91 maximum-update-depth errors; the stable default produced zero. The admin view now uses its operations poll for both individual and team standings, with no duplicate public standings poll. Verified one operations request across an 11-second browser observation and no update-depth errors.

For contextual joining, verify `/register?eventId=<competition>` shows a read-only competition name and no progress strip. The team list is searchable, scrollable, and stays visible after selection; clearing the search preserves selection. Verified the email field and desktop/mobile layouts with fictional teams. Full suite: 175 tests passed; changed-component lint, TypeScript, and isolated production build passed. Strict route typing also exposed an unused `formatDuration` re-export in the leaderboard route; removed that export while retaining the shared formatting function.

Automatic-entry regression: joining a matching roster slot creates the competition registration in the same transaction; repeat claims retain exactly one registration. The client opens `/games/<id>/lobby` directly, and the existing-member link also opens that lobby. Existing members without an older registration are registered when opening a published, unexpired lobby. Verified the browser proceeds straight from the email form to all 15 assigned challenges, without the competition overview or a separate register click.

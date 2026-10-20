# CSV roster teams

## Agreed outcome

Users sign in through OIDC, select a predefined team, and enter an email. The server matches that email against the selected team's one to four CSV roster entries and links the signed-in account to that entry. No OTP, email ownership proof, or requirement to match the OIDC email is included. Users cannot create teams or games.

Each member retains an individual profile, individual challenge runs, progress, and scores. A team profile shows all roster members and their participation. For each game, team score is the sum of individual scores divided by the actual roster size (one to four). Listed members who have not claimed their account or played contribute zero. Blank CSV slots do not count as members.

## Roster import

Provide an admin-only roster CSV upload during competition creation; associate the imported roster with that competition. Provide a CSV import with a downloadable template using columns `team_name,email_1,email_2,email_3,email_4`. Actual supplied CSV columns can be mapped to this shape before import. Parse quoted CSV correctly; trim names and trim/lowercase emails. Require one to four distinct valid addresses per team; ignore blank email columns. The number of populated columns determines team size. Reject duplicate names or emails across teams within an import and conflicts with existing roster entries. Validate the whole file before applying it atomically and report row-specific errors.

Repeated identical imports are idempotent. Existing claimed or published rosters cannot be replaced or reassigned through import. Unclaimed draft rosters may be replaced atomically. Existing legacy teams, memberships, and historical runs remain stored; only imported roster teams participate in the new onboarding list. Legacy memberships do not bypass roster onboarding.

## Data and membership

Use competition-scoped CompetitionTeam and RosterMember models. Each roster entry stores normalized email, roster position, and an optional linked user. Enforce unique roster email and linked user within each competition, plus unique team position, at the database level. Membership claims and roster replacements lock the competition row and happen transactionally. Legacy Team and TeamMembership remain historical; they do not grant roster access. Add nullable Run.rosterTeamId so individual runs remain associated with their competition team without altering historical records.

The join endpoint accepts only a selected team ID and email. Unknown teams, mismatches, already-claimed slots, and accounts already linked elsewhere return clear errors. Repeating the same valid claim succeeds without duplicates. Retain per-user rate limiting. Return only team names/IDs in the selection list, never roster email lists. Team profiles expose member display names and unclaimed positions, not private email addresses.

## Authentication and access

Remove automatic team creation and joining from OIDC team claims. After authentication, regular users without a claimed roster entry go to onboarding. Returning claimed users proceed to their intended internal destination. Admins retain admin access without requiring team membership. Use competition-scoped database membership checks for gameplay authorization rather than relying solely on a potentially stale cookie.

Gate gameplay registration and run creation on roster membership. Keep game creation restricted to admins. Public game browsing and permitted public results remain available. Legacy competitions require a roster before accepting new registration or run creation. Audit legacy routes so team creation, invite codes, and legacy gameplay cannot bypass the new flow.

## Profiles and scoring

Keep `/profile` as the personal profile and add a team-profile link. The team profile shows the actual roster positions, each claimed member's name and per-game score, and the team average. Gameplay stays individual; teammates do not share terminal state or control another member's run.

Build team standings from complete imported rosters, including slots without accounts or game registrations. Preserve the current individual best-completed-run-per-challenge scoring and existing standings tie-breakers. Divide by the actual roster size and round the displayed team score to two decimals. Example: a two-member roster with scores 100 and 80 produces 90; a four-member roster with scores 100, 80, 0, 0 produces 45, even if only two members have signed in.

## Verification

Test CSV quoting and malformed rows, normalized email matching, atomic rejection, idempotent imports, duplicate and concurrent claims, repeat claims, and rejection of membership bypasses. Test new and returning OIDC redirects, independent player run ownership, and roster-based averages with unclaimed/nonplaying members. Run relevant existing tests, lint, TypeScript checks, and a production build where configured services allow. Verify onboarding, personal/team profiles, admin import, and standings in a browser.

## Delivery constraints

Read the installed Next.js guides before changing application code. Follow existing Prisma and UI conventions. Do not fabricate real teams or participant data. Deliver the CSV template and import mechanism; real roster import requires the user's CSV. Follow-up user authorization permits applying the additive roster schema to the configured database, but does not permit importing real roster data or deploying/pushing code.

## Private source and upload artifact

`final_selected_teams.csv` is a private local source and must not be committed or bundled. The converted `private-rosters/competition-roster.csv` is also private and ignored by Git. Group source rows by trimmed team name (registration IDs are not consistent within every team), retain only team names and normalized member emails, and omit all other personal details. The checked source contains 28 teams and 85 members, with team sizes from one to four. Commit only a fictional or empty CSV template.

## Approved per-member question sets

Each roster member receives 15 distinct questions in a stable shuffled order. For teams of one to three, sets are disjoint. For a four-member team and a pool of 50, use all 50 existing questions across 60 placements with the minimum ten repeated placements. Never create new questions. Assignments depend on competition ID, team ID, immutable roster position, and the locked published lineup. The same mapping drives lobby display, run authorization, and next-question navigation. Require sufficient pool size before publishing and reject edits to published competition drafts.

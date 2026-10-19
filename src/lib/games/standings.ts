import { prisma } from "@/lib/prisma";

export interface StandingsRun {
  userId: string;
  userName: string;
  challengeId: string;
  finalScore: number;
  durationMs: number | null;
  completedAt: Date | null;
  teamId?: string | null;
  teamName?: string | null;
}

export interface TeamMemberScore {
  userId: string;
  userName: string;
  score: number;
  challengesCompleted: number;
}

export interface TeamStanding {
  rank: number;
  teamId: string;
  teamName: string;
  totalScore: number; // Average of all members' scores
  memberCount: number;
  members: TeamMemberScore[];
  challengesCompleted: number; // Total challenges completed across team
  aggregateDurationMs: number;
  lastCompletionMs: number;
  isViewer?: boolean;
}

function isBetterChallengeRun(candidate: StandingsRun, previous?: StandingsRun): boolean {
  if (!previous) return true;
  if (candidate.finalScore !== previous.finalScore) {
    return candidate.finalScore > previous.finalScore;
  }
  const candidateDuration = candidate.durationMs ?? Number.POSITIVE_INFINITY;
  const previousDuration = previous.durationMs ?? Number.POSITIVE_INFINITY;
  if (candidateDuration !== previousDuration) {
    return candidateDuration < previousDuration;
  }
  return (candidate.completedAt?.getTime() ?? Number.POSITIVE_INFINITY) <
    (previous.completedAt?.getTime() ?? Number.POSITIVE_INFINITY);
}

export function rankIndividualRuns(runs: StandingsRun[]) {
  const users = new Map<
    string,
    {
      userId: string;
      userName: string;
      totalScore: number;
      challengesCompleted: number;
      aggregateDurationMs: number;
      lastCompletionMs: number;
      best: Map<string, StandingsRun>;
    }
  >();

  for (const run of runs) {
    let row = users.get(run.userId);
    if (!row) {
      row = {
        userId: run.userId,
        userName: run.userName,
        totalScore: 0,
        challengesCompleted: 0,
        aggregateDurationMs: 0,
        lastCompletionMs: 0,
        best: new Map(),
      };
      users.set(run.userId, row);
    }
    const previous = row.best.get(run.challengeId);
    if (isBetterChallengeRun(run, previous)) {
      row.best.set(run.challengeId, run);
    }
  }

  const rows = [...users.values()].map((row) => {
    for (const run of row.best.values()) {
      row.totalScore += run.finalScore;
      row.aggregateDurationMs += run.durationMs || 0;
      row.lastCompletionMs = Math.max(
        row.lastCompletionMs,
        run.completedAt?.getTime() || 0
      );
    }
    row.totalScore = Math.round(row.totalScore * 100) / 100;
    row.challengesCompleted = row.best.size;
    return row;
  });

  rows.sort(
    (a, b) =>
      b.totalScore - a.totalScore ||
      b.challengesCompleted - a.challengesCompleted ||
      a.aggregateDurationMs - b.aggregateDurationMs ||
      a.lastCompletionMs - b.lastCompletionMs
  );

  return rows.map(({ best: _best, ...row }, index) => ({
    ...row,
    rank: index + 1,
  }));
}

/**
 * Computes team standings where team score is the exact average of all members' scores.
 * Tie-breaker: Total challenges completed desc -> Aggregate duration asc -> Last completion asc.
 */
export function rankTeamStandings(
  teams: Array<{
    teamId: string;
    teamName: string;
    members: Array<{ userId: string; userName: string }>;
  }>,
  runs: StandingsRun[]
): TeamStanding[] {
  // Map each user to their best run per challenge
  const userBestMap = new Map<string, Map<string, StandingsRun>>();
  for (const r of runs) {
    let uMap = userBestMap.get(r.userId);
    if (!uMap) {
      uMap = new Map();
      userBestMap.set(r.userId, uMap);
    }
    const prev = uMap.get(r.challengeId);
    if (isBetterChallengeRun(r, prev)) {
      uMap.set(r.challengeId, r);
    }
  }

  const teamRows: TeamStanding[] = teams.map((team) => {
    let totalScoreSum = 0;
    let teamChallengesCompleted = 0;
    let aggregateDurationMs = 0;
    let lastCompletionMs = 0;

    const members: TeamMemberScore[] = team.members.map((m) => {
      const uMap = userBestMap.get(m.userId);
      let mScore = 0;
      let mCompleted = 0;

      if (uMap) {
        for (const run of uMap.values()) {
          mScore += run.finalScore;
          mCompleted += 1;
          aggregateDurationMs += run.durationMs || 0;
          lastCompletionMs = Math.max(
            lastCompletionMs,
            run.completedAt?.getTime() || 0
          );
        }
      }

      totalScoreSum += mScore;
      teamChallengesCompleted += mCompleted;

      return {
        userId: m.userId,
        userName: m.userName,
        score: Math.round(mScore * 100) / 100,
        challengesCompleted: mCompleted,
      };
    });

    const memberCount = Math.max(1, team.members.length);
    // Team score is strictly the average of all team members' scores
    const averageScore = Math.round((totalScoreSum / memberCount) * 100) / 100;

    return {
      rank: 0,
      teamId: team.teamId,
      teamName: team.teamName,
      totalScore: averageScore,
      memberCount,
      members,
      challengesCompleted: teamChallengesCompleted,
      aggregateDurationMs,
      lastCompletionMs,
    };
  });

  teamRows.sort(
    (a, b) =>
      b.totalScore - a.totalScore ||
      b.challengesCompleted - a.challengesCompleted ||
      a.aggregateDurationMs - b.aggregateDurationMs ||
      a.lastCompletionMs - b.lastCompletionMs
  );

  return teamRows.map((t, index) => ({ ...t, rank: index + 1 }));
}

export async function getGameStandings(eventId: string, viewerId?: string) {
  let game = await prisma.event.findFirst({
    where: {
      OR: [{ id: eventId }, { slug: eventId }],
    },
  });
  if (!game) return { error: "Game not found.", standings: [], teamStandings: [] };

  const now = new Date();
  if (game.status === "PUBLISHED" && game.endTime && now >= game.endTime) {
    game = await prisma.event.update({
      where: { id: game.id },
      data: { status: "ENDED" },
    });
  }

  if (
    game.leaderboardVisibility === "HIDDEN" ||
    (game.leaderboardVisibility === "AFTER_END" &&
      game.status !== "ENDED" &&
      game.status !== "ARCHIVED")
  ) {
    return {
      error: "Standings are not available yet.",
      standings: [],
      teamStandings: [],
    };
  }

  const runs = await prisma.run.findMany({
    where: {
      eventId: game.id,
      status: "COMPLETED",
      isRanked: true,
      userId: { not: null },
      legacyIndividualEligible: false,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          memberships: {
            include: { team: true },
          },
        },
      },
      team: true,
    },
  });

  const individualStandings = rankIndividualRuns(
    runs.flatMap((run) =>
      run.userId && run.user
        ? [
            {
              userId: run.userId,
              userName: run.user.name,
              challengeId: run.challengeId,
              finalScore: run.finalScore,
              durationMs: run.durationMs,
              completedAt: run.completedAt,
              teamId: run.teamId || run.user.memberships[0]?.teamId,
              teamName: run.team?.name || run.user.memberships[0]?.team?.name,
            },
          ]
        : []
    )
  );

  // Collect teams and participating members
  const teamsMap = new Map<
    string,
    { teamId: string; teamName: string; membersMap: Map<string, string> }
  >();

  // 1. Collect from event registrations
  const registrations = await prisma.gameRegistration.findMany({
    where: { eventId: game.id, status: "REGISTERED" },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          memberships: {
            include: { team: true },
          },
        },
      },
    },
  });

  for (const reg of registrations) {
    for (const mem of reg.user.memberships) {
      if (!teamsMap.has(mem.teamId)) {
        teamsMap.set(mem.teamId, {
          teamId: mem.teamId,
          teamName: mem.team.name,
          membersMap: new Map(),
        });
      }
      teamsMap.get(mem.teamId)!.membersMap.set(reg.user.id, reg.user.name);
    }
  }

  // 2. Collect from completed runs
  for (const r of runs) {
    const tId = r.teamId || r.user?.memberships[0]?.teamId;
    const tName = r.team?.name || r.user?.memberships[0]?.team?.name;
    if (tId && tName) {
      if (!teamsMap.has(tId)) {
        teamsMap.set(tId, {
          teamId: tId,
          teamName: tName,
          membersMap: new Map(),
        });
      }
      if (r.userId && r.user) {
        teamsMap.get(tId)!.membersMap.set(r.userId, r.user.name);
      }
    }
  }

  const teamList = Array.from(teamsMap.values()).map((t) => ({
    teamId: t.teamId,
    teamName: t.teamName,
    members: Array.from(t.membersMap.entries()).map(([userId, userName]) => ({
      userId,
      userName,
    })),
  }));

  const teamStandings = rankTeamStandings(
    teamList,
    runs.flatMap((run) =>
      run.userId && run.user
        ? [
            {
              userId: run.userId,
              userName: run.user.name,
              challengeId: run.challengeId,
              finalScore: run.finalScore,
              durationMs: run.durationMs,
              completedAt: run.completedAt,
              teamId: run.teamId,
            },
          ]
        : []
    )
  );

  return {
    standings: individualStandings.map((row) => ({
      ...row,
      isViewer: row.userId === viewerId,
    })),
    teamStandings: teamStandings.map((row) => ({
      ...row,
      isViewer: row.members.some((m) => m.userId === viewerId),
    })),
  };
}

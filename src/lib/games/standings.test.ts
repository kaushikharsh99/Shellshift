import { describe, expect, it } from "vitest";
import { rankIndividualRuns, rankTeamStandings } from "./standings";

describe("individual standings", () => {
  it("uses the faster run when a player has equal scores for one challenge", () => {
    const completedAt = new Date("2026-10-12T10:00:00Z");
    const ranked = rankIndividualRuns([
      { userId: "a", userName: "Alice", challengeId: "one", finalScore: 900, durationMs: 60_000, completedAt },
      { userId: "a", userName: "Alice", challengeId: "one", finalScore: 900, durationMs: 20_000, completedAt },
      { userId: "b", userName: "Bob", challengeId: "one", finalScore: 900, durationMs: 30_000, completedAt },
    ]);
    expect(ranked.map((row) => row.userId)).toEqual(["a", "b"]);
    expect(ranked[0].aggregateDurationMs).toBe(20_000);
  });

  it("uses the earlier completion when score and duration tie", () => {
    const ranked = rankIndividualRuns([
      { userId: "a", userName: "Alice", challengeId: "one", finalScore: 900, durationMs: 20_000, completedAt: new Date("2026-10-12T10:02:00Z") },
      { userId: "a", userName: "Alice", challengeId: "one", finalScore: 900, durationMs: 20_000, completedAt: new Date("2026-10-12T10:00:00Z") },
      { userId: "b", userName: "Bob", challengeId: "one", finalScore: 900, durationMs: 20_000, completedAt: new Date("2026-10-12T10:01:00Z") },
    ]);
    expect(ranked.map((row) => row.userId)).toEqual(["a", "b"]);
    expect(ranked[0].lastCompletionMs).toBe(new Date("2026-10-12T10:00:00Z").getTime());
  });

  it("keeps each user's best challenge score and applies deterministic tie breaks", () => {
    const ranked = rankIndividualRuns([
      { userId: "a", userName: "Alice", challengeId: "one", finalScore: 800, durationMs: 80_000, completedAt: new Date("2026-10-12T10:00:00Z") },
      { userId: "a", userName: "Alice", challengeId: "one", finalScore: 900, durationMs: 90_000, completedAt: new Date("2026-10-12T10:02:00Z") },
      { userId: "b", userName: "Bob", challengeId: "one", finalScore: 900, durationMs: 70_000, completedAt: new Date("2026-10-12T10:03:00Z") },
    ]);
    expect(ranked.map((row) => row.userId)).toEqual(["b", "a"]);
    expect(ranked[1].totalScore).toBe(900);
  });
});

describe("team standings (average of all members)", () => {
  it("uses the faster equal-score attempt for team tie breaks", () => {
    const completedAt = new Date("2026-10-12T10:00:00Z");
    const teams = [
      { teamId: "a", teamName: "Alice team", members: [{ userId: "a", userName: "Alice" }] },
      { teamId: "b", teamName: "Bob team", members: [{ userId: "b", userName: "Bob" }] },
    ];
    const ranked = rankTeamStandings(teams, [
      { userId: "a", userName: "Alice", challengeId: "one", finalScore: 900, durationMs: 60_000, completedAt },
      { userId: "a", userName: "Alice", challengeId: "one", finalScore: 900, durationMs: 20_000, completedAt },
      { userId: "b", userName: "Bob", challengeId: "one", finalScore: 900, durationMs: 30_000, completedAt },
    ]);
    expect(ranked.map((row) => row.teamId)).toEqual(["a", "b"]);
    expect(ranked[0].aggregateDurationMs).toBe(20_000);
  });

  it("calculates team score as exact average of all member scores", () => {
    const teams = [
      {
        teamId: "solo-team",
        teamName: "Solo Hacker",
        members: [{ userId: "m1", userName: "Solo Player" }],
      },
      {
        teamId: "quad-team",
        teamName: "Kernel Panic",
        members: [
          { userId: "m2", userName: "Alice" },
          { userId: "m3", userName: "Bob" },
          { userId: "m4", userName: "Charlie" },
          { userId: "m5", userName: "Dave" },
        ],
      },
    ];

    const runs = [
      // Solo hacker scored 900
      { userId: "m1", userName: "Solo Player", challengeId: "c1", finalScore: 900, durationMs: 50_000, completedAt: new Date() },
      // Quad team: 4 members scored 800 each
      { userId: "m2", userName: "Alice", challengeId: "c1", finalScore: 800, durationMs: 40_000, completedAt: new Date() },
      { userId: "m3", userName: "Bob", challengeId: "c2", finalScore: 800, durationMs: 45_000, completedAt: new Date() },
      { userId: "m4", userName: "Charlie", challengeId: "c3", finalScore: 800, durationMs: 42_000, completedAt: new Date() },
      { userId: "m5", userName: "Dave", challengeId: "c4", finalScore: 800, durationMs: 41_000, completedAt: new Date() },
    ];

    const ranked = rankTeamStandings(teams, runs);

    // Solo team score = 900 / 1 = 900 (Rank 1)
    expect(ranked[0].teamName).toBe("Solo Hacker");
    expect(ranked[0].totalScore).toBe(900);
    expect(ranked[0].memberCount).toBe(1);

    // Quad team score = (800*4)/4 = 800 (Rank 2)
    expect(ranked[1].teamName).toBe("Kernel Panic");
    expect(ranked[1].totalScore).toBe(800);
    expect(ranked[1].memberCount).toBe(4);
    expect(ranked[1].challengesCompleted).toBe(4);
  });
});

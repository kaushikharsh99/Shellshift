import { describe, it, expect } from "vitest";
import { rankRosterTeams } from "./standings";
describe("complete competition roster standings", () => {
  it("uses actual roster sizes, including unclaimed and nonplaying members", () => {
    const teams = [1, 2, 3, 4].map((size) => ({
      id: `t${size}`,
      name: `Team ${size}`,
      members: Array.from({ length: size }, (_, i) => ({
        id: `${size}-${i}`,
        position: i,
        userId: i === 0 ? `u${size}` : null,
        user: i === 0 ? { name: "Player" } : null,
      })),
    }));
    const runs = [1, 2, 3, 4].map((size) => ({
      userId: `u${size}`,
      userName: "Player",
      challengeId: "c",
      finalScore: 120,
      durationMs: 100,
      completedAt: new Date(),
      teamId: `t${size}`,
    }));
    expect(rankRosterTeams(teams, runs).map((r) => r.totalScore)).toEqual([
      120, 60, 40, 30,
    ]);
  });
  it("counts unplayed teams at zero without returning roster emails", () => {
    const rows = rankRosterTeams(
      [
        {
          id: "t",
          name: "A",
          members: [{ id: "slot", position: 0, userId: null, user: null }],
        },
      ],
      [],
    );
    expect(rows[0].totalScore).toBe(0);
    expect(rows[0].members[0].userName).toBe("Member 1 · Not joined");
    expect(JSON.stringify(rows)).not.toContain("email");
  });
  it("excludes runs attached to a different team and preserves best-run scoring", () => {
    const teams = [
      {
        id: "t",
        name: "A",
        members: [
          { id: "s", position: 0, userId: "u", user: { name: "Player" } },
        ],
      },
    ];
    const run = {
      userId: "u",
      userName: "Player",
      challengeId: "c",
      finalScore: 100,
      durationMs: 100,
      completedAt: new Date(),
      teamId: "other",
    };
    expect(rankRosterTeams(teams, [run])[0].totalScore).toBe(0);
    expect(
      rankRosterTeams(teams, [
        { ...run, teamId: "t" },
        { ...run, teamId: "t", finalScore: 200 },
      ])[0].totalScore,
    ).toBe(200);
  });
});

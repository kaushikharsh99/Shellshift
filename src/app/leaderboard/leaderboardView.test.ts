import { describe, expect, it } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { LeaderboardView, LeaderboardEntry } from "./LeaderboardView";

describe("Points-Only Event Leaderboard", () => {
  it("renders pure points leaderboard without first finish race", () => {
    const entries: LeaderboardEntry[] = [
      {
        userId: "p1",
        userName: "CyberNinja",
        totalScore: 1250.5,
        challengesCompleted: 3,
        aggregateDurationMs: 45000,
      },
      {
        userId: "p2",
        userName: "ByteCoder",
        totalScore: 980.25,
        challengesCompleted: 2,
        aggregateDurationMs: 30000,
      },
    ];

    const html = renderToStaticMarkup(
      React.createElement(LeaderboardView, {
        entries,
        totalChallenges: 5,
        currentUserId: "p1",
        eventName: "ShellShift Invitational",
      })
    );

    // Verify it is strictly a Points Leaderboard
    expect(html).toContain("Points Leaderboard");
    expect(html).toContain("Total points → Time");
    expect(html).toContain("ShellShift Invitational");

    // Strictly verify "First Finish Race" is NOT present anywhere
    expect(html).not.toContain("First Finish Race");
    expect(html).not.toContain("First Finish");
    expect(html).not.toContain("Race to First");

    // Verify player scores and ranks
    expect(html).toContain("CyberNinja");
    expect(html).toContain("1,250.50 PTS");
    expect(html).not.toContain("Solved");
    expect(html).not.toContain("3 / 5");
    expect(html).toContain("YOU");

    expect(html).toContain("ByteCoder");
    expect(html).toContain("980.25 PTS");
    expect(html).not.toContain("2 / 5");
  });

  it("strictly sorts contestants by total score descending", () => {
    const entries: LeaderboardEntry[] = [
      {
        userId: "low",
        userName: "Player Low",
        totalScore: 500,
        challengesCompleted: 4, // More completed, but fewer points
        aggregateDurationMs: 20000,
      },
      {
        userId: "high",
        userName: "Player High",
        totalScore: 1000,
        challengesCompleted: 2, // Fewer completed, but more points
        aggregateDurationMs: 40000,
      },
    ];

    const html = renderToStaticMarkup(
      React.createElement(LeaderboardView, {
        entries,
        totalChallenges: 5,
      })
    );

    // In points-only leaderboard, Player High must appear before Player Low
    const highIndex = html.indexOf("Player High");
    const lowIndex = html.indexOf("Player Low");
    expect(highIndex).toBeGreaterThan(-1);
    expect(lowIndex).toBeGreaterThan(-1);
    expect(highIndex).toBeLessThan(lowIndex);
  });

  it("renders compact team rows with average scores and no member breakdown", () => {
    const teamEntries = [
      {
        rank: 1,
        teamId: "t-solo",
        teamName: "SoloHacker",
        totalScore: 900, // 1 member scoring 900 -> 900
        memberCount: 1,
        members: [
          { userId: "u1", userName: "Neo", score: 900, challengesCompleted: 2 },
        ],
        challengesCompleted: 2,
        aggregateDurationMs: 60000,
        lastCompletionMs: 1000,
      },
      {
        rank: 2,
        teamId: "t-quad",
        teamName: "QuadSquad",
        totalScore: 800, // 4 members scoring 800 each -> average 800 (not 3200)
        memberCount: 4,
        members: [
          { userId: "u2", userName: "Alice", score: 800, challengesCompleted: 2 },
          { userId: "u3", userName: "Bob", score: 800, challengesCompleted: 2 },
          { userId: "u4", userName: "Charlie", score: 800, challengesCompleted: 2 },
          { userId: "u5", userName: "Dave", score: 800, challengesCompleted: 2 },
        ],
        challengesCompleted: 8,
        aggregateDurationMs: 240000,
        lastCompletionMs: 2000,
      },
    ];

    const html = renderToStaticMarkup(
      React.createElement(LeaderboardView, {
        entries: [],
        teamEntries,
        totalChallenges: 10,
        currentTeamId: "t-quad",
        eventName: "Championship 2026",
        defaultView: "teams",
      })
    );

    // Verify Points Leaderboard header
    expect(html).toContain("Points Leaderboard");
    expect(html).toContain("Championship 2026");

    // Verify team names
    expect(html).toContain("SoloHacker");
    expect(html).toContain("QuadSquad");

    // Verify team scores are the exact average, not sum!
    expect(html).toMatch(/>900\s*<\/td>/);
    expect(html).toMatch(/>800\s*<\/td>/);
    expect(html).not.toContain("3,200 PTS");
    expect(html).not.toContain("3200 PTS");

    expect(html.match(/<th(?:\s|>)/g)).toHaveLength(4);
    expect(html).not.toContain("Team Solved");
    // Member details belong on the team profile, not each leaderboard row.
    expect(html).not.toContain("Alice");
    expect(html).not.toContain("Bob");
    expect(html).not.toContain("Charlie");
    expect(html).not.toContain("Dave");
    expect(html).not.toContain("Neo");

    // Verify viewer's team badge
    expect(html).toContain(">YOU<");

    // Verify rank order: SoloHacker (900) before QuadSquad (800)
    const soloIndex = html.indexOf("SoloHacker");
    const quadIndex = html.indexOf("QuadSquad");
    expect(soloIndex).toBeGreaterThan(-1);
    expect(quadIndex).toBeGreaterThan(-1);
    expect(soloIndex).toBeLessThan(quadIndex);
  });
});

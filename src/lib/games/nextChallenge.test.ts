import { describe, expect, it } from "vitest";
import { selectNextAssignedChallenge } from "./nextChallenge";

const lineup = [
  { challengeId: "a", order: 1, challenge: { id: "a", title: "A", slug: "a", difficulty: "EASY", isPublished: true } },
  { challengeId: "b", order: 2, challenge: { id: "b", title: "B", slug: "b", difficulty: "MEDIUM", isPublished: true } },
  { challengeId: "c", order: 3, challenge: { id: "c", title: "C", slug: "c", difficulty: "HARD", isPublished: true } },
  { challengeId: "d", order: 4, challenge: { id: "d", title: "D", slug: "d", difficulty: "EASY", isPublished: true } },
];

describe("next game challenge", () => {
  it("returns none after the final lineup challenge even if other published challenges exist", () => {
    expect(selectNextAssignedChallenge(lineup.slice(0, 1), "a", "alice", [])).toBeNull();
  });

  it("uses event lineup order instead of global challenge order", () => {
    const differentGlobalOrder = [
      { ...lineup[0], challenge: { ...lineup[0].challenge, order: 9000 } },
      { ...lineup[1], challenge: { ...lineup[1].challenge, order: 1 } },
    ];
    expect(selectNextAssignedChallenge(differentGlobalOrder, "a", "alice", [])?.id).toBe("b");
  });

  it("skips challenges assigned to another team member", () => {
    expect(selectNextAssignedChallenge(lineup, "a", "alice", ["alice", "bob"])?.id).toBe("c");
    expect(selectNextAssignedChallenge(lineup, "b", "bob", ["alice", "bob"])?.id).toBe("d");
    expect(selectNextAssignedChallenge(lineup, "c", "alice", ["alice", "bob"])).toBeNull();
  });

  it("does not offer a challenge if the current challenge is outside the lineup", () => {
    expect(selectNextAssignedChallenge(lineup, "outside", "alice", [])).toBeNull();
  });
});

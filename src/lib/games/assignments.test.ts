import { describe, expect, it } from "vitest";
import { assignTeamQuestions } from "./assignments";
const pool = Array.from({ length: 50 }, (_, i) => `q${i}`);
describe("stable team question sets", () => {
  it.each([1, 2, 3])(
    "gives %i members fifteen questions each without overlap",
    (size) => {
      const sets = assignTeamQuestions(pool, size, "competition:team");
      expect(sets).toHaveLength(size);
      expect(
        sets.every((set) => set.length === 15 && new Set(set).size === 15),
      ).toBe(true);
      expect(new Set(sets.flat()).size).toBe(size * 15);
    },
  );
  it("uses all fifty existing questions for four sets of fifteen with only ten repeated placements", () => {
    const sets = assignTeamQuestions(pool, 4, "competition:team");
    expect(sets.map((s) => s.length)).toEqual([15, 15, 15, 15]);
    expect(new Set(sets.flat()).size).toBe(50);
    expect(sets.every((s) => new Set(s).size === 15)).toBe(true);
    expect(sets.flat().every((q) => pool.includes(q))).toBe(true);
    expect(new Set(sets.map((s) => s.join(","))).size).toBe(4);
  });
  it("keeps assignments stable and shuffles independently between teams", () => {
    expect(assignTeamQuestions(pool, 4, "a")).toEqual(
      assignTeamQuestions(pool, 4, "a"),
    );
    expect(assignTeamQuestions(pool, 4, "a")).not.toEqual(
      assignTeamQuestions(pool, 4, "b"),
    );
    expect(assignTeamQuestions(pool, 1, "a")[0]).not.toEqual(pool.slice(0, 15));
  });
  it("rejects undersized pools rather than silently overlapping smaller teams", () => {
    expect(() => assignTeamQuestions(pool.slice(0, 29), 2, "a")).toThrow();
    expect(() => assignTeamQuestions(pool.slice(0, 14), 1, "a")).toThrow();
  });
});

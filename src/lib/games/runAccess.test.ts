import { describe, expect, it } from "vitest";
import { evaluateRunAccess } from "./runAccess";

describe("individual run access", () => {
  it("forbids other users and permits owner/admin", () => {
    const run = { userId: "owner", deadlineAt: new Date("2026-10-12T11:00:00Z"), event: { status: "PUBLISHED", endTime: new Date("2026-10-12T12:00:00Z") } };
    expect(evaluateRunAccess(run, { id: "other", role: "USER" }, new Date("2026-10-12T10:00:00Z"))).toBe("RUN_FORBIDDEN");
    expect(evaluateRunAccess(run, { id: "owner", role: "USER" }, new Date("2026-10-12T10:00:00Z"))).toBe("OK");
    expect(evaluateRunAccess(run, { id: "admin", role: "ADMIN" }, new Date("2026-10-12T10:00:00Z"))).toBe("OK");
  });

  it("uses event state and ignores earlier challenge deadlines", () => {
    const base = { userId: "owner", deadlineAt: new Date("2026-10-12T11:00:00Z"), event: { status: "PUBLISHED", endTime: new Date("2026-10-12T12:00:00Z") } };
    expect(evaluateRunAccess({ ...base, event: { ...base.event, status: "PAUSED" } }, { id: "owner", role: "USER" }, new Date("2026-10-12T10:00:00Z"))).toBe("GAME_PAUSED");
    expect(evaluateRunAccess({ ...base, event: { ...base.event, status: "ENDED" } }, { id: "owner", role: "USER" }, new Date("2026-10-12T10:00:00Z"))).toBe("GAME_ENDED");
    expect(evaluateRunAccess(base, { id: "owner", role: "USER" }, new Date("2026-10-12T11:00:00Z"))).toBe("OK");
  });
});

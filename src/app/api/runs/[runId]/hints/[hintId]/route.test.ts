import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  findRun: vi.fn(),
  findHint: vi.fn(),
  upsertUsage: vi.fn(),
  findUsages: vi.fn(),
  updateRun: vi.fn(),
  expireRun: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({ getSession: mocks.getSession }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    run: { findUnique: mocks.findRun, update: mocks.updateRun, updateMany: mocks.expireRun },
    hint: { findUnique: mocks.findHint },
    hintUsage: { upsert: mocks.upsertUsage, findMany: mocks.findUsages },
  },
}));

import { POST } from "./route";

describe("hint access during game state changes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSession.mockResolvedValue({ id: "player", role: "USER" });
    mocks.findRun.mockResolvedValue({
      id: "run", userId: "player", challengeId: "challenge", status: "IN_PROGRESS",
      deadlineAt: new Date(Date.now() + 60_000),
      event: { status: "PUBLISHED", endTime: new Date(Date.now() + 60_000) },
    });
    mocks.findHint.mockResolvedValue({ id: "hint", challengeId: "challenge", order: 1, pointPenalty: 25 });
    mocks.upsertUsage.mockResolvedValue({ requestedAt: new Date() });
    mocks.findUsages.mockResolvedValue([]);
  });

  it.each(["PAUSED", "ENDED", "ARCHIVED"])("rejects hints while game is %s", async (status) => {
    mocks.findRun.mockResolvedValueOnce({
      id: "run", userId: "player", challengeId: "challenge", status: "IN_PROGRESS",
      deadlineAt: new Date(Date.now() + 60_000),
      event: { status, endTime: new Date(Date.now() + 60_000) },
    });

    const response = await POST(new Request("http://localhost/api/runs/run/hints/hint", { method: "POST" }), {
      params: Promise.resolve({ runId: "run", hintId: "hint" }),
    });

    expect(response.status).toBe(409);
    expect(mocks.findHint).not.toHaveBeenCalled();
    expect(mocks.upsertUsage).not.toHaveBeenCalled();
  });

  it("rejects hints after the game's end time even if the run deadline is later", async () => {
    mocks.findRun.mockResolvedValueOnce({
      id: "run", userId: "player", challengeId: "challenge", status: "IN_PROGRESS",
      deadlineAt: new Date(Date.now() + 60_000),
      event: { status: "PUBLISHED", endTime: new Date(Date.now() - 1_000) },
    });

    const response = await POST(new Request("http://localhost/api/runs/run/hints/hint", { method: "POST" }), {
      params: Promise.resolve({ runId: "run", hintId: "hint" }),
    });

    expect(response.status).toBe(409);
    expect(mocks.upsertUsage).not.toHaveBeenCalled();
  });

  it("still allows hints in an active game", async () => {
    const response = await POST(new Request("http://localhost/api/runs/run/hints/hint", { method: "POST" }), {
      params: Promise.resolve({ runId: "run", hintId: "hint" }),
    });
    expect(response.status).toBe(200);
    expect(mocks.upsertUsage).toHaveBeenCalledOnce();
  });

  it("expires a run whose challenge deadline has passed", async () => {
    mocks.findRun.mockResolvedValueOnce({
      id: "run", userId: "player", challengeId: "challenge", status: "IN_PROGRESS",
      deadlineAt: new Date(Date.now() - 1_000),
      event: { status: "PUBLISHED", endTime: new Date(Date.now() + 60_000) },
    });
    const response = await POST(new Request("http://localhost/api/runs/run/hints/hint", { method: "POST" }), {
      params: Promise.resolve({ runId: "run", hintId: "hint" }),
    });
    expect(response.status).toBe(400);
    expect(mocks.expireRun).toHaveBeenCalledOnce();
    expect(mocks.upsertUsage).not.toHaveBeenCalled();
  });
});

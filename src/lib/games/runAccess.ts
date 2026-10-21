export type RunAccessResult = "OK" | "RUN_FORBIDDEN" | "GAME_PAUSED" | "GAME_ENDED" | "RUN_EXPIRED";

export function evaluateRunAccess(
  run: { userId: string | null; deadlineAt: Date | null; event?: { status: string; endTime: Date | null } | null },
  viewer: { id: string; role: string },
  now = new Date(),
): RunAccessResult {
  if (viewer.role !== "ADMIN" && run.userId !== viewer.id) return "RUN_FORBIDDEN";
  if (run.event?.status === "PAUSED") return "GAME_PAUSED";
  if (run.event?.status === "ENDED" || run.event?.status === "ARCHIVED" || (run.event?.endTime && now >= run.event.endTime)) return "GAME_ENDED";
  if (!run.event && run.deadlineAt && now >= run.deadlineAt) return "RUN_EXPIRED";
  return "OK";
}


import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { sanitizeChallengeForPlayer } from "../../challenges/route";
import { evaluateObjective } from "@/lib/vfs/evaluator";
import { ObjectiveConfig, VfsDirectory, VfsState } from "@/lib/vfs/types";
import { calculateRunScore } from "@/lib/scoring/scoringEngine";
import { getNextGameChallenge } from "@/lib/games/nextChallenge";

export const dynamic = "force-dynamic";

function extractTreeList(dir: VfsDirectory, basePath: string = ""): Array<{ path: string; name: string; type: "file" | "dir"; size?: number }> {
  const items: Array<{ path: string; name: string; type: "file" | "dir"; size?: number }> = [];

  for (const [name, child] of Object.entries(dir.children)) {
    const fullPath = `${basePath}/${name}`;
    if (child.type === "dir") {
      items.push({ path: fullPath, name, type: "dir" });
      items.push(...extractTreeList(child, fullPath));
    } else {
      items.push({ path: fullPath, name, type: "file", size: child.content.length });
    }
  }

  return items;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ runId: string }> }
) {
  const { runId } = await params;
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const run = await prisma.run.findUnique({
    where: { id: runId },
    include: {
      user: { select: { id: true, name: true } },
      event: true,
      challenge: {
        include: {
          hints: {
            select: { id: true, title: true, penaltySeconds: true, pointPenalty: true, order: true },
          },
        },
      },
      hintUsages: {
        include: { hint: true },
      },
    },
  });

  if (!run) {
    return NextResponse.json({ error: "Run not found." }, { status: 404 });
  }

  if (run.userId !== session.id && session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden: Run belongs to another player." }, { status: 403 });
  }

  const nextChallenge = await getNextGameChallenge(run);

  const now = new Date();
  const timeLimitSeconds = run.challenge.timeLimitSeconds || 1200;
  const deadline = run.deadlineAt
    ? new Date(run.deadlineAt)
    : new Date(run.startedAt.getTime() + timeLimitSeconds * 1000);

  let currentStatus = run.status;

  // Check if event has ended or reached endTime
  const isEventEnded =
    run.event &&
    (run.event.status === "ENDED" ||
      run.event.status === "ARCHIVED" ||
      (run.event.endTime && now.getTime() >= new Date(run.event.endTime).getTime()));

  if (run.event && run.event.status === "PUBLISHED" && run.event.endTime && now.getTime() >= new Date(run.event.endTime).getTime()) {
    run.event.status = "ENDED";
    await prisma.event.updateMany({
      where: { id: run.event.id, status: { not: "ENDED" } },
      data: { status: "ENDED" },
    });
  }

  // Authoritative Expiration check on retrieval (challenge deadline OR event ended)
  if (currentStatus === "IN_PROGRESS" && (now.getTime() > deadline.getTime() || isEventEnded)) {
    currentStatus = "EXPIRED";
    await prisma.run.updateMany({
      where: { id: run.id, status: "IN_PROGRESS" },
      data: { status: "EXPIRED" },
    });
  }

  let vfsState: VfsState | null = null;
  let treeList: Array<{ path: string; name: string; type: "file" | "dir"; size?: number }> = [];

  try {
    vfsState = JSON.parse(run.filesystemState);
    if (vfsState?.root) {
      treeList = extractTreeList(vfsState.root);
    }
  } catch {}

  let objectiveConfig: ObjectiveConfig = { description: "", rules: [] };
  try {
    objectiveConfig = JSON.parse(run.challenge.objectiveConfig);
  } catch {}

  const evaluation = vfsState
    ? evaluateObjective(vfsState, objectiveConfig, run.commandCount)
    : null;

  let parsedBreakdown = null;
  try {
    if (run.scoringBreakdown) {
      parsedBreakdown = JSON.parse(run.scoringBreakdown);
    }
  } catch {}

  // Recalculate score if run is COMPLETED but score was missing or zero
  if (currentStatus === "COMPLETED" && (!run.finalScore || run.finalScore === 0)) {
    let scoringConfig = {
      maxBaseScore: 1000,
      intermediateBudget: 500,
      completionBonus: 200,
      speedBonusMax: 300,
      hintPenaltyCap: 100,
      defaultHintPenalty: 25,
      difficultyMultiplier:
        run.challenge.difficulty === "HARD"
          ? 1.5
          : run.challenge.difficulty === "MEDIUM"
          ? 1.25
          : 1.0,
      timeLimitSeconds,
      partialCreditOnExpiry: true,
      countsTowardLeaderboard: true,
    };
    try {
      if (run.scoringSnapshot) {
        scoringConfig = { ...scoringConfig, ...JSON.parse(run.scoringSnapshot) };
      } else if (run.challenge.scoringConfig) {
        scoringConfig = { ...scoringConfig, ...JSON.parse(run.challenge.scoringConfig) };
      }
    } catch {}

    const availableObjectives = (objectiveConfig.rules || []).map((r, idx) => ({
      id: r.id || `rule-${idx}`,
      description: r.description,
      points: r.points || 0,
    }));

    const verifiedIds = evaluation
      ? evaluation.details.filter((d) => d.passed).map((d) => d.id || "")
      : availableObjectives.map((o) => o.id);

    const hintPenalties = run.hintUsages.map((hu) => hu.pointPenalty || hu.hint.pointPenalty || 25);

    const computedBreakdown = calculateRunScore({
      status: "COMPLETED",
      startedAt: run.startedAt,
      completedAt: run.completedAt || new Date(run.startedAt.getTime() + (run.durationMs || 1000)),
      verifiedObjectiveIds: verifiedIds,
      revealedHintPenalties: hintPenalties,
      config: scoringConfig,
      objectives: availableObjectives,
    });

    if (computedBreakdown.finalScore > 0) {
      await prisma.run.updateMany({
        where: { id: run.id },
        data: {
          objectivePoints: computedBreakdown.objectivePoints,
          completionBonus: computedBreakdown.completionBonus,
          speedBonus: computedBreakdown.speedBonus,
          hintPenalty: computedBreakdown.hintPenalty,
          baseScore: computedBreakdown.baseScore,
          difficultyMultiplier: computedBreakdown.difficultyMultiplier,
          finalScore: computedBreakdown.finalScore,
          scoringBreakdown: JSON.stringify(computedBreakdown),
        },
      });
      run.finalScore = computedBreakdown.finalScore;
      run.objectivePoints = computedBreakdown.objectivePoints;
      run.completionBonus = computedBreakdown.completionBonus;
      run.speedBonus = computedBreakdown.speedBonus;
      run.hintPenalty = computedBreakdown.hintPenalty;
      run.baseScore = computedBreakdown.baseScore;
      parsedBreakdown = computedBreakdown;
    }
  }

  // Calculate cumulative event score across best completed runs
  let totalEventScore = 0;
  if (run.eventId && run.userId) {
    const userCompletedRuns = await prisma.run.findMany({
      where: {
        eventId: run.eventId,
        userId: run.userId,
        status: "COMPLETED",
      },
      select: {
        id: true,
        challengeId: true,
        finalScore: true,
      },
    });

    const bestByChallenge = new Map<string, number>();
    for (const cr of userCompletedRuns) {
      const prev = bestByChallenge.get(cr.challengeId) || 0;
      if (cr.finalScore > prev) {
        bestByChallenge.set(cr.challengeId, cr.finalScore);
      }
    }

    if (currentStatus === "COMPLETED" && run.finalScore > (bestByChallenge.get(run.challengeId) || 0)) {
      bestByChallenge.set(run.challengeId, run.finalScore);
    }

    totalEventScore = Math.round(Array.from(bestByChallenge.values()).reduce((sum, s) => sum + s, 0) * 100) / 100;
  }

  return NextResponse.json(
    {
      run: {
        id: run.id,
        status: currentStatus,
        startedAt: run.startedAt,
        completedAt: run.completedAt,
        deadlineAt: deadline,
        timeLimitSeconds,
        durationMs: run.durationMs,
        currentWorkingDir: run.currentWorkingDir,
        commandCount: run.commandCount,
        objectivePoints: run.objectivePoints,
        completionBonus: run.completionBonus,
        speedBonus: run.speedBonus,
        hintPenalty: run.hintPenalty,
        baseScore: run.baseScore,
        difficultyMultiplier: run.difficultyMultiplier,
        finalScore: run.finalScore,
        totalEventScore,
        scoringBreakdown: parsedBreakdown,
        player: run.user,
        game: run.event,
        challenge: sanitizeChallengeForPlayer(run.challenge),
        nextChallenge: nextChallenge || null,
        objectiveEvaluation: evaluation,
        treeList,
        unlockedHints: run.hintUsages.map((hu) => ({
          id: hu.hint.id,
          title: hu.hint.title,
          content: hu.hint.content,
          penaltySeconds: hu.hint.penaltySeconds,
          pointPenalty: hu.pointPenalty,
          order: hu.hint.order,
          requestedAt: hu.requestedAt,
        })),
      },
    },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    }
  );
}

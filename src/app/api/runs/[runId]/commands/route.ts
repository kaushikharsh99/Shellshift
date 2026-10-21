import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { executeCommand } from "@/lib/vfs/engine";
import { evaluateObjective } from "@/lib/vfs/evaluator";
import { CommandMapping, ObjectiveConfig, VfsDirectory, VfsState } from "@/lib/vfs/types";
import { rateLimit } from "@/lib/rateLimit";
import { calculateRunScore } from "@/lib/scoring/scoringEngine";
import { evaluateRunAccess } from "@/lib/games/runAccess";

function extractTreeList(
  dir: VfsDirectory,
  basePath: string = ""
): Array<{ path: string; name: string; type: "file" | "dir"; size?: number }> {
  const items: Array<{ path: string; name: string; type: "file" | "dir"; size?: number }> = [];

  for (const [name, child] of Object.entries(dir.children || {})) {
    const fullPath = `${basePath}/${name}`;
    if (child.type === "dir") {
      items.push({ path: fullPath, name, type: "dir" });
      items.push(...extractTreeList(child, fullPath));
    } else {
      items.push({ path: fullPath, name, type: "file", size: child.content?.length || 0 });
    }
  }

  return items;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ runId: string }> }
) {
  const { runId } = await params;
  const session = await getSession();

  if (!session) {
    return NextResponse.json(
      { error: "Unauthorized. Please authenticate and register as a contestant." },
      { status: 401 }
    );
  }

  // Rate limit command execution per run
  const rl = rateLimit(`cmd:${runId}`, 60, 60000);
  if (!rl.success) {
    return NextResponse.json(
      {
        output: "bash: fork: retry: Resource temporarily unavailable (Rate limit exceeded)",
        exitCode: 1,
        isCompleted: false,
      },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();
    const { command, clientRequestId } = body;

    if (command === undefined || typeof command !== "string") {
      return NextResponse.json({ error: "Missing or invalid command string." }, { status: 400 });
    }

    // Fetch run, challenge, existing objective milestones, and hint usages in ONE query
    const run = await prisma.run.findUnique({
      where: { id: runId },
      include: {
        challenge: true,
        event: true,
        objectiveCompletions: true,
        hintUsages: { include: { hint: true } },
      },
    });

    if (!run) {
      return NextResponse.json({ error: "Run not found." }, { status: 404 });
    }

    const access = evaluateRunAccess(run, session);
    if (access !== "OK") {
      if (access === "GAME_ENDED") {
        if (run.event && run.event.status !== "ENDED") {
          await prisma.event.updateMany({
            where: { id: run.event.id },
            data: { status: "ENDED" },
          });
        }
        if (run.status === "IN_PROGRESS") {
          await prisma.run.updateMany({
            where: { id: run.id, status: "IN_PROGRESS" },
            data: { status: "EXPIRED" },
          });
        }
        return NextResponse.json({
          output: "[COMPETITION ENDED] The event duration has concluded. Terminal is locked and submissions are closed.",
          exitCode: 1,
          isGameEnded: true,
          isExpired: true,
          status: "EXPIRED",
        }, { status: 200 });
      }

      if (access === "RUN_EXPIRED") {
        if (run.status === "IN_PROGRESS") {
          await prisma.run.updateMany({
            where: { id: run.id, status: "IN_PROGRESS" },
            data: { status: "EXPIRED" },
          });
        }
        return NextResponse.json({
          output: "[TIME EXPIRED] Challenge deadline has passed. Run concluded.",
          exitCode: 1,
          isExpired: true,
          status: "EXPIRED",
        }, { status: 200 });
      }

      if (access === "GAME_PAUSED") {
        return NextResponse.json({
          output: "[GAME PAUSED] The competition is paused by tournament admins. Please wait for resumption.",
          exitCode: 1,
          isGamePaused: true,
        }, { status: 200 });
      }

      return NextResponse.json({ error: access }, { status: access === "RUN_FORBIDDEN" ? 403 : 409 });
    }

    // Check if run is already completed
    if (run.status === "COMPLETED") {
      return NextResponse.json(
        {
          output: "[COMPLETED] Challenge is already completed. Subsequent commands are locked.",
          isCompleted: true,
          durationMs: run.durationMs,
          exitCode: 0,
        },
        { status: 200 }
      );
    }

    if (run.status !== "IN_PROGRESS") {
      return NextResponse.json(
        {
          output: `[LOCKED] Run is not active (status: ${run.status}).`,
          isExpired: run.status === "EXPIRED",
          exitCode: 1,
        },
        { status: 200 }
      );
    }

    // Verify event status
    const event = run.event;

    const now = new Date();
    const timeLimitSeconds = run.challenge.timeLimitSeconds || 1200;


    // Parse scoring config
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

    // Per-challenge elapsed time remains internal; the event defines the scoring window.
    if (run.event?.endTime) {
      scoringConfig.timeLimitSeconds = Math.max(1, Math.ceil(
        (new Date(run.event.endTime).getTime() - run.startedAt.getTime()) / 1000,
      ));
    }

    // Load VFS state & challenge mapping
    let vfsState: VfsState;
    try {
      vfsState = JSON.parse(run.filesystemState);
    } catch {
      return NextResponse.json({ error: "Corrupted virtual filesystem state." }, { status: 500 });
    }

    let commandMappings: CommandMapping = {};
    try {
      commandMappings = JSON.parse(run.challenge.commandMappings);
    } catch {}

    const startTime = Date.now();

    // Execute in sandbox interpreter
    const cmdResult = executeCommand(vfsState, command, commandMappings);
    const executionTimeMs = Date.now() - startTime;

    const nextCommandCount = run.commandCount + 1;

    // Evaluate objective completion
    let objectiveConfig: ObjectiveConfig = { description: "", rules: [] };
    try {
      objectiveConfig = JSON.parse(run.challenge.objectiveConfig);
    } catch {}

    const evaluation = evaluateObjective(vfsState, objectiveConfig, nextCommandCount);

    // Intermediate Objective Scoring:
    // Persist verified objectives without triggering duplicate unique constraint errors
    const availableObjectives = (objectiveConfig.rules || []).map((r, idx) => ({
      id: r.id || `rule-${idx}`,
      description: r.description,
      points: r.points || 0,
    }));

    const existingCompletions = run.objectiveCompletions || [];
    const completedSet = new Set(existingCompletions.map((c) => c.objectiveId));
    const newCompletionsData: Array<{
      runId: string;
      objectiveId: string;
      ruleIndex: number;
      pointsAwarded: number;
      completedAt: Date;
    }> = [];

    for (let i = 0; i < evaluation.details.length; i++) {
      const detail = evaluation.details[i];
      if (detail.passed) {
        const objId = detail.id || `rule-${i}`;
        if (!completedSet.has(objId)) {
          const pts = detail.points || 0;
          const newObj = {
            runId: run.id,
            objectiveId: objId,
            ruleIndex: i,
            pointsAwarded: pts,
            completedAt: now,
          };
          newCompletionsData.push(newObj);
          completedSet.add(objId);
          existingCompletions.push(newObj as any);
        }
      }
    }

    let justCompleted = false;
    let finalDurationMs = run.durationMs;
    let scoreBreakdown = null;

    const MAX_OUTPUT_SIZE = 32768;
    const safeOutput =
      cmdResult.output.length > MAX_OUTPUT_SIZE
        ? cmdResult.output.slice(0, MAX_OUTPUT_SIZE) + "\n...[output truncated by ShellShift]"
        : cmdResult.output;

    const allHints = run.hintUsages || [];
    const verifiedIds = existingCompletions.map((c) => c.objectiveId);
    const hintPenalties = allHints.map((h) => h.pointPenalty || h.hint?.pointPenalty || 25);

    const txOps: any[] = [];

    // 1. Batch newly completed milestones
    if (newCompletionsData.length > 0) {
      txOps.push(
        prisma.objectiveCompletion.createMany({
          data: newCompletionsData,
          skipDuplicates: true,
        })
      );
    }

    if (evaluation.isCompleted) {
      finalDurationMs = now.getTime() - run.startedAt.getTime();

      scoreBreakdown = calculateRunScore({
        status: "COMPLETED",
        startedAt: run.startedAt,
        completedAt: now,
        verifiedObjectiveIds: verifiedIds,
        revealedHintPenalties: hintPenalties,
        config: scoringConfig,
        objectives: availableObjectives,
      });

      // 2. Atomic conditional update to prevent double completion
      txOps.push(
        prisma.run.updateMany({
          where: {
            id: run.id,
            status: "IN_PROGRESS",
          },
          data: {
            status: "COMPLETED",
            completedAt: now,
            durationMs: finalDurationMs,
            filesystemState: JSON.stringify(vfsState),
            currentWorkingDir: cmdResult.newCwd,
            commandCount: nextCommandCount,
            objectivePoints: scoreBreakdown.objectivePoints,
            completionBonus: scoreBreakdown.completionBonus,
            speedBonus: scoreBreakdown.speedBonus,
            hintPenalty: scoreBreakdown.hintPenalty,
            baseScore: scoreBreakdown.baseScore,
            difficultyMultiplier: scoreBreakdown.difficultyMultiplier,
            finalScore: scoreBreakdown.finalScore,
            scoringBreakdown: JSON.stringify(scoreBreakdown),
          },
        })
      );
    } else {
      scoreBreakdown = calculateRunScore({
        status: "IN_PROGRESS",
        startedAt: run.startedAt,
        currentTimestamp: now,
        verifiedObjectiveIds: verifiedIds,
        revealedHintPenalties: hintPenalties,
        config: scoringConfig,
        objectives: availableObjectives,
      });

      // 2. In-progress update
      txOps.push(
        prisma.run.updateMany({
          where: {
            id: run.id,
            status: "IN_PROGRESS",
          },
          data: {
            filesystemState: JSON.stringify(vfsState),
            currentWorkingDir: cmdResult.newCwd,
            commandCount: nextCommandCount,
            objectivePoints: scoreBreakdown.objectivePoints,
            hintPenalty: scoreBreakdown.hintPenalty,
            baseScore: scoreBreakdown.baseScore,
            finalScore: scoreBreakdown.finalScore,
            scoringBreakdown: JSON.stringify(scoreBreakdown),
          },
        })
      );
    }

    // 3. Command audit log entry
    txOps.push(
      prisma.commandLog.create({
        data: {
          runId: run.id,
          userId: session.id,
          enteredCommand: command,
          mappedOperation: cmdResult.mappedOperation,
          output: safeOutput,
          executionTimeMs,
        },
      })
    );

    // Single batched round-trip for ALL database writes
    const txResults = await prisma.$transaction(txOps);

    if (evaluation.isCompleted) {
      const updateResult = newCompletionsData.length > 0 ? txResults[1] : txResults[0];
      if (updateResult?.count === 1) {
        justCompleted = true;
      }
    }

    // Calculate player's live cumulative event score for immediate leaderboard synchronization
    let totalEventScore = scoreBreakdown?.finalScore || 0;
    if (run.eventId && session.id && evaluation.isCompleted) {
      const userCompletedRuns = await prisma.run.findMany({
        where: {
          eventId: run.eventId,
          userId: session.id,
          status: "COMPLETED",
        },
        select: {
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

      if (scoreBreakdown && scoreBreakdown.finalScore > (bestByChallenge.get(run.challengeId) || 0)) {
        bestByChallenge.set(run.challengeId, scoreBreakdown.finalScore);
      }

      totalEventScore = Math.round(Array.from(bestByChallenge.values()).reduce((sum, s) => sum + s, 0) * 100) / 100;
    }

    const treeList = vfsState.root ? extractTreeList(vfsState.root) : [];

    return NextResponse.json({
      output: safeOutput,
      exitCode: cmdResult.exitCode,
      cwd: cmdResult.newCwd,
      treeList,
      commandCount: nextCommandCount,
      isCompleted: evaluation.isCompleted,
      justCompleted,
      durationMs: finalDurationMs,
      objectiveEvaluation: evaluation,
      scoreBreakdown,
      totalEventScore,
      clearScreen: !!cmdResult.clearScreen,
    });
  } catch (err) {
    console.error("Command execution error:", err);
    return NextResponse.json(
      { error: "Internal server error occurred while processing command." },
      { status: 500 }
    );
  }
}

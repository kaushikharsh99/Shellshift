import { getAssignedQuestions } from "@/lib/games/assignmentService";
import { getRosterMembership } from "@/lib/games/rosterService";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { createInitialVfs } from "@/lib/vfs/vfs";
import { rateLimit } from "@/lib/rateLimit";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      {
        error:
          "Unauthorized. You must be authenticated and registered as a contestant.",
      },
      { status: 401 },
    );
  }

  // Rate limit run creation
  const rl = rateLimit(`run_start:${session.id}`, 10, 60000);
  if (!rl.success) {
    return NextResponse.json(
      { error: "Too many run start requests. Please wait." },
      { status: 429 },
    );
  }

  try {
    const body = await request.json();
    const { challengeId, gameId } = body;

    if (!challengeId || !gameId) {
      return NextResponse.json(
        { error: "Missing gameId or challengeId." },
        { status: 400 },
      );
    }

    // Verify event status
    const currentEvent = await prisma.event.findUnique({
      where: { id: gameId },
      include: {
        registrations: { where: { userId: session.id, status: "REGISTERED" } },
        challenges: { where: { challengeId } },
      },
    });
    const now = new Date();
    const isLive =
      currentEvent?.status === "PUBLISHED" &&
      !!currentEvent.startTime &&
      !!currentEvent.endTime &&
      now >= currentEvent.startTime &&
      now < currentEvent.endTime;
    if (
      !currentEvent ||
      !isLive ||
      currentEvent.registrations.length === 0 ||
      currentEvent.challenges.length === 0
    ) {
      return NextResponse.json(
        {
          error:
            "This game is not live, you are not registered, or the challenge is unavailable.",
        },
        { status: 403 },
      );
    }

    const challenge = await prisma.challenge.findUnique({
      where: { id: challengeId },
    });

    if (!challenge) {
      return NextResponse.json(
        { error: "Challenge not found or unavailable." },
        { status: 404 },
      );
    }

    const membership = await getRosterMembership(gameId, session.id);
    if (!membership)
      return NextResponse.json(
        { error: "Join a roster team for this competition first." },
        { status: 403 },
      );

    const assigned = await getAssignedQuestions(gameId, session.id);
    if (!assigned.some((item) => item.challengeId === challengeId))
      return NextResponse.json(
        { error: "This question is not in your assigned set." },
        { status: 403 },
      );

    // Duplicate-start prevention: check for existing active run
    const existingActiveRun = await prisma.run.findFirst({
      where: {
        userId: session.id,
        eventId: gameId,
        challengeId: challenge.id,
        status: "IN_PROGRESS",
      },
    });

    if (existingActiveRun) {
      let cwd = existingActiveRun.currentWorkingDir;
      if (existingActiveRun.commandCount === 0 && cwd === "/workspace") {
        try {
          const vfsState = JSON.parse(existingActiveRun.filesystemState);
          vfsState.cwd = "/";
          cwd = "/";
          await prisma.run.update({
            where: { id: existingActiveRun.id },
            data: {
              currentWorkingDir: "/",
              filesystemState: JSON.stringify(vfsState),
            },
          });
        } catch {}
      }
      return NextResponse.json({
        run: {
          id: existingActiveRun.id,
          status: existingActiveRun.status,
          startedAt: existingActiveRun.startedAt,
          deadlineAt: existingActiveRun.deadlineAt,
          currentWorkingDir: cwd,
          commandCount: existingActiveRun.commandCount,
          isExisting: true,
        },
      });
    }

    // Check if team already completed this challenge (enforce 1 ranked completion)
    const existingCompleted = await prisma.run.findFirst({
      where: {
        userId: session.id,
        eventId: gameId,
        challengeId: challenge.id,
        status: "COMPLETED",
      },
    });

    if (existingCompleted) {
      return NextResponse.json({
        run: {
          id: existingCompleted.id,
          status: existingCompleted.status,
          startedAt: existingCompleted.startedAt,
          completedAt: existingCompleted.completedAt,
          durationMs: existingCompleted.durationMs,
          finalScore: existingCompleted.finalScore,
          isAlreadyCompleted: true,
        },
      });
    }

    // Initialize virtual filesystem from challenge seed
    let initialFiles = {};
    try {
      initialFiles = JSON.parse(challenge.initialFilesystem);
    } catch {}

    const vfs = createInitialVfs(initialFiles, "/");

    // Parse challenge scoring config
    const timeLimitSeconds = challenge.timeLimitSeconds || 1200;
    const startedAt = new Date();
    let deadlineAt = new Date(startedAt.getTime() + timeLimitSeconds * 1000);
    if (currentEvent.endTime && deadlineAt > currentEvent.endTime) {
      deadlineAt = currentEvent.endTime;
    }

    let scoringConfig = {
      maxBaseScore: 1000,
      intermediateBudget: 500,
      completionBonus: 200,
      speedBonusMax: 300,
      hintPenaltyCap: 100,
      defaultHintPenalty: 25,
      difficultyMultiplier:
        challenge.difficulty === "HARD"
          ? 1.5
          : challenge.difficulty === "MEDIUM"
            ? 1.25
            : 1.0,
      timeLimitSeconds,
      partialCreditOnExpiry: true,
      countsTowardLeaderboard: true,
    };

    try {
      if (challenge.scoringConfig) {
        scoringConfig = {
          ...scoringConfig,
          ...JSON.parse(challenge.scoringConfig),
        };
      }
    } catch {}

    // Create new run with authoritative server start timestamp and deadline
    const newRun = await prisma.run.create({
      data: {
        userId: session.id,
        rosterTeamId: membership.teamId,
        eventId: gameId,
        challengeId: challenge.id,
        status: "IN_PROGRESS",
        startedAt,
        deadlineAt,
        filesystemState: JSON.stringify(vfs),
        currentWorkingDir: vfs.cwd,
        commandCount: 0,
        scoringSnapshot: JSON.stringify(scoringConfig),
        difficultyMultiplier: scoringConfig.difficultyMultiplier,
      },
    });

    return NextResponse.json({
      run: {
        id: newRun.id,
        status: newRun.status,
        startedAt: newRun.startedAt,
        deadlineAt: newRun.deadlineAt,
        timeLimitSeconds,
        currentWorkingDir: newRun.currentWorkingDir,
        commandCount: 0,
        isExisting: false,
      },
    });
  } catch (err) {
    console.error("Run start error:", err);
    return NextResponse.json(
      { error: "Internal server error occurred while starting run." },
      { status: 500 },
    );
  }
}

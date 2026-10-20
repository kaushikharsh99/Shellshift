import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { roundScore } from "@/lib/scoring/scoringEngine";
import { evaluateRunAccess } from "@/lib/games/runAccess";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ runId: string; hintId: string }> }
) {
  const { runId, hintId } = await params;
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const run = await prisma.run.findUnique({
    where: { id: runId },
    include: { event: true, challenge: true },
  });

  if (!run) {
    return NextResponse.json({ error: "Run not found." }, { status: 404 });
  }

  if (run.userId !== session.id && session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden: Run belongs to another player." }, { status: 403 });
  }

  if (run.status !== "IN_PROGRESS") {
    return NextResponse.json(
      { error: `Hints cannot be requested for run in status '${run.status}'.` },
      { status: 400 }
    );
  }

  const access = evaluateRunAccess(run, session);
  if (access === "GAME_PAUSED" || access === "GAME_ENDED") {
    return NextResponse.json(
      { error: access === "GAME_PAUSED" ? "Game is paused." : "Game has ended." },
      { status: 409 },
    );
  }

  if (access === "RUN_EXPIRED") {
    await prisma.run.updateMany({
      where: { id: run.id, status: "IN_PROGRESS" },
      data: { status: "EXPIRED" },
    });
    return NextResponse.json({ error: "Time limit expired." }, { status: 400 });
  }

  const hint = await prisma.hint.findUnique({
    where: { id: hintId },
  });

  if (!hint || hint.challengeId !== run.challengeId) {
    return NextResponse.json({ error: "Hint not found for this challenge." }, { status: 404 });
  }

  // Progressive hints enforcement: ensure lower-order hints are revealed first
  if (hint.order > 1) {
    const priorHints = await prisma.hint.findMany({
      where: {
        challengeId: run.challengeId,
        order: { lt: hint.order },
      },
      select: { id: true },
    });

    const revealedUsages = await prisma.hintUsage.findMany({
      where: {
        runId: run.id,
        hintId: { in: priorHints.map((p) => p.id) },
      },
    });

    if (revealedUsages.length < priorHints.length) {
      return NextResponse.json(
        { error: "Progressive hint rule: You must unlock previous hints first." },
        { status: 400 }
      );
    }
  }

  const pointPenalty = hint.pointPenalty || 25;

  // Idempotent creation: create or retrieve HintUsage
  const hintUsage = await prisma.hintUsage.upsert({
    where: {
      runId_hintId: {
        runId: run.id,
        hintId: hint.id,
      },
    },
    create: {
      runId: run.id,
      hintId: hint.id,
      pointPenalty,
    },
    update: {},
  });

  // Calculate updated capped hint penalty for the run
  const allUsages = await prisma.hintUsage.findMany({
    where: { runId: run.id },
    include: { hint: true },
  });

  let penaltyCap = 100;
  try {
    if (run.scoringSnapshot) {
      const snap = JSON.parse(run.scoringSnapshot);
      if (typeof snap.hintPenaltyCap === "number") penaltyCap = snap.hintPenaltyCap;
    } else if (run.challenge?.scoringConfig) {
      const cfg = JSON.parse(run.challenge.scoringConfig);
      if (typeof cfg.hintPenaltyCap === "number") penaltyCap = cfg.hintPenaltyCap;
    }
  } catch {}

  const totalRawPenalty = allUsages.reduce(
    (sum, u) => sum + (u.pointPenalty || u.hint.pointPenalty || 25),
    0
  );
  const cappedPenalty = Math.min(penaltyCap, totalRawPenalty);

  // Update run's recorded hint penalty
  const updatedBaseScore = Math.max(0, run.objectivePoints - cappedPenalty);
  const updatedFinalScore = roundScore(updatedBaseScore * run.difficultyMultiplier);

  await prisma.run.update({
    where: { id: run.id },
    data: {
      hintPenalty: cappedPenalty,
      baseScore: updatedBaseScore,
      finalScore: updatedFinalScore,
    },
  });

  return NextResponse.json({
    hint: {
      id: hint.id,
      title: hint.title,
      content: hint.content,
      penaltySeconds: hint.penaltySeconds,
      pointPenalty,
      order: hint.order,
      requestedAt: hintUsage.requestedAt,
    },
    hintPenalty: cappedPenalty,
  });
}

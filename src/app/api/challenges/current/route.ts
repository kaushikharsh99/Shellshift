import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sanitizeChallengeForPlayer } from "@/lib/challenges/playerView";

export async function GET() {
  const currentEvent = await prisma.event.findFirst({
    orderBy: { createdAt: "desc" },
  });

  const firstChallenge = await prisma.challenge.findFirst({
    where: { isPublished: true },
    orderBy: { order: "asc" },
    include: {
      hints: {
        select: { id: true, title: true, penaltySeconds: true, pointPenalty: true, order: true },
      },
    },
  });

  if (!firstChallenge) {
    return NextResponse.json({ error: "No published challenge available." }, { status: 404 });
  }

  return NextResponse.json({
    event: currentEvent,
    challenge: {
      ...sanitizeChallengeForPlayer(firstChallenge),
      hints: firstChallenge.hints,
    },
  });
}

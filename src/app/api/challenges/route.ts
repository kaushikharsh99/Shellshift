import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sanitizeChallengeForPlayer } from "@/lib/challenges/playerView";

export async function GET() {
  const challenges = await prisma.challenge.findMany({
    where: { isPublished: true },
    orderBy: { order: "asc" },
    include: {
      hints: {
        select: {
          id: true,
          title: true,
          penaltySeconds: true,
          pointPenalty: true,
          order: true,
        },
      },
    },
  });

  const sanitized = challenges.map((c) => ({
    ...sanitizeChallengeForPlayer(c),
    hints: c.hints,
  }));

  return NextResponse.json({ total: sanitized.length, challenges: sanitized });
}

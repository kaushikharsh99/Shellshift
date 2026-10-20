import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Forbidden: Admin privileges required." },
      { status: 403 },
    );
  }

  const runs = await prisma.run.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      team: { select: { id: true, name: true } },
      rosterTeam: { select: { id: true, name: true } },
      challenge: { select: { id: true, title: true, slug: true } },
      commandLogs: {
        orderBy: { timestamp: "desc" },
        take: 10,
      },
      hintUsages: {
        include: { hint: true },
      },
    },
    take: 50,
  });

  return NextResponse.json({
    runs: runs.map((run) => ({ ...run, team: run.rosterTeam || run.team })),
  });
}

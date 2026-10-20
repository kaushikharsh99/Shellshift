import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { getGameStandings } from "@/lib/games/standings";

export async function GET(
  request: Request,
  context: RouteContext<"/api/admin/games/[gameId]/operations">,
) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return Response.json(
      { error: "Forbidden: Admin privileges required." },
      { status: 403 },
    );
  }

  const { gameId } = await context.params;

  const game = await prisma.event.findUnique({
    where: { id: gameId },
    include: {
      challenges: {
        include: { challenge: true },
        orderBy: { order: "asc" },
      },
    },
  });

  if (!game) {
    return Response.json({ error: "Game not found." }, { status: 404 });
  }

  const [
    registeredCount,
    activeCount,
    completedCount,
    participants,
    activity,
    standingsResult,
  ] = await Promise.all([
    prisma.gameRegistration.count({ where: { eventId: gameId } }),
    prisma.run.count({ where: { eventId: gameId, status: "IN_PROGRESS" } }),
    prisma.run.count({ where: { eventId: gameId, status: "COMPLETED" } }),
    prisma.gameRegistration.findMany({
      where: { eventId: gameId },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { registeredAt: "asc" },
    }),
    prisma.commandLog.findMany({
      where: { run: { eventId: gameId } },
      orderBy: { timestamp: "desc" },
      take: 30,
      include: {
        run: {
          select: {
            id: true,
            user: { select: { id: true, name: true } },
            challenge: { select: { id: true, title: true } },
          },
        },
      },
    }),
    getGameStandings(gameId, session.id),
  ]);

  return Response.json({
    game,
    serverTime: new Date().toISOString(),
    metrics: {
      registeredCount,
      activeCount,
      completedCount,
    },
    participants,
    activity,
    standings: standingsResult.standings || [],
    teamStandings: standingsResult.teamStandings || [],
  });
}

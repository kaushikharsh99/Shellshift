import { prisma } from "@/lib/prisma";
import { getGameStandings } from "@/lib/games/standings";
import { formatDuration } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const requestedId = new URL(request.url).searchParams.get("gameId");
  const game = requestedId
    ? await prisma.event.findFirst({
        where: {
          OR: [{ id: requestedId }, { slug: requestedId }],
        },
      })
    : await prisma.event.findFirst({ orderBy: { createdAt: "desc" } });

  if (!game) {
    return Response.json(
      { event: null, leaderboard: [], total: 0 },
      {
        headers: {
          "Cache-Control": "public, s-maxage=5, stale-while-revalidate=25",
          "CDN-Cache-Control": "public, s-maxage=5",
          "Vercel-CDN-Cache-Control": "public, s-maxage=5",
        },
      }
    );
  }

  const result = await getGameStandings(game.id);
  const leaderboard = result.standings.map((row) => ({
    ...row,
    playerId: row.userId,
    playerName: row.userName,
    formattedTime: formatDuration(row.aggregateDurationMs),
  }));

  const teamLeaderboard = (result.teamStandings || []).map((row) => ({
    ...row,
    formattedTime: formatDuration(row.aggregateDurationMs),
  }));

  return Response.json(
    {
      mode: game.mode,
      event: { id: game.id, name: game.name },
      leaderboard,
      teamLeaderboard,
      total: leaderboard.length,
      totalTeams: teamLeaderboard.length,
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=5, stale-while-revalidate=25",
        "CDN-Cache-Control": "public, s-maxage=5",
        "Vercel-CDN-Cache-Control": "public, s-maxage=5",
      },
    }
  );
}

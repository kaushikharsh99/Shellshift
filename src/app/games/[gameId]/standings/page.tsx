import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { StandingsTable } from "@/components/games/StandingsTable";
import { getSession } from "@/lib/auth/session";
import { getGameStandings } from "@/lib/games/standings";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function Standings({
  params,
}: {
  params: Promise<{ gameId: string }>;
}) {
  const { gameId } = await params;
  const user = await getSession();

  const game = await prisma.event.findFirst({
    where: {
      OR: [{ id: gameId }, { slug: gameId }],
    },
  });

  if (!game) {
    notFound();
  }

  const result = await getGameStandings(game.id, user?.id);

  const membership = user
    ? await prisma.rosterMember.findUnique({
        where: { eventId_userId: { eventId: game.id, userId: user.id } },
        select: { teamId: true },
      })
    : null;
  const userTeamId = membership?.teamId;

  return (
    <div className="min-h-screen bg-[#07080b] text-white">
      <Navbar user={user} />
      <main className="mx-auto max-w-5xl px-5 py-12">
        <div className="mb-6 flex items-center justify-between">
          <Link
            href={`/games/${game.id}/lobby`}
            className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition"
          >
            <ArrowLeft className="size-3.5" />
            <span>Return to Lobby</span>
          </Link>
          <span className="text-xs text-zinc-500">
            Live verified leaderboard
          </span>
        </div>
        <p className="text-sm text-cyan-400">Competition standings</p>
        <h1 className="mt-2 text-4xl font-semibold">{game.name}</h1>
        <p className="mt-3 mb-8 text-zinc-500">
          Best verified score per challenge. Ties break by completions, then
          aggregate time. Team score is the average of all member scores.
        </p>
        {result.error ? (
          <div className="rounded-xl border border-zinc-800 p-6 text-zinc-400">
            {result.error}
          </div>
        ) : (
          <StandingsTable
            rows={result.standings}
            teamRows={result.teamStandings}
            gameId={game.id}
            currentUserId={user?.id}
            currentTeamId={userTeamId || undefined}
          />
        )}
      </main>
    </div>
  );
}

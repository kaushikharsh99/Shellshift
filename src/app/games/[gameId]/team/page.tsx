import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { getRosterMembership } from "@/lib/games/rosterService";
import { rankRosterTeams } from "@/lib/games/standings";
export const dynamic = "force-dynamic";
export default async function TeamProfile({
  params,
}: {
  params: Promise<{ gameId: string }>;
}) {
  const { gameId } = await params;
  const user = await getSession();
  if (!user) redirect(`/api/auth/login?redirect=/games/${gameId}/team`);
  const game = await prisma.event.findFirst({
    where: { OR: [{ id: gameId }, { slug: gameId }] },
    select: {
      id: true,
      name: true,
      leaderboardVisibility: true,
      status: true,
      endTime: true,
    },
  });
  if (!game) notFound();
  const membership = await getRosterMembership(game.id, user.id);
  if (!membership) redirect(`/register?eventId=${game.id}`);
  const team = await prisma.competitionTeam.findUnique({
    where: { id: membership.teamId },
    include: {
      members: {
        orderBy: { position: "asc" },
        select: {
          id: true,
          position: true,
          userId: true,
          user: { select: { name: true } },
        },
      },
    },
  });
  if (!team) notFound();
  const scoresVisible =
    user.role === "ADMIN" ||
    (game.leaderboardVisibility !== "HIDDEN" &&
      (game.leaderboardVisibility !== "AFTER_END" ||
        ["ENDED", "ARCHIVED"].includes(game.status) ||
        (!!game.endTime && game.endTime <= new Date())));
  const runs = scoresVisible
    ? await prisma.run.findMany({
        where: {
          eventId: game.id,
          rosterTeamId: team.id,
          status: "COMPLETED",
          isRanked: true,
          legacyIndividualEligible: false,
          userId: { not: null },
        },
        select: {
          userId: true,
          challengeId: true,
          finalScore: true,
          durationMs: true,
          completedAt: true,
        },
      })
    : [];
  const standing = rankRosterTeams(
    [team],
    runs.flatMap((r) =>
      r.userId
        ? [{ ...r, userId: r.userId, userName: "", teamId: team.id }]
        : [],
    ),
  )[0];
  const joinedCount = team.members.filter((member) => member.userId).length;
  return (
    <div className="min-h-screen bg-[#07080b] text-white">
      <Navbar user={user} />
      <main className="mx-auto max-w-4xl px-5 py-12">
        <Link className="text-sm text-cyan-300" href={`/games/${game.id}`}>
          ← {game.name}
        </Link>
        <p className="mt-8 text-sm text-cyan-400">Team profile</p>
        <h1 className="mt-2 text-4xl font-semibold">{team.name}</h1>
        <div className="my-8 rounded-2xl border border-cyan-900 bg-cyan-950/20 p-6">
          <p className="text-sm text-zinc-400">Team average</p>
          <p className="mt-2 text-4xl font-semibold">
            {scoresVisible
              ? standing.totalScore.toLocaleString(undefined, {
                  maximumFractionDigits: 2,
                })
              : "Hidden"}
          </p>
          <p className="mt-3 text-sm text-zinc-400">
            {scoresVisible
              ? joinedCount > 0
                ? `Total member scores ÷ ${joinedCount} joined ${joinedCount === 1 ? "member" : "members"}. Joined members who haven’t played count as zero.`
                : "No members have joined yet."
              : "Scores will appear when the organizer makes standings available."}
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {standing.members.map((m, i) => (
            <article
              key={m.userId}
              className="rounded-xl border border-zinc-800 bg-[#0e1016] p-5"
            >
              <p className="text-xs text-zinc-500">
                Member {i + 1}
                {m.userId === user.id ? " · You" : ""}
              </p>
              <h2 className="mt-2 font-semibold">{m.userName}</h2>
              <p className="mt-4 text-sm text-zinc-300">
                {scoresVisible
                  ? `${m.score.toLocaleString()} points · ${m.challengesCompleted} completed challenges`
                  : "Scores hidden"}
              </p>
            </article>
          ))}
        </div>
        <Link href="/profile" className="mt-8 inline-block text-cyan-300">
          View your personal profile →
        </Link>
      </main>
    </div>
  );
}

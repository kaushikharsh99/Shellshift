import { getAssignedQuestions } from "@/lib/games/assignmentService";
import { getRosterMembership } from "@/lib/games/rosterService";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { Trophy } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { GameCountdown } from "@/components/games/GameCountdown";
import { GameLobby } from "@/components/games/GameLobby";
import { getSession } from "@/lib/auth/session";
import { deriveGamePhase } from "@/lib/games/lifecycle";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function Lobby({
  params,
}: {
  params: Promise<{ gameId: string }>;
}) {
  const { gameId } = await params;
  const user = await getSession();
  if (!user) {
    redirect(`/api/auth/login?redirect=/games/${gameId}/lobby`);
  }

  const g = await prisma.event.findFirst({
    where: {
      OR: [{ id: gameId }, { slug: gameId }],
    },
    include: {
      registrations: {
        where: { userId: user.id, status: "REGISTERED" },
      },
      runs: {
        where: { userId: user.id },
        select: { id: true, challengeId: true, status: true },
      },
    },
  });

  if (
    !g ||
    !g.registrationOpensAt ||
    !g.registrationClosesAt ||
    !g.startTime ||
    !g.endTime
  ) {
    notFound();
  }

  const membership = await getRosterMembership(g.id, user.id);
  if (!membership) redirect(`/register?eventId=${g.id}`);
  // Existing roster members may predate automatic registration on email matching.
  if (!g.registrations.length) {
    if (g.status !== "PUBLISHED" || (g.endTime && g.endTime <= new Date()))
      redirect(`/games/${g.id}/standings`);
    await prisma.gameRegistration.upsert({
      where: { eventId_userId: { eventId: g.id, userId: user.id } },
      update: { status: "REGISTERED" },
      create: { eventId: g.id, userId: user.id },
    });
  }

  const now = new Date();
  if (g.status === "PUBLISHED" && g.endTime && now >= g.endTime) {
    await prisma.event.update({
      where: { id: g.id },
      data: { status: "ENDED" },
    });
    g.status = "ENDED";
  }

  const phase = deriveGamePhase(
    {
      status: g.status as any,
      registrationOpensAt: g.registrationOpensAt,
      registrationClosesAt: g.registrationClosesAt,
      startsAt: g.startTime,
      endsAt: g.endTime,
    },
    now,
  );

  const isEnded =
    phase === "ENDED" ||
    g.status === "ENDED" ||
    (!!g.endTime && now >= g.endTime);
  const live = phase === "LIVE" && !isEnded;

  const team = membership.team;
  const assigned = await getAssignedQuestions(g.id, user.id);

  return (
    <div className="min-h-screen bg-[#07080b] text-white">
      <Navbar user={user} />
      <main className="mx-auto max-w-6xl px-5 py-10">
        <div className="flex flex-col justify-between gap-5 border-b border-zinc-800 pb-7 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm text-cyan-400">
              {isEnded
                ? "Competition concluded"
                : live
                  ? "Competition live"
                  : "Waiting room"}
            </p>
            <h1 className="mt-2 text-3xl font-semibold">{g.name}</h1>
          </div>
          {isEnded ? (
            <Link
              href={`/games/${g.id}/standings`}
              className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-bold text-black hover:bg-amber-400 transition"
            >
              <Trophy className="size-4" />
              <span>View Leaderboard</span>
            </Link>
          ) : (
            <GameCountdown
              target={(live ? g.endTime : g.startTime).toISOString()}
              label={live ? "Time remaining" : "Starts in"}
              isEnded={isEnded}
            />
          )}
        </div>

        <div className="mt-8">
          {isEnded ? (
            <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-xl border border-rose-500/30 bg-rose-950/20 p-5 text-sm">
              <div>
                <p className="font-semibold text-rose-300">
                  This live competition has concluded.
                </p>
                <p className="text-xs text-zinc-400 mt-1">
                  Submissions are closed. Check the event leaderboard to see
                  final verified standings and rankings.
                </p>
              </div>
              <Link
                href={`/games/${g.id}/standings`}
                className="shrink-0 rounded-lg bg-amber-500 px-4 py-2 text-xs font-bold text-black hover:bg-amber-400 transition"
              >
                Go to Leaderboard
              </Link>
            </div>
          ) : !live ? (
            <div className="mb-6 rounded-xl border border-cyan-900/60 bg-cyan-950/20 p-5 text-sm text-cyan-100">
              You’re registered. Challenge details unlock when the competition
              begins.
            </div>
          ) : null}

          <div className="mb-6 rounded-xl border border-cyan-800/40 bg-cyan-950/20 p-4 text-sm text-zinc-300">
            Playing for{" "}
            <Link
              className="font-semibold text-cyan-300"
              href={`/games/${g.id}/team`}
            >
              {team.name}
            </Link>
            . You have 15 assigned questions in your own shuffled order. Your
            progress and score are your own. Every roster member contributes to
            the team average.
          </div>

          <GameLobby
            gameId={g.id}
            live={live}
            challenges={assigned.map((x) => {
              const run = g.runs.find((r) => r.challengeId === x.challengeId);
              return {
                id: x.challenge.id,
                title: live ? x.challenge.title : "Encrypted mission",
                difficulty: live ? x.challenge.difficulty : "LOCKED",
                order: x.order,
                runId: run?.id,
                status: run?.status,
              };
            })}
          />
        </div>
      </main>
    </div>
  );
}

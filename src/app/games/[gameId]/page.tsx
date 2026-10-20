import { getRosterMembership } from "@/lib/games/rosterService";
import { notFound } from "next/navigation";
import { Calendar, Clock, Layers3, ShieldCheck } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { GameAction } from "@/components/games/GameAction";
import { GameCountdown } from "@/components/games/GameCountdown";
import { getSession } from "@/lib/auth/session";
import { deriveGamePhase } from "@/lib/games/lifecycle";
import { prisma } from "@/lib/prisma";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatScheduleTime } from "@/lib/games/display";

export const dynamic = "force-dynamic";

export default async function Game({
  params,
}: {
  params: Promise<{ gameId: string }>;
}) {
  const { gameId } = await params;
  const user = await getSession();

  const g = await prisma.event.findFirst({
    where: {
      OR: [{ id: gameId }, { slug: gameId }],
    },
    include: {
      challenges: true,
      registrations: user
        ? { where: { userId: user.id, status: "REGISTERED" } }
        : false,
      runs: user ? { where: { userId: user.id } } : false,
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

  const membership = user ? await getRosterMembership(g.id, user.id) : null;
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

  const durationHours = Math.round(
    (g.endTime.getTime() - g.startTime.getTime()) / 36e5,
  );

  return (
    <div className="min-h-screen bg-[#07080b] text-white">
      <Navbar user={user} />
      <main className="mx-auto max-w-6xl px-5 py-12">
        <StatusBadge
          tone={phase === "LIVE" ? "success" : isEnded ? "danger" : "info"}
        >
          {isEnded ? "ENDED" : phase.replaceAll("_", " ")}
        </StatusBadge>

        <div className="mt-6 grid gap-12 lg:grid-cols-[1fr_360px]">
          <div>
            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
              {g.name}
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-zinc-400">
              {g.description}
            </p>

            {isEnded && (
              <div className="mt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-xl border border-rose-500/30 bg-rose-950/20 p-4 text-sm">
                <div>
                  <p className="font-semibold text-rose-300">
                    This competition has concluded.
                  </p>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Submissions are closed. Check the event leaderboard to view
                    final rankings and scores.
                  </p>
                </div>
              </div>
            )}

            <div className="mt-9 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-zinc-800 bg-[#0e1016] p-4">
                <Calendar className="size-4 text-cyan-400" />
                <span className="mt-4 block text-xs text-zinc-500">Starts</span>
                <strong className="mt-1 block text-sm" suppressHydrationWarning>
                  {formatScheduleTime(g.startTime, g.timezone)}
                </strong>
              </div>

              <div className="rounded-xl border border-zinc-800 bg-[#0e1016] p-4">
                <Clock className="size-4 text-cyan-400" />
                <span className="mt-4 block text-xs text-zinc-500">
                  Duration
                </span>
                <strong className="mt-1 block text-sm">
                  {durationHours} {durationHours === 1 ? "hour" : "hours"}
                </strong>
              </div>

              <div className="rounded-xl border border-zinc-800 bg-[#0e1016] p-4">
                <Layers3 className="size-4 text-cyan-400" />
                <span className="mt-4 block text-xs text-zinc-500">
                  Challenges
                </span>
                <strong className="mt-1 block text-sm">
                  {g.challenges.length}
                </strong>
              </div>
            </div>

            <div className="mt-10 border-t border-zinc-800 pt-8">
              <h2 className="font-semibold">Competition rules</h2>
              <ul className="mt-4 grid gap-3 text-sm text-zinc-400">
                <li className="flex gap-2">
                  <ShieldCheck className="size-4 text-emerald-400 shrink-0" />
                  Individual and team rankings with verified score averaging.
                </li>
                <li className="flex gap-2">
                  <ShieldCheck className="size-4 text-emerald-400 shrink-0" />
                  Runs and timers are verified by the server.
                </li>
              </ul>
            </div>
          </div>

          <aside className="h-fit rounded-2xl border border-zinc-700 bg-[#0e1016] p-6 shadow-2xl">
            {isEnded ? (
              <div className="font-mono">
                <span className="block text-[11px] uppercase tracking-wider text-rose-400 font-semibold">
                  Competition Status
                </span>
                <strong
                  className="mt-1 block text-xl font-bold text-rose-400"
                  suppressHydrationWarning
                >
                  Event Ended
                </strong>
                <p className="mt-1.5 text-xs text-zinc-400">
                  This competition has officially concluded.
                </p>
              </div>
            ) : (
              <GameCountdown
                target={(phase === "LIVE"
                  ? g.endTime
                  : g.startTime
                ).toISOString()}
                label={
                  phase === "LIVE" ? "Time remaining" : "Competition begins in"
                }
                isEnded={isEnded}
              />
            )}
            <div className="my-6 h-px bg-zinc-800" />
            <GameAction
              teamJoined={!!membership}
              gameId={g.id}
              phase={isEnded ? "ENDED" : phase}
              signedIn={!!user}
              registered={!!(g.registrations && g.registrations.length)}
              hasResults={
                !!(g.runs && g.runs.some((r) => r.status === "COMPLETED"))
              }
              hasStarted={!!(g.runs && g.runs.length > 0)}
            />
            <p className="mt-4 text-xs leading-5 text-zinc-500">
              {isEnded
                ? `Times shown in ${g.timezone}. Final scores and standings have been verified.`
                : `Times shown in ${g.timezone}. Your browser countdown stays synchronized with the authoritative schedule.`}
            </p>
          </aside>
        </div>
      </main>
    </div>
  );
}

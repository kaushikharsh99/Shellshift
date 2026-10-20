import { RosterUpload } from "@/components/admin/RosterUpload";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Activity,
  Calendar,
  Clock,
  ExternalLink,
  Eye,
  Globe,
  Layers3,
  Trophy,
  Users,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { GameDangerZone } from "@/components/admin/GameDangerZone";
import { GamePublishButton } from "@/components/admin/GamePublishButton";
import { formatScheduleTime } from "@/lib/games/display";

export const dynamic = "force-dynamic";

export default async function GamePage({
  params,
}: {
  params: Promise<{ gameId: string }>;
}) {
  const { gameId } = await params;
  const game = await prisma.event.findUnique({
    where: { id: gameId },
    include: {
      rosterTeams: { select: { _count: { select: { members: true } } } },
      challenges: {
        orderBy: { order: "asc" },
        include: { challenge: true },
      },
      _count: { select: { registrations: true, runs: true } },
    },
  });

  if (!game) notFound();

  const [activeRuns, completedRuns] = await Promise.all([
    prisma.run.count({ where: { eventId: gameId, status: "IN_PROGRESS" } }),
    prisma.run.count({ where: { eventId: gameId, status: "COMPLETED" } }),
  ]);

  const durationHours =
    game.startTime && game.endTime
      ? Math.round((game.endTime.getTime() - game.startTime.getTime()) / 36e5)
      : null;

  return (
    <div className="mx-auto max-w-5xl">
      <RosterUpload
        gameId={game.id}
        teamCount={game.rosterTeams.length}
        memberCount={game.rosterTeams.reduce(
          (sum, t) => sum + t._count.members,
          0,
        )}
        editable={game.status === "DRAFT"}
      />
      {/* Header & Quick Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <StatusBadge tone={game.status === "ENDED" ? "neutral" : "info"}>
              {game.status}
            </StatusBadge>
            <span className="rounded-md border border-zinc-800 bg-zinc-900/60 px-2 py-0.5 text-xs text-zinc-400">
              {game.visibility || "PUBLIC"}
            </span>
            {game.slug && (
              <span className="font-mono text-xs text-zinc-500">
                slug: {game.slug}
              </span>
            )}
          </div>
          <h1 className="mt-3 text-3xl font-semibold">{game.name}</h1>
          <p className="mt-2 text-zinc-400 max-w-2xl">
            {game.description || "No description provided."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:flex-col sm:items-end">
          {game.status === "DRAFT" ? (
            <GamePublishButton gameId={game.id} />
          ) : (
            <Link
              href={`/admin/games/${game.id}/live`}
              className="flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-black transition hover:bg-emerald-400"
            >
              <Activity className="size-4" />
              Live Operations Console
            </Link>
          )}

          <div className="flex items-center gap-2 mt-2">
            <Link
              href={`/games/${game.slug || game.id}`}
              className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-[#0e1016] px-3 py-1.5 text-xs text-zinc-400 transition hover:bg-zinc-800 hover:text-white"
            >
              <ExternalLink className="size-3.5" />
              Public View
            </Link>
            <Link
              href={`/games/${game.slug || game.id}/standings`}
              className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-[#0e1016] px-3 py-1.5 text-xs text-zinc-400 transition hover:bg-zinc-800 hover:text-white"
            >
              <Trophy className="size-3.5" />
              Standings
            </Link>
          </div>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="mt-8 grid gap-4 grid-cols-2 sm:grid-cols-4">
        <div className="rounded-xl border border-zinc-800 bg-[#0e1016] p-5">
          <div className="flex items-center justify-between text-zinc-500">
            <span className="text-xs uppercase tracking-wider">Registered</span>
            <Users className="size-4 text-cyan-400" />
          </div>
          <strong className="mt-2 block text-3xl">
            {game._count.registrations}
          </strong>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-[#0e1016] p-5">
          <div className="flex items-center justify-between text-zinc-500">
            <span className="text-xs uppercase tracking-wider">
              Active Runs
            </span>
            <Activity className="size-4 text-amber-400" />
          </div>
          <strong className="mt-2 block text-3xl">{activeRuns}</strong>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-[#0e1016] p-5">
          <div className="flex items-center justify-between text-zinc-500">
            <span className="text-xs uppercase tracking-wider">Completed</span>
            <Trophy className="size-4 text-emerald-400" />
          </div>
          <strong className="mt-2 block text-3xl">{completedRuns}</strong>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-[#0e1016] p-5">
          <div className="flex items-center justify-between text-zinc-500">
            <span className="text-xs uppercase tracking-wider">Lineup</span>
            <Layers3 className="size-4 text-purple-400" />
          </div>
          <strong className="mt-2 block text-3xl">
            {game.challenges.length}
          </strong>
        </div>
      </div>

      {/* Schedule Details Card */}
      <section className="mt-8 rounded-2xl border border-zinc-800 bg-[#0e1016] p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Calendar className="size-5 text-cyan-400" />
            Schedule & Timezone
          </h2>
          <span className="flex items-center gap-1.5 font-mono text-xs text-zinc-400 bg-zinc-900 px-2.5 py-1 rounded-md">
            <Globe className="size-3.5 text-zinc-500" />
            {game.timezone || "UTC"}
          </span>
        </div>

        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-cyan-400 block mb-3">
              Registration Window
            </span>
            <div className="grid gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-zinc-500">Opens:</span>
                <span
                  className="font-mono text-zinc-300"
                  suppressHydrationWarning
                >
                  {formatScheduleTime(game.registrationOpensAt, game.timezone)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Closes:</span>
                <span
                  className="font-mono text-zinc-300"
                  suppressHydrationWarning
                >
                  {formatScheduleTime(game.registrationClosesAt, game.timezone)}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-cyan-400 block mb-3">
              Competition Window
            </span>
            <div className="grid gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-zinc-500">Starts:</span>
                <span
                  className="font-mono text-zinc-300"
                  suppressHydrationWarning
                >
                  {formatScheduleTime(game.startTime, game.timezone)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Ends:</span>
                <span
                  className="font-mono text-zinc-300"
                  suppressHydrationWarning
                >
                  {formatScheduleTime(game.endTime, game.timezone)}
                </span>
              </div>
              {durationHours !== null && (
                <div className="flex justify-between pt-1 border-t border-zinc-800 text-xs">
                  <span className="text-zinc-500">Total Duration:</span>
                  <span className="text-zinc-400">{durationHours} hours</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Challenge Lineup */}
      <section className="mt-8 rounded-2xl border border-zinc-800 bg-[#0e1016] p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Layers3 className="size-5 text-cyan-400" />
            Challenge Lineup
          </h2>
          <span className="text-xs text-zinc-500">
            {game.challenges.length} active challenges
          </span>
        </div>

        {game.challenges.length === 0 ? (
          <p className="mt-4 text-sm text-zinc-500">
            No challenges assigned to this competition lineup.
          </p>
        ) : (
          <ol className="mt-4 divide-y divide-zinc-800/80">
            {game.challenges.map((item, index) => (
              <li
                key={item.id}
                className="flex items-center gap-4 py-4 hover:bg-zinc-900/20 px-2 rounded-lg transition"
              >
                <span className="grid size-7 place-items-center rounded bg-zinc-900 font-mono text-xs text-cyan-400">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm text-white truncate">
                      {item.challenge.title}
                    </span>
                    {!item.challenge.isPublished && (
                      <span className="rounded bg-rose-950/60 border border-rose-800/60 px-1.5 py-0.5 text-[10px] text-rose-300">
                        Hidden
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-zinc-500 font-mono">
                    /{item.challenge.slug}
                  </span>
                </div>

                <span className="text-xs px-2 py-0.5 rounded border border-zinc-800 text-zinc-400 font-mono">
                  {item.challenge.difficulty}
                </span>

                <Link
                  href={`/admin/challenges/${item.challenge.id}/edit`}
                  className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white transition"
                  title="Edit Challenge"
                >
                  <Eye className="size-4" />
                </Link>
              </li>
            ))}
          </ol>
        )}
      </section>

      {/* Danger Zone */}
      <div className="mt-8">
        <GameDangerZone
          gameId={game.id}
          name={game.name}
          status={game.status}
          registrationCount={game._count.registrations}
          runCount={game._count.runs}
        />
      </div>
    </div>
  );
}

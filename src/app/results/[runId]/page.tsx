import Link from "next/link";
import { notFound } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { formatDuration } from "@/lib/format";
import {
  Trophy,
  Clock,
  Compass,
  Terminal as TerminalIcon,
  Play,
  XCircle,
} from "lucide-react";
import { StartRunButton } from "../../lobby/StartButton";
import { getNextGameChallenge } from "@/lib/games/nextChallenge";

export const dynamic = "force-dynamic";

export default async function ResultsPage({
  params,
}: {
  params: Promise<{ runId: string }>;
}) {
  const { runId } = await params;
  const session = await getSession();

  const run = await prisma.run.findUnique({
    where: { id: runId },
    include: {
      user: true,
      challenge: true,
      hintUsages: { include: { hint: true } },
      commandLogs: { orderBy: { timestamp: "asc" } },
    },
  });

  if (!run || !session || (session.role !== "ADMIN" && run.userId !== session.id)) {
    notFound();
  }

  const isCompleted = run.status === "COMPLETED";
  const isAbandoned = run.status === "ABANDONED" || run.status === "EXPIRED";
  const isInProgress = run.status === "IN_PROGRESS";

  // Calculate Rank on leaderboard if completed
  const effectiveDurationMs = run.durationMs || 0;

  let rank = null;
  if (isCompleted && run.durationMs) {
    const betterRunsCount = await prisma.run.count({
      where: {
        challengeId: run.challengeId,
        status: "COMPLETED",
        OR: [
          { finalScore: { gt: run.finalScore } },
          {
            finalScore: run.finalScore,
            durationMs: { lt: run.durationMs },
          },
          {
            finalScore: run.finalScore,
            durationMs: run.durationMs,
            completedAt: { lt: run.completedAt! },
          },
        ],
      },
    });
    rank = betterRunsCount + 1;
  }

  const nextChallenge = await getNextGameChallenge(run);

  return (
    <div className="min-h-screen bg-[#09090b] text-[#fafafa] flex flex-col selection:bg-cyan-500 selection:text-black">
      <Navbar user={session} />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-10 w-full flex-1 space-y-6">
        {/* Header Hero */}
        <div className="text-center space-y-3">
          <div
            className={`w-14 h-14 rounded-full mx-auto flex items-center justify-center border ${
              isCompleted
                ? "bg-emerald-950/60 border-emerald-500/50 text-emerald-400"
                : isAbandoned
                ? "bg-rose-950/60 border-rose-500/50 text-rose-400"
                : "bg-cyan-950/60 border-cyan-500/50 text-cyan-400"
            }`}
          >
            {isCompleted ? (
              <Trophy className="w-7 h-7" />
            ) : isAbandoned ? (
              <XCircle className="w-7 h-7" />
            ) : (
              <Clock className="w-7 h-7" />
            )}
          </div>

          <div className="space-y-1">
            <span
              className={`text-xs uppercase font-bold tracking-widest ${
                isCompleted
                  ? "text-emerald-400"
                  : isAbandoned
                  ? "text-rose-400"
                  : "text-cyan-400"
              }`}
            >
              {isCompleted
                ? "Individual Server-Verified Completion"
                : isAbandoned
                ? "Individual Mission Expired / Incomplete"
                : "Individual Mission In Progress"}
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {run.challenge.title}
            </h1>
            <p className="text-xs text-[#a1a1aa]">
              Player: <span className="text-cyan-400 font-bold">{run.user?.name || "Operator"}</span>
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="p-4 sm:p-5 rounded-lg bg-[#121215] border border-[#27272a] text-center space-y-1">
            <span className="text-[10px] sm:text-[11px] text-[#a1a1aa] uppercase tracking-wider font-semibold">
              Final Score
            </span>
            <div className="text-2xl sm:text-3xl font-extrabold text-cyan-400 tabular-nums">
              {run.finalScore % 1 === 0 ? run.finalScore : run.finalScore.toFixed(2)}
            </div>
            <span className="text-[10px] text-[#a1a1aa]">
              {run.difficultyMultiplier}x Multiplier
            </span>
          </div>

          <div className="p-4 sm:p-5 rounded-lg bg-[#121215] border border-[#27272a] text-center space-y-1">
            <span className="text-[10px] sm:text-[11px] text-[#a1a1aa] uppercase tracking-wider font-semibold">
              Challenge Rank
            </span>
            <div className="text-2xl sm:text-3xl font-extrabold text-amber-400 tabular-nums">
              {rank !== null ? `#${rank}` : "--"}
            </div>
            <span className="text-[10px] text-[#a1a1aa]">
              {isCompleted ? "Verified Standing" : "Unranked"}
            </span>
          </div>

          <div className="p-4 sm:p-5 rounded-lg bg-[#121215] border border-[#27272a] text-center space-y-1">
            <span className="text-[10px] sm:text-[11px] text-[#a1a1aa] uppercase tracking-wider font-semibold">
              Authoritative Time
            </span>
            <div
              className={`text-2xl sm:text-3xl font-extrabold tabular-nums font-mono ${
                isCompleted ? "text-emerald-400" : "text-[#a1a1aa]"
              }`}
            >
              {isCompleted ? formatDuration(effectiveDurationMs) : "--:--"}
            </div>
            <span className="text-[10px] text-[#a1a1aa]">
              {isCompleted ? "Verified Finish" : "Pending Finish"}
            </span>
          </div>

          <div className="p-4 sm:p-5 rounded-lg bg-[#121215] border border-[#27272a] text-center space-y-1">
            <span className="text-[10px] sm:text-[11px] text-[#a1a1aa] uppercase tracking-wider font-semibold">
              Commands
            </span>
            <div className="text-2xl sm:text-3xl font-extrabold text-white tabular-nums">
              {run.commandCount}
            </div>
            <span className="text-[10px] text-[#a1a1aa]">Executed</span>
          </div>
        </div>

        {/* Scoring Breakdown Card */}
        <div className="p-5 sm:p-6 rounded-lg bg-[#121215] border border-[#27272a] space-y-4">
          <div className="flex items-center justify-between border-b border-[#27272a] pb-3">
            <h2 className="font-bold text-white text-sm flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-400" />
              Scoring Breakdown
            </h2>
            <span className="text-xs px-2 py-0.5 rounded bg-[#18181b] border border-[#27272a] text-cyan-400 font-mono">
              Status: {run.status}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-xs font-mono">
            <div className="p-3 rounded-lg bg-[#18181b] border border-[#27272a] space-y-1">
              <span className="text-[10px] text-[#a1a1aa] uppercase">Objectives</span>
              <div className="text-lg font-bold text-emerald-400 tabular-nums">+{run.objectivePoints}</div>
              <span className="text-[9px] text-[#a1a1aa]">Base Points</span>
            </div>

            <div className="p-3 rounded-lg bg-[#18181b] border border-[#27272a] space-y-1">
              <span className="text-[10px] text-[#a1a1aa] uppercase">Completion</span>
              <div className="text-lg font-bold text-cyan-400 tabular-nums">+{run.completionBonus}</div>
              <span className="text-[9px] text-[#a1a1aa]">Completion Bonus</span>
            </div>

            <div className="p-3 rounded-lg bg-[#18181b] border border-[#27272a] space-y-1">
              <span className="text-[10px] text-[#a1a1aa] uppercase">Speed Bonus</span>
              <div className="text-lg font-bold text-cyan-400 tabular-nums">+{run.speedBonus % 1 === 0 ? run.speedBonus : run.speedBonus.toFixed(2)}</div>
              <span className="text-[9px] text-[#a1a1aa]">Time Remaining</span>
            </div>

            <div className="col-span-2 sm:col-span-1 p-3 rounded-lg bg-[#18181b] border border-cyan-500/40 space-y-1">
              <span className="text-[10px] text-cyan-400 uppercase font-bold">Total Score</span>
              <div className="text-xl font-extrabold text-cyan-400 tabular-nums">{run.finalScore % 1 === 0 ? run.finalScore : run.finalScore.toFixed(2)}</div>
              <span className="text-[9px] text-[#a1a1aa]">{run.baseScore % 1 === 0 ? run.baseScore : run.baseScore.toFixed(2)} × {run.difficultyMultiplier}</span>
            </div>
          </div>
        </div>

        {/* Detailed Verification Timestamps */}
        <div className="p-5 sm:p-6 rounded-lg bg-[#121215] border border-[#27272a] space-y-3 text-xs">
          <h2 className="font-bold text-white text-sm flex items-center gap-2">
            <Clock className="w-4 h-4 text-cyan-400" />
            Verification Timestamps
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-[#a1a1aa]">
            <div>
              <span className="text-[#a1a1aa] block mb-0.5">Session Started:</span>
              <span className="text-[#fafafa] font-mono">
                {run.startedAt.toISOString()}
              </span>
            </div>
            <div>
              <span className="text-[#a1a1aa] block mb-0.5">Session Finished:</span>
              <span className="text-[#fafafa] font-mono">
                {run.completedAt ? run.completedAt.toISOString() : "Session Incomplete"}
              </span>
            </div>
            <div>
              <span className="text-[#a1a1aa] block mb-0.5">Raw Execution Duration:</span>
              <span className="text-[#fafafa] font-mono">
                {run.durationMs ? `${(run.durationMs / 1000).toFixed(3)}s` : "N/A"}
              </span>
            </div>
            <div>
              <span className="text-[#a1a1aa] block mb-0.5">Total Commands:</span>
              <span className="text-[#fafafa] font-mono">
                {run.commandCount} executed
              </span>
            </div>
          </div>
        </div>

        {/* Command History Audit Log */}
        <div className="p-5 sm:p-6 rounded-lg bg-[#121215] border border-[#27272a] space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-white text-sm flex items-center gap-2">
              <TerminalIcon className="w-4 h-4 text-cyan-400" />
              Command History Audit Log
            </h2>
            <span className="text-xs text-[#a1a1aa] font-mono">
              {run.commandLogs.length} commands logged
            </span>
          </div>

          {run.commandLogs.length === 0 ? (
            <p className="text-xs text-[#a1a1aa] italic py-4 text-center">
              No commands recorded for this session.
            </p>
          ) : (
            <div className="overflow-x-auto border border-[#27272a] rounded-lg">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-[#18181b] border-b border-[#27272a] text-[#a1a1aa] text-[10px] uppercase font-semibold">
                  <tr>
                    <th className="py-2.5 px-3 w-12 text-center">#</th>
                    <th className="py-2.5 px-3">Typed Command</th>
                    <th className="py-2.5 px-3">Mapped Operation</th>
                    <th className="py-2.5 px-3">Execution Output</th>
                    <th className="py-2.5 px-3 text-right">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#27272a]">
                  {run.commandLogs.map((log, idx) => (
                    <tr key={log.id} className="hover:bg-[#18181b]/50">
                      <td className="py-2.5 px-3 text-center text-[#a1a1aa] font-bold">
                        {idx + 1}
                      </td>
                      <td className="py-2.5 px-3 text-cyan-300 font-semibold">
                        $ {log.enteredCommand}
                      </td>
                      <td className="py-2.5 px-3 text-white">
                        <span className="px-1.5 py-0.5 rounded bg-[#18181b] border border-[#27272a] text-[11px]">
                          {log.mappedOperation}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-[#a1a1aa] max-w-xs truncate">
                        {log.output.slice(0, 80) || "<no stdout>"}
                      </td>
                      <td className="py-2.5 px-3 text-right text-[#a1a1aa] text-[11px] tabular-nums">
                        {log.executionTimeMs}ms
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          {nextChallenge && run.eventId && (
            <StartRunButton
              challengeId={nextChallenge.id}
              gameId={run.eventId}
              label={`Next Mission: ${nextChallenge.title} →`}
              className="px-6 py-2.5 rounded-lg btn-primary text-xs font-bold transition-colors flex items-center gap-2"
            />
          )}

          {isInProgress ? (
            <Link
              href={`/play/${run.id}`}
              className="px-5 py-2.5 rounded-lg btn-primary text-xs font-bold transition-colors flex items-center gap-2"
            >
              <Play className="w-4 h-4 fill-current" />
              Resume Active Challenge
            </Link>
          ) : (
            <Link
              href="/lobby"
              className="px-5 py-2.5 rounded-lg btn-secondary text-xs font-bold transition-colors flex items-center gap-2"
            >
              <Compass className="w-4 h-4" />
              Mission Catalog
            </Link>
          )}

          <Link
            href={run.eventId ? `/leaderboard?gameId=${run.eventId}` : "/leaderboard"}
            className="px-5 py-2.5 rounded-lg btn-secondary text-xs font-bold transition-colors flex items-center gap-2"
          >
            <Trophy className="w-4 h-4 text-amber-400" />
            View Leaderboard
          </Link>
        </div>
      </main>
    </div>
  );
}

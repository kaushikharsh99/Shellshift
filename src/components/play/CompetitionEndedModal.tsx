"use client";

import React from "react";
import { Trophy, Terminal as TerminalIcon, CheckCircle2, ArrowRight, Eye, Flag } from "lucide-react";

interface CompetitionEndedModalProps {
  runData: any;
  gameId?: string;
  onClose?: () => void;
}

export function CompetitionEndedModal({
  runData,
  gameId,
  onClose,
}: CompetitionEndedModalProps) {
  const rawScore = runData?.finalScore || runData?.scoringBreakdown?.finalScore || runData?.baseScore || runData?.objectivePoints || 0;
  const finalScore = typeof rawScore === "number" ? (rawScore % 1 === 0 ? rawScore : rawScore.toFixed(2)) : rawScore;
  const commandCount = runData?.commandCount ?? 0;
  const evaluation = runData?.objectiveEvaluation;
  const completedObjectives = evaluation?.completedRules ?? (runData?.status === "COMPLETED" ? 1 : 0);
  const totalObjectives = evaluation?.totalRules ?? 1;

  const eventId = gameId || runData?.game?.id || runData?.gameId;
  const standingsUrl = eventId ? `/games/${eventId}/standings` : "/games";
  const lobbyUrl = eventId ? `/games/${eventId}/lobby` : "/games";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 font-mono select-none animate-in fade-in duration-200">
      <div role="dialog" aria-modal="true" aria-labelledby="event-ended-title" className="w-full max-w-md space-y-5 rounded-2xl border border-rose-500/40 bg-[#0d101a] p-6 text-center shadow-2xl relative overflow-hidden sm:p-7">
        {/* Top Glow Accent */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-1 bg-gradient-to-r from-transparent via-rose-500 to-transparent" />

        {/* Icon Badge */}
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl border border-amber-500/40 bg-amber-950/40 text-amber-400 shadow-[0_0_24px_rgba(245,158,11,0.25)]">
          <Trophy className="size-7 text-amber-400" />
        </div>

        {/* Heading Area */}
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/40 bg-rose-950/50 px-3 py-0.5 text-[11px] font-bold uppercase tracking-wider text-rose-300">
            <Flag className="size-3 text-rose-400" />
            <span>Competition Concluded</span>
          </div>
          <h2 id="event-ended-title" className="text-xl font-bold tracking-tight text-white">Event Has Ended</h2>
          <p className="text-xs text-zinc-400 leading-relaxed">
            The event timer has expired and submissions are locked. Final scores and player rankings are now verified and published.
          </p>
        </div>

        {/* Performance Snapshot Card */}
        <div className="space-y-2.5 rounded-xl border border-[#23293a] bg-[#070910] p-4 text-left font-mono">
          <div className="flex items-center justify-between border-b border-[#1a2030] pb-2">
            <span className="flex items-center gap-1.5 text-xs text-zinc-400">
              <Trophy className="size-3.5 text-amber-400" /> Final Score
            </span>
            <span className="text-base font-bold tabular-nums text-amber-400">
              {finalScore} PTS
            </span>
          </div>

          <div className="flex items-center justify-between border-b border-[#1a2030] pb-2">
            <span className="flex items-center gap-1.5 text-xs text-zinc-400">
              <CheckCircle2 className="size-3.5 text-emerald-400" /> Objectives Met
            </span>
            <span className="text-xs font-bold text-white tabular-nums">
              {completedObjectives} / {totalObjectives}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs text-zinc-400">
              <TerminalIcon className="size-3.5 text-cyan-400" /> Commands Entered
            </span>
            <span className="text-xs font-bold text-white tabular-nums">
              {commandCount}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2.5 pt-1">
          {/* Primary CTA: Event Leaderboard */}
          <a
            href={standingsUrl}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-5 py-3 text-xs sm:text-sm font-bold text-black shadow-[0_0_20px_rgba(245,158,11,0.25)] hover:brightness-110 active:scale-[0.99] transition-all cursor-pointer"
          >
            <Trophy className="size-4 shrink-0 text-black" />
            <span>Go to Event Leaderboard</span>
            <ArrowRight className="size-4 shrink-0" />
          </a>

          <div className="flex items-center gap-2">
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-[#23293a] bg-[#121622] px-3.5 py-2.5 text-xs font-medium text-zinc-300 hover:text-white hover:border-[#38435d] transition-colors cursor-pointer"
              >
                <Eye className="size-3.5 text-cyan-400 shrink-0" />
                <span>Review Terminal</span>
              </button>
            )}

            <a
              href={lobbyUrl}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-[#23293a] bg-[#121622] px-3.5 py-2.5 text-xs font-medium text-zinc-300 hover:text-white hover:border-[#38435d] transition-colors"
            >
              <span>Lobby</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

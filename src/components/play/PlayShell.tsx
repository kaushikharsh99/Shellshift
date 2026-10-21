"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Terminal as TerminalComponent } from "@/components/Terminal";
import { ObjectiveBar } from "@/components/ObjectiveBar";
import { LiveTimer } from "@/components/LiveTimer";
import { ContextPanel } from "@/components/play/ContextPanel";
import { CompletionSummary } from "@/components/play/CompletionSummary";
import { CompetitionEndedModal } from "@/components/play/CompetitionEndedModal";
import {
  Terminal as TerminalIcon,
  KeyRound,
  AlertTriangle,
  User,
  PauseCircle,
  Trophy,
  ArrowRight,
} from "lucide-react";

interface PlayShellProps {
  runData: any;
  isCompleted: boolean;
  finalDuration: number | null;
  onCommandExecuted: (result: any) => void;
  onNextChallenge: () => void;
  startingNext?: boolean;
  onRefreshRun?: () => void;
}

export function PlayShell({
  runData,
  isCompleted,
  finalDuration,
  onCommandExecuted,
  onNextChallenge,
  startingNext = false,
  onRefreshRun,
}: PlayShellProps) {
  const [mobileTab, setMobileTab] = useState<"terminal" | "ciphers">("terminal");
  const [showEndedModal, setShowEndedModal] = useState(false);

  const challenge = runData.challenge;
  const game = runData.game;
  const isGamePaused = game?.status === "PAUSED";
  const [eventTimeExpired, setEventTimeExpired] = useState(false);

  const isGameEnded =
    game?.status === "ENDED" ||
    game?.status === "ARCHIVED" ||
    eventTimeExpired;

  useEffect(() => {
    if (isGameEnded && !isCompleted) {
      setShowEndedModal(true);
    }
  }, [isGameEnded, isCompleted]);

  const playerName = runData.player?.name || runData.team?.name || "Admin Cipher Master";
  const clueCount = challenge.clues?.length || 0;
  const gameId = game?.id || runData.gameId;

  return (
    <div className="flex min-h-screen flex-col bg-[#07080d] font-mono text-[#fafafa] selection:bg-cyan-500 selection:text-black lg:h-screen">
      {/* 1. Top Status Command Bar */}
      <header className="flex shrink-0 items-center justify-between border-b border-[#1e2434] bg-[#0b0d14] px-3.5 py-2.5 select-none sm:px-4">
        {/* SHELLSHIFT */}
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href={gameId ? `/games/${gameId}/lobby` : "/games"}
            className="flex items-center gap-2 group shrink-0"
            title="Return to Game Lobby"
          >
            {/* Cyan Prompt Icon Badge */}
            <div className="flex size-7 items-center justify-center rounded-lg border border-cyan-500/40 bg-[#121622] text-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.15)] transition group-hover:border-cyan-400">
              <span className="font-mono text-xs font-bold leading-none tracking-tighter">&gt;_</span>
            </div>
            <span className="font-mono text-xs font-bold tracking-wider text-white">
              SHELL<span className="text-cyan-400">SHIFT</span>
            </span>
          </Link>
        </div>

        {/* Event countdown, standings, score, and player */}
        <div className="flex shrink-0 items-center gap-3">
          <LiveTimer
            deadlineAt={game?.endTime}
            isExpired={isGameEnded}
            onTimeUp={() => {
              setEventTimeExpired(true);
              setShowEndedModal(true);
              onRefreshRun?.();
            }}
          />

          {/* Leaderboard Link Button */}
          <Link
            href={gameId ? `/games/${gameId}/standings` : "/games"}
            className="flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-950/20 px-2.5 py-1 text-xs font-mono text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.12)] transition hover:border-amber-400 hover:bg-amber-950/40 hover:text-amber-200 cursor-pointer"
            title="View Live Event Leaderboard & Standings"
          >
            <Trophy className="size-3.5 text-amber-400 shrink-0" />
            <span className="font-bold tracking-wide">Leaderboard</span>
          </Link>

          {/* Score Display with Trophy */}
          {(() => {
            const currentMissionScore =
              typeof runData.finalScore === "number" && runData.finalScore > 0
                ? runData.finalScore
                : typeof runData.scoringBreakdown?.finalScore === "number" && runData.scoringBreakdown.finalScore > 0
                ? runData.scoringBreakdown.finalScore
                : (runData.objectivePoints || 0);

            const displayScore =
              typeof runData.totalEventScore === "number" && runData.totalEventScore > 0
                ? (runData.totalEventScore % 1 === 0 ? runData.totalEventScore : runData.totalEventScore.toFixed(2))
                : (currentMissionScore % 1 === 0 ? currentMissionScore : currentMissionScore.toFixed(2));

            return (
              <div className="hidden sm:flex items-center gap-1.5 text-xs font-mono">
                <Trophy className="size-3.5 text-amber-400 shrink-0" />
                <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">
                  {typeof runData.totalEventScore === "number" && runData.totalEventScore > 0 ? "TOTAL SCORE" : "SCORE"}
                </span>
                <span className="font-bold tabular-nums text-cyan-300">
                  {displayScore} PTS
                </span>
                {typeof runData.totalEventScore === "number" && runData.totalEventScore > 0 && currentMissionScore > 0 && !isCompleted && (
                  <span className="text-[10px] text-emerald-400 font-bold">
                    (+{currentMissionScore})
                  </span>
                )}
              </div>
            );
          })()}

          {/* User Profile Pill */}
          <div className="flex items-center gap-1.5 rounded-full border border-[#23293a] bg-[#121622] px-3 py-1 text-xs font-mono">
            <User className="size-3.5 text-zinc-400 shrink-0" />
            <span className="max-w-[120px] truncate text-xs font-medium text-zinc-200 sm:max-w-none">
              {playerName}
            </span>
          </div>
        </div>
      </header>

      {/* Paused / Ended Warning Banner */}
      {isGamePaused && (
        <div className="flex items-center gap-2 border-b border-amber-800/80 bg-amber-950/60 px-4 py-2 text-xs font-semibold text-amber-300">
          <PauseCircle className="size-4 shrink-0 text-amber-400" />
          <span>Game is currently PAUSED by tournament hosts. Commands are temporarily halted.</span>
        </div>
      )}
      {isGameEnded && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-rose-800/80 bg-rose-950/60 px-4 py-2 text-xs font-semibold text-rose-300">
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-4 shrink-0 text-rose-400" />
            <span>Competition has ENDED. New commands are no longer accepted.</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowEndedModal(true)}
              className="rounded bg-rose-900/60 px-2.5 py-1 text-[11px] font-bold text-rose-200 hover:bg-rose-800 transition cursor-pointer"
            >
              View Summary
            </button>
            <Link
              href={gameId ? `/games/${gameId}/standings` : "/games"}
              className="rounded bg-amber-500 px-2.5 py-1 text-[11px] font-bold text-black hover:bg-amber-400 transition cursor-pointer"
            >
              Leaderboard
            </Link>
          </div>
        </div>
      )}

      {/* 2. Mission Objective Rail */}
      <ObjectiveBar
        challengeTitle={challenge.title}
        challengeDescription={challenge.description}
        description={challenge.objective?.description || challenge.description || "Satisfy challenge objective criteria"}
        rules={
          runData.objectiveEvaluation?.details?.length
            ? runData.objectiveEvaluation.details.map((d: any, idx: number) => ({
                id: d.id,
                description: d.description,
                passed: !!d.passed,
                blocked: !!d.blocked,
                points: d.points ?? challenge.objective?.rules?.[idx]?.points ?? 500,
              }))
            : challenge.objective?.rules?.map((r: any) => ({
                id: r.id,
                description: r.description,
                passed: false,
                points: r.points ?? 500,
              })) || []
        }
        isCompleted={isCompleted}
        difficulty={challenge.difficulty}
      />

      <div className="flex shrink-0 justify-end px-3 pb-2 sm:px-4">
        <button
          type="button"
          onClick={onNextChallenge}
          disabled={startingNext || isGamePaused || isGameEnded}
          className="inline-flex items-center gap-2 rounded-lg border border-cyan-500/30 bg-cyan-950/30 px-3 py-2 text-xs font-bold text-cyan-300 transition hover:bg-cyan-950/60 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {startingNext ? "Opening…" : isCompleted ? "Next" : runData.nextChallenge ? "Skip to next" : "Back to challenges"}
          <ArrowRight className="size-3.5" />
        </button>
      </div>

      {/* Mobile/Tablet Workspace Switcher */}
      <div className="flex items-center justify-around border-b border-[#1e2434] bg-[#0b0d14] px-3 py-1.5 select-none lg:hidden">
        <button
          type="button"
          onClick={() => setMobileTab("terminal")}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded py-1.5 text-xs font-bold transition cursor-pointer ${
            mobileTab === "terminal"
              ? "border border-zinc-700 bg-zinc-800 text-cyan-300"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          <TerminalIcon className="size-3.5" />
          <span>Terminal</span>
        </button>

        <button
          type="button"
          onClick={() => setMobileTab("ciphers")}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded py-1.5 text-xs font-bold transition cursor-pointer ${
            mobileTab === "ciphers"
              ? "border border-zinc-700 bg-zinc-800 text-cyan-300"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          <KeyRound className="size-3.5" />
          <span>Clues ({clueCount})</span>
        </button>
      </div>

      {/* 3. Main Split-Screen Workspace (Dominant Terminal) */}
      <div className="grid flex-1 grid-cols-1 gap-3 px-3 pb-2.5 overflow-hidden sm:px-4 lg:grid-cols-12 min-h-0">
        {/* Terminal Surface (7 cols on desktop) */}
        <div
          className={`h-[520px] flex-col overflow-hidden lg:col-span-7 lg:h-full ${
            mobileTab === "terminal" ? "flex" : "hidden lg:flex"
          }`}
        >
          <TerminalComponent
            runId={runData.id}
            playerName={playerName}
            currentCwd={runData.currentWorkingDir}
            onCommandExecuted={onCommandExecuted}
            disabled={isCompleted || isGamePaused || isGameEnded}
          />
        </div>

        {/* Context Panel (5 cols on desktop) */}
        <div
          className={`h-[520px] flex-col overflow-hidden lg:col-span-5 lg:h-full ${
            mobileTab === "ciphers" ? "flex" : "hidden lg:flex"
          }`}
        >
          <ContextPanel
            clues={challenge.clues || []}
            treeList={runData.treeList || []}
            currentWorkingDir={runData.currentWorkingDir ?? "/"}
            runId={runData.id}
            onRefreshVfs={onRefreshRun}
            activeTab="clues"
          />
        </div>
      </div>

      {/* 4. Footer Status Bar */}
      <footer className="hidden h-7 shrink-0 items-center justify-between border-t border-[#1e2434] bg-[#0b0d14] px-4 text-[10px] text-zinc-500 lg:flex select-none font-mono">
        <span>Sandboxed virtual shell · No host execution · Command tokens may be remapped</span>
        <div className="flex items-center gap-2 text-emerald-400">
          <span>Server-verified scoring · Live engine</span>
          <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
        </div>
      </footer>

      {/* Completion Modal */}
      {isCompleted && (
        <CompletionSummary
          runData={runData}
          finalDuration={finalDuration}
          onNextChallenge={onNextChallenge}
          startingNext={startingNext}
        />
      )}

      {/* Competition Ended Modal */}
      {showEndedModal && !isCompleted && (
        <CompetitionEndedModal
          runData={runData}
          gameId={gameId}
          onClose={() => setShowEndedModal(false)}
        />
      )}
    </div>
  );
}

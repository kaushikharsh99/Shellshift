"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { PlayShell } from "@/components/play/PlayShell";
import { AlertTriangle, ArrowLeft } from "lucide-react";

export default function PlayChallengePage() {
  const params = useParams();
  const runId = params?.runId as string;

  const router = useRouter();
  const [runData, setRunData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [finalDuration, setFinalDuration] = useState<number | null>(null);
  const [startingNext, setStartingNext] = useState(false);

  // Fetch run state from server
  const fetchRunState = useCallback(async () => {
    try {
      const res = await fetch(`/api/runs/${runId}`, {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      });
      if (!res.ok) {
        const err = await res.json();
        setErrorMsg(err.error || "Failed to load challenge run.");
        setLoading(false);
        return;
      }

      const data = await res.json();
      setRunData((prev: any) => {
        const serverRun = data.run;
        if (prev?.finalScore && (!serverRun.finalScore || serverRun.finalScore === 0)) {
          return {
            ...serverRun,
            finalScore: prev.finalScore,
            objectivePoints: prev.objectivePoints || serverRun.objectivePoints,
            scoringBreakdown: prev.scoringBreakdown || serverRun.scoringBreakdown,
            totalEventScore: serverRun.totalEventScore ?? prev.totalEventScore,
          };
        }
        return {
          ...serverRun,
          totalEventScore: serverRun.totalEventScore ?? prev?.totalEventScore,
        };
      });
      setIsCompleted(data.run.status === "COMPLETED");
      setFinalDuration(data.run.status === "COMPLETED" ? data.run.durationMs : null);
    } catch (err) {
      setErrorMsg("Network error: " + (err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [runId]);

  useEffect(() => {
    if (runId) {
      setLoading(true);
      setErrorMsg(null);
      setRunData(null);
      setIsCompleted(false);
      setFinalDuration(null);
      fetchRunState();
    }
  }, [runId, fetchRunState]);

  const handleCommandExecuted = (result: any) => {
    if (result) {
      setRunData((prev: any) => {
        if (!prev) return prev;
        const bd = result.scoreBreakdown;
        const finalSc = bd?.finalScore ?? (result.isCompleted ? prev.finalScore : prev.finalScore);
        const objPts = bd?.objectivePoints ?? prev.objectivePoints;
        const durMs = result.durationMs ?? prev.durationMs;

        let updatedEventScore =
          typeof result.totalEventScore === "number"
            ? result.totalEventScore
            : prev.totalEventScore;

        return {
          ...prev,
          currentWorkingDir: result.cwd || prev.currentWorkingDir,
          treeList: result.treeList || prev.treeList,
          commandCount: result.commandCount ?? prev.commandCount,
          objectiveEvaluation: result.objectiveEvaluation || prev.objectiveEvaluation,
          finalScore: finalSc,
          objectivePoints: objPts,
          baseScore: bd?.baseScore ?? prev.baseScore,
          completionBonus: bd?.completionBonus ?? prev.completionBonus,
          speedBonus: bd?.speedBonus ?? prev.speedBonus,
          hintPenalty: bd?.hintPenalty ?? prev.hintPenalty,
          durationMs: durMs,
          status: result.status ?? (result.isCompleted ? "COMPLETED" : prev.status),
          scoringBreakdown: bd ?? prev.scoringBreakdown,
          totalEventScore: updatedEventScore,
        };
      });
    }

    if (result?.isGameEnded || result?.isGamePaused) {
      fetchRunState();
    }

    if (result?.isCompleted) {
      setFinalDuration(result.durationMs);
      setIsCompleted(true);
      fetchRunState();
    }
  };

  const handleGoToNextProblem = async () => {
    if (!runData?.nextChallenge) {
      const gameId = runData?.game?.id || runData?.gameId;
      router.push(gameId ? `/games/${gameId}/lobby` : "/games");
      return;
    }

    setStartingNext(true);
    try {
      const res = await fetch("/api/runs/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          challengeId: runData.nextChallenge.id,
          gameId: runData.game?.id || runData.gameId,
        }),
      });

      const data = await res.json();
      if (res.ok && data.run?.id) {
        router.push(`/play/${data.run.id}`);
      } else {
        const gameId = runData.game?.id || runData.gameId;
        router.push(gameId ? `/games/${gameId}/lobby` : "/games");
      }
    } catch {
      router.push("/games");
    } finally {
      setStartingNext(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#07080b] font-mono text-white">
        <div className="flex items-center gap-2.5 text-xs text-cyan-400">
          <span className="size-2 animate-ping rounded-full bg-cyan-400" />
          <span>Mounting isolated sandbox filesystem...</span>
        </div>
      </div>
    );
  }

  if (errorMsg || !runData) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#07080b] p-4 font-mono text-white">
        <div className="w-full max-w-md space-y-4 rounded-xl border border-zinc-800 bg-[#0e1016] p-6 text-center shadow-xl">
          <AlertTriangle className="mx-auto size-8 text-rose-400" />
          <h2 className="text-base font-bold text-white">Challenge Access Error</h2>
          <p className="text-xs text-zinc-400">{errorMsg || "Unable to access run session."}</p>
          <div className="pt-2">
            <Link
              href="/games"
              className="btn-secondary inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold"
            >
              <ArrowLeft className="size-3.5" />
              <span>Return to Games</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <PlayShell
      key={runId}
      runData={runData}
      isCompleted={isCompleted}
      finalDuration={finalDuration}
      onCommandExecuted={handleCommandExecuted}
      onNextChallenge={handleGoToNextProblem}
      startingNext={startingNext}
      onRefreshRun={fetchRunState}
    />
  );
}

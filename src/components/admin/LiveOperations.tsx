"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Shield,
  Play,
  Pause,
  StopCircle,
  Users,
  Activity,
  Trophy,
  ArrowLeft,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Dialog } from "@/components/ui/Dialog";
import { ParticipantTable } from "@/components/admin/ParticipantTable";
import { ActivityFeed } from "@/components/admin/ActivityFeed";
import { StandingsTable } from "@/components/games/StandingsTable";

interface LiveOperationsProps {
  game: any;
  initialData: any;
}

export function LiveOperations({
  game: initialGame,
  initialData,
}: LiveOperationsProps) {
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "participants" | "activity" | "standings"
  >("participants");

  // Confirmation dialogs
  const [confirmAction, setConfirmAction] = useState<
    "PAUSE" | "RESUME" | "END" | null
  >(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const game = data?.game || initialGame;

  const refreshData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/games/${game.id}/operations`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (e) {
      console.warn("Operations poll failed:", e);
    } finally {
      setLoading(false);
    }
  }, [game.id]);

  useEffect(() => {
    const timer = setInterval(() => {
      refreshData();
    }, 8000);
    return () => clearInterval(timer);
  }, [refreshData]);

  const handleExecuteStatusChange = async () => {
    if (!confirmAction) return;
    setActionLoading(true);
    setErrorMsg("");

    const targetStatus =
      confirmAction === "PAUSE"
        ? "PAUSED"
        : confirmAction === "RESUME"
          ? "PUBLISHED"
          : "ENDED";

    try {
      const res = await fetch(`/api/admin/games/${game.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: targetStatus }),
      });

      const resData = await res.json();
      if (!res.ok) {
        setErrorMsg(resData.error || "Failed to update game status.");
      } else {
        setConfirmAction(null);
        await refreshData();
      }
    } catch (err) {
      setErrorMsg("Network error: " + (err as Error).message);
    } finally {
      setActionLoading(false);
    }
  };

  const isPaused = game.status === "PAUSED";
  const isEnded = game.status === "ENDED" || game.status === "ARCHIVED";

  return (
    <div className="space-y-6 font-mono">
      {/* Top Console Navigation & Header */}
      <div className="flex flex-col gap-4 rounded-2xl border border-zinc-800 bg-[#0e1016] p-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1.5">
          <div className="flex items-center gap-3">
            <Link
              href={`/admin/games/${game.id}`}
              className="flex size-7 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white transition"
            >
              <ArrowLeft className="size-3.5" />
            </Link>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <Shield className="size-5 text-cyan-400" />
              <span>{game.name} · Live Operations</span>
            </h1>
            <StatusBadge
              tone={isEnded ? "neutral" : isPaused ? "warning" : "success"}
            >
              {game.status}
            </StatusBadge>
          </div>
          <p className="text-xs text-zinc-400">
            Real-time competition supervision, participant audit telemetry, and
            emergency controls.
          </p>
        </div>

        {/* Action Controls with Guarded Confirmation */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => refreshData()}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-400 hover:text-white transition cursor-pointer"
          >
            <RefreshCw className={`size-3 ${loading ? "animate-spin" : ""}`} />
            <span>Sync</span>
          </button>

          {!isEnded && !isPaused && (
            <button
              type="button"
              onClick={() => setConfirmAction("PAUSE")}
              className="flex items-center gap-1.5 rounded-lg border border-amber-800/80 bg-amber-950/60 px-3.5 py-1.5 text-xs font-bold text-amber-300 hover:bg-amber-900/60 transition cursor-pointer"
            >
              <Pause className="size-3.5" />
              <span>Pause competition</span>
            </button>
          )}

          {!isEnded && isPaused && (
            <button
              type="button"
              onClick={() => setConfirmAction("RESUME")}
              className="flex items-center gap-1.5 rounded-lg border border-emerald-800/80 bg-emerald-950/60 px-3.5 py-1.5 text-xs font-bold text-emerald-300 hover:bg-emerald-900/60 transition cursor-pointer"
            >
              <Play className="size-3.5" />
              <span>Resume competition</span>
            </button>
          )}

          {!isEnded && (
            <button
              type="button"
              onClick={() => setConfirmAction("END")}
              className="flex items-center gap-1.5 rounded-lg border border-rose-800/80 bg-rose-950/60 px-3.5 py-1.5 text-xs font-bold text-rose-300 hover:bg-rose-900/60 transition cursor-pointer"
            >
              <StopCircle className="size-3.5" />
              <span>End competition</span>
            </button>
          )}
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-zinc-800 bg-[#0e1016] p-4 text-center">
          <span className="text-[10px] uppercase font-semibold text-zinc-500">
            Registered Contenders
          </span>
          <div className="text-3xl font-extrabold text-cyan-400 tabular-nums">
            {data?.metrics?.registeredCount ?? 0}
          </div>
          <span className="text-[10px] text-zinc-500">
            Individual registrations
          </span>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-[#0e1016] p-4 text-center">
          <span className="text-[10px] uppercase font-semibold text-zinc-500">
            Active Runs
          </span>
          <div className="text-3xl font-extrabold text-emerald-400 tabular-nums">
            {data?.metrics?.activeCount ?? 0}
          </div>
          <span className="text-[10px] text-zinc-500">
            In-progress missions right now
          </span>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-[#0e1016] p-4 text-center">
          <span className="text-[10px] uppercase font-semibold text-zinc-500">
            Completed Missions
          </span>
          <div className="text-3xl font-extrabold text-amber-400 tabular-nums">
            {data?.metrics?.completedCount ?? 0}
          </div>
          <span className="text-[10px] text-zinc-500">
            Verified successful completions
          </span>
        </div>
      </div>

      {/* View Tabs */}
      <div className="flex items-center gap-2 border-b border-zinc-800 pb-2 text-xs">
        <button
          type="button"
          onClick={() => setActiveTab("participants")}
          className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 font-bold transition cursor-pointer ${
            activeTab === "participants"
              ? "border border-zinc-700 bg-zinc-800 text-cyan-300"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          <Users className="size-3.5" />
          <span>Participants ({data?.participants?.length ?? 0})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("activity")}
          className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 font-bold transition cursor-pointer ${
            activeTab === "activity"
              ? "border border-zinc-700 bg-zinc-800 text-cyan-300"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          <Activity className="size-3.5" />
          <span>Live Activity ({data?.activity?.length ?? 0})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("standings")}
          className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 font-bold transition cursor-pointer ${
            activeTab === "standings"
              ? "border border-zinc-700 bg-zinc-800 text-cyan-300"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          <Trophy className="size-3.5 text-amber-400" />
          <span>Live Standings</span>
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === "participants" && (
        <ParticipantTable
          participants={data?.participants ?? []}
          standings={data?.standings ?? []}
        />
      )}

      {activeTab === "activity" && (
        <ActivityFeed activity={data?.activity ?? []} />
      )}

      {activeTab === "standings" && (
        <div className="rounded-xl border border-zinc-800 bg-[#0e1016] p-4">
          <StandingsTable
            rows={data?.standings ?? []}
            teamRows={data?.teamStandings}
          />
        </div>
      )}

      {/* Confirmation Dialog */}
      <Dialog
        open={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        title={
          confirmAction === "PAUSE"
            ? "Pause Live Competition?"
            : confirmAction === "RESUME"
              ? "Resume Live Competition?"
              : "Permanently End Competition?"
        }
      >
        <div className="space-y-4 font-mono text-xs text-zinc-300">
          {confirmAction === "PAUSE" && (
            <p>
              Pausing prevents active contestants from executing new terminal
              commands or starting runs. Timers will be held according to
              tournament scoring rules.
            </p>
          )}

          {confirmAction === "RESUME" && (
            <p>
              Resuming will immediately allow registered contenders to continue
              executing commands and solving challenges.
            </p>
          )}

          {confirmAction === "END" && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-rose-400 font-bold">
                <AlertTriangle className="size-4 shrink-0" />
                <span>This action cannot be undone.</span>
              </div>
              <p>
                Ending this game permanently freezes all runs, computes final
                individual standings, and locks all challenge sandboxes.
              </p>
            </div>
          )}

          {errorMsg && (
            <div className="rounded-lg border border-rose-800 bg-rose-950/60 p-2.5 text-rose-300">
              {errorMsg}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setConfirmAction(null)}
              className="rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 font-semibold text-zinc-300 hover:text-white cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={actionLoading}
              onClick={handleExecuteStatusChange}
              className={`rounded-lg px-4 py-2 font-bold cursor-pointer transition ${
                confirmAction === "END"
                  ? "bg-rose-600 text-white hover:bg-rose-500"
                  : confirmAction === "PAUSE"
                    ? "bg-amber-600 text-black hover:bg-amber-500"
                    : "bg-cyan-500 text-black hover:bg-cyan-400"
              }`}
            >
              {actionLoading ? "Processing..." : `Confirm ${confirmAction}`}
            </button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

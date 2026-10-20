"use client";

import { Fragment, useEffect, useState, useCallback, useRef } from "react";
import {
  LeaderboardDetailSwitch,
  LeaderboardMemberDetails,
} from "./LeaderboardDetails";
import { RefreshCw, Users, User } from "lucide-react";
import type { TeamStanding } from "@/lib/games/standings";

export interface Standing {
  rank: number;
  userId: string;
  userName: string;
  totalScore: number;
  challengesCompleted: number;
  aggregateDurationMs: number;
  isViewer?: boolean;
}

const EMPTY_TEAM_ROWS: TeamStanding[] = [];

export function StandingsTable({
  rows,
  teamRows = EMPTY_TEAM_ROWS,
  gameId,
  currentUserId,
  currentTeamId,
}: {
  rows: Standing[];
  teamRows?: TeamStanding[];
  gameId?: string;
  currentUserId?: string;
  currentTeamId?: string;
}) {
  const [dataRows, setDataRows] = useState<Standing[]>(rows);
  const [dataTeamRows, setDataTeamRows] = useState<TeamStanding[]>(teamRows);
  const [viewMode, setViewMode] = useState<"teams" | "individuals">(
    teamRows.length > 0 ? "teams" : "individuals",
  );
  const [detailed, setDetailed] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [secondsAgo, setSecondsAgo] = useState(0);
  const lastUpdatedRef = useRef<number>(0);
  const isIdleRef = useRef<boolean>(false);
  const idleTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setDataRows(rows);
    setDataTeamRows(teamRows);
    lastUpdatedRef.current = Date.now();
  }, [rows, teamRows]);

  const fetchLatest = useCallback(async () => {
    if (!gameId) return;
    if (
      typeof document !== "undefined" &&
      document.visibilityState !== "visible"
    )
      return;

    setIsRefreshing(true);
    try {
      const res = await fetch(
        `/api/games/${encodeURIComponent(gameId)}/standings`,
        {
          cache: "default", // Allows browser and Vercel Edge CDN caching
        },
      );
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json?.standings)) {
          setDataRows(json.standings);
        }
        if (Array.isArray(json?.teamStandings)) {
          setDataTeamRows(json.teamStandings);
        }
        lastUpdatedRef.current = Date.now();
        setSecondsAgo(0);
      }
    } catch {
      // Tolerate background network fluctuations
    } finally {
      setIsRefreshing(false);
    }
  }, [gameId]);

  // Smart Polling with Vercel Free-Tier Optimization:
  // 1. 10s interval (reduces request volume by 70% compared to 3s).
  // 2. Pauses completely when tab is hidden or backgrounded.
  // 3. Pauses when user has been idle for > 3 minutes (saves thousands of calls).
  // 4. Instantly refreshes on tab refocus or user activity resumption.
  useEffect(() => {
    if (!gameId) return;

    // Track "Updated X seconds ago" ticker
    const tickerInterval = setInterval(() => {
      setSecondsAgo(Math.floor((Date.now() - lastUpdatedRef.current) / 1000));
    }, 1000);

    const resetIdle = () => {
      if (isIdleRef.current) {
        isIdleRef.current = false;
        fetchLatest();
      }
      if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current);
      // Mark idle after 3 minutes of no user interaction
      idleTimeoutRef.current = setTimeout(() => {
        isIdleRef.current = true;
      }, 180000);
    };

    resetIdle();
    window.addEventListener("mousemove", resetIdle, { passive: true });
    window.addEventListener("keydown", resetIdle, { passive: true });
    window.addEventListener("touchstart", resetIdle, { passive: true });

    // 10-second polling interval
    const intervalId = setInterval(() => {
      if (!isIdleRef.current) {
        fetchLatest();
      }
    }, 10000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        resetIdle();
        fetchLatest();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(tickerInterval);
      clearInterval(intervalId);
      if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current);
      window.removeEventListener("mousemove", resetIdle);
      window.removeEventListener("keydown", resetIdle);
      window.removeEventListener("touchstart", resetIdle);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [gameId, fetchLatest]);

  return (
    <div className="overflow-x-auto rounded-2xl border border-zinc-800 bg-[#0e1016]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-800/80 bg-zinc-950/40 px-4 py-2.5 text-xs font-mono gap-2">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-emerald-400">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            <span className="text-[11px] font-semibold tracking-wider">
              LIVE STANDINGS
            </span>
            {gameId && (
              <span className="hidden sm:inline text-[10px] text-zinc-500">
                · Updated {secondsAgo}s ago
              </span>
            )}
          </div>

          {dataTeamRows.length > 0 && (
            <div className="flex items-center gap-1 rounded bg-zinc-900/90 p-0.5 border border-zinc-800">
              <button
                type="button"
                onClick={() => setViewMode("teams")}
                className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold transition ${
                  viewMode === "teams"
                    ? "bg-cyan-950 text-cyan-300 border border-cyan-800/80 shadow-sm"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <Users className="size-3" />
                <span>Teams ({dataTeamRows.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("individuals")}
                className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold transition ${
                  viewMode === "individuals"
                    ? "bg-cyan-950 text-cyan-300 border border-cyan-800/80 shadow-sm"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <User className="size-3" />
                <span>Individuals ({dataRows.length})</span>
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          {viewMode === "teams" && (
            <LeaderboardDetailSwitch
              detailed={detailed}
              onChange={setDetailed}
            />
          )}
          {gameId && (
            <button
              onClick={() => fetchLatest()}
              disabled={isRefreshing}
              className="inline-flex items-center gap-1.5 rounded border border-zinc-800 bg-zinc-900/60 px-2 py-1 text-[10px] text-zinc-400 transition hover:border-zinc-700 hover:text-white disabled:opacity-50"
              title="Refresh standings"
            >
              <RefreshCw
                className={`size-3 ${isRefreshing ? "animate-spin text-cyan-400" : ""}`}
              />
              <span>Refresh</span>
            </button>
          )}
        </div>
      </div>

      {viewMode === "teams" ? (
        <>
          <table className="w-full table-fixed text-left text-xs sm:text-sm">
            <thead className="text-xs uppercase tracking-wider text-zinc-500">
              <tr>
                <th className="p-2 sm:p-4 w-10 sm:w-16">Rank</th>
                <th>Team</th>
                <th className="w-20 sm:w-32">Score</th>

                <th className="w-20 sm:w-32">Time</th>
              </tr>
            </thead>
            <tbody>
              {dataTeamRows.map((r) => {
                const isViewer =
                  r.isViewer || (currentTeamId && r.teamId === currentTeamId);

                return (
                  <Fragment key={r.teamId}>
                    <tr
                      key={r.teamId}
                      className={`border-t border-zinc-800 transition-colors ${
                        isViewer
                          ? "bg-cyan-950/25 border-l-2 border-l-cyan-400"
                          : "hover:bg-zinc-900/30"
                      }`}
                    >
                      <td className="p-2 sm:p-4 font-mono text-cyan-300">
                        #{r.rank}
                      </td>
                      <td className="p-2 sm:p-4">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="font-medium break-words text-white">
                            {r.teamName}
                          </span>
                          {isViewer ? (
                            <span className="text-xs font-semibold text-cyan-300 bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-800/50">
                              You
                            </span>
                          ) : null}
                          <span className="basis-full text-[10px] text-zinc-500 font-sans">
                            ({r.memberCount}{" "}
                            {r.memberCount === 1 ? "member" : "members"})
                          </span>
                        </div>
                        {detailed && (
                          <LeaderboardMemberDetails members={r.members} />
                        )}
                      </td>
                      <td className="p-2 sm:p-4 font-mono font-bold text-cyan-300">
                        {r.totalScore % 1 === 0
                          ? r.totalScore.toLocaleString()
                          : r.totalScore.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}{" "}
                      </td>
                      <td className="p-2 sm:p-4 font-mono text-zinc-400">
                        {Math.floor(r.aggregateDurationMs / 60000)}m{" "}
                        {Math.floor(r.aggregateDurationMs / 1000) % 60}s
                      </td>
                    </tr>
                  </Fragment>
                );
              })}
            </tbody>
          </table>
          {dataTeamRows.length === 0 ? (
            <p className="p-10 text-center text-sm text-zinc-500">
              No verified team finishes yet.
            </p>
          ) : null}
        </>
      ) : (
        <>
          <table className="w-full min-w-[620px] text-left text-sm">
            <thead className="text-xs uppercase tracking-wider text-zinc-500">
              <tr>
                <th className="p-4 w-16">Rank</th>
                <th>Player</th>
                <th>Score</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {dataRows.map((r) => {
                const isViewer =
                  r.isViewer || (currentUserId && r.userId === currentUserId);

                return (
                  <tr
                    key={r.userId}
                    className={`border-t border-zinc-800 transition-colors ${
                      isViewer ? "bg-cyan-950/25" : "hover:bg-zinc-900/30"
                    }`}
                  >
                    <td className="p-4 font-mono text-cyan-300">#{r.rank}</td>
                    <td className="p-4 font-medium text-white">
                      {r.userName}
                      {isViewer ? (
                        <span className="ml-2 text-xs font-semibold text-cyan-300 bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-800/50">
                          You
                        </span>
                      ) : null}
                    </td>
                    <td className="p-4 font-mono font-bold text-cyan-300">
                      {r.totalScore % 1 === 0
                        ? r.totalScore.toLocaleString()
                        : r.totalScore.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}{" "}
                      <span className="text-[10px] font-normal text-zinc-500">
                        PTS
                      </span>
                    </td>
                    <td className="p-4 font-mono text-zinc-400">
                      {Math.floor(r.aggregateDurationMs / 60000)}m{" "}
                      {Math.floor(r.aggregateDurationMs / 1000) % 60}s
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {dataRows.length === 0 ? (
            <p className="p-10 text-center text-sm text-zinc-500">
              No verified finishes yet.
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}

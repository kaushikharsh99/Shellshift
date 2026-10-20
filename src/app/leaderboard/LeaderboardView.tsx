"use client";

import React, {
  useMemo,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { Trophy, Medal, User, Users, RefreshCw } from "lucide-react";
import {
  LeaderboardDetailSwitch,
  LeaderboardMemberDetails,
} from "@/components/games/LeaderboardDetails";
import { formatDuration } from "@/lib/format";
import type { TeamStanding } from "@/lib/games/standings";

export interface LeaderboardEntry {
  userId: string;
  userName: string;
  totalScore: number;
  challengesCompleted: number;
  aggregateDurationMs: number;
  lastCompletionMs?: number;
  rank?: number;
  isViewer?: boolean;
  // Backward compatibility aliases
  teamId?: string;
  teamName?: string;
}

export interface LeaderboardViewProps {
  entries: LeaderboardEntry[];
  teamEntries?: TeamStanding[];
  totalChallenges: number;
  currentUserId?: string | null;
  currentTeamId?: string | null;
  eventName?: string;
  gameId?: string;
  defaultView?: "teams" | "individuals";
}

export function LeaderboardView({
  entries,
  teamEntries = [],
  totalChallenges,
  currentUserId,
  currentTeamId,
  eventName,
  gameId,
  defaultView,
}: LeaderboardViewProps) {
  const [liveEntries, setLiveEntries] = useState<LeaderboardEntry[]>(entries);
  const [liveTeamEntries, setLiveTeamEntries] =
    useState<TeamStanding[]>(teamEntries);
  const [viewMode, setViewMode] = useState<"teams" | "individuals">(
    defaultView || (teamEntries.length > 0 ? "teams" : "individuals"),
  );
  const [detailed, setDetailed] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [secondsAgo, setSecondsAgo] = useState(0);
  const lastUpdatedRef = useRef<number>(0);
  const isIdleRef = useRef<boolean>(false);
  const idleTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setLiveEntries(entries);
    setLiveTeamEntries(teamEntries);
    lastUpdatedRef.current = Date.now();
  }, [entries, teamEntries]);

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
        `/api/leaderboard?gameId=${encodeURIComponent(gameId)}`,
        {
          cache: "default", // Vercel Edge CDN cache (s-maxage=5)
        },
      );
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json?.leaderboard)) {
          setLiveEntries(json.leaderboard);
        }
        if (Array.isArray(json?.teamLeaderboard)) {
          setLiveTeamEntries(json.teamLeaderboard);
        }
        lastUpdatedRef.current = Date.now();
        setSecondsAgo(0);
      }
    } catch {
      // Tolerate transient background network drops
    } finally {
      setIsRefreshing(false);
    }
  }, [gameId]);

  // Smart Polling with Vercel Free-Tier Optimization:
  // 1. 10s interval (reduces function invocations by 70% compared to 3s).
  // 2. Pauses completely when tab is hidden or backgrounded.
  // 3. Pauses when user has been idle for > 3 minutes.
  // 4. Instantly refreshes on tab refocus or user activity resumption.
  useEffect(() => {
    if (!gameId) return;

    const tickerInterval = setInterval(() => {
      setSecondsAgo(Math.floor((Date.now() - lastUpdatedRef.current) / 1000));
    }, 1000);

    const resetIdle = () => {
      if (isIdleRef.current) {
        isIdleRef.current = false;
        fetchLatest();
      }
      if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current);
      idleTimeoutRef.current = setTimeout(() => {
        isIdleRef.current = true;
      }, 180000);
    };

    resetIdle();
    window.addEventListener("mousemove", resetIdle, { passive: true });
    window.addEventListener("keydown", resetIdle, { passive: true });
    window.addEventListener("touchstart", resetIdle, { passive: true });

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

  // Sorted list: Pure points tournament (Score desc, Completed desc, Duration asc, LastCompletion asc)
  const sortedEntries = useMemo(() => {
    return [...liveEntries].sort((a, b) => {
      if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
      if (b.challengesCompleted !== a.challengesCompleted)
        return b.challengesCompleted - a.challengesCompleted;
      if (a.aggregateDurationMs !== b.aggregateDurationMs)
        return a.aggregateDurationMs - b.aggregateDurationMs;
      return (a.lastCompletionMs || 0) - (b.lastCompletionMs || 0);
    });
  }, [liveEntries]);

  const sortedTeamEntries = useMemo(() => {
    return [...liveTeamEntries].sort((a, b) => {
      if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
      if (b.challengesCompleted !== a.challengesCompleted)
        return b.challengesCompleted - a.challengesCompleted;
      if (a.aggregateDurationMs !== b.aggregateDurationMs)
        return a.aggregateDurationMs - b.aggregateDurationMs;
      return (a.lastCompletionMs || 0) - (b.lastCompletionMs || 0);
    });
  }, [liveTeamEntries]);

  return (
    <div className="space-y-4">
      {/* View Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-2 bg-[#121215] border border-[#27272a] rounded-lg">
        <div className="flex items-center gap-2 px-2 text-xs font-bold text-cyan-400">
          <Trophy className="w-4 h-4 text-amber-400 shrink-0" />
          <span>Points Leaderboard</span>
          {eventName && (
            <span className="text-zinc-500 font-normal truncate max-w-[200px] sm:max-w-none">
              · {eventName}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#a1a1aa] px-2 font-mono">
          {liveTeamEntries.length > 0 && (
            <div className="flex items-center gap-1 rounded bg-[#18181b] p-0.5 border border-[#27272a]">
              <button
                type="button"
                onClick={() => setViewMode("teams")}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-semibold transition ${
                  viewMode === "teams"
                    ? "bg-cyan-950 text-cyan-300 border border-cyan-800/80 shadow-sm"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Teams ({liveTeamEntries.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("individuals")}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-semibold transition ${
                  viewMode === "individuals"
                    ? "bg-cyan-950 text-cyan-300 border border-cyan-800/80 shadow-sm"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>Individuals ({liveEntries.length})</span>
              </button>
            </div>
          )}

          {gameId && (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 text-emerald-400">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                <span className="text-[10px] font-semibold tracking-wider">
                  LIVE
                </span>
                <span className="text-[10px] text-zinc-500 hidden sm:inline">
                  · {secondsAgo}s ago
                </span>
              </div>
              <button
                onClick={() => fetchLatest()}
                disabled={isRefreshing}
                className="inline-flex items-center gap-1 rounded border border-zinc-800 bg-zinc-900/60 px-1.5 py-0.5 text-[10px] text-zinc-400 transition hover:border-zinc-700 hover:text-white disabled:opacity-50"
                title="Refresh leaderboard"
              >
                <RefreshCw
                  className={`size-2.5 ${isRefreshing ? "animate-spin text-cyan-400" : ""}`}
                />
                <span>Refresh</span>
              </button>
            </div>
          )}
          {viewMode === "teams" && liveTeamEntries.length > 0 && (
            <LeaderboardDetailSwitch
              detailed={detailed}
              onChange={setDetailed}
            />
          )}
          <span className="hidden xl:inline">
            {viewMode === "teams" ? "Average score" : "Total points"} → Time
          </span>
        </div>
      </div>

      {viewMode === "teams" ? (
        sortedTeamEntries.length === 0 ? (
          <div className="bg-[#121215] border border-[#27272a] rounded-xl p-12 text-center space-y-3">
            <Trophy className="w-8 h-8 text-[#a1a1aa] mx-auto opacity-50" />
            <h3 className="text-sm font-bold text-white">
              No Verified Team Submissions Yet
            </h3>
            <p className="text-xs text-[#a1a1aa] max-w-md mx-auto">
              Participate in this event with your team to record verified team
              points on the leaderboard.
            </p>
          </div>
        ) : (
          <div className="bg-[#121215] border border-[#27272a] rounded-xl overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full table-fixed text-left text-xs">
                <thead className="bg-[#18181b] border-b border-[#27272a] text-[#a1a1aa] font-semibold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-2 sm:px-4 w-10 sm:w-20">Rank</th>
                    <th className="py-3 px-3 sm:px-4">Team</th>
                    <th className="py-3 px-2 sm:px-4 w-20 sm:w-32">
                      Score
                    </th>
                    <th className="py-3 px-2 sm:px-4 w-20 sm:w-32">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#27272a] font-mono">
                  {sortedTeamEntries.map((t, idx) => {
                    const isCurrent =
                      t.isViewer ||
                      (currentTeamId && t.teamId === currentTeamId);

                    return (
                      <React.Fragment key={t.teamId || idx}>
                        <tr
                          key={t.teamId || idx}
                          className={`transition-colors ${
                            isCurrent
                              ? "bg-cyan-950/20 border-l-2 border-cyan-400 hover:bg-cyan-950/30"
                              : "hover:bg-[#18181b]/50"
                          }`}
                        >
                          <td className="py-3.5 px-2 sm:px-4 font-bold tabular-nums">
                            {idx === 0 ? (
                              <span className="flex items-center gap-1.5 text-amber-400 font-black">
                                <Medal className="hidden sm:block w-4 h-4 text-amber-400 shrink-0" />{" "}
                                #1
                              </span>
                            ) : idx === 1 ? (
                              <span className="flex items-center gap-1.5 text-neutral-300 font-bold">
                                <Medal className="hidden sm:block w-4 h-4 text-neutral-300 shrink-0" />{" "}
                                #2
                              </span>
                            ) : idx === 2 ? (
                              <span className="flex items-center gap-1.5 text-amber-600 font-bold">
                                <Medal className="hidden sm:block w-4 h-4 text-amber-600 shrink-0" />{" "}
                                #3
                              </span>
                            ) : (
                              <span className="text-[#a1a1aa]">#{idx + 1}</span>
                            )}
                          </td>

                          <td className="py-3.5 px-2 sm:px-4 font-semibold text-white">
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                              <Users className="w-3.5 h-3.5 text-cyan-400 shrink-0 hidden sm:inline" />
                              <span className="break-words min-w-0 text-white font-bold font-sans">
                                {t.teamName}
                              </span>
                              {isCurrent && (
                                <span className="px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-400 border border-cyan-800 text-[10px] font-bold">
                                  YOU
                                </span>
                              )}
                              <span className="basis-full text-[10px] text-zinc-500 font-sans">
                                ({t.memberCount}{" "}
                                {t.memberCount === 1 ? "member" : "members"})
                              </span>
                            </div>
                            {detailed && (
                              <LeaderboardMemberDetails members={t.members} />
                            )}
                          </td>

                          <td className="py-3.5 px-2 sm:px-4 font-extrabold text-cyan-400 text-xs sm:text-sm whitespace-nowrap tabular-nums">
                            {t.totalScore % 1 === 0
                              ? t.totalScore.toLocaleString()
                              : t.totalScore.toLocaleString(undefined, {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}{" "}
                          </td>

                          <td className="py-3.5 px-2 sm:px-4 font-bold text-emerald-400 whitespace-nowrap tabular-nums">
                            {formatDuration(t.aggregateDurationMs)}
                          </td>
                        </tr>
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : sortedEntries.length === 0 ? (
        <div className="bg-[#121215] border border-[#27272a] rounded-xl p-12 text-center space-y-3">
          <Trophy className="w-8 h-8 text-[#a1a1aa] mx-auto opacity-50" />
          <h3 className="text-sm font-bold text-white">
            No Verified Submissions Yet
          </h3>
          <p className="text-xs text-[#a1a1aa] max-w-md mx-auto">
            Solve challenges in this event to record verified points on the
            official leaderboard.
          </p>
        </div>
      ) : (
        <div className="bg-[#121215] border border-[#27272a] rounded-xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#18181b] border-b border-[#27272a] text-[#a1a1aa] font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-3 sm:px-4 w-14 sm:w-16">Rank</th>
                  <th className="py-3 px-3 sm:px-4">Player</th>
                  <th className="py-3 px-3 sm:px-4">Score</th>
                  <th className="py-3 px-3 sm:px-4">Solved</th>
                  <th className="py-3 px-3 sm:px-4">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#27272a] font-mono">
                {sortedEntries.map((t, idx) => {
                  const id = t.userId || t.teamId;
                  const name = t.userName || t.teamName;
                  const isCurrent =
                    t.isViewer || (currentUserId && id === currentUserId);

                  return (
                    <tr
                      key={id || idx}
                      className={`transition-colors ${
                        isCurrent
                          ? "bg-cyan-950/20 border-l-2 border-cyan-400 hover:bg-cyan-950/30"
                          : "hover:bg-[#18181b]/50"
                      }`}
                    >
                      <td className="py-3.5 px-3 sm:px-4 font-bold tabular-nums">
                        {idx === 0 ? (
                          <span className="flex items-center gap-1.5 text-amber-400 font-black">
                            <Medal className="w-4 h-4 text-amber-400 shrink-0" />{" "}
                            #1
                          </span>
                        ) : idx === 1 ? (
                          <span className="flex items-center gap-1.5 text-neutral-300 font-bold">
                            <Medal className="w-4 h-4 text-neutral-300 shrink-0" />{" "}
                            #2
                          </span>
                        ) : idx === 2 ? (
                          <span className="flex items-center gap-1.5 text-amber-600 font-bold">
                            <Medal className="w-4 h-4 text-amber-600 shrink-0" />{" "}
                            #3
                          </span>
                        ) : (
                          <span className="text-[#a1a1aa]">#{idx + 1}</span>
                        )}
                      </td>

                      <td className="py-3.5 px-3 sm:px-4 font-semibold text-white">
                        <div className="flex items-center gap-2">
                          <User className="w-3.5 h-3.5 text-cyan-400 shrink-0 hidden sm:inline" />
                          <span className="truncate max-w-[140px] sm:max-w-none text-white font-bold font-sans">
                            {name}
                          </span>
                          {isCurrent && (
                            <span className="px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-400 border border-cyan-800 text-[10px] font-bold">
                              YOU
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-3 sm:px-4 font-extrabold text-cyan-400 text-sm tabular-nums">
                        {t.totalScore % 1 === 0
                          ? t.totalScore.toLocaleString()
                          : t.totalScore.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}{" "}
                        PTS
                      </td>

                      <td className="py-3.5 px-3 sm:px-4 text-[#fafafa] tabular-nums">
                        {t.challengesCompleted}{" "}
                        {totalChallenges > 0 ? `/ ${totalChallenges}` : ""}
                      </td>

                      <td className="py-3.5 px-3 sm:px-4 font-bold text-emerald-400 tabular-nums">
                        {formatDuration(t.aggregateDurationMs)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

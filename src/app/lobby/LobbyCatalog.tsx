"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import {
  Search,
  CheckCircle2,
  Clock,
  Trophy,
  ArrowRight,
  Play,
  Layers,
  ChevronDown,
  ChevronUp,
  Target,
} from "lucide-react";
import { StartRunButton } from "./StartButton";

export interface LobbyChallengeItem {
  id: string;
  slug: string;
  title: string;
  description: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  order: number;
  timeLimitSeconds: number;
  estimatedDuration?: string;
  scoringConfig: {
    maxBaseScore: number;
    difficultyMultiplier: number;
  };
  clueCount: number;
  objectiveDescription: string;
  runStatus?: "COMPLETED" | "IN_PROGRESS" | null;
  runId?: string | null;
  runDurationMs?: number | null;
  finalScore?: number | null;
}

interface LobbyCatalogProps {
  challenges: LobbyChallengeItem[];
  gameId: string;
}

export function LobbyCatalog({ challenges, gameId }: LobbyCatalogProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState<"ALL" | "EASY" | "MEDIUM" | "HARD">("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "UNSOLVED" | "COMPLETED">("ALL");
  const [openCardIds, setOpenCardIds] = useState<Record<string, boolean>>({});

  const toggleCard = (id: string) => {
    setOpenCardIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredChallenges = useMemo(() => {
    return challenges.filter((c) => {
      const matchesSearch =
        c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.objectiveDescription.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesDiff = difficultyFilter === "ALL" || c.difficulty === difficultyFilter;

      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "COMPLETED" && c.runStatus === "COMPLETED") ||
        (statusFilter === "UNSOLVED" && c.runStatus !== "COMPLETED");

      return matchesSearch && matchesDiff && matchesStatus;
    });
  }, [challenges, searchQuery, difficultyFilter, statusFilter]);

  const easyChallenges = useMemo(
    () => filteredChallenges.filter((c) => c.difficulty === "EASY"),
    [filteredChallenges]
  );
  const mediumChallenges = useMemo(
    () => filteredChallenges.filter((c) => c.difficulty === "MEDIUM"),
    [filteredChallenges]
  );
  const hardChallenges = useMemo(
    () => filteredChallenges.filter((c) => c.difficulty === "HARD"),
    [filteredChallenges]
  );

  const formatDuration = (durationMs?: number | null) => {
    if (!durationMs && durationMs !== 0) return "--:--";
    const totalSeconds = Math.floor(durationMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  const renderChallengeCard = (challenge: LobbyChallengeItem) => {
    const isCompleted = challenge.runStatus === "COMPLETED";
    const isInProgress = challenge.runStatus === "IN_PROGRESS";
    const isOpen = !!openCardIds[challenge.id];
    const maxScore = Math.floor(
      (challenge.scoringConfig?.maxBaseScore || 1000) *
        (challenge.scoringConfig?.difficultyMultiplier || 1.0)
    );

    return (
      <div
        key={challenge.id}
        className={`flex flex-col justify-between p-4 sm:p-5 rounded-lg border transition-colors ${
          isCompleted
            ? "border-emerald-600/40 bg-[#121215]"
            : isInProgress
            ? "border-cyan-500/60 bg-[#121215]"
            : "border-[#27272a] bg-[#121215] hover:border-[#3f3f46]"
        }`}
      >
        <div className="space-y-3">
          {/* Header Row: Level Index + Difficulty & Status */}
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-[#18181b] border border-[#27272a] text-cyan-400">
              #{String(challenge.order).padStart(2, "0")}
            </span>
            <div className="flex items-center gap-1.5">
              {isCompleted && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-800 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Solved
                </span>
              )}
              {isInProgress && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-cyan-950/60 text-cyan-400 border border-cyan-800 animate-pulse">
                  Active
                </span>
              )}
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                  challenge.difficulty === "EASY"
                    ? "badge-easy"
                    : challenge.difficulty === "MEDIUM"
                    ? "badge-medium"
                    : "badge-hard"
                }`}
              >
                {challenge.difficulty}
              </span>
            </div>
          </div>

          {/* Title */}
          <div>
            <h3
              onClick={() => toggleCard(challenge.id)}
              className="font-bold text-white text-base leading-snug cursor-pointer hover:text-cyan-400 transition-colors"
            >
              {challenge.title}
            </h3>
          </div>

          {/* Metrics: Time Limit & Max Score */}
          <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-[#a1a1aa]">
            <div className="p-2 rounded bg-[#18181b] border border-[#27272a] flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#a1a1aa] shrink-0" />
              <span>Limit: {Math.floor(challenge.timeLimitSeconds / 60)}m</span>
            </div>
            <div className="p-2 rounded bg-[#18181b] border border-[#27272a] flex items-center gap-1.5">
              <Trophy className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>Max: {maxScore} pts</span>
            </div>
          </div>

          <div className="text-[11px] text-[#a1a1aa] flex items-center justify-between font-mono pt-0.5">
            <span className="flex items-center gap-1.5">
              <span>{challenge.clueCount} clues</span>
              <span>·</span>
              <span>Est: {challenge.estimatedDuration || "15 min"}</span>
            </span>
            <button
              type="button"
              onClick={() => toggleCard(challenge.id)}
              className="text-cyan-400 hover:text-cyan-300 text-xs font-sans font-medium flex items-center gap-1 transition-colors"
            >
              <span>{isOpen ? "Hide Brief" : "Briefing"}</span>
              {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Briefing Accordion */}
          {isOpen && (
            <div className="pt-2 border-t border-[#27272a] space-y-2">
              <div className="p-3 rounded-md bg-[#18181b] border border-cyan-500/30 space-y-1.5">
                <div className="flex items-center gap-1.5 text-cyan-400 text-xs font-bold uppercase tracking-wider">
                  <Target className="w-3.5 h-3.5 shrink-0" />
                  Mission Directive
                </div>
                <p className="text-xs text-[#fafafa] font-sans leading-relaxed">
                  {challenge.objectiveDescription || "Decode clues to find command transpositions and satisfy objectives."}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Action Button Section */}
        <div className="pt-3 border-t border-[#27272a] mt-3">
          {isCompleted ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-emerald-400 font-bold font-mono">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {formatDuration(challenge.runDurationMs)}
                </span>
                <span className="text-cyan-400 font-bold tabular-nums">
                  {typeof challenge.finalScore === "number"
                    ? (challenge.finalScore % 1 === 0 ? challenge.finalScore : challenge.finalScore.toFixed(2))
                    : challenge.finalScore}{" "}
                  PTS
                </span>
              </div>
              <Link
                href={`/results/${challenge.runId}`}
                className="w-full py-2 rounded-lg btn-secondary text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
              >
                View Result
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          ) : isInProgress ? (
            <Link
              href={`/play/${challenge.runId}`}
              className="w-full py-2.5 rounded-lg btn-primary text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              Resume Mission
            </Link>
          ) : (
            <StartRunButton challengeId={challenge.id} gameId={gameId} />
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Search and Filter Toolbar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shell-panel p-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#a1a1aa] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search missions by name or objective..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg bg-[#18181b] border border-[#27272a] text-xs text-white placeholder-[#a1a1aa] focus:outline-none focus:border-cyan-500 transition-colors"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <div className="flex items-center gap-1 bg-[#18181b] p-1 rounded-lg border border-[#27272a] text-xs">
            {(["ALL", "UNSOLVED", "COMPLETED"] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1.5 rounded-md text-[11px] font-bold transition-colors ${
                  statusFilter === st
                    ? "bg-[#121215] text-cyan-400 border border-[#27272a]"
                    : "text-[#a1a1aa] hover:text-white"
                }`}
              >
                {st === "ALL" ? "All" : st === "UNSOLVED" ? "Unsolved" : "Solved"}
              </button>
            ))}
          </div>

          {/* Difficulty Filter */}
          <div className="flex items-center gap-1 bg-[#18181b] p-1 rounded-lg border border-[#27272a] text-xs">
            {(["ALL", "EASY", "MEDIUM", "HARD"] as const).map((diff) => (
              <button
                key={diff}
                type="button"
                onClick={() => setDifficultyFilter(diff)}
                className={`px-2.5 py-1.5 rounded-md text-[11px] font-bold transition-colors ${
                  difficultyFilter === diff
                    ? "bg-[#121215] text-cyan-400 border border-[#27272a]"
                    : "text-[#a1a1aa] hover:text-white"
                }`}
              >
                {diff === "ALL" ? `All (${challenges.length})` : diff.charAt(0) + diff.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* No Results Fallback */}
      {filteredChallenges.length === 0 && (
        <div className="p-12 text-center shell-panel space-y-2">
          <Layers className="w-8 h-8 text-[#a1a1aa] mx-auto opacity-50" />
          <h4 className="text-sm font-bold text-white">No matching challenges found</h4>
          <p className="text-xs text-[#a1a1aa]">Try adjusting your search terms or filter selection.</p>
        </div>
      )}

      {/* SECTION 1: EASY (8 Challenges) */}
      {(difficultyFilter === "ALL" || difficultyFilter === "EASY") && easyChallenges.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between pb-1 border-b border-[#27272a]">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                Easy Missions <span className="text-[#a1a1aa]">({easyChallenges.length})</span>
              </h2>
            </div>
            <span className="text-[11px] text-[#a1a1aa] font-mono">1.0x Multiplier · 20m Limits</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {easyChallenges.map(renderChallengeCard)}
          </div>
        </section>
      )}

      {/* SECTION 2: MEDIUM (9 Challenges) */}
      {(difficultyFilter === "ALL" || difficultyFilter === "MEDIUM") && mediumChallenges.length > 0 && (
        <section className="space-y-3 pt-4">
          <div className="flex items-center justify-between pb-1 border-b border-[#27272a]">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-amber-400">
                Medium Missions <span className="text-[#a1a1aa]">({mediumChallenges.length})</span>
              </h2>
            </div>
            <span className="text-[11px] text-[#a1a1aa] font-mono">1.25x Multiplier · 25m Limits</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {mediumChallenges.map(renderChallengeCard)}
          </div>
        </section>
      )}

      {/* SECTION 3: HARD (3 Challenges) */}
      {(difficultyFilter === "ALL" || difficultyFilter === "HARD") && hardChallenges.length > 0 && (
        <section className="space-y-3 pt-4">
          <div className="flex items-center justify-between pb-1 border-b border-[#27272a]">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-rose-400">
                Hard Missions <span className="text-[#a1a1aa]">({hardChallenges.length})</span>
              </h2>
            </div>
            <span className="text-[11px] text-[#a1a1aa] font-mono">1.5x Multiplier · 30m Limits</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {hardChallenges.map(renderChallengeCard)}
          </div>
        </section>
      )}
    </div>
  );
}

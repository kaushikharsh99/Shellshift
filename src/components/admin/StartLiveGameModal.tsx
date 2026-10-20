"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCheck,
  Clock,
  Loader2,
  RotateCcw,
  Search,
  X,
  Zap,
} from "lucide-react";
import type { CatalogChallenge } from "./ChallengeLineupSelector";

interface StartLiveGameModalProps {
  challenges: CatalogChallenge[];
}

const DURATION_PRESETS = [15, 30, 45, 60, 90, 120];

export function StartLiveGameModal({ challenges }: StartLiveGameModalProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [openedAt, setOpenedAt] = useState(() => Date.now());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Configuration
  const [name, setName] = useState("");
  const [rosterCsv, setRosterCsv] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [customInput, setCustomInput] = useState("");

  // Lineup selection
  const [selectedIds, setSelectedIds] = useState<string[]>(() =>
    challenges.map((c) => c.id),
  );
  const [search, setSearch] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState("");

  // Sync ESC key to close
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open && !loading) {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, loading]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Catalog filtering
  const filteredChallenges = useMemo(() => {
    return challenges.filter((c) => {
      const matchesSearch =
        !search.trim() ||
        c.title.toLowerCase().includes(search.trim().toLowerCase());
      const matchesDifficulty =
        !difficultyFilter || c.difficulty === difficultyFilter;
      return matchesSearch && matchesDifficulty;
    });
  }, [challenges, search, difficultyFilter]);

  const toggleChallenge = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const addAll = () => {
    const unselected = filteredChallenges.filter(
      (c) => !selectedIds.includes(c.id),
    );
    if (unselected.length > 0) {
      setSelectedIds([...selectedIds, ...unselected.map((c) => c.id)]);
    } else {
      const allUnselected = challenges.filter(
        (c) => !selectedIds.includes(c.id),
      );
      setSelectedIds([...selectedIds, ...allUnselected.map((c) => c.id)]);
    }
  };

  const clearAll = () => {
    setSelectedIds([]);
  };

  const effectiveDuration = customInput
    ? Math.max(5, Math.min(1440, parseInt(customInput, 10) || durationMinutes))
    : durationMinutes;

  const calculatedEndTime = useMemo(() => {
    const end = new Date(openedAt + effectiveDuration * 60 * 1000);
    return end.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  }, [effectiveDuration, openedAt]);

  const handleLaunch = async () => {
    setError(null);
    if (selectedIds.length === 0) {
      setError("Please select at least one challenge for this live game.");
      return;
    }

    if (!rosterCsv) {
      setError("Upload the team roster CSV before launching.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/admin/games/instant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || undefined,
          rosterCsv,
          durationMinutes: effectiveDuration,
          challengeIds: selectedIds,
          timezone:
            typeof Intl !== "undefined"
              ? Intl.DateTimeFormat().resolvedOptions().timeZone
              : "UTC",
        }),
      });

      const data = await res.json();
      setLoading(false);

      if (!res.ok || !data.game?.id) {
        setError(data.error || "Failed to start live game.");
        return;
      }

      setOpen(false);
      router.push(`/admin/games/${data.game.id}/live`);
      router.refresh();
    } catch {
      setLoading(false);
      setError("Network error while starting live game.");
    }
  };

  return (
    <>
      {/* Minimal Theme-Matched Button */}
      <button
        type="button"
        onClick={() => {
          setError(null);
          setOpenedAt(Date.now());
          setOpen(true);
        }}
        className="flex items-center gap-2 rounded-xl border border-cyan-500/30 bg-cyan-950/20 px-3.5 py-2 text-sm font-medium text-cyan-300 transition hover:bg-cyan-900/30 hover:border-cyan-500/50 cursor-pointer"
      >
        <span className="relative flex size-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75"></span>
          <span className="relative inline-flex size-2 rounded-full bg-cyan-400"></span>
        </span>
        <Zap className="size-4 text-cyan-400" />
        <span>Start Live Game</span>
      </button>

      {/* Full-Size Spacious Window Overlay */}
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex flex-col bg-[#07080b]/90 backdrop-blur-md p-3 sm:p-5 lg:p-8"
        >
          <div className="mx-auto flex h-full w-full max-w-7xl flex-col rounded-2xl border border-zinc-800 bg-[#09090b] shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-zinc-800 bg-[#0e1016] px-6 py-4">
              <div className="flex items-center gap-3">
                <span className="grid size-9 place-items-center rounded-xl bg-cyan-400 text-black">
                  <Zap className="size-5" />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold text-white">
                      Start Live Game
                    </h2>
                    <span className="inline-flex items-center gap-1 rounded bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                      <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      LIVE INSTANT
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400">
                    Begins immediately upon launch with real-time scoring.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => !loading && setOpen(false)}
                className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white transition cursor-pointer"
                aria-label="Close"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Full-Size Content: 2 Columns */}
            <div className="grid flex-1 overflow-hidden lg:grid-cols-[360px_1fr]">
              {/* Left Column: Settings & Launch */}
              <div className="flex flex-col justify-between border-b border-zinc-800 lg:border-b-0 lg:border-r bg-[#0b0d12] p-6 overflow-y-auto">
                <div className="space-y-6">
                  <label className="grid gap-2 text-sm">
                    Team roster CSV
                    <input
                      aria-label="Team roster CSV"
                      type="file"
                      accept=".csv,text/csv"
                      className="rounded-lg border border-zinc-700 p-3"
                      onChange={async (e) => {
                        setRosterCsv("");
                        const file = e.target.files?.[0];
                        if (!file) return;
                        if (file.size > 1_000_000) {
                          setError("CSV must be smaller than 1 MB.");
                          return;
                        }
                        try {
                          setRosterCsv(await file.text());
                          setError(null);
                        } catch {
                          setError("Unable to read CSV.");
                        }
                      }}
                    />
                    <a
                      href="/templates/team-roster.csv"
                      download
                      className="text-cyan-300 underline"
                    >
                      Download example template
                    </a>
                  </label>
                  {/* Name Input */}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
                      Competition Name
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={`Live Sprint - ${effectiveDuration}m`}
                      className="w-full rounded-xl border border-zinc-700 bg-black/40 px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-cyan-500 focus:outline-none"
                    />
                  </div>

                  {/* Duration Presets */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                        <Clock className="size-3.5 text-cyan-400" />
                        <span>Duration</span>
                      </label>
                      <span className="font-mono text-xs text-cyan-300">
                        {effectiveDuration} minutes
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      {DURATION_PRESETS.map((mins) => {
                        const isSelected =
                          !customInput && durationMinutes === mins;
                        return (
                          <button
                            key={mins}
                            type="button"
                            onClick={() => {
                              setCustomInput("");
                              setDurationMinutes(mins);
                            }}
                            className={`rounded-xl border py-2.5 text-center text-xs font-medium transition cursor-pointer ${
                              isSelected
                                ? "border-cyan-500 bg-cyan-500/15 text-cyan-300 font-semibold"
                                : "border-zinc-800 bg-black/30 text-zinc-400 hover:border-zinc-700 hover:text-white"
                            }`}
                          >
                            {mins} min
                          </button>
                        );
                      })}
                    </div>

                    {/* Custom Input */}
                    <div className="mt-3 flex items-center gap-2">
                      <input
                        type="number"
                        min="5"
                        max="1440"
                        placeholder="Custom min"
                        value={customInput}
                        onChange={(e) => setCustomInput(e.target.value)}
                        className="w-full rounded-xl border border-zinc-800 bg-black/40 px-3 py-2 text-xs text-white placeholder-zinc-500 focus:border-cyan-500 focus:outline-none"
                      />
                      {customInput && (
                        <button
                          type="button"
                          onClick={() => setCustomInput("")}
                          className="text-xs text-zinc-500 hover:text-zinc-300"
                        >
                          Reset
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Live Schedule Card */}
                  <div className="rounded-xl border border-zinc-800 bg-[#0e1016] p-4 text-xs space-y-2">
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Status:</span>
                      <span className="font-semibold text-emerald-400">
                        Starts Immediately
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Finish:</span>
                      <span className="font-mono text-zinc-300">
                        ~{calculatedEndTime}
                      </span>
                    </div>
                    <div className="flex justify-between border-t border-zinc-800/80 pt-2">
                      <span className="text-zinc-500">Selected Lineup:</span>
                      <span className="font-semibold text-cyan-300 font-mono">
                        {selectedIds.length} challenge
                        {selectedIds.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>

                  {error && (
                    <div className="rounded-xl border border-rose-800/60 bg-rose-950/40 p-3 text-xs text-rose-300">
                      {error}
                    </div>
                  )}
                </div>

                {/* Launch Button */}
                <div className="pt-6">
                  <button
                    type="button"
                    disabled={loading || selectedIds.length === 0}
                    onClick={handleLaunch}
                    className="btn-primary w-full text-sm font-semibold flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Zap className="size-4 fill-black" />
                    )}
                    <span>Launch Live Game ({effectiveDuration}m)</span>
                  </button>
                </div>
              </div>

              {/* Right Column: Spacious Challenge Lineup Canvas */}
              <div className="flex flex-col flex-1 overflow-hidden bg-[#07080b]">
                {/* Lineup Toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 px-6 py-4 bg-[#0e1016]">
                  <div className="flex items-center gap-3 flex-1 min-w-[240px] max-w-md">
                    <div className="relative w-full">
                      <Search className="absolute left-3 top-2.5 size-4 text-zinc-500" />
                      <input
                        type="search"
                        placeholder="Search challenges..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full rounded-xl border border-zinc-700 bg-black/40 py-2 pl-9 pr-3 text-xs text-white placeholder-zinc-500 focus:border-cyan-500 focus:outline-none"
                      />
                    </div>

                    <select
                      value={difficultyFilter}
                      onChange={(e) => setDifficultyFilter(e.target.value)}
                      className="rounded-xl border border-zinc-700 bg-black/40 px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
                    >
                      <option value="">All tiers</option>
                      <option value="EASY">Easy</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HARD">Hard</option>
                    </select>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={addAll}
                      disabled={selectedIds.length === challenges.length}
                      className="flex items-center gap-1.5 rounded-lg border border-cyan-500/30 bg-cyan-950/30 px-3 py-1.5 text-xs font-semibold text-cyan-300 hover:bg-cyan-900/50 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                    >
                      <CheckCheck className="size-3.5" />
                      <span>Add all</span>
                    </button>

                    {selectedIds.length > 0 && (
                      <button
                        type="button"
                        onClick={clearAll}
                        className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-400 hover:bg-zinc-800 hover:text-white transition cursor-pointer"
                      >
                        <RotateCcw className="size-3.5" />
                        <span>Clear</span>
                      </button>
                    )}

                    <span className="font-mono text-xs text-zinc-500 ml-2">
                      {selectedIds.length}/{challenges.length} active
                    </span>
                  </div>
                </div>

                {/* Spacious Tiles Grid */}
                <div className="flex-1 overflow-y-auto p-6">
                  {filteredChallenges.length === 0 ? (
                    <div className="grid place-items-center h-48 text-zinc-500 text-sm">
                      No challenges found matching your search.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                      {filteredChallenges.map((c) => {
                        const isSelected = selectedIds.includes(c.id);
                        const orderIndex = selectedIds.indexOf(c.id);
                        const timeMin = Math.round(
                          (c.timeLimitSeconds || 1200) / 60,
                        );

                        return (
                          <div
                            key={c.id}
                            onClick={() => toggleChallenge(c.id)}
                            className={`flex items-start gap-3.5 rounded-xl border p-4 cursor-pointer transition select-none ${
                              isSelected
                                ? "border-cyan-500/50 bg-cyan-950/20 shadow-sm shadow-cyan-950/50"
                                : "border-zinc-800 bg-[#0e1016] hover:border-zinc-700"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}} // Controlled by tile click
                              className="size-4 mt-0.5 rounded border-zinc-700 bg-black text-cyan-500 focus:ring-0 cursor-pointer shrink-0"
                            />

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <h3 className="text-sm font-semibold text-white truncate">
                                  {c.title}
                                </h3>
                                {isSelected && (
                                  <span className="font-mono text-[10px] text-cyan-300 rounded bg-cyan-900/50 px-1.5 py-0.5 shrink-0">
                                    #{orderIndex + 1}
                                  </span>
                                )}
                              </div>

                              <div className="mt-2 flex items-center gap-2 text-xs">
                                <span
                                  className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold ${
                                    c.difficulty === "HARD"
                                      ? "bg-rose-950/60 text-rose-300 border border-rose-800/60"
                                      : c.difficulty === "MEDIUM"
                                        ? "bg-amber-950/60 text-amber-300 border border-amber-800/60"
                                        : "bg-emerald-950/60 text-emerald-300 border border-emerald-800/60"
                                  }`}
                                >
                                  {c.difficulty}
                                </span>
                                <span className="text-zinc-500">
                                  {timeMin} min limit
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

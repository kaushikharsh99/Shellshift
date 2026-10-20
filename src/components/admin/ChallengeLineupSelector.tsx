"use client";

import { useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  CheckCheck,
  RotateCcw,
  Search,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";

export interface CatalogChallenge {
  id: string;
  title: string;
  difficulty: string;
  timeLimitSeconds?: number;
}

export function ChallengeLineupSelector({
  catalog,
  selectedIds,
  onChange,
}: {
  catalog: CatalogChallenge[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}) {
  const [search, setSearch] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState("");

  const catalogMap = useMemo(() => {
    return new Map(catalog.map((c) => [c.id, c]));
  }, [catalog]);

  const filteredCatalog = useMemo(() => {
    return catalog.filter((c) => {
      const matchesSearch =
        !search.trim() ||
        c.title.toLowerCase().includes(search.trim().toLowerCase());
      const matchesDifficulty =
        !difficultyFilter || c.difficulty === difficultyFilter;
      return matchesSearch && matchesDifficulty;
    });
  }, [catalog, search, difficultyFilter]);

  const selectedChallenges = useMemo(() => {
    return selectedIds
      .map((id) => catalogMap.get(id))
      .filter((c): c is CatalogChallenge => Boolean(c));
  }, [selectedIds, catalogMap]);

  const unselectedFiltered = useMemo(() => {
    return filteredCatalog.filter((c) => !selectedIds.includes(c.id));
  }, [filteredCatalog, selectedIds]);

  const unselectedTotal = useMemo(() => {
    return catalog.filter((c) => !selectedIds.includes(c.id));
  }, [catalog, selectedIds]);

  const toggleChallenge = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((item) => item !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const addAll = () => {
    const toAdd =
      unselectedFiltered.length > 0 ? unselectedFiltered : unselectedTotal;
    if (toAdd.length === 0) return;
    const newIds = [...selectedIds, ...toAdd.map((c) => c.id)];
    onChange(newIds);
  };

  const clearAll = () => {
    onChange([]);
  };

  const moveUp = (index: number) => {
    if (index <= 0) return;
    const next = [...selectedIds];
    const temp = next[index - 1];
    next[index - 1] = next[index];
    next[index] = temp;
    onChange(next);
  };

  const moveDown = (index: number) => {
    if (index >= selectedIds.length - 1) return;
    const next = [...selectedIds];
    const temp = next[index + 1];
    next[index + 1] = next[index];
    next[index] = temp;
    onChange(next);
  };

  const remove = (id: string) => {
    onChange(selectedIds.filter((item) => item !== id));
  };

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Choose the challenge lineup</h2>
          <p className="mt-1 text-sm text-zinc-400">
            Choose the question pool. Each member gets 15 questions in a stable
            shuffled order; teams of 1–3 have no overlap.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={addAll}
            disabled={unselectedTotal.length === 0}
            className="flex items-center gap-1.5 rounded-xl border border-cyan-500/40 bg-cyan-950/40 px-3.5 py-2 text-xs font-semibold text-cyan-300 transition hover:bg-cyan-900/50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <CheckCheck className="size-4" />
            <span>Add all</span>
          </button>
          <div className="rounded-xl border border-zinc-800 bg-black/40 px-3 py-2 text-sm font-medium text-cyan-400">
            <span>{selectedIds.length} challenges selected</span>
          </div>
        </div>
      </div>

      {selectedIds.length > 0 ? (
        <section className="rounded-2xl border border-cyan-900/40 bg-cyan-950/10 p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-cyan-400">
              Selected Lineup Order ({selectedIds.length})
            </h3>
            <button
              type="button"
              onClick={clearAll}
              className="flex items-center gap-1 text-xs text-zinc-400 hover:text-rose-300 transition cursor-pointer"
            >
              <RotateCcw className="size-3" />
              <span>Clear selection</span>
            </button>
          </div>
          <ol className="mt-3 divide-y divide-zinc-800">
            {selectedChallenges.map((challenge, index) => (
              <li
                key={challenge.id}
                className="flex flex-wrap items-center justify-between gap-3 py-2.5"
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs text-cyan-400">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <span className="text-sm font-medium text-white">
                      {challenge.title}
                    </span>
                    <span className="ml-2 text-xs text-zinc-500">
                      {challenge.difficulty} ·{" "}
                      {Math.round((challenge.timeLimitSeconds || 1200) / 60)}{" "}
                      min
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    aria-label={`Move ${challenge.title} up`}
                    disabled={index === 0}
                    onClick={() => moveUp(index)}
                  >
                    <ArrowUp className="size-3.5" />
                    <span>Move up</span>
                  </Button>
                  <Button
                    variant="ghost"
                    aria-label={`Move ${challenge.title} down`}
                    disabled={index === selectedChallenges.length - 1}
                    onClick={() => moveDown(index)}
                  >
                    <ArrowDown className="size-3.5" />
                    <span>Move down</span>
                  </Button>
                  <Button
                    variant="ghost"
                    className="text-red-400 hover:text-red-300"
                    aria-label={`Remove ${challenge.title}`}
                    onClick={() => remove(challenge.id)}
                  >
                    <Trash2 className="size-3.5" />
                    <span>Remove</span>
                  </Button>
                </div>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="relative sm:col-span-2">
          <Search className="absolute left-3 top-3 size-4 text-zinc-500" />
          <input
            type="search"
            aria-label="Search challenges"
            placeholder="Search challenges by title"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-zinc-700 bg-black/30 py-2.5 pl-9 pr-3 text-sm text-white placeholder-zinc-500 focus:border-cyan-500 focus:outline-none"
          />
        </div>
        <select
          aria-label="Filter by difficulty"
          value={difficultyFilter}
          onChange={(e) => setDifficultyFilter(e.target.value)}
          className="rounded-xl border border-zinc-700 bg-black/30 px-3 py-2.5 text-sm text-white focus:border-cyan-500 focus:outline-none"
        >
          <option value="">All difficulties</option>
          <option value="EASY">EASY (Easy)</option>
          <option value="MEDIUM">MEDIUM (Medium)</option>
          <option value="HARD">HARD (Hard)</option>
        </select>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-400">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={addAll}
            disabled={unselectedTotal.length === 0}
            className="flex items-center gap-1.5 rounded-lg border border-cyan-500/40 bg-cyan-950/30 px-3 py-1.5 font-semibold text-cyan-300 hover:bg-cyan-900/50 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
          >
            <CheckCheck className="size-3.5" />
            <span>
              {unselectedTotal.length === 0
                ? "All challenges added"
                : `Add all ${unselectedFiltered.length > 0 ? `(${unselectedFiltered.length})` : ""}`}
            </span>
          </button>
          {selectedIds.length > 0 && (
            <button
              type="button"
              onClick={clearAll}
              className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white transition cursor-pointer"
            >
              <RotateCcw className="size-3.5" />
              <span>Clear all</span>
            </button>
          )}
        </div>
        <span className="text-zinc-500 font-mono">
          Showing {filteredCatalog.length} of {catalog.length} challenges
        </span>
      </div>

      <div className="grid gap-2">
        {filteredCatalog.map((challenge) => {
          const isSelected = selectedIds.includes(challenge.id);
          const orderIndex = selectedIds.indexOf(challenge.id);

          return (
            <label
              key={challenge.id}
              className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border p-4 transition ${
                isSelected
                  ? "border-cyan-700/60 bg-cyan-950/20"
                  : "border-zinc-800 bg-black/20 hover:border-zinc-700"
              }`}
            >
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => toggleChallenge(challenge.id)}
                className="size-4 rounded border-zinc-700 bg-black/40 text-cyan-500 focus:ring-cyan-500"
              />
              <div className="flex-1">
                <span className="text-sm font-medium text-white">
                  {challenge.title}
                </span>
                <span className="ml-2 text-xs text-zinc-500">
                  {challenge.difficulty} ·{" "}
                  {Math.round((challenge.timeLimitSeconds || 1200) / 60)} min
                </span>
              </div>
              {isSelected ? (
                <span className="rounded-lg bg-cyan-900/40 px-2 py-0.5 font-mono text-xs text-cyan-300">
                  #{orderIndex + 1}
                </span>
              ) : null}
            </label>
          );
        })}
        {filteredCatalog.length === 0 ? (
          <p className="py-6 text-center text-sm text-zinc-500">
            No challenges match your filter.
          </p>
        ) : null}
      </div>
    </div>
  );
}

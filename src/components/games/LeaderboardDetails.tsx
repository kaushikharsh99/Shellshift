"use client";

import type { TeamMemberScore } from "@/lib/games/standings";

export function LeaderboardDetailSwitch({
  detailed,
  onChange,
}: {
  detailed: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={detailed}
      onClick={() => onChange(!detailed)}
      title={detailed ? "Hide member details" : "Show member details"}
      className="shrink-0 rounded border border-zinc-800 bg-zinc-900/60 px-1.5 py-0.5 text-[9px] font-normal text-zinc-400 transition hover:border-zinc-700 hover:text-zinc-200 focus-visible:outline-2 focus-visible:outline-cyan-400"
    >
      {detailed ? "Hide details" : "Show details"}
    </button>
  );
}

export function LeaderboardMemberDetails({
  members,
}: {
  members: TeamMemberScore[];
}) {
  return (
    <div
      className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5"
      aria-label="Team member scores"
    >
      {members.map((member) => (
        <div
          key={member.userId}
          className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] font-normal"
        >
          <span className="break-words text-zinc-400">{member.userName}</span>
          <span className="shrink-0 font-mono text-zinc-300">
            {member.score.toLocaleString(undefined, {
              maximumFractionDigits: 2,
            })}{" "}
            pts
          </span>
        </div>
      ))}
    </div>
  );
}

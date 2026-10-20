"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Competition = {
  id: string;
  name: string;
  teams: { id: string; name: string; memberCount: number }[];
  joined: boolean;
};
export function TeamOnboarding({
  competitions,
  initialEventId,
}: {
  competitions: Competition[];
  initialEventId?: string;
}) {
  const router = useRouter();
  const [eventId, setEventId] = useState(
    initialEventId || competitions[0]?.id || "",
  );
  const [teamId, setTeamId] = useState("");
  const [search, setSearch] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const competition = competitions.find((c) => c.id === eventId);
  const fixedCompetition = !!initialEventId || competitions.length === 1;
  const visibleTeams =
    competition?.teams.filter((team) =>
      team.name.toLowerCase().includes(search.trim().toLowerCase()),
    ) || [];
  const selectedTeam = competition?.teams.find((team) => team.id === teamId);
  const inputClass =
    "mt-2 min-h-11 w-full rounded-xl border border-zinc-700 bg-[#07080b] px-3 text-white focus:outline-2 focus:outline-cyan-400";
  return (
    <div className="rounded-2xl border border-zinc-800 bg-[#0e1016] p-6 sm:p-8">
      {!competitions.length ? (
        <p className="text-zinc-300">
          No competitions are accepting team joins yet. Please check back after
          the organizer publishes a competition.
        </p>
      ) : (
        <form
          className="grid gap-6"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            try {
              const response = await fetch("/api/teams/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ eventId, teamId, email }),
              });
              const data = await response.json();
              if (!response.ok) {
                setError(data.error || "Unable to join team.");
                return;
              }
              router.replace(`/games/${eventId}/lobby`);
              router.refresh();
            } catch {
              setError("Could not connect. Please try again.");
            } finally {
              setBusy(false);
            }
          }}
        >
          {fixedCompetition ? (
            <div className="border-b border-zinc-800 pb-5">
              <p className="text-xs uppercase tracking-wider text-zinc-400">
                Competition
              </p>
              <p className="mt-2 font-medium text-white">{competition?.name}</p>
            </div>
          ) : (
            <label className="text-sm">
              Competition
              <select
                aria-label="Competition"
                className={inputClass}
                required
                value={eventId}
                onChange={(e) => {
                  setEventId(e.target.value);
                  setTeamId("");
                  setSearch("");
                  setEmail("");
                  setError("");
                }}
              >
                <option value="" disabled>
                  Select a competition
                </option>
                {competitions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          {competition?.joined ? (
            <div className="grid gap-4">
              <p className="text-emerald-300">
                You’ve already joined a team for this competition.
              </p>
              <Link className="btn-primary" href={`/games/${eventId}/lobby`}>
                Open challenges
              </Link>
              <Link className="text-cyan-300" href={`/games/${eventId}/team`}>
                View your team profile
              </Link>
            </div>
          ) : (
            <>
              <fieldset className="min-w-0">
                <legend className="mb-3 font-medium">Choose your team</legend>
                <label
                  className="block text-sm text-zinc-400"
                  htmlFor="team-search"
                >
                  Find your team
                </label>
                <input
                  id="team-search"
                  type="search"
                  autoComplete="off"
                  placeholder="Search by team name"
                  className={inputClass}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <div
                  className="mt-3 max-h-72 overflow-y-auto rounded-xl border border-zinc-700 p-2"
                  aria-label="Team list"
                >
                  {visibleTeams.map((team) => (
                    <label
                      key={team.id}
                      className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-lg border px-3 py-3 transition ${teamId === team.id ? "border-cyan-500 bg-cyan-950/40" : "border-transparent hover:bg-zinc-900"}`}
                    >
                      <input
                        type="radio"
                        name="team"
                        value={team.id}
                        checked={teamId === team.id}
                        disabled={busy}
                        onChange={() => {
                          setTeamId(team.id);
                          setError("");
                        }}
                        className="size-4 shrink-0 accent-cyan-400"
                      />
                      <span className="min-w-0 flex-1 break-words text-sm text-white">
                        {team.name}
                      </span>
                      <span className="shrink-0 text-xs text-zinc-400">
                        {team.memberCount}{" "}
                        {team.memberCount === 1 ? "member" : "members"}
                      </span>
                    </label>
                  ))}
                  {!visibleTeams.length && (
                    <p className="p-4 text-sm text-zinc-400">
                      No teams match your search.
                    </p>
                  )}
                </div>
                {selectedTeam && (
                  <p className="mt-3 text-sm text-cyan-300" role="status">
                    Selected: {selectedTeam.name}
                  </p>
                )}
              </fieldset>
              {teamId && (
                <label className="text-sm">
                  Your roster email
                  <input
                    required
                    aria-label="Your roster email"
                    type="email"
                    autoComplete="email"
                    className={inputClass}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    aria-describedby="email-help"
                  />
                  <span
                    id="email-help"
                    className="mt-2 block text-sm text-zinc-400"
                  >
                    Enter your own email from the organizer’s team roster.
                  </span>
                </label>
              )}
              {error && (
                <p
                  role="alert"
                  className="rounded-xl border border-rose-900 bg-rose-950/30 p-3 text-sm text-rose-300"
                >
                  {error}
                </p>
              )}
              <button
                className="btn-primary min-h-11"
                disabled={busy || !teamId || !email}
              >
                {busy ? "Joining…" : "Join team"}
              </button>
            </>
          )}
        </form>
      )}
    </div>
  );
}

"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { parseRosterCsv } from "@/lib/games/roster";
export function RosterUpload({
  gameId,
  teamCount,
  memberCount,
  editable,
}: {
  gameId: string;
  teamCount: number;
  memberCount: number;
  editable: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(false);
  return (
    <section className="my-8 rounded-2xl border border-zinc-800 bg-[#0e1016] p-6">
      <h2 className="text-lg font-semibold">Team roster</h2>
      <p className="mt-2 text-sm text-zinc-400">
        {teamCount} teams · {memberCount} listed members. Scores average the
        actual team size.
      </p>
      {editable && (
        <label className="mt-5 grid gap-3 text-sm">
          {busy ? "Uploading…" : "Upload or replace roster CSV"}
          <input
            disabled={busy}
            aria-label="Team roster CSV"
            type="file"
            accept=".csv,text/csv"
            className="rounded-lg border border-zinc-700 p-3"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              setError("");
              setSuccess(false);
              setBusy(true);
              try {
                if (file.size > 1_000_000) {
                  setError("CSV must be smaller than 1 MB.");
                  return;
                }
                const rosterCsv = await file.text();
                const parsed = parseRosterCsv(rosterCsv);
                if (parsed.errors.length) {
                  setError(parsed.errors.join(" "));
                  return;
                }
                const res = await fetch(`/api/admin/games/${gameId}/roster`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ rosterCsv }),
                });
                const data = await res.json();
                if (!res.ok) {
                  setError(data.error || "Upload failed.");
                  return;
                }
                setSuccess(true);
                router.refresh();
              } catch {
                setError("Could not upload the roster. Please try again.");
              } finally {
                setBusy(false);
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
      )}
      {!editable && (
        <p className="mt-3 text-sm text-zinc-500">
          The published roster is locked.
        </p>
      )}
      {error && (
        <p role="alert" className="mt-4 text-sm text-rose-300">
          {error}
        </p>
      )}
      {success && (
        <p role="status" className="mt-4 text-sm text-emerald-300">
          Roster uploaded.
        </p>
      )}
    </section>
  );
}

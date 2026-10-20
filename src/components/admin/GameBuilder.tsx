"use client";

import { parseRosterCsv } from "@/lib/games/roster";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Flame, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Notice";
import {
  ChallengeLineupSelector,
  type CatalogChallenge,
} from "./ChallengeLineupSelector";

function localDateTime(value: Date) {
  return new Date(value.getTime() - value.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 19);
}

const steps = ["Basics", "Schedule", "Challenges & scoring", "Review"];

export function GameBuilder({
  challenges,
}: {
  challenges: CatalogChallenge[];
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [rosterCsv, setRosterCsv] = useState("");
  const [rosterFileName, setRosterFileName] = useState("");
  const [form, setForm] = useState(() => {
    const now = Date.now();
    const inTwoDays = localDateTime(new Date(now + 2 * 864e5));
    const inThreeDays = localDateTime(new Date(now + 3 * 864e5));
    const ends = localDateTime(new Date(now + 3 * 864e5 + 2 * 36e5));
    const timezone =
      typeof Intl !== "undefined"
        ? Intl.DateTimeFormat().resolvedOptions().timeZone
        : "UTC";
    return {
      name: "",
      slug: "",
      description: "",
      timezone,
      registrationOpensAt: localDateTime(new Date(now)),
      registrationClosesAt: inTwoDays,
      startsAt: inThreeDays,
      endsAt: ends,
      challengeIds: [] as string[],
    };
  });

  const update = (key: string, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  const handleLivePreset = (minutes: number) => {
    setForm((current) => {
      const now = Date.now();
      return {
        ...current,
        registrationOpensAt: localDateTime(new Date(now - 2 * 60 * 1000)),
        registrationClosesAt: localDateTime(new Date(now - 15 * 1000)),
        startsAt: localDateTime(new Date(now)),
        endsAt: localDateTime(new Date(now + minutes * 60 * 1000)),
      };
    });
  };

  const submit = async () => {
    if (!rosterCsv) {
      setError("Upload the team roster CSV before saving.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload = {
        ...form,
        rosterCsv,
        registrationOpensAt: new Date(form.registrationOpensAt).toISOString(),
        registrationClosesAt: new Date(form.registrationClosesAt).toISOString(),
        startsAt: new Date(form.startsAt).toISOString(),
        endsAt: new Date(form.endsAt).toISOString(),
      };
      const response = await fetch("/api/admin/games", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      setSaving(false);
      if (!response.ok)
        return setError(
          data.error ||
            Object.values(data.fieldErrors || {})[0] ||
            "Unable to save game.",
        );
      router.push(`/admin/games/${data.game.id}`);
      router.refresh();
    } catch {
      setError("Unable to save. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl">
      <ol
        className="mb-8 grid grid-cols-4 gap-2"
        aria-label="Game setup progress"
      >
        {steps.map((label, index) => (
          <li
            key={label}
            className={`border-t-2 pt-3 text-xs ${
              index <= step
                ? "border-cyan-400 text-white"
                : "border-zinc-800 text-zinc-600"
            }`}
          >
            <span className="mr-2 font-mono">0{index + 1}</span>
            {label}
          </li>
        ))}
      </ol>
      <section className="rounded-2xl border border-zinc-800 bg-[#0e1016] p-5 sm:p-8">
        {error ? <Notice tone="danger">{error}</Notice> : null}
        {step === 0 ? (
          <div className="grid gap-5">
            <h2 className="text-xl font-semibold">Name the competition</h2>
            <label className="grid gap-2 text-sm">
              Team roster CSV
              <input
                aria-label="Team roster CSV"
                type="file"
                accept=".csv,text/csv"
                className="min-h-11 rounded-lg border border-zinc-700 p-3"
                onChange={async (e) => {
                  setRosterCsv("");
                  setRosterFileName("");
                  setError("");
                  const file = e.target.files?.[0];
                  if (!file) return;
                  if (file.size > 1_000_000) {
                    setError("CSV must be smaller than 1 MB.");
                    return;
                  }
                  try {
                    const contents = await file.text();
                    const parsed = parseRosterCsv(contents);
                    if (parsed.errors.length) {
                      setError(parsed.errors.join(" "));
                      return;
                    }
                    setRosterCsv(contents);
                    setRosterFileName(
                      `${file.name} · ${parsed.teams.length} teams · ${parsed.teams.reduce((n, t) => n + t.emails.length, 0)} members`,
                    );
                  } catch {
                    setError("Could not read the CSV. Please choose it again.");
                  }
                }}
              />
              <span className="text-zinc-400">
                One row per team, with 1–4 member emails. Blank slots are
                ignored.
              </span>
              <a
                href="/templates/team-roster.csv"
                download
                className="text-cyan-300 underline"
              >
                Download example CSV template
              </a>
            </label>
            <Field
              label="Game name"
              value={form.name}
              onChange={(e) => {
                update("name", e.target.value);
                update(
                  "slug",
                  e.target.value
                    .toLowerCase()
                    .trim()
                    .replace(/[^a-z0-9]+/g, "-")
                    .replace(/^-|-$/g, ""),
                );
              }}
            />
            <Field
              label="URL slug"
              value={form.slug}
              onChange={(e) => update("slug", e.target.value)}
            />
            <Field
              label="Description"
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
            />
          </div>
        ) : null}
        {step === 1 ? (
          <div className="grid gap-5 sm:grid-cols-2">
            <h2 className="col-span-full text-xl font-semibold">
              Set the event window
            </h2>

            {/* Quick Live Game Presets */}
            <div className="col-span-full rounded-xl border border-amber-500/20 bg-amber-950/15 p-4">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-400 mb-1.5">
                <Flame className="size-3.5 fill-amber-400" />
                <span>Instant Live Duration Presets</span>
              </div>
              <p className="text-xs text-zinc-400 mb-3">
                Click a preset to configure this competition to begin
                immediately:
              </p>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: "15m Blitz", mins: 15 },
                  { label: "30m Sprint", mins: 30 },
                  { label: "45m Fast", mins: 45 },
                  { label: "60m (1 Hour)", mins: 60 },
                  { label: "90m", mins: 90 },
                  { label: "2 Hours", mins: 120 },
                ].map((preset) => (
                  <button
                    key={preset.mins}
                    type="button"
                    onClick={() => handleLivePreset(preset.mins)}
                    className="rounded-lg border border-amber-500/30 bg-black/40 px-3 py-1.5 text-xs font-medium text-amber-300 hover:bg-amber-500/20 transition cursor-pointer"
                  >
                    ⚡ {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <Field
              label="Registration opens"
              type="datetime-local"
              step="1"
              value={form.registrationOpensAt}
              onChange={(e) => update("registrationOpensAt", e.target.value)}
            />
            <Field
              label="Registration closes"
              type="datetime-local"
              step="1"
              value={form.registrationClosesAt}
              onChange={(e) => update("registrationClosesAt", e.target.value)}
            />
            <Field
              label="Competition starts"
              type="datetime-local"
              step="1"
              value={form.startsAt}
              onChange={(e) => update("startsAt", e.target.value)}
            />
            <Field
              label="Competition ends"
              type="datetime-local"
              step="1"
              value={form.endsAt}
              onChange={(e) => update("endsAt", e.target.value)}
            />
            <Field
              label="Timezone"
              value={form.timezone}
              onChange={(e) => update("timezone", e.target.value)}
              hint="Use an IANA timezone, such as Asia/Kolkata."
            />
          </div>
        ) : null}
        {step === 2 ? (
          <ChallengeLineupSelector
            catalog={challenges}
            selectedIds={form.challengeIds}
            onChange={(ids) =>
              setForm((current) => ({ ...current, challengeIds: ids }))
            }
          />
        ) : null}
        {step === 3 ? (
          <div>
            <h2 className="text-xl font-semibold">Review the game</h2>
            <dl className="mt-6 divide-y divide-zinc-800 text-sm">
              <div className="flex justify-between py-3">
                <dt className="text-zinc-500">Name</dt>
                <dd>{form.name}</dd>
              </div>
              <div className="flex justify-between py-3">
                <dt className="text-zinc-500">Timezone</dt>
                <dd>{form.timezone}</dd>
              </div>
              <div className="flex justify-between py-3">
                <dt className="text-zinc-500">Challenges</dt>
                <dd>{form.challengeIds.length}</dd>
              </div>
            </dl>
            <p className="my-4 text-sm text-zinc-300">
              Team roster: {rosterFileName || "No CSV selected"}. Team scores
              average all listed members.
            </p>
            <Notice>
              Saving creates a private draft. You can review and publish it from
              the game page.
            </Notice>
          </div>
        ) : null}
        <div className="mt-8 flex justify-between border-t border-zinc-800 pt-5">
          <Button
            variant="ghost"
            disabled={step === 0}
            onClick={() => setStep((s) => s - 1)}
          >
            <ArrowLeft className="size-4" />
            Back
          </Button>
          {step < 3 ? (
            <Button onClick={() => setStep((s) => s + 1)}>
              Continue
              <ArrowRight className="size-4" />
            </Button>
          ) : (
            <Button onClick={submit} disabled={saving}>
              {saving ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Check className="size-4" />
              )}
              Save draft
            </Button>
          )}
        </div>
      </section>
    </div>
  );
}

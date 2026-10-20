"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Flame, Loader2 } from "lucide-react";

export function GameAction({
  gameId,
  phase,
  signedIn,
  registered,
  hasResults,
  hasStarted = false,
  teamJoined = true,
}: {
  gameId: string;
  phase: string;
  signedIn: boolean;
  registered: boolean;
  hasResults: boolean;
  hasStarted?: boolean;
  teamJoined?: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (phase === "ENDED") {
    return (
      <Link className="btn-primary" href={`/games/${gameId}/standings`}>
        {hasResults ? "View results" : "View Leaderboard"}
        <ArrowRight className="size-4" />
      </Link>
    );
  }

  if (!signedIn) {
    return (
      <a
        className="btn-primary"
        href={`/api/auth/login?redirect=/games/${gameId}`}
      >
        Sign in to compete
        <ArrowRight className="size-4" />
      </a>
    );
  }

  if (!teamJoined)
    return (
      <Link className="btn-primary" href={`/register?eventId=${gameId}`}>
        Select your team
        <ArrowRight className="size-4" />
      </Link>
    );

  if (phase === "PUBLISHED") {
    return (
      <span className="btn-secondary opacity-70">Registration opens soon</span>
    );
  }

  if (phase === "REGISTRATION_OPEN" && !registered) {
    const register = async () => {
      setLoading(true);
      setError("");
      try {
        const r = await fetch(`/api/games/${gameId}/register`, {
          method: "POST",
        });
        const d = await r.json();
        setLoading(false);
        if (!r.ok) return setError(d.error || "Could not register.");
        router.refresh();
      } catch {
        setLoading(false);
        setError("Network error while registering.");
      }
    };

    return (
      <div>
        <button className="btn-primary" onClick={register} disabled={loading}>
          {loading ? <Loader2 className="size-4 animate-spin" /> : null}
          Register now
        </button>
        {error ? <p className="mt-2 text-sm text-rose-300">{error}</p> : null}
      </div>
    );
  }

  if (registered && (phase === "REGISTRATION_OPEN" || phase === "SCHEDULED")) {
    return (
      <Link className="btn-primary" href={`/games/${gameId}/lobby`}>
        <Check className="size-4" />
        Enter waiting room
      </Link>
    );
  }

  if (registered && phase === "LIVE") {
    return (
      <div className="flex flex-col gap-2.5">
        <Link className="btn-primary" href={`/games/${gameId}/lobby`}>
          {hasStarted ? "Continue playing" : "Start competing"}
          <ArrowRight className="size-4" />
        </Link>
        {hasResults && (
          <Link
            className="btn-secondary text-center text-xs font-semibold py-2.5"
            href={`/games/${gameId}/standings`}
          >
            View results
          </Link>
        )}
      </div>
    );
  }

  if (phase === "LIVE" && !registered) {
    const register = async () => {
      setLoading(true);
      setError("");
      try {
        const r = await fetch(`/api/games/${gameId}/register`, {
          method: "POST",
        });
        const d = await r.json();
        setLoading(false);
        if (!r.ok) return setError(d.error || "Could not register.");
        router.refresh();
      } catch {
        setLoading(false);
        setError("Network error while registering.");
      }
    };

    return (
      <div>
        <button className="btn-primary" onClick={register} disabled={loading}>
          {loading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Flame className="size-4" />
          )}
          Join live competition
        </button>
        {error ? <p className="mt-2 text-sm text-rose-300">{error}</p> : null}
      </div>
    );
  }

  if (hasResults) {
    return (
      <Link className="btn-primary" href={`/games/${gameId}/standings`}>
        View results
        <ArrowRight className="size-4" />
      </Link>
    );
  }

  return <span className="btn-secondary opacity-70">Registration closed</span>;
}

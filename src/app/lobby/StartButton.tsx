"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Play } from "lucide-react";

export function StartRunButton({
  challengeId,
  gameId,
  label = "Start Mission",
  className,
}: {
  challengeId: string;
  gameId: string;
  label?: string;
  className?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/runs/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengeId, gameId }),
      });

      const data = await res.json();
      if (res.ok && data.run?.id) {
        router.push(`/play/${data.run.id}`);
      } else {
        alert(data.error || "Failed to start mission run.");
        setLoading(false);
      }
    } catch (err) {
      alert("Error starting mission: " + (err as Error).message);
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleStart}
      disabled={loading}
      type="button"
      className={
        className ||
        "w-full py-2.5 rounded-lg btn-primary disabled:opacity-50 text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
      }
    >
      <Play className="w-3.5 h-3.5 fill-current" />
      {loading ? "Launching Mission..." : label}
    </button>
  );
}

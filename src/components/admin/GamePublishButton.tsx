"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Send, AlertCircle, CheckCircle2 } from "lucide-react";

export function GamePublishButton({ gameId }: { gameId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handlePublish = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/games/${gameId}/publish`, {
        method: "POST",
      });
      const data = await res.json();
      setLoading(false);

      if (!res.ok) {
        const errorMsg =
          (data.fieldErrors && Object.values(data.fieldErrors).join(", ")) ||
          data.error ||
          "Failed to publish competition.";
        setError(errorMsg);
        return;
      }

      setSuccess(true);
      router.refresh();
    } catch {
      setLoading(false);
      setError("Network error while publishing. Please try again.");
    }
  };

  if (success) {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-emerald-950/40 border border-emerald-800/80 px-3 py-1.5 text-xs text-emerald-300">
        <CheckCircle2 className="size-4 text-emerald-400" />
        Competition published successfully!
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        onClick={handlePublish}
        disabled={loading}
        className="flex items-center gap-2 rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-black transition hover:bg-cyan-400 disabled:opacity-50"
      >
        {loading ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Send className="size-4" />
        )}
        Publish Competition
      </button>

      {error && (
        <div className="flex items-center gap-1.5 text-xs text-rose-400">
          <AlertCircle className="size-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}

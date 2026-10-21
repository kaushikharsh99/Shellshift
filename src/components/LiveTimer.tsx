"use client";

import React, { useEffect, useRef, useState } from "react";
import { Timer } from "lucide-react";

interface LiveTimerProps {
  deadlineAt?: string | Date | null;
  isExpired?: boolean;
  onTimeUp?: () => void;
}

/** One event clock, independent of the current challenge's start or completion. */
export function LiveTimer({ deadlineAt, isExpired = false, onTimeUp }: LiveTimerProps) {
  const [now, setNow] = useState(() => Date.now());
  const callbackRef = useRef(onTimeUp);
  const notifiedDeadline = useRef<number | null>(null);
  const deadlineMs = deadlineAt ? new Date(deadlineAt).getTime() : null;
  const hasDeadline = deadlineMs !== null && Number.isFinite(deadlineMs);
  const remaining = isExpired ? 0 : hasDeadline ? Math.max(0, Math.ceil((deadlineMs - now) / 1000)) : null;

  useEffect(() => { callbackRef.current = onTimeUp; }, [onTimeUp]);

  useEffect(() => {
    if (!hasDeadline || isExpired) return;
    const tick = () => {
      const timestamp = Date.now();
      setNow(timestamp);
      if (timestamp >= deadlineMs && notifiedDeadline.current !== deadlineMs) {
        notifiedDeadline.current = deadlineMs;
        callbackRef.current?.();
      }
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [deadlineMs, hasDeadline, isExpired]);

  return (
    <div className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 font-mono text-xs ${remaining !== null && remaining <= 120 ? "border-rose-500/40 text-rose-300" : "border-[#23293a] bg-[#121622] text-cyan-300"}`} role="timer" aria-label="Event time remaining">
      <Timer className="size-3.5 shrink-0" />
      <span className="hidden text-[10px] font-bold uppercase tracking-wider sm:inline">Event remaining</span>
      <span className="font-bold tabular-nums" suppressHydrationWarning>
        {remaining === null ? "—" : `${Math.floor(remaining / 60).toString().padStart(2, "0")}:${(remaining % 60).toString().padStart(2, "0")}`}
      </span>
    </div>
  );
}

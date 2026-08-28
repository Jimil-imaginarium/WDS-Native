"use client";

import { useEffect, useRef, useState } from "react";
import { splitDuration } from "@/lib/utils";

/**
 * Ticks once a second toward a target time and reports the remaining
 * duration. `onZero` fires exactly once when the countdown crosses zero,
 * so callers can auto-unlock without a refresh.
 */
export function useCountdown(
  targetIso: string | null | undefined,
  serverOffsetMs = 0,
  onZero?: () => void
) {
  const [now, setNow] = useState(() => Date.now() + serverOffsetMs);
  const firedRef = useRef(false);
  const onZeroRef = useRef(onZero);
  onZeroRef.current = onZero;

  useEffect(() => {
    firedRef.current = false;
  }, [targetIso]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now() + serverOffsetMs), 1000);
    return () => clearInterval(id);
  }, [serverOffsetMs]);

  const target = targetIso ? new Date(targetIso).getTime() : null;
  const remainingMs = target === null ? 0 : target - now;
  const isComplete = target !== null && remainingMs <= 0;

  useEffect(() => {
    if (isComplete && !firedRef.current && target !== null) {
      firedRef.current = true;
      onZeroRef.current?.();
    }
  }, [isComplete, target]);

  return {
    ...splitDuration(remainingMs),
    remainingMs: Math.max(0, remainingMs),
    isComplete,
  };
}

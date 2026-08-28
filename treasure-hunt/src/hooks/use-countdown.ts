"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export interface CountdownParts {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalMs: number;
  finished: boolean;
}

function compute(target: number): CountdownParts {
  const totalMs = Math.max(0, target - Date.now());
  const totalSeconds = Math.floor(totalMs / 1000);
  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
    totalMs,
    finished: totalMs <= 0,
  };
}

/**
 * A second-accurate realtime countdown to `targetIso`.
 * Fires `onFinish` exactly once when the timer crosses zero.
 */
export function useCountdown(targetIso: string | null, onFinish?: () => void) {
  const target = useMemo(
    () => (targetIso ? new Date(targetIso).getTime() : null),
    [targetIso],
  );
  const [parts, setParts] = useState<CountdownParts | null>(() =>
    target ? compute(target) : null,
  );
  const firedRef = useRef(false);
  const onFinishRef = useRef(onFinish);
  onFinishRef.current = onFinish;

  useEffect(() => {
    if (target === null) {
      setParts(null);
      return;
    }
    firedRef.current = Date.now() >= target;
    setParts(compute(target));

    const id = setInterval(() => {
      const next = compute(target);
      setParts(next);
      if (next.finished && !firedRef.current) {
        firedRef.current = true;
        onFinishRef.current?.();
      }
    }, 250);

    return () => clearInterval(id);
  }, [target]);

  return parts;
}

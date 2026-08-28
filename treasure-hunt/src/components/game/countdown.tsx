"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useCountdown } from "@/hooks/use-countdown";
import { useServerTimeOffset } from "@/hooks/use-server-time";
import { pad2 } from "@/lib/utils";

interface CountdownProps {
  targetIso: string | null | undefined;
  onComplete?: () => void;
  size?: "sm" | "lg";
  label?: string;
}

function Digit({ value, unit, size }: { value: string; unit: string; size: "sm" | "lg" }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={
          size === "lg"
            ? "relative flex h-20 w-16 items-center justify-center overflow-hidden rounded-lg border border-amber-300/20 bg-black/40 shadow-inner backdrop-blur-sm sm:h-24 sm:w-20"
            : "relative flex h-10 w-9 items-center justify-center overflow-hidden rounded-md border border-amber-300/20 bg-black/40 backdrop-blur-sm"
        }
      >
        <AnimatePresence mode="popLayout">
          <motion.span
            key={value}
            initial={{ y: "-100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className={
              size === "lg"
                ? "font-display text-4xl font-bold text-amber-200 sm:text-5xl"
                : "font-display text-lg font-bold text-amber-200"
            }
          >
            {value}
          </motion.span>
        </AnimatePresence>
      </div>
      <span
        className={
          size === "lg"
            ? "text-xs uppercase tracking-widest text-muted-foreground"
            : "text-[10px] uppercase tracking-wider text-muted-foreground"
        }
      >
        {unit}
      </span>
    </div>
  );
}

/** Live countdown with flipping digits. Fires onComplete at zero. */
export function Countdown({ targetIso, onComplete, size = "lg", label }: CountdownProps) {
  const offset = useServerTimeOffset();
  const { days, hours, minutes, seconds, isComplete } = useCountdown(
    targetIso,
    offset,
    onComplete
  );

  if (!targetIso || isComplete) return null;

  const sep = (
    <span
      className={
        size === "lg"
          ? "pb-6 font-display text-3xl text-amber-300/60"
          : "pb-4 font-display text-base text-amber-300/60"
      }
    >
      :
    </span>
  );

  return (
    <div className="flex flex-col items-center gap-3">
      {label && (
        <p className="text-sm uppercase tracking-[0.25em] text-muted-foreground">
          {label}
        </p>
      )}
      <div className="flex items-center gap-2 sm:gap-3">
        {days > 0 && (
          <>
            <Digit value={String(days)} unit={days === 1 ? "day" : "days"} size={size} />
            {sep}
          </>
        )}
        <Digit value={pad2(hours)} unit="hours" size={size} />
        {sep}
        <Digit value={pad2(minutes)} unit="minutes" size={size} />
        {sep}
        <Digit value={pad2(seconds)} unit="seconds" size={size} />
      </div>
    </div>
  );
}

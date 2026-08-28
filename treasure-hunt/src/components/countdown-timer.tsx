"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useCountdown } from "@/hooks/use-countdown";
import { cn } from "@/lib/utils";

function Unit({ value, label }: { value: number; label: string }) {
  const display = String(value).padStart(2, "0");
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="glass relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-3xl sm:h-28 sm:w-28">
        <AnimatePresence mode="popLayout">
          <motion.span
            key={display}
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -24, opacity: 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="font-serif text-4xl font-semibold tabular-nums text-foreground sm:text-6xl"
          >
            {display}
          </motion.span>
        </AnimatePresence>
      </div>
      <span className="text-[11px] font-medium uppercase tracking-[0.25em] text-muted-foreground">
        {label}
      </span>
    </div>
  );
}

interface CountdownTimerProps {
  targetIso: string;
  title?: string;
  onFinish?: () => void;
  className?: string;
  compact?: boolean;
}

/**
 * Large cinematic countdown. Automatically calls onFinish at zero —
 * no refresh required.
 */
export function CountdownTimer({
  targetIso,
  title = "Next Riddle Unlocks In",
  onFinish,
  className,
  compact = false,
}: CountdownTimerProps) {
  const parts = useCountdown(targetIso, onFinish);
  if (!parts) return null;

  if (compact) {
    return (
      <span className="font-mono text-sm tabular-nums text-muted-foreground">
        {parts.days > 0 && `${parts.days}d `}
        {String(parts.hours).padStart(2, "0")}:
        {String(parts.minutes).padStart(2, "0")}:
        {String(parts.seconds).padStart(2, "0")}
      </span>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      className={cn("flex flex-col items-center gap-6", className)}
    >
      <p className="font-serif text-xl italic text-muted-foreground sm:text-2xl">
        {title}
      </p>
      <div className="flex items-start gap-3 sm:gap-5">
        {parts.days > 0 && (
          <>
            <Unit value={parts.days} label="Days" />
            <span className="mt-6 font-serif text-4xl text-rose-300 sm:mt-9">:</span>
          </>
        )}
        <Unit value={parts.hours} label="Hours" />
        <span className="mt-6 font-serif text-4xl text-rose-300 sm:mt-9">:</span>
        <Unit value={parts.minutes} label="Minutes" />
        <span className="mt-6 font-serif text-4xl text-rose-300 sm:mt-9">:</span>
        <Unit value={parts.seconds} label="Seconds" />
      </div>
    </motion.div>
  );
}

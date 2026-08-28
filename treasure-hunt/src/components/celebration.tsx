"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import confetti from "canvas-confetti";
import { Heart, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FloatingHearts } from "@/components/floating-hearts";
import { randomQuote } from "@/lib/constants";

interface CelebrationProps {
  open: boolean;
  title?: string;
  quote?: string;
  onClose: () => void;
  ctaLabel?: string;
}

function fireConfetti() {
  const colors = ["#e28496", "#d25c75", "#dcc292", "#f5eede", "#ffffff"];
  const end = Date.now() + 1800;

  (function frame() {
    confetti({
      particleCount: 4,
      angle: 60,
      spread: 70,
      origin: { x: 0, y: 0.7 },
      colors,
      scalar: 0.9,
    });
    confetti({
      particleCount: 4,
      angle: 120,
      spread: 70,
      origin: { x: 1, y: 0.7 },
      colors,
      scalar: 0.9,
    });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();

  confetti({
    particleCount: 120,
    spread: 100,
    startVelocity: 38,
    origin: { y: 0.6 },
    colors,
    shapes: ["circle"],
    scalar: 1.1,
  });
}

/**
 * Full-screen celebration overlay: confetti burst, floating hearts,
 * a short romantic quote, soft glass card.
 */
export function Celebration({
  open,
  title = "Riddle Completed",
  quote,
  onClose,
  ctaLabel = "Continue our story",
}: CelebrationProps) {
  const [line, setLine] = useState(quote ?? "");

  const launch = useCallback(() => {
    setLine(quote ?? randomQuote());
    fireConfetti();
  }, [quote]);

  useEffect(() => {
    if (open) launch();
  }, [open, launch]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 p-6 backdrop-blur-md"
        >
          <FloatingHearts count={24} />
          <motion.div
            initial={{ scale: 0.85, y: 24, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 12, opacity: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 22 }}
            className="glass luxe-ring relative z-50 w-full max-w-md rounded-4xl p-10 text-center"
          >
            <motion.div
              animate={{ scale: [1, 1.15, 1] }}
              transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
              className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-rose-400 to-rose-600 shadow-luxe-lg"
            >
              <Heart className="h-9 w-9 fill-white text-white" />
            </motion.div>

            <div className="mb-2 flex items-center justify-center gap-2 text-gold-500">
              <Sparkles className="h-4 w-4" />
              <span className="text-xs font-semibold uppercase tracking-[0.3em]">
                Bravo, my love
              </span>
              <Sparkles className="h-4 w-4" />
            </div>

            <h2 className="font-serif text-4xl">{title}</h2>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.8 }}
              className="mx-auto mt-5 max-w-sm font-serif text-lg italic leading-relaxed text-muted-foreground"
            >
              “{line}”
            </motion.p>

            <Button onClick={onClose} size="lg" className="mt-8 w-full">
              {ctaLabel}
            </Button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

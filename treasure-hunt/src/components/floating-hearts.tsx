"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface HeartSpec {
  id: number;
  left: number;
  size: number;
  delay: number;
  duration: number;
  drift: number;
  char: string;
}

const CHARS = ["❤", "♥", "❥", "💗", "💖", "💕"];

/**
 * A gentle stream of hearts floating up the screen.
 * Rendered client-side only to keep SSR deterministic.
 */
export function FloatingHearts({
  count = 18,
  className = "",
}: {
  count?: number;
  className?: string;
}) {
  const [hearts, setHearts] = useState<HeartSpec[]>([]);

  useEffect(() => {
    setHearts(
      Array.from({ length: count }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        size: 14 + Math.random() * 26,
        delay: Math.random() * 4,
        duration: 6 + Math.random() * 6,
        drift: -40 + Math.random() * 80,
        char: CHARS[Math.floor(Math.random() * CHARS.length)],
      })),
    );
  }, [count]);

  return (
    <div
      aria-hidden
      className={`pointer-events-none fixed inset-0 z-40 overflow-hidden ${className}`}
    >
      {hearts.map((h) => (
        <motion.span
          key={h.id}
          initial={{ y: "110vh", x: 0, opacity: 0, rotate: -10 }}
          animate={{
            y: "-15vh",
            x: h.drift,
            opacity: [0, 0.9, 0.9, 0],
            rotate: 10,
          }}
          transition={{
            duration: h.duration,
            delay: h.delay,
            repeat: Infinity,
            ease: "linear",
          }}
          className="absolute select-none text-rose-400/80"
          style={{ left: `${h.left}%`, fontSize: h.size }}
        >
          {h.char}
        </motion.span>
      ))}
    </div>
  );
}

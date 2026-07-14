"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface Heart {
  id: number;
  left: number; // vw
  size: number; // px
  duration: number; // s
  delay: number; // s
  opacity: number;
  drift: number; // px sideways
}

/** Softly rising hearts in the background. Purely decorative. */
export function FloatingHearts({ count = 14 }: { count?: number }) {
  const [hearts, setHearts] = useState<Heart[]>([]);

  useEffect(() => {
    // Generated on the client only, so SSR markup stays deterministic.
    setHearts(
      Array.from({ length: count }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        size: 10 + Math.random() * 22,
        duration: 14 + Math.random() * 16,
        delay: Math.random() * 20,
        opacity: 0.12 + Math.random() * 0.25,
        drift: (Math.random() - 0.5) * 120,
      }))
    );
  }, [count]);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
    >
      {hearts.map((h) => (
        <motion.span
          key={h.id}
          className="absolute select-none text-pink-400"
          style={{ left: `${h.left}vw`, fontSize: h.size, bottom: -40 }}
          initial={{ y: 0, opacity: 0 }}
          animate={{
            y: "-110vh",
            x: [0, h.drift, 0],
            opacity: [0, h.opacity, h.opacity, 0],
            rotate: [0, h.drift > 0 ? 20 : -20, 0],
          }}
          transition={{
            duration: h.duration,
            delay: h.delay,
            repeat: Infinity,
            ease: "linear",
          }}
        >
          ❤
        </motion.span>
      ))}
    </div>
  );
}
